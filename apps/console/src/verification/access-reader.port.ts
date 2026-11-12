import type { Effect } from 'effect';

export type AccessReply = 'granted' | 'denied';
export type AccessRead = () => Effect.Effect<AccessReply>;
