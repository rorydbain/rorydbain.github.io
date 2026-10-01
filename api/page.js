import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { waitUntil } from '@vercel/functions';
import { recordPage } from '../lib/server-count.js';
export default async function page(req,res) {
  if(!['GET','HEAD'].includes(req.method)) { res.statusCode=405;return res.end(); }
  const url=new URL(req.url,'https://www.roryba.in');
  let path;try { path=decodeURIComponent(url.searchParams.get('__path')||''); } catch { res.statusCode=400;return res.end(); }
  if(path.split('/').some(p=>p==='..'||p.startsWith('.')) || path.includes('\\') || path.includes('\0')) {res.statusCode=404;return res.end();}
  const root=resolve('_site');
  const candidates=path.endsWith('.html')?[path]:[`${path.replace(/\/$/,'')}/index.html`,`${path}.html`];
  let body;let found;
  for(const candidate of candidates) {
    const target=resolve(root,candidate.replace(/^\//,''));
    if(!target.startsWith(root+sep)) continue;
    try {body=await readFile(target);found=candidate;break;} catch {}
  }
  if(!found) {res.statusCode=404;try {body=await readFile(resolve(root,'404.html'));}catch {body=Buffer.from('Not found');}}
  else res.statusCode=200;
  // HTML always runs through Frankfurt. Assets retain CDN caching.
  res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','private, no-cache, max-age=0');
  res.setHeader('Vercel-CDN-Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Site-Region',process.env.VERCEL_REGION||'local');
  waitUntil(recordPage(req,'/'+path,res.statusCode,'text/html','roryba.in'));
  return res.end(req.method==='HEAD'?undefined:body);
}
