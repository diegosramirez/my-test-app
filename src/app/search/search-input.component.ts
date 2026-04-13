import { Component, EventEmitter, Output, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, map } from 'rxjs';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-container">
      <label for="search-input" class="sr-only">Search</label>
      <input
        id="search-input"
        type="text"
        [(ngModel)]="searchQuery"
        (input)="onInputChange($event)"
        placeholder="Search for articles..."
        class="search-input"
        autocomplete="off"
      />
      @if (isTyping) {
        <div class="typing-indicator" aria-live="polite">
          <span class="typing-dots">...</span>
        </div>
      }
      @if (searchQuery && searchQuery.length < 2) {
        <div class="min-length-message" role="alert">
          Please enter at least 2 characters to search
        </div>
      }
    </div>
  `,
  styles: [`
    .search-container {
      position: relative;
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
    }

    .search-input {
      width: 100%;
      padding: 16px 20px;
      font-size: 18px;
      border: 2px solid #e1e5e9;
      border-radius: 12px;
      outline: none;
      transition: border-color 0.2s ease;
      box-sizing: border-box;
    }

    .search-input:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .typing-indicator {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: #6c757d;
      font-size: 14px;
    }

    .typing-dots {
      display: inline-block;
      animation: typing 1.5s infinite;
    }

    @keyframes typing {
      0%, 60%, 100% { opacity: 0; }
      30% { opacity: 1; }
    }

    .min-length-message {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 8px;
      color: #ffc107;
      font-size: 14px;
      padding: 4px 8px;
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 4px;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    @media (max-width: 768px) {
      .search-input {
        padding: 14px 16px;
        font-size: 16px;
      }
    }
  `]
})
export class SearchInputComponent implements OnInit, OnDestroy {
  @Output() searchQueryChange = new EventEmitter<string>();

  searchQuery = '';
  isTyping = false;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private typingTimer?: any;

  ngOnInit(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        map(query => query.trim()),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.isTyping = false;
        if (query.length >= 2) {
          this.searchQueryChange.emit(query);
        } else if (query.length === 0) {
          this.searchQueryChange.emit(''); // Clear results when input is empty
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
  }

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    this.isTyping = value.length > 0;

    // Clear previous timer
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    // Set timer to hide typing indicator after 300ms of no typing
    this.typingTimer = setTimeout(() => {
      this.isTyping = false;
    }, 300);

    this.searchSubject.next(value);
  }
}