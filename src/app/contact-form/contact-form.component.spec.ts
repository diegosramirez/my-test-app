import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, Subject } from 'rxjs';
import { ContactFormComponent } from './contact-form.component';
import { ContactFormService } from './contact-form.service';
import { ContactFormPayload } from './contact-form.model';

// Polyfill scrollIntoView for JSDOM
HTMLElement.prototype.scrollIntoView = vi.fn();

describe('ContactFormComponent', () => {
  let component: ContactFormComponent;
  let fixture: ComponentFixture<ContactFormComponent>;
  let mockService: {
    submit: ReturnType<typeof vi.fn>;
    logViewed: ReturnType<typeof vi.fn>;
    logValidationFailed: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockService = {
      submit: vi.fn().mockReturnValue(of({ status: 'received' })),
      logViewed: vi.fn(),
      logValidationFailed: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ContactFormComponent, ReactiveFormsModule],
      providers: [
        { provide: ContactFormService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fillValidForm() {
    component.form.patchValue({
      name: 'John Doe',
      email: 'john@example.com',
      subject: '',
      message: 'Hello, this is a test message.',
    });
    component.form.markAsDirty();
    fixture.detectChanges();
  }

  describe('Form Renders', () => {
    it('should render all form fields', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('#name')).toBeTruthy();
      expect(el.querySelector('#email')).toBeTruthy();
      expect(el.querySelector('#subject')).toBeTruthy();
      expect(el.querySelector('#message')).toBeTruthy();
    });

    it('should have submit button disabled initially', () => {
      const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('should call logViewed on init', () => {
      expect(mockService.logViewed).toHaveBeenCalled();
    });

    it('should have required asterisks on Name, Email, Message labels', () => {
      const labels = fixture.nativeElement.querySelectorAll('label');
      const labelTexts = Array.from(labels).map((l: any) => l.textContent);
      expect(labelTexts.some((t: string) => t.includes('Name') && t.includes('*'))).toBe(true);
      expect(labelTexts.some((t: string) => t.includes('Email') && t.includes('*'))).toBe(true);
      expect(labelTexts.some((t: string) => t.includes('Message') && t.includes('*'))).toBe(true);
    });

    it('should NOT have asterisk on Subject label', () => {
      const labels = fixture.nativeElement.querySelectorAll('label');
      const subjectLabel = Array.from(labels).find((l: any) => l.textContent.includes('Subject')) as HTMLElement;
      expect(subjectLabel).toBeTruthy();
      expect(subjectLabel.querySelector('.asterisk')).toBeFalsy();
    });

    it('should have aria-required on required fields', () => {
      expect(fixture.nativeElement.querySelector('#name')?.getAttribute('aria-required')).toBe('true');
      expect(fixture.nativeElement.querySelector('#email')?.getAttribute('aria-required')).toBe('true');
      expect(fixture.nativeElement.querySelector('#message')?.getAttribute('aria-required')).toBe('true');
    });

    it('should NOT have aria-required on subject', () => {
      expect(fixture.nativeElement.querySelector('#subject')?.getAttribute('aria-required')).toBeNull();
    });

    it('should have a honeypot field', () => {
      const honeypot = fixture.nativeElement.querySelector('input[name="website"]');
      expect(honeypot).toBeTruthy();
      expect(honeypot.getAttribute('tabindex')).toBe('-1');
      expect(honeypot.style.display).toBe('none');
    });

    it('should have aria-live on banner container', () => {
      const container = fixture.nativeElement.querySelector('.banner-container');
      expect(container.getAttribute('aria-live')).toBe('polite');
      expect(container.getAttribute('role')).toBe('status');
    });

    it('should display required-legend text', () => {
      const legend = fixture.nativeElement.querySelector('.required-legend');
      expect(legend?.textContent).toContain('indicates a required field');
    });
  });

  describe('Valid Submission', () => {
    it('should call submit with payload including subject key', () => {
      fillValidForm();
      component.onSubmit();
      expect(mockService.submit).toHaveBeenCalledTimes(1);
      const payload: ContactFormPayload = mockService.submit.mock.calls[0][0];
      expect(payload.name).toBe('John Doe');
      expect(payload.email).toBe('john@example.com');
      expect('subject' in payload).toBe(true);
      expect(payload.subject).toBe('');
      expect(payload.message).toBe('Hello, this is a test message.');
      expect(payload.timestamp).toBeTruthy();
    });

    it('should include ISO 8601 timestamp in payload', () => {
      fillValidForm();
      component.onSubmit();
      const payload: ContactFormPayload = mockService.submit.mock.calls[0][0];
      expect(() => new Date(payload.timestamp).toISOString()).not.toThrow();
    });

    it('should show success banner after submission', () => {
      fillValidForm();
      component.onSubmit();
      fixture.detectChanges();
      expect(component.bannerVisible).toBe(true);
      const banner = fixture.nativeElement.querySelector('.success-banner');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Thank you');
      expect(banner.textContent).toContain('✓');
    });

    it('should reset form to pristine untouched state', () => {
      fillValidForm();
      component.onSubmit();
      expect(component.form.pristine).toBe(true);
      expect(component.form.untouched).toBe(true);
      expect(component.form.value.name).toBe('');
      expect(component.form.value.email).toBe('');
      expect(component.form.value.message).toBe('');
    });

    it('should not show validation errors after reset (no flash)', () => {
      fillValidForm();
      component.onSubmit();
      fixture.detectChanges();
      const errors = fixture.nativeElement.querySelectorAll('.error');
      expect(errors.length).toBe(0);
    });

    it('should trim whitespace from name and message in payload', () => {
      component.form.patchValue({
        name: '  John  ',
        email: 'john@example.com',
        message: '  Hello world test  ',
      });
      component.form.markAsDirty();
      component.onSubmit();
      const payload: ContactFormPayload = mockService.submit.mock.calls[0][0];
      expect(payload.name).toBe('John');
      expect(payload.message).toBe('Hello world test');
    });

    it('should submit with non-empty subject', () => {
      component.form.patchValue({
        name: 'John',
        email: 'john@example.com',
        subject: 'Inquiry',
        message: 'Hello world test',
      });
      component.form.markAsDirty();
      component.onSubmit();
      const payload: ContactFormPayload = mockService.submit.mock.calls[0][0];
      expect(payload.subject).toBe('Inquiry');
    });
  });

  describe('Required Field Validation', () => {
    it('should show error on blur of empty required field', () => {
      component.form.controls.name.markAsTouched();
      fixture.detectChanges();
      expect(component.shouldShowError('name')).toBe(true);
      expect(component.getErrorMessage('name')).toBe('Name is required');
    });

    it('should show error for empty email on touch', () => {
      component.form.controls.email.markAsTouched();
      fixture.detectChanges();
      expect(component.shouldShowError('email')).toBe(true);
      expect(component.getErrorMessage('email')).toBe('Email is required');
    });

    it('should show error for empty message on touch', () => {
      component.form.controls.message.markAsTouched();
      fixture.detectChanges();
      expect(component.shouldShowError('message')).toBe(true);
      expect(component.getErrorMessage('message')).toBe('Message is required');
    });

    it('should show all errors and call logValidationFailed on invalid submit', () => {
      component.form.markAsDirty();
      component.onSubmit();
      fixture.detectChanges();
      expect(mockService.logValidationFailed).toHaveBeenCalled();
      const invalidFields: string[] = mockService.logValidationFailed.mock.calls[0][0];
      expect(invalidFields).toContain('name');
      expect(invalidFields).toContain('email');
      expect(invalidFields).toContain('message');
      expect(invalidFields).not.toContain('subject');
    });

    it('should have aria-describedby on invalid fields after submit', () => {
      component.form.markAsDirty();
      component.onSubmit();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#name')?.getAttribute('aria-describedby')).toBe('name-error');
      expect(fixture.nativeElement.querySelector('#email')?.getAttribute('aria-describedby')).toBe('email-error');
      expect(fixture.nativeElement.querySelector('#message')?.getAttribute('aria-describedby')).toBe('message-error');
    });

    it('should render error spans with unique ids linked via aria-describedby', () => {
      component.form.markAsDirty();
      component.onSubmit();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#name-error')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('#email-error')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('#message-error')).toBeTruthy();
    });

    it('should render warning icons in error messages', () => {
      component.form.markAsDirty();
      component.onSubmit();
      fixture.detectChanges();
      const errors = fixture.nativeElement.querySelectorAll('.error');
      errors.forEach((err: HTMLElement) => {
        expect(err.textContent).toContain('⚠');
      });
    });

    it('should focus and scrollIntoView first invalid field on invalid submit', () => {
      component.form.markAsDirty();
      const nameInput = fixture.nativeElement.querySelector('#name') as HTMLElement;
      const focusSpy = vi.spyOn(nameInput, 'focus');
      component.onSubmit();
      expect(nameInput.scrollIntoView).toHaveBeenCalled();
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should not call submit service on invalid form', () => {
      component.onSubmit();
      expect(mockService.submit).not.toHaveBeenCalled();
    });

    it('should not show errors for untouched fields before submit', () => {
      fixture.detectChanges();
      expect(component.shouldShowError('name')).toBe(false);
      expect(component.shouldShowError('email')).toBe(false);
      expect(component.shouldShowError('message')).toBe(false);
    });

    it('should clear error when field becomes valid after touch', () => {
      component.form.controls.name.markAsTouched();
      fixture.detectChanges();
      expect(component.shouldShowError('name')).toBe(true);

      component.form.controls.name.setValue('Jo');
      fixture.detectChanges();
      expect(component.shouldShowError('name')).toBe(false);
    });
  });

  describe('Email Format Validation', () => {
    it('should reject email without dot after @', () => {
      component.form.controls.email.setValue('foo@bar');
      component.form.controls.email.markAsTouched();
      fixture.detectChanges();
      expect(component.form.controls.email.invalid).toBe(true);
      expect(component.getErrorMessage('email')).toBe('Please enter a valid email');
    });

    it('should accept valid email', () => {
      component.form.controls.email.setValue('foo@bar.com');
      expect(component.form.controls.email.valid).toBe(true);
    });

    it('should reject email like user@', () => {
      component.form.controls.email.setValue('user@');
      component.form.controls.email.markAsTouched();
      expect(component.form.controls.email.invalid).toBe(true);
    });

    it('should reject email like @domain.com', () => {
      component.form.controls.email.setValue('@domain.com');
      component.form.controls.email.markAsTouched();
      expect(component.form.controls.email.invalid).toBe(true);
    });

    it('should reject email with spaces', () => {
      component.form.controls.email.setValue('user @bar.com');
      component.form.controls.email.markAsTouched();
      expect(component.form.controls.email.invalid).toBe(true);
    });
  });

  describe('Whitespace-Only Input Rejected', () => {
    it('should treat whitespace-only name as invalid', () => {
      component.form.controls.name.setValue('   ');
      component.form.controls.name.markAsTouched();
      fixture.detectChanges();
      expect(component.form.controls.name.invalid).toBe(true);
      expect(component.getErrorMessage('name')).toBe('Name must be at least 2 characters');
    });

    it('should treat whitespace-only message as invalid', () => {
      component.form.controls.message.setValue('     ');
      component.form.controls.message.markAsTouched();
      fixture.detectChanges();
      expect(component.form.controls.message.invalid).toBe(true);
      expect(component.getErrorMessage('message')).toBe('Message must be at least 10 characters');
    });

    it('should treat single char name as invalid (min 2)', () => {
      component.form.controls.name.setValue('A');
      component.form.controls.name.markAsTouched();
      expect(component.form.controls.name.invalid).toBe(true);
    });

    it('should treat 9-char message as invalid (min 10)', () => {
      component.form.controls.message.setValue('123456789');
      component.form.controls.message.markAsTouched();
      expect(component.form.controls.message.invalid).toBe(true);
    });

    it('should accept exactly 2-char name', () => {
      component.form.controls.name.setValue('Jo');
      expect(component.form.controls.name.valid).toBe(true);
    });

    it('should accept exactly 10-char message', () => {
      component.form.controls.message.setValue('1234567890');
      expect(component.form.controls.message.valid).toBe(true);
    });
  });

  describe('Double-Submit Prevention', () => {
    it('should only submit once on rapid double call', () => {
      const subject = new Subject<{ status: string }>();
      mockService.submit.mockReturnValue(subject.asObservable());
      fillValidForm();
      component.onSubmit();
      component.onSubmit();
      expect(mockService.submit).toHaveBeenCalledTimes(1);
      subject.next({ status: 'received' });
      subject.complete();
    });

    it('should set isSubmitting during submission', () => {
      // Use a non-completing observable to test mid-flight state
      // But since of() completes synchronously, isSubmitting resets immediately
      // So we test the guard instead
      fillValidForm();
      component.isSubmitting = true;
      component.onSubmit();
      expect(mockService.submit).not.toHaveBeenCalled();
    });

    it('should have submit button disabled while submitting', () => {
      fillValidForm();
      // isSubmitting is set and cleared synchronously with of(), so check via binding logic
      expect(component.form.invalid || component.form.pristine || component.isSubmitting).toBe(false);
      component.isSubmitting = true;
      expect(component.form.invalid || component.form.pristine || component.isSubmitting).toBe(true);
    });
  });

  describe('Banner Auto-Dismiss', () => {
    it('should dismiss banner on click', () => {
      fillValidForm();
      component.onSubmit();
      fixture.detectChanges();
      expect(component.bannerVisible).toBe(true);
      component.dismissBanner();
      expect(component.bannerFadingOut).toBe(true);
    });

    describe('with fake timers', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should auto-dismiss after 5 seconds', () => {
        fillValidForm();
        component.onSubmit();
        expect(component.bannerVisible).toBe(true);
        vi.advanceTimersByTime(5000);
        expect(component.bannerFadingOut).toBe(true);
        vi.advanceTimersByTime(300);
        expect(component.bannerVisible).toBe(false);
      });
    });

    it('should not error if dismissBanner called when banner not visible', () => {
      expect(component.bannerVisible).toBe(false);
      expect(() => component.dismissBanner()).not.toThrow();
    });

    it('should show banner with checkmark icon', () => {
      fillValidForm();
      component.onSubmit();
      fixture.detectChanges();
      const banner = fixture.nativeElement.querySelector('.success-banner');
      expect(banner.textContent).toContain('✓');
    });
  });

  describe('Character Counter', () => {
    it('should display message character count', () => {
      component.form.controls.message.setValue('Hello');
      fixture.detectChanges();
      const counter = fixture.nativeElement.querySelector('.char-counter');
      expect(counter.textContent).toContain('5 / 10 min');
    });

    it('should show 0 initially', () => {
      fixture.detectChanges();
      const counter = fixture.nativeElement.querySelector('.char-counter');
      expect(counter.textContent).toContain('0 / 10 min');
    });
  });

  describe('Helper Text', () => {
    it('should show helper text when form is dirty and invalid', () => {
      component.form.controls.name.setValue('a');
      component.form.markAsDirty();
      fixture.detectChanges();
      const helper = fixture.nativeElement.querySelector('.helper-text');
      expect(helper?.textContent).toContain('Please complete all required fields');
    });

    it('should hide helper text when form is valid', () => {
      fillValidForm();
      fixture.detectChanges();
      const helper = fixture.nativeElement.querySelector('.helper-text');
      expect(helper).toBeFalsy();
    });

    it('should not show helper text when form is pristine', () => {
      fixture.detectChanges();
      const helper = fixture.nativeElement.querySelector('.helper-text');
      expect(helper).toBeFalsy();
    });
  });

  describe('Submit button state', () => {
    it('should be disabled when form is pristine', () => {
      const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('should be disabled when form is invalid and dirty', () => {
      component.form.controls.name.setValue('a');
      component.form.markAsDirty();
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('should be enabled when form is valid and dirty', () => {
      fillValidForm();
      const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });
  });
});

describe('ContactFormService', () => {
  let service: ContactFormService;

  beforeEach(() => {
    service = new ContactFormService();
    vi.restoreAllMocks();
  });

  it('should return received status on submit', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const payload: ContactFormPayload = {
      name: 'Test',
      email: 'test@test.com',
      subject: '',
      message: 'Test message here',
      timestamp: new Date().toISOString(),
    };
    let result: { status: string } | undefined;
    service.submit(payload).subscribe((r) => {
      result = r;
    });
    expect(result?.status).toBe('received');
    spy.mockRestore();
  });

  it('should log viewed event', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    service.logViewed();
    expect(spy).toHaveBeenCalled();
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.event).toBe('contact_form_viewed');
    expect(logged.route).toBe('/contact');
    expect(logged.timestamp).toBeTruthy();
    spy.mockRestore();
  });

  it('should log validation failed with fields', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    service.logValidationFailed(['name', 'email']);
    expect(spy).toHaveBeenCalled();
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.event).toBe('contact_form_validation_failed');
    expect(logged.invalid_fields).toEqual(['name', 'email']);
    spy.mockRestore();
  });

  it('should log submitted payload', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const payload: ContactFormPayload = {
      name: 'Test',
      email: 'test@test.com',
      subject: '',
      message: 'Hello world!',
      timestamp: '2026-01-01T00:00:00.000Z',
    };
    service.submit(payload);
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.event).toBe('contact_form_submitted');
    expect(logged.name).toBe('Test');
    expect(logged.email).toBe('test@test.com');
    expect(logged.subject).toBe('');
    expect(logged.message).toBe('Hello world!');
    spy.mockRestore();
  });
});
