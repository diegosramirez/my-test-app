export interface Command {
  id: string;
  label: string;
  category: 'navigation' | 'action';
  icon?: string;
  shortcutHint?: string;
  keywords: string[];
  execute: () => void;
}

export interface ScoredCommand {
  command: Command;
  score: number;
}
