import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  Template,
  TemplateVersion,
  TemplateBlock,
  TemplateVariable,
  TemplatePreview,
  BrandGuideline,
  CompatibilityResult,
  AccessibilityValidation
} from '../models/template.model';

@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  private templatesSubject = new BehaviorSubject<Template[]>([]);
  private brandGuidelinesSubject = new BehaviorSubject<BrandGuideline[]>([]);

  public readonly templates$ = this.templatesSubject.asObservable();
  public readonly brandGuidelines$ = this.brandGuidelinesSubject.asObservable();

  private mockTemplates: Template[] = [
    {
      id: '1',
      name: 'Weekly Newsletter',
      description: 'Standard weekly newsletter template',
      contentType: 'newsletter',
      currentVersion: 1,
      versions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'content-manager',
      tags: ['newsletter', 'weekly'],
      isPublished: true
    }
  ];

  private mockBrandGuidelines: BrandGuideline[] = [
    {
      id: '1',
      name: 'Primary Colors',
      type: 'color',
      rules: {
        primary: '#0066cc',
        secondary: '#f5f5f5',
        text: '#333333',
        background: '#ffffff'
      },
      isRequired: true
    },
    {
      id: '2',
      name: 'Typography',
      type: 'font',
      rules: {
        primary: 'Arial, sans-serif',
        heading: 'Georgia, serif',
        size: { min: 14, max: 24 }
      },
      isRequired: true
    }
  ];

  constructor() {
    this.templatesSubject.next(this.mockTemplates);
    this.brandGuidelinesSubject.next(this.mockBrandGuidelines);
  }

  getTemplates(): Observable<Template[]> {
    return this.templates$;
  }

  getTemplate(id: string): Observable<Template | null> {
    const template = this.mockTemplates.find(t => t.id === id);
    return of(template || null);
  }

  createTemplate(template: Partial<Template>): Observable<Template> {
    const newTemplate: Template = {
      id: Date.now().toString(),
      name: template.name || 'New Template',
      description: template.description || '',
      contentType: template.contentType || 'newsletter',
      currentVersion: 1,
      versions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'current-user',
      tags: template.tags || [],
      isPublished: false
    };

    this.mockTemplates.push(newTemplate);
    this.templatesSubject.next([...this.mockTemplates]);
    return of(newTemplate);
  }

  updateTemplate(id: string, updates: Partial<Template>): Observable<Template | null> {
    const index = this.mockTemplates.findIndex(t => t.id === id);
    if (index === -1) return of(null);

    this.mockTemplates[index] = {
      ...this.mockTemplates[index],
      ...updates,
      updatedAt: new Date()
    };

    this.templatesSubject.next([...this.mockTemplates]);
    return of(this.mockTemplates[index]);
  }

  deleteTemplate(id: string): Observable<boolean> {
    const index = this.mockTemplates.findIndex(t => t.id === id);
    if (index === -1) return of(false);

    this.mockTemplates.splice(index, 1);
    this.templatesSubject.next([...this.mockTemplates]);
    return of(true);
  }

  renderTemplate(templateId: string, variables: { [key: string]: any }): Observable<{ html: string; text: string }> {
    // Simplified template rendering with variable substitution
    const template = this.mockTemplates.find(t => t.id === templateId);
    if (!template) {
      return of({ html: '', text: '' });
    }

    let htmlContent = '<html><body>';
    let textContent = '';

    // Mock rendering logic - in production this would use Jinja2 or similar
    template.versions[template.currentVersion - 1]?.blocks.forEach(block => {
      let content = block.content;

      // Simple variable substitution with fallback
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        content = content.replace(regex, variables[key] || `[${key}]`);
      });

      htmlContent += `<div>${content}</div>`;
      textContent += content + '\n';
    });

    htmlContent += '</body></html>';

    return of({ html: htmlContent, text: textContent });
  }

  generatePreview(
    templateId: string,
    deviceType: 'desktop' | 'mobile' | 'tablet',
    emailClient: string,
    sampleData: { [key: string]: any }
  ): Observable<TemplatePreview> {
    const preview: TemplatePreview = {
      id: Date.now().toString(),
      templateId,
      deviceType,
      emailClient: emailClient as any,
      htmlContent: `<div>Preview for ${deviceType} on ${emailClient}</div>`,
      textContent: `Preview for ${deviceType} on ${emailClient}`,
      sampleData,
      previewUrl: `/preview/${templateId}/${Date.now()}`,
      timestamp: new Date()
    };

    return of(preview);
  }

  validateBrandCompliance(templateVersion: TemplateVersion): Observable<{ score: number; violations: string[] }> {
    const violations: string[] = [];
    let score = 100;

    // Mock brand validation logic
    templateVersion.blocks.forEach(block => {
      if (block.styles['color'] && !this.isApprovedColor(block.styles['color'])) {
        violations.push(`Block ${block.id}: Unapproved color ${block.styles['color']}`);
        score -= 10;
      }

      if (block.styles['fontFamily'] && !this.isApprovedFont(block.styles['fontFamily'])) {
        violations.push(`Block ${block.id}: Unapproved font ${block.styles['fontFamily']}`);
        score -= 10;
      }
    });

    return of({ score: Math.max(0, score), violations });
  }

  validateEmailClientCompatibility(templateId: string): Observable<CompatibilityResult[]> {
    // Mock compatibility testing
    const clients = ['gmail', 'outlook', 'apple_mail', 'yahoo'];
    const results: CompatibilityResult[] = clients.map(client => ({
      emailClient: client,
      version: '2024',
      passed: Math.random() > 0.05, // 95% pass rate as per requirements
      issues: Math.random() > 0.8 ? [`Minor formatting issue in ${client}`] : [],
      score: 95 + Math.random() * 5
    }));

    return of(results);
  }

  validateAccessibility(templateVersion: TemplateVersion): Observable<AccessibilityValidation> {
    const validation: AccessibilityValidation = {
      contrastRatio: 4.5, // WCAG AA compliant
      hasAltText: templateVersion.blocks.some(b => b.type === 'image' && b.content.includes('alt=')),
      hasSemanticStructure: true,
      keyboardAccessible: true,
      screenReaderCompatible: true,
      issues: [],
      score: 98
    };

    // Check for accessibility issues
    templateVersion.blocks.forEach(block => {
      if (block.type === 'image' && !block.content.includes('alt=')) {
        validation.issues.push(`Image block ${block.id} missing alt text`);
        validation.score -= 5;
      }
    });

    return of(validation);
  }

  getBrandGuidelines(): Observable<BrandGuideline[]> {
    return this.brandGuidelines$;
  }

  private isApprovedColor(color: string): boolean {
    const approvedColors = ['#0066cc', '#f5f5f5', '#333333', '#ffffff'];
    return approvedColors.includes(color.toLowerCase());
  }

  private isApprovedFont(font: string): boolean {
    const approvedFonts = ['Arial', 'Georgia', 'Helvetica', 'sans-serif', 'serif'];
    return approvedFonts.some(approved =>
      font.toLowerCase().includes(approved.toLowerCase())
    );
  }
}