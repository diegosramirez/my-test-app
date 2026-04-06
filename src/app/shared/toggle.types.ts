export interface ToggleChangeEvent {
  checked: boolean;
  trigger: 'user' | 'programmatic';
}

export interface ToggleEvent {
  component_id: string;
  timestamp: number;
  event_type: 'init' | 'state_changed' | 'animation_complete' | 'keyboard_used';
  payload: {
    initial_state?: boolean;
    new_state?: boolean;
    trigger_type?: string;
    duration_ms?: number;
    key_pressed?: string;
  };
}

export type ToggleSize = 'small' | 'medium' | 'large';

export interface ToggleConfig {
  isChecked: boolean;
  disabled: boolean;
  size: ToggleSize;
  componentId?: string;
  showLabels?: boolean;
}