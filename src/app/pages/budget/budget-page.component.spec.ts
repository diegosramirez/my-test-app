import { TestBed } from '@angular/core/testing';
import { BudgetPageComponent } from './budget-page.component';

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

  it('should be standalone', () => {
    expect((BudgetPageComponent as any).ɵcmp.standalone).toBe(true);
  });

  it('should render h1 with "Budget"', () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Budget');
  });

  it('should render "Coming soon." subtitle', () => {
    const fixture = TestBed.createComponent(BudgetPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p').textContent).toContain('Coming soon.');
  });
});
