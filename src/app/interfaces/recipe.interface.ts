export interface Recipe {
  id: string;
  name: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'dessert' | 'appetizer';
  ingredients: string[];
  steps: string[];
  image: string;
}