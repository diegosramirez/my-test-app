import { ENVIRONMENT_INITIALIZER, inject, makeEnvironmentProviders } from '@angular/core';
import { Router } from '@angular/router';
import { CommandRegistryService } from './command-registry.service';
import { ThemeService } from '../shared/theme.service';

export function provideDefaultCommands() {
  return makeEnvironmentProviders([
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        const registry = inject(CommandRegistryService);
        const router = inject(Router);
        const themeService = inject(ThemeService);

        registry.register({
          id: 'nav:dashboard',
          label: 'Go to Dashboard',
          category: 'navigation',
          icon: '\u{1F3E0}',
          keywords: ['home', 'main'],
          execute: () => { router.navigate(['/dashboard']); },
        });

        registry.register({
          id: 'nav:profile',
          label: 'Go to Profile',
          category: 'navigation',
          icon: '\u{1F464}',
          keywords: ['account', 'user'],
          execute: () => { router.navigate(['/profile']); },
        });

        registry.register({
          id: 'nav:settings',
          label: 'Go to Settings',
          category: 'navigation',
          icon: '\u2699\uFE0F',
          keywords: ['preferences', 'config', 'configuration'],
          execute: () => { router.navigate(['/settings']); },
        });

        registry.register({
          id: 'nav:help',
          label: 'Go to Help',
          category: 'navigation',
          icon: '\u2753',
          keywords: ['support', 'docs', 'documentation', 'faq'],
          execute: () => { router.navigate(['/help']); },
        });

        registry.register({
          id: 'action:dark-mode',
          label: 'Toggle Dark Mode',
          category: 'action',
          icon: '\u{1F31C}',
          keywords: ['theme', 'light', 'dark', 'appearance'],
          execute: () => { themeService.toggle(); },
        });
      },
    },
  ]);
}
