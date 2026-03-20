import { Injectable } from '@angular/core';

export abstract class AnalyticsService {
  abstract trackItemAdded(title: string, timestamp: string): void;
  abstract trackItemToggled(itemId: string, completed: boolean): void;
  abstract trackItemDeleted(itemId: string): void;
  abstract trackPageViewed(itemCount: number): void;
}

@Injectable({ providedIn: 'root' })
export class ConsoleAnalyticsService extends AnalyticsService {
  trackItemAdded(title: string, timestamp: string): void {
    console.debug('todo_item_added', { title, timestamp });
  }

  trackItemToggled(itemId: string, completed: boolean): void {
    console.debug('todo_item_toggled', { itemId, completed });
  }

  trackItemDeleted(itemId: string): void {
    console.debug('todo_item_deleted', { itemId });
  }

  trackPageViewed(itemCount: number): void {
    console.debug('todo_page_viewed', { itemCount });
  }
}
