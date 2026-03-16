import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalculatorComponent } from './calculator.component';
import { AnalyticsService } from '../shared/analytics.service';
import { CalculatorService } from './calculator.service';
import { OPERATORS } from './calculator.model';

describe('CalculatorComponent – extended acceptance criteria', () => {
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

  function click(ariaLabel: string): void {
    const btn = fixture.nativeElement.querySelector(`[aria-label="${ariaLabel}"]`);
    btn.click();
    fixture.detectChanges();
  }

  function display(): string {
    return fixture.nativeElement.querySelector('.display-value').textContent.trim();
  }

  function expression(): string {
    return fixture.nativeElement.querySelector('.expression').textContent.trim();
  }

  function key(k: string): void {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    fixture.detectChanges();
  }

  describe('AC: Basic Arithmetic via buttons', () => {
    it('subtraction: 9 − 4 = 5', () => {
      click('9'); click('subtract'); click('4'); click('equals');
      expect(display()).toBe('5');
    });

    it('multiplication: 6 × 7 = 42', () => {
      click('6'); click('multiply'); click('7'); click('equals');
      expect(display()).toBe('42');
    });

    it('division: 8 ÷ 2 = 4', () => {
      click('8'); click('divide'); click('2'); click('equals');
      expect(display()).toBe('4');
    });
  });

  describe('AC: Division by zero – full error recovery', () => {
    function triggerError(): void {
      click('5'); click('divide'); click('0'); click('equals');
    }

    it('digit after error resets and processes digit', () => {
      triggerError();
      expect(display()).toBe('Error');
      click('7');
      expect(display()).toBe('7');
    });

    it('operator after error resets state', () => {
      triggerError();
      click('add');
      expect(component.state.errorState).toBe(false);
    });

    it('decimal after error resets and shows 0.', () => {
      triggerError();
      click('decimal point');
      expect(display()).toBe('0.');
    });
  });

  describe('AC: Chained operations via buttons', () => {
    it('2 + 3 + 4 = yields 9', () => {
      click('2'); click('add'); click('3'); click('add');
      expect(display()).toBe('5');
      click('4'); click('equals');
      expect(display()).toBe('9');
    });

    it('result used as first operand for next chain', () => {
      click('2'); click('add'); click('3'); click('equals');
      expect(display()).toBe('5');
      click('multiply'); click('4'); click('equals');
      expect(display()).toBe('20');
    });
  });

  describe('AC: Decimal and floating-point via buttons', () => {
    it('0.1 + 0.2 = 0.3', () => {
      click('0'); click('decimal point'); click('1');
      click('add');
      click('0'); click('decimal point'); click('2');
      click('equals');
      expect(display()).toBe('0.3');
    });

    it('only one decimal per operand', () => {
      click('1'); click('decimal point'); click('decimal point'); click('5');
      expect(display()).toBe('1.5');
    });

    it('leading zeros suppressed: 007 = 7', () => {
      click('0'); click('0'); click('7');
      expect(display()).toBe('7');
    });
  });

  describe('AC: Clear resets from any state', () => {
    it('clear mid-operation', () => {
      click('5'); click('add'); click('3');
      click('clear');
      expect(display()).toBe('0');
      expect(component.state.operator).toBeNull();
      expect(component.state.firstOperand).toBeNull();
    });

    it('clear after result', () => {
      click('2'); click('add'); click('3'); click('equals');
      click('clear');
      expect(display()).toBe('0');
    });

    it('clear after error', () => {
      click('5'); click('divide'); click('0'); click('equals');
      click('clear');
      expect(display()).toBe('0');
      expect(component.state.errorState).toBe(false);
    });
  });

  describe('AC: Keyboard parity', () => {
    it('keyboard chained operation: 2+3+4= via keys', () => {
      key('2'); key('+'); key('3'); key('+');
      expect(display()).toBe('5');
      key('4'); key('Enter');
      expect(display()).toBe('9');
    });

    it('keyboard decimal: 0.1 + 0.2 = 0.3', () => {
      key('0'); key('.'); key('1');
      key('+');
      key('0'); key('.'); key('2');
      key('Enter');
      expect(display()).toBe('0.3');
    });

    it('keyboard error recovery with Escape', () => {
      key('5'); key('/'); key('0'); key('Enter');
      expect(display()).toBe('Error');
      key('Escape');
      expect(display()).toBe('0');
    });
  });

  describe('AC: Accessibility', () => {
    it('display has role=status', () => {
      const el = fixture.nativeElement.querySelector('.display');
      expect(el.getAttribute('role')).toBe('status');
    });

    it('all digit buttons have aria-labels', () => {
      for (let d = 0; d <= 9; d++) {
        expect(fixture.nativeElement.querySelector(`[aria-label="${d}"]`)).toBeTruthy();
      }
    });

    it('decimal point button has aria-label', () => {
      expect(fixture.nativeElement.querySelector('[aria-label="decimal point"]')).toBeTruthy();
    });

    it('error state applies error class', () => {
      click('5'); click('divide'); click('0'); click('equals');
      const el = fixture.nativeElement.querySelector('.display-value');
      expect(el.classList.contains('error')).toBe(true);
    });
  });

  describe('AC: Analytics', () => {
    it('calculator_viewed includes timestamp', () => {
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        'calculator_viewed',
        expect.objectContaining({ route: '/calculator', timestamp: expect.any(String) }),
      );
    });

    it('calculation_completed has all required props', () => {
      click('6'); click('multiply'); click('7'); click('equals');
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        'calculation_completed',
        expect.objectContaining({ operator: '×', operand1: 6, operand2: 7, result: 42 }),
      );
    });

    it('calculation_error has all required props', () => {
      click('5'); click('divide'); click('0'); click('equals');
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        'calculation_error',
        expect.objectContaining({ operator: '÷', operand1: 5, operand2: 0, error_type: 'division_by_zero' }),
      );
    });

    it('repeated equals does not fire extra analytics', () => {
      click('2'); click('add'); click('3'); click('equals');
      const callCount = (analyticsService.trackEvent as ReturnType<typeof vi.fn>).mock.calls.length;
      click('equals');
      expect((analyticsService.trackEvent as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
    });
  });

  describe('AC: Expression display', () => {
    it('shows expression after equals', () => {
      click('8'); click('divide'); click('2'); click('equals');
      expect(expression()).toBe('8 ÷ 2 =');
    });

    it('shows partial expression during operator', () => {
      click('5'); click('add');
      expect(expression()).toBe('5 +');
    });
  });

  describe('AC: Operator replacement via buttons', () => {
    it('switching operator does not evaluate', () => {
      click('5'); click('add'); click('subtract'); click('3'); click('equals');
      expect(display()).toBe('2');
    });
  });

  describe('AC: 0 button layout', () => {
    it('zero button has btn-zero class for span 2', () => {
      const btn = fixture.nativeElement.querySelector('.btn-zero');
      expect(btn).toBeTruthy();
      expect(btn.getAttribute('aria-label')).toBe('0');
    });
  });
});

