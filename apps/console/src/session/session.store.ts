import { patchState, signalStore, withState, withMethods } from '@ngrx/signals';
import type { SessionMode } from './session-ui';

export const SessionStore = signalStore(
  withState({ mode: 'pairing' as SessionMode, pending: false, message: '' }),
  withMethods(store => ({
    initialize(preview: boolean) { patchState(store, { mode: preview ? 'preview' : 'pairing' }); },
    begin() { patchState(store, { pending: true }); },
    complete(mode: SessionMode, message: string) { patchState(store, { mode, message, pending: false }); },
  })),
);
