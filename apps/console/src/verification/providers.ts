import type { Provider } from '@angular/core';
import { VerificationAccess } from './access';
import { VERIFICATION_ACCESS } from './access.port';

export function provideVerificationAccess(): Provider[] {
  return [{ provide: VERIFICATION_ACCESS, useExisting: VerificationAccess }];
}
