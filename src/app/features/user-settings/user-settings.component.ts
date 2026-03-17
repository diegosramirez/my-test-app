import { Component, inject, afterNextRender, DestroyRef } from '@angular/core';
import { ThemeService } from '../../core/services/theme.service';
import { AnalyticsService } from '../../core/services/analytics.service';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [],
  templateUrl: './user-settings.component.html',
  styleUrl: './user-settings.component.css'
})
export class UserSettingsComponent {
  protected theme = inject(ThemeService);
  private analytics = inject(AnalyticsService);
  private destroyRef = inject(DestroyRef);
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    });

    afterNextRender(() => {
      this.analytics.track('viewed_settings_page', {
        page: 'settings',
        timestamp: new Date().toISOString()
      });
    });
  }

  onToggle(): void {
    this.theme.toggle();
    this.debouncedTrackToggle();
  }

  private debouncedTrackToggle(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.analytics.track('dark_mode_toggled', {
        state: this.theme.darkMode() ? 'on' : 'off',
        page: 'settings',
        timestamp: new Date().toISOString()
      });
      this.debounceTimer = null;
    }, 500);
  }
}
