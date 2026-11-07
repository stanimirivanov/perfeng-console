import { createServer } from 'node:https';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { createSession } from '../src/bff/session.ts';
import { renderConsoleHtml } from '../src/bff/csp.ts';

const cookie = '__Host-perfeng-session';
const attributes = '; Secure; HttpOnly; SameSite=Strict; Path=/';
const base = '/console/api/session';

/** Serve the built console and its local pairing API on IPv4 loopback. */
export async function startConsole(options: { cert: Buffer; key: Buffer; port: number; now?: () => number }) {
  const session = createSession(options.now);
  const root = resolve('dist/apps/console/browser');
  const server = createServer({ cert: options.cert, key: options.key, minVersion: 'TLSv1.2', requestTimeout: 5000, connectionsCheckingInterval: 1000 }, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const end = (status: number) => res.writeHead(status).end();
    const json = (value: object) => res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(value));
    const path = req.url;
    if (req.headersDistinct.host?.length !== 1 || req.headers.host !== new URL(origin).host) return end(403);
    if (req.headers.origin !== undefined && req.headers.origin !== origin) return end(403);
    if (req.headers['sec-fetch-site'] === 'cross-site' && path?.startsWith('/console/api/')) return end(403);

    const cookies = (req.headers.cookie ?? '').split(';').map(value => value.trim()).filter(value => value.startsWith(cookie + '='));
    const id = cookies.length === 1 ? cookies[0]?.slice(cookie.length + 1) : undefined;
    if (path === base && req.method === 'GET') {
      // Ambient cookie-bearing GETs cannot extend the idle deadline.
      if (req.headersDistinct['x-perfeng-csrf']?.length !== 1 || req.headers['x-perfeng-csrf'] !== 'read') return end(403);
      return json(session.read(id) ?? {});
    }
    if (req.method === 'POST' && (path === base + '/pair' || path === base + '/logout')) {
      // Exact Origin plus a non-simple header rejects cross-site form and fetch submissions.
      if (req.headersDistinct.origin?.length !== 1 || req.headers.origin !== origin ||
          req.headersDistinct['x-perfeng-csrf']?.length !== 1) return end(403);
      const csrf = req.headers['x-perfeng-csrf'];
      if (typeof csrf !== 'string') return end(403);
      if (path.endsWith('/logout')) {
        if (!session.logout(id, csrf)) return end(403);
        res.setHeader('Set-Cookie', cookie + '=' + attributes + '; Max-Age=0');
        return json({});
      }
      if (csrf !== 'pair' || req.headers['content-type'] !== 'application/json') return end(403);
      const chunks: Buffer[] = [];
      let size = 0;
      try {
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 256) { req.destroy(); return; }
          chunks.push(chunk);
        }
        const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!value || typeof value !== 'object' || !('code' in value) || typeof value.code !== 'string') return end(400);
        const grant = session.pair(value.code);
        if (!grant) return end(403);
        res.setHeader('Set-Cookie', cookie + '=' + grant.id + attributes + '; Max-Age=28800');
        return json({ csrf: grant.csrf });
      } catch {
        if (!res.destroyed) return end(400);
        return;
      }
    }
    if (req.method !== 'GET' || !path) return end(404);
    const shell = path === '/' || path === '/verification';
    if (!shell && !/^\/[a-zA-Z0-9_-]+\.(?:js|css)$/.test(path)) return end(404);
    try {
      const data = await readFile(resolve(root, shell ? 'index.html' : path.slice(1)));
      if (shell) {
        const page = renderConsoleHtml(data.toString());
        return res.writeHead(200, { ...page.headers, 'Content-Type': 'text/html; charset=utf-8' }).end(page.html);
      }
      return res.writeHead(200, { 'Content-Type': path.endsWith('.js') ? 'text/javascript' : 'text/css' }).end(data);
    } catch { return end(404); }
  });
  server.setTimeout(5000, socket => socket.destroy());
  server.listen(options.port, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected loopback address');
  const origin = 'https://127.0.0.1:' + address.port;
  return { server, origin, code: session.code };
}
