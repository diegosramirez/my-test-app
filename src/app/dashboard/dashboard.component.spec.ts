import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../auth/services/auth.service';
import { BehaviorSubject } from 'rxjs';
import { AuthUser } from '../auth/models/auth.models';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let mockUser$: BehaviorSubject<AuthUser | null>;

  beforeEach(async () => {
    localStorage.clear();
    mockUser$ = new BehaviorSubject<AuthUser | null>({ id: 'u1', email: 'a@b.com', name: 'Alice' });

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser$: mockUser$.asObservable(),
            logout: vi.fn(),
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('displays welcome message with user name', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Welcome, Alice');
  });

  it('has a logout button', () => {
    const btn = fixture.nativeElement.querySelector('.logout-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Log out');
  });

  it('calls logout when button clicked', () => {
    const authService = TestBed.inject(AuthService);
    const btn = fixture.nativeElement.querySelector('.logout-btn') as HTMLButtonElement;
    btn.click();
    expect(authService.logout).toHaveBeenCalled();
  });

  it('does not show content when user is null', () => {
    mockUser$.next(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')).toBeNull();
  });
});
