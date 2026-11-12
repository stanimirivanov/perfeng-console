import { InjectionToken, type Signal } from '@angular/core';

export interface VerificationAccessPort { readonly granted: Signal<boolean>; refresh(): Promise<boolean> }
export const VERIFICATION_ACCESS = new InjectionToken<VerificationAccessPort>('Verification access');
