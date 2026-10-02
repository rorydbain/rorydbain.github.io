import { getDomain } from 'tldts';
import { createHmac, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
// Derive coarse aggregates from ordinary requests; never forward IPs or raw headers.
export function pageDimensions(req, path, status, contentType, site) {
  const h = name => String(req.headers[name] || '');
  if(req.method !== 'GET' || status !== 200 || !contentType.includes('text/html')) return null;
  if(h('dnt')==='1' || h('sec-gpc')==='1') return null;
  if(/prefetch|prerender/i.test(h('purpose')+' '+h('sec-purpose')) || h('x-moz')==='prefetch') return null;
  if(h('sec-fetch-dest') && h('sec-fetch-dest')!=='document') return null;
  if(/^\/(?:admin|api|_stats|privacy)(?:\/|$)/.test(path)) return null;
  const ua=h('user-agent');
  const knownBot=/bot|crawler|spider|headless|preview|curl|wget|lighthouse|facebookexternalhit|slack|discord|telegram|whatsapp|monitor|uptime|python|httpclient|scrapy|axios|node-fetch|go-http-client|okhttp|libwww|java\//i.test(ua);
  const navigation=h('sec-fetch-dest')==='document' && h('sec-fetch-mode')==='navigate';
  const browserLike=/Mozilla\/5\.0/.test(ua) && /chrome|crios|safari|firefox|fxios|edg\//i.test(ua);
  const traffic=knownBot?'bot':navigation && browserLike?'browser':'uncertain';
  // Rejected/uncertain requests contribute only to a site/day quality total.
  if(traffic!=='browser') return {site,path,traffic};
  let referrer='';
  try { const u=new URL(h('referer')); if(['http:','https:'].includes(u.protocol) && u.hostname.replace(/^www\./,'')!==site.replace(/^www\./,'')) referrer=getDomain(u.hostname,{allowPrivateDomains:true})||''; } catch {}
  const country=h('x-vercel-ip-country');
  return {site,path,traffic,referrer,country:/^[A-Z]{2}$/.test(country)?country:'Unknown',device:/ipad|tablet/i.test(ua)?'Tablet':/mobile|iphone|android/i.test(ua)?'Mobile':'Desktop',browser:/edg\//i.test(ua)?'Edge':/firefox|fxios/i.test(ua)?'Firefox':/chrome|crios/i.test(ua)?'Chrome':/safari/i.test(ua)?'Safari':'Other'};
}
// One-second, instance-local buffer: no identifier is sent or persisted.
// Resolve every request in the window together, so the first pages of a scan
// are discounted too. Capacity limits fail conservatively into uncertain.
export function createBurstFilter(schedule = setTimeout) {
  const pending = new Map();
  const uncertain = p => ({site:p.site,path:p.path,traffic:'uncertain'});
  return (payload,key) => {
    if(payload.traffic!=='browser' || !key) return Promise.resolve(payload);
    let group=pending.get(key);
    if(!group) {
      if(pending.size>=256) return Promise.resolve(uncertain(payload));
      group={pages:new Set(),items:[],overflow:false}; pending.set(key,group);
      schedule(()=>{
        pending.delete(key);
        const burst=group.overflow || group.pages.size>=8;
        for(const [p,resolve] of group.items) resolve(burst?uncertain(p):p);
      },1000);
    }
    if(group.items.length>=64) { group.overflow=true; return Promise.resolve(uncertain(payload)); }
    group.pages.add(payload.path.split(/[?#]/,1)[0]);
    return new Promise(resolve=>group.items.push([payload,resolve]));
  };
}
const burstFilter=createBurstFilter();
const burstSecret=randomBytes(32);
function burstKey(req,site) {
  // Vercel overwrites X-Forwarded-For; do not use arbitrary client headers.
  const ip=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
  if(!isIP(ip)) return '';
  // Including browser header avoids pooling different browsers behind a NAT.
  return createHmac('sha256',burstSecret).update(JSON.stringify([site,ip,String(req.headers['user-agent']||'').slice(0,512)])).digest('hex');
}
export async function recordPage(req,path,status,contentType,site) {
  if(process.env.VERCEL_ENV !== 'production' || !process.env.STATS_SERVER_KEY) return;
  let payload=pageDimensions(req,path,status,contentType,site);
  if(!payload) return;
  payload=await burstFilter(payload,payload.traffic==='browser'?burstKey(req,site):'');
  try {
    const response=await fetch('https://rory-tiny-stats.rory-party-appliances.workers.dev/server-count',{method:'POST',headers:{authorization:`Bearer ${process.env.STATS_SERVER_KEY}`,'content-type':'application/json','user-agent':'TinyStatsServer'},body:JSON.stringify(payload),signal:AbortSignal.timeout(3000)});
    if(!response.ok) console.warn('Aggregate counter unavailable:',response.status);
  } catch { console.warn('Aggregate counter unavailable'); }
}
