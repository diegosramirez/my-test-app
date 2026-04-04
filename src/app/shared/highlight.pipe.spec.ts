import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { HighlightPipe } from './highlight.pipe';

describe('HighlightPipe', () => {
  let pipe: HighlightPipe;
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HighlightPipe]
    });

    sanitizer = TestBed.inject(DomSanitizer);
    pipe = new HighlightPipe(sanitizer);
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('Basic Highlighting', () => {
    it('should highlight matching text case-insensitively', () => {
      const result = pipe.transform('Hello World', 'world');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toContain('<mark class="search-highlight">World</mark>');
      expect(htmlString).toContain('Hello');
    });

    it('should highlight multiple matches', () => {
      const result = pipe.transform('test test test', 'test');
      const htmlString = sanitizer.sanitize(2, result) || '';

      // Should contain 3 highlighted instances
      const matches = htmlString.match(/<mark class="search-highlight">test<\/mark>/g);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBe(3);
    });

    it('should highlight partial matches', () => {
      const result = pipe.transform('testing', 'test');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toBe('<mark class="search-highlight">test</mark>ing');
    });

    it('should preserve original case in highlights', () => {
      const result = pipe.transform('Hello WORLD', 'world');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toContain('<mark class="search-highlight">WORLD</mark>');
    });
  });

  describe('Edge Cases', () => {
    it('should return original text when search term is empty', () => {
      const result = pipe.transform('Hello World', '');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toBe('Hello World');
    });

    it('should return original text when search term is only whitespace', () => {
      const result = pipe.transform('Hello World', '   ');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toBe('Hello World');
    });

    it('should return empty string when text is empty', () => {
      const result = pipe.transform('', 'search');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toBe('');
    });

    it('should handle null or undefined text gracefully', () => {
      expect(() => {
        pipe.transform(null as any, 'search');
        pipe.transform(undefined as any, 'search');
      }).not.toThrow();
    });

    it('should handle null or undefined search term gracefully', () => {
      const result1 = pipe.transform('Hello World', null as any);
      const result2 = pipe.transform('Hello World', undefined as any);

      const htmlString1 = sanitizer.sanitize(2, result1) || '';
      const htmlString2 = sanitizer.sanitize(2, result2) || '';

      expect(htmlString1).toBe('Hello World');
      expect(htmlString2).toBe('Hello World');
    });
  });

  describe('HTML Escaping and Security', () => {
    it('should escape HTML characters in original text', () => {
      const result = pipe.transform('<script>alert("xss")</script>', 'script');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toContain('&lt;');
      expect(htmlString).toContain('&gt;');
      expect(htmlString).not.toContain('<script>');
    });

    it('should escape HTML characters in search term', () => {
      const result = pipe.transform('Hello <world>', '<world>');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toContain('<mark class="search-highlight">&lt;world&gt;</mark>');
    });

    it('should handle special characters in text', () => {
      const text = 'Price: $19.99 & free shipping!';
      const result = pipe.transform(text, '$19.99');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toContain('<mark class="search-highlight">$19.99</mark>');
      expect(htmlString).toContain('&amp; free');
    });

    it('should handle quotes and apostrophes', () => {
      const text = `It's a "great" product`;
      const result = pipe.transform(text, 'great');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toContain('<mark class="search-highlight">great</mark>');
    });
  });

  describe('Regex Special Characters', () => {
    it('should escape regex special characters in search term', () => {
      const result = pipe.transform('Price $19.99', '$19.99');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toContain('<mark class="search-highlight">$19.99</mark>');
    });

    it('should handle parentheses in search term', () => {
      const result = pipe.transform('Function call()', 'call()');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toContain('<mark class="search-highlight">call()</mark>');
    });

    it('should handle square brackets', () => {
      const result = pipe.transform('Array[0]', '[0]');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toContain('<mark class="search-highlight">[0]</mark>');
    });

    it('should handle asterisks and plus signs', () => {
      const result = pipe.transform('2 * 3 + 1', '* 3 +');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toContain('<mark class="search-highlight">* 3 +</mark>');
    });

    it('should handle question marks and periods', () => {
      const result = pipe.transform('Is it working? Yes.', '? Yes.');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toContain('<mark class="search-highlight">? Yes.</mark>');
    });

    it('should handle backslashes and pipes', () => {
      const result = pipe.transform('Path\\to\\file | command', '\\to\\');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toContain('<mark class="search-highlight">\\to\\</mark>');
    });

    it('should handle caret and curly braces', () => {
      const result = pipe.transform('Pattern ^{test}', '^{test}');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toContain('<mark class="search-highlight">^{test}</mark>');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle overlapping potential matches correctly', () => {
      const result = pipe.transform('ababab', 'abab');
      const htmlString = sanitizer.sanitize(2, result) || '';

      // Should highlight the first occurrence
      expect(htmlString).toBe('<mark class="search-highlight">abab</mark>ab');
    });

    it('should handle search terms with whitespace', () => {
      const result = pipe.transform('Hello beautiful world', 'beautiful world');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toBe('Hello <mark class="search-highlight">beautiful world</mark>');
    });

    it('should handle unicode characters', () => {
      const result = pipe.transform('Café naïve résumé', 'naïve');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toContain('<mark class="search-highlight">naïve</mark>');
    });

    it('should handle emojis', () => {
      const result = pipe.transform('Hello 👋 world', '👋');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toContain('<mark class="search-highlight">👋</mark>');
    });

    it('should handle very long strings', () => {
      const longText = 'Lorem ipsum '.repeat(100) + 'important' + ' dolor sit amet'.repeat(100);
      const result = pipe.transform(longText, 'important');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).toContain('<mark class="search-highlight">important</mark>');
      expect(htmlString.length).toBeGreaterThan(longText.length); // Should have added highlight markup
    });
  });

  describe('Performance and Security', () => {
    it('should sanitize output as SafeHtml', () => {
      const result = pipe.transform('test', 'test');

      // The result should be a SafeHtml object (tested by checking it can be sanitized)
      expect(() => sanitizer.sanitize(2, result)).not.toThrow();
    });

    it('should not allow script injection through search term', () => {
      const maliciousSearchTerm = '<script>alert("xss")</script>';
      const result = pipe.transform('Hello world', maliciousSearchTerm);
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).not.toContain('<script>');
      expect(htmlString).toBe('Hello world'); // No match, so no highlighting
    });

    it('should not allow script injection through text', () => {
      const maliciousText = '<img src="x" onerror="alert(\'xss\')">';
      const result = pipe.transform(maliciousText, 'img');
      const htmlString = sanitizer.sanitize(2, result) || '';

      expect(htmlString).not.toContain('onerror');
      expect(htmlString).toContain('&lt;');
      expect(htmlString).toContain('<mark class="search-highlight">img</mark>');
    });

    it('should handle extremely large search terms', () => {
      const hugeSearchTerm = 'x'.repeat(10000);

      expect(() => {
        pipe.transform('test x test', hugeSearchTerm);
      }).not.toThrow();
    });
  });

  describe('Private Methods', () => {
    it('should escape HTML entities correctly', () => {
      const escapeHtml = (pipe as any).escapeHtml.bind(pipe);

      expect(escapeHtml('<div>test</div>')).toBe('&lt;div&gt;test&lt;/div&gt;');
      expect(escapeHtml('AT&T')).toBe('AT&amp;T');
      expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
    });

    it('should escape regex characters correctly', () => {
      const escapeRegex = (pipe as any).escapeRegex.bind(pipe);

      expect(escapeRegex('$19.99')).toBe('\\$19\\.99');
      expect(escapeRegex('(test)')).toBe('\\(test\\)');
      expect(escapeRegex('[0-9]+')).toBe('\\[0\\-9\\]\\+');
      expect(escapeRegex('a*b?c^d{2}')).toBe('a\\*b\\?c\\^d\\{2\\}');
    });
  });
});