import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';
import { SidenavBreakpoint, SidenavState } from './sidenav.models';

const INITIAL_STATE: SidenavState = {
  isOpen: false,
  breakpoint: 'desktop',
  mode: 'side',
};

@Injectable({
  providedIn: 'root',
})
export class SidenavService {
  private readonly _state$ = new BehaviorSubject<SidenavState>(INITIAL_STATE);

  readonly state$ = this._state$.asObservable().pipe(
    distinctUntilChanged(
      (a, b) =>
        a.isOpen === b.isOpen &&
        a.breakpoint === b.breakpoint &&
        a.mode === b.mode,
    ),
  );

  readonly isOpen$ = this._state$.pipe(
    map((s) => s.isOpen),
    distinctUntilChanged(),
  );

  get snapshot(): SidenavState {
    return this._state$.getValue();
  }

  open(): void {
    const current = this.snapshot;
    if (current.isOpen) {
      return;
    }
    this._setState({ ...current, isOpen: true });
  }

  close(): void {
    const current = this.snapshot;
    if (!current.isOpen) {
      return;
    }
    this._setState({ ...current, isOpen: false });
  }

  toggle(): void {
    const current = this.snapshot;
    this._setState({ ...current, isOpen: !current.isOpen });
  }

  setBreakpoint(breakpoint: SidenavBreakpoint): void {
    const current = this.snapshot;
    if (current.breakpoint === breakpoint) {
      return;
    }
    const mode = breakpoint === 'mobile' ? 'over' : 'side';
    this._setState({ ...current, breakpoint, mode });
  }

  /**
   * Synchronises the MatSidenav `opened` state back into the service state.
   * Called from the container component's `(openedChange)` output to keep
   * the service as the single source of truth when Material closes the sidenav
   * via a backdrop click or swipe gesture.
   *
   * Guards against duplicate emissions so that `state$` only fires when the
   * value actually changes.
   */
  syncOpenedState(isOpen: boolean): void {
    const current = this.snapshot;
    if (current.isOpen === isOpen) {
      return;
    }
    this._setState({ ...current, isOpen });
  }

  private _setState(next: SidenavState): void {
    this._state$.next(next);
  }
}
