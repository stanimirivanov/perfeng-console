import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

export const AccessStore = signalStore(withState({ granted: false }),
  withMethods(store => ({ setGranted(granted: boolean) { patchState(store, { granted }); } })));
