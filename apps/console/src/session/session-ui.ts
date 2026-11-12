import { InjectionToken, type Signal } from '@angular/core';

export type SessionMode = 'pairing' | 'paired' | 'preview';
export interface SessionUi {
  readonly mode: Signal<SessionMode>;
  readonly pending: Signal<boolean>;
  readonly message: Signal<string>;
  pair(code: string): Promise<boolean>;
  signOut(): Promise<void>;
}
export const SESSION_UI = new InjectionToken<SessionUi>('Local operator session UI');
