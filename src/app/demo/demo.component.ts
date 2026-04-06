import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageGalleryComponent, GalleryImage, GalleryConfig, DEFAULT_GALLERY_CONFIG, ImageGalleryService } from '../image-gallery';

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [CommonModule, ImageGalleryComponent],
  template: `
    <div class="demo-container">
      <header class="demo-header">
        <h1>Image Gallery Demo</h1>
        <p>A responsive image gallery with lightbox, lazy loading, and accessibility features</p>
      </header>

      <main class="demo-content">
        <!-- Gallery controls -->
        <div class="demo-controls">
          <button
            class="control-button"
            (click)="loadSampleImages()"
            [disabled]="isLoading"
          >
            {{ images.length > 0 ? 'Reload Sample Images' : 'Load Sample Images' }}
          </button>

          <button
            class="control-button"
            (click)="clearImages()"
            [disabled]="isLoading || images.length === 0"
          >
            Clear Gallery
          </button>

          <button
            class="control-button"
            (click)="addRandomImage()"
            [disabled]="isLoading"
          >
            Add Random Image
          </button>

          <div class="image-counter">
            {{ images.length }} image{{ images.length !== 1 ? 's' : '' }}
          </div>
        </div>

        <!-- Image Gallery -->
        <app-image-gallery
          [images]="images"
          [config]="galleryConfig"
          [isLoading]="isLoading"
          [enableAnalytics]="true"
          (imageClicked)="onImageClicked($event)"
          (imageLoaded)="onImageLoaded($event)"
          (lightboxOpened)="onLightboxOpened($event)"
          (lightboxClosed)="onLightboxClosed($event)"
        ></app-image-gallery>

        <!-- Analytics display (for demo purposes) -->
        <div class="analytics-panel">
          <h3>Analytics Events (Demo Only)</h3>
          <div class="analytics-events">
            <div
              *ngFor="let event of recentEvents; trackBy: trackByTimestamp"
              class="analytics-event"
            >
              <span class="event-name">{{ event.eventName }}</span>
              <span class="event-time">{{ formatTime(event.timestamp) }}</span>
              <div class="event-properties">{{ formatProperties(event.properties) }}</div>
            </div>
          </div>
          <button
            class="control-button clear-analytics"
            (click)="clearAnalytics()"
            [disabled]="recentEvents.length === 0"
          >
            Clear Events
          </button>
        </div>
      </main>
    </div>
  `,
  styleUrls: ['./demo.component.css']
})
export class DemoComponent implements OnInit {
  images: GalleryImage[] = [];
  isLoading = false;
  galleryConfig: GalleryConfig = DEFAULT_GALLERY_CONFIG;
  recentEvents: any[] = [];

  // Sample images from Lorem Picsum (free placeholder service)
  private sampleImageUrls = [
    'https://picsum.photos/800/600?random=1',
    'https://picsum.photos/800/600?random=2',
    'https://picsum.photos/800/600?random=3',
    'https://picsum.photos/800/600?random=4',
    'https://picsum.photos/800/600?random=5',
    'https://picsum.photos/800/600?random=6',
    'https://picsum.photos/800/600?random=7',
    'https://picsum.photos/800/600?random=8',
    'https://picsum.photos/800/600?random=9',
    'https://picsum.photos/800/600?random=10',
    'https://picsum.photos/800/600?random=11',
    'https://picsum.photos/800/600?random=12',
  ];

  private sampleTitles = [
    'Mountain Landscape',
    'Ocean Sunset',
    'City Architecture',
    'Forest Path',
    'Desert Dunes',
    'Lake Reflection',
    'Urban Street',
    'Natural Canyon',
    'Coastal Cliffs',
    'Garden Flowers',
    'Winter Scene',
    'Abstract Art'
  ];

  constructor(private galleryService: ImageGalleryService) {}

  ngOnInit(): void {
    // Subscribe to analytics events for demo purposes
    this.galleryService.getAnalyticsEvents().subscribe(event => {
      this.recentEvents.unshift(event);
      // Keep only last 10 events
      if (this.recentEvents.length > 10) {
        this.recentEvents = this.recentEvents.slice(0, 10);
      }
    });
  }

  loadSampleImages(): void {
    this.isLoading = true;

    // Simulate loading delay
    setTimeout(() => {
      this.images = this.sampleImageUrls.map((url, index) => ({
        id: `sample-${index + 1}`,
        thumbnailUrl: `https://picsum.photos/400/300?random=${index + 1}`,
        fullSizeUrl: url,
        altText: `Sample image ${index + 1}: ${this.sampleTitles[index]}`,
        title: this.sampleTitles[index],
        description: `This is a sample description for ${this.sampleTitles[index].toLowerCase()}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
        fileSize: Math.floor(Math.random() * 500000) + 100000 // Random file size between 100KB and 600KB
      }));

      this.isLoading = false;
    }, 1000);
  }

  clearImages(): void {
    this.images = [];
  }

  addRandomImage(): void {
    const randomIndex = Math.floor(Math.random() * 1000) + 13; // Start from 13 to avoid duplicates
    const randomTitleIndex = Math.floor(Math.random() * this.sampleTitles.length);

    const newImage: GalleryImage = {
      id: `random-${Date.now()}`,
      thumbnailUrl: `https://picsum.photos/400/300?random=${randomIndex}`,
      fullSizeUrl: `https://picsum.photos/800/600?random=${randomIndex}`,
      altText: `Random image: ${this.sampleTitles[randomTitleIndex]}`,
      title: this.sampleTitles[randomTitleIndex],
      description: `This is a randomly added image with the title "${this.sampleTitles[randomTitleIndex]}".`,
      fileSize: Math.floor(Math.random() * 500000) + 100000
    };

    this.images = [...this.images, newImage];
  }

  onImageClicked(event: { image: GalleryImage; index: number }): void {
    console.log('Image clicked:', event);
  }

  onImageLoaded(event: { image: GalleryImage; index: number; success: boolean }): void {
    console.log('Image loaded:', event);
  }

  onLightboxOpened(index: number): void {
    console.log('Lightbox opened at index:', index);
  }

  onLightboxClosed(method: string): void {
    console.log('Lightbox closed via:', method);
  }

  clearAnalytics(): void {
    this.recentEvents = [];
  }

  trackByTimestamp(index: number, event: any): number {
    return event.timestamp;
  }

  formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  formatProperties(properties: Record<string, any>): string {
    return Object.entries(properties)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }
}