export interface TemplateVariable {
  id: string;
  name: string;
  type: 'text' | 'email' | 'number' | 'date' | 'boolean';
  defaultValue: string;
  required: boolean;
  description: string;
}

export interface TemplateBlock {
  id: string;
  type: 'text' | 'image' | 'button' | 'spacer' | 'header' | 'footer';
  content: string;
  styles: { [key: string]: string };
  personalizationTokens: string[];
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  createdAt: Date;
  createdBy: string;
  blocks: TemplateBlock[];
  variables: TemplateVariable[];
  brandComplianceScore: number;
  accessibilityScore: number;
  isActive: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  contentType: 'newsletter' | 'promotional' | 'transactional' | 'welcome';
  currentVersion: number;
  versions: TemplateVersion[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
  isPublished: boolean;
}

export interface TemplatePreview {
  id: string;
  templateId: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  emailClient: 'gmail' | 'outlook' | 'apple_mail' | 'yahoo' | 'other';
  htmlContent: string;
  textContent: string;
  sampleData: { [key: string]: any };
  previewUrl: string;
  timestamp: Date;
}

export interface BrandGuideline {
  id: string;
  name: string;
  type: 'color' | 'font' | 'spacing' | 'layout' | 'content';
  rules: { [key: string]: any };
  isRequired: boolean;
}

export interface CompatibilityResult {
  emailClient: string;
  version: string;
  passed: boolean;
  issues: string[];
  score: number;
}

export interface AccessibilityValidation {
  contrastRatio: number;
  hasAltText: boolean;
  hasSemanticStructure: boolean;
  keyboardAccessible: boolean;
  screenReaderCompatible: boolean;
  issues: string[];
  score: number;
}