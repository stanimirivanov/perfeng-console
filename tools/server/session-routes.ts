import type { IncomingMessage, ServerResponse } from 'node:http';
import type { createSession } from '#perfeng/bff-session';
import { SESSION_COOKIE, COOKIE_ATTRIBUTES, SESSION_PATH, readAllowed } from './request-policy.ts';

// A 43-character pairing code fits well below this deliberately small JSON envelope cap.
const MAX_PAIRING_BODY_BYTES = 256;
// Match the BFF grant's eight-hour absolute cap; cookie lifetime never extends authority.
const COOKIE_MAX_AGE_SECONDS = 28_800;

/** Pair/read/logout wire handling; the BFF remains the sole session-state writer. */
export async function handleSession(req: IncomingMessage, res: ServerResponse, session: ReturnType<typeof createSession>, id: string | undefined, origin: string): Promise<void> {
  const path = req.url;
  const end = (status: number): void => { res.writeHead(status).end(); };
  const json = (value: object): void => { res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(value)); };
  if (path === SESSION_PATH && req.method === 'GET') {
    // Ambient cookie-bearing GETs cannot extend the idle deadline.
    if (!readAllowed(req)) return end(403);
    return json(session.read(id) ?? {});
  }
  if (req.method === 'POST' && (path === SESSION_PATH + '/pair' || path === SESSION_PATH + '/logout')) {
    // Exact Origin plus a non-simple header rejects cross-site form and fetch submissions.
    if (req.headersDistinct.origin?.length !== 1 || req.headers.origin !== origin ||
        req.headersDistinct['x-perfeng-csrf']?.length !== 1) return end(403);
    const csrf = req.headers['x-perfeng-csrf'];
    if (typeof csrf !== 'string') return end(403);
    if (path.endsWith('/logout')) {
      if (!session.logout(id, csrf)) return end(403);
      res.setHeader('Set-Cookie', SESSION_COOKIE + '=' + COOKIE_ATTRIBUTES + '; Max-Age=0');
      return json({});
    }
    if (csrf !== 'pair' || req.headers['content-type'] !== 'application/json') return end(403);
    const chunks: Buffer[] = [];
    let size = 0;
    let value: unknown;
    try {
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_PAIRING_BODY_BYTES) { req.destroy(); return; }
        chunks.push(chunk);
      }
      value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (error) {
      if (res.destroyed) return;
      if (error instanceof SyntaxError || req.destroyed) return end(400);
      throw error;
    }
    if (!value || typeof value !== 'object' || !('code' in value) || typeof value.code !== 'string') return end(400);
    const grant = session.pair(value.code);
    if (!grant) return end(403);
    res.setHeader('Set-Cookie', SESSION_COOKIE + '=' + grant.id + COOKIE_ATTRIBUTES + '; Max-Age=' + COOKIE_MAX_AGE_SECONDS);
    return json({ csrf: grant.csrf });
  }
  end(404);
}
