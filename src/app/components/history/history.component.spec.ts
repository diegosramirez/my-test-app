import { TestBed } from '@angular/core/testing';
import { HistoryComponent } from './history.component';
import { CounterService } from '../../services/counter.service';

describe('HistoryComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<HistoryComponent>>;
  let el: HTMLElement;
  let service: CounterService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoryComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HistoryComponent);
    service = TestBed.inject(CounterService);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('should show empty state when no actions performed', () => {
    expect(el.textContent).toContain('No actions yet');
    expect(el.querySelector('[data-testid="history-list"]')).toBeNull();
  });

  it('should show history list after an action', () => {
    service.increment();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="history-list"]')).toBeTruthy();
    expect(el.textContent).not.toContain('No actions yet');
  });

  it('should display entries in reverse-chronological order (newest first)', () => {
    service.increment();
    service.decrement();
    service.reset();
    fixture.detectChanges();
    const entries = el.querySelectorAll('[data-testid="history-entry"]');
    expect(entries.length).toBe(3);
    expect(entries[0].textContent).toContain('reset');
    expect(entries[1].textContent).toContain('-1');
    expect(entries[2].textContent).toContain('+1');
  });

  it('should display timestamps in HH:MM:SS format', () => {
    service.increment();
    fixture.detectChanges();
    const entry = el.querySelector('[data-testid="history-entry"]');
    const text = entry?.textContent || '';
    expect(text).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('should use semantic ul/li markup', () => {
    service.increment();
    fixture.detectChanges();
    expect(el.querySelector('ul[data-testid="history-list"]')).toBeTruthy();
    expect(el.querySelector('ul li[data-testid="history-entry"]')).toBeTruthy();
  });

  it('should show +1 entry after increment', () => {
    service.increment();
    fixture.detectChanges();
    const entries = el.querySelectorAll('[data-testid="history-entry"]');
    expect(entries[0].textContent).toContain('+1');
  });

  it('should show -1 entry after decrement', () => {
    service.decrement();
    fixture.detectChanges();
    const entries = el.querySelectorAll('[data-testid="history-entry"]');
    expect(entries[0].textContent).toContain('-1');
  });

  it('should show reset entry after reset', () => {
    service.reset();
    fixture.detectChanges();
    const entries = el.querySelectorAll('[data-testid="history-entry"]');
    expect(entries[0].textContent).toContain('reset');
  });

  it('should accumulate all entries without clearing', () => {
    service.increment();
    service.increment();
    service.decrement();
    fixture.detectChanges();
    const entries = el.querySelectorAll('[data-testid="history-entry"]');
    expect(entries.length).toBe(3);
  });
});
