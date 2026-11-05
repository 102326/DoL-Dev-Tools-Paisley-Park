// Generated from pc-http.cts by TypeScript 6.0.2; source-lf-sha256=aa2f31116a101f49b8c7ced0adfb14379a00d069cd0297ff32eaeb90c1585974
"use strict";
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
    '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4' };
const error = () => Object.assign(Error('Review the selected HTML and explicit resource manifest'), { code: 'PC_RESOURCES_INVALID' });
function resourcePath(value) {
    if (typeof value !== 'string' || !value.startsWith('/') || /[\\?#\u0000-\u001f\u007f]/.test(value))
        throw error();
    const parts = value.slice(1).split('/').map(part => {
        let decoded;
        try {
            decoded = decodeURIComponent(part);
        }
        catch {
            throw error();
        }
        if (!decoded || decoded === '.' || decoded === '..' || /[\\/\u0000-\u001f\u007f]/.test(decoded))
            throw error();
        return decoded;
    });
    return '/' + parts.join('/');
}
function load(html, manifest) {
    const entries = [{ urlPath: '/index.html', file: html }];
    if (manifest !== undefined) {
        if (!path.isAbsolute(manifest) || fs.statSync(manifest).size > 262144)
            throw error();
        const raw = JSON.parse(fs.readFileSync(manifest, 'utf8'));
        const data = raw;
        if (!data || Object.keys(data).sort().join() !== 'resources,schemaVersion' || data.schemaVersion !== 1 || !Array.isArray(data.resources) || data.resources.length > 512)
            throw error();
        entries.push(...data.resources);
    }
    const files = new Map();
    let total = 0;
    for (const raw of entries) {
        const entry = raw;
        if (!entry || Object.keys(entry).sort().join() !== 'file,urlPath' || typeof entry.file !== 'string' || !path.isAbsolute(entry.file))
            throw error();
        const key = resourcePath(entry.urlPath);
        if (files.has(key))
            throw error();
        const type = mime[path.extname(key).toLowerCase()];
        if (!type || fs.lstatSync(entry.file).isSymbolicLink())
            throw error();
        const fd = fs.openSync(entry.file, 'r');
        let bytes;
        try {
            const stat = fs.fstatSync(fd);
            if (!stat.isFile() || stat.size > 64 * 1024 * 1024 || total + stat.size > 512 * 1024 * 1024)
                throw error();
            bytes = fs.readFileSync(fd);
            if (bytes.length !== stat.size)
                throw error();
        }
        finally {
            fs.closeSync(fd);
        }
        total += bytes.length;
        files.set(key, { bytes, type, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
    // Explicit snapshots avoid serving later edits, symlink substitutions or directory contents.
    const inventory = [...files].map(([urlPath, f]) => ({ urlPath, sha256: f.sha256, bytes: f.bytes.length }));
    return { files, inventory, digest: createHash('sha256').update(JSON.stringify(inventory)).digest('hex') };
}
async function serve(bundle, port) {
    if (!Number.isSafeInteger(port) || port < 1024 || port > 65535)
        throw error();
    const authority = '127.0.0.1:' + port;
    const server = http.createServer((req, res) => {
        if (req.headers.host !== authority || !['GET', 'HEAD'].includes(req.method)) {
            res.writeHead(403);
            return res.end();
        }
        let url;
        try {
            url = new URL(req.url, 'http://' + authority);
        }
        catch {
            res.writeHead(400);
            return res.end();
        }
        let key;
        try {
            key = url.pathname === '/' ? '/index.html' : resourcePath(url.pathname);
        }
        catch {
            res.writeHead(404);
            return res.end();
        }
        const file = bundle.files.get(key);
        if (!file || url.origin !== 'http://' + authority) {
            res.writeHead(404);
            return res.end();
        }
        res.writeHead(200, { 'Content-Type': file.type, 'Content-Length': file.bytes.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        res.end(req.method === 'HEAD' ? undefined : file.bytes);
    });
    server.requestTimeout = 10000;
    server.headersTimeout = 10000;
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
    return { url: 'http://' + authority + '/index.html', async close() { server.closeAllConnections(); await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve())); } };
}
const pcHTTP = { load, serve };
module.exports = pcHTTP;
