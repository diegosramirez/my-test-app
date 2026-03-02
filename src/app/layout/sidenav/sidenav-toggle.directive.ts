import {
  Directive,
  OnDestroy,
  OnInit,
  HostListener,
  ElementRef,
} from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { SidenavService } from './sidenav.service';

@Directive({
  selector: '[appSidenavToggle]',
})
export class SidenavToggleDirective implements OnInit, OnDestroy {
  isOpen = false;

  private readonly destroy$ = new Subject<void>();
  private readonly clicks$ = new Subject<void>();

  constructor(
    private readonly sidenavService: SidenavService,
    private readonly elementRef: ElementRef<HTMLElement>,
  ) {}

  ngOnInit(): void {
    // Track open state from service
    this.sidenavService.isOpen$
      .pipe(takeUntil(this.destroy$))
      .subscribe((open) => {
        this.isOpen = open;
      });

    // Debounced click stream to prevent animation state thrash on rapid clicks
    this.clicks$
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe(() => {
        this.sidenavService.toggle();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('click')
  onClick(): void {
    this.clicks$.next();
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.sidenavService.close();
      this.elementRef.nativeElement.focus();
    }
  }
}
