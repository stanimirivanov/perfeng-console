import type { IncomingMessage } from 'node:http';

export const SESSION_COOKIE = '__Host-perfeng-session';
// __Host- forbids Domain and requires Secure/Path=/; Strict confines local pairing.
export const COOKIE_ATTRIBUTES = '; Secure; HttpOnly; SameSite=Strict; Path=/';
export const SESSION_PATH = '/console/api/session';

/** Admit only the bound loopback authority and same-origin browser API traffic. */
export function requestAllowed(req: IncomingMessage, origin: string): boolean {
  return req.headersDistinct.host?.length === 1 && req.headers.host === new URL(origin).host &&
    (req.headers.origin === undefined || req.headers.origin === origin) &&
    !(req.headers['sec-fetch-site'] === 'cross-site' && req.url?.startsWith('/console/api/'));
}

/** Duplicate session cookies carry ambiguous authority and never select a grant. */
export function sessionId(req: IncomingMessage): string | undefined {
  const cookies = (req.headers.cookie ?? '').split(';').map(value => value.trim()).filter(value => value.startsWith(SESSION_COOKIE + '='));
  return cookies.length === 1 ? cookies[0]?.slice(SESSION_COOKIE.length + 1) : undefined;
}

/** Non-simple read header prevents ambient cookie-bearing GETs extending idle expiry. */
export function readAllowed(req: IncomingMessage): boolean {
  return req.headersDistinct['x-perfeng-csrf']?.length === 1 && req.headers['x-perfeng-csrf'] === 'read';
}
