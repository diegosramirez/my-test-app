import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ChangeDetectionStrategy } from '@angular/core';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let nativeElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    nativeElement = fixture.nativeElement;
  });

  // AC: Hello World Renders — h1 with "Hello World" text
  it('should render an h1 with text "Hello World"', () => {
    const h1 = nativeElement.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1!.textContent).toBe('Hello World');
  });

  // AC: Only one h1 element exists
  it('should render exactly one h1 element', () => {
    const h1s = nativeElement.querySelectorAll('h1');
    expect(h1s.length).toBe(1);
  });

  // AC: Standalone Architecture — standalone: true, OnPush
  it('should be a standalone component', () => {
    const metadata = (App as any).ɵcmp;
    expect(metadata).toBeTruthy();
    expect(metadata.standalone).toBe(true);
  });

  it('should use OnPush change detection', () => {
    const metadata = (App as any).ɵcmp;
    // OnPush = 1 in Angular's internal representation
    expect(metadata.onPush).toBe(true);
  });

  // AC: No scaffold artifacts — no NgModule
  it('should not have an NgModule decorator', () => {
    const ngModule = (App as any).ɵmod;
    expect(ngModule).toBeUndefined();
  });

  // AC: selector matches app-root (verified via component metadata)
  it('should use app-root selector', () => {
    const metadata = (App as any).ɵcmp;
    expect(metadata.selectors).toBeTruthy();
    // Angular stores selectors as nested arrays, e.g. [['app-root']]
    const flatSelectors = metadata.selectors.flat();
    expect(flatSelectors).toContain('app-root');
  });

  // AC: Host element has flexbox centering styles (verified via component metadata)
  it('should define :host styles with flexbox centering', () => {
    const metadata = (App as any).ɵcmp;
    const styles: string[] = metadata.styles;
    expect(styles).toBeTruthy();
    const joined = styles.join('');
    expect(joined).toContain('display');
    expect(joined).toContain('flex');
    expect(joined).toContain('center');
  });

  // AC: No RouterOutlet in template (static content only)
  it('should not contain a router-outlet', () => {
    const routerOutlet = nativeElement.querySelector('router-outlet');
    expect(routerOutlet).toBeNull();
  });

  // AC: Routes array is empty
  it('should have an empty routes array', () => {
    expect(routes).toEqual([]);
  });

  // AC: Component creates without errors
  it('should create the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance).toBeInstanceOf(App);
  });
});
