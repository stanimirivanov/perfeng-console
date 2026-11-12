import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import type { RunDetail, ArtifactObservation } from '#perfeng/contracts';

export const RunDetailStore = signalStore(
  withState({ status: 'Ready for exact Run lookup.', run: undefined as RunDetail | undefined, artifacts: { status: 'unavailable' } as ArtifactObservation,
    observations: [] as { id: string; revision: number; state: string; updatedAt: string }[] }),
  withMethods(store => ({
    setStatus(status: string) { patchState(store, { status }); },
    clear(preserveObservations = false) {
      patchState(store, { run: undefined, artifacts: { status: 'unavailable' },
        observations: preserveObservations ? store.observations() : [] });
    },
    observe(run: RunDetail, artifacts: ArtifactObservation) {
      const history = store.observations().filter(value => value.id === run.id);
      const last = history.at(-1);
      if (last && (run.revision < last.revision || (run.revision === last.revision &&
          (run.state !== last.state || run.updatedAt !== last.updatedAt)))) return false;
      const observations = last?.revision === run.revision ? history : [...history,
        { id: run.id, revision: run.revision, state: run.state, updatedAt: run.updatedAt }].slice(-20);
      patchState(store, { run, artifacts, observations });
      return true;
    },
  })),
);
