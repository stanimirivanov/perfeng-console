import type { Effect } from 'effect';

export type SessionReply = { mode: 'paired'; csrf: string } | { mode: 'pairing' | 'unavailable' };
export type SessionRead = (action?: 'pair' | 'logout', credential?: string) => Effect.Effect<SessionReply>;
