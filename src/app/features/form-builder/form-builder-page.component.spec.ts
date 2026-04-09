import { FormBuilderPageComponent } from './form-builder-page.component';
import { FormSchemaService } from '../../services/form-schema.service';
import { BehaviorSubject } from 'rxjs';
import { FormSchema } from '../../models/form-schema.model';

describe('FormBuilderPageComponent', () => {
  let component: FormBuilderPageComponent;
  let schema$: BehaviorSubject<FormSchema>;
  let mockService: {
    schema$: BehaviorSubject<FormSchema>;
    exportSchemaAsJson: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    schema$ = new BehaviorSubject<FormSchema>({ fields: [], version: 0 });
    mockService = {
      schema$,
      exportSchemaAsJson: vi.fn().mockReturnValue(true),
    };
    component = new FormBuilderPageComponent(mockService as unknown as FormSchemaService);
  });

  it('should initialize with default values', () => {
    expect(component.mode).toBe('build');
    expect(component.mobileTab).toBe('build');
    expect(component.showJson).toBe(false);
    expect(component.copied).toBe(false);
    expect(component.toastMessage).toBe('');
  });

  it('should subscribe to schema$ and update schema', () => {
    const newSchema: FormSchema = { fields: [{ id: '1', type: 'text', label: 'Test', validation: {} }], version: 1 };
    schema$.next(newSchema);
    expect(component.schema).toEqual(newSchema);
  });

  // --- jsonPreview ---
  it('should return JSON string with schemaVersion', () => {
    const parsed = JSON.parse(component.jsonPreview);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.fields).toEqual([]);
    expect(parsed.version).toBe(0);
  });

  it('should include fields in jsonPreview', () => {
    schema$.next({ fields: [{ id: 'x', type: 'text', label: 'X', validation: {} }], version: 1 });
    const parsed = JSON.parse(component.jsonPreview);
    expect(parsed.fields.length).toBe(1);
    expect(parsed.fields[0].id).toBe('x');
  });

  // --- toggleViewJson ---
  it('should toggle showJson', () => {
    expect(component.showJson).toBe(false);
    component.toggleViewJson();
    expect(component.showJson).toBe(true);
    component.toggleViewJson();
    expect(component.showJson).toBe(false);
  });

  it('should hide fallback json when toggling view json', () => {
    component.showFallbackJson = true;
    component.toggleViewJson();
    expect(component.showFallbackJson).toBe(false);
  });

  // --- exportJson ---
  it('should show toast on successful export', () => {
    schema$.next({ fields: [{ id: '1', type: 'text', label: 'T', validation: {} }], version: 1 });
    component.exportJson();
    expect(mockService.exportSchemaAsJson).toHaveBeenCalled();
    expect(component.toastMessage).toContain('1 field(s)');
    expect(component.showFallbackJson).toBe(false);
  });

  it('should show fallback json on failed export', () => {
    mockService.exportSchemaAsJson.mockReturnValue(false);
    component.exportJson();
    expect(component.showFallbackJson).toBe(true);
  });

  it('should clear toast after timeout', () => {
    vi.useFakeTimers();
    schema$.next({ fields: [{ id: '1', type: 'text', label: 'T', validation: {} }], version: 1 });
    component.exportJson();
    expect(component.toastMessage).toBeTruthy();
    vi.advanceTimersByTime(3000);
    expect(component.toastMessage).toBe('');
    vi.useRealTimers();
  });

  // --- copyJson ---
  it('should set copied to true and reset after timeout', async () => {
    vi.useFakeTimers();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    const originalClipboard = navigator.clipboard;
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } });

    try {
      component.copyJson();
      await vi.advanceTimersByTimeAsync(0); // flush microtask
      expect(component.copied).toBe(true);
      vi.advanceTimersByTime(2000);
      expect(component.copied).toBe(false);
    } finally {
      Object.assign(navigator, { clipboard: originalClipboard });
      vi.useRealTimers();
    }
  });

  // --- mode switching ---
  it('should allow switching between build and fill mode', () => {
    component.mode = 'fill';
    expect(component.mode).toBe('fill');
    component.mode = 'build';
    expect(component.mode).toBe('build');
  });

  // --- mobileTab ---
  it('should allow switching mobile tabs', () => {
    component.mobileTab = 'preview';
    expect(component.mobileTab).toBe('preview');
  });
});
