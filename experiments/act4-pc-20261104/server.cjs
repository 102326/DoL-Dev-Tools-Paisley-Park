'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
// Only the invented fixture is served, never the repository or game files.
const html=fs.readFileSync(path.join(__dirname,'fixture.html'));
const server=http.createServer((req,res)=>{if(!['/','/other'].includes(new URL(req.url,'http://localhost').pathname)){res.writeHead(404);return res.end()};res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'"});res.end(html)});
server.listen(Number(process.argv[2]||18764),'127.0.0.1',()=>console.log(JSON.stringify({origin:'http://127.0.0.1:'+server.address().port,pid:process.pid})));
