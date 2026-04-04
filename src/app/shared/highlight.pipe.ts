import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlight',
  standalone: true
})
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string, searchTerm: string): SafeHtml {
    if (!text || !searchTerm || searchTerm.trim().length === 0) {
      return this.sanitizer.sanitize(2, text) || '';
    }

    // Escape HTML entities in the original text
    const escapedText = this.escapeHtml(text);

    // Escape special regex characters in search term
    const escapedSearchTerm = this.escapeRegex(searchTerm.trim());

    // Create regex for case-insensitive matching
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');

    // Replace matches with highlighted version
    const highlightedText = escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');

    return this.sanitizer.bypassSecurityTrustHtml(highlightedText);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}