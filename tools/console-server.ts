import { createServer } from 'node:https';
import type { Server } from 'node:https';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { createSession } from '#perfeng/bff-session';
import { requestAllowed, sessionId, SESSION_PATH } from './server/request-policy.ts';
import { handleSession } from './server/session-routes.ts';
import { handleRun, matchesRun } from './server/run-routes.ts';
import type { RunReader } from './server/run-routes.ts';
import { handleStatic } from './server/static-route.ts';

/** Loopback TLS settings plus optional local clock/read capabilities; port 0 selects an ephemeral port. */
export interface ConsoleServerOptions {
  readonly cert: Buffer;
  readonly key: Buffer;
  readonly port: number;
  readonly now?: () => number;
  readonly runs?: RunReader;
}
/** Caller owns shutdown. The one-use code must stay in the operator terminal. */
export interface ConsoleServerResult {
  readonly server: Server;
  readonly origin: string;
  readonly code: string;
}

// Existing local connection/request deadline; bounded waiting, not a benchmark duration.
const REQUEST_TIMEOUT_MS = 5_000;
// Keep Node's request-timeout checks periodic without adding an application timer.
const CONNECTION_CHECK_INTERVAL_MS = 1_000;

/** Bind IPv4 loopback HTTPS and resolve after the actual port is available.
 * @param options TLS material and local capabilities; no bearer credential enters this interface.
 * @returns Running HTTPS handle, exact origin and private one-use pairing code.
 * @throws TLS setup or listener/bind errors; no partially ready handle is returned.
 */
export async function startConsole(options: ConsoleServerOptions): Promise<ConsoleServerResult> {
  const session = createSession(options.now);
  const root = fileURLToPath(new URL('../dist/apps/console/browser', import.meta.url));
  const server = createServer({ cert: options.cert, key: options.key, minVersion: 'TLSv1.2', requestTimeout: REQUEST_TIMEOUT_MS, connectionsCheckingInterval: CONNECTION_CHECK_INTERVAL_MS }, (req, res) => {
    // EventEmitter ignores returned promises; every request must have a terminal boundary.
    void (async () => {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      const end = (status: number) => res.writeHead(status).end();
      if (!requestAllowed(req, origin)) return end(403);
      const id = sessionId(req);
      // Closed dispatch is deliberate: new public routes require explicit review.
      if (matchesRun(req)) return handleRun(req, res, session, id, options.runs);
      if (req.url === SESSION_PATH || req.url === SESSION_PATH + '/pair' || req.url === SESSION_PATH + '/logout')
        return handleSession(req, res, session, id, origin);
      return handleStatic(req, res, root);
    })().catch(() => {
      // Never reflect exceptions or write a second response after partial output.
      if (res.destroyed || res.writableEnded) return;
      if (res.headersSent) { res.destroy(); return; }
      try {
        res.removeHeader('Set-Cookie');
        res.writeHead(500).end();
      } catch { res.destroy(); }
    });
  });
  server.setTimeout(REQUEST_TIMEOUT_MS, socket => socket.destroy());
  server.listen(options.port, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected loopback address');
  const origin = 'https://127.0.0.1:' + address.port;
  return { server, origin, code: session.code };
}
