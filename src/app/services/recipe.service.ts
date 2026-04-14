import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Recipe, RecipeCategory } from '../models/recipe.interface';

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private readonly recipes: Recipe[] = [
    // Breakfast recipes
    {
      id: '1',
      name: 'Classic Pancakes',
      description: 'Fluffy and delicious pancakes perfect for a weekend breakfast',
      category: RecipeCategory.Breakfast,
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800',
      ingredients: [
        '2 cups all-purpose flour',
        '2 tablespoons sugar',
        '2 teaspoons baking powder',
        '1 teaspoon salt',
        '2 cups milk',
        '2 large eggs',
        '1/4 cup melted butter'
      ],
      instructions: [
        'Mix dry ingredients in a large bowl',
        'Whisk together wet ingredients separately',
        'Combine wet and dry ingredients until just mixed',
        'Cook on griddle until bubbles form, then flip',
        'Serve hot with syrup'
      ],
      prepTime: 20
    },
    {
      id: '2',
      name: 'Avocado Toast',
      description: 'Healthy and trendy breakfast with fresh avocado and toppings',
      category: RecipeCategory.Breakfast,
      image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800',
      ingredients: [
        '2 slices whole grain bread',
        '1 ripe avocado',
        '1/2 lime, juiced',
        'Salt and pepper to taste',
        'Cherry tomatoes',
        'Red pepper flakes'
      ],
      instructions: [
        'Toast bread until golden brown',
        'Mash avocado with lime juice, salt, and pepper',
        'Spread avocado mixture on toast',
        'Top with sliced tomatoes and red pepper flakes',
        'Serve immediately'
      ],
      prepTime: 10
    },
    {
      id: '3',
      name: 'Scrambled Eggs',
      description: 'Creamy and perfectly seasoned scrambled eggs',
      category: RecipeCategory.Breakfast,
      image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=800',
      ingredients: [
        '6 large eggs',
        '3 tablespoons butter',
        '2 tablespoons heavy cream',
        'Salt and pepper to taste',
        'Chives for garnish'
      ],
      instructions: [
        'Beat eggs with cream, salt, and pepper',
        'Heat butter in non-stick pan over low heat',
        'Add eggs and stir constantly with spatula',
        'Remove from heat while slightly underdone',
        'Garnish with chives and serve'
      ],
      prepTime: 8
    },

    // Lunch recipes
    {
      id: '4',
      name: 'Caesar Salad',
      description: 'Classic Caesar salad with homemade croutons and parmesan',
      category: RecipeCategory.Lunch,
      image: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=800',
      ingredients: [
        '1 head romaine lettuce',
        '1/2 cup grated parmesan cheese',
        '1/4 cup caesar dressing',
        '1 cup croutons',
        '2 anchovy fillets',
        'Black pepper to taste'
      ],
      instructions: [
        'Wash and chop romaine lettuce',
        'Toss lettuce with caesar dressing',
        'Add croutons and parmesan cheese',
        'Top with anchovy fillets',
        'Season with black pepper and serve'
      ],
      prepTime: 15
    },
    {
      id: '5',
      name: 'Grilled Chicken Sandwich',
      description: 'Juicy grilled chicken breast with fresh vegetables on ciabatta',
      category: RecipeCategory.Lunch,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
      ingredients: [
        '2 chicken breasts',
        '2 ciabatta rolls',
        '4 lettuce leaves',
        '2 tomato slices',
        '1/4 red onion, sliced',
        '2 tablespoons mayo',
        'Salt, pepper, and garlic powder'
      ],
      instructions: [
        'Season chicken with salt, pepper, and garlic powder',
        'Grill chicken until internal temp reaches 165°F',
        'Toast ciabatta rolls lightly',
        'Spread mayo on rolls',
        'Assemble sandwich with chicken, lettuce, tomato, and onion'
      ],
      prepTime: 25
    },
    {
      id: '6',
      name: 'Quinoa Bowl',
      description: 'Nutritious quinoa bowl with roasted vegetables and tahini dressing',
      category: RecipeCategory.Lunch,
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
      ingredients: [
        '1 cup quinoa',
        '2 cups vegetable broth',
        '1 cup roasted chickpeas',
        '1/2 cucumber, diced',
        '1/4 cup tahini',
        '2 tablespoons lemon juice',
        'Mixed greens'
      ],
      instructions: [
        'Cook quinoa in vegetable broth until fluffy',
        'Roast chickpeas until crispy',
        'Mix tahini with lemon juice for dressing',
        'Arrange quinoa, chickpeas, and vegetables in bowl',
        'Drizzle with tahini dressing'
      ],
      prepTime: 30
    },

    // Dinner recipes
    {
      id: '7',
      name: 'Spaghetti Bolognese',
      description: 'Traditional Italian pasta with rich meat sauce',
      category: RecipeCategory.Dinner,
      image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=800',
      ingredients: [
        '1 lb ground beef',
        '1 lb spaghetti',
        '1 onion, diced',
        '2 cloves garlic, minced',
        '1 can crushed tomatoes',
        '1/2 cup red wine',
        '2 tablespoons olive oil',
        'Parmesan cheese for serving'
      ],
      instructions: [
        'Cook spaghetti according to package directions',
        'Sauté onion and garlic in olive oil',
        'Add ground beef and cook until browned',
        'Add wine, then tomatoes and simmer 20 minutes',
        'Serve sauce over pasta with parmesan'
      ],
      prepTime: 45
    },
    {
      id: '8',
      name: 'Grilled Salmon',
      description: 'Perfectly grilled salmon with herbs and lemon',
      category: RecipeCategory.Dinner,
      image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
      ingredients: [
        '4 salmon fillets',
        '2 lemons, sliced',
        '2 tablespoons olive oil',
        '1 tablespoon fresh dill',
        '1 tablespoon fresh parsley',
        'Salt and pepper to taste'
      ],
      instructions: [
        'Preheat grill to medium-high heat',
        'Brush salmon with olive oil',
        'Season with salt, pepper, and herbs',
        'Grill 4-5 minutes per side',
        'Serve with lemon slices'
      ],
      prepTime: 20
    },
    {
      id: '9',
      name: 'Beef Stir Fry',
      description: 'Quick and flavorful beef stir fry with mixed vegetables',
      category: RecipeCategory.Dinner,
      image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
      ingredients: [
        '1 lb beef strips',
        '2 cups mixed vegetables',
        '3 cloves garlic, minced',
        '2 tablespoons soy sauce',
        '1 tablespoon oyster sauce',
        '2 tablespoons vegetable oil',
        'Green onions for garnish'
      ],
      instructions: [
        'Heat oil in wok or large skillet',
        'Stir-fry beef until browned, remove',
        'Cook vegetables until tender-crisp',
        'Return beef to pan with sauces',
        'Garnish with green onions and serve'
      ],
      prepTime: 25
    },

    // Dessert recipes
    {
      id: '10',
      name: 'Chocolate Chip Cookies',
      description: 'Classic chewy chocolate chip cookies',
      category: RecipeCategory.Dessert,
      image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800',
      ingredients: [
        '2 1/4 cups all-purpose flour',
        '1 cup butter, softened',
        '3/4 cup brown sugar',
        '1/2 cup white sugar',
        '2 large eggs',
        '2 cups chocolate chips',
        '1 teaspoon vanilla extract',
        '1 teaspoon baking soda',
        '1 teaspoon salt'
      ],
      instructions: [
        'Preheat oven to 375°F',
        'Cream butter and sugars together',
        'Beat in eggs and vanilla',
        'Mix in flour, baking soda, and salt',
        'Fold in chocolate chips',
        'Drop spoonfuls on baking sheet',
        'Bake 9-11 minutes until golden'
      ],
      prepTime: 30
    },
    {
      id: '11',
      name: 'Tiramisu',
      description: 'Classic Italian dessert with coffee-soaked ladyfingers',
      category: RecipeCategory.Dessert,
      image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800',
      ingredients: [
        '6 egg yolks',
        '3/4 cup sugar',
        '1 1/4 cups mascarpone cheese',
        '1 3/4 cups heavy cream',
        '2 packages ladyfinger cookies',
        '3/4 cup strong coffee, cooled',
        '3 tablespoons coffee liqueur',
        'Unsweetened cocoa powder for dusting'
      ],
      instructions: [
        'Whisk egg yolks and sugar until thick',
        'Add mascarpone and mix until smooth',
        'Whip cream to stiff peaks, fold into mixture',
        'Combine coffee and liqueur',
        'Dip ladyfingers in coffee mixture',
        'Layer cookies and cream mixture in dish',
        'Refrigerate 4 hours, dust with cocoa'
      ],
      prepTime: 45
    },
    {
      id: '12',
      name: 'Apple Pie',
      description: 'Traditional American apple pie with flaky crust',
      category: RecipeCategory.Dessert,
      image: 'https://images.unsplash.com/photo-1621955964441-c173e01c135b?w=800',
      ingredients: [
        '6 Granny Smith apples, sliced',
        '2 pie crusts',
        '3/4 cup sugar',
        '2 tablespoons flour',
        '1 teaspoon cinnamon',
        '1/4 teaspoon nutmeg',
        '2 tablespoons butter',
        '1 egg, beaten'
      ],
      instructions: [
        'Preheat oven to 425°F',
        'Mix apples with sugar, flour, and spices',
        'Line pie pan with bottom crust',
        'Fill with apple mixture, dot with butter',
        'Cover with top crust, seal edges',
        'Brush with beaten egg',
        'Bake 45-50 minutes until golden'
      ],
      prepTime: 75
    }
  ];

  getRecipes(): Observable<Recipe[]> {
    return of(this.recipes);
  }

  getRecipeById(id: string): Observable<Recipe | undefined> {
    const recipe = this.recipes.find(r => r.id === id);
    return of(recipe);
  }

  searchRecipes(query: string): Observable<Recipe[]> {
    if (!query.trim()) {
      return of(this.recipes);
    }

    const searchTerm = query.toLowerCase();
    const filteredRecipes = this.recipes.filter(recipe =>
      recipe.name.toLowerCase().includes(searchTerm) ||
      recipe.description.toLowerCase().includes(searchTerm) ||
      recipe.ingredients.some(ingredient => ingredient.toLowerCase().includes(searchTerm))
    );

    return of(filteredRecipes);
  }

  filterByCategory(category: string): Observable<Recipe[]> {
    if (category === 'All') {
      return of(this.recipes);
    }

    const filteredRecipes = this.recipes.filter(recipe =>
      recipe.category === category
    );

    return of(filteredRecipes);
  }
}