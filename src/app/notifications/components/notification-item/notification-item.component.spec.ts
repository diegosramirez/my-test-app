import { describe, it, expect, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { NotificationItemComponent } from './notification-item.component';
import { AppNotification } from '../../models/notification.model';

const MOCK: AppNotification = {
  id: 'n1',
  type: 'info',
  title: 'Test Title',
  description: 'Test description text',
  timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
};

@Component({
  standalone: true,
  imports: [NotificationItemComponent],
  template: `<app-notification-item [notification]="notification" [isRead]="isRead" (markRead)="onMarkRead($event)" />`,
})
class TestHost {
  notification = MOCK;
  isRead = false;
  onMarkRead = vi.fn();
}

describe('NotificationItemComponent', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should display notification title', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.title')?.textContent).toContain('Test Title');
  });

  it('should display description', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.description')?.textContent).toContain('Test description text');
  });

  it('should display relative timestamp', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.timestamp')?.textContent).toContain('5m ago');
  });

  it('should show unread dot when not read', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.unread-dot')).toBeTruthy();
  });

  it('should not show unread dot when read', async () => {
    host.isRead = true;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.unread-dot')).toBeFalsy();
  });

  it('should have read class when read', async () => {
    host.isRead = true;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const item = (fixture.nativeElement as HTMLElement).querySelector('.notification-item');
    expect(item?.classList.contains('read')).toBe(true);
  });

  it('should emit markRead on click when unread', () => {
    const item = (fixture.nativeElement as HTMLElement).querySelector('.notification-item') as HTMLElement;
    item.click();
    expect(host.onMarkRead).toHaveBeenCalledWith('n1');
  });

  it('should NOT emit markRead on click when already read', async () => {
    host.isRead = true;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const item = (fixture.nativeElement as HTMLElement).querySelector('.notification-item') as HTMLElement;
    item.click();
    expect(host.onMarkRead).not.toHaveBeenCalled();
  });

  it('should have correct aria-label', () => {
    const item = (fixture.nativeElement as HTMLElement).querySelector('.notification-item');
    expect(item?.getAttribute('aria-label')).toContain('Test Title');
    expect(item?.getAttribute('aria-label')).toContain('Test description text');
  });

  it('should have role="button" and tabindex', () => {
    const item = (fixture.nativeElement as HTMLElement).querySelector('.notification-item');
    expect(item?.getAttribute('role')).toBe('button');
    expect(item?.getAttribute('tabindex')).toBe('0');
  });

  it('should render type icon', () => {
    const icon = (fixture.nativeElement as HTMLElement).querySelector('.icon-info');
    expect(icon).toBeTruthy();
    expect(icon?.querySelector('svg')).toBeTruthy();
  });
});
