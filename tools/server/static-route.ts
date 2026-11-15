import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderConsoleHtml } from '#perfeng/bff-csp';

/** Closed shell/assets surface. Preview permissiveness must never expand production paths. */
export async function handleStatic(req: IncomingMessage, res: ServerResponse, root: string): Promise<void> {
  const path = req.url;
  const end = (status: number): void => { res.writeHead(status).end(); };
  if (req.method !== 'GET' || !path) return end(404);
  const shell = path === '/' || path === '/verification';
  if (!shell && !/^\/[a-zA-Z0-9_-]+\.(?:js|css)$/.test(path)) return end(404);
  let data: Buffer;
  try {
    data = await readFile(resolve(root, shell ? 'index.html' : path.slice(1)));
  } catch (error) {
    // Missing files are client-visible absence; I/O defects must reach containment.
    if (error && typeof error === 'object' && 'code' in error &&
        (error.code === 'ENOENT' || error.code === 'ENOTDIR')) return end(404);
    throw error;
  }
  if (shell) {
    const page = renderConsoleHtml(data.toString());
    return void res.writeHead(200, { ...page.headers, 'Content-Type': 'text/html; charset=utf-8' }).end(page.html);
  }
  return void res.writeHead(200, { 'Content-Type': path.endsWith('.js') ? 'text/javascript' : 'text/css' }).end(data);
}
