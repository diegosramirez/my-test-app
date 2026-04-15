import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, takeUntil, switchMap } from 'rxjs';
import { JournalService } from '../services/journal.service';
import { JournalEntry, Mood } from '../models/journal-entry.interface';

@Component({
  selector: 'app-journal-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="form-container">
      <div class="form-header">
        <h2>{{ isEditMode ? 'Edit Entry' : 'New Entry' }}</h2>
        <div class="auto-save-status" *ngIf="autoSaveMessage">
          {{ autoSaveMessage }}
        </div>
      </div>

      <form [formGroup]="entryForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="title">Title</label>
          <input
            id="title"
            type="text"
            formControlName="title"
            [class.error]="entryForm.get('title')?.invalid && entryForm.get('title')?.touched"
            placeholder="Enter entry title"
          />
          <div class="error-message" *ngIf="entryForm.get('title')?.invalid && entryForm.get('title')?.touched">
            <span *ngIf="entryForm.get('title')?.errors?.['required']">Title is required</span>
            <span *ngIf="entryForm.get('title')?.errors?.['maxlength']">Title must be less than 100 characters</span>
          </div>
        </div>

        <div class="form-group">
          <label for="mood">Mood</label>
          <select
            id="mood"
            formControlName="mood"
            [class.error]="entryForm.get('mood')?.invalid && entryForm.get('mood')?.touched"
          >
            <option value="">Select your mood</option>
            <option *ngFor="let mood of availableMoods" [value]="mood">
              {{ getMoodEmoji(mood) }} {{ mood }}
            </option>
          </select>
          <div class="error-message" *ngIf="entryForm.get('mood')?.invalid && entryForm.get('mood')?.touched">
            <span *ngIf="entryForm.get('mood')?.errors?.['required']">Mood selection is required</span>
          </div>
        </div>

        <div class="form-group">
          <label for="content">Content</label>
          <textarea
            id="content"
            formControlName="content"
            [class.error]="entryForm.get('content')?.invalid && entryForm.get('content')?.touched"
            placeholder="Write your thoughts..."
            rows="10"
          ></textarea>
          <div class="error-message" *ngIf="entryForm.get('content')?.invalid && entryForm.get('content')?.touched">
            <span *ngIf="entryForm.get('content')?.errors?.['required']">Content is required</span>
            <span *ngIf="entryForm.get('content')?.errors?.['maxlength']">Content must be less than 1000 characters</span>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" routerLink="/journal" class="cancel-button">Cancel</button>
          <button
            type="submit"
            [disabled]="entryForm.invalid || isLoading"
            class="save-button"
          >
            {{ isLoading ? 'Saving...' : (isEditMode ? 'Update Entry' : 'Create Entry') }}
          </button>
        </div>
      </form>

      <div class="error-message" *ngIf="errorMessage">
        {{ errorMessage }}
      </div>
    </div>
  `,
  styles: [`
    .form-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background-color: #f8f9fa;
      min-height: 100vh;
    }

    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #dee2e6;
    }

    .form-header h2 {
      color: #333;
      margin: 0;
    }

    .auto-save-status {
      color: #28a745;
      font-size: 0.9rem;
      font-style: italic;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #333;
    }

    input, select, textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      box-sizing: border-box;
    }

    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }

    input.error, select.error, textarea.error {
      border-color: #dc3545;
    }

    textarea {
      resize: vertical;
      min-height: 200px;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 2rem;
    }

    .cancel-button {
      background-color: #6c757d;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      font-size: 1rem;
    }

    .save-button {
      background-color: #28a745;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }

    .save-button:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }

    .error-message {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
  `]
})
export class JournalFormComponent implements OnInit, OnDestroy {
  entryForm!: FormGroup;
  isEditMode = false;
  entryId: string | null = null;
  isLoading = false;
  errorMessage = '';
  autoSaveMessage = '';
  availableMoods = Object.values(Mood);

  private destroy$ = new Subject<void>();
  private autoSave$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private journalService: JournalService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.entryId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.entryId;

    if (this.isEditMode && this.entryId) {
      this.loadEntry(this.entryId);
    }

    this.setupAutoSave();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): void {
    this.entryForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      content: ['', [Validators.required, Validators.maxLength(1000)]],
      mood: ['', [Validators.required]]
    });
  }

  private setupAutoSave(): void {
    // Auto-save every 30 seconds when form is dirty and valid
    this.entryForm.valueChanges
      .pipe(
        debounceTime(30000), // 30 seconds
        takeUntil(this.destroy$),
        switchMap(() => {
          if (this.entryForm.dirty && this.entryForm.valid && this.isEditMode && this.entryId) {
            return this.journalService.updateEntry(this.entryId, this.entryForm.value);
          }
          return [];
        })
      )
      .subscribe({
        next: () => {
          this.autoSaveMessage = 'Auto-saved at ' + new Date().toLocaleTimeString();
          setTimeout(() => this.autoSaveMessage = '', 3000);
        },
        error: () => {
          this.autoSaveMessage = 'Auto-save failed';
          setTimeout(() => this.autoSaveMessage = '', 3000);
        }
      });
  }

  private loadEntry(id: string): void {
    // For now, we'll simulate loading by using the journal service
    // In a real app, you'd have a getEntry method
    this.journalService.getEntries().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (entries) => {
        const entry = entries.find(e => e.id === id);
        if (entry) {
          this.entryForm.patchValue({
            title: entry.title,
            content: entry.content,
            mood: entry.mood
          });
        }
      },
      error: (error) => {
        this.errorMessage = error.message;
      }
    });
  }

  getMoodEmoji(mood: Mood): string {
    const moodEmojis: Record<Mood, string> = {
      [Mood.HAPPY]: '😊',
      [Mood.SAD]: '😢',
      [Mood.ANXIOUS]: '😰',
      [Mood.CALM]: '😌',
      [Mood.EXCITED]: '🤩',
      [Mood.NEUTRAL]: '😐'
    };
    return moodEmojis[mood] || '😐';
  }

  onSubmit(): void {
    if (this.entryForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const entryData = this.entryForm.value;

    const operation = this.isEditMode && this.entryId
      ? this.journalService.updateEntry(this.entryId, entryData)
      : this.journalService.createEntry(entryData);

    operation.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.router.navigate(['/journal']);
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.isLoading = false;
      }
    });
  }
}