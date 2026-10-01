import { mkdir,readdir,copyFile } from 'node:fs/promises';
import { join } from 'node:path';
async function copy(dir='') {
  for(const entry of await readdir(join('_site',dir),{withFileTypes:true})) {
    const path=join(dir,entry.name);
    if(entry.isDirectory()) await copy(path);
    else if(!entry.name.endsWith('.html') && entry.name!=='CNAME') {await mkdir(join('public',dir),{recursive:true});await copyFile(join('_site',path),join('public',path));}
  }
}
await mkdir('public',{recursive:true});await copy();
