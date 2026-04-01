import { TestBed } from '@angular/core/testing';
import { CounterPageComponent } from './counter-page';
import { CounterService } from '../../services/counter.service';

describe('CounterPageComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CounterPageComponent>>;
  let service: CounterService;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CounterPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CounterPageComponent);
    service = TestBed.inject(CounterService);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should render action count as 0 initially', () => {
    expect(el.textContent).toContain('Total actions: 0');
  });

  it('should update action count after actions', () => {
    service.increment();
    service.decrement();
    fixture.detectChanges();
    expect(el.textContent).toContain('Total actions: 2');
  });

  it('should have aria-live polite on action count', () => {
    const ariaLiveElements = el.querySelectorAll('[aria-live="polite"]');
    const actionCountEl = Array.from(ariaLiveElements).find(e =>
      e.textContent?.includes('Total actions')
    );
    expect(actionCountEl).toBeTruthy();
    expect(actionCountEl?.classList.contains('action-count')).toBe(true);
  });

  it('should compose counter-display and history-list', () => {
    expect(el.querySelector('app-counter-display')).toBeTruthy();
    expect(el.querySelector('app-history-list')).toBeTruthy();
  });
});
