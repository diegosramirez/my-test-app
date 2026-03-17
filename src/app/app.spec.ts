import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { NotificationDataSource } from './notifications/services/notification-data-source';
import { StaticNotificationDataSource } from './notifications/services/static-notification-data-source';
import { AnalyticsService, ConsoleAnalyticsService } from './notifications/services/analytics.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: NotificationDataSource, useClass: StaticNotificationDataSource },
        { provide: AnalyticsService, useClass: ConsoleAnalyticsService },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, my-test-app');
  });
});
