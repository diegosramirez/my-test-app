import { TestBed } from '@angular/core/testing';
import { CounterDisplayComponent } from './counter-display';
import { CounterService } from '../../services/counter.service';

describe('CounterDisplayComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CounterDisplayComponent>>;
  let service: CounterService;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CounterDisplayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CounterDisplayComponent);
    service = TestBed.inject(CounterService);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should display counter value 0 initially', () => {
    const display = el.querySelector('[data-testid="counter-value"]');
    expect(display?.textContent?.trim()).toBe('0');
  });

  it('should have all three buttons', () => {
    expect(el.querySelector('[data-testid="increment-btn"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="decrement-btn"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="reset-btn"]')).toBeTruthy();
  });

  it('should have all buttons always enabled', () => {
    const buttons = el.querySelectorAll('button');
    buttons.forEach(btn => {
      expect(btn.disabled).toBe(false);
    });

    service.decrement();
    service.decrement();
    fixture.detectChanges();

    buttons.forEach(btn => {
      expect(btn.disabled).toBe(false);
    });
  });

  it('should increment on +1 click', () => {
    el.querySelector<HTMLButtonElement>('[data-testid="increment-btn"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="counter-value"]')?.textContent?.trim()).toBe('1');
  });

  it('should decrement on -1 click', () => {
    el.querySelector<HTMLButtonElement>('[data-testid="decrement-btn"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="counter-value"]')?.textContent?.trim()).toBe('-1');
  });

  it('should reset on Reset click', () => {
    service.increment();
    service.increment();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="reset-btn"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="counter-value"]')?.textContent?.trim()).toBe('0');
  });

  it('should have aria-live polite on counter value', () => {
    const display = el.querySelector('[data-testid="counter-value"]');
    expect(display?.getAttribute('aria-live')).toBe('polite');
  });
});
