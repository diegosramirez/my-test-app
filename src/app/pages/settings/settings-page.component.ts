import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h1>Settings</h1>
    <div class="settings-section">
      <h2>Currency</h2>
      <select [(ngModel)]="currency" aria-label="Currency">
        <option value="USD">USD ($)</option>
        <option value="EUR">EUR</option>
        <option value="GBP">GBP</option>
      </select>
    </div>
    <div class="settings-section">
      <h2>Notifications</h2>
      <label class="toggle-label">
        <input type="checkbox" [(ngModel)]="notificationsEnabled" />
        Enable budget alerts
      </label>
    </div>
    <div class="settings-section">
      <h2>Display Name</h2>
      <input type="text" [(ngModel)]="displayName" placeholder="Your name" aria-label="Display name" />
    </div>
    @if (saved()) {
      <p class="save-confirmation" role="status">Settings saved!</p>
    }
    <button class="save-btn" (click)="onSave()">Save Settings</button>
  `,
  styles: [`
    :host { display: block; padding: 1rem; }
    .settings-section { margin-bottom: 1.5rem; }
    .settings-section h2 { font-size: 1rem; color: #6c757d; margin-bottom: 0.5rem; }
    .settings-section select, .settings-section input[type="text"] { padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px; }
    .toggle-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
    .save-btn { padding: 0.5rem 1.5rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .save-confirmation { color: #28a745; font-weight: 600; }
  `],
})
export class SettingsPageComponent {
  private static readonly STORAGE_KEY = 'app-settings';

  currency = 'USD';
  notificationsEnabled = true;
  displayName = '';
  saved = signal(false);

  constructor() {
    this.loadSettings();
  }

  onSave(): void {
    const settings = {
      currency: this.currency,
      notificationsEnabled: this.notificationsEnabled,
      displayName: this.displayName,
    };
    localStorage.setItem(SettingsPageComponent.STORAGE_KEY, JSON.stringify(settings));
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 3000);
  }

  private loadSettings(): void {
    const raw = localStorage.getItem(SettingsPageComponent.STORAGE_KEY);
    if (raw) {
      try {
        const settings = JSON.parse(raw);
        this.currency = settings.currency ?? this.currency;
        this.notificationsEnabled = settings.notificationsEnabled ?? this.notificationsEnabled;
        this.displayName = settings.displayName ?? this.displayName;
      } catch {
        // ignore corrupt data
      }
    }
  }
}
