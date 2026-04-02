import { Component, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  template: `
    <div class="dashboard">
      <h1 #pageTitle tabindex="-1">Welcome, {{ (user$ | async)?.username }}</h1>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      justify-content: center;
      padding: 2rem 1rem;
    }
    .dashboard {
      width: 100%;
      max-width: 800px;
    }
    h1 {
      color: #1a1a1a;
      outline: none;
    }
  `]
})
export class DashboardComponent implements AfterViewInit {
  private readonly authService = inject(AuthService);
  readonly user$ = this.authService.user$;

  @ViewChild('pageTitle') pageTitle!: ElementRef<HTMLHeadingElement>;

  ngAfterViewInit(): void {
    this.pageTitle?.nativeElement?.focus();
  }
}
