import { Component, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalculatorService } from './calculator.service';
import { CalculatorState } from './calculator.model';
import { AnalyticsService } from '../shared/analytics.service';

const KEY_OPERATOR_MAP: Record<string, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [CommonModule],
  providers: [CalculatorService],
  templateUrl: './calculator.component.html',
  styleUrl: './calculator.component.css',
})
export class CalculatorComponent implements OnInit {
  private calculatorService = inject(CalculatorService);
  private analytics = inject(AnalyticsService);

  state: CalculatorState = this.calculatorService.getState();

  ngOnInit(): void {
    this.analytics.trackEvent('calculator_viewed', {
      route: '/calculator',
      timestamp: new Date().toISOString(),
    });
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    const key = event.key;

    if (key >= '0' && key <= '9') {
      this.onDigit(key);
    } else if (key in KEY_OPERATOR_MAP) {
      event.preventDefault();
      this.onOperator(KEY_OPERATOR_MAP[key]);
    } else if (key === 'Enter') {
      event.preventDefault();
      this.onEquals();
    } else if (key === 'Escape') {
      this.onClear();
    } else if (key === '.') {
      this.onDecimal();
    }
  }

  onDigit(digit: string): void {
    this.calculatorService.inputDigit(digit);
    this.updateState();
  }

  onDecimal(): void {
    this.calculatorService.inputDecimal();
    this.updateState();
  }

  onOperator(operator: string): void {
    this.calculatorService.inputOperator(operator);
    this.updateState();
  }

  onEquals(): void {
    const prevState = this.calculatorService.getState();
    if (!prevState.operator || prevState.waitingForSecondOperand) return;

    const operand1 = prevState.firstOperand;
    const operand2 = parseFloat(prevState.displayValue);
    const operator = prevState.operator;

    this.calculatorService.calculateResult();
    this.updateState();

    if (this.state.errorState) {
      this.analytics.trackEvent('calculation_error', {
        operator,
        operand1,
        operand2,
        error_type: 'division_by_zero',
      });
    } else {
      this.analytics.trackEvent('calculation_completed', {
        operator,
        operand1,
        operand2,
        result: parseFloat(this.state.displayValue),
      });
    }
  }

  onClear(): void {
    this.calculatorService.clear();
    this.updateState();
  }

  private updateState(): void {
    this.state = this.calculatorService.getState();
  }
}
