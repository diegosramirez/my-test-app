import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { NewsletterService } from './newsletter.service';
import { NewsletterResult } from './newsletter.model';
import { Subscription } from 'rxjs';

export type FormState = 'idle' | 'submitting' | 'success' | 'error' | 'already-subscribed';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function strictEmailValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  return EMAIL_REGEX.test(control.value) ? null : { strictEmail: true };
}

@Component({
  selector: 'app-newsletter',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './newsletter.component.html',
  styleUrls: ['./newsletter.component.css'],
})
export class NewsletterComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly newsletterService = inject(NewsletterService);
  private readonly cdr = inject(ChangeDetectorRef);

  formState: FormState = 'idle';
  serverError = '';
  form!: FormGroup;
  private submitSubscription?: Subscription;

  ngOnInit(): void {
    if (this.newsletterService.isSubscribed()) {
      this.formState = 'already-subscribed';
      return;
    }

    this.form = this.fb.group({
      email: ['', {
        validators: [Validators.required, Validators.email, Validators.maxLength(254), strictEmailValidator],
        updateOn: 'change',
      }],
      website: [''],
    });
  }

  get emailControl() {
    return this.form.get('email')!;
  }

  get emailErrorMessage(): string {
    if (this.emailControl.hasError('required')) {
      return 'Please enter your email address.';
    }
    if (this.emailControl.hasError('email') || this.emailControl.hasError('strictEmail')) {
      return 'Please enter a valid email address.';
    }
    if (this.emailControl.hasError('maxlength')) {
      return 'Please enter a valid email address.';
    }
    return '';
  }

  get showEmailError(): boolean {
    return this.emailControl.invalid && (this.emailControl.dirty || this.emailControl.touched);
  }

  onSubmit(): void {
    if (this.formState === 'submitting') return;

    this.serverError = '';
    this.emailControl.markAsTouched();

    if (this.form.invalid) return;

    // Honeypot check
    if (this.form.get('website')!.value) {
      this.formState = 'success';
      return;
    }

    this.formState = 'submitting';

    this.submitSubscription = this.newsletterService.subscribe(this.emailControl.value.trim()).subscribe((result: NewsletterResult) => {
      if (result.status === 'success') {
        this.formState = 'success';
        this.newsletterService.setSubscribed();
      } else if (result.status === 'duplicate') {
        this.formState = 'error';
        this.serverError = result.message;
      } else {
        this.formState = 'error';
        this.serverError = result.message;
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.submitSubscription?.unsubscribe();
  }
}
