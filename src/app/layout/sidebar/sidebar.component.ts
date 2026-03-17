import { Component, HostListener, inject, Renderer2, ElementRef, AfterViewInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavItem } from '../../models/nav-item.model';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements AfterViewInit, OnDestroy {
  private renderer = inject(Renderer2);
  private el = inject(ElementRef);
  private analytics = inject(AnalyticsService);
  private resizeTimeout: ReturnType<typeof setTimeout> | null = null;
  private focusTimeout: ReturnType<typeof setTimeout> | null = null;
  private hamburgerButton: HTMLElement | null = null;

  isSidebarOpen = signal(false);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', route: '/', icon: '\u{1F4CA}' },
    { label: 'Transactions', route: '/transactions', icon: '\u{1F4B3}' },
    { label: 'Budget', route: '/budget', icon: '\u{1F4CB}' },
    { label: 'Settings', route: '/settings', icon: '\u2699\uFE0F' },
  ];

  ngAfterViewInit(): void {
    this.hamburgerButton = this.el.nativeElement.querySelector('.hamburger-btn');
  }

  ngOnDestroy(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    if (this.focusTimeout) {
      clearTimeout(this.focusTimeout);
    }
    this.removeBodyScrollLock();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeTimeout = setTimeout(() => {
      if (window.innerWidth >= 768 && this.isSidebarOpen()) {
        this.closeSidebar();
      }
    }, 150);
  }

  toggleSidebar(): void {
    this.isSidebarOpen.set(!this.isSidebarOpen());
    if (this.isSidebarOpen()) {
      this.applyBodyScrollLock();
      this.focusTimeout = setTimeout(() => {
        const firstLink = this.el.nativeElement.querySelector('.sidebar a');
        if (firstLink) {
          firstLink.focus();
        }
      });
    } else {
      this.removeBodyScrollLock();
    }
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
    this.removeBodyScrollLock();
    if (this.hamburgerButton) {
      this.hamburgerButton.focus();
    }
  }

  onNavLinkClick(item: NavItem): void {
    this.analytics.track('nav_link_clicked', { route_path: item.route });
    this.closeSidebarOnMobile();
  }

  closeSidebarOnMobile(): void {
    if (window.innerWidth < 768) {
      this.closeSidebar();
    }
  }

  private applyBodyScrollLock(): void {
    this.renderer.addClass(document.body, 'sidebar-open-no-scroll');
  }

  private removeBodyScrollLock(): void {
    this.renderer.removeClass(document.body, 'sidebar-open-no-scroll');
  }
}
