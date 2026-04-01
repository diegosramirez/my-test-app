import { TestBed } from '@angular/core/testing';
import { LoginPage } from './login-page';
import { describe, it, expect } from 'vitest';

describe('LoginPage', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [LoginPage]
    }).compileComponents();
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', async () => {
    const fixture = await setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render heading with text "Login"', async () => {
    const fixture = await setup();
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading).toBeTruthy();
    expect(heading!.textContent).toContain('Login');
  });

  it('should style heading in darkblue', async () => {
    const fixture = await setup();
    const heading = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(heading.style.color).toBe('darkblue');
  });

  it('should have exactly one h1 element', async () => {
    const fixture = await setup();
    const headings = fixture.nativeElement.querySelectorAll('h1');
    expect(headings.length).toBe(1);
  });
});
