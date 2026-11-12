import type { Provider } from '@angular/core';
import { VerificationAccess, ACCESS_READ } from './access';
import { AccessStore } from './access.store';
import { readAccess } from './access-client';
import type { AccessRead } from './access-reader.port';
import { VERIFICATION_ACCESS } from './access.port';

export function provideVerificationAccess(): Provider[] {
  return [AccessStore, VerificationAccess, { provide: ACCESS_READ, useValue: readAccess satisfies AccessRead }, { provide: VERIFICATION_ACCESS, useExisting: VerificationAccess }];
}
