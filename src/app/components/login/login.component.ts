import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <h2>Login</h2>
      <p>Login functionality will be implemented here.</p>
    </div>
  `,
  styles: [`
    .login-container {
      padding: 2rem;
      max-width: 400px;
      margin: 0 auto;
    }

    h2 {
      text-align: center;
      margin-bottom: 1rem;
    }
  `]
})
export class LoginComponent {}