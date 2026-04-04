/**
 * Type definitions for the Counter component
 */

/**
 * Counter action types
 */
export type CounterAction = 'increment' | 'decrement' | 'reset';

/**
 * Counter interaction method
 */
export type InteractionMethod = 'click' | 'keyboard';

/**
 * Counter component configuration interface
 */
export interface CounterConfig {
  /** Initial value for the counter */
  initialValue?: number;
  /** Step size for increment/decrement operations */
  step?: number;
  /** Minimum allowed value */
  minValue?: number;
  /** Maximum allowed value */
  maxValue?: number;
}

/**
 * Counter event data interface
 */
export interface CounterEventData {
  action: CounterAction;
  oldValue: number;
  newValue: number;
  interactionMethod: InteractionMethod;
  timestamp: number;
}

/**
 * Counter button configuration
 */
export interface CounterButton {
  action: CounterAction;
  label: string;
  ariaLabel: string;
  className: string;
}