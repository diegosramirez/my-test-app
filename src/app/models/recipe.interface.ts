export enum RecipeCategory {
  Breakfast = 'Breakfast',
  Lunch = 'Lunch',
  Dinner = 'Dinner',
  Dessert = 'Dessert'
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: RecipeCategory;
  image: string;
  ingredients: string[];
  instructions: string[];
  prepTime: number; // in minutes
}

export interface SearchFilters {
  query: string;
  category: RecipeCategory | 'All';
}