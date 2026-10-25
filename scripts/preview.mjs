import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const directory = path.resolve('dist/aster-erp/browser');
const config = JSON.parse(await readFile('vercel.json', 'utf8'));
const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.json': 'application/json'
};
const server = http.createServer(async (req, res) => {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
        res.writeHead(400).end();
        return;
    }
    for (const [key, value] of Object.entries(config.routes.find((route) => route.src === '/(.*)')?.headers ?? {})) res.setHeader(key, value);
    if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405).end();
        return;
    }
    if (pathname === '/api' || pathname.startsWith('/api/')) {
        res.writeHead(404, { 'Content-Type': 'application/json' }).end('{"error":"This static preview has no backend."}');
        return;
    }
    let target = path.resolve(directory, '.' + pathname);
    if (target !== directory && !target.startsWith(directory + path.sep)) {
        res.writeHead(403).end();
        return;
    }
    try {
        if (!(await stat(target)).isFile()) throw new Error('route');
    } catch {
        if (path.extname(pathname)) {
            res.writeHead(404).end();
            return;
        }
        target = path.join(directory, 'index.html');
    }
    try {
        const data = await readFile(target);
        res.setHeader('Content-Type', types[path.extname(target)] ?? 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        res.writeHead(200).end(req.method === 'HEAD' ? undefined : data);
    } catch {
        res.writeHead(404).end();
    }
});
server.listen(4173, '127.0.0.1', () => console.log('Production SPA preview: http://127.0.0.1:4173'));
