declare namespace pcHTTP {
 interface Resource {bytes:Buffer;type:string;sha256:string}
 interface Inventory {urlPath:string;sha256:string;bytes:number}
 interface Bundle {files:Map<string,Resource>;inventory:Inventory[];digest:string}
 interface Hosted {url:string;close():Promise<void>}
}
'use strict';
const fs:typeof import('node:fs') = require('node:fs');
const path:typeof import('node:path') = require('node:path');
const http:typeof import('node:http') = require('node:http');
const {createHash}:typeof import('node:crypto') = require('node:crypto');
const mime:Record<string,string> = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml',
  '.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2',
  '.ttf':'font/ttf','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.mp4':'video/mp4'};
const error = () => Object.assign(Error('Review the selected HTML and explicit resource manifest'),{code:'PC_RESOURCES_INVALID'});
function resourcePath(value:unknown):string{
  if(typeof value!=='string'||!value.startsWith('/')||/[\\?#\u0000-\u001f\u007f]/.test(value))throw error();
  const parts=value.slice(1).split('/').map(part=>{let decoded;try{decoded=decodeURIComponent(part)}catch{throw error()}
    if(!decoded||decoded==='.'||decoded==='..'||/[\\/\u0000-\u001f\u007f]/.test(decoded))throw error();return decoded});
  return '/'+parts.join('/');
}
function load(html:string, manifest?:string):pcHTTP.Bundle {
  const entries:unknown[] = [{urlPath:'/index.html',file:html}];
  if (manifest !== undefined) {
    if (!path.isAbsolute(manifest) || fs.statSync(manifest).size > 262144) throw error();
    const raw:unknown=JSON.parse(fs.readFileSync(manifest,'utf8'));
    const data=raw as {schemaVersion?:unknown;resources?:unknown}|null|undefined;
    if (!data || Object.keys(data).sort().join() !== 'resources,schemaVersion' || data.schemaVersion !== 1 || !Array.isArray(data.resources) || data.resources.length > 512) throw error();
    entries.push(...data.resources);
  }
  const files = new Map<string,pcHTTP.Resource>(); let total = 0;
  for (const raw of entries) {
    const entry=raw as {file?:unknown;urlPath?:unknown}|null|undefined;
    if (!entry || Object.keys(entry).sort().join() !== 'file,urlPath' || typeof entry.file !== 'string' || !path.isAbsolute(entry.file)) throw error();
    const key=resourcePath(entry.urlPath);
    if(files.has(key))throw error();
    const type = mime[path.extname(key).toLowerCase()];
    if (!type || fs.lstatSync(entry.file).isSymbolicLink()) throw error();
    const fd = fs.openSync(entry.file,'r'); let bytes;
    try {
      const stat=fs.fstatSync(fd);
      if (!stat.isFile() || stat.size > 64*1024*1024 || total+stat.size > 512*1024*1024) throw error();
      bytes=fs.readFileSync(fd);
      if (bytes.length !== stat.size) throw error();
    } finally { fs.closeSync(fd); }
    total += bytes.length;
    files.set(key,{bytes,type,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  // Explicit snapshots avoid serving later edits, symlink substitutions or directory contents.
  const inventory=[...files].map(([urlPath,f])=>({urlPath,sha256:f.sha256,bytes:f.bytes.length}));
  return {files,inventory,digest:createHash('sha256').update(JSON.stringify(inventory)).digest('hex')};
}
async function serve(bundle:pcHTTP.Bundle,port:number):Promise<pcHTTP.Hosted> {
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw error();
  const authority='127.0.0.1:'+port;
  const server=http.createServer((req,res)=>{
    if (req.headers.host !== authority || !['GET','HEAD'].includes(req.method as string)) { res.writeHead(403); return res.end(); }
    let url; try { url=new URL(req.url!,'http://'+authority); } catch { res.writeHead(400); return res.end(); }
    let key;try{key=url.pathname==='/'?'/index.html':resourcePath(url.pathname)}catch{res.writeHead(404);return res.end()}
    const file=bundle.files.get(key);
    if (!file || url.origin!=='http://'+authority) { res.writeHead(404); return res.end(); }
    res.writeHead(200,{'Content-Type':file.type,'Content-Length':file.bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:file.bytes);
  });
  server.requestTimeout=10000; server.headersTimeout=10000;
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return {url:'http://'+authority+'/index.html',async close(){server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}};
}
const pcHTTP={load,serve};
export = pcHTTP;
