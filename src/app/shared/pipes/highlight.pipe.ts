import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlight',
  standalone: true,
  pure: true
})
export class HighlightPipe implements PipeTransform {
  private highlightCache = new Map<string, SafeHtml>();

  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string, searchTerm: string): SafeHtml {
    if (!text || !searchTerm) {
      return this.sanitizer.bypassSecurityTrustHtml(text || '');
    }

    const cacheKey = `${text}|${searchTerm}`;
    if (this.highlightCache.has(cacheKey)) {
      return this.highlightCache.get(cacheKey)!;
    }

    const escapedText = this.escapeHtml(text);
    const escapedTerm = this.escapeRegex(searchTerm.trim());

    if (!escapedTerm) {
      const result = this.sanitizer.bypassSecurityTrustHtml(escapedText);
      this.highlightCache.set(cacheKey, result);
      return result;
    }

    // Case-insensitive highlighting with word boundary support
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    const highlightedText = escapedText.replace(regex,
      '<mark class="search-highlight" style="background-color: #fff3cd; color: #856404; text-decoration: underline; font-weight: 500;">$1</mark>'
    );

    const result = this.sanitizer.bypassSecurityTrustHtml(highlightedText);

    // Cache management - limit to 100 entries
    if (this.highlightCache.size > 100) {
      const firstKey = this.highlightCache.keys().next().value;
      this.highlightCache.delete(firstKey);
    }

    this.highlightCache.set(cacheKey, result);
    return result;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  clearCache(): void {
    this.highlightCache.clear();
  }
}