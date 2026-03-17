import { TestBed } from '@angular/core/testing';
import { DashboardPageComponent } from './dashboard-page.component';

describe('DashboardPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should be standalone', () => {
    expect((DashboardPageComponent as any).ɵcmp.standalone).toBe(true);
  });

  it('should render h1 with "Dashboard"', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1.textContent).toContain('Dashboard');
  });

  it('should render "Coming soon." subtitle', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    const p = fixture.nativeElement.querySelector('p');
    expect(p).toBeTruthy();
    expect(p.textContent).toContain('Coming soon.');
  });
});
