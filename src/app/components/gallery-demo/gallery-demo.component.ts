import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageGalleryComponent } from '../image-gallery/image-gallery.component';
import { GalleryImage } from '../../types/gallery.types';

@Component({
  selector: 'app-gallery-demo',
  standalone: true,
  imports: [CommonModule, ImageGalleryComponent],
  template: `
    <div class="demo-container">
      <h1>Image Gallery Demo</h1>
      <p>A responsive image gallery with lazy loading, lightbox modal, and keyboard navigation.</p>

      <div class="demo-section">
        <h2>Sample Gallery</h2>
        <p>Click any image to open the lightbox. Use arrow keys to navigate between images.</p>

        <app-image-gallery
          [images]="sampleImages"
          [aspectRatio]="'16:9'"
          (imageClicked)="onImageClicked($event)"
          (modalOpened)="onModalOpened($event)"
          (modalClosed)="onModalClosed($event)"
          (galleryLoaded)="onGalleryLoaded($event)">
        </app-image-gallery>
      </div>

      <div class="demo-section">
        <h2>Empty Gallery</h2>
        <p>Example of how the gallery handles empty state:</p>

        <app-image-gallery
          [images]="[]">
        </app-image-gallery>
      </div>

      <div class="demo-section">
        <h2>Single Image</h2>
        <p>Gallery with only one image (navigation buttons will be hidden):</p>

        <app-image-gallery
          [images]="[sampleImages[0]]">
        </app-image-gallery>
      </div>

      <div class="features-section">
        <h2>Features</h2>
        <ul class="features-list">
          <li>✓ Responsive grid layout (4/3/2/1 columns based on screen size)</li>
          <li>✓ Lazy loading with Intersection Observer</li>
          <li>✓ Lightbox modal with dark overlay</li>
          <li>✓ Keyboard navigation (arrow keys, Escape)</li>
          <li>✓ Touch/swipe support on mobile</li>
          <li>✓ Progressive image loading with WebP detection</li>
          <li>✓ Error handling with retry functionality</li>
          <li>✓ Accessibility compliance (ARIA labels, focus management)</li>
          <li>✓ Performance metrics and analytics tracking</li>
          <li>✓ Loading states and smooth transitions</li>
        </ul>
      </div>

      <div class="instructions-section">
        <h2>Keyboard Instructions</h2>
        <div class="keyboard-grid">
          <div class="key-instruction">
            <kbd>←→</kbd>
            <span>Navigate images in lightbox</span>
          </div>
          <div class="key-instruction">
            <kbd>Esc</kbd>
            <span>Close lightbox</span>
          </div>
          <div class="key-instruction">
            <kbd>Enter</kbd>
            <span>Open selected image</span>
          </div>
          <div class="key-instruction">
            <kbd>Tab</kbd>
            <span>Navigate thumbnails</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./gallery-demo.component.scss']
})
export class GalleryDemoComponent implements OnInit {
  sampleImages: GalleryImage[] = [
    {
      id: '1',
      thumbnailUrl: 'https://picsum.photos/400/225?random=1',
      fullSizeUrl: 'https://picsum.photos/1200/675?random=1',
      alt: 'Beautiful landscape with mountains and lake',
      caption: 'A serene mountain lake reflecting the surrounding peaks',
      width: 1200,
      height: 675
    },
    {
      id: '2',
      thumbnailUrl: 'https://picsum.photos/400/225?random=2',
      fullSizeUrl: 'https://picsum.photos/1200/675?random=2',
      alt: 'Urban cityscape at sunset',
      caption: 'City skyline illuminated by the golden hour',
      width: 1200,
      height: 675
    },
    {
      id: '3',
      thumbnailUrl: 'https://picsum.photos/400/225?random=3',
      fullSizeUrl: 'https://picsum.photos/1200/675?random=3',
      alt: 'Forest path through tall trees',
      caption: 'A winding path through an ancient forest',
      width: 1200,
      height: 675
    },
    {
      id: '4',
      thumbnailUrl: 'https://picsum.photos/400/225?random=4',
      fullSizeUrl: 'https://picsum.photos/1200/675?random=4',
      alt: 'Ocean waves crashing on rocks',
      caption: 'Powerful waves meeting the rugged coastline',
      width: 1200,
      height: 675
    },
    {
      id: '5',
      thumbnailUrl: 'https://picsum.photos/400/225?random=5',
      fullSizeUrl: 'https://picsum.photos/1200/675?random=5',
      alt: 'Desert dunes under starry sky',
      caption: 'Sand dunes beneath a brilliant night sky',
      width: 1200,
      height: 675
    },
    {
      id: '6',
      thumbnailUrl: 'https://picsum.photos/400/225?random=6',
      fullSizeUrl: 'https://picsum.photos/1200/675?random=6',
      alt: 'Autumn leaves in vibrant colors',
      caption: 'Fall foliage displaying nature\'s palette',
      width: 1200,
      height: 675
    },
    {
      id: '7',
      thumbnailUrl: 'https://picsum.photos/400/225?random=7',
      fullSizeUrl: 'https://picsum.photos/1200/675?random=7',
      alt: 'Snow-capped mountain peak',
      caption: 'Majestic peak rising above the clouds',
      width: 1200,
      height: 675
    },
    {
      id: '8',
      thumbnailUrl: 'https://picsum.photos/400/225?random=8',
      fullSizeUrl: 'https://picsum.photos/1200/675?random=8',
      alt: 'Tropical beach with palm trees',
      caption: 'Paradise found on a remote tropical island',
      width: 1200,
      height: 675
    },
    {
      id: '9',
      thumbnailUrl: 'https://picsum.photos/400/225?random=9',
      fullSizeUrl: 'https://picsum.photos/1200/675?random=9',
      alt: 'Northern lights dancing in the sky',
      caption: 'Aurora Borealis painting the night in green',
      width: 1200,
      height: 675
    },
    {
      id: '10',
      thumbnailUrl: 'https://picsum.photos/400/225?random=10',
      fullSizeUrl: 'https://picsum.photos/1200/675?random=10',
      alt: 'Waterfall cascading down cliff',
      caption: 'A powerful waterfall thundering into the valley below',
      width: 1200,
      height: 675
    },
    {
      id: '11',
      thumbnailUrl: 'https://picsum.photos/400/225?random=11',
      fullSizeUrl: 'https://picsum.photos/1200/675?random=11',
      alt: 'Lavender field in bloom',
      caption: 'Endless rows of purple lavender swaying in the breeze',
      width: 1200,
      height: 675
    },
    {
      id: '12',
      thumbnailUrl: 'https://picsum.photos/400/225?random=12',
      fullSizeUrl: 'https://picsum.photos/1200/675?random=12',
      alt: 'Ancient ruins at sunrise',
      caption: 'Historical architecture bathed in morning light',
      width: 1200,
      height: 675
    }
  ];

  ngOnInit(): void {
    console.log('Gallery Demo initialized with', this.sampleImages.length, 'images');
  }

  onImageClicked(event: {image: GalleryImage, index: number}): void {
    console.log('Image clicked:', event.image.alt, 'at index', event.index);
  }

  onModalOpened(event: {image: GalleryImage, index: number}): void {
    console.log('Modal opened for:', event.image.alt, 'at index', event.index);
  }

  onModalClosed(event: {lastViewedIndex: number}): void {
    console.log('Modal closed. Last viewed index:', event.lastViewedIndex);
  }

  onGalleryLoaded(event: {imageCount: number, loadTime: number}): void {
    console.log('Gallery loaded with', event.imageCount, 'images in', event.loadTime, 'ms');
  }
}