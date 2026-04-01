import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthResponse } from '../models/auth.models';

function makeJwt(exp: number): string {
  const h = btoa(JSON.stringify({ alg: 'HS256' }));
  const b = btoa(JSON.stringify({ sub: 'u1', exp }));
  return `${h}.${b}.sig`;
}

const mockResponse: AuthResponse = {
  token: makeJwt(Date.now() / 1000 + 3600),
  user: { id: 'u1', email: 'test@example.com', name: 'Test' }
};

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: LoginComponent },
          { path: 'dashboard', component: LoginComponent },
        ]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('has email and password fields with correct validators', () => {
    expect(component.form.get('email')).toBeTruthy();
    expect(component.form.get('password')).toBeTruthy();
  });

  describe('form validation', () => {
    it('is invalid when empty', () => {
      expect(component.form.invalid).toBe(true);
    });

    it('shows email required error after touch', () => {
      const emailCtrl = component.form.get('email')!;
      emailCtrl.markAsTouched();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('#login-email-error')?.textContent).toContain('required');
    });

    it('shows invalid email error', () => {
      const emailCtrl = component.form.get('email')!;
      emailCtrl.setValue('notanemail');
      emailCtrl.markAsTouched();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#login-email-error')?.textContent).toContain('valid email');
    });

    it('shows password min length error', () => {
      const pwCtrl = component.form.get('password')!;
      pwCtrl.setValue('short');
      pwCtrl.markAsTouched();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#login-password-error')?.textContent).toContain('8 characters');
    });

    it('sets aria-invalid on invalid touched email', () => {
      component.form.get('email')!.markAsTouched();
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('#login-email');
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('sets aria-describedby on invalid touched email', () => {
      component.form.get('email')!.markAsTouched();
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('#login-email');
      expect(input.getAttribute('aria-describedby')).toBe('login-email-error');
    });
  });

  describe('submit button', () => {
    it('is disabled when form is invalid', () => {
      const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('is enabled when form is valid', () => {
      component.form.get('email')!.setValue('test@example.com');
      component.form.get('password')!.setValue('password1');
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      component.form.get('email')!.setValue('test@example.com');
      component.form.get('password')!.setValue('password1');
      fixture.detectChanges();
    });

    it('does not submit if form is invalid', () => {
      component.form.get('email')!.setValue('');
      component.onSubmit();
      httpMock.expectNone('/api/auth/login');
    });

    it('sets loading state and disables form on submit', () => {
      component.onSubmit();
      expect(component.loading).toBe(true);
      expect(component.form.disabled).toBe(true);
      httpMock.expectOne('/api/auth/login').flush(mockResponse);
    });

    it('navigates to /dashboard on success', () => {
      vi.spyOn(router, 'navigateByUrl');
      component.onSubmit();
      httpMock.expectOne('/api/auth/login').flush(mockResponse);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard', { replaceUrl: true });
    });

    it('shows error on 401 without clearing form', () => {
      component.onSubmit();
      httpMock.expectOne('/api/auth/login').flush(
        { error: 'INVALID_CREDENTIALS', message: 'Invalid' },
        { status: 401, statusText: 'Unauthorized' }
      );
      expect(component.errorMessage).toBe('Invalid email or password');
      expect(component.form.get('email')!.value).toBe('test@example.com');
      expect(component.loading).toBe(false);
      expect(component.form.enabled).toBe(true);
    });

    it('shows network error message on status 0', () => {
      component.onSubmit();
      httpMock.expectOne('/api/auth/login').error(new ProgressEvent('error'), { status: 0 });
      expect(component.errorMessage).toContain('Unable to connect');
    });

    it('shows rate limit message on 429', () => {
      component.onSubmit();
      httpMock.expectOne('/api/auth/login').flush('', { status: 429, statusText: 'Too Many' });
      expect(component.errorMessage).toContain('Too many attempts');
    });

    it('shows generic error on 500', () => {
      component.onSubmit();
      httpMock.expectOne('/api/auth/login').flush('', { status: 500, statusText: 'Error' });
      expect(component.errorMessage).toContain('Something went wrong');
    });

    it('prevents double submit while loading', () => {
      component.onSubmit();
      component.onSubmit();
      const reqs = httpMock.match('/api/auth/login');
      expect(reqs.length).toBe(1);
      reqs[0].flush(mockResponse);
    });
  });

  describe('password visibility toggle', () => {
    it('toggles showPassword', () => {
      expect(component.showPassword).toBe(false);
      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(true);
    });

    it('toggle button has correct aria-label', () => {
      const btn = fixture.nativeElement.querySelector('.toggle-password') as HTMLButtonElement;
      expect(btn.getAttribute('aria-label')).toBe('Show password');
      btn.click();
      fixture.detectChanges();
      expect(btn.getAttribute('aria-label')).toBe('Hide password');
    });
  });

  describe('accessibility', () => {
    it('has visible labels for all inputs', () => {
      const labels = fixture.nativeElement.querySelectorAll('label');
      expect(labels.length).toBeGreaterThanOrEqual(2);
      expect(fixture.nativeElement.querySelector('label[for="login-email"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('label[for="login-password"]')).toBeTruthy();
    });

    it('has h1 heading', () => {
      expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Log in');
    });

    it('uses main landmark', () => {
      expect(fixture.nativeElement.querySelector('main')).toBeTruthy();
    });

    it('error messages have role=alert', () => {
      component.form.get('email')!.markAsTouched();
      fixture.detectChanges();
      const errEl = fixture.nativeElement.querySelector('#login-email-error');
      expect(errEl?.getAttribute('role')).toBe('alert');
    });

    it('api error has role=alert', () => {
      fixture.autoDetectChanges(true);
      component.errorMessage = 'Some error';
      fixture.detectChanges();
      const apiErr = fixture.nativeElement.querySelector('.api-error');
      expect(apiErr?.getAttribute('role')).toBe('alert');
    });
  });
});
