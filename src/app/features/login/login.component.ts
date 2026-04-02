import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h1>Simple Chat</h1>
        <form (ngSubmit)="onSubmit()" novalidate>
          <label for="username-input">Username</label>
          <input
            #usernameInput
            id="username-input"
            type="text"
            [(ngModel)]="username"
            name="username"
            maxlength="30"
            placeholder="Enter your username"
            [attr.aria-describedby]="showError ? 'username-error' : null"
            autocomplete="off"
          />
          @if (showError) {
            <div id="username-error" class="error" role="alert">Username is required</div>
          }
          <button
            type="submit"
            [disabled]="isButtonDisabled"
            [class.disabled]="isButtonDisabled"
          >
            Join Chat
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f5f5f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .login-card {
      background: white;
      padding: 2.5rem;
      border-radius: 12px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 400px;
      text-align: center;
    }
    h1 {
      margin: 0 0 1.5rem;
      font-size: 1.75rem;
      color: #1a1a1a;
    }
    label {
      display: block;
      text-align: left;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #333;
    }
    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ccc;
      border-radius: 8px;
      font-size: 1rem;
      box-sizing: border-box;
    }
    input:focus {
      outline: 2px solid #2563eb;
      outline-offset: 1px;
    }
    .error {
      color: #dc2626;
      font-size: 0.875rem;
      margin-top: 0.5rem;
      text-align: left;
    }
    button {
      width: 100%;
      padding: 0.75rem;
      margin-top: 1rem;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
    }
    button:hover:not(:disabled) {
      background: #1d4ed8;
    }
    button.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class LoginComponent implements AfterViewInit {
  @ViewChild('usernameInput') usernameInputRef!: ElementRef<HTMLInputElement>;

  username = '';
  showError = false;
  submitting = false;

  constructor(private router: Router) {
    const saved = localStorage.getItem('chat_username');
    if (saved) {
      this.username = saved;
    }
  }

  ngAfterViewInit(): void {
    this.usernameInputRef.nativeElement.focus();
  }

  get isButtonDisabled(): boolean {
    return this.username.trim().length === 0 || this.submitting;
  }

  onSubmit(): void {
    const trimmed = this.username.trim();
    if (!trimmed) {
      this.showError = true;
      return;
    }
    this.showError = false;
    this.submitting = true;
    localStorage.setItem('chat_username', trimmed);
    this.router.navigate(['/chat']);
  }
}
