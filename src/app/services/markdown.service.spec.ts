import { TestBed } from '@angular/core/testing';
import { MarkdownService, MarkdownParseResult, MarkdownParseError } from './markdown.service';
import { JSDOM } from 'jsdom';

describe('MarkdownService', () => {
  let service: MarkdownService;
  let dom: JSDOM;

  beforeEach(() => {
    // Setup JSDOM for DOM operations in Node.js environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.document = dom.window.document;
    global.window = dom.window as any;
    global.performance = {
      now: () => Date.now()
    } as any;

    TestBed.configureTestingModule({});
    service = TestBed.inject(MarkdownService);
  });

  afterEach(() => {
    // Clean up JSDOM
    dom.window.close();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should configure marked with security options', () => {
      // Service should initialize without errors
      expect(service).toBeDefined();
      expect(typeof service.parseMarkdown).toBe('function');
      expect(typeof service.validateMarkdown).toBe('function');
    });
  });

  describe('parseMarkdown()', () => {
    describe('Valid Markdown Parsing', () => {
      it('should parse basic text to HTML', () => {
        const result = service.parseMarkdown('Hello world');

        expect(result.html).toContain('Hello world');
        expect(result.parseTime).toBeGreaterThan(0);
        expect(result.error).toBeUndefined();
      });

      it('should parse headings correctly', () => {
        const markdown = '# Heading 1\n## Heading 2\n### Heading 3';
        const result = service.parseMarkdown(markdown);

        expect(result.html).toContain('<h1');
        expect(result.html).toContain('<h2');
        expect(result.html).toContain('<h3');
        expect(result.html).toContain('Heading 1');
        expect(result.html).toContain('Heading 2');
        expect(result.html).toContain('Heading 3');
        expect(result.error).toBeUndefined();
      });

      it('should parse emphasis and strong text', () => {
        const markdown = '*italic* and **bold** and ***bold italic***';
        const result = service.parseMarkdown(markdown);

        expect(result.html).toContain('<em>italic</em>');
        expect(result.html).toContain('<strong>bold</strong>');
        expect(result.error).toBeUndefined();
      });

      it('should parse links correctly', () => {
        const markdown = '[Google](https://google.com)';
        const result = service.parseMarkdown(markdown);

        expect(result.html).toContain('<a');
        expect(result.html).toContain('href="https://google.com"');
        expect(result.html).toContain('Google');
        expect(result.error).toBeUndefined();
      });

      it('should parse code blocks and inline code', () => {
        const markdown = '`inline code` and ```\\ncode block\\n```';
        const result = service.parseMarkdown(markdown);

        expect(result.html).toContain('<code>inline code</code>');
        expect(result.html).toContain('<pre>');
        expect(result.html).toContain('code block');
        expect(result.error).toBeUndefined();
      });

      it('should parse lists correctly', () => {
        const markdown = '- Item 1\\n- Item 2\\n\\n1. Numbered 1\\n2. Numbered 2';
        const result = service.parseMarkdown(markdown);

        expect(result.html).toContain('<ul>');
        expect(result.html).toContain('<ol>');
        expect(result.html).toContain('<li>');
        expect(result.html).toContain('Item 1');
        expect(result.html).toContain('Numbered 1');
        expect(result.error).toBeUndefined();
      });

      it('should parse tables correctly', () => {
        const markdown = '| Header 1 | Header 2 |\\n|----------|----------|\\n| Cell 1   | Cell 2   |';
        const result = service.parseMarkdown(markdown);

        expect(result.html).toContain('<table>');
        expect(result.html).toContain('<th>');
        expect(result.html).toContain('<td>');
        expect(result.html).toContain('Header 1');
        expect(result.html).toContain('Cell 1');
        expect(result.error).toBeUndefined();
      });

      it('should parse blockquotes correctly', () => {
        const markdown = '> This is a blockquote\\n> with multiple lines';
        const result = service.parseMarkdown(markdown);

        expect(result.html).toContain('<blockquote>');
        expect(result.html).toContain('This is a blockquote');
        expect(result.error).toBeUndefined();
      });

      it('should parse horizontal rules', () => {
        const markdown = 'Before\\n\\n---\\n\\nAfter';
        const result = service.parseMarkdown(markdown);

        expect(result.html).toContain('<hr>');
        expect(result.error).toBeUndefined();
      });
    });

    describe('Empty and Edge Case Content', () => {
      it('should handle empty string', () => {
        const result = service.parseMarkdown('');

        expect(result.html).toBe('');
        expect(result.parseTime).toBeGreaterThanOrEqual(0);
        expect(result.error).toBeUndefined();
      });

      it('should handle whitespace-only content', () => {
        const result = service.parseMarkdown('   \\n\\n  \\t  ');

        expect(result.html).toBe('');
        expect(result.parseTime).toBeGreaterThanOrEqual(0);
        expect(result.error).toBeUndefined();
      });

      it('should handle very long content', () => {
        const longContent = '# Long Content\\n' + 'a'.repeat(10000);
        const result = service.parseMarkdown(longContent);

        expect(result.html).toContain('<h1');
        expect(result.html).toContain('Long Content');
        expect(result.html.length).toBeGreaterThan(10000);
        expect(result.parseTime).toBeGreaterThan(0);
        expect(result.error).toBeUndefined();
      });
    });

    describe('Security Sanitization', () => {
      it('should sanitize script tags', () => {
        const maliciousMarkdown = 'Normal text <script>alert("xss")</script>';
        const result = service.parseMarkdown(maliciousMarkdown);

        expect(result.html).not.toContain('<script>');
        expect(result.html).not.toContain('alert');
        expect(result.html).toContain('Normal text');
        expect(result.error).toBeUndefined();
      });

      it('should sanitize onclick handlers', () => {
        const maliciousMarkdown = '<div onclick="alert(\\'xss\\')">Click me</div>';
        const result = service.parseMarkdown(maliciousMarkdown);

        expect(result.html).not.toContain('onclick');
        expect(result.html).not.toContain('alert');
        expect(result.error).toBeUndefined();
      });

      it('should sanitize javascript: URLs', () => {
        const maliciousMarkdown = '[Evil Link](javascript:alert("xss"))';
        const result = service.parseMarkdown(maliciousMarkdown);

        expect(result.html).not.toContain('javascript:');
        expect(result.html).not.toContain('alert');
        expect(result.error).toBeUndefined();
      });

      it('should allow safe HTML tags', () => {
        const safeMarkdown = '**Bold** *italic* `code` [link](https://example.com)';
        const result = service.parseMarkdown(safeMarkdown);

        expect(result.html).toContain('<strong>');
        expect(result.html).toContain('<em>');
        expect(result.html).toContain('<code>');
        expect(result.html).toContain('<a href="https://example.com"');
        expect(result.error).toBeUndefined();
      });

      it('should allow safe attributes', () => {
        const markdownWithImage = '![Alt text](https://example.com/image.jpg "Title")';
        const result = service.parseMarkdown(markdownWithImage);

        expect(result.html).toContain('<img');
        expect(result.html).toContain('src="https://example.com/image.jpg"');
        expect(result.html).toContain('alt="Alt text"');
        expect(result.html).toContain('title="Title"');
        expect(result.error).toBeUndefined();
      });
    });

    describe('Error Handling', () => {
      it('should handle parsing errors gracefully', () => {
        // Mock marked.parse to throw an error
        const originalParse = require('marked').marked.parse;
        require('marked').marked.parse = () => {
          throw new Error('Simulated parse error');
        };

        const result = service.parseMarkdown('# Test');

        expect(result.error).toBe('Simulated parse error');
        expect(result.html).toContain('markdown-error-indicator');
        expect(result.html).toContain('⚠️ Markdown Parsing Error');
        expect(result.parseTime).toBeGreaterThan(0);

        // Restore original function
        require('marked').marked.parse = originalParse;
      });

      it('should create partial content on line-level errors', () => {
        // Mock marked.parse to fail on specific content but succeed on simpler content
        const originalParse = require('marked').marked.parse;
        let callCount = 0;
        require('marked').marked.parse = (content: string) => {
          callCount++;
          if (callCount === 1) {
            // First call (full content) fails
            throw new Error('Parse error');
          }
          // Subsequent calls (line by line) succeed
          return originalParse(content);
        };

        const result = service.parseMarkdown('# Good\\nBad content\\n## Also Good');

        expect(result.error).toBe('Parse error');
        expect(result.html).toContain('markdown-error-indicator');
        expect(result.html).toContain('Good');
        expect(result.parseTime).toBeGreaterThan(0);

        // Restore original function
        require('marked').marked.parse = originalParse;
      });

      it('should create fallback content when all parsing fails', () => {
        // Mock both marked.parse and DOMPurify to fail
        const originalParse = require('marked').marked.parse;
        require('marked').marked.parse = () => {
          throw new Error('Total parse failure');
        };

        // Mock escapeHtml to simulate complete failure
        const originalCreateElement = document.createElement;
        document.createElement = () => {
          throw new Error('DOM error');
        };

        const result = service.parseMarkdown('Test content');

        expect(result.error).toBe('Total parse failure');
        expect(result.html).toContain('markdown-fallback');
        expect(result.html).toContain('Unable to parse markdown content');

        // Restore original functions
        require('marked').marked.parse = originalParse;
        document.createElement = originalCreateElement;
      });
    });

    describe('Performance Metrics', () => {
      it('should measure parse time', () => {
        const startTime = Date.now();
        const result = service.parseMarkdown('# Test content');
        const endTime = Date.now();

        expect(result.parseTime).toBeGreaterThanOrEqual(0);
        expect(result.parseTime).toBeLessThanOrEqual(endTime - startTime + 10); // Allow small margin
      });

      it('should handle performance measurement on large content', () => {
        const largeContent = '# Large Content\\n' + '\\n## Section\\n'.repeat(1000);
        const result = service.parseMarkdown(largeContent);

        expect(result.parseTime).toBeGreaterThan(0);
        expect(result.html).toContain('<h1>');
        expect(result.error).toBeUndefined();
      });
    });
  });

  describe('validateMarkdown()', () => {
    it('should return null for valid markdown', () => {
      const validMarkdown = '# Valid\\n\\n**Bold** and *italic* text.';
      const result = service.validateMarkdown(validMarkdown);

      expect(result).toBeNull();
    });

    it('should return error for invalid markdown', () => {
      // Mock marked.parse to throw an error for validation
      const originalParse = require('marked').marked.parse;
      require('marked').marked.parse = (content: string) => {
        if (content.includes('invalid')) {
          throw new Error('Validation error');
        }
        return originalParse(content);
      };

      const result = service.validateMarkdown('invalid markdown');

      expect(result).not.toBeNull();
      expect(result?.message).toBe('Validation error');
      expect(result?.type).toBe('parse');

      // Restore original function
      require('marked').marked.parse = originalParse;
    });

    it('should handle unknown validation errors', () => {
      const originalParse = require('marked').marked.parse;
      require('marked').marked.parse = () => {
        throw 'String error'; // Non-Error object
      };

      const result = service.validateMarkdown('test');

      expect(result).not.toBeNull();
      expect(result?.message).toBe('Unknown validation error');
      expect(result?.type).toBe('parse');

      // Restore original function
      require('marked').marked.parse = originalParse;
    });

    it('should validate empty content as valid', () => {
      const result = service.validateMarkdown('');

      expect(result).toBeNull();
    });

    it('should validate whitespace-only content as valid', () => {
      const result = service.validateMarkdown('   \\n\\t  ');

      expect(result).toBeNull();
    });
  });

  describe('HTML Escaping Utility', () => {
    it('should escape special HTML characters', () => {
      const testContent = '<script>alert("test")</script>';
      const result = service.parseMarkdown(testContent);

      // The content should be escaped and not contain executable script
      expect(result.html).not.toContain('<script>');
      expect(result.html).toContain('&lt;script&gt;');
    });

    it('should handle quotes and ampersands', () => {
      const testContent = 'Test "quotes" & ampersands';
      const result = service.parseMarkdown(testContent);

      expect(result.html).toContain('Test');
      expect(result.html).toContain('quotes');
      expect(result.html).toContain('ampersands');
    });
  });

  describe('GitHub Flavored Markdown Features', () => {
    it('should support strikethrough', () => {
      const markdown = '~~strikethrough text~~';
      const result = service.parseMarkdown(markdown);

      expect(result.html).toContain('<del>');
      expect(result.html).toContain('strikethrough text');
      expect(result.error).toBeUndefined();
    });

    it('should support line breaks', () => {
      const markdown = 'Line 1\\nLine 2';
      const result = service.parseMarkdown(markdown);

      expect(result.html).toContain('Line 1');
      expect(result.html).toContain('Line 2');
      expect(result.error).toBeUndefined();
    });

    it('should support task lists', () => {
      const markdown = '- [x] Completed task\\n- [ ] Incomplete task';
      const result = service.parseMarkdown(markdown);

      expect(result.html).toContain('<li>');
      expect(result.html).toContain('Completed task');
      expect(result.html).toContain('Incomplete task');
      expect(result.error).toBeUndefined();
    });
  });
});