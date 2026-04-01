import { TestBed } from '@angular/core/testing';
import { RegisterPage } from './register-page';
import { describe, it, expect } from 'vitest';

describe('RegisterPage', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [RegisterPage]
    }).compileComponents();
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', async () => {
    const fixture = await setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render heading with text "Register"', async () => {
    const fixture = await setup();
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading).toBeTruthy();
    expect(heading!.textContent).toContain('Register');
  });

  it('should style heading in darkgreen', async () => {
    const fixture = await setup();
    const heading = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(heading.style.color).toBe('darkgreen');
  });

  it('should have exactly one h1 element', async () => {
    const fixture = await setup();
    const headings = fixture.nativeElement.querySelectorAll('h1');
    expect(headings.length).toBe(1);
  });
});
