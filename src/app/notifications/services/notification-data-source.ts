import { Observable } from 'rxjs';
import { AppNotification } from '../models/notification.model';

export abstract class NotificationDataSource {
  abstract getNotifications(): Observable<AppNotification[]>;
}
