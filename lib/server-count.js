import { getDomain } from 'tldts';
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
export async function recordPage(req,path,status,contentType,site) {
  if(process.env.VERCEL_ENV !== 'production' || !process.env.STATS_SERVER_KEY) return;
  const payload=pageDimensions(req,path,status,contentType,site);
  if(!payload) return;
  try {
    const response=await fetch('https://rory-tiny-stats.rory-party-appliances.workers.dev/server-count',{method:'POST',headers:{authorization:`Bearer ${process.env.STATS_SERVER_KEY}`,'content-type':'application/json','user-agent':'TinyStatsServer'},body:JSON.stringify(payload),signal:AbortSignal.timeout(3000)});
    if(!response.ok) console.warn('Aggregate counter unavailable:',response.status);
  } catch { console.warn('Aggregate counter unavailable'); }
}
