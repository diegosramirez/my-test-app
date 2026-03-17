import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { SignupStep1Component } from './signup-step1.component';
import { AnalyticsService } from '../../services/analytics.service';

describe('SignupStep1Component', () => {
  let component: SignupStep1Component;
  let fixture: ComponentFixture<SignupStep1Component>;
  let httpMock: HttpTestingController;
  let analyticsService: AnalyticsService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupStep1Component],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'signup/step1', component: SignupStep1Component },
          { path: 'signup/step2', component: SignupStep1Component },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SignupStep1Component);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    analyticsService = TestBed.inject(AnalyticsService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should require all fields', () => {
    component.form.markAllAsTouched();
    expect(component.getFieldError('email')).toBe('Email is required');
    expect(component.getFieldError('password')).toBe('Password is required');
    expect(component.getFieldError('passwordConfirmation')).toBe('Password confirmation is required');
  });

  it('should validate email format', () => {
    component.form.get('email')?.setValue('not-an-email');
    component.form.get('email')?.markAsTouched();
    expect(component.getFieldError('email')).toBe('Invalid email format');
  });

  it('should validate password minimum length', () => {
    component.form.get('password')?.setValue('short');
    component.form.get('password')?.markAsTouched();
    expect(component.getFieldError('password')).toBe('Password must be between 8 and 128 characters');
  });

  it('should validate password maximum length', () => {
    component.form.get('password')?.setValue('a'.repeat(129));
    component.form.get('password')?.markAsTouched();
    expect(component.getFieldError('password')).toBe('Password must be between 8 and 128 characters');
  });

  it('should reject whitespace-only password', () => {
    component.form.get('password')?.setValue('        ');
    component.form.get('password')?.markAsTouched();
    expect(component.getFieldError('password')).toBe('Password cannot be blank');
  });

  it('should validate password mismatch', () => {
    component.form.get('password')?.setValue('validpass1');
    component.form.get('passwordConfirmation')?.setValue('different');
    component.form.get('passwordConfirmation')?.markAsTouched();
    expect(component.getFieldError('passwordConfirmation')).toBe('Passwords do not match');
  });

  it('should not submit when form is invalid', () => {
    component.onSubmit();
    httpMock.expectNone('/api/signup/step1');
  });

  it('should send snake_case request on valid submission', () => {
    fillValidForm();
    component.onSubmit();

    const req = httpMock.expectOne('/api/signup/step1');
    expect(req.request.body).toEqual({
      email: 'test@example.com',
      password: 'validpass1',
      password_confirmation: 'validpass1',
    });
    req.flush({ user_id: '123-uuid', step: 1 }, { status: 201, statusText: 'Created' });
  });

  it('should disable submit button during HTTP call', () => {
    fillValidForm();
    component.onSubmit();
    expect(component.submitting()).toBe(true);

    const req = httpMock.expectOne('/api/signup/step1');
    req.flush({ user_id: '123-uuid', step: 1 }, { status: 201, statusText: 'Created' });
    expect(component.submitting()).toBe(false);
  });

  it('should navigate to step2 on success', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    fillValidForm();
    component.onSubmit();

    const req = httpMock.expectOne('/api/signup/step1');
    req.flush({ user_id: '123-uuid', step: 1 }, { status: 201, statusText: 'Created' });
    expect(navigateSpy).toHaveBeenCalledWith(['/signup/step2']);
  });

  it('should track signup attempted with email domain and password length category', () => {
    fillValidForm();
    component.onSubmit();

    const events = analyticsService.getEvents();
    const attempted = events.find((e) => e.name === 'signup_step1_attempted');
    expect(attempted).toBeTruthy();
    expect(attempted!.properties['email_domain']).toBe('example.com');
    expect(attempted!.properties['password_length_category']).toBe('short');

    httpMock.expectOne('/api/signup/step1').flush({ user_id: '123', step: 1 });
  });

  it('should track signup completed on success', () => {
    fillValidForm();
    component.onSubmit();

    const req = httpMock.expectOne('/api/signup/step1');
    req.flush({ user_id: 'test-uuid', step: 1 }, { status: 201, statusText: 'Created' });

    const events = analyticsService.getEvents();
    const completed = events.find((e) => e.name === 'signup_step1_completed');
    expect(completed).toBeTruthy();
    expect(completed!.properties['user_id']).toBe('test-uuid');
  });

  it('should track validation failed for mismatch on client side', () => {
    component.form.get('email')?.setValue('test@example.com');
    component.form.get('password')?.setValue('validpass1');
    component.form.get('passwordConfirmation')?.setValue('differentpass');
    component.onSubmit();

    const events = analyticsService.getEvents();
    expect(events.some((e) => e.name === 'signup_validation_failed' && e.properties['error_type'] === 'mismatch')).toBe(true);
    httpMock.expectNone('/api/signup/step1');
  });

  it('should apply NFC normalization to passwords in request', () => {
    // e followed by combining acute accent (NFD) vs precomposed e-acute (NFC)
    const nfdPassword = 'pa\u0301ssword1';
    const nfcPassword = nfdPassword.normalize('NFC');

    component.form.get('email')?.setValue('test@example.com');
    component.form.get('password')?.setValue(nfdPassword);
    component.form.get('passwordConfirmation')?.setValue(nfdPassword);
    component.onSubmit();

    const req = httpMock.expectOne('/api/signup/step1');
    expect(req.request.body['password']).toBe(nfcPassword);
    expect(req.request.body['password_confirmation']).toBe(nfcPassword);
    req.flush({ user_id: '123', step: 1 });
  });

  it('should never include password values in analytics events', () => {
    fillValidForm();
    component.onSubmit();

    const req = httpMock.expectOne('/api/signup/step1');
    req.flush({ user_id: 'uuid', step: 1 });

    const events = analyticsService.getEvents();
    for (const event of events) {
      const props = JSON.stringify(event.properties);
      expect(props).not.toContain('validpass1');
    }
  });

  function fillValidForm(): void {
    component.form.get('email')?.setValue('test@example.com');
    component.form.get('password')?.setValue('validpass1');
    component.form.get('passwordConfirmation')?.setValue('validpass1');
  }
});
