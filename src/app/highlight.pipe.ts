import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlight',
  standalone: true
})
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string, searchTerm: string): SafeHtml {
    if (!searchTerm || !text) {
      return text;
    }

    // Escape special regex characters in search term
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');

    const highlightedText = text.replace(regex,
      '<span class="highlight" style="background-color: #ffeb3b; color: #000; font-weight: bold;" aria-label="highlighted match">$1</span>'
    );

    return this.sanitizer.bypassSecurityTrustHtml(highlightedText);
  }
}