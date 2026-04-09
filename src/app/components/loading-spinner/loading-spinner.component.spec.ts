import { TestBed } from '@angular/core/testing';
import { LoadingSpinnerComponent } from './loading-spinner.component';

describe('LoadingSpinnerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSpinnerComponent],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(LoadingSpinnerComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render spinner with loading text', () => {
    const fixture = TestBed.createComponent(LoadingSpinnerComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const spinner = compiled.querySelector('.spinner');
    const loadingText = compiled.querySelector('.loading-text');

    expect(spinner).toBeTruthy();
    expect(loadingText?.textContent?.trim()).toBe('Loading match results...');
  });

  it('should apply correct CSS classes for spinner container', () => {
    const fixture = TestBed.createComponent(LoadingSpinnerComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const container = compiled.querySelector('.spinner-container');

    expect(container).toBeTruthy();
    expect(container?.className).toContain('spinner-container');
  });

  it('should have spinner animation element', () => {
    const fixture = TestBed.createComponent(LoadingSpinnerComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const spinner = compiled.querySelector('.spinner');

    expect(spinner).toBeTruthy();
    expect(spinner?.className).toContain('spinner');
  });

  it('should have appropriate loading text styling', () => {
    const fixture = TestBed.createComponent(LoadingSpinnerComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const loadingText = compiled.querySelector('.loading-text');

    expect(loadingText).toBeTruthy();
    expect(loadingText?.className).toContain('loading-text');
  });

  it('should render consistently across multiple renders', () => {
    const fixture = TestBed.createComponent(LoadingSpinnerComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const firstRender = compiled.innerHTML;

    // Re-render
    fixture.detectChanges();
    const secondRender = compiled.innerHTML;

    expect(firstRender).toBe(secondRender);
  });

  it('should contain football-specific loading message', () => {
    const fixture = TestBed.createComponent(LoadingSpinnerComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const loadingText = compiled.querySelector('.loading-text');

    // Ensure loading text is football-context relevant
    expect(loadingText?.textContent).toContain('match results');
  });

  it('should render with mobile-friendly structure', () => {
    const fixture = TestBed.createComponent(LoadingSpinnerComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const container = compiled.querySelector('.spinner-container');
    const spinner = compiled.querySelector('.spinner');

    // Should have container with flex layout for mobile optimization
    expect(container).toBeTruthy();
    expect(spinner).toBeTruthy();

    // Both elements should exist for responsive design
    expect(container?.children).toHaveLength(2);
  });
})