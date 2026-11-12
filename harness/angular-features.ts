const prefix = 'apps/console/src/';
const feature = (path: string) => path.startsWith(prefix)
  ? (path.slice(prefix.length).includes('/') ? path.slice(prefix.length).split('/')[0] : 'bootstrap') : undefined;
const publicEntries = {
  shell: ['shell/app.ts'],
  session: ['session/session-ui.ts', 'session/session.providers.ts', 'session/session-boundary.port.ts'],
  runs: ['runs/run-lookup.ts'],
  verification: ['verification/access.port.ts', 'verification/providers.ts', 'verification/lab.ts'],
};
const allowed: Readonly<Record<string, readonly string[]>> = {
  bootstrap: Object.values(publicEntries).flat(),
  shell: [...publicEntries.session, 'verification/access.port.ts'],
  session: ['verification/access.port.ts'],
  runs: ['session/session-boundary.port.ts'],
  verification: ['session/session-boundary.port.ts'],
};

/** Feature ownership complements exact capability roles; folders never grant execution authority. */
export function featureImportAllowed(from: string, to: string): boolean {
  const source = feature(from), target = feature(to);
  return !source || !target || source === target || (allowed[source] ?? []).includes(to.slice(prefix.length));
}
export const componentProviders: Readonly<Record<string, readonly string[]>> = {
  'apps/console/src/runs/run.providers.ts': ['provideRunLookup'],
  'apps/console/src/session/session.providers.ts': ['provideSession'],
};
export const angularPackages: Readonly<Record<string, readonly string[]>> = {
  'runs/run.store.ts': ['@ngrx/signals'], 'session/session.store.ts': ['@ngrx/signals'],
  'runs/run.facade.ts': ['effect'], 'runs/run.operation.ts': ['effect'], 'runs/run-client.ts': ['effect'],
  'verification/access.ts': ['effect'], 'verification/access-client.ts': ['effect'],
  'verification/access.store.ts': ['@ngrx/signals'], 'session/session-boundary.store.ts': ['@ngrx/signals'],
  'session/session.facade.ts': ['effect'], 'session/session-client.ts': ['effect'],
};
export const effectTypePorts = ['runs/run-reader.port.ts', 'session/session-reader.port.ts', 'verification/access-reader.port.ts'];
