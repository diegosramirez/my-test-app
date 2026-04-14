import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Recipe } from '../interfaces/recipe.interface';

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private readonly recipes: Recipe[] = [
    // Breakfast recipes
    {
      id: '1',
      name: 'Classic Pancakes',
      category: 'breakfast',
      ingredients: ['2 cups flour', '2 eggs', '1.5 cups milk', '2 tbsp sugar', '2 tsp baking powder', '1 tsp salt', '3 tbsp melted butter'],
      steps: ['Mix dry ingredients in a bowl', 'In another bowl, whisk eggs, milk, and melted butter', 'Combine wet and dry ingredients', 'Cook pancakes on griddle until golden brown'],
      image: 'https://via.placeholder.com/300x200?text=Classic+Pancakes'
    },
    {
      id: '2',
      name: 'Avocado Toast',
      category: 'breakfast',
      ingredients: ['2 slices whole grain bread', '1 ripe avocado', '1 tbsp lemon juice', 'Salt and pepper to taste', 'Red pepper flakes (optional)'],
      steps: ['Toast bread slices', 'Mash avocado with lemon juice', 'Spread avocado on toast', 'Season with salt, pepper, and red pepper flakes'],
      image: 'https://via.placeholder.com/300x200?text=Avocado+Toast'
    },
    {
      id: '3',
      name: 'Scrambled Eggs',
      category: 'breakfast',
      ingredients: ['3 eggs', '2 tbsp butter', '2 tbsp milk', 'Salt and pepper to taste', 'Chives for garnish'],
      steps: ['Beat eggs with milk, salt, and pepper', 'Heat butter in non-stick pan', 'Pour in egg mixture and stir gently', 'Cook until just set, garnish with chives'],
      image: 'https://via.placeholder.com/300x200?text=Scrambled+Eggs'
    },
    // Lunch recipes
    {
      id: '4',
      name: 'Caesar Salad',
      category: 'lunch',
      ingredients: ['1 head romaine lettuce', '1/2 cup parmesan cheese', '1/4 cup croutons', '2 tbsp caesar dressing', '1 lemon'],
      steps: ['Wash and chop romaine lettuce', 'Add croutons and parmesan cheese', 'Drizzle with caesar dressing', 'Toss well and serve with lemon wedges'],
      image: 'https://via.placeholder.com/300x200?text=Caesar+Salad'
    },
    {
      id: '5',
      name: 'Grilled Chicken Sandwich',
      category: 'lunch',
      ingredients: ['2 chicken breasts', '2 sandwich buns', '2 lettuce leaves', '2 tomato slices', '2 tbsp mayo', 'Salt and pepper'],
      steps: ['Season and grill chicken breasts', 'Toast sandwich buns', 'Spread mayo on buns', 'Assemble with lettuce, tomato, and chicken'],
      image: 'https://via.placeholder.com/300x200?text=Grilled+Chicken+Sandwich'
    },
    {
      id: '6',
      name: 'Quinoa Bowl',
      category: 'lunch',
      ingredients: ['1 cup cooked quinoa', '1/2 cup black beans', '1/4 avocado sliced', '1/4 cup corn', '2 tbsp salsa', '1 tbsp lime juice'],
      steps: ['Cook quinoa according to package directions', 'Warm black beans', 'Arrange quinoa in bowl', 'Top with beans, avocado, corn, and salsa', 'Drizzle with lime juice'],
      image: 'https://via.placeholder.com/300x200?text=Quinoa+Bowl'
    },
    // Dinner recipes
    {
      id: '7',
      name: 'Spaghetti Carbonara',
      category: 'dinner',
      ingredients: ['12 oz spaghetti', '4 oz pancetta', '3 egg yolks', '1/2 cup parmesan cheese', '2 cloves garlic', 'Black pepper'],
      steps: ['Cook spaghetti according to package directions', 'Cook pancetta until crispy', 'Whisk egg yolks with parmesan', 'Toss hot pasta with pancetta and egg mixture', 'Season with black pepper'],
      image: 'https://via.placeholder.com/300x200?text=Spaghetti+Carbonara'
    },
    {
      id: '8',
      name: 'Grilled Salmon',
      category: 'dinner',
      ingredients: ['4 salmon fillets', '2 tbsp olive oil', '1 lemon', '2 cloves garlic minced', 'Fresh dill', 'Salt and pepper'],
      steps: ['Preheat grill to medium-high heat', 'Brush salmon with olive oil and garlic', 'Season with salt and pepper', 'Grill for 6-8 minutes per side', 'Serve with lemon and dill'],
      image: 'https://via.placeholder.com/300x200?text=Grilled+Salmon'
    },
    {
      id: '9',
      name: 'Beef Stir Fry',
      category: 'dinner',
      ingredients: ['1 lb beef strips', '2 cups mixed vegetables', '3 tbsp soy sauce', '2 tbsp vegetable oil', '1 tbsp cornstarch', '2 cloves garlic'],
      steps: ['Heat oil in wok or large skillet', 'Add beef and cook until browned', 'Add vegetables and garlic', 'Stir in soy sauce and cornstarch', 'Cook until vegetables are tender'],
      image: 'https://via.placeholder.com/300x200?text=Beef+Stir+Fry'
    },
    // Dessert recipes
    {
      id: '10',
      name: 'Chocolate Chip Cookies',
      category: 'dessert',
      ingredients: ['2 cups flour', '1 tsp baking soda', '1 cup butter', '3/4 cup brown sugar', '1/4 cup white sugar', '2 eggs', '2 cups chocolate chips'],
      steps: ['Preheat oven to 375°F', 'Cream butter and sugars', 'Beat in eggs', 'Mix in flour and baking soda', 'Fold in chocolate chips', 'Bake for 9-11 minutes'],
      image: 'https://via.placeholder.com/300x200?text=Chocolate+Chip+Cookies'
    },
    {
      id: '11',
      name: 'Vanilla Ice Cream',
      category: 'dessert',
      ingredients: ['2 cups heavy cream', '1 cup milk', '3/4 cup sugar', '6 egg yolks', '2 tsp vanilla extract', 'Pinch of salt'],
      steps: ['Heat cream and milk in saucepan', 'Whisk egg yolks with sugar', 'Temper egg mixture with hot cream', 'Cook until custard coats spoon', 'Stir in vanilla and chill', 'Churn in ice cream maker'],
      image: 'https://via.placeholder.com/300x200?text=Vanilla+Ice+Cream'
    },
    {
      id: '12',
      name: 'Apple Pie',
      category: 'dessert',
      ingredients: ['2 pie crusts', '6 apples sliced', '1/2 cup sugar', '2 tbsp flour', '1 tsp cinnamon', '2 tbsp butter', '1 egg for wash'],
      steps: ['Preheat oven to 425°F', 'Mix apples with sugar, flour, and cinnamon', 'Place filling in bottom crust', 'Dot with butter and cover with top crust', 'Brush with egg wash', 'Bake for 45-50 minutes'],
      image: 'https://via.placeholder.com/300x200?text=Apple+Pie'
    }
  ];

  private readonly favoriteKey = 'recipe-favorites';

  constructor() { }

  getRecipes(): Observable<Recipe[]> {
    return of([...this.recipes]);
  }

  searchRecipes(query: string): Observable<Recipe[]> {
    if (!query || query.trim().length < 2) {
      return this.getRecipes();
    }

    const searchTerm = query.toLowerCase().trim();
    const filtered = this.recipes.filter(recipe =>
      recipe.name.toLowerCase().includes(searchTerm) ||
      recipe.ingredients.some(ingredient =>
        ingredient.toLowerCase().includes(searchTerm)
      )
    );

    return of(filtered);
  }

  filterByCategory(category: string): Observable<Recipe[]> {
    if (!category || category === 'all') {
      return this.getRecipes();
    }

    const filtered = this.recipes.filter(recipe =>
      recipe.category === category.toLowerCase()
    );

    return of(filtered);
  }

  getRecipeById(id: string): Observable<Recipe | null> {
    const recipe = this.recipes.find(r => r.id === id);
    return of(recipe || null);
  }

  getFavorites(): string[] {
    try {
      const favorites = localStorage.getItem(this.favoriteKey);
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      console.error('Error reading favorites from localStorage:', error);
      return [];
    }
  }

  addFavorite(id: string): boolean {
    try {
      const favoritesJson = localStorage.getItem(this.favoriteKey);
      const favorites = favoritesJson ? JSON.parse(favoritesJson) : [];
      if (!favorites.includes(id)) {
        favorites.push(id);
        localStorage.setItem(this.favoriteKey, JSON.stringify(favorites));
      }
      return true;
    } catch (error) {
      console.error('Error adding favorite to localStorage:', error);
      return false;
    }
  }

  removeFavorite(id: string): boolean {
    try {
      const favoritesJson = localStorage.getItem(this.favoriteKey);
      const favorites = favoritesJson ? JSON.parse(favoritesJson) : [];
      const updatedFavorites = favorites.filter((favId: string) => favId !== id);
      localStorage.setItem(this.favoriteKey, JSON.stringify(updatedFavorites));
      return true;
    } catch (error) {
      console.error('Error removing favorite from localStorage:', error);
      return false;
    }
  }

  isFavorite(id: string): boolean {
    const favorites = this.getFavorites();
    return favorites.includes(id);
  }
}