import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoteEditorComponent } from './note-editor.component';
import { NotesService } from './notes.service';
import { ActivatedRoute, Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { Note } from './note.model';

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: overrides.id ?? 'note-1',
    title: overrides.title ?? 'Existing Title',
    body: overrides.body ?? 'Existing Body',
    createdAt: overrides.createdAt ?? '2024-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2024-01-02T00:00:00.000Z',
  };
}

describe('NoteEditorComponent', () => {
  let fixture: ComponentFixture<NoteEditorComponent>;
  let component: NoteEditorComponent;
  let mockService: any;
  let router: Router;

  function setup(params: Record<string, string | null> = {}, existingNote?: Note) {
    mockService = {
      getById: vi.fn((id: string) => existingNote ?? null),
      create: vi.fn((title: string, body: string) => makeNote({ title, body, id: 'new-id' })),
      update: vi.fn((id: string, title: string, body: string) => existingNote ? { ...existingNote, title, body, updatedAt: new Date().toISOString() } : null),
    };

    const mockRoute = {
      snapshot: {
        paramMap: {
          get: (key: string) => params[key] ?? null,
        },
      },
    };

    TestBed.configureTestingModule({
      imports: [NoteEditorComponent],
      providers: [
        provideRouter([]),
        { provide: NotesService, useValue: mockService },
        { provide: ActivatedRoute, useValue: mockRoute },
      ],
    });

    fixture = TestBed.createComponent(NoteEditorComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  describe('Create Mode', () => {
    it('should be in create mode with no id param', () => {
      setup({});
      expect(component.isEditMode).toBe(false);
      expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('New Note');
    });

    it('should have empty title and body', () => {
      setup({});
      expect(component.title).toBe('');
      expect(component.body).toBe('');
    });

    it('should call service.create on save', () => {
      setup({});
      component.title = 'New Title';
      component.body = 'New Body';
      component.onSave();
      expect(mockService.create).toHaveBeenCalledWith('New Title', 'New Body');
    });

    it('should navigate to /notes with saved=true after successful create', () => {
      setup({});
      component.title = 'New Title';
      component.body = 'Body';
      component.onSave();
      expect(router.navigate).toHaveBeenCalledWith(['/notes'], { queryParams: { saved: 'true' } });
    });
  });

  describe('Edit Mode', () => {
    it('should be in edit mode with id param', () => {
      const note = makeNote({ id: 'edit-1', title: 'Edit Me', body: 'Edit body' });
      setup({ id: 'edit-1' }, note);
      expect(component.isEditMode).toBe(true);
      expect(component.title).toBe('Edit Me');
      expect(component.body).toBe('Edit body');
      expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Edit Note');
    });

    it('should call service.update on save in edit mode', () => {
      const note = makeNote({ id: 'edit-1' });
      setup({ id: 'edit-1' }, note);
      component.title = 'Updated';
      component.body = 'Updated body';
      component.onSave();
      expect(mockService.update).toHaveBeenCalledWith('edit-1', 'Updated', 'Updated body');
    });

    it('should redirect to /notes if note not found', () => {
      setup({ id: 'missing-id' }, undefined);
      expect(router.navigate).toHaveBeenCalledWith(['/notes']);
    });
  });

  describe('Validation', () => {
    it('should disable save when title is empty', () => {
      setup({});
      fixture.detectChanges();
      const saveBtn = fixture.nativeElement.querySelector('.btn-save') as HTMLButtonElement;
      expect(saveBtn.disabled).toBe(true);
    });

    it('should enable save when title has content', () => {
      setup({});
      component.title = 'Something';
      fixture.detectChanges();
      const saveBtn = fixture.nativeElement.querySelector('.btn-save') as HTMLButtonElement;
      expect(saveBtn.disabled).toBe(false);
    });

    it('should show title error when saving with empty title', () => {
      setup({});
      component.title = '   ';
      component.onSave();
      fixture.detectChanges();
      expect(component.showTitleError).toBe(true);
      expect(fixture.nativeElement.querySelector('#title-error')?.textContent).toContain('Title is required');
    });

    it('should not call service when title is empty', () => {
      setup({});
      component.title = '';
      component.onSave();
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it('should clear title error on input when title is non-empty', () => {
      setup({});
      component.showTitleError = true;
      component.title = 'Valid';
      component.onInput();
      expect(component.showTitleError).toBe(false);
    });

    it('should have aria-describedby when title error is shown', () => {
      setup({});
      component.showTitleError = true;
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('#note-title');
      expect(input?.getAttribute('aria-describedby')).toBe('title-error');
    });
  });

  describe('Double-click guard', () => {
    it('should set isSaving on save', () => {
      setup({});
      component.title = 'Title';
      component.onSave();
      expect(component.isSaving).toBe(true);
    });

    it('should disable save button when isSaving', () => {
      setup({});
      component.title = 'Title';
      component.isSaving = true;
      fixture.detectChanges();
      const saveBtn = fixture.nativeElement.querySelector('.btn-save') as HTMLButtonElement;
      expect(saveBtn.disabled).toBe(true);
    });

    it('should re-enable isSaving on failed save', () => {
      setup({});
      mockService.create.mockReturnValue(null);
      component.title = 'Title';
      component.onSave();
      expect(component.isSaving).toBe(false);
    });
  });

  describe('Cancel / Discard', () => {
    it('should show "Back" when form is clean', () => {
      setup({});
      fixture.detectChanges();
      const cancelBtn = fixture.nativeElement.querySelector('.btn-cancel');
      expect(cancelBtn?.textContent?.trim()).toBe('Back');
    });

    it('should show "Discard changes" when form is dirty', () => {
      setup({});
      component.isDirty = true;
      fixture.detectChanges();
      const cancelBtn = fixture.nativeElement.querySelector('.btn-cancel');
      expect(cancelBtn?.textContent?.trim()).toBe('Discard changes');
    });

    it('should navigate directly when clean', () => {
      setup({});
      component.isDirty = false;
      component.onCancel();
      expect(router.navigate).toHaveBeenCalledWith(['/notes']);
    });

    it('should show discard dialog when dirty', () => {
      setup({});
      component.isDirty = true;
      const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
      dialog.showModal = vi.fn();
      component.onCancel();
      expect(dialog.showModal).toHaveBeenCalled();
    });

    it('should navigate on discardAndNavigate', () => {
      setup({});
      const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
      dialog.close = vi.fn();
      component.discardAndNavigate();
      expect(router.navigate).toHaveBeenCalledWith(['/notes']);
      expect(component.isDirty).toBe(false);
    });
  });

  describe('Discard Dialog Accessibility', () => {
    it('should have role="dialog" and aria-modal on discard dialog', () => {
      setup({});
      const dialog = fixture.nativeElement.querySelector('dialog');
      expect(dialog?.getAttribute('role')).toBe('dialog');
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      expect(dialog?.getAttribute('aria-labelledby')).toBe('discard-dialog-title');
    });
  });

  describe('onInput', () => {
    it('should set isDirty to true', () => {
      setup({});
      expect(component.isDirty).toBe(false);
      component.onInput();
      expect(component.isDirty).toBe(true);
    });
  });
});