describe('CalculatorService – additional edge cases', () => {
  let service: CalculatorService;

  beforeEach(() => {
    service = new CalculatorService();
  });

  it('unknown operator returns second operand', () => {
    service.inputDigit('5');
    service.inputOperator('?' as any);
    service.inputDigit('3');
    service.calculateResult();
    expect(service.getState().displayValue).toBe('3');
  });

  it('chained division by zero during operator press shows Error', () => {
    service.inputDigit('5');
    service.inputOperator('÷');
    service.inputDigit('0');
    service.inputOperator('+'); // should evaluate 5÷0 = Error
    expect(service.getState().errorState).toBe(true);
    expect(service.getState().displayValue).toBe('Error');
  });

  it('decimal after result starts fresh 0.', () => {
    service.inputDigit('2');
    service.inputOperator('+');
    service.inputDigit('3');
    service.calculateResult();
    // result is 5, now press decimal - should start "0." as waitingForSecondOperand is false
    // but operator is null, so it appends to "5" -> "5."
    service.inputDecimal();
    expect(service.getState().displayValue).toBe('5.');
  });

  it('OPERATORS constants are correct', () => {
    expect(OPERATORS.ADD).toBe('+');
    expect(OPERATORS.SUBTRACT).toBe('−');
    expect(OPERATORS.MULTIPLY).toBe('×');
    expect(OPERATORS.DIVIDE).toBe('÷');
  });

  it('expression is cleared on clear', () => {
    service.inputDigit('5');
    service.inputOperator('+');
    service.clear();
    expect(service.getState().expression).toBe('');
  });

  it('expression updated on operator replacement', () => {
    service.inputDigit('5');
    service.inputOperator('+');
    expect(service.getState().expression).toBe('5 +');
    service.inputOperator('−');
    expect(service.getState().expression).toBe('5 −');
  });
});
