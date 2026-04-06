import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { ImageGalleryComponent } from './image-gallery.component';
import { ImageGalleryService } from '../../services/image-gallery.service';
import { GalleryImage, DEFAULT_GALLERY_CONFIG } from '../../models/gallery-image.interface';

describe('ImageGalleryComponent', () => {
  let component: ImageGalleryComponent;
  let fixture: ComponentFixture<ImageGalleryComponent>;
  let mockGalleryService: jasmine.SpyObj<ImageGalleryService>;

  const mockImages: GalleryImage[] = [
    {
      id: '1',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      fullSizeUrl: 'https://example.com/full1.jpg',
      altText: 'Test image 1',
      title: 'Image 1',
      description: 'Test description 1'
    },
    {
      id: '2',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      fullSizeUrl: 'https://example.com/full2.jpg',
      altText: 'Test image 2',
      title: 'Image 2',
      description: 'Test description 2'
    }
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ImageGalleryService', [
      'trackGalleryLoaded',
      'trackImageOpened',
      'trackImageLazyLoaded',
      'handleImageError',
      'getAdjacentImages',
      'preloadImages'
    ]);

    await TestBed.configureTestingModule({
      imports: [ImageGalleryComponent],
      providers: [
        { provide: ImageGalleryService, useValue: spy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ImageGalleryComponent);
    component = fixture.componentInstance;
    mockGalleryService = TestBed.inject(ImageGalleryService) as jasmine.SpyObj<ImageGalleryService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display empty state when no images provided', () => {
    component.images = [];
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState.textContent).toContain('No images available');
  });

  it('should display gallery grid when images are provided', () => {
    component.images = mockImages;
    fixture.detectChanges();

    const galleryGrid = fixture.nativeElement.querySelector('.gallery-grid');
    expect(galleryGrid).toBeTruthy();

    const galleryItems = fixture.nativeElement.querySelectorAll('.gallery-item');
    expect(galleryItems.length).toBe(mockImages.length);
  });

  it('should use default config when no config provided', () => {
    expect(component.config).toEqual(DEFAULT_GALLERY_CONFIG);
  });

  it('should open lightbox when image is clicked', () => {
    component.images = mockImages;
    component.enableAnalytics = false; // Disable analytics for this test
    fixture.detectChanges();

    spyOn(component.imageClicked, 'emit');
    spyOn(component.lightboxOpened, 'emit');

    component.openLightbox(0);

    expect(component.showLightbox).toBe(true);
    expect(component.lightboxIndex).toBe(0);
    expect(component.imageClicked.emit).toHaveBeenCalledWith({
      image: mockImages[0],
      index: 0
    });
    expect(component.lightboxOpened.emit).toHaveBeenCalledWith(0);
  });

  it('should close lightbox and restore focus', () => {
    component.images = mockImages;
    component.showLightbox = true;
    component.returnFocusIndex = 1;
    fixture.detectChanges();

    spyOn(component.lightboxClosed, 'emit');

    component.closeLightbox('escape');

    expect(component.showLightbox).toBe(false);
    expect(component.lightboxClosed.emit).toHaveBeenCalledWith('escape');
  });

  it('should track image loaded event when analytics enabled', () => {
    component.images = mockImages;
    component.enableAnalytics = true;

    component.onThumbnailLoaded(0, true);

    expect(mockGalleryService.trackImageLazyLoaded).toHaveBeenCalledWith(
      0,
      100,
      true
    );
  });

  it('should handle image error correctly', () => {
    component.images = mockImages;
    const originalImage = { ...mockImages[0] };

    mockGalleryService.handleImageError.and.returnValue({
      ...originalImage,
      loadError: true,
      retryCount: 1
    });

    component.onThumbnailError(0, 'test-url');

    expect(mockGalleryService.handleImageError).toHaveBeenCalledWith(
      originalImage,
      'thumbnail_load_failed'
    );
  });

  it('should track by image ID', () => {
    const image = mockImages[0];
    const trackResult = component.trackByImageId(0, image);
    expect(trackResult).toBe(image.id);
  });

  it('should update device type on resize', () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    component['updateDeviceType']();
    expect(component.currentDevice).toBe('mobile');

    (window as any).innerWidth = 900;
    component['updateDeviceType']();
    expect(component.currentDevice).toBe('tablet');

    (window as any).innerWidth = 1200;
    component['updateDeviceType']();
    expect(component.currentDevice).toBe('desktop');
  });

  it('should preload adjacent images', () => {
    component.images = mockImages;
    mockGalleryService.getAdjacentImages.and.returnValue(['url1', 'url2']);

    component['preloadAdjacentImages'](0);

    expect(mockGalleryService.getAdjacentImages).toHaveBeenCalledWith(
      mockImages,
      0,
      2
    );
    expect(mockGalleryService.preloadImages).toHaveBeenCalledWith(['url1', 'url2']);
  });
});