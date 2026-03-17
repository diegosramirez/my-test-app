import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { NotificationDataSource } from './notifications/services/notification-data-source';
import { StaticNotificationDataSource } from './notifications/services/static-notification-data-source';
import { AnalyticsService, ConsoleAnalyticsService } from './notifications/services/analytics.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: NotificationDataSource, useClass: StaticNotificationDataSource },
    { provide: AnalyticsService, useClass: ConsoleAnalyticsService },
  ]
};
