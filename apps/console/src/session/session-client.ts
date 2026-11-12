import { Effect } from 'effect';

const endpoint = '/console/api/session';

export function sessionRequest(action?: 'pair' | 'logout', credential?: string) {
  return Effect.tryPromise(async signal => {
    const response = await fetch(action ? endpoint + '/' + action : endpoint, {
      signal, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      ...(action ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Perfeng-CSRF': action === 'pair' ? 'pair' : credential ?? '' },
        body: action === 'pair' ? JSON.stringify({ code: credential }) : '{}',
      } : { headers: { 'X-Perfeng-CSRF': 'read' } }),
    });
    if (!response.ok) throw new Error('Session request rejected');
    const value: unknown = await response.json();
    if (!value || typeof value !== 'object') throw new Error('Invalid session reply');
    if ('csrf' in value && typeof value.csrf === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value.csrf)) {
      return { mode: 'paired', csrf: value.csrf } as const;
    }
    if (action === 'pair') throw new Error('Missing session grant');
    return { mode: 'pairing' } as const;
  }).pipe(Effect.timeout(3000), Effect.catch(() => Effect.succeed({ mode: 'unavailable' } as const)));
}
