import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TextboxPageComponent } from './textbox-page';
import { routes } from '../../app.routes';

describe('TextboxPageComponent', () => {
  let component: TextboxPageComponent;
  let fixture: ComponentFixture<TextboxPageComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextboxPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TextboxPageComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  // === Page Renders ===
  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render an h1 heading with "Text Input Page"', () => {
    const h1 = el.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1!.textContent).toContain('Text Input Page');
  });

  it('should render a visible label with text "Enter text below:"', () => {
    const label = el.querySelector('label');
    expect(label).toBeTruthy();
    expect(label!.textContent).toContain('Enter text below:');
  });

  it('should render a text input with placeholder "Type something…"', () => {
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe('text');
    expect(input.placeholder).toBe('Type something\u2026');
  });

  // === Accessible Label Association ===
  it('should associate label with input via matching for/id attributes', () => {
    const label = el.querySelector('label') as HTMLLabelElement;
    const input = el.querySelector('input') as HTMLInputElement;
    expect(label.getAttribute('for')).toBe('mainTextbox');
    expect(input.id).toBe('mainTextbox');
    expect(label.getAttribute('for')).toBe(input.id);
  });

  it('should have autocomplete="off" on the input', () => {
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.autocomplete).toBe('off');
  });

  // === Textbox Accepts Input (two-way binding) ===
  it('should initialize inputValue as empty string', () => {
    expect(component.inputValue).toBe('');
  });

  it('should reflect typed input in the model via two-way binding', async () => {
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = 'Hello World';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.inputValue).toBe('Hello World');
  });

  it('should reflect model changes in the input element', async () => {
    component.inputValue = 'Programmatic value';
    fixture.detectChanges();
    await fixture.whenStable();
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('Programmatic value');
  });

  it('should handle empty string input', async () => {
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = 'some text';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.inputValue).toBe('some text');

    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.inputValue).toBe('');
  });

  it('should handle special characters in input', async () => {
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = '<script>alert("xss")</script>&"\'';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.inputValue).toBe('<script>alert("xss")</script>&"\'');
  });

  it('should handle very long input strings', async () => {
    const input = el.querySelector('input') as HTMLInputElement;
    const longString = 'a'.repeat(10000);
    input.value = longString;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.inputValue).toBe(longString);
  });

  it('should handle unicode and emoji input', async () => {
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = '日本語テスト 🎉🚀';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.inputValue).toBe('日本語テスト 🎉🚀');
  });

  // === Standalone Architecture ===
  it('should be a standalone component (no NgModule needed)', () => {
    // The fact that TestBed.configureTestingModule imports the component directly proves standalone
    expect(component).toBeTruthy();
  });

  // === Clean State on Re-navigation ===
  it('should start with fresh empty state on each instantiation', () => {
    // Simulate re-navigation by creating a new instance
    const fixture2 = TestBed.createComponent(TextboxPageComponent);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();
    expect(component2.inputValue).toBe('');
  });

  // === Tracking Stub ===
  it('should have ngAfterViewInit defined', () => {
    expect(typeof component.ngAfterViewInit).toBe('function');
  });

  // === Layout structure ===
  it('should have a .textbox-page container wrapping all content', () => {
    const container = el.querySelector('.textbox-page');
    expect(container).toBeTruthy();
    expect(container!.querySelector('h1')).toBeTruthy();
    expect(container!.querySelector('label')).toBeTruthy();
    expect(container!.querySelector('input')).toBeTruthy();
  });

  it('should render elements in correct order: h1, label, input', () => {
    const container = el.querySelector('.textbox-page')!;
    const children = Array.from(container.children);
    const tags = children.map(c => c.tagName.toLowerCase());
    expect(tags).toEqual(['h1', 'label', 'input']);
  });

  // === Input does not have autofocus ===
  it('should not have autofocus on the input', () => {
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.hasAttribute('autofocus')).toBe(false);
  });
});

// === Route Registration ===
describe('App Routes - /textbox', () => {
  it('should have a route entry for "textbox" path', () => {
    const textboxRoute = routes.find(r => r.path === 'textbox');
    expect(textboxRoute).toBeDefined();
  });

  it('should eagerly load TextboxPageComponent (not lazy)', () => {
    const textboxRoute = routes.find(r => r.path === 'textbox');
    expect(textboxRoute!.component).toBe(TextboxPageComponent);
    expect((textboxRoute as any).loadComponent).toBeUndefined();
  });
});
