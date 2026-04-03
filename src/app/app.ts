import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MarkdownPreviewComponent } from './components/markdown-preview/markdown-preview.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MarkdownPreviewComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('my-test-app');

  sampleMarkdown = `# Welcome to Markdown Preview

This is a **live markdown preview component** built with Angular! ✨

## Features

- 🚀 **Real-time preview** with debounced updates
- 📱 **Responsive design** that works on mobile and desktop
- 🔄 **Scroll synchronization** between editor and preview
- 🛡️ **Security sanitization** to prevent XSS attacks
- ⚡ **Performance optimized** with OnPush change detection

## Code Example

Here's how to use the component:

\`\`\`typescript
@Component({
  template: \`
    <app-markdown-preview
      [initialContent]="content"
      [config]="config"
      (contentChange)="onContentChange($event)"
      (parseComplete)="onParseComplete($event)">
    </app-markdown-preview>
  \`
})
export class MyComponent {
  content = "# Hello World";
  config = { debounceMs: 100 };
}
\`\`\`

## Try It Out!

> Edit this text to see the live preview in action.

### Lists Work Too

- Item 1
- Item 2
  - Nested item
  - Another nested item

1. Ordered item
2. Another ordered

### Links and Images

[Angular Documentation](https://angular.dev)

### Tables

| Feature | Status |
|---------|--------|
| Real-time Preview | ✅ |
| Scroll Sync | ✅ |
| Mobile Support | ✅ |
| Error Handling | ✅ |

---

**Happy coding!** 🎉`;

  onContentChange(event: any) {
    console.log('Content changed:', event);
  }

  onParseComplete(event: any) {
    console.log('Parse completed:', event);
  }

  onParseError(event: any) {
    console.log('Parse error:', event);
  }

  onScrollSync(event: any) {
    console.log('Scroll sync:', event);
  }

  getAngularVersion(): string {
    return '21.2.0';
  }
}
