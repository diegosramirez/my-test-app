import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, timer } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ContactFormPayload } from './contact-form.model';
import { ContactFormService } from './contact-form.service';

function trimmedMinLength(min: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const trimmed = (control.value as string || '').trim();
    return trimmed.length < min ? { minlength: { requiredLength: min, actualLength: trimmed.length } } : null;
  };
}

@Component({
  standalone: true,
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule],
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.css'],
})
export class ContactFormComponent implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private contactService = inject(ContactFormService);
  private destroyRef = inject(DestroyRef);
  private el = inject(ElementRef);

  @ViewChild('successBanner') successBannerRef!: ElementRef<HTMLDivElement>;

  form = this.fb.group({
    name: ['', [Validators.required, trimmedMinLength(2)]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)]],
    subject: [''],
    message: ['', [Validators.required, trimmedMinLength(10)]],
  });

  isSubmitting = false;
  bannerVisible = false;
  bannerFadingOut = false;
  formSubmitted = false;

  private readonly initialValues = { name: '', email: '', subject: '', message: '' };
  private bannerTimerSub: Subscription | null = null;

  ngOnInit(): void {
    this.contactService.logViewed();
  }

  // TODO: ngOnDestroy — add contact_form_abandoned tracking event

  shouldShowError(controlName: string): boolean {
    const control = this.form.get(controlName);
    if (!control) return false;
    return control.invalid && (control.touched || this.formSubmitted);
  }

  getErrorMessage(controlName: string): string {
    const control = this.form.get(controlName);
    if (!control) return '';
    if (control.hasError('required')) {
      return `${this.capitalize(controlName)} is required`;
    }
    if (control.hasError('minlength')) {
      const err = control.getError('minlength');
      return `${this.capitalize(controlName)} must be at least ${err.requiredLength} characters`;
    }
    if (control.hasError('email') || control.hasError('pattern')) {
      return 'Please enter a valid email';
    }
    return '';
  }

  onSubmit(): void {
    if (this.isSubmitting) return;

    if (this.form.invalid) {
      this.formSubmitted = true;
      this.form.markAllAsTouched();

      const invalidFields = Object.keys(this.form.controls).filter(
        (key) => this.form.get(key)?.invalid
      );
      this.contactService.logValidationFailed(invalidFields);

      // Focus and scroll to first invalid field
      const firstInvalid = this.el.nativeElement.querySelector(
        'input.ng-invalid, textarea.ng-invalid'
      ) as HTMLElement | null;
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus();
      }
      return;
    }

    this.isSubmitting = true;
    const payload: ContactFormPayload = {
      name: this.form.value.name!.trim(),
      email: this.form.value.email!.trim(),
      subject: this.form.value.subject ?? '',
      message: this.form.value.message!.trim(),
      timestamp: new Date().toISOString(),
    };

    this.contactService.submit(payload).pipe(
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe({
      next: () => {
        this.showBanner();
        this.form.reset(this.initialValues);
        this.form.markAsPristine();
        this.form.markAsUntouched();
        this.formSubmitted = false;
      },
    });
  }

  showBanner(): void {
    this.bannerTimerSub?.unsubscribe();
    this.bannerVisible = true;
    this.bannerFadingOut = false;
    // Focus the banner for screen reader announcement
    setTimeout(() => {
      this.successBannerRef?.nativeElement?.focus();
    });
    this.bannerTimerSub = timer(5000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.dismissBanner());
  }

  dismissBanner(): void {
    if (!this.bannerVisible) return;
    this.bannerFadingOut = true;
    timer(300)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.bannerVisible = false;
        this.bannerFadingOut = false;
      });
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
