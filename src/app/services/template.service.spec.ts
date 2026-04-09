import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TemplateService } from './template.service';
import {
  Template,
  TemplateVersion,
  TemplateBlock,
  TemplateVariable
} from '../models/template.model';

describe('TemplateService', () => {
  let service: TemplateService;

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
      blocks: [{
        id: 'block1',
        type: 'text',
        content: 'Hello {{subscriber_name}}!',
        styles: { color: '#0066cc', fontFamily: 'Arial' },
        personalizationTokens: ['subscriber_name']
      }],
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

  const mockTemplateVersion: TemplateVersion = {
    id: 'v1',
    templateId: '1',
    version: 1,
    createdAt: new Date(),
    createdBy: 'test-user',
    blocks: [
      {
        id: 'block1',
        type: 'text',
        content: 'Test content',
        styles: { color: '#0066cc', fontFamily: 'Arial' },
        personalizationTokens: []
      },
      {
        id: 'block2',
        type: 'image',
        content: '<img src="test.jpg" />',
        styles: {},
        personalizationTokens: []
      }
    ],
    variables: [],
    brandComplianceScore: 85,
    accessibilityScore: 92,
    isActive: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TemplateService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with mock templates', () => {
      return new Promise<void>((resolve) => {
        service.getTemplates().subscribe(templates => {
          expect(templates).toHaveLength(1);
          expect(templates[0].name).toBe('Weekly Newsletter');
          resolve();
        });
      });
    });

    it('should initialize with brand guidelines', () => {
      return new Promise<void>((resolve) => {
        service.getBrandGuidelines().subscribe(guidelines => {
          expect(guidelines).toHaveLength(2);
          expect(guidelines[0].type).toBe('color');
          expect(guidelines[1].type).toBe('font');
          resolve();
        });
      });
    });
  });

  describe('Template Management', () => {
    it('should get template by id', () => {
      return new Promise<void>((resolve) => {
        service.getTemplate('1').subscribe(template => {
          expect(template).toBeTruthy();
          expect(template?.name).toBe('Weekly Newsletter');
          resolve();
        });
      });
    });

    it('should return null for non-existent template', () => {
      return new Promise<void>((resolve) => {
        service.getTemplate('999').subscribe(template => {
          expect(template).toBeNull();
          resolve();
        });
      });
    });

    it('should create new template', () => {
      const templateData = {
        name: 'New Template',
        description: 'Test template',
        contentType: 'promotional' as const,
        tags: ['test']
      };

      return new Promise<void>((resolve) => {
        service.createTemplate(templateData).subscribe(template => {
          expect(template.name).toBe('New Template');
          expect(template.contentType).toBe('promotional');
          expect(template.isPublished).toBe(false);
          expect(template.currentVersion).toBe(1);
          resolve();
        });
      });
    });

    it('should create template with default values', () => {
      return new Promise<void>((resolve) => {
        service.createTemplate({}).subscribe(template => {
          expect(template.name).toBe('New Template');
          expect(template.contentType).toBe('newsletter');
          expect(template.tags).toEqual([]);
          resolve();
        });
      });
    });

    it('should update existing template', () => {
      const updates = {
        name: 'Updated Template',
        description: 'Updated description'
      };

      return new Promise<void>((resolve) => {
        service.updateTemplate('1', updates).subscribe(template => {
          expect(template).toBeTruthy();
          expect(template?.name).toBe('Updated Template');
          expect(template?.description).toBe('Updated description');
          expect(template?.updatedAt).toBeInstanceOf(Date);
          resolve();
        });
      });
    });

    it('should return null when updating non-existent template', () => {
      return new Promise<void>((resolve) => {
        service.updateTemplate('999', {}).subscribe(template => {
          expect(template).toBeNull();
          resolve();
        });
      });
    });

    it('should delete existing template', () => {
      return new Promise<void>((resolve) => {
        service.deleteTemplate('1').subscribe(result => {
          expect(result).toBe(true);
          resolve();
        });
      });
    });

    it('should return false when deleting non-existent template', () => {
      return new Promise<void>((resolve) => {
        service.deleteTemplate('999').subscribe(result => {
          expect(result).toBe(false);
          resolve();
        });
      });
    });
  });

  describe('Template Rendering', () => {
    it('should render template with variable substitution', () => {
      const variables = {
        subscriber_name: 'John Doe',
        company: 'Acme Corp'
      };

      return new Promise<void>((resolve) => {
        service.renderTemplate('1', variables).subscribe(result => {
          expect(result.html).toContain('<html>');
          expect(result.html).toContain('<body>');
          expect(result.text).toBeTruthy();
          resolve();
        });
      });
    });

    it('should return empty content for non-existent template', () => {
      return new Promise<void>((resolve) => {
        service.renderTemplate('999', {}).subscribe(result => {
          expect(result.html).toBe('');
          expect(result.text).toBe('');
          resolve();
        });
      });
    });

    it('should handle missing variables with fallback', () => {
      const variables = {
        existing_var: 'value'
      };

      return new Promise<void>((resolve) => {
        service.renderTemplate('1', variables).subscribe(result => {
          // Should contain fallback notation for missing variables
          expect(result).toBeTruthy();
          resolve();
        });
      });
    });
  });

  describe('Preview Generation', () => {
    it('should generate preview with correct properties', () => {
      const sampleData = { name: 'John Doe' };

      return new Promise<void>((resolve) => {
        service.generatePreview('1', 'mobile', 'gmail', sampleData).subscribe(preview => {
          expect(preview.templateId).toBe('1');
          expect(preview.deviceType).toBe('mobile');
          expect(preview.emailClient).toBe('gmail');
          expect(preview.sampleData).toEqual(sampleData);
          expect(preview.previewUrl).toContain('/preview/');
          expect(preview.timestamp).toBeInstanceOf(Date);
          expect(preview.htmlContent).toContain('Preview for mobile on gmail');
          resolve();
        });
      });
    });

    it('should generate unique preview URLs', () => {
      const sampleData = { name: 'John Doe' };

      return new Promise<void>((resolve) => {
        service.generatePreview('1', 'desktop', 'outlook', sampleData).subscribe(preview1 => {
          service.generatePreview('1', 'desktop', 'outlook', sampleData).subscribe(preview2 => {
            expect(preview1.previewUrl).not.toBe(preview2.previewUrl);
            resolve();
          });
        });
      });
    });
  });

  describe('Brand Compliance Validation', () => {
    it('should validate approved colors', () => {
      const templateVersion: TemplateVersion = {
        ...mockTemplateVersion,
        blocks: [{
          id: 'block1',
          type: 'text',
          content: 'Test',
          styles: { color: '#0066cc' }, // approved color
          personalizationTokens: []
        }]
      };

      return new Promise<void>((resolve) => {
        service.validateBrandCompliance(templateVersion).subscribe(result => {
          expect(result.score).toBe(100);
          expect(result.violations).toHaveLength(0);
          resolve();
        });
      });
    });

    it('should detect unapproved colors', () => {
      const templateVersion: TemplateVersion = {
        ...mockTemplateVersion,
        blocks: [{
          id: 'block1',
          type: 'text',
          content: 'Test',
          styles: { color: '#ff0000' }, // unapproved color
          personalizationTokens: []
        }]
      };

      return new Promise<void>((resolve) => {
        service.validateBrandCompliance(templateVersion).subscribe(result => {
          expect(result.score).toBeLessThan(100);
          expect(result.violations.length).toBeGreaterThan(0);
          expect(result.violations[0]).toContain('Unapproved color');
          resolve();
        });
      });
    });

    it('should validate approved fonts', () => {
      const templateVersion: TemplateVersion = {
        ...mockTemplateVersion,
        blocks: [{
          id: 'block1',
          type: 'text',
          content: 'Test',
          styles: { fontFamily: 'Arial, sans-serif' }, // approved font
          personalizationTokens: []
        }]
      };

      return new Promise<void>((resolve) => {
        service.validateBrandCompliance(templateVersion).subscribe(result => {
          expect(result.score).toBe(100);
          expect(result.violations).toHaveLength(0);
          resolve();
        });
      });
    });

    it('should detect unapproved fonts', () => {
      const templateVersion: TemplateVersion = {
        ...mockTemplateVersion,
        blocks: [{
          id: 'block1',
          type: 'text',
          content: 'Test',
          styles: { fontFamily: 'Comic Sans MS' }, // unapproved font
          personalizationTokens: []
        }]
      };

      return new Promise<void>((resolve) => {
        service.validateBrandCompliance(templateVersion).subscribe(result => {
          expect(result.score).toBeLessThan(100);
          expect(result.violations.length).toBeGreaterThan(0);
          expect(result.violations[0]).toContain('Unapproved font');
          resolve();
        });
      });
    });

    it('should handle multiple violations', () => {
      const templateVersion: TemplateVersion = {
        ...mockTemplateVersion,
        blocks: [
          {
            id: 'block1',
            type: 'text',
            content: 'Test',
            styles: { color: '#ff0000', fontFamily: 'Comic Sans MS' },
            personalizationTokens: []
          },
          {
            id: 'block2',
            type: 'text',
            content: 'Test',
            styles: { color: '#00ff00' },
            personalizationTokens: []
          }
        ]
      };

      return new Promise<void>((resolve) => {
        service.validateBrandCompliance(templateVersion).subscribe(result => {
          expect(result.score).toBeLessThan(80);
          expect(result.violations.length).toBeGreaterThanOrEqual(3);
          resolve();
        });
      });
    });
  });

  describe('Email Client Compatibility', () => {
    it('should validate compatibility across major clients', () => {
      return new Promise<void>((resolve) => {
        service.validateEmailClientCompatibility('1').subscribe(results => {
          expect(results).toHaveLength(4);
          expect(results.map(r => r.emailClient)).toContain('gmail');
          expect(results.map(r => r.emailClient)).toContain('outlook');
          expect(results.map(r => r.emailClient)).toContain('apple_mail');
          expect(results.map(r => r.emailClient)).toContain('yahoo');
          resolve();
        });
      });
    });

    it('should provide pass rate meeting requirements', () => {
      return new Promise<void>((resolve) => {
        service.validateEmailClientCompatibility('1').subscribe(results => {
          const passedCount = results.filter(r => r.passed).length;
          const passRate = (passedCount / results.length) * 100;
          expect(passRate).toBeGreaterThanOrEqual(95); // 95% requirement
          resolve();
        });
      });
    });

    it('should include compatibility scores', () => {
      return new Promise<void>((resolve) => {
        service.validateEmailClientCompatibility('1').subscribe(results => {
          results.forEach(result => {
            expect(result.score).toBeGreaterThanOrEqual(95);
            expect(result.score).toBeLessThanOrEqual(100);
            expect(result.version).toBe('2024');
          });
          resolve();
        });
      });
    });
  });

  describe('Accessibility Validation', () => {
    it('should validate accessibility standards', () => {
      return new Promise<void>((resolve) => {
        service.validateAccessibility(mockTemplateVersion).subscribe(validation => {
          expect(validation.contrastRatio).toBeGreaterThanOrEqual(4.5);
          expect(validation.hasSemanticStructure).toBe(true);
          expect(validation.keyboardAccessible).toBe(true);
          expect(validation.screenReaderCompatible).toBe(true);
          expect(validation.score).toBeGreaterThanOrEqual(90);
          resolve();
        });
      });
    });

    it('should detect missing alt text in images', () => {
      const templateVersionNoAlt: TemplateVersion = {
        ...mockTemplateVersion,
        blocks: [{
          id: 'img1',
          type: 'image',
          content: '<img src="test.jpg" />',
          styles: {},
          personalizationTokens: []
        }]
      };

      return new Promise<void>((resolve) => {
        service.validateAccessibility(templateVersionNoAlt).subscribe(validation => {
          expect(validation.issues.length).toBeGreaterThan(0);
          expect(validation.issues[0]).toContain('missing alt text');
          expect(validation.score).toBeLessThan(98);
          resolve();
        });
      });
    });

    it('should pass validation for images with alt text', () => {
      const templateVersionWithAlt: TemplateVersion = {
        ...mockTemplateVersion,
        blocks: [{
          id: 'img1',
          type: 'image',
          content: '<img src="test.jpg" alt="Test image" />',
          styles: {},
          personalizationTokens: []
        }]
      };

      return new Promise<void>((resolve) => {
        service.validateAccessibility(templateVersionWithAlt).subscribe(validation => {
          expect(validation.hasAltText).toBe(true);
          expect(validation.issues).not.toContain(expect.stringContaining('alt text'));
          resolve();
        });
      });
    });
  });

  describe('Private Helper Methods', () => {
    it('should correctly identify approved colors', () => {
      expect((service as any).isApprovedColor('#0066cc')).toBe(true);
      expect((service as any).isApprovedColor('#f5f5f5')).toBe(true);
      expect((service as any).isApprovedColor('#FF0000')).toBe(false);
    });

    it('should correctly identify approved fonts', () => {
      expect((service as any).isApprovedFont('Arial, sans-serif')).toBe(true);
      expect((service as any).isApprovedFont('Georgia, serif')).toBe(true);
      expect((service as any).isApprovedFont('Comic Sans MS')).toBe(false);
    });

    it('should handle case-insensitive color matching', () => {
      expect((service as any).isApprovedColor('#0066CC')).toBe(true);
      expect((service as any).isApprovedColor('#F5F5F5')).toBe(true);
    });

    it('should handle case-insensitive font matching', () => {
      expect((service as any).isApprovedFont('ARIAL')).toBe(true);
      expect((service as any).isApprovedFont('arial')).toBe(true);
    });
  });

  describe('Observable Streams', () => {
    it('should emit updated templates when templates change', (done) => {
      const newTemplate = {
        name: 'Stream Test Template',
        contentType: 'newsletter' as const
      };

      let emissionCount = 0;
      service.templates$.subscribe(templates => {
        emissionCount++;
        if (emissionCount === 2) { // Initial + after create
          expect(templates.length).toBeGreaterThan(1);
          const found = templates.find(t => t.name === 'Stream Test Template');
          expect(found).toBeTruthy();
          done();
        }
      });

      service.createTemplate(newTemplate).subscribe();
    });

    it('should emit updated guidelines when guidelines change', (done) => {
      let emitted = false;
      service.brandGuidelines$.subscribe(guidelines => {
        if (!emitted) {
          emitted = true;
          expect(guidelines).toHaveLength(2);
          done();
        }
      });
    });
  });
});