import { TestBed } from '@angular/core/testing';
import { TransactionsPageComponent } from './transactions-page.component';

describe('TransactionsPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionsPageComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should be standalone', () => {
    expect((TransactionsPageComponent as any).ɵcmp.standalone).toBe(true);
  });

  it('should render h1 with "Transactions"', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1.textContent).toContain('Transactions');
  });

  it('should render "Coming soon." subtitle', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    const p = fixture.nativeElement.querySelector('p');
    expect(p).toBeTruthy();
    expect(p.textContent).toContain('Coming soon.');
  });
});
