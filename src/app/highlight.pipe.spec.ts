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
        { provide: DomSanitizer, useValue: sanitizerSpy },
        HighlightPipe
      ]
    });

    sanitizer = TestBed.inject(DomSanitizer) as jasmine.SpyObj<DomSanitizer>;
    pipe = TestBed.inject(HighlightPipe);
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  describe('Text Highlighting with Accessible Yellow Background', () => {
    beforeEach(() => {
      // Mock the sanitizer to return the input as-is for testing
      sanitizer.bypassSecurityTrustHtml.and.callFake((value: any) => value);
    });

    it('should highlight exact matches with accessible yellow background (#ffeb3b)', () => {
      const result = pipe.transform('Angular Component', 'Angular');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
        '<span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">Angular</span> Component'
      );
    });

    it('should highlight case-insensitive matches', () => {
      const result = pipe.transform('TypeScript Guide', 'typescript');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
        '<span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">TypeScript</span> Guide'
      );
    });

    it('should highlight multiple occurrences of the same term', () => {
      const result = pipe.transform('Angular components are Angular features', 'Angular');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
        '<span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">Angular</span> components are <span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">Angular</span> features'
      );
    });

    it('should highlight partial matches within words', () => {
      const result = pipe.transform('JavaScript programming', 'Script');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
        'Java<span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">Script</span> programming'
      );
    });

    it('should handle highlighting in the middle of text', () => {
      const result = pipe.transform('Learn about RxJS operators', 'RxJS');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
        'Learn about <span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">RxJS</span> operators'
      );
    });

    it('should include proper ARIA labels for accessibility', () => {
      pipe.transform('Test content', 'Test');

      const highlightHtml = sanitizer.bypassSecurityTrustHtml.calls.mostRecent().args[0];
      expect(highlightHtml).toContain('aria-label="highlighted match"');
      expect(highlightHtml).toContain('background-color: #ffeb3b');
      expect(highlightHtml).toContain('color: #000');
      expect(highlightHtml).toContain('font-weight: bold');
    });

    it('should maintain accessibility contrast ratios', () => {
      pipe.transform('Accessible text', 'text');

      const highlightHtml = sanitizer.bypassSecurityTrustHtml.calls.mostRecent().args[0];
      // Verify high contrast: yellow background (#ffeb3b) with black text (#000)
      expect(highlightHtml).toContain('background-color: #ffeb3b');
      expect(highlightHtml).toContain('color: #000');
    });
  });

  describe('Edge Cases and Input Validation', () => {
    beforeEach(() => {
      sanitizer.bypassSecurityTrustHtml.and.callFake((value: any) => value);
    });

    it('should return original text when search term is empty', () => {
      const result = pipe.transform('Original text', '');
      expect(result).toBe('Original text');
      expect(sanitizer.bypassSecurityTrustHtml).not.toHaveBeenCalled();
    });

    it('should return original text when search term is null', () => {
      const result = pipe.transform('Original text', null as any);
      expect(result).toBe('Original text');
      expect(sanitizer.bypassSecurityTrustHtml).not.toHaveBeenCalled();
    });

    it('should return original text when search term is undefined', () => {
      const result = pipe.transform('Original text', undefined as any);
      expect(result).toBe('Original text');
      expect(sanitizer.bypassSecurityTrustHtml).not.toHaveBeenCalled();
    });

    it('should handle empty text input', () => {
      const result = pipe.transform('', 'search');
      expect(result).toBe('');
      expect(sanitizer.bypassSecurityTrustHtml).not.toHaveBeenCalled();
    });

    it('should handle null text input', () => {
      const result = pipe.transform(null as any, 'search');
      expect(result).toBeNull();
      expect(sanitizer.bypassSecurityTrustHtml).not.toHaveBeenCalled();
    });

    it('should return original text when no matches are found', () => {
      const result = pipe.transform('No matches here', 'xyz');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('No matches here');
    });
  });

  describe('Special Characters and Regex Escaping', () => {
    beforeEach(() => {
      sanitizer.bypassSecurityTrustHtml.and.callFake((value: any) => value);
    });

    it('should escape regex special characters in search terms', () => {
      const result = pipe.transform('Price: $100.99', '$100');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
        'Price: <span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">$100</span>.99'
      );
    });

    it('should handle parentheses in search terms', () => {
      const result = pipe.transform('Function call()', 'call()');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
        'Function <span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">call()</span>'
      );
    });

    it('should handle square brackets in search terms', () => {
      const result = pipe.transform('Array[0] access', '[0]');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
        'Array<span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">[0]</span> access'
      );
    });

    it('should handle plus and asterisk characters', () => {
      const result = pipe.transform('Math: 2 + 2 * 3', '2 + 2');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
        'Math: <span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">2 + 2</span> * 3'
      );
    });

    it('should handle question marks in search terms', () => {
      const result = pipe.transform('What is this?', 'is this?');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
        'What <span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">is this?</span>'
      );
    });

    it('should handle curly braces in search terms', () => {
      const result = pipe.transform('Object {key: value}', '{key:');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
        'Object <span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">{key:</span> value}'
      );
    });

    it('should handle backslashes in search terms', () => {
      const result = pipe.transform('Path: C:\\Users\\test', 'C:\\Users');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
        'Path: <span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">C:\\Users</span>\\test'
      );
    });

    it('should handle pipe characters in search terms', () => {
      const result = pipe.transform('Command | grep search', '| grep');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
        'Command <span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">| grep</span> search'
      );
    });
  });

  describe('Security and Sanitization', () => {
    it('should call DomSanitizer.bypassSecurityTrustHtml', () => {
      const mockSafeHtml = 'mocked safe html';
      sanitizer.bypassSecurityTrustHtml.and.returnValue(mockSafeHtml);

      const result = pipe.transform('Test text', 'Test');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalled();
      expect(result).toBe(mockSafeHtml);
    });

    it('should sanitize the highlighted HTML output', () => {
      const testText = 'Angular Framework';
      const searchTerm = 'Angular';
      const expectedHtml = '<span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">Angular</span> Framework';

      pipe.transform(testText, searchTerm);

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(expectedHtml);
    });
  });

  describe('Performance and Long Text Handling', () => {
    beforeEach(() => {
      sanitizer.bypassSecurityTrustHtml.and.callFake((value: any) => value);
    });

    it('should handle very long text efficiently', () => {
      const longText = 'Angular '.repeat(1000) + 'is awesome';
      const searchTerm = 'Angular';

      const startTime = performance.now();
      pipe.transform(longText, searchTerm);
      const endTime = performance.now();

      // Should complete within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalled();
    });

    it('should handle many small matches efficiently', () => {
      const text = 'a b a b a b a b a b'.repeat(100);
      const searchTerm = 'a';

      const startTime = performance.now();
      pipe.transform(text, searchTerm);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalled();
    });

    it('should handle unicode and special characters', () => {
      const result = pipe.transform('Café résumé naïve', 'résumé');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
        'Café <span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">résumé</span> naïve'
      );
    });

    it('should handle emoji characters', () => {
      const result = pipe.transform('Angular 🚀 Framework', '🚀');

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
        'Angular <span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">🚀</span> Framework'
      );
    });
  });

  describe('Cross-browser Compatibility', () => {
    beforeEach(() => {
      sanitizer.bypassSecurityTrustHtml.and.callFake((value: any) => value);
    });

    it('should use inline styles for maximum compatibility', () => {
      pipe.transform('Test content', 'Test');

      const highlightHtml = sanitizer.bypassSecurityTrustHtml.calls.mostRecent().args[0];

      // Verify inline styles are used instead of CSS classes only
      expect(highlightHtml).toContain('style="background-color: #ffeb3b; color: #000; font-weight: bold;"');
    });

    it('should include both class and inline styles for progressive enhancement', () => {
      pipe.transform('Test content', 'Test');

      const highlightHtml = sanitizer.bypassSecurityTrustHtml.calls.mostRecent().args[0];

      // Verify both class and inline styles are present
      expect(highlightHtml).toContain('class="highlight"');
      expect(highlightHtml).toContain('style="background-color: #ffeb3b; color: #000; font-weight: bold;"');
    });
  });
});