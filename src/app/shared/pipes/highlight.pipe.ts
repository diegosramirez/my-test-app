import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'highlight',
  standalone: true
})
export class HighlightPipe implements PipeTransform {
  transform(
    text: string,
    query: string,
    highlightClass: string = 'highlight',
    caseSensitive: boolean = false
  ): string {
    if (!text || !query) {
      return text;
    }

    const flags = caseSensitive ? 'g' : 'gi';
    const escapedQuery = this.escapeRegExp(query);
    const regex = new RegExp(`(${escapedQuery})`, flags);

    return text.replace(regex, `<mark class="${highlightClass}" aria-label="highlighted text">$1</mark>`);
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}