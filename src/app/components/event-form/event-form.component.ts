import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { EventService } from '../../services/event.service';
import { Event } from '../../models/event.interface';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="form-container">
      <div class="form-header">
        <h1 class="form-title">{{ isEditMode ? 'Edit Event' : 'Create New Event' }}</h1>
        <button
          type="button"
          class="btn btn-cancel"
          (click)="navigateToEventList()">
          Cancel
        </button>
      </div>

      <form [formGroup]="eventForm" (ngSubmit)="onSubmit()" class="event-form">
        <div class="form-group">
          <label for="title" class="form-label">
            Event Title *
            <span class="char-count">{{ titleCharCount }}/100</span>
          </label>
          <input
            id="title"
            type="text"
            formControlName="title"
            class="form-control"
            [class.error]="isFieldInvalid('title')"
            placeholder="Enter event title"
            maxlength="100">
          <div class="error-message" *ngIf="isFieldInvalid('title')">
            <span *ngIf="eventForm.get('title')?.errors?.['required']">Title is required</span>
            <span *ngIf="eventForm.get('title')?.errors?.['minlength']">Title must be at least 3 characters</span>
            <span *ngIf="eventForm.get('title')?.errors?.['maxlength']">Title cannot exceed 100 characters</span>
          </div>
        </div>

        <div class="form-group">
          <label for="date" class="form-label">Event Date & Time *</label>
          <input
            id="date"
            type="datetime-local"
            formControlName="date"
            class="form-control"
            [class.error]="isFieldInvalid('date')"
            [min]="minDate">
          <div class="error-message" *ngIf="isFieldInvalid('date')">
            <span *ngIf="eventForm.get('date')?.errors?.['required']">Date is required</span>
            <span *ngIf="eventForm.get('date')?.errors?.['futureDate']">Event date must be in the future</span>
          </div>
        </div>

        <div class="form-group">
          <label for="location" class="form-label">
            Location
            <span class="char-count">{{ locationCharCount }}/200</span>
          </label>
          <input
            id="location"
            type="text"
            formControlName="location"
            class="form-control"
            [class.error]="isFieldInvalid('location')"
            placeholder="Enter event location (optional)"
            maxlength="200">
          <div class="error-message" *ngIf="isFieldInvalid('location')">
            <span *ngIf="eventForm.get('location')?.errors?.['maxlength']">Location cannot exceed 200 characters</span>
          </div>
        </div>

        <div class="form-group">
          <label for="description" class="form-label">
            Description
            <span class="char-count">{{ descriptionCharCount }}/500</span>
          </label>
          <textarea
            id="description"
            formControlName="description"
            class="form-control textarea"
            [class.error]="isFieldInvalid('description')"
            placeholder="Enter event description (optional)"
            rows="4"
            maxlength="500"></textarea>
          <div class="error-message" *ngIf="isFieldInvalid('description')">
            <span *ngIf="eventForm.get('description')?.errors?.['maxlength']">Description cannot exceed 500 characters</span>
          </div>
        </div>

        <div class="form-actions">
          <button
            type="button"
            class="btn btn-secondary"
            (click)="navigateToEventList()">
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="eventForm.invalid || isSubmitting">
            {{ isSubmitting ? 'Saving...' : (isEditMode ? 'Update Event' : 'Create Event') }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .form-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }

    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #eee;
    }

    .form-title {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 600;
      color: #333;
    }

    .event-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      color: #333;
      margin-bottom: 6px;
      font-size: 0.9375rem;
    }

    .char-count {
      font-size: 0.8125rem;
      font-weight: 400;
      color: #666;
    }

    .form-control {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      min-height: 44px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .form-control.error {
      border-color: #dc3545;
    }

    .form-control.error:focus {
      border-color: #dc3545;
      box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
    }

    .textarea {
      resize: vertical;
      min-height: 100px;
      font-family: inherit;
    }

    .error-message {
      color: #dc3545;
      font-size: 0.8125rem;
      margin-top: 4px;
      min-height: 20px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      min-height: 44px;
      min-width: 120px;
      transition: background-color 0.2s ease;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0056b3;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }

    .btn-cancel {
      background: #6c757d;
      color: white;
      padding: 8px 16px;
      font-size: 0.875rem;
      min-width: auto;
      min-height: 36px;
    }

    .btn-cancel:hover {
      background: #5a6268;
    }

    @media (max-width: 480px) {
      .form-container {
        padding: 16px;
      }

      .form-header {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
      }

      .form-actions {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class EventFormComponent implements OnInit {
  eventForm!: FormGroup;
  isEditMode = false;
  isSubmitting = false;
  eventId: string | null = null;
  minDate = '';

  get titleCharCount(): number {
    return this.eventForm.get('title')?.value?.length || 0;
  }

  get locationCharCount(): number {
    return this.eventForm.get('location')?.value?.length || 0;
  }

  get descriptionCharCount(): number {
    return this.eventForm.get('description')?.value?.length || 0;
  }

  constructor(
    private formBuilder: FormBuilder,
    private eventService: EventService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.setMinDate();
  }

  ngOnInit(): void {
    this.initializeForm();
    this.checkEditMode();
  }

  private initializeForm(): void {
    this.eventForm = this.formBuilder.group({
      title: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100)
      ]],
      date: ['', [
        Validators.required,
        this.futureDateValidator
      ]],
      location: ['', [
        Validators.maxLength(200)
      ]],
      description: ['', [
        Validators.maxLength(500)
      ]]
    });

    // Setup blur validation for most fields, immediate for character limits
    this.setupValidationTiming();
  }

  private setupValidationTiming(): void {
    // Blur validation for required and logic validators
    ['title', 'date'].forEach(fieldName => {
      this.eventForm.get(fieldName)?.valueChanges.subscribe(() => {
        if (this.eventForm.get(fieldName)?.touched) {
          this.eventForm.get(fieldName)?.updateValueAndValidity({ emitEvent: false });
        }
      });
    });

    // Immediate validation for character limits
    ['title', 'location', 'description'].forEach(fieldName => {
      this.eventForm.get(fieldName)?.valueChanges.subscribe(() => {
        const control = this.eventForm.get(fieldName);
        if (control?.errors?.['maxlength']) {
          control.markAsTouched();
        }
      });
    });
  }

  private setMinDate(): void {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    this.minDate = `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private checkEditMode(): void {
    this.eventId = this.route.snapshot.paramMap.get('id');
    if (this.eventId) {
      this.isEditMode = true;
      this.loadEventForEdit();
    }
  }

  private loadEventForEdit(): void {
    if (!this.eventId) return;

    const event = this.eventService.getEventById(this.eventId);
    if (event) {
      const formattedDate = this.formatDateForInput(event.date);
      this.eventForm.patchValue({
        title: event.title,
        date: formattedDate,
        location: event.location || '',
        description: event.description || ''
      });
    } else {
      console.error('Event not found');
      this.navigateToEventList();
    }
  }

  private formatDateForInput(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private futureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }

    const selectedDate = new Date(control.value);
    const now = new Date();

    return selectedDate > now ? null : { futureDate: true };
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.eventForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  onSubmit(): void {
    if (this.eventForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      const formValue = this.eventForm.value;
      const eventData = {
        title: formValue.title.trim(),
        date: new Date(formValue.date),
        location: formValue.location?.trim() || undefined,
        description: formValue.description?.trim() || undefined
      };

      try {
        if (this.isEditMode && this.eventId) {
          const success = this.eventService.updateEvent(this.eventId, eventData);
          if (success) {
            this.navigateToEventList();
          } else {
            console.error('Failed to update event');
            this.isSubmitting = false;
          }
        } else {
          this.eventService.saveEvent(eventData);
          this.navigateToEventList();
        }
      } catch (error) {
        console.error('Error saving event:', error);
        this.isSubmitting = false;
      }
    } else {
      this.markAllFieldsAsTouched();
    }
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.eventForm.controls).forEach(key => {
      this.eventForm.get(key)?.markAsTouched();
    });
  }

  navigateToEventList(): void {
    this.router.navigate(['/events']);
  }
}