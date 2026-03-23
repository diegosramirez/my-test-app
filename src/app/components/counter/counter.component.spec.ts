import { TestBed } from '@angular/core/testing';
import { CounterComponent } from './counter.component';
import { CounterService } from '../../services/counter.service';

describe('CounterComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CounterComponent>>;
  let el: HTMLElement;
  let service: CounterService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CounterComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CounterComponent);
    service = TestBed.inject(CounterService);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('should display initial count of 0', () => {
    expect(el.querySelector('[data-testid="counter-value"]')?.textContent?.trim()).toBe('0');
  });

  it('should display updated count after increment', () => {
    service.increment();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="counter-value"]')?.textContent?.trim()).toBe('1');
  });

  it('should display negative count after decrement', () => {
    service.decrement();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="counter-value"]')?.textContent?.trim()).toBe('-1');
  });

  it('should display 0 after reset', () => {
    service.increment();
    service.increment();
    service.reset();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="counter-value"]')?.textContent?.trim()).toBe('0');
  });

  it('should have aria-live on counter display', () => {
    const display = el.querySelector('[data-testid="counter-value"]');
    expect(display?.getAttribute('aria-live')).toBe('polite');
  });

  it('should have aria-labels on all buttons', () => {
    expect(el.querySelector('[data-testid="increment-btn"]')?.getAttribute('aria-label')).toBe('Increment counter by one');
    expect(el.querySelector('[data-testid="decrement-btn"]')?.getAttribute('aria-label')).toBe('Decrement counter by one');
    expect(el.querySelector('[data-testid="reset-btn"]')?.getAttribute('aria-label')).toBe('Reset counter to zero');
  });

  it('should increment when increment button is clicked', () => {
    el.querySelector<HTMLButtonElement>('[data-testid="increment-btn"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="counter-value"]')?.textContent?.trim()).toBe('1');
  });

  it('should decrement when decrement button is clicked', () => {
    el.querySelector<HTMLButtonElement>('[data-testid="decrement-btn"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="counter-value"]')?.textContent?.trim()).toBe('-1');
  });

  it('should reset when reset button is clicked', () => {
    service.increment();
    service.increment();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="reset-btn"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="counter-value"]')?.textContent?.trim()).toBe('0');
  });

  it('should have correct tab order: increment, decrement, reset', () => {
    const buttons = el.querySelectorAll('button');
    expect(buttons[0].getAttribute('data-testid')).toBe('increment-btn');
    expect(buttons[1].getAttribute('data-testid')).toBe('decrement-btn');
    expect(buttons[2].getAttribute('data-testid')).toBe('reset-btn');
  });
});
