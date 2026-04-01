import { CanDeactivateFn } from '@angular/router';
import { Observable, Subject, take } from 'rxjs';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
  showDiscardConfirmation?: boolean;
  discardResult$?: Subject<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges || !component.hasUnsavedChanges()) {
    return true;
  }
  // Show inline confirmation in the component
  component.showDiscardConfirmation = true;
  component.discardResult$ = new Subject<boolean>();
  return component.discardResult$.asObservable().pipe(take(1)) as Observable<boolean>;
};
