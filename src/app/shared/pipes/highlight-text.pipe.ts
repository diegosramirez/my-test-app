import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlightText',
  standalone: true,
  pure: true
})
export class HighlightTextPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string, searchTerm: string): SafeHtml {
    if (!text || !searchTerm || searchTerm.trim().length === 0) {
      return this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(text));
    }

    // Escape HTML to prevent XSS
    const escapedText = this.escapeHtml(text);
    const escapedSearchTerm = this.escapeRegExp(searchTerm);

    // Create regex with case insensitive flag
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');

    // Replace matches with bold, high contrast highlighting
    // Using WCAG AA compliant colors: white text on dark background
    const highlightedText = escapedText.replace(regex,
      '<strong style="background-color: #1a1a1a; color: #ffffff; font-weight: 700; padding: 1px 2px; border-radius: 2px;">$1</strong>'
    );

    return this.sanitizer.bypassSecurityTrustHtml(highlightedText);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}