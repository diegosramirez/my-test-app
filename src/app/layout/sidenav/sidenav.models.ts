export type SidenavMode = 'over' | 'push' | 'side';

export interface SidenavState {
  isOpen: boolean;
  mode: SidenavMode;
  breakpoint: 'mobile' | 'desktop';
}
