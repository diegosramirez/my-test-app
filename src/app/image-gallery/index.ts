// Components
export { ImageGalleryComponent } from './components/image-gallery/image-gallery.component';
export { LightboxModalComponent } from './components/lightbox-modal/lightbox-modal.component';

// Directives
export { LazyImageDirective } from './directives/lazy-image.directive';

// Services
export { ImageGalleryService } from './services/image-gallery.service';

// Models
export type {
  GalleryImage,
  GalleryConfig,
  GalleryAnalyticsEvent
} from './models/gallery-image.interface';
export { DEFAULT_GALLERY_CONFIG } from './models/gallery-image.interface';