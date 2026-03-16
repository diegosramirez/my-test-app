import { describe, it, expect, beforeEach } from 'vitest';
import { CalculatorService } from './calculator.service';

describe('CalculatorService', () => {
  let service: CalculatorService;

  beforeEach(() => {
    service = new CalculatorService();
  });

  describe('initial state', () => {
    it('should display 0', () => {
      expect(service.getState().displayValue).toBe('0');
    });

    it('should have no operator or operand', () => {
      const s = service.getState();
      expect(s.firstOperand).toBeNull();
      expect(s.operator).toBeNull();
      expect(s.errorState).toBe(false);
    });
  });

  describe('inputDigit', () => {
    it('should replace initial 0', () => {
      service.inputDigit('5');
      expect(service.getState().displayValue).toBe('5');
    });

    it('should append digits', () => {
      service.inputDigit('1');
      service.inputDigit('2');
      service.inputDigit('3');
      expect(service.getState().displayValue).toBe('123');
    });

    it('should suppress leading zeros', () => {
      service.inputDigit('0');
      service.inputDigit('0');
      service.inputDigit('7');
      expect(service.getState().displayValue).toBe('7');
    });

    it('should replace display when waiting for second operand', () => {
      service.inputDigit('5');
      service.inputOperator('+');
      service.inputDigit('3');
      expect(service.getState().displayValue).toBe('3');
    });
  });

  describe('inputDecimal', () => {
    it('should append decimal to 0', () => {
      service.inputDecimal();
      expect(service.getState().displayValue).toBe('0.');
    });

    it('should not allow double decimal', () => {
      service.inputDecimal();
      service.inputDecimal();
      expect(service.getState().displayValue).toBe('0.');
    });

    it('should start with 0. when waiting for second operand', () => {
      service.inputDigit('5');
      service.inputOperator('+');
      service.inputDecimal();
      expect(service.getState().displayValue).toBe('0.');
    });
  });

  describe('basic arithmetic', () => {
    it('addition: 2 + 3 = 5', () => {
      service.inputDigit('2');
      service.inputOperator('+');
      service.inputDigit('3');
      service.calculateResult();
      expect(service.getState().displayValue).toBe('5');
    });

    it('subtraction: 9 − 4 = 5', () => {
      service.inputDigit('9');
      service.inputOperator('−');
      service.inputDigit('4');
      service.calculateResult();
      expect(service.getState().displayValue).toBe('5');
    });

    it('multiplication: 6 × 7 = 42', () => {
      service.inputDigit('6');
      service.inputOperator('×');
      service.inputDigit('7');
      service.calculateResult();
      expect(service.getState().displayValue).toBe('42');
    });

    it('division: 8 ÷ 2 = 4', () => {
      service.inputDigit('8');
      service.inputOperator('÷');
      service.inputDigit('2');
      service.calculateResult();
      expect(service.getState().displayValue).toBe('4');
    });
  });

  describe('division by zero', () => {
    it('should display Error', () => {
      service.inputDigit('5');
      service.inputOperator('÷');
      service.inputDigit('0');
      service.calculateResult();
      const s = service.getState();
      expect(s.displayValue).toBe('Error');
      expect(s.errorState).toBe(true);
    });
  });

  describe('error recovery', () => {
    function enterError(): void {
      service.inputDigit('5');
      service.inputOperator('÷');
      service.inputDigit('0');
      service.calculateResult();
    }

    it('should recover from digit input', () => {
      enterError();
      service.inputDigit('3');
      expect(service.getState().displayValue).toBe('3');
      expect(service.getState().errorState).toBe(false);
    });

    it('should recover from operator input', () => {
      enterError();
      service.inputOperator('+');
      const s = service.getState();
      expect(s.errorState).toBe(false);
      expect(s.displayValue).toBe('0');
    });

    it('should recover from decimal input', () => {
      enterError();
      service.inputDecimal();
      expect(service.getState().displayValue).toBe('0.');
      expect(service.getState().errorState).toBe(false);
    });
  });

  describe('chained operations', () => {
    it('2 + 3 + 4 = should yield 9', () => {
      service.inputDigit('2');
      service.inputOperator('+');
      service.inputDigit('3');
      service.inputOperator('+');
      expect(service.getState().displayValue).toBe('5');
      service.inputDigit('4');
      service.calculateResult();
      expect(service.getState().displayValue).toBe('9');
    });

    it('chained division by zero shows Error', () => {
      service.inputDigit('6');
      service.inputOperator('+');
      service.inputDigit('0');
      service.inputOperator('÷');
      // 6+0=6, then ÷
      service.inputDigit('0');
      service.calculateResult();
      expect(service.getState().displayValue).toBe('Error');
    });
  });

  describe('operator replacement', () => {
    it('should replace operator without evaluating', () => {
      service.inputDigit('5');
      service.inputOperator('+');
      service.inputOperator('−');
      service.inputDigit('3');
      service.calculateResult();
      expect(service.getState().displayValue).toBe('2');
    });
  });

  describe('repeated equals', () => {
    it('should be a no-op when no operator is pending', () => {
      service.inputDigit('5');
      service.inputOperator('+');
      service.inputDigit('3');
      service.calculateResult();
      expect(service.getState().displayValue).toBe('8');
      service.calculateResult();
      expect(service.getState().displayValue).toBe('8');
    });
  });

  describe('floating-point precision', () => {
    it('0.1 + 0.2 = 0.3', () => {
      service.inputDigit('0');
      service.inputDecimal();
      service.inputDigit('1');
      service.inputOperator('+');
      service.inputDigit('0');
      service.inputDecimal();
      service.inputDigit('2');
      service.calculateResult();
      expect(service.getState().displayValue).toBe('0.3');
    });
  });

  describe('negative results', () => {
    it('should display negative numbers', () => {
      service.inputDigit('3');
      service.inputOperator('−');
      service.inputDigit('5');
      service.calculateResult();
      expect(service.getState().displayValue).toBe('-2');
    });
  });

  describe('large numbers', () => {
    it('should handle large multiplication', () => {
      // 999999999 × 999999999
      for (let i = 0; i < 9; i++) service.inputDigit('9');
      service.inputOperator('×');
      for (let i = 0; i < 9; i++) service.inputDigit('9');
      service.calculateResult();
      const val = service.getState().displayValue;
      expect(parseFloat(val)).toBeCloseTo(999999998000000001, -3);
    });
  });

  describe('clear', () => {
    it('should reset all state', () => {
      service.inputDigit('5');
      service.inputOperator('+');
      service.inputDigit('3');
      service.clear();
      const s = service.getState();
      expect(s.displayValue).toBe('0');
      expect(s.firstOperand).toBeNull();
      expect(s.operator).toBeNull();
      expect(s.waitingForSecondOperand).toBe(false);
      expect(s.errorState).toBe(false);
    });

    it('should reset from error state', () => {
      service.inputDigit('5');
      service.inputOperator('÷');
      service.inputDigit('0');
      service.calculateResult();
      service.clear();
      expect(service.getState().displayValue).toBe('0');
      expect(service.getState().errorState).toBe(false);
    });
  });

  describe('result as first operand', () => {
    it('should use result for next operation', () => {
      service.inputDigit('2');
      service.inputOperator('+');
      service.inputDigit('3');
      service.calculateResult();
      service.inputOperator('×');
      service.inputDigit('2');
      service.calculateResult();
      expect(service.getState().displayValue).toBe('10');
    });
  });

  describe('expression tracking', () => {
    it('should show expression on equals', () => {
      service.inputDigit('8');
      service.inputOperator('÷');
      service.inputDigit('2');
      service.calculateResult();
      expect(service.getState().expression).toBe('8 ÷ 2 =');
    });
  });
});
