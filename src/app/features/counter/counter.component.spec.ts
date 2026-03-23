import { TestBed } from '@angular/core/testing';
import { CounterComponent } from './counter.component';
import { TrackingService } from '../../services/tracking.service';

describe('CounterComponent', () => {
  let component: CounterComponent;
  let trackingSpy: ReturnType<typeof vi.fn>;
  let fixture: ReturnType<typeof TestBed.createComponent<CounterComponent>>;

  beforeEach(async () => {
    const mockTracking = { track: vi.fn() };
    trackingSpy = mockTracking.track;

    await TestBed.configureTestingModule({
      imports: [CounterComponent],
      providers: [{ provide: TrackingService, useValue: mockTracking }],
    }).compileComponents();

    fixture = TestBed.createComponent(CounterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function clickButton(testId: string): void {
    const btn = (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial state of 0 with empty history', () => {
    expect(component.counter).toBe(0);
    expect(component.history).toEqual([]);
  });

  it('should show empty history message initially', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="empty-history"]')?.textContent).toContain('No actions yet');
    expect(el.querySelector('[data-testid="history-list"]')).toBeNull();
  });

  it('should display all three buttons', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="increment-btn"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="decrement-btn"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="reset-btn"]')).toBeTruthy();
  });

  it('should have aria-live on counter display', () => {
    const el = fixture.nativeElement as HTMLElement;
    const display = el.querySelector('[data-testid="counter-value"]');
    expect(display?.getAttribute('aria-live')).toBe('polite');
  });

  it('should increment counter', () => {
    component.increment();
    expect(component.counter).toBe(1);
    expect(component.history.length).toBe(1);
    expect(component.history[0].action).toBe('+1');
    expect(component.history[0].resultingValue).toBe(1);
  });

  it('should decrement counter', () => {
    component.decrement();
    expect(component.counter).toBe(-1);
    expect(component.history.length).toBe(1);
    expect(component.history[0].action).toBe('-1');
    expect(component.history[0].resultingValue).toBe(-1);
  });

  it('should decrement to negative values', () => {
    component.decrement();
    component.decrement();
    component.decrement();
    expect(component.counter).toBe(-3);
    expect(component.history[0].resultingValue).toBe(-3);
  });

  it('should reset counter to 0', () => {
    component.increment();
    component.increment();
    component.reset();
    expect(component.counter).toBe(0);
    expect(component.history[0].action).toBe('reset');
    expect(component.history[0].resultingValue).toBe(0);
  });

  it('should reset and log even when already at 0', () => {
    component.reset();
    expect(component.counter).toBe(0);
    expect(component.history.length).toBe(1);
    expect(component.history[0].action).toBe('reset');
    expect(component.history[0].resultingValue).toBe(0);
  });

  it('should prepend history entries in reverse-chronological order', () => {
    component.increment();
    component.increment();
    component.decrement();
    component.reset();

    expect(component.history.length).toBe(4);
    expect(component.history[0].action).toBe('reset');
    expect(component.history[0].resultingValue).toBe(0);
    expect(component.history[1].action).toBe('-1');
    expect(component.history[1].resultingValue).toBe(1);
    expect(component.history[2].action).toBe('+1');
    expect(component.history[2].resultingValue).toBe(2);
    expect(component.history[3].action).toBe('+1');
    expect(component.history[3].resultingValue).toBe(1);
  });

  it('should include timestamp in history entries', () => {
    component.increment();
    expect(component.history[0].timestamp).toBeInstanceOf(Date);
  });

  it('should fire counter_increment tracking event', () => {
    component.increment();
    expect(trackingSpy).toHaveBeenCalledWith({
      eventName: 'counter_increment',
      previousValue: 0,
      newValue: 1,
    });
  });

  it('should fire counter_decrement tracking event', () => {
    component.decrement();
    expect(trackingSpy).toHaveBeenCalledWith({
      eventName: 'counter_decrement',
      previousValue: 0,
      newValue: -1,
    });
  });

  it('should fire counter_reset tracking event', () => {
    component.increment();
    component.increment();
    trackingSpy.mockClear();
    component.reset();
    expect(trackingSpy).toHaveBeenCalledWith({
      eventName: 'counter_reset',
      previousValue: 2,
      newValue: 0,
    });
  });

  it('should fire counter_reset tracking event when already at 0', () => {
    component.reset();
    expect(trackingSpy).toHaveBeenCalledWith({
      eventName: 'counter_reset',
      previousValue: 0,
      newValue: 0,
    });
  });

  it('should render counter value in the template', () => {
    clickButton('increment-btn');
    clickButton('increment-btn');
    clickButton('increment-btn');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="counter-value"]')?.textContent?.trim()).toBe('3');
  });

  it('should render history entries in the template', () => {
    clickButton('increment-btn');
    clickButton('decrement-btn');
    const el = fixture.nativeElement as HTMLElement;
    const entries = el.querySelectorAll('[data-testid="history-entry"]');
    expect(entries.length).toBe(2);
    expect(entries[0].textContent).toContain('-1');
    expect(entries[0].textContent).toContain('0');
    expect(entries[1].textContent).toContain('+1');
    expect(entries[1].textContent).toContain('1');
  });

  it('should hide empty history message after first action', () => {
    clickButton('increment-btn');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="empty-history"]')).toBeNull();
    expect(el.querySelector('[data-testid="history-list"]')).toBeTruthy();
  });

  it('should use native button elements', () => {
    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll('button');
    expect(buttons.length).toBe(3);
  });
});
