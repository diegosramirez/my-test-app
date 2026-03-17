import { TestBed } from '@angular/core/testing';
import { BudgetPageComponent } from './budget-page.component';
import { BudgetService } from '../../services/budget.service';

describe('BudgetPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetPageComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render h1 with "Budget"', () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Budget');
  });

  it('should display total budgeted', () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[data-testid="total-budgeted"]');
    expect(el).toBeTruthy();
    expect(el.textContent).toContain('$');
  });

  it('should display total spent', () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[data-testid="total-spent"]');
    expect(el).toBeTruthy();
    expect(el.textContent).toContain('$');
  });

  it('should render budget cards for each category', () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.budget-card');
    expect(cards.length).toBe(5);
  });

  it('should display category names', () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    const names = fixture.nativeElement.querySelectorAll('.cat-name');
    const texts = Array.from(names).map((n: any) => n.textContent);
    expect(texts).toContain('Housing');
    expect(texts).toContain('Food');
  });

  it('should have progress bars', () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    const bars = fixture.nativeElement.querySelectorAll('.progress-bar');
    expect(bars.length).toBe(5);
  });

  it('should have mathMin helper', () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    expect(fixture.componentInstance.mathMin(10, 5)).toBe(5);
    expect(fixture.componentInstance.mathMin(3, 7)).toBe(3);
  });

  it('should inject BudgetService', () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    expect(fixture.componentInstance.budgetService).toBeInstanceOf(BudgetService);
  });
});
