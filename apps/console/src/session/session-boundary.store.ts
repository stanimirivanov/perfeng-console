import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

/** One epoch writer; credentials and presentation remain in the component-scoped owner. */
export const SessionBoundary = signalStore(withState({ epoch: 0 }), withMethods(store => {
  const owners = new Set<() => void>();
  return {
    invalidate() {
      patchState(store, { epoch: store.epoch() + 1 });
      for (const clear of [...owners]) clear();
    },
    subscribe(clear: () => void) {
      owners.add(clear);
      return () => { owners.delete(clear); };
    },
  };
}));
