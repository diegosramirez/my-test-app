export type NotificationType = 'info' | 'warning' | 'success' | 'error';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string; // ISO 8601
}

export interface NotificationReadMap {
  [notificationId: string]: string; // value is ISO timestamp of when marked read
}

export interface GroupedNotifications {
  today: AppNotification[];
  yesterday: AppNotification[];
  older: AppNotification[];
}

export const ANALYTICS_EVENTS = {
  NOTIFICATION_CENTER_OPENED: 'notification_center_opened',
  NOTIFICATION_CENTER_CLOSED: 'notification_center_closed',
  NOTIFICATION_MARKED_READ: 'notification_marked_read',
  NOTIFICATIONS_ALL_MARKED_READ: 'notifications_all_marked_read',
  NOTIFICATION_EMPTY_STATE_SHOWN: 'notification_empty_state_shown',
} as const;
