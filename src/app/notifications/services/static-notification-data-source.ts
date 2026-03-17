import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AppNotification } from '../models/notification.model';
import { NotificationDataSource } from './notification-data-source';
import { SEED_NOTIFICATIONS } from '../data/seed-notifications';

@Injectable()
export class StaticNotificationDataSource extends NotificationDataSource {
  getNotifications(): Observable<AppNotification[]> {
    return of([...SEED_NOTIFICATIONS]);
  }
}
