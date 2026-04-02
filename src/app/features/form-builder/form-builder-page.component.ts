import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormSchemaService } from '../../services/form-schema.service';
import { FormBuilderPanelComponent } from './builder-panel/builder-panel.component';
import { FormRendererPanelComponent } from './renderer-panel/renderer-panel.component';
import { FormSchema, ExportedFormSchema } from '../../models/form-schema.model';

@Component({
  selector: 'app-form-builder-page',
  standalone: true,
  imports: [CommonModule, FormBuilderPanelComponent, FormRendererPanelComponent],
  template: `
    <div class="page-container">
      <div class="toolbar">
        <div class="mode-toggle" role="group" aria-label="Mode toggle">
          <button
            [class.active]="mode === 'build'"
            (click)="mode = 'build'"
            aria-label="Switch to build mode"
          >Build</button>
          <button
            [class.active]="mode === 'fill'"
            (click)="mode = 'fill'"
            aria-label="Switch to fill mode"
          >Fill &amp; Validate</button>
        </div>
        <div class="toolbar-actions">
          <button
            class="toolbar-btn"
            (click)="toggleViewJson()"
            aria-label="View JSON schema"
          >{{ showJson ? 'Hide JSON' : 'View JSON' }}</button>
          <button
            class="toolbar-btn export-btn"
            [disabled]="schema.fields.length === 0"
            [title]="schema.fields.length === 0 ? 'Add at least one field to export' : 'Export JSON'"
            (click)="exportJson()"
            aria-label="Export JSON schema"
          >Export JSON</button>
        </div>
      </div>

      <!-- Mobile tab toggle -->
      <div class="mobile-tabs" role="tablist" aria-label="Panel toggle">
        <button
          role="tab"
          [attr.aria-selected]="mobileTab === 'build'"
          [class.active]="mobileTab === 'build'"
          (click)="mobileTab = 'build'"
        >Build</button>
        <button
          role="tab"
          [attr.aria-selected]="mobileTab === 'preview'"
          [class.active]="mobileTab === 'preview'"
          (click)="mobileTab = 'preview'"
        >Preview</button>
      </div>

      <div class="grid-layout" [class.show-build]="mobileTab === 'build'" [class.show-preview]="mobileTab === 'preview'">
        <div class="builder-col">
          <app-builder-panel [schema]="schema"></app-builder-panel>
        </div>
        <div class="renderer-col">
          <app-renderer-panel [schema]="schema" [mode]="mode"></app-renderer-panel>
        </div>
      </div>

      @if (showJson) {
        <div class="json-panel">
          <div class="json-header">
            <h4>JSON Schema</h4>
            <button class="toolbar-btn" (click)="copyJson()" aria-label="Copy JSON to clipboard">
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
          <pre class="json-code">{{ jsonPreview }}</pre>
        </div>
      }

      @if (showFallbackJson) {
        <div class="json-panel fallback">
          <div class="json-header">
            <h4>Export Failed - Copy JSON</h4>
            <button class="toolbar-btn" (click)="copyJson()" aria-label="Copy JSON to clipboard">
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
          <pre class="json-code">{{ jsonPreview }}</pre>
        </div>
      }

      @if (toastMessage) {
        <div class="toast" role="status">{{ toastMessage }}</div>
      }
    </div>
  `,
  styles: [`
    .page-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .mode-toggle {
      display: flex;
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
    }
    .mode-toggle button {
      padding: 0.4rem 1rem;
      border: none;
      background: #f5f5f5;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      color: #666;
    }
    .mode-toggle button.active {
      background: #6c63ff;
      color: #fff;
    }
    .toolbar-actions {
      display: flex;
      gap: 0.35rem;
    }
    .toolbar-btn {
      padding: 0.4rem 0.8rem;
      border: 1px solid #ddd;
      background: #fff;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .toolbar-btn:hover:not(:disabled) {
      background: #f0f0f0;
    }
    .toolbar-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .export-btn {
      background: #6c63ff;
      color: #fff;
      border-color: #6c63ff;
    }
    .export-btn:hover:not(:disabled) {
      background: #5a52d5;
    }
    .mobile-tabs {
      display: none;
      position: sticky;
      top: 0;
      z-index: 10;
      background: #fff;
      border-bottom: 1px solid #ddd;
    }
    .mobile-tabs button {
      flex: 1;
      padding: 0.5rem;
      border: none;
      background: #f5f5f5;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      color: #666;
    }
    .mobile-tabs button.active {
      background: #6c63ff;
      color: #fff;
    }
    .grid-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      flex: 1;
      min-height: 0;
    }
    .builder-col, .renderer-col {
      min-height: 0;
      overflow-y: auto;
    }
    .json-panel {
      background: #1e1e2e;
      color: #cdd6f4;
      padding: 1rem;
      border-radius: 10px;
      max-height: 300px;
      overflow: auto;
    }
    .json-panel.fallback {
      border: 2px solid #e67e22;
    }
    .json-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .json-header h4 {
      margin: 0;
      color: #cdd6f4;
      font-size: 0.9rem;
    }
    .json-header .toolbar-btn {
      background: #333;
      color: #cdd6f4;
      border-color: #555;
    }
    .json-code {
      margin: 0;
      font-size: 0.8rem;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .toast {
      position: fixed;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: #fff;
      padding: 0.6rem 1.2rem;
      border-radius: 8px;
      font-size: 0.85rem;
      z-index: 100;
      animation: fadeInOut 3s ease forwards;
    }
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
      10% { opacity: 1; transform: translateX(-50%) translateY(0); }
      80% { opacity: 1; }
      100% { opacity: 0; }
    }
    @media (max-width: 1024px) {
      .mobile-tabs {
        display: flex;
      }
      .grid-layout {
        grid-template-columns: 1fr;
      }
      .grid-layout.show-build .renderer-col {
        display: none;
      }
      .grid-layout.show-preview .builder-col {
        display: none;
      }
    }
  `],
})
export class FormBuilderPageComponent {
  mode: 'build' | 'fill' = 'build';
  mobileTab: 'build' | 'preview' = 'build';
  schema: FormSchema = { fields: [], version: 0 };
  showJson = false;
  showFallbackJson = false;
  copied = false;
  toastMessage = '';

  constructor(private readonly schemaService: FormSchemaService) {
    this.schemaService.schema$.subscribe((s) => (this.schema = s));
  }

  get jsonPreview(): string {
    const exportData: ExportedFormSchema = { ...this.schema, schemaVersion: 1 };
    return JSON.stringify(exportData, null, 2);
  }

  toggleViewJson(): void {
    this.showJson = !this.showJson;
    this.showFallbackJson = false;
  }

  exportJson(): void {
    const success = this.schemaService.exportSchemaAsJson();
    if (success) {
      this.showToast(`Downloaded schema with ${this.schema.fields.length} field(s)`);
      this.showFallbackJson = false;
    } else {
      this.showFallbackJson = true;
    }
  }

  copyJson(): void {
    navigator.clipboard.writeText(this.jsonPreview).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    });
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    setTimeout(() => (this.toastMessage = ''), 3000);
  }
}
