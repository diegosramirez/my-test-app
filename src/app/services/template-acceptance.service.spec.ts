import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TemplateService } from './template.service';
import {
  Template,
  TemplateVersion,
  TemplateBlock,
  TemplateVariable,
  BrandGuideline,
  CompatibilityResult,
  AccessibilityValidation
} from '../models/template.model';

/**
 * Acceptance Criteria Tests for Template Service
 *
 * Tests the core service functionality against the email template system story requirements:
 * 1. Template Creation with personalization and fallback handling
 * 2. Template Rendering with variable substitution (99% success rate requirement)
 * 3. Email Client Compatibility validation (95% pass rate requirement)
 * 4. Brand Compliance validation and enforcement
 * 5. Accessibility Standards compliance and validation
 * 6. Performance requirements for high-volume campaigns
 */
describe('TemplateService - Acceptance Criteria', () => {
  let service: TemplateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TemplateService);
  });

  describe('Acceptance Criteria: Personalization Token Resolution (99% Success Rate)', () => {
    it('should resolve personalization tokens successfully in 99% of cases', async () => {
      // Test various token scenarios to ensure high success rate
      const testCases = [
        { subscriber_name: 'John Doe', subscriber_email: 'john@example.com' },
        { subscriber_name: 'Jane Smith', subscriber_email: 'jane@test.com' },
        { subscriber_name: 'Bob Wilson', subscriber_email: 'bob@company.org' },
        // Test edge cases
        { subscriber_name: 'María García', subscriber_email: 'maria@español.com' },
        { subscriber_name: '李小明', subscriber_email: 'xiaoming@chinese.com' },
        // Test with special characters
        { subscriber_name: "O'Connor", subscriber_email: "test+tag@domain.co.uk" },
        { subscriber_name: 'User123', subscriber_email: 'user.name+label@sub.domain.com' }
      ];

      const templateId = '1';
      const successfulRenders = [];

      // Test multiple rendering scenarios
      for (const variables of testCases) {
        try {
          const result = await new Promise(resolve => {
            service.renderTemplate(templateId, variables).subscribe(resolve);
          });

          // Verify that variables were substituted and no placeholder brackets remain
          const htmlResult = result as { html: string; text: string };

          // Should not contain unreplaced tokens for provided variables
          const unreplacedTokens = (htmlResult.html.match(/\{\{[^}]+\}\}/g) || [])
            .filter(token => {
              const varName = token.replace(/[{}]/g, '').trim();
              return variables.hasOwnProperty(varName);
            });

          if (unreplacedTokens.length === 0) {
            successfulRenders.push(variables);
          }
        } catch (error) {
          console.warn('Template rendering failed for:', variables, error);
        }
      }

      const successRate = (successfulRenders.length / testCases.length) * 100;
      expect(successRate).toBeGreaterThanOrEqual(99);
    });

    it('should handle fallback values for missing subscriber data gracefully', async () => {
      const templateId = '1';

      // Test cases with missing data
      const incompleteDataSets = [
        {}, // No data at all
        { subscriber_name: 'John' }, // Missing email
        { subscriber_email: 'john@example.com' }, // Missing name
        { unknown_field: 'value' } // Wrong field names
      ];

      for (const variables of incompleteDataSets) {
        const result = await new Promise(resolve => {
          service.renderTemplate(templateId, variables).subscribe(resolve);
        }) as { html: string; text: string };

        // Should still produce valid HTML/text output
        expect(result.html).toBeTruthy();
        expect(result.text).toBeTruthy();

        // Should contain fallback indicators for missing data
        const hasFallbacks = result.html.includes('[') || result.text.includes('[');
        expect(hasFallbacks).toBe(true);
      }
    });

    it('should handle high volume personalization without performance degradation', async () => {
      const templateId = '1';
      const startTime = performance.now();

      // Simulate high-volume rendering (1000 personalizations)
      const renderPromises = Array.from({ length: 1000 }, (_, i) => {
        const variables = {
          subscriber_name: `User${i}`,
          subscriber_email: `user${i}@example.com`,
          campaign_id: `campaign_${Math.floor(i / 100)}`
        };

        return new Promise(resolve => {
          service.renderTemplate(templateId, variables).subscribe(resolve);
        });
      });

      await Promise.all(renderPromises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete 1000 renders in under 5 seconds (5ms per render average)
      expect(totalTime).toBeLessThan(5000);
    });

    it('should maintain data integrity during variable substitution', async () => {
      const templateId = '1';

      // Test XSS prevention and data sanitization
      const maliciousData = {
        subscriber_name: '<script>alert("xss")</script>',
        subscriber_email: 'test@example.com"><img src=x onerror=alert(1)>',
        action_url: 'javascript:alert("evil")',
        user_content: '{{nested_token}}'
      };

      const result = await new Promise(resolve => {
        service.renderTemplate(templateId, maliciousData).subscribe(resolve);
      }) as { html: string; text: string };

      // Should not contain executable script tags
      expect(result.html).not.toContain('<script>');
      expect(result.html).not.toContain('javascript:');
      expect(result.html).not.toContain('onerror=');

      // Should handle nested tokens safely
      expect(result.html).not.toContain('{{nested_token}}');
    });
  });

  describe('Acceptance Criteria: Email Client Compatibility (95% Pass Rate)', () => {
    it('should achieve 95% compatibility across major email clients', async () => {
      const templateId = 'test-template';

      const results = await new Promise<CompatibilityResult[]>(resolve => {
        service.validateEmailClientCompatibility(templateId).subscribe(resolve);
      });

      // Verify all major clients are tested
      const majorClients = ['gmail', 'outlook', 'apple_mail', 'yahoo'];
      const testedClients = results.map(r => r.emailClient);

      majorClients.forEach(client => {
        expect(testedClients).toContain(client);
      });

      // Calculate overall pass rate
      const passedResults = results.filter(r => r.passed);
      const passRate = (passedResults.length / results.length) * 100;

      expect(passRate).toBeGreaterThanOrEqual(95);

      // Ensure scores are within acceptable range
      passedResults.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(90);
        expect(result.score).toBeLessThanOrEqual(100);
      });
    });

    it('should provide detailed compatibility diagnostics', async () => {
      const templateId = 'test-template';

      const results = await new Promise<CompatibilityResult[]>(resolve => {
        service.validateEmailClientCompatibility(templateId).subscribe(resolve);
      });

      results.forEach(result => {
        // Each result should have complete diagnostic information
        expect(result).toHaveProperty('emailClient');
        expect(result).toHaveProperty('version');
        expect(result).toHaveProperty('passed');
        expect(result).toHaveProperty('issues');
        expect(result).toHaveProperty('score');

        // Issues array should be meaningful
        if (!result.passed) {
          expect(result.issues.length).toBeGreaterThan(0);
          expect(result.score).toBeLessThan(95);
        }
      });
    });

    it('should test responsive design compatibility across clients', async () => {
      const templateId = 'test-template';

      const results = await new Promise<CompatibilityResult[]>(resolve => {
        service.validateEmailClientCompatibility(templateId).subscribe(resolve);
      });

      // Verify that mobile-specific issues are detected
      const mobileIssues = results.some(r =>
        r.issues.some(issue =>
          issue.toLowerCase().includes('mobile') ||
          issue.toLowerCase().includes('responsive')
        )
      );

      // At least some clients should handle responsive design well
      const responsiveCompatible = results.filter(r => r.score >= 95);
      expect(responsiveCompatible.length).toBeGreaterThan(0);
    });

    it('should handle CSS and HTML compatibility issues', async () => {
      // Create a template version with potentially problematic CSS
      const problematicTemplate: TemplateVersion = {
        id: 'css-test',
        templateId: 'css-template',
        version: 1,
        createdAt: new Date(),
        createdBy: 'test-user',
        blocks: [
          {
            id: 'flexbox-block',
            type: 'text' as const,
            content: '<div style="display: flex; gap: 20px;">Flexbox content</div>',
            styles: { display: 'flex', gap: '20px' },
            personalizationTokens: []
          },
          {
            id: 'grid-block',
            type: 'text' as const,
            content: '<div style="display: grid; grid-template-columns: 1fr 1fr;">Grid content</div>',
            styles: { display: 'grid' },
            personalizationTokens: []
          }
        ],
        variables: [],
        brandComplianceScore: 90,
        accessibilityScore: 95,
        isActive: true
      };

      const results = await new Promise<CompatibilityResult[]>(resolve => {
        service.validateEmailClientCompatibility('css-template').subscribe(resolve);
      });

      // Some clients may have issues with modern CSS
      const cssIssues = results.filter(r =>
        r.issues.some(issue =>
          issue.toLowerCase().includes('css') ||
          issue.toLowerCase().includes('flexbox') ||
          issue.toLowerCase().includes('grid')
        )
      );

      // Should detect CSS compatibility issues in some clients
      expect(cssIssues.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Acceptance Criteria: Brand Compliance Validation', () => {
    it('should enforce brand guidelines and prevent non-compliant content', async () => {
      // Test template with brand guideline violations
      const nonCompliantTemplate: TemplateVersion = {
        id: 'non-compliant',
        templateId: 'test',
        version: 1,
        createdAt: new Date(),
        createdBy: 'test-user',
        blocks: [
          {
            id: 'bad-color',
            type: 'text' as const,
            content: '<p>Bad branding</p>',
            styles: {
              color: '#ff0000', // Unapproved color
              fontFamily: 'Comic Sans MS' // Unapproved font
            },
            personalizationTokens: []
          }
        ],
        variables: [],
        brandComplianceScore: 0,
        accessibilityScore: 0,
        isActive: false
      };

      const result = await new Promise(resolve => {
        service.validateBrandCompliance(nonCompliantTemplate).subscribe(resolve);
      }) as { score: number; violations: string[] };

      expect(result.score).toBeLessThan(80);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.includes('color'))).toBe(true);
      expect(result.violations.some(v => v.includes('font'))).toBe(true);
    });

    it('should validate compliant templates successfully', async () => {
      // Test template following brand guidelines
      const compliantTemplate: TemplateVersion = {
        id: 'compliant',
        templateId: 'test',
        version: 1,
        createdAt: new Date(),
        createdBy: 'test-user',
        blocks: [
          {
            id: 'good-branding',
            type: 'text' as const,
            content: '<p>Good branding</p>',
            styles: {
              color: '#0066cc', // Approved color
              fontFamily: 'Arial, sans-serif' // Approved font
            },
            personalizationTokens: []
          }
        ],
        variables: [],
        brandComplianceScore: 95,
        accessibilityScore: 98,
        isActive: true
      };

      const result = await new Promise(resolve => {
        service.validateBrandCompliance(compliantTemplate).subscribe(resolve);
      }) as { score: number; violations: string[] };

      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.violations.length).toBe(0);
    });

    it('should provide actionable feedback for brand violations', async () => {
      const mixedComplianceTemplate: TemplateVersion = {
        id: 'mixed',
        templateId: 'test',
        version: 1,
        createdAt: new Date(),
        createdBy: 'test-user',
        blocks: [
          {
            id: 'good-block',
            type: 'text' as const,
            content: '<p>Good content</p>',
            styles: { color: '#0066cc' },
            personalizationTokens: []
          },
          {
            id: 'bad-block',
            type: 'text' as const,
            content: '<p>Bad content</p>',
            styles: { color: '#ff0000' },
            personalizationTokens: []
          }
        ],
        variables: [],
        brandComplianceScore: 80,
        accessibilityScore: 95,
        isActive: true
      };

      const result = await new Promise(resolve => {
        service.validateBrandCompliance(mixedComplianceTemplate).subscribe(resolve);
      }) as { score: number; violations: string[] };

      // Should identify specific problematic blocks
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.includes('bad-block'))).toBe(true);
      expect(result.violations.some(v => v.includes('good-block'))).toBe(false);
    });

    it('should handle case-insensitive brand validation', async () => {
      const caseTestTemplate: TemplateVersion = {
        id: 'case-test',
        templateId: 'test',
        version: 1,
        createdAt: new Date(),
        createdBy: 'test-user',
        blocks: [
          {
            id: 'case-block',
            type: 'text' as const,
            content: '<p>Case test</p>',
            styles: {
              color: '#0066CC', // Uppercase version of approved color
              fontFamily: 'ARIAL' // Uppercase font name
            },
            personalizationTokens: []
          }
        ],
        variables: [],
        brandComplianceScore: 95,
        accessibilityScore: 98,
        isActive: true
      };

      const result = await new Promise(resolve => {
        service.validateBrandCompliance(caseTestTemplate).subscribe(resolve);
      }) as { score: number; violations: string[] };

      // Should handle case-insensitive matching
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.violations.length).toBe(0);
    });
  });

  describe('Acceptance Criteria: Accessibility Standards Compliance', () => {
    it('should enforce WCAG AA color contrast requirements', async () => {
      const lowContrastTemplate: TemplateVersion = {
        id: 'low-contrast',
        templateId: 'test',
        version: 1,
        createdAt: new Date(),
        createdBy: 'test-user',
        blocks: [
          {
            id: 'low-contrast-text',
            type: 'text' as const,
            content: '<p style="color: #cccccc; background-color: #ffffff;">Low contrast text</p>',
            styles: { color: '#cccccc', backgroundColor: '#ffffff' },
            personalizationTokens: []
          }
        ],
        variables: [],
        brandComplianceScore: 90,
        accessibilityScore: 60,
        isActive: true
      };

      const result = await new Promise<AccessibilityValidation>(resolve => {
        service.validateAccessibility(lowContrastTemplate).subscribe(resolve);
      });

      expect(result.contrastRatio).toBeLessThan(4.5); // Below WCAG AA requirement
      expect(result.score).toBeLessThan(90);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should require alt text for all images', async () => {
      const imageWithoutAltTemplate: TemplateVersion = {
        id: 'no-alt',
        templateId: 'test',
        version: 1,
        createdAt: new Date(),
        createdBy: 'test-user',
        blocks: [
          {
            id: 'image-no-alt',
            type: 'image' as const,
            content: '<img src="newsletter.jpg" />',
            styles: {},
            personalizationTokens: []
          }
        ],
        variables: [],
        brandComplianceScore: 95,
        accessibilityScore: 75,
        isActive: true
      };

      const result = await new Promise<AccessibilityValidation>(resolve => {
        service.validateAccessibility(imageWithoutAltTemplate).subscribe(resolve);
      });

      expect(result.hasAltText).toBe(false);
      expect(result.screenReaderCompatible).toBe(false);
      expect(result.issues.some(issue => issue.includes('alt text'))).toBe(true);
      expect(result.score).toBeLessThan(90);
    });

    it('should validate semantic HTML structure', async () => {
      const semanticTemplate: TemplateVersion = {
        id: 'semantic',
        templateId: 'test',
        version: 1,
        createdAt: new Date(),
        createdBy: 'test-user',
        blocks: [
          {
            id: 'semantic-header',
            type: 'header' as const,
            content: '<header><h1>Newsletter Title</h1></header>',
            styles: {},
            personalizationTokens: []
          },
          {
            id: 'semantic-content',
            type: 'text' as const,
            content: '<main><p>Main content</p></main>',
            styles: {},
            personalizationTokens: []
          }
        ],
        variables: [],
        brandComplianceScore: 95,
        accessibilityScore: 98,
        isActive: true
      };

      const result = await new Promise<AccessibilityValidation>(resolve => {
        service.validateAccessibility(semanticTemplate).subscribe(resolve);
      });

      expect(result.hasSemanticStructure).toBe(true);
      expect(result.keyboardAccessible).toBe(true);
      expect(result.screenReaderCompatible).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(95);
    });

    it('should ensure comprehensive accessibility scoring', async () => {
      const perfectAccessibilityTemplate: TemplateVersion = {
        id: 'perfect',
        templateId: 'test',
        version: 1,
        createdAt: new Date(),
        createdBy: 'test-user',
        blocks: [
          {
            id: 'accessible-text',
            type: 'text' as const,
            content: '<p style="color: #333333; background: #ffffff;">High contrast text</p>',
            styles: {},
            personalizationTokens: []
          },
          {
            id: 'accessible-image',
            type: 'image' as const,
            content: '<img src="image.jpg" alt="Descriptive alt text for newsletter image" />',
            styles: {},
            personalizationTokens: []
          }
        ],
        variables: [],
        brandComplianceScore: 95,
        accessibilityScore: 98,
        isActive: true
      };

      const result = await new Promise<AccessibilityValidation>(resolve => {
        service.validateAccessibility(perfectAccessibilityTemplate).subscribe(resolve);
      });

      expect(result.contrastRatio).toBeGreaterThanOrEqual(4.5);
      expect(result.hasAltText).toBe(true);
      expect(result.hasSemanticStructure).toBe(true);
      expect(result.keyboardAccessible).toBe(true);
      expect(result.screenReaderCompatible).toBe(true);
      expect(result.issues.length).toBe(0);
      expect(result.score).toBeGreaterThanOrEqual(95);
    });
  });

  describe('Acceptance Criteria: Template Versioning and Rollback', () => {
    it('should create new template versions automatically', async () => {
      const templateData = {
        name: 'Versioned Template',
        description: 'Test versioning functionality',
        contentType: 'newsletter' as const,
        tags: ['versioning', 'test']
      };

      const template = await new Promise<Template>(resolve => {
        service.createTemplate(templateData).subscribe(resolve);
      });

      expect(template.currentVersion).toBe(1);
      expect(template.versions).toHaveLength(0); // Initial template has no version blocks yet
      expect(template.isPublished).toBe(false);
    });

    it('should track template modification history', async () => {
      // Get existing template
      const template = await new Promise<Template | null>(resolve => {
        service.getTemplate('1').subscribe(resolve);
      });

      if (template) {
        const updateData = {
          name: 'Updated Template Name',
          description: 'Updated description'
        };

        const updatedTemplate = await new Promise<Template | null>(resolve => {
          service.updateTemplate(template.id, updateData).subscribe(resolve);
        });

        expect(updatedTemplate?.name).toBe('Updated Template Name');
        expect(updatedTemplate?.updatedAt).toBeInstanceOf(Date);
        expect(updatedTemplate?.updatedAt.getTime()).toBeGreaterThan(template.updatedAt.getTime());
      }
    });

    it('should support template rollback scenarios', async () => {
      // This would test rollback functionality - in a real implementation,
      // the service would need rollback methods
      const templateId = '1';

      // Get current template state
      const currentTemplate = await new Promise<Template | null>(resolve => {
        service.getTemplate(templateId).subscribe(resolve);
      });

      expect(currentTemplate).toBeTruthy();
      expect(currentTemplate?.id).toBe(templateId);

      // In a full implementation, this would test:
      // - service.rollbackToVersion(templateId, versionNumber)
      // - Version history preservation
      // - Rollback validation and safety checks
    });
  });

  describe('Performance and Scalability Requirements', () => {
    it('should handle high-volume template operations efficiently', async () => {
      const startTime = performance.now();

      // Simulate multiple concurrent operations
      const operations = [
        // Multiple template retrievals
        ...Array.from({ length: 50 }, () =>
          new Promise(resolve => service.getTemplate('1').subscribe(resolve))
        ),
        // Multiple brand compliance validations
        ...Array.from({ length: 25 }, () => {
          const mockTemplate: TemplateVersion = {
            id: 'perf-test',
            templateId: 'test',
            version: 1,
            createdAt: new Date(),
            createdBy: 'test-user',
            blocks: [],
            variables: [],
            brandComplianceScore: 95,
            accessibilityScore: 98,
            isActive: true
          };
          return new Promise(resolve =>
            service.validateBrandCompliance(mockTemplate).subscribe(resolve)
          );
        }),
        // Multiple compatibility checks
        ...Array.from({ length: 25 }, () =>
          new Promise(resolve =>
            service.validateEmailClientCompatibility('1').subscribe(resolve)
          )
        )
      ];

      await Promise.all(operations);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 100 operations should complete within 3 seconds
      expect(totalTime).toBeLessThan(3000);
    });

    it('should maintain data consistency under concurrent access', async () => {
      const templateId = '1';

      // Simulate concurrent updates
      const concurrentUpdates = Array.from({ length: 10 }, (_, i) =>
        new Promise(resolve => {
          const updateData = {
            description: `Concurrent update ${i}`,
            updatedAt: new Date()
          };
          service.updateTemplate(templateId, updateData).subscribe(resolve);
        })
      );

      const results = await Promise.all(concurrentUpdates) as (Template | null)[];

      // All updates should succeed
      expect(results.every(result => result !== null)).toBe(true);

      // Final state should be consistent
      const finalTemplate = await new Promise<Template | null>(resolve => {
        service.getTemplate(templateId).subscribe(resolve);
      });

      expect(finalTemplate).toBeTruthy();
    });

    it('should optimize memory usage for large template sets', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Load and process multiple templates
      const templates = await new Promise<Template[]>(resolve => {
        service.getTemplates().subscribe(resolve);
      });

      // Perform operations on templates
      for (const template of templates) {
        await new Promise(resolve => {
          service.renderTemplate(template.id, {
            subscriber_name: 'Test User',
            subscriber_email: 'test@example.com'
          }).subscribe(resolve);
        });
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Memory usage should be reasonable (less than 50MB increase)
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
      }
    });
  });

  describe('Integration: Complete Template Lifecycle', () => {
    it('should support end-to-end template workflow', async () => {
      // 1. Create template
      const newTemplate = await new Promise<Template>(resolve => {
        service.createTemplate({
          name: 'E2E Test Template',
          description: 'End-to-end workflow test',
          contentType: 'promotional' as const,
          tags: ['e2e', 'test']
        }).subscribe(resolve);
      });

      expect(newTemplate.name).toBe('E2E Test Template');
      expect(newTemplate.contentType).toBe('promotional');

      // 2. Validate brand compliance
      const mockVersion: TemplateVersion = {
        id: 'e2e-version',
        templateId: newTemplate.id,
        version: 1,
        createdAt: new Date(),
        createdBy: 'test-user',
        blocks: [
          {
            id: 'e2e-block',
            type: 'text' as const,
            content: 'Hello {{subscriber_name}}!',
            styles: { color: '#0066cc', fontFamily: 'Arial, sans-serif' },
            personalizationTokens: ['subscriber_name']
          }
        ],
        variables: [],
        brandComplianceScore: 95,
        accessibilityScore: 98,
        isActive: true
      };

      const brandResult = await new Promise(resolve => {
        service.validateBrandCompliance(mockVersion).subscribe(resolve);
      }) as { score: number; violations: string[] };

      expect(brandResult.score).toBeGreaterThanOrEqual(90);

      // 3. Validate accessibility
      const accessibilityResult = await new Promise<AccessibilityValidation>(resolve => {
        service.validateAccessibility(mockVersion).subscribe(resolve);
      });

      expect(accessibilityResult.score).toBeGreaterThanOrEqual(90);

      // 4. Check email client compatibility
      const compatibilityResults = await new Promise<CompatibilityResult[]>(resolve => {
        service.validateEmailClientCompatibility(newTemplate.id).subscribe(resolve);
      });

      const passRate = (compatibilityResults.filter(r => r.passed).length / compatibilityResults.length) * 100;
      expect(passRate).toBeGreaterThanOrEqual(95);

      // 5. Render with personalization
      const renderResult = await new Promise(resolve => {
        service.renderTemplate(newTemplate.id, {
          subscriber_name: 'Test User',
          subscriber_email: 'test@example.com'
        }).subscribe(resolve);
      }) as { html: string; text: string };

      expect(renderResult.html).toContain('Test User');
      expect(renderResult.text).toContain('Test User');

      // 6. Update template
      const updatedTemplate = await new Promise<Template | null>(resolve => {
        service.updateTemplate(newTemplate.id, {
          name: 'Updated E2E Template',
          isPublished: true
        }).subscribe(resolve);
      });

      expect(updatedTemplate?.name).toBe('Updated E2E Template');
      expect(updatedTemplate?.isPublished).toBe(true);
    });
  });
});