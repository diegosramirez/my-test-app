export enum Mood {
  HAPPY = 'HAPPY',
  SAD = 'SAD',
  ANXIOUS = 'ANXIOUS',
  CALM = 'CALM',
  EXCITED = 'EXCITED',
  NEUTRAL = 'NEUTRAL'
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: Mood;
  createdAt: Date;
  userId: string;
}