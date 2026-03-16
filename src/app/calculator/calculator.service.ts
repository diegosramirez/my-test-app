import { Injectable } from '@angular/core';
import { CalculatorState, OPERATORS } from './calculator.model';

@Injectable()
export class CalculatorService {
  private state: CalculatorState = this.initialState();

  private initialState(): CalculatorState {
    return {
      displayValue: '0',
      firstOperand: null,
      operator: null,
      waitingForSecondOperand: false,
      errorState: false,
      expression: '',
    };
  }

  getState(): CalculatorState {
    return { ...this.state };
  }

  clear(): void {
    this.state = this.initialState();
  }

  inputDigit(digit: string): void {
    if (this.state.errorState) {
      this.clear();
    }

    if (this.state.waitingForSecondOperand) {
      this.state.displayValue = digit;
      this.state.waitingForSecondOperand = false;
    } else {
      this.state.displayValue =
        this.state.displayValue === '0' ? digit : this.state.displayValue + digit;
    }
  }

  inputDecimal(): void {
    if (this.state.errorState) {
      this.clear();
    }

    if (this.state.waitingForSecondOperand) {
      this.state.displayValue = '0.';
      this.state.waitingForSecondOperand = false;
      return;
    }

    if (!this.state.displayValue.includes('.')) {
      this.state.displayValue += '.';
    }
  }

  inputOperator(nextOperator: string): void {
    if (this.state.errorState) {
      this.clear();
      // After error recovery, treat current display '0' as first operand
      this.state.firstOperand = 0;
      this.state.waitingForSecondOperand = true;
      this.state.operator = nextOperator;
      this.state.expression = `${this.formatNumber(0)} ${nextOperator}`;
      return;
    }

    const inputValue = parseFloat(this.state.displayValue);

    // Operator replacement: if waiting for second operand, just swap operator
    if (this.state.operator && this.state.waitingForSecondOperand) {
      this.state.operator = nextOperator;
      this.state.expression = `${this.formatNumber(this.state.firstOperand!)} ${nextOperator}`;
      return;
    }

    // Chained operation: evaluate pending operation first
    if (this.state.firstOperand !== null && this.state.operator) {
      const result = this.performCalculation(
        this.state.firstOperand,
        inputValue,
        this.state.operator,
      );

      if (result === null) {
        this.state.displayValue = 'Error';
        this.state.errorState = true;
        this.state.firstOperand = null;
        this.state.operator = null;
        this.state.waitingForSecondOperand = false;
        this.state.expression = '';
        return;
      }

      this.state.displayValue = this.formatNumber(result);
      this.state.firstOperand = result;
    } else {
      this.state.firstOperand = inputValue;
    }

    this.state.waitingForSecondOperand = true;
    this.state.operator = nextOperator;
    this.state.expression = `${this.formatNumber(this.state.firstOperand!)} ${nextOperator}`;
  }

  calculateResult(): void {
    // No-op if no pending operator or still waiting for second operand
    if (!this.state.operator || this.state.waitingForSecondOperand) {
      return;
    }

    const inputValue = parseFloat(this.state.displayValue);
    const firstOperand = this.state.firstOperand!;

    this.state.expression = `${this.formatNumber(firstOperand)} ${this.state.operator} ${this.state.displayValue} =`;

    const result = this.performCalculation(firstOperand, inputValue, this.state.operator);

    if (result === null) {
      this.state.displayValue = 'Error';
      this.state.errorState = true;
      this.state.firstOperand = null;
      this.state.operator = null;
      this.state.waitingForSecondOperand = false;
      return;
    }

    this.state.displayValue = this.formatNumber(result);
    this.state.firstOperand = result;
    this.state.operator = null;
    this.state.waitingForSecondOperand = false;
  }

  private performCalculation(
    first: number,
    second: number,
    operator: string,
  ): number | null {
    switch (operator) {
      case OPERATORS.ADD:
        return this.cleanFloat(first + second);
      case OPERATORS.SUBTRACT:
        return this.cleanFloat(first - second);
      case OPERATORS.MULTIPLY:
        return this.cleanFloat(first * second);
      case OPERATORS.DIVIDE:
        if (second === 0) return null;
        return this.cleanFloat(first / second);
      default:
        return second;
    }
  }

  private cleanFloat(value: number): number {
    return parseFloat(value.toPrecision(12));
  }

  private formatNumber(value: number): string {
    const str = String(value);
    if (str.length > 16) {
      return value.toExponential();
    }
    return str;
  }
}
