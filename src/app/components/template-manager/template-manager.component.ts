import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TemplateService } from '../../services/template.service';
import {
  Template,
  TemplateBlock,
  TemplateVariable,
  TemplatePreview,
  BrandGuideline,
  CompatibilityResult,
  AccessibilityValidation
} from '../../models/template.model';

@Component({
  selector: 'app-template-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template-manager.component.html',
  styleUrls: ['./template-manager.component.css']
})
export class TemplateManagerComponent implements OnInit {
  private readonly templateService = inject(TemplateService);

  // Signals for reactive state management
  public readonly templates = signal<Template[]>([]);
  public readonly selectedTemplate = signal<Template | null>(null);
  public readonly currentBlocks = signal<TemplateBlock[]>([]);
  public readonly availableVariables = signal<TemplateVariable[]>([]);
  public readonly brandGuidelines = signal<BrandGuideline[]>([]);
  public readonly previewDevice = signal<'desktop' | 'mobile' | 'tablet'>('desktop');
  public readonly previewClient = signal<string>('gmail');
  public readonly currentPreview = signal<TemplatePreview | null>(null);
  public readonly brandComplianceScore = signal<number>(100);
  public readonly accessibilityScore = signal<number>(100);
  public readonly compatibilityResults = signal<CompatibilityResult[]>([]);
  public readonly isLoading = signal<boolean>(false);
  public readonly draggedBlock = signal<TemplateBlock | null>(null);

  // Computed properties
  public readonly canSaveTemplate = computed(() =>
    this.brandComplianceScore() >= 80 && this.accessibilityScore() >= 90
  );

  public readonly compatibilityPassRate = computed(() => {
    const results = this.compatibilityResults();
    if (results.length === 0) return 0;
    const passed = results.filter(r => r.passed).length;
    return Math.round((passed / results.length) * 100);
  });

  // Available content blocks for drag-and-drop
  public readonly availableBlocks: TemplateBlock[] = [
    {
      id: 'text-block',
      type: 'text',
      content: '<p>Enter your text here with {{subscriber_name}} personalization</p>',
      styles: { padding: '10px', fontSize: '14px' },
      personalizationTokens: ['subscriber_name']
    },
    {
      id: 'header-block',
      type: 'header',
      content: '<h1>Welcome {{subscriber_name}}</h1>',
      styles: { padding: '20px', fontSize: '24px', textAlign: 'center' },
      personalizationTokens: ['subscriber_name']
    },
    {
      id: 'button-block',
      type: 'button',
      content: '<a href="{{action_url}}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Call to Action</a>',
      styles: { textAlign: 'center', padding: '20px' },
      personalizationTokens: ['action_url']
    },
    {
      id: 'image-block',
      type: 'image',
      content: '<img src="{{image_url}}" alt="{{image_alt}}" style="max-width: 100%; height: auto;" />',
      styles: { padding: '10px', textAlign: 'center' },
      personalizationTokens: ['image_url', 'image_alt']
    }
  ];

  // Sample personalization variables
  private readonly sampleVariables: TemplateVariable[] = [
    {
      id: 'subscriber_name',
      name: 'Subscriber Name',
      type: 'text',
      defaultValue: 'Valued Customer',
      required: false,
      description: 'The subscriber\'s first name or full name'
    },
    {
      id: 'subscriber_email',
      name: 'Subscriber Email',
      type: 'email',
      defaultValue: 'subscriber@example.com',
      required: true,
      description: 'The subscriber\'s email address'
    },
    {
      id: 'action_url',
      name: 'Action URL',
      type: 'text',
      defaultValue: 'https://example.com',
      required: false,
      description: 'URL for call-to-action buttons'
    },
    {
      id: 'image_url',
      name: 'Image URL',
      type: 'text',
      defaultValue: 'https://via.placeholder.com/600x300',
      required: false,
      description: 'URL for images in the template'
    },
    {
      id: 'image_alt',
      name: 'Image Alt Text',
      type: 'text',
      defaultValue: 'Descriptive alt text',
      required: true,
      description: 'Alternative text for images (required for accessibility)'
    }
  ];

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.isLoading.set(true);

    this.templateService.getTemplates().subscribe(templates => {
      this.templates.set(templates);
      if (templates.length > 0) {
        this.selectTemplate(templates[0]);
      }
    });

    this.templateService.getBrandGuidelines().subscribe(guidelines => {
      this.brandGuidelines.set(guidelines);
    });

