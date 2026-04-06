// Main component
export { ImageGalleryComponent } from './image-gallery.component';

// Sub-components
export { GalleryThumbnailComponent } from './gallery-thumbnail/gallery-thumbnail.component';
export { LightboxModalComponent } from './lightbox-modal/lightbox-modal.component';

// Directive
export { LazyImageDirective } from './directives/lazy-image.directive';

// Service
export { GalleryService } from './services/gallery.service';

// Types and interfaces
export type {
  ImageItem,
  GalleryState,
  LoadingState,
  ErrorState,
  GalleryConfig,
  GalleryEvent
} from './types/image-gallery.types';

export { DEFAULT_GALLERY_CONFIG } from './types/image-gallery.types';