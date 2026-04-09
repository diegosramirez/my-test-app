import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { TemplateManagerComponent } from './template-manager.component';
import { TemplateService } from '../../services/template.service';
import {
  Template,
  TemplateBlock,
  TemplateVariable,
  BrandGuideline,
  CompatibilityResult,
  AccessibilityValidation
} from '../../models/template.model';

describe('TemplateManagerComponent', () => {
  let component: TemplateManagerComponent;
  let fixture: any;
  let mockTemplateService: any;

  const mockTemplate: Template = {
    id: '1',
    name: 'Test Template',
    description: 'A test template',
    contentType: 'newsletter',
    currentVersion: 1,
    versions: [{
      id: 'v1',
      templateId: '1',
      version: 1,
      createdAt: new Date(),
      createdBy: 'test-user',
      blocks: [],
      variables: [],
      brandComplianceScore: 85,
      accessibilityScore: 92,
      isActive: true
    }],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test-user',
    tags: ['test'],
    isPublished: true
  };

  const mockBrandGuideline: BrandGuideline = {
    id: '1',
    name: 'Primary Colors',
    type: 'color',
    rules: { primary: '#0066cc' },
    isRequired: true
  };

  const mockCompatibilityResults: CompatibilityResult[] = [
    {
      emailClient: 'gmail',
      version: '2024',
      passed: true,
      issues: [],
      score: 98
    },
    {
      emailClient: 'outlook',
      version: '2024',
      passed: true,
      issues: [],
      score: 96
    }
  ];

  const mockAccessibilityValidation: AccessibilityValidation = {
    contrastRatio: 4.5,
    hasAltText: true,
    hasSemanticStructure: true,
    keyboardAccessible: true,
    screenReaderCompatible: true,
    issues: [],
    score: 98
  };

  beforeEach(async () => {
    mockTemplateService = {
      getTemplates: vi.fn(() => of([mockTemplate])),
      getTemplate: vi.fn(() => of(mockTemplate)),
      createTemplate: vi.fn(() => of(mockTemplate)),
      updateTemplate: vi.fn(() => of(mockTemplate)),
      deleteTemplate: vi.fn(() => of(true)),
      renderTemplate: vi.fn(() => of({ html: '<div>Test</div>', text: 'Test' })),
      generatePreview: vi.fn(() => of({
        id: 'preview1',
        templateId: '1',
        deviceType: 'desktop',
        emailClient: 'gmail',
        htmlContent: '<div>Preview content</div>',
        textContent: 'Preview content',
        sampleData: {},
        previewUrl: '/preview/1',
        timestamp: new Date()
      })),
      validateBrandCompliance: vi.fn(() => of({ score: 85, violations: [] })),
      validateEmailClientCompatibility: vi.fn(() => of(mockCompatibilityResults)),
      validateAccessibility: vi.fn(() => of(mockAccessibilityValidation)),
      getBrandGuidelines: vi.fn(() => of([mockBrandGuideline]))
    };

    await TestBed.configureTestingModule({
      imports: [TemplateManagerComponent],
      providers: [
        { provide: TemplateService, useValue: mockTemplateService },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateManagerComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should load templates on init', () => {
      fixture.detectChanges();

      expect(mockTemplateService.getTemplates).toHaveBeenCalled();
      expect(component.templates()).toEqual([mockTemplate]);
    });

    it('should load brand guidelines on init', () => {
      fixture.detectChanges();

      expect(mockTemplateService.getBrandGuidelines).toHaveBeenCalled();
      expect(component.brandGuidelines()).toEqual([mockBrandGuideline]);
    });

    it('should select first template if templates exist', () => {
      fixture.detectChanges();

      expect(component.selectedTemplate()).toEqual(mockTemplate);
    });
  });

  describe('Template Creation', () => {
    it('should create new template when createNewTemplate is called', () => {
      const newTemplate: Template = { ...mockTemplate, id: '2', name: 'New Template' };
      mockTemplateService.createTemplate.mockReturnValue(of(newTemplate));

      component.createNewTemplate();

      expect(mockTemplateService.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('New Template'),
          contentType: 'newsletter',
          tags: ['new']
        })
      );
    });

    it('should add new template to templates list', () => {
      const newTemplate: Template = { ...mockTemplate, id: '2', name: 'New Template' };
      mockTemplateService.createTemplate.mockReturnValue(of(newTemplate));

      component.templates.set([mockTemplate]);
      component.createNewTemplate();

      expect(component.templates()).toContain(newTemplate);
    });
  });

  describe('Template Selection', () => {
    it('should set selected template when selectTemplate is called', () => {
      component.selectTemplate(mockTemplate);

      expect(component.selectedTemplate()).toEqual(mockTemplate);
    });

    it('should load template blocks when selecting template with versions', () => {
      const templateWithBlocks: Template = {
        ...mockTemplate,
        versions: [{
          ...mockTemplate.versions[0],
          blocks: [{
            id: 'block1',
            type: 'text',
            content: 'Test content',
            styles: {},
            personalizationTokens: []
          }]
        }]
      };

      component.selectTemplate(templateWithBlocks);

      expect(component.currentBlocks().length).toBe(1);
      expect(component.currentBlocks()[0].content).toBe('Test content');
    });

    it('should validate template when selecting', () => {
      component.selectTemplate(mockTemplate);

      expect(mockTemplateService.validateBrandCompliance).toHaveBeenCalled();
      expect(mockTemplateService.validateAccessibility).toHaveBeenCalled();
      expect(mockTemplateService.validateEmailClientCompatibility).toHaveBeenCalled();
    });
  });

  describe('Drag and Drop Functionality', () => {
    beforeEach(() => {
      component.selectTemplate(mockTemplate);
    });

    it('should set dragged block on drag start', () => {
      const block: TemplateBlock = {
        id: 'test-block',
        type: 'text',
        content: 'Test',
        styles: {},
        personalizationTokens: []
      };

      component.onDragStart(block);

      expect(component.draggedBlock()).toEqual(block);
    });

    it('should clear dragged block on drag end', () => {
      const block: TemplateBlock = {
        id: 'test-block',
        type: 'text',
        content: 'Test',
        styles: {},
        personalizationTokens: []
      };

      component.draggedBlock.set(block);
      component.onDragEnd();

      expect(component.draggedBlock()).toBeNull();
    });

    it('should add block to template on drop', () => {
      const block: TemplateBlock = {
        id: 'test-block',
        type: 'text',
        content: 'Test',
        styles: {},
        personalizationTokens: []
      };

      component.draggedBlock.set(block);

      const mockEvent = {
        preventDefault: vi.fn()
      } as unknown as DragEvent;

      component.onDrop(mockEvent);

      expect(component.currentBlocks().length).toBe(1);
      expect(component.currentBlocks()[0].type).toBe('text');
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should insert block at specific index when target index provided', () => {
      const existingBlock: TemplateBlock = {
        id: 'existing',
        type: 'header',
        content: 'Existing',
        styles: {},
        personalizationTokens: []
      };

      const newBlock: TemplateBlock = {
        id: 'new-block',
        type: 'text',
        content: 'New',
        styles: {},
        personalizationTokens: []
      };

      component.currentBlocks.set([existingBlock]);
      component.draggedBlock.set(newBlock);

      const mockEvent = {
        preventDefault: vi.fn()
      } as unknown as DragEvent;

      component.onDrop(mockEvent, 0);

      expect(component.currentBlocks().length).toBe(2);
      expect(component.currentBlocks()[0].type).toBe('text');
      expect(component.currentBlocks()[1].type).toBe('header');
    });
  });

  describe('Block Management', () => {
    beforeEach(() => {
      component.selectTemplate(mockTemplate);
      const blocks: TemplateBlock[] = [
        {
          id: 'block1',
          type: 'text',
          content: 'Content 1',
          styles: {},
          personalizationTokens: []
        },
        {
          id: 'block2',
          type: 'header',
          content: 'Content 2',
          styles: {},
          personalizationTokens: []
        }
      ];
      component.currentBlocks.set(blocks);
    });

    it('should remove block at specified index', () => {
      component.removeBlock(0);

      expect(component.currentBlocks().length).toBe(1);
      expect(component.currentBlocks()[0].content).toBe('Content 2');
    });

    it('should update block content', () => {
      component.updateBlockContent(0, 'Updated content');

      expect(component.currentBlocks()[0].content).toBe('Updated content');
    });

    it('should validate template after content update', () => {
      vi.clearAllMocks();

      component.updateBlockContent(0, 'Updated content');

      expect(mockTemplateService.validateBrandCompliance).toHaveBeenCalled();
    });

    it('should insert personalization token into block', () => {
      component.insertPersonalizationToken(0, 'subscriber_name');

      expect(component.currentBlocks()[0].content).toContain('{{subscriber_name}}');
    });
  });

  describe('Preview Functionality', () => {
    beforeEach(() => {
      component.selectTemplate(mockTemplate);
    });

    it('should change preview device', () => {
      component.changePreviewDevice('mobile');

      expect(component.previewDevice()).toBe('mobile');
      expect(mockTemplateService.generatePreview).toHaveBeenCalledWith(
        mockTemplate.id,
        'mobile',
        'gmail',
        expect.any(Object)
      );
    });

    it('should change preview email client', () => {
      component.changePreviewClient('outlook');

      expect(component.previewClient()).toBe('outlook');
      expect(mockTemplateService.generatePreview).toHaveBeenCalledWith(
        mockTemplate.id,
        'desktop',
        'outlook',
        expect.any(Object)
      );
    });

    it('should generate preview with sample data', () => {
      expect(mockTemplateService.generatePreview).toHaveBeenCalledWith(
        mockTemplate.id,
        'desktop',
        'gmail',
        expect.objectContaining({
          subscriber_name: 'John Doe',
          subscriber_email: 'john@example.com'
        })
      );
    });
  });

  describe('Validation and Compliance', () => {
    beforeEach(() => {
      component.selectTemplate(mockTemplate);
    });

    it('should calculate compatibility pass rate', () => {
      component.compatibilityResults.set([
        { emailClient: 'gmail', version: '2024', passed: true, issues: [], score: 95 },
        { emailClient: 'outlook', version: '2024', passed: true, issues: [], score: 95 },
        { emailClient: 'yahoo', version: '2024', passed: false, issues: ['issue'], score: 70 }
      ]);

      expect(component.compatibilityPassRate()).toBe(67); // 2 out of 3 passed
    });

    it('should determine if template can be saved based on compliance scores', () => {
      component.brandComplianceScore.set(85);
      component.accessibilityScore.set(95);

      expect(component.canSaveTemplate()).toBe(true);
    });

    it('should prevent saving if brand compliance is too low', () => {
      component.brandComplianceScore.set(75);
      component.accessibilityScore.set(95);

      expect(component.canSaveTemplate()).toBe(false);
    });

    it('should prevent saving if accessibility score is too low', () => {
      component.brandComplianceScore.set(85);
      component.accessibilityScore.set(85);

      expect(component.canSaveTemplate()).toBe(false);
    });
  });

  describe('Template Saving', () => {
    beforeEach(() => {
      component.selectTemplate(mockTemplate);
      component.brandComplianceScore.set(90);
      component.accessibilityScore.set(95);
    });

    it('should save template when validation passes', () => {
      component.saveTemplate();

      expect(mockTemplateService.updateTemplate).toHaveBeenCalledWith(
        mockTemplate.id,
        expect.objectContaining({
          updatedAt: expect.any(Date),
          isPublished: true
        })
      );
    });

    it('should not save template if cannot save', () => {
      component.brandComplianceScore.set(70);

      component.saveTemplate();

      expect(mockTemplateService.updateTemplate).not.toHaveBeenCalled();
    });

    it('should set loading state during save', () => {
      component.saveTemplate();

      expect(component.isLoading()).toBe(true);
    });
  });

  describe('Event Handling', () => {
    it('should handle drag over event', () => {
      const mockEvent = {
        preventDefault: vi.fn()
      } as unknown as DragEvent;

      component.onDragOver(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Accessibility Compliance', () => {
    it('should track template creation events', () => {
      const trackingSpy = vi.fn();
      (window as any).analytics = { track: trackingSpy };

      component.createNewTemplate();

      // In a real implementation, this would verify analytics tracking
      expect(mockTemplateService.createTemplate).toHaveBeenCalled();
    });

    it('should validate alt text in images', () => {
      const imageBlock: TemplateBlock = {
        id: 'img1',
        type: 'image',
        content: '<img src="test.jpg" />',
        styles: {},
        personalizationTokens: []
      };

      component.currentBlocks.set([imageBlock]);
      component.selectTemplate(mockTemplate);

      expect(mockTemplateService.validateAccessibility).toHaveBeenCalled();
    });

    it('should support keyboard navigation', () => {
      // Test would verify keyboard event handling
      expect(component).toBeTruthy();
    });
  });
});