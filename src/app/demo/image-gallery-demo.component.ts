import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageGalleryComponent, ImageItem, GalleryEvent } from '../components/image-gallery';

@Component({
  selector: 'app-image-gallery-demo',
  standalone: true,
  imports: [CommonModule, ImageGalleryComponent],
  template: `
    <div class="demo-container">
      <header class="demo-header">
        <h1>Image Gallery Demo</h1>
        <p>
          Responsive image gallery with lazy loading, lightbox modal, keyboard navigation,
          and touch gesture support. Try clicking on images, using keyboard arrows, or swiping on mobile!
        </p>
      </header>

      <section class="demo-section">
        <h2>Gallery Features</h2>
        <ul class="features-list">
          <li>✅ Responsive grid layout (1-4 columns)</li>
          <li>✅ Lazy loading with Intersection Observer</li>
          <li>✅ Lightbox modal with smooth animations</li>
          <li>✅ Keyboard navigation (Arrow keys, Escape, Tab)</li>
          <li>✅ Touch gestures for mobile (swipe to navigate)</li>
          <li>✅ Error handling with retry mechanisms</li>
          <li>✅ Accessibility compliance (ARIA labels, screen reader support)</li>
          <li>✅ Memory management for large image sets</li>
          <li>✅ Performance tracking and optimization</li>
        </ul>
      </section>

      <section class="demo-section">
        <h2>Sample Gallery ({{ sampleImages.length }} images)</h2>

        <!-- Controls -->
        <div class="demo-controls">
          <button (click)="togglePerformanceInfo()">
            {{ showPerformanceInfo ? 'Hide' : 'Show' }} Performance Info
          </button>
          <button (click)="addMoreImages()">Add More Images</button>
          <button (click)="resetImages()">Reset Images</button>
        </div>

        <!-- Gallery -->
        <app-image-gallery
          [images]="sampleImages"
          [showPerformanceInfo]="showPerformanceInfo"
          [showNavigationHints]="true"
          (galleryLoaded)="onGalleryLoaded($event)"
          (imageOpened)="onImageOpened($event)"
          (modalClosed)="onModalClosed($event)"
          (navigationUsed)="onNavigationUsed($event)"
          (errorOccurred)="onErrorOccurred($event)"
          (gestureUsed)="onGestureUsed($event)"
        />
      </section>

      <!-- Event Log -->
      <section class="demo-section" *ngIf="eventLog.length > 0">
        <h2>Event Log</h2>
        <div class="event-log">
          <div
            class="event-item"
            *ngFor="let event of eventLog.slice(-10); trackBy: trackByEventTime"
          >
            <span class="event-time">{{ formatTime(event.timestamp) }}</span>
            <span class="event-name">{{ event.name }}</span>
            <span class="event-details">{{ event.details }}</span>
          </div>
        </div>
        <button class="clear-log-btn" (click)="clearEventLog()">Clear Log</button>
      </section>

      <!-- Usage Instructions -->
      <section class="demo-section">
        <h2>How to Use</h2>
        <div class="usage-instructions">
          <div class="instruction-group">
            <h3>Desktop</h3>
            <ul>
              <li>Click any thumbnail to open lightbox</li>
              <li>Use arrow keys to navigate between images</li>
              <li>Press Escape to close lightbox</li>
              <li>Tab through interface elements</li>
              <li>Hover over thumbnails for image titles</li>
            </ul>
          </div>

          <div class="instruction-group">
            <h3>Mobile</h3>
            <ul>
              <li>Tap thumbnails to open lightbox</li>
              <li>Swipe left/right to navigate images</li>
              <li>Tap overlay or X button to close</li>
              <li>All accessibility features work with screen readers</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .demo-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .demo-header {
      text-align: center;
      margin-bottom: 40px;
      padding: 40px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
    }

    .demo-header h1 {
      font-size: 2.5rem;
      margin-bottom: 16px;
      font-weight: 700;
    }

    .demo-header p {
      font-size: 1.1rem;
      opacity: 0.9;
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.6;
    }

    .demo-section {
      margin-bottom: 48px;
    }

    .demo-section h2 {
      font-size: 1.8rem;
      color: #2d3748;
      margin-bottom: 20px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
    }

    .features-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 12px;
      list-style: none;
      padding: 0;
    }

    .features-list li {
      padding: 12px;
      background: #f7fafc;
      border-radius: 8px;
      border-left: 4px solid #48bb78;
    }

    .demo-controls {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .demo-controls button {
      padding: 8px 16px;
      border: 1px solid #d69e2e;
      background: #f6e05e;
      color: #744210;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .demo-controls button:hover {
      background: #ecc94b;
      transform: translateY(-1px);
    }

    .event-log {
      background: #1a202c;
      color: #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      max-height: 300px;
      overflow-y: auto;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 13px;
    }

    .event-item {
      display: grid;
      grid-template-columns: 80px 150px 1fr;
      gap: 12px;
      padding: 4px 0;
      border-bottom: 1px solid #2d3748;
    }

    .event-item:last-child {
      border-bottom: none;
    }

    .event-time {
      color: #68d391;
      font-weight: 500;
    }

    .event-name {
      color: #63b3ed;
      font-weight: 600;
    }

    .event-details {
      color: #cbd5e0;
    }

    .clear-log-btn {
      margin-top: 12px;
      padding: 6px 12px;
      background: #e53e3e;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .clear-log-btn:hover {
      background: #c53030;
    }

    .usage-instructions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }

    .instruction-group {
      background: #f7fafc;
      padding: 20px;
      border-radius: 8px;
    }

    .instruction-group h3 {
      color: #2d3748;
      margin-bottom: 12px;
      font-size: 1.2rem;
    }

    .instruction-group ul {
      list-style-type: disc;
      padding-left: 20px;
    }

    .instruction-group li {
      margin-bottom: 8px;
      line-height: 1.5;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .demo-container {
        padding: 16px;
      }

      .demo-header h1 {
        font-size: 2rem;
      }

      .demo-header p {
        font-size: 1rem;
      }

      .features-list {
        grid-template-columns: 1fr;
      }

      .demo-controls {
        flex-direction: column;
      }

      .demo-controls button {
        width: 100%;
      }

      .event-item {
        grid-template-columns: 1fr;
        gap: 4px;
      }

      .usage-instructions {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ImageGalleryDemoComponent implements OnInit {
  sampleImages: ImageItem[] = [];
  showPerformanceInfo = false;
  eventLog: Array<{name: string, details: string, timestamp: number}> = [];

  private imageCounter = 1;

  ngOnInit(): void {
    this.initializeSampleImages();
  }

  private initializeSampleImages(): void {
    // Generate sample images using a placeholder service
    const baseImages: Partial<ImageItem>[] = [
      { alt: 'Mountain landscape', title: 'Majestic Mountain Peak' },
      { alt: 'Ocean sunset', title: 'Golden Hour by the Sea' },
      { alt: 'Forest path', title: 'Mystical Forest Trail' },
      { alt: 'City skyline', title: 'Urban Night Lights' },
      { alt: 'Desert dunes', title: 'Sahara Sand Patterns' },
      { alt: 'Arctic aurora', title: 'Northern Lights Display' },
      { alt: 'Tropical beach', title: 'Paradise Island View' },
      { alt: 'Autumn leaves', title: 'Fall Color Symphony' },
      { alt: 'Snowy peaks', title: 'Alpine Winter Scene' },
      { alt: 'River valley', title: 'Peaceful Valley Stream' },
      { alt: 'Flower garden', title: 'Botanical Beauty' },
      { alt: 'Starry night', title: 'Milky Way Galaxy' },
      { alt: 'Waterfall cascade', title: 'Thundering Falls' },
      { alt: 'Prairie sunset', title: 'Endless Horizon' },
      { alt: 'Rocky coast', title: 'Rugged Shoreline' },
      { alt: 'Pine forest', title: 'Evergreen Sanctuary' },
      { alt: 'Desert flower', title: 'Blooming Cactus' },
      { alt: 'Mountain lake', title: 'Crystal Clear Reflection' },
      { alt: 'Rolling hills', title: 'Green Countryside' },
      { alt: 'Ocean waves', title: 'Powerful Surf Break' }
    ];

    this.sampleImages = baseImages.map((img, index) => ({
      id: `image-${index + 1}`,
      thumbnailUrl: `https://picsum.photos/300/300?random=${index + 1}`,
      fullSizeUrl: `https://picsum.photos/800/600?random=${index + 1}`,
      alt: img.alt || `Sample image ${index + 1}`,
      title: img.title || `Sample Image ${index + 1}`,
      metadata: {
        width: 800,
        height: 600,
        category: 'nature'
      }
    }));

    this.imageCounter = this.sampleImages.length + 1;
  }

  // Event handlers
  onGalleryLoaded(event: GalleryEvent): void {
    this.logEvent('gallery_loaded', `${this.sampleImages.length} images, ${event.loadTime}ms load time`);
  }

  onImageOpened(event: GalleryEvent): void {
    this.logEvent('image_opened', `Index: ${event.imageIndex}, Method: ${event.method}`);
  }

  onModalClosed(event: GalleryEvent): void {
    this.logEvent('modal_closed', `Method: ${event.method}, Image: ${event.imageIndex}`);
  }

  onNavigationUsed(event: GalleryEvent): void {
    this.logEvent('navigation_used', `Direction: ${event.direction}, Method: ${event.method}`);
  }

  onErrorOccurred(event: GalleryEvent): void {
    this.logEvent('error_occurred', `Type: ${event.errorType}, Image: ${event.imageIndex}`);
  }

  onGestureUsed(event: GalleryEvent): void {
    this.logEvent('gesture_used', `Type: ${event.direction}, Device: mobile`);
  }

  // Control handlers
  togglePerformanceInfo(): void {
    this.showPerformanceInfo = !this.showPerformanceInfo;
  }

  addMoreImages(): void {
    const newImages: ImageItem[] = Array.from({ length: 10 }, (_, i) => ({
      id: `image-${this.imageCounter + i}`,
      thumbnailUrl: `https://picsum.photos/300/300?random=${this.imageCounter + i}`,
      fullSizeUrl: `https://picsum.photos/800/600?random=${this.imageCounter + i}`,
      alt: `Dynamic image ${this.imageCounter + i}`,
      title: `Dynamically Added Image ${this.imageCounter + i}`,
      metadata: {
        width: 800,
        height: 600,
        category: 'dynamic'
      }
    }));

    this.sampleImages = [...this.sampleImages, ...newImages];
    this.imageCounter += 10;

    this.logEvent('images_added', `Added 10 images, total: ${this.sampleImages.length}`);
  }

  resetImages(): void {
    this.initializeSampleImages();
    this.logEvent('images_reset', `Reset to ${this.sampleImages.length} original images`);
  }

  clearEventLog(): void {
    this.eventLog = [];
  }

  // Utility methods
  private logEvent(name: string, details: string): void {
    this.eventLog.push({
      name,
      details,
      timestamp: Date.now()
    });

    // Keep only last 50 events
    if (this.eventLog.length > 50) {
      this.eventLog = this.eventLog.slice(-50);
    }
  }

  trackByEventTime(index: number, event: any): number {
    return event.timestamp;
  }

  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}