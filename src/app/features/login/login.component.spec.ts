import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('should display Simple Chat heading', () => {
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent).toBe('Simple Chat');
  });

  it('should autofocus the username input', () => {
    const input = fixture.nativeElement.querySelector('input');
    expect(document.activeElement).toBe(input);
  });

  it('should have maxlength 30 on input', () => {
    const input = fixture.nativeElement.querySelector('input');
    expect(input.getAttribute('maxlength')).toBe('30');
  });

  it('should pre-fill from localStorage', async () => {
    localStorage.setItem('chat_username', 'Alice');
    const fixture2 = TestBed.createComponent(LoginComponent);
    fixture2.detectChanges();
    expect(fixture2.componentInstance.username).toBe('Alice');
  });

  it('should disable button when input is empty', () => {
    component.username = '   ';
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.disabled).toBe(true);
  });

  it('should show error on submit with empty input', () => {
    component.username = '  ';
    component.onSubmit();
    fixture.detectChanges();
    const err = fixture.nativeElement.querySelector('[role="alert"]');
    expect(err).toBeTruthy();
    expect(err.textContent).toContain('Username is required');
  });

  it('should trim username and navigate on valid submit', () => {
    component.username = '  Alice  ';
    component.onSubmit();
    expect(localStorage.getItem('chat_username')).toBe('Alice');
    expect(router.navigate).toHaveBeenCalledWith(['/chat']);
  });

  it('should disable button after submit to prevent double-click', () => {
    component.username = 'Bob';
    component.onSubmit();
    expect(component.submitting).toBe(true);
    expect(component.isButtonDisabled).toBe(true);
  });

  it('should link error to input via aria-describedby', () => {
    component.username = '';
    component.onSubmit();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input');
    expect(input.getAttribute('aria-describedby')).toBe('username-error');
  });
});
