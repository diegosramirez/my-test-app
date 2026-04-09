import { TestBed } from '@angular/core/testing';
import { FormSchemaService } from './form-schema.service';
import { AnalyticsService } from './analytics.service';
import { FormSchema } from '../models/form-schema.model';

describe('FormSchemaService', () => {
  let service: FormSchemaService;
  let analyticsSpy: { track: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    analyticsSpy = { track: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        FormSchemaService,
        { provide: AnalyticsService, useValue: analyticsSpy },
      ],
    });
    service = TestBed.inject(FormSchemaService);
  });

  it('should initialize with empty schema version 0', () => {
    const snap = service.currentSnapshot();
    expect(snap.fields).toEqual([]);
    expect(snap.version).toBe(0);
  });

  // --- addField ---
  it('should add a text field with default label', () => {
    service.addField('text');
    const snap = service.currentSnapshot();
    expect(snap.fields.length).toBe(1);
    expect(snap.fields[0].type).toBe('text');
    expect(snap.fields[0].label).toBe('Untitled Text Field');
    expect(snap.fields[0].id).toBeTruthy();
    expect(snap.version).toBe(1);
  });

  it('should add a select field with empty options array', () => {
    service.addField('select');
    expect(service.currentSnapshot().fields[0].options).toEqual([]);
  });

  it('should add checkbox field', () => {
    service.addField('checkbox');
    expect(service.currentSnapshot().fields[0].label).toBe('Untitled Checkbox');
  });

  it('should add number field', () => {
    service.addField('number');
    expect(service.currentSnapshot().fields[0].label).toBe('Untitled Number Field');
  });

  it('should track field_added event', () => {
    service.addField('text');
    expect(analyticsSpy.track).toHaveBeenCalledWith('field_added', { fieldType: 'text', fieldIndex: 0 });
  });

  it('should generate unique IDs for rapid sequential adds', () => {
    service.addField('text');
    service.addField('text');
    service.addField('text');
    const ids = service.currentSnapshot().fields.map(f => f.id);
    expect(new Set(ids).size).toBe(3);
    expect(service.currentSnapshot().version).toBe(3);
  });

  // --- removeField ---
  it('should remove a field by id', () => {
    service.addField('text');
    const id = service.currentSnapshot().fields[0].id;
    service.removeField(id);
    expect(service.currentSnapshot().fields.length).toBe(0);
    expect(service.currentSnapshot().version).toBe(2);
  });

  it('should track field_removed event', () => {
    service.addField('text');
    const field = service.currentSnapshot().fields[0];
    service.removeField(field.id);
    expect(analyticsSpy.track).toHaveBeenCalledWith('field_removed', { fieldType: 'text', fieldId: field.id });
  });

  it('should not track when removing non-existent field', () => {
    analyticsSpy.track.mockClear();
    service.removeField('non-existent');
    expect(analyticsSpy.track).not.toHaveBeenCalledWith('field_removed', expect.anything());
  });

  // --- updateField ---
  it('should update field label', () => {
    service.addField('text');
    const id = service.currentSnapshot().fields[0].id;
    service.updateField(id, { label: 'My Field' });
    expect(service.currentSnapshot().fields[0].label).toBe('My Field');
  });

  it('should update validation rules', () => {
    service.addField('text');
    const id = service.currentSnapshot().fields[0].id;
    service.updateField(id, { validation: { required: true, minLength: 3 } });
    expect(service.currentSnapshot().fields[0].validation).toEqual({ required: true, minLength: 3 });
  });

  it('should increment version on update', () => {
    service.addField('text');
    const id = service.currentSnapshot().fields[0].id;
    service.updateField(id, { label: 'New' });
    expect(service.currentSnapshot().version).toBe(2);
  });

  // --- reorderFields ---
  it('should reorder fields', () => {
    service.addField('text');
    service.addField('number');
    service.addField('checkbox');
    const before = service.currentSnapshot().fields.map(f => f.type);
    expect(before).toEqual(['text', 'number', 'checkbox']);
    service.reorderFields(0, 2);
    const after = service.currentSnapshot().fields.map(f => f.type);
    expect(after).toEqual(['number', 'checkbox', 'text']);
  });

  it('should be a no-op when previousIndex === currentIndex', () => {
    service.addField('text');
    const versionBefore = service.currentSnapshot().version;
    analyticsSpy.track.mockClear();
    service.reorderFields(0, 0);
    expect(service.currentSnapshot().version).toBe(versionBefore);
    expect(analyticsSpy.track).not.toHaveBeenCalled();
  });

  it('should track field_reordered event', () => {
    service.addField('text');
    service.addField('number');
    analyticsSpy.track.mockClear();
    service.reorderFields(0, 1);
    expect(analyticsSpy.track).toHaveBeenCalledWith('field_reordered', { fromIndex: 0, toIndex: 1 });
  });

  // --- schema$ observable ---
  it('should emit schema changes via observable', () => {
    const emissions: FormSchema[] = [];
    service.schema$.subscribe(s => emissions.push(s));
    service.addField('text');
    service.addField('number');
    // initial + 2 adds
    expect(emissions.length).toBe(3);
  });

  // --- exportSchemaAsJson ---
  it('should return true on successful export', () => {
    service.addField('text');
    // Mock document.createElement and URL methods
    const mockAnchor = { href: '', download: '', click: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const result = service.exportSchemaAsJson();
    expect(result).toBe(true);
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockAnchor.download).toMatch(/^form-schema-\d+\.json$/);
    expect(analyticsSpy.track).toHaveBeenCalledWith('schema_exported', expect.objectContaining({ fieldCount: 1 }));
  });

  it('should return false when export throws', () => {
    vi.spyOn(document, 'createElement').mockImplementation(() => { throw new Error('blocked'); });
    const result = service.exportSchemaAsJson();
    expect(result).toBe(false);
  });

  // --- immutability ---
  it('should not mutate existing fields array on add', () => {
    service.addField('text');
    const firstSnap = service.currentSnapshot();
    const firstFields = firstSnap.fields;
    service.addField('number');
    expect(firstFields.length).toBe(1); // original not mutated
  });
});
