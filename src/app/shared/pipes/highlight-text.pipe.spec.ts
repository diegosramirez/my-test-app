import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { HighlightTextPipe } from './highlight-text.pipe';

describe('HighlightTextPipe', () => {
  let pipe: HighlightTextPipe;
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HighlightTextPipe]
    });
    sanitizer = TestBed.inject(DomSanitizer);
    pipe = new HighlightTextPipe(sanitizer);
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should highlight matching text', () => {
    const text = 'Angular TypeScript Component';
    const searchTerm = 'Type';
    const result = pipe.transform(text, searchTerm);

    // Convert SafeHtml to string for assertion
    const htmlString = (result as any).changingThisBreaksApplicationSecurity;
    expect(htmlString).toContain('<strong');
    expect(htmlString).toContain('Type');
    expect(htmlString).toContain('background-color: #1a1a1a');
  });

  it('should handle case insensitive matching', () => {
    const text = 'Angular Development';
    const searchTerm = 'angular';
    const result = pipe.transform(text, searchTerm);

    const htmlString = (result as any).changingThisBreaksApplicationSecurity;
    expect(htmlString).toContain('<strong');
    expect(htmlString).toContain('Angular');
  });

  it('should escape HTML to prevent XSS', () => {
    const text = '<script>alert("xss")</script>';
    const searchTerm = 'script';
    const result = pipe.transform(text, searchTerm);

    const htmlString = (result as any).changingThisBreaksApplicationSecurity;
    expect(htmlString).toContain('&lt;script&gt;');
    expect(htmlString).not.toContain('<script>alert');
  });

  it('should handle empty search term', () => {
    const text = 'Some text';
    const searchTerm = '';
    const result = pipe.transform(text, searchTerm);

    const htmlString = (result as any).changingThisBreaksApplicationSecurity;
    expect(htmlString).toBe('Some text');
    expect(htmlString).not.toContain('<strong');
  });

  it('should handle special regex characters in search term', () => {
    const text = 'Price: $19.99 (20% off)';
    const searchTerm = '$19.99';
    const result = pipe.transform(text, searchTerm);

    const htmlString = (result as any).changingThisBreaksApplicationSecurity;
    expect(htmlString).toContain('<strong');
    expect(htmlString).toContain('$19.99');
  });

  it('should return original text when no match found', () => {
    const text = 'Angular Development';
    const searchTerm = 'Vue';
    const result = pipe.transform(text, searchTerm);

    const htmlString = (result as any).changingThisBreaksApplicationSecurity;
    expect(htmlString).toBe('Angular Development');
    expect(htmlString).not.toContain('<strong');
  });
}