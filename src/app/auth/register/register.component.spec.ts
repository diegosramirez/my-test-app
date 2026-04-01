import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RegisterComponent } from './register.component';
import { AuthResponse } from '../models/auth.models';

function makeJwt(exp: number): string {
  const h = btoa(JSON.stringify({ alg: 'HS256' }));
  const b = btoa(JSON.stringify({ sub: 'u1', exp }));
  return `${h}.${b}.sig`;
}

const mockResponse: AuthResponse = {
  token: makeJwt(Date.now() / 1000 + 3600),
  user: { id: 'u1', email: 'test@example.com', name: 'Test User' }
};

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'register', component: RegisterComponent },
          { path: 'dashboard', component: RegisterComponent },
        ]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
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

  describe('form validation', () => {
    it('is invalid when empty', () => {
      expect(component.form.invalid).toBe(true);
    });

    it('shows name required error', () => {
      component.form.get('name')!.markAsTouched();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#register-name-error')?.textContent).toContain('required');
    });

    it('shows email required error', () => {
      component.form.get('email')!.markAsTouched();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#register-email-error')?.textContent).toContain('required');
    });

    it('shows password min length error', () => {
      component.form.get('password')!.setValue('short');
      component.form.get('password')!.markAsTouched();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#register-password-error')?.textContent).toContain('8 characters');
    });

    it('shows confirm password required error', () => {
      component.form.get('confirmPassword')!.markAsTouched();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#register-confirm-password-error')?.textContent).toContain('confirm');
    });

    it('shows password mismatch error', () => {
      component.form.get('password')!.setValue('password1');
      component.form.get('confirmPassword')!.setValue('password2');
      component.form.get('confirmPassword')!.markAsTouched();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#register-confirm-password-error')?.textContent).toContain('do not match');
    });

    it('no mismatch when passwords match', () => {
      component.form.get('password')!.setValue('password1');
      component.form.get('confirmPassword')!.setValue('password1');
      component.form.get('confirmPassword')!.markAsTouched();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#register-confirm-password-error')).toBeNull();
    });

    it('sets aria-invalid on invalid touched fields', () => {
      component.form.get('name')!.markAsTouched();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#register-name').getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('submit', () => {
    function fillValid() {
      component.form.get('name')!.setValue('Test');
      component.form.get('email')!.setValue('test@example.com');
      component.form.get('password')!.setValue('password1');
      component.form.get('confirmPassword')!.setValue('password1');
      fixture.detectChanges();
    }

    it('does not submit invalid form', () => {
      component.onSubmit();
      httpMock.expectNone('/api/auth/register');
    });

    it('sends register request and navigates on success', () => {
      fillValid();
      vi.spyOn(router, 'navigateByUrl');
      component.onSubmit();
      expect(component.loading).toBe(true);

      const req = httpMock.expectOne('/api/auth/register');
      expect(req.request.body.name).toBe('Test');
      expect(req.request.body.email).toBe('test@example.com');
      expect(req.request.body.password).toBe('password1');
      // confirmPassword should NOT be sent
      expect(req.request.body.confirmPassword).toBeUndefined();
      req.flush(mockResponse);

      expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard', { replaceUrl: true });
    });

    it('shows 409 duplicate email error without clearing form', () => {
      fillValid();
      component.onSubmit();
      httpMock.expectOne('/api/auth/register').flush(
        { error: 'EMAIL_ALREADY_EXISTS', message: 'Dup' },
        { status: 409, statusText: 'Conflict' }
      );
      expect(component.errorMessage).toBe('Email already in use');
      expect(component.form.get('email')!.value).toBe('test@example.com');
      expect(component.loading).toBe(false);
    });

    it('shows network error on status 0', () => {
      fillValid();
      component.onSubmit();
      httpMock.expectOne('/api/auth/register').error(new ProgressEvent('error'), { status: 0 });
      expect(component.errorMessage).toContain('Unable to connect');
    });

    it('shows 429 rate limit message', () => {
      fillValid();
      component.onSubmit();
      httpMock.expectOne('/api/auth/register').flush('', { status: 429, statusText: 'Too Many' });
      expect(component.errorMessage).toContain('Too many attempts');
    });

    it('shows 422 field-specific errors', () => {
      fillValid();
      component.onSubmit();
      httpMock.expectOne('/api/auth/register').flush(
        { error: 'VALIDATION_ERROR', message: 'Validation', details: [{ field: 'email', message: 'Invalid domain' }] },
        { status: 422, statusText: 'Unprocessable' }
      );
      expect(component.errorMessage).toContain('Invalid domain');
    });

    it('prevents double submit', () => {
      fillValid();
      component.onSubmit();
      component.onSubmit();
      expect(httpMock.match('/api/auth/register').length).toBe(1);
    });
  });

  describe('password visibility', () => {
    it('toggles password visibility', () => {
      expect(component.showPassword).toBe(false);
      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(true);
    });

    it('toggles confirm password visibility', () => {
      expect(component.showConfirmPassword).toBe(false);
      component.toggleConfirmPasswordVisibility();
      expect(component.showConfirmPassword).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('has visible labels for all inputs', () => {
      expect(fixture.nativeElement.querySelector('label[for="register-name"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('label[for="register-email"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('label[for="register-password"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('label[for="register-confirm-password"]')).toBeTruthy();
    });

    it('has h1 heading', () => {
      expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Create your account');
    });

    it('uses main landmark', () => {
      expect(fixture.nativeElement.querySelector('main')).toBeTruthy();
    });
  });
});
