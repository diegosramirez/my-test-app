import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalculatorComponent } from './calculator.component';
import { AnalyticsService } from '../shared/analytics.service';

describe('CalculatorComponent', () => {
  let fixture: ComponentFixture<CalculatorComponent>;
  let component: CalculatorComponent;
  let analyticsService: AnalyticsService;

  beforeEach(async () => {
    analyticsService = { trackEvent: vi.fn() } as unknown as AnalyticsService;

    await TestBed.configureTestingModule({
      imports: [CalculatorComponent],
      providers: [{ provide: AnalyticsService, useValue: analyticsService }],
    }).compileComponents();

    fixture = TestBed.createComponent(CalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display 0 initially', () => {
    const display = fixture.nativeElement.querySelector('.display-value');
    expect(display.textContent.trim()).toBe('0');
  });

  it('should fire calculator_viewed on init', () => {
    expect(analyticsService.trackEvent).toHaveBeenCalledWith(
      'calculator_viewed',
      expect.objectContaining({ route: '/calculator' }),
    );
  });

  it('should update display on digit click', () => {
    const btn = fixture.nativeElement.querySelector('[aria-label="5"]');
    btn.click();
    fixture.detectChanges();
    const display = fixture.nativeElement.querySelector('.display-value');
    expect(display.textContent.trim()).toBe('5');
  });

  it('should perform addition via button clicks', () => {
    clickButton('2');
    clickButton('add');
    clickButton('3');
    clickButton('equals');
    fixture.detectChanges();
    expect(getDisplay()).toBe('5');
  });

  it('should show Error on division by zero', () => {
    clickButton('5');
    clickButton('divide');
    clickButton('0');
    clickButton('equals');
    fixture.detectChanges();
    const displayEl = fixture.nativeElement.querySelector('.display-value');
    expect(displayEl.textContent.trim()).toBe('Error');
    expect(displayEl.classList.contains('error')).toBe(true);
  });

  it('should fire calculation_completed analytics event', () => {
    clickButton('2');
    clickButton('add');
    clickButton('3');
    clickButton('equals');
    expect(analyticsService.trackEvent).toHaveBeenCalledWith(
      'calculation_completed',
      expect.objectContaining({ operator: '+', result: 5 }),
    );
  });

  it('should fire calculation_error analytics event on division by zero', () => {
    clickButton('5');
    clickButton('divide');
    clickButton('0');
    clickButton('equals');
    expect(analyticsService.trackEvent).toHaveBeenCalledWith(
      'calculation_error',
      expect.objectContaining({ error_type: 'division_by_zero' }),
    );
  });

  it('should clear on C button', () => {
    clickButton('5');
    clickButton('clear');
    fixture.detectChanges();
    expect(getDisplay()).toBe('0');
  });

  it('should handle keyboard digit input', () => {
    dispatchKey('3');
    fixture.detectChanges();
    expect(getDisplay()).toBe('3');
  });

  it('should handle keyboard operator input', () => {
    dispatchKey('5');
    dispatchKey('+');
    dispatchKey('3');
    dispatchKey('Enter');
    fixture.detectChanges();
    expect(getDisplay()).toBe('8');
  });

  it('should handle Escape to clear', () => {
    dispatchKey('5');
    dispatchKey('Escape');
    fixture.detectChanges();
    expect(getDisplay()).toBe('0');
  });

  it('should handle keyboard decimal', () => {
    dispatchKey('0');
    dispatchKey('.');
    dispatchKey('5');
    fixture.detectChanges();
    expect(getDisplay()).toBe('0.5');
  });

  it('should have aria-live on display', () => {
    const display = fixture.nativeElement.querySelector('.display');
    expect(display.getAttribute('aria-live')).toBe('polite');
  });

  it('should have aria-labels on all operator buttons', () => {
    const labels = ['add', 'subtract', 'multiply', 'divide', 'clear', 'equals'];
    for (const label of labels) {
      const btn = fixture.nativeElement.querySelector(`[aria-label="${label}"]`);
      expect(btn).toBeTruthy();
    }
  });

  it('0 button should span 2 columns', () => {
    const zeroBtn = fixture.nativeElement.querySelector('.btn-zero');
    expect(zeroBtn).toBeTruthy();
    expect(zeroBtn.classList.contains('btn-zero')).toBe(true);
  });

  it('should handle keyboard / for divide', () => {
    dispatchKey('8');
    dispatchKey('/');
    dispatchKey('2');
    dispatchKey('Enter');
    fixture.detectChanges();
    expect(getDisplay()).toBe('4');
  });

  it('should handle keyboard * for multiply', () => {
    dispatchKey('6');
    dispatchKey('*');
    dispatchKey('7');
    dispatchKey('Enter');
    fixture.detectChanges();
    expect(getDisplay()).toBe('42');
  });

  it('should handle keyboard - for subtract', () => {
    dispatchKey('9');
    dispatchKey('-');
    dispatchKey('4');
    dispatchKey('Enter');
    fixture.detectChanges();
    expect(getDisplay()).toBe('5');
  });

  function clickButton(ariaLabel: string): void {
    const btn = fixture.nativeElement.querySelector(`[aria-label="${ariaLabel}"]`);
    btn.click();
    fixture.detectChanges();
  }

  function getDisplay(): string {
    return fixture.nativeElement.querySelector('.display-value').textContent.trim();
  }

  function dispatchKey(key: string): void {
    const event = new KeyboardEvent('keydown', { key, bubbles: true });
    document.dispatchEvent(event);
    fixture.detectChanges();
  }
});
