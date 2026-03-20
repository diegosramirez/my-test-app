import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NewsletterComponent } from './newsletter.component';
import { NewsletterService } from './newsletter.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('NewsletterComponent', () => {
  let component: NewsletterComponent;
  let fixture: ComponentFixture<NewsletterComponent>;
  let httpMock: HttpTestingController;
  let service: NewsletterService;

  function setup(isSubscribed = false) {
    TestBed.configureTestingModule({
      imports: [NewsletterComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    service = TestBed.inject(NewsletterService);
    vi.spyOn(service, 'isSubscribed').mockReturnValue(isSubscribed);
    vi.spyOn(service, 'setSubscribed').mockImplementation(() => {});

    fixture = TestBed.createComponent(NewsletterComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  // AC1: Valid Subscription
  it('should show success message and set localStorage on valid submission', () => {
    setup();
    component.form.get('email')!.setValue('user@example.com');
    component.onSubmit();

    expect(component.formState).toBe('submitting');

    const req = httpMock.expectOne('/api/newsletter/subscribe');
    req.flush({});

    expect(component.formState).toBe('success');
    expect(service.setSubscribed).toHaveBeenCalled();

    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.success-message')?.textContent).toContain("You're subscribed!");
  });

  // AC2: Empty Submission Blocked
  it('should show error when email is empty', () => {
    setup();
    component.onSubmit();
    fixture.detectChanges();

    expect(component.emailErrorMessage).toBe('Please enter your email address.');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.error-message')?.textContent).toContain('Please enter your email address');
    httpMock.expectNone('/api/newsletter/subscribe');
  });

  // AC3: Invalid Email Rejected
  it('should show error for invalid email and make no request', () => {
    setup();
    component.form.get('email')!.setValue('not-an-email');
    component.onSubmit();
    fixture.detectChanges();

    expect(component.emailErrorMessage).toBe('Please enter a valid email address.');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.error-message')?.textContent).toContain('Please enter a valid email address');
    httpMock.expectNone('/api/newsletter/subscribe');
  });

  // AC4: Duplicate Email Handled
  it('should show duplicate message on 409 and preserve input', () => {
    setup();
    component.form.get('email')!.setValue('dup@example.com');
    component.onSubmit();

    const req = httpMock.expectOne('/api/newsletter/subscribe');
    req.flush({}, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(component.serverError).toContain('already subscribed');
    expect(component.form.get('email')!.value).toBe('dup@example.com');
    expect(service.setSubscribed).not.toHaveBeenCalled();
  });

  // AC5: Network Error Handled
  it('should show error on network failure and preserve input', () => {
    setup();
    component.form.get('email')!.setValue('err@example.com');
    component.onSubmit();

    const req = httpMock.expectOne('/api/newsletter/subscribe');
    req.flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(component.serverError).toContain('Something went wrong');
    expect(component.form.get('email')!.value).toBe('err@example.com');
  });

  // AC6: Double-Submit Prevented
  it('should disable button and prevent duplicate submissions while submitting', () => {
    setup();
    component.form.get('email')!.setValue('user@example.com');
    component.onSubmit();
    fixture.detectChanges();

    expect(component.formState).toBe('submitting');
    const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Subscribing');

    // Second submit should be no-op
    component.onSubmit();
    httpMock.expectOne('/api/newsletter/subscribe');
  });

  // AC7: Accessibility
  it('should have proper aria attributes for accessibility', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;

    // Visible label
    const label = el.querySelector('label[for="email"]');
    expect(label).toBeTruthy();
    expect(label!.textContent).toContain('Email');

    // Input exists
    const input = el.querySelector('input#email') as HTMLInputElement;
    expect(input).toBeTruthy();

    // Submit to trigger error
    component.onSubmit();
    fixture.detectChanges();

    // aria-describedby links to error
    expect(input.getAttribute('aria-describedby')).toBe('email-error');
    expect(input.getAttribute('aria-invalid')).toBe('true');

    // Error has role="alert"
    const errorDiv = el.querySelector('#email-error');
    expect(errorDiv?.getAttribute('role')).toBe('alert');
  });

  it('should have aria-live on success message', () => {
    setup();
    component.form.get('email')!.setValue('user@example.com');
    component.onSubmit();

    httpMock.expectOne('/api/newsletter/subscribe').flush({});
    fixture.detectChanges();

    const successEl = fixture.nativeElement.querySelector('[aria-live="polite"]');
    expect(successEl).toBeTruthy();
    expect(successEl.textContent).toContain("You're subscribed!");
  });

  // AC8: Returning Subscriber Suppressed
  it('should show already subscribed message when localStorage flag is set', () => {
    setup(true);

    expect(component.formState).toBe('already-subscribed');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.already-subscribed-message')?.textContent).toContain("You're already subscribed");
    expect(el.querySelector('form')).toBeNull();
  });

  // Honeypot
  it('should silently simulate success when honeypot is filled', () => {
    setup();
    component.form.get('email')!.setValue('bot@example.com');
    component.form.get('website')!.setValue('http://spam.com');
    component.onSubmit();
    fixture.detectChanges();

    expect(component.formState).toBe('success');
    httpMock.expectNone('/api/newsletter/subscribe');
    expect(service.setSubscribed).not.toHaveBeenCalled();
  });
});