    this.availableVariables.set(this.sampleVariables);
    this.isLoading.set(false);
  }

  selectTemplate(template: Template): void {
    this.selectedTemplate.set(template);
    if (template.versions.length > 0) {
      const currentVersion = template.versions[template.currentVersion - 1];
      this.currentBlocks.set([...currentVersion.blocks]);
      this.validateTemplate();
    } else {
      this.currentBlocks.set([]);
    }
    this.generatePreview();
  }

  createNewTemplate(): void {
    const templateData = {
      name: `New Template ${Date.now()}`,
      description: 'A new email template',
      contentType: 'newsletter' as const,
      tags: ['new']
    };

    this.templateService.createTemplate(templateData).subscribe(template => {
      const updatedTemplates = [...this.templates(), template];
      this.templates.set(updatedTemplates);
      this.selectTemplate(template);
    });
  }

  onDragStart(block: TemplateBlock): void {
    this.draggedBlock.set(block);
  }

  onDragEnd(): void {
    this.draggedBlock.set(null);
  }

  onDrop(event: DragEvent, targetIndex?: number): void {
    event.preventDefault();
    const draggedBlock = this.draggedBlock();
    if (!draggedBlock) return;

    const newBlock: TemplateBlock = {
      ...draggedBlock,
      id: `${draggedBlock.type}-${Date.now()}`
    };

    const currentBlocks = this.currentBlocks();
    if (targetIndex !== undefined) {
      currentBlocks.splice(targetIndex, 0, newBlock);
    } else {
      currentBlocks.push(newBlock);
    }

    this.currentBlocks.set([...currentBlocks]);
    this.validateTemplate();
    this.generatePreview();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  removeBlock(index: number): void {
    const blocks = this.currentBlocks();
    blocks.splice(index, 1);
    this.currentBlocks.set([...blocks]);
    this.validateTemplate();
    this.generatePreview();
  }

  updateBlockContent(index: number, content: string): void {
    const blocks = this.currentBlocks();
    blocks[index] = { ...blocks[index], content };
    this.currentBlocks.set([...blocks]);
    this.validateTemplate();
    this.generatePreview();
  }

  insertPersonalizationToken(blockIndex: number, token: string): void {
    const blocks = this.currentBlocks();
    const block = blocks[blockIndex];
    block.content += ` {{${token}}}`;
    this.currentBlocks.set([...blocks]);
    this.generatePreview();
  }

  changePreviewDevice(device: 'desktop' | 'mobile' | 'tablet'): void {
    this.previewDevice.set(device);
    this.generatePreview();
  }

  changePreviewClient(client: string): void {
    this.previewClient.set(client);
    this.generatePreview();
  }

  onBlockContentInput(index: number, event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    if (target) {
      this.updateBlockContent(index, target.value);
    }
  }

  onDeviceChange(device: string): void {
    if (device === 'desktop' || device === 'mobile' || device === 'tablet') {
      this.changePreviewDevice(device);
    }
  }

  onClientChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.changePreviewClient(target.value);
    }
  }

  private validateTemplate(): void {
    const template = this.selectedTemplate();
    if (!template) return;

    // Mock validation - in production would call actual validation services
    const templateVersion = {
      id: 'current',
      templateId: template.id,
      version: template.currentVersion,
      createdAt: new Date(),
      createdBy: 'current-user',
      blocks: this.currentBlocks(),
      variables: this.availableVariables(),
      brandComplianceScore: 0,
      accessibilityScore: 0,
      isActive: true
    };

    this.templateService.validateBrandCompliance(templateVersion).subscribe(result => {
      this.brandComplianceScore.set(result.score);
    });

    this.templateService.validateAccessibility(templateVersion).subscribe(result => {
      this.accessibilityScore.set(result.score);
    });

    this.templateService.validateEmailClientCompatibility(template.id).subscribe(results => {
      this.compatibilityResults.set(results);
    });
  }

  private generatePreview(): void {
    const template = this.selectedTemplate();
    if (!template) return;

    const sampleData = {
      subscriber_name: 'John Doe',
      subscriber_email: 'john@example.com',
      action_url: 'https://example.com/action',
      image_url: 'https://via.placeholder.com/600x300',
      image_alt: 'Sample newsletter image'
    };

    this.templateService.generatePreview(
      template.id,
      this.previewDevice(),
      this.previewClient(),
      sampleData
    ).subscribe(preview => {
      this.currentPreview.set(preview);
    });
  }

  saveTemplate(): void {
    const template = this.selectedTemplate();
    if (!template || !this.canSaveTemplate()) return;

    this.isLoading.set(true);

    const updatedTemplate = {
      ...template,
      updatedAt: new Date(),
      isPublished: true
    };

    this.templateService.updateTemplate(template.id, updatedTemplate).subscribe(() => {
      this.isLoading.set(false);
      // In production, would show success notification
    });
  }
}