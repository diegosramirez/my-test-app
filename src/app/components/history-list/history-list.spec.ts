import { TestBed } from '@angular/core/testing';
import { HistoryListComponent } from './history-list';
import { CounterService } from '../../services/counter.service';

describe('HistoryListComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<HistoryListComponent>>;
  let service: CounterService;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoryListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryListComponent);
    service = TestBed.inject(CounterService);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should show placeholder when history is empty', () => {
    expect(el.textContent).toContain('No actions yet');
    expect(el.querySelector('ul')).toBeNull();
  });

  it('should render history items in reverse-chronological order', () => {
    service.increment();
    service.decrement();
    service.reset();
    fixture.detectChanges();

    const items = el.querySelectorAll('li');
    expect(items.length).toBe(3);
    expect(items[0].textContent?.trim()).toBe('reset');
    expect(items[1].textContent?.trim()).toBe('-1');
    expect(items[2].textContent?.trim()).toBe('+1');
  });

  it('should use semantic ul/li markup', () => {
    service.increment();
    fixture.detectChanges();

    expect(el.querySelector('ul')).toBeTruthy();
    expect(el.querySelector('li')).toBeTruthy();
  });

  it('should hide placeholder when history has items', () => {
    service.increment();
    fixture.detectChanges();
    expect(el.textContent).not.toContain('No actions yet');
  });
});
