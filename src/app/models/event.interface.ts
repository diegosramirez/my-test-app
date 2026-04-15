export interface Event {
  id: string;
  title: string;
  date: Date;
  location?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}