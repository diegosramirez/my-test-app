import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { HealthCheckComponent } from './health-check.component';
import { HealthService } from './health.service';
import { AnalyticsService } from '../shared/analytics.service';
import { HealthResponse } from './health.model';

describe('HealthCheckComponent', () => {
  let fixture: ComponentFixture<HealthCheckComponent>;
  let component: HealthCheckComponent;
  let mockHealthService: { getHealth: ReturnType<typeof vi.fn> };
  let mockAnalytics: { track: ReturnType<typeof vi.fn> };

  const mockResponse: HealthResponse = {
    status: 'UP',
    uptime: 42,
    timestamp: '2025-01-15T12:00:00.000Z',
  };

  beforeEach(async () => {
    mockHealthService = { getHealth: vi.fn().mockReturnValue(mockResponse) };
    mockAnalytics = { track: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [HealthCheckComponent],
      providers: [
        { provide: HealthService, useValue: mockHealthService },
        { provide: AnalyticsService, useValue: mockAnalytics },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HealthCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render valid JSON in a <pre> element', () => {
    const pre = fixture.nativeElement.querySelector('pre');
    expect(pre).toBeTruthy();
    const parsed = JSON.parse(pre.textContent!);
    expect(parsed.status).toBe('UP');
    expect(parsed.uptime).toBe(42);
    expect(parsed.timestamp).toBe('2025-01-15T12:00:00.000Z');
  });

  it('should contain all HealthResponse fields in rendered JSON', () => {
    const pre = fixture.nativeElement.querySelector('pre');
    const parsed = JSON.parse(pre.textContent!);
    expect(parsed).toHaveProperty('status');
    expect(parsed).toHaveProperty('uptime');
    expect(parsed).toHaveProperty('timestamp');
  });

  it('should set browser tab title to "Health Check"', () => {
    const titleService = TestBed.inject(Title);
    expect(titleService.getTitle()).toBe('Health Check');
  });

  it('should have role="status" on host element', () => {
    const hostEl = fixture.nativeElement;
    expect(hostEl.getAttribute('role')).toBe('status');
  });

  it('should fire health_check_requested analytics event', () => {
    expect(mockAnalytics.track).toHaveBeenCalledWith('health_check_requested', {
      timestamp: '2025-01-15T12:00:00.000Z',
      uptime: 42,
      status: 'UP',
    });
  });

  it('should render formatted JSON with indentation', () => {
    const expected = JSON.stringify(mockResponse, null, 2);
    expect(component.payload).toBe(expected);
  });
});
