export interface CalculatorState {
  displayValue: string;
  firstOperand: number | null;
  operator: string | null;
  waitingForSecondOperand: boolean;
  errorState: boolean;
  expression: string;
}

export const OPERATORS = {
  ADD: '+',
  SUBTRACT: '−',
  MULTIPLY: '×',
  DIVIDE: '÷',
} as const;

export type Operator = (typeof OPERATORS)[keyof typeof OPERATORS];
