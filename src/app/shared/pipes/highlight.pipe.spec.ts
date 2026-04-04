import { HighlightPipe } from './highlight.pipe';

describe('HighlightPipe', () => {
  let pipe: HighlightPipe;

  beforeEach(() => {
    pipe = new HighlightPipe();
  });

  it('should create the pipe', () => {
    expect(pipe).toBeTruthy();
  });

  describe('basic highlighting functionality', () => {
    it('should highlight matching text with default class', () => {
      const text = 'Hello World';
      const query = 'World';
      const result = pipe.transform(text, query);

      expect(result).toBe('Hello <mark class="highlight" aria-label="highlighted text">World</mark>');
    });

    it('should highlight matching text with custom class', () => {
      const text = 'Hello World';
      const query = 'World';
      const customClass = 'custom-highlight';
      const result = pipe.transform(text, query, customClass);

      expect(result).toBe('Hello <mark class="custom-highlight" aria-label="highlighted text">World</mark>');
    });

    it('should return original text when query is empty', () => {
      const text = 'Hello World';
      const result = pipe.transform(text, '');

      expect(result).toBe('Hello World');
    });

    it('should return original text when text is empty', () => {
      const text = '';
      const query = 'test';
      const result = pipe.transform(text, query);

      expect(result).toBe('');
    });

    it('should handle null or undefined text', () => {
      expect(pipe.transform(null as any, 'test')).toBe(null);
      expect(pipe.transform(undefined as any, 'test')).toBe(undefined);
    });

    it('should handle null or undefined query', () => {
      const text = 'Hello World';
      expect(pipe.transform(text, null as any)).toBe('Hello World');
      expect(pipe.transform(text, undefined as any)).toBe('Hello World');
    });
  });

  describe('case sensitivity', () => {
    it('should be case insensitive by default', () => {
      const text = 'Hello World';
      const query = 'world';
      const result = pipe.transform(text, query);

      expect(result).toBe('Hello <mark class="highlight" aria-label="highlighted text">World</mark>');
    });

    it('should be case insensitive for mixed case query', () => {
      const text = 'Hello World';
      const query = 'WoRlD';
      const result = pipe.transform(text, query);

      expect(result).toBe('Hello <mark class="highlight" aria-label="highlighted text">World</mark>');
    });

    it('should be case sensitive when specified', () => {
      const text = 'Hello World';
      const query = 'world';
      const result = pipe.transform(text, query, 'highlight', true);

      expect(result).toBe('Hello World'); // Should not match due to case sensitivity
    });

    it('should match case sensitive query correctly', () => {
      const text = 'Hello World';
      const query = 'World';
      const result = pipe.transform(text, query, 'highlight', true);

      expect(result).toBe('Hello <mark class="highlight" aria-label="highlighted text">World</mark>');
    });
  });

  describe('multiple matches', () => {
    it('should highlight all occurrences of the query', () => {
      const text = 'test this test string test';
      const query = 'test';
      const result = pipe.transform(text, query);

      const expectedResult = '<mark class="highlight" aria-label="highlighted text">test</mark> this <mark class="highlight" aria-label="highlighted text">test</mark> string <mark class="highlight" aria-label="highlighted text">test</mark>';
      expect(result).toBe(expectedResult);
    });

    it('should handle overlapping matches correctly', () => {
      const text = 'aaaa';
      const query = 'aa';
      const result = pipe.transform(text, query);

      // Should highlight all non-overlapping occurrences
      expect(result).toContain('mark');
    });
  });

  describe('special character handling', () => {
    it('should escape regular expression special characters', () => {
      const text = 'Price: $100.50 (discount)';
      const query = '$100.50';
      const result = pipe.transform(text, query);

      expect(result).toBe('Price: <mark class="highlight" aria-label="highlighted text">$100.50</mark> (discount)');
    });

    it('should handle parentheses in query', () => {
      const text = 'Price: $100.50 (discount)';
      const query = '(discount)';
      const result = pipe.transform(text, query);

      expect(result).toBe('Price: $100.50 <mark class="highlight" aria-label="highlighted text">(discount)</mark>');
    });

    it('should handle square brackets in query', () => {
      const text = 'Array [1, 2, 3] example';
      const query = '[1, 2, 3]';
      const result = pipe.transform(text, query);

      expect(result).toBe('Array <mark class="highlight" aria-label="highlighted text">[1, 2, 3]</mark> example');
    });

    it('should handle plus and asterisk characters', () => {
      const text = 'Formula: a + b * c';
      const query = '+ b *';
      const result = pipe.transform(text, query);

      expect(result).toBe('Formula: a <mark class="highlight" aria-label="highlighted text">+ b *</mark> c');
    });

    it('should handle backslash characters', () => {
      const text = 'Path: C:\\Users\\test';
      const query = 'C:\\Users';
      const result = pipe.transform(text, query);

      expect(result).toBe('Path: <mark class="highlight" aria-label="highlighted text">C:\\Users</mark>\\test');
    });

    it('should handle caret and dollar characters', () => {
      const text = 'Regex: ^start$end';
      const query = '^start$';
      const result = pipe.transform(text, query);

      expect(result).toBe('Regex: <mark class="highlight" aria-label="highlighted text">^start$</mark>end');
    });

    it('should handle curly braces', () => {
      const text = 'Object: {key: value}';
      const query = '{key: value}';
      const result = pipe.transform(text, query);

      expect(result).toBe('Object: <mark class="highlight" aria-label="highlighted text">{key: value}</mark>');
    });

    it('should handle pipe character', () => {
      const text = 'Options: A | B | C';
      const query = 'A | B';
      const result = pipe.transform(text, query);

      expect(result).toBe('Options: <mark class="highlight" aria-label="highlighted text">A | B</mark> | C');
    });
  });

  describe('accessibility compliance', () => {
    it('should include aria-label attribute for screen readers', () => {
      const text = 'Hello World';
      const query = 'World';
      const result = pipe.transform(text, query);

      expect(result).toContain('aria-label="highlighted text"');
    });

    it('should use semantic mark element for highlighting', () => {
      const text = 'Hello World';
      const query = 'World';
      const result = pipe.transform(text, query);

      expect(result).toContain('<mark');
      expect(result).toContain('</mark>');
    });

    it('should maintain accessibility attributes with custom class', () => {
      const text = 'Hello World';
      const query = 'World';
      const customClass = 'custom-highlight';
      const result = pipe.transform(text, query, customClass);

      expect(result).toContain(`class="${customClass}"`);
      expect(result).toContain('aria-label="highlighted text"');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty string text', () => {
      const result = pipe.transform('', 'query');
      expect(result).toBe('');
    });

    it('should handle whitespace-only text', () => {
      const text = '   ';
      const query = ' ';
      const result = pipe.transform(text, query);

      expect(result).toContain('<mark');
    });

    it('should handle very long strings', () => {
      const longText = 'a'.repeat(10000) + 'test' + 'b'.repeat(10000);
      const query = 'test';
      const result = pipe.transform(longText, query);

      expect(result).toContain('<mark class="highlight" aria-label="highlighted text">test</mark>');
      expect(result.length).toBeGreaterThan(longText.length);
    });

    it('should handle unicode characters', () => {
      const text = 'Hello 世界 🌍';
      const query = '世界';
      const result = pipe.transform(text, query);

      expect(result).toBe('Hello <mark class="highlight" aria-label="highlighted text">世界</mark> 🌍');
    });

    it('should handle emoji in text and query', () => {
      const text = 'Hello 🌍 World';
      const query = '🌍';
      const result = pipe.transform(text, query);

      expect(result).toBe('Hello <mark class="highlight" aria-label="highlighted text">🌍</mark> World');
    });

    it('should preserve original text when no matches found', () => {
      const text = 'Hello World';
      const query = 'xyz';
      const result = pipe.transform(text, query);

      expect(result).toBe('Hello World');
    });

    it('should handle single character queries', () => {
      const text = 'abcdef';
      const query = 'c';
      const result = pipe.transform(text, query);

      expect(result).toBe('ab<mark class="highlight" aria-label="highlighted text">c</mark>def');
    });
  });

  describe('HTML safety', () => {
    it('should not double-escape already highlighted content', () => {
      const text = 'Hello <mark>World</mark>';
      const query = 'Hello';
      const result = pipe.transform(text, query);

      // Should highlight "Hello" without breaking existing mark tags
      expect(result).toBe('<mark class="highlight" aria-label="highlighted text">Hello</mark> <mark>World</mark>');
    });

    it('should handle text with HTML entities', () => {
      const text = 'Price &lt; $100 &amp; available';
      const query = '&lt;';
      const result = pipe.transform(text, query);

      expect(result).toBe('Price <mark class="highlight" aria-label="highlighted text">&lt;</mark> $100 &amp; available');
    });
  });

  describe('performance considerations', () => {
    it('should handle multiple rapid transformations efficiently', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const queries = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog'];

      const startTime = performance.now();

      queries.forEach(query => {
        pipe.transform(text, query);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete all transformations within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(50); // 50ms for 8 transformations
    });
  });
});