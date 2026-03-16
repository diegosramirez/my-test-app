import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotesListComponent } from './notes-list.component';
import { NotesService } from './notes.service';
import { Note } from './note.model';
import { ActivatedRoute } from '@angular/router';
import { signal, computed } from '@angular/core';
import { provideRouter } from '@angular/router';

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: overrides.id ?? 'note-1',
    title: overrides.title ?? 'Test Note',
    body: overrides.body ?? 'Test body',
    createdAt: overrides.createdAt ?? '2024-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2024-01-02T00:00:00.000Z',
  };
}

function createMockService(notesList: Note[] = []) {
  const _notes = signal<Note[]>(notesList);
  return {
    notes: computed(() => [..._notes()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
    storageAvailable: signal(true),
    storageFull: signal(false),
    getStorageSizeBytes: () => 1024,
    delete: vi.fn((id: string) => {
      _notes.update(n => n.filter(x => x.id !== id));
      return true;
    }),
    _notes,
  };
}

describe('NotesListComponent', () => {
  let fixture: ComponentFixture<NotesListComponent>;
  let component: NotesListComponent;
  let mockService: ReturnType<typeof createMockService>;
  let mockRoute: any;

  function setup(notes: Note[] = [], queryParams: Record<string, string> = {}) {
    mockService = createMockService(notes);
    mockRoute = {
      snapshot: { queryParamMap: { get: (key: string) => queryParams[key] ?? null } },
    };

    TestBed.configureTestingModule({
      imports: [NotesListComponent],
      providers: [
        provideRouter([]),
        { provide: NotesService, useValue: mockService },
        { provide: ActivatedRoute, useValue: mockRoute },
      ],
    });

    fixture = TestBed.createComponent(NotesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    setup();
    expect(component).toBeTruthy();
  });

  describe('Empty State', () => {
    it('should show empty state when no notes exist', () => {
      setup([]);
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.empty-state')).toBeTruthy();
      expect(el.textContent).toContain('No notes yet');
      expect(el.textContent).toContain('Create your first note');
    });

    it('should not show sort label or notes grid when empty', () => {
      setup([]);
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.sort-label')).toBeNull();
      expect(el.querySelector('.notes-grid')).toBeNull();
    });
  });

  describe('Notes List', () => {
    it('should render note cards when notes exist', () => {
      setup([makeNote(), makeNote({ id: 'note-2', title: 'Second', updatedAt: '2024-01-03T00:00:00.000Z' })]);
      const el: HTMLElement = fixture.nativeElement;
      const cards = el.querySelectorAll('.note-card');
      expect(cards.length).toBe(2);
    });

    it('should show "Recently updated" label', () => {
      setup([makeNote()]);
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.sort-label')?.textContent).toContain('Recently updated');
    });

    it('should not show empty state when notes exist', () => {
      setup([makeNote()]);
      expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();
    });

    it('should display note title and body', () => {
      setup([makeNote({ title: 'My Title', body: 'My body text' })]);
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.note-title')?.textContent).toContain('My Title');
      expect(el.querySelector('.note-body')?.textContent).toContain('My body text');
    });

    it('should show footer with note count and storage size', () => {
      setup([makeNote()]);
      const footer = fixture.nativeElement.querySelector('.list-footer');
      expect(footer?.textContent).toContain('1 note');
      expect(footer?.textContent).toContain('1KB used');
    });

    it('should pluralize note count', () => {
      setup([makeNote(), makeNote({ id: 'note-2', updatedAt: '2024-01-03T00:00:00.000Z' })]);
      const footer = fixture.nativeElement.querySelector('.list-footer');
      expect(footer?.textContent).toContain('2 notes');
    });

    it('should have delete button with correct aria-label', () => {
      setup([makeNote({ title: 'My Note' })]);
      const btn = fixture.nativeElement.querySelector('.btn-delete');
      expect(btn?.getAttribute('aria-label')).toBe('Delete note: My Note');
    });

    it('should link note card to edit route', () => {
      setup([makeNote({ id: 'abc-123' })]);
      const link = fixture.nativeElement.querySelector('.note-link');
      expect(link?.getAttribute('href')).toBe('/notes/abc-123/edit');
    });
  });

  describe('Delete Flow', () => {
    it('should open dialog on delete click and set noteToDelete', () => {
      setup([makeNote({ title: 'To Delete' })]);
      const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
      dialog.showModal = vi.fn();
      dialog.close = vi.fn();

      const deleteBtn = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      expect(dialog.showModal).toHaveBeenCalled();
      expect(component.noteToDelete()?.title).toBe('To Delete');
    });

    it('should display note title in delete dialog', () => {
      setup([makeNote({ title: 'Important Note' })]);
      const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
      dialog.showModal = vi.fn();
      dialog.close = vi.fn();

      const deleteBtn = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.dialog-note-title')?.textContent).toContain('Important Note');
    });

    it('should call service.delete on executeDelete', () => {
      setup([makeNote({ id: 'del-1' })]);
      const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
      dialog.showModal = vi.fn();
      dialog.close = vi.fn();

      const deleteBtn = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      component.executeDelete();
      expect(mockService.delete).toHaveBeenCalledWith('del-1');
    });

    it('should close dialog and clear noteToDelete on cancelDelete', () => {
      setup([makeNote()]);
      const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
      dialog.showModal = vi.fn();
      dialog.close = vi.fn();

      const deleteBtn = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      component.cancelDelete();
      expect(dialog.close).toHaveBeenCalled();
      expect(component.noteToDelete()).toBeNull();
    });

    it('should show empty state after deleting last note', () => {
      setup([makeNote({ id: 'only-one' })]);
      const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
      dialog.showModal = vi.fn();
      dialog.close = vi.fn();

      const deleteBtn = fixture.nativeElement.querySelector('.btn-delete');
      deleteBtn.click();
      fixture.detectChanges();

      component.executeDelete();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.empty-state')).toBeTruthy();
    });
  });

  describe('Banners', () => {
    it('should show storage unavailable banner', () => {
      setup([]);
      (mockService.storageAvailable as any).set(false);
      fixture.detectChanges();
      const banner = fixture.nativeElement.querySelector('.banner-warning');
      expect(banner?.textContent).toContain("Your browser doesn't support local storage");
    });

    it('should show storage full banner', () => {
      setup([makeNote()]);
      (mockService.storageFull as any).set(true);
      fixture.detectChanges();
      const banner = fixture.nativeElement.querySelector('.banner-error');
      expect(banner?.textContent).toContain('Storage is full');
    });

    it('should not show banners in normal state', () => {
      setup([makeNote()]);
      expect(fixture.nativeElement.querySelector('.banner-warning')).toBeNull();
      expect(fixture.nativeElement.querySelector('.banner-error')).toBeNull();
    });
  });

  describe('Toast', () => {
    it('should show toast when saved query param is true', () => {
      vi.useFakeTimers();
      setup([], { saved: 'true' });
      expect(component.showToast()).toBe(true);
      expect(fixture.nativeElement.querySelector('.toast')?.textContent).toContain('Note saved');
      vi.advanceTimersByTime(2500);
      expect(component.showToast()).toBe(false);
      vi.useRealTimers();
    });

    it('should not show toast without saved query param', () => {
      setup([]);
      expect(component.showToast()).toBe(false);
      expect(fixture.nativeElement.querySelector('.toast')).toBeNull();
    });
  });

  describe('Dialog Accessibility', () => {
    it('should have role="dialog" and aria-modal on delete dialog', () => {
      setup([makeNote()]);
      const dialog = fixture.nativeElement.querySelector('dialog');
      expect(dialog?.getAttribute('role')).toBe('dialog');
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      expect(dialog?.getAttribute('aria-labelledby')).toBe('delete-dialog-title');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes under 1024 as B', () => {
      setup([]);
      expect(component.formatBytes(500)).toBe('500B');
    });

    it('should format bytes over 1024 as KB', () => {
      setup([]);
      expect(component.formatBytes(2048)).toBe('2KB');
    });
  });

  describe('Tracking', () => {
    it('should log notes_list_viewed on init', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      setup([makeNote()]);
      expect(spy).toHaveBeenCalledWith('[track] notes_list_viewed', { noteCount: 1 });
      spy.mockRestore();
    });
  });
});
