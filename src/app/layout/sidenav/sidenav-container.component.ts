import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject, combineLatest } from 'rxjs';
import {
  map,
  takeUntil,
  shareReplay,
  filter,
  debounceTime,
} from 'rxjs/operators';
import { SidenavService } from './sidenav.service';
import { SidenavState } from './sidenav.models';

@Component({
  selector: 'app-sidenav-container',
  templateUrl: './sidenav-container.component.html',
  styleUrls: ['./sidenav-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidenavContainerComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  /**
   * Emits true when the viewport matches a handset (mobile) breakpoint.
   * Uses CDK's composite Breakpoints.Handset query as required by the spec.
   */
  readonly isMobile$ = this.breakpointObserver
    .observe(Breakpoints.Handset)
    .pipe(
      map((result) => result.matches),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  /**
   * Combines breakpoint and sidenav service state into a single view-model.
   * takeUntil is placed AFTER shareReplay so that the shared multicasted
   * observable is not completed for all subscribers when the component
   * is destroyed — preventing blank-sidenav issues on re-subscription.
   */
  readonly state$ = combineLatest([
    this.sidenavService.state$,
    this.isMobile$,
  ]).pipe(
    map(([state, isMobile]: [SidenavState, boolean]) => ({
      ...state,
      isMobile,
    })),
    shareReplay({ bufferSize: 1, refCount: false }),
    takeUntil(this.destroy$),
  );

  constructor(
    private readonly sidenavService: SidenavService,
    private readonly breakpointObserver: BreakpointObserver,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    // Sync breakpoint changes into the service so mode/state stay consistent.
    this.isMobile$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isMobile: boolean) => {
        this.sidenavService.setBreakpoint(isMobile ? 'mobile' : 'desktop');
      });

    // Auto-close the sidenav on mobile after each successful navigation.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        debounceTime(0), // yield to Angular's change detection before closing
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.isMobile$.pipe(takeUntil(this.destroy$)).subscribe((isMobile) => {
          if (isMobile) {
            this.sidenavService.close();
          }
        });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Called by the `(openedChange)` output of `mat-sidenav`.
   * Feeds backdrop-close and swipe-close events back into SidenavService
   * so that DOM state and service state remain in sync.
   */
  public onOpenedChange(opened: boolean): void {
    if (opened) {
      this.sidenavService.open();
    } else {
      this.sidenavService.close();
    }
  }
}
