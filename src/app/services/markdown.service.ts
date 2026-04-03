import { Injectable } from '@angular/core';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export interface MarkdownParseResult {
  html: string;
  parseTime: number;
  error?: string;
}

export interface MarkdownParseError {
  message: string;
  line?: number;
  type: 'parse' | 'sanitization' | 'unknown';
}

@Injectable({
  providedIn: 'root'
})
export class MarkdownService {

  constructor() {
    this.configureMarked();
  }

  private configureMarked(): void {
    // Configure marked with security-focused options
    marked.setOptions({
      gfm: true, // GitHub Flavored Markdown
      breaks: true // Enable line breaks
    });
  }

  async parseMarkdown(content: string): Promise<MarkdownParseResult> {
    const startTime = performance.now();

    try {
      if (!content || content.trim() === '') {
        return {
          html: '',
          parseTime: performance.now() - startTime
        };
      }

      // Parse markdown to HTML
      const rawHtml = await marked.parse(content);

      // Sanitize HTML to prevent XSS
      const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'strong', 'em', 'u', 's', 'del',
          'blockquote', 'pre', 'code', 'ul', 'ol', 'li',
          'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
          'hr', 'div', 'span'
        ],
        ALLOWED_ATTR: [
          'href', 'src', 'alt', 'title', 'class', 'id',
          'target', 'rel', 'style'
        ],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
      });

      return {
        html: sanitizedHtml,
        parseTime: performance.now() - startTime
      };

    } catch (error) {
      const parseTime = performance.now() - startTime;

      return {
        html: this.createErrorHtml(content, error),
        parseTime,
        error: error instanceof Error ? error.message : 'Unknown parsing error'
      };
    }
  }

  private createErrorHtml(content: string, error: unknown): string {
    // Try to parse as much as possible, showing partial content
    try {
      const lines = content.split('\n');
      const safeLines = lines.map(line => {
        try {
          const parsed = marked.parse(line) as string; // marked.parse returns string synchronously for simple content
          return DOMPurify.sanitize(parsed);
        } catch {
          // If line fails, show as plain text
          return `<p class="markdown-error-line">${this.escapeHtml(line)}</p>`;
        }
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `
        ${safeLines.join('')}
        <div class="markdown-error-indicator">
          <p><strong>⚠️ Markdown Parsing Error:</strong> ${this.escapeHtml(errorMessage)}</p>
        </div>
      `;
    } catch {
      // Fallback: show original content as escaped text
      return `
        <pre class="markdown-fallback">${this.escapeHtml(content)}</pre>
        <div class="markdown-error-indicator">
          <p><strong>⚠️ Unable to parse markdown content</strong></p>
        </div>
      `;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  validateMarkdown(content: string): MarkdownParseError | null {
    try {
      marked.parse(content) as string; // Type assertion for synchronous validation
      return null;
    } catch (error) {
      return {
        message: error instanceof Error ? error.message : 'Unknown validation error',
        type: 'parse'
      };
    }
  }
}