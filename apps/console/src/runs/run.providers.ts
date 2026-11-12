import type { RunRead } from './run-reader.port';
import type { Provider } from '@angular/core';
import { RunStore } from './run.store';
import { RunFacade, RUN_READ } from './run.facade';
import { RUN_UI } from './run-ui';
import { lookupRun } from './run-client';

export function provideRunLookup(): Provider[] {
  return [RunStore, RunFacade, { provide: RUN_UI, useExisting: RunFacade }, { provide: RUN_READ, useValue: lookupRun satisfies RunRead }];
}
