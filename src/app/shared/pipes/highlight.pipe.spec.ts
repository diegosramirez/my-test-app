import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { HighlightPipe } from './highlight.pipe';

describe('HighlightPipe', () => {
  let pipe: HighlightPipe;
  let sanitizer: jasmine.SpyObj<DomSanitizer>;

  beforeEach(() => {
    const sanitizerSpy = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustHtml']);

    TestBed.configureTestingModule({
      providers: [
        { provide: DomSanitizer, useValue: sanitizerSpy }
      ]
    });

    sanitizer = TestBed.inject(DomSanitizer) as jasmine.SpyObj<DomSanitizer>;
    pipe = new HighlightPipe(sanitizer);

    // Mock the bypassSecurityTrustHtml method to return the input as-is for testing
    sanitizer.bypassSecurityTrustHtml.and.callFake((value: string) => value as any);
  });

  afterEach(() => {
    pipe.clearCache();
  });

  describe('transform method', () => {
    it('should return original text when no search term provided', () => {
      const result = pipe.transform('Hello World', '');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('Hello World');
      expect(result).toBe('Hello World');
    });

    it('should return original text when search term is null', () => {
      const result = pipe.transform('Hello World', null as any);

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('Hello World');
      expect(result).toBe('Hello World');
    });

    it('should return empty string when text is null', () => {
      const result = pipe.transform(null as any, 'search');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('');
      expect(result).toBe('');
    });

    it('should highlight matching text case-insensitively', () => {
      const result = pipe.transform('Hello World', 'world');

      expect(result).toContain('<mark class="search-highlight"');
      expect(result).toContain('World</mark>');
    });

    it('should highlight multiple occurrences', () => {
      const result = pipe.transform('Hello world, world is beautiful', 'world');

      const matches = (result as string).match(/<mark class="search-highlight"/g);
      expect(matches?.length).toBe(2);
    });

    it('should escape HTML in text content', () => {
      const result = pipe.transform('<script>alert("xss")</script>', 'script');

      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&lt;/script&gt;');
      expect(result).toContain('<mark class="search-highlight"');
    });

    it('should escape regex special characters in search term', () => {
      const result = pipe.transform('Price is $100 (USD)', '$100');

      expect(result).toContain('<mark class="search-highlight"');
      expect(result).toContain('$100</mark>');
    });

    it('should handle parentheses in search term', () => {
      const result = pipe.transform('Function call test()', 'test()');

      expect(result).toContain('<mark class="search-highlight"');
      expect(result).toContain('test()</mark>');
    });

    it('should apply correct WCAG compliant styling', () => {
      const result = pipe.transform('Hello World', 'World') as string;

      expect(result).toContain('background-color: #fff3cd');
      expect(result).toContain('color: #856404');
      expect(result).toContain('text-decoration: underline');
      expect(result).toContain('font-weight: 500');
    });

    it('should handle empty search term after trim', () => {
      const result = pipe.transform('Hello World', '   ');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('Hello World');
      expect(result).toBe('Hello World');
    });

    it('should preserve original text structure', () => {
      const result = pipe.transform('Line 1\nLine 2\tTabbed', 'Line');

      expect(result).toContain('<mark class="search-highlight"');
      expect(result).toContain('Line</mark>');
      // Should preserve newlines and tabs in escaped form
      expect(result).toContain('\n');
      expect(result).toContain('\t');
    });
  });

  describe('caching', () => {
    it('should cache results for the same input', () => {
      const text = 'Hello World';
      const searchTerm = 'World';

      // First call
      pipe.transform(text, searchTerm);
      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledTimes(1);

      // Second call with same parameters should use cache
      pipe.transform(text, searchTerm);
      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledTimes(1);
    });

    it('should not cache results for different inputs', () => {
      pipe.transform('Hello World', 'World');
      pipe.transform('Hello World', 'Hello');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledTimes(2);
    });

    it('should limit cache size to 100 entries', () => {
      // Fill cache with 101 entries
      for (let i = 0; i <= 100; i++) {
        pipe.transform(`Text ${i}`, `search ${i}`);
      }

      // The first entry should have been evicted
      // We can't directly test the cache size, but we can test that
      // sanitizer is called again for the first entry
      const initialCallCount = sanitizer.bypassSecurityTrustHtml.calls.count();

      pipe.transform('Text 0', 'search 0');

      // Should call sanitizer again as the entry was evicted
      expect(sanitizer.bypassSecurityTrustHtml.calls.count()).toBeGreaterThan(initialCallCount);
    });

    it('should clear cache when clearCache is called', () => {
      pipe.transform('Hello World', 'World');
      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledTimes(1);

      pipe.clearCache();

      // Should call sanitizer again after cache clear
      pipe.transform('Hello World', 'World');
      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle very long text', () => {
      const longText = 'Lorem ipsum '.repeat(1000) + 'target text';
      const result = pipe.transform(longText, 'target');

      expect(result).toContain('<mark class="search-highlight"');
      expect(result).toContain('target</mark>');
    });

    it('should handle special Unicode characters', () => {
      const result = pipe.transform('café résumé naïve', 'café');

      expect(result).toContain('<mark class="search-highlight"');
      expect(result).toContain('café</mark>');
    });

    it('should handle numbers and symbols', () => {
      const result = pipe.transform('Version 1.2.3-beta', '1.2.3');

      expect(result).toContain('<mark class="search-highlight"');
      expect(result).toContain('1.2.3</mark>');
    });

    it('should handle whitespace in search terms', () => {
      const result = pipe.transform('Hello world test', 'world test');

      expect(result).toContain('<mark class="search-highlight"');
      expect(result).toContain('world test</mark>');
    });
  });
});