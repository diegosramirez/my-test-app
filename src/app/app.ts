import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Global keyboard shortcuts
    document.addEventListener('keydown', (event) => this.onKeyDown(event));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onKeyDown(event: KeyboardEvent): void {
    // Ctrl+N for new note
    if (event.ctrlKey && event.key === 'n') {
      event.preventDefault();
      this.router.navigate(['/editor']);
    }
  }
}
