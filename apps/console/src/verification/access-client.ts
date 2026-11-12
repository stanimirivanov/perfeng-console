import { Effect } from 'effect';
import type { AccessReply } from './access-reader.port';

/** Only an explicit same-origin grant enables maintainer navigation. */
export function readAccess() {
  return Effect.tryPromise(async (signal): Promise<AccessReply> => {
    const response = await fetch('/console/api/verification/access', {
      signal, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
    });
    // This optional probe has no local-session denial contract; never infer global logout.
    return response.status === 204 ? 'granted' : 'denied';
  }).pipe(Effect.timeout(3000), Effect.catch(() => Effect.succeed('denied' as const)));
}
