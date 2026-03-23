import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render counter and history components', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-counter')).toBeTruthy();
    expect(el.querySelector('app-history')).toBeTruthy();
  });

  it('should not contain scaffold remnants in template', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const html = fixture.nativeElement.innerHTML;
    expect(html).not.toContain('angular.dev');
    expect(html).not.toContain('Hello,');
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('class="content"');
  });
});
