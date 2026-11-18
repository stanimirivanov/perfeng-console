import { Effect } from 'effect';
import { makeSnapshotStore } from './signing-key-store.ts';
import type { SigningKeySourceConfig } from './signing-key-contracts.ts';

/** Private one-issuer snapshot reuse; unknown-key refresh policy is not provided. */
export function makeSigningKeyCache(config: SigningKeySourceConfig) {
  return Effect.map(makeSnapshotStore(config), store => ({ readSnapshot: store.readSnapshot }));
}
