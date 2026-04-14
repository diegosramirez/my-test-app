import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { RecipeService } from './recipe.service';
import { Recipe, RecipeCategory } from '../models/recipe.interface';

describe('RecipeService', () => {
  let service: RecipeService;
  let allRecipes: Recipe[];

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [RecipeService]
    });
    service = TestBed.inject(RecipeService);

    // Get all recipes for comparison in tests
    allRecipes = await firstValueFrom(service.getRecipes());
  });

  describe('getRecipes', () => {
    it('should return all recipes as Observable', async () => {
      const recipes = await firstValueFrom(service.getRecipes());

      expect(recipes).toBeDefined();
      expect(Array.isArray(recipes)).toBe(true);
      expect(recipes.length).toBeGreaterThan(0);

      // Verify recipe structure
      const firstRecipe = recipes[0];
      expect(firstRecipe).toEqual(expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        category: expect.any(String),
        image: expect.any(String),
        ingredients: expect.any(Array),
        instructions: expect.any(Array),
        prepTime: expect.any(Number)
      }));
    });

    it('should return recipes with all required categories', async () => {
      const recipes = await firstValueFrom(service.getRecipes());
      const categories = recipes.map(r => r.category);

      expect(categories).toContain(RecipeCategory.Breakfast);
      expect(categories).toContain(RecipeCategory.Lunch);
      expect(categories).toContain(RecipeCategory.Dinner);
      expect(categories).toContain(RecipeCategory.Dessert);
    });

    it('should return recipes with valid ingredients and instructions arrays', async () => {
      const recipes = await firstValueFrom(service.getRecipes());

      recipes.forEach(recipe => {
        expect(recipe.ingredients.length).toBeGreaterThan(0);
        expect(recipe.instructions.length).toBeGreaterThan(0);
        expect(recipe.ingredients.every(ingredient => typeof ingredient === 'string')).toBe(true);
        expect(recipe.instructions.every(instruction => typeof instruction === 'string')).toBe(true);
      });
    });

    it('should return recipes with positive prep times', async () => {
      const recipes = await firstValueFrom(service.getRecipes());

      recipes.forEach(recipe => {
        expect(recipe.prepTime).toBeGreaterThan(0);
      });
    });
  });

  describe('getRecipeById', () => {
    it('should return existing recipe by id', async () => {
      const existingId = '1'; // Classic Pancakes
      const recipe = await firstValueFrom(service.getRecipeById(existingId));

      expect(recipe).toBeDefined();
      expect(recipe!.id).toBe(existingId);
      expect(recipe!.name).toBe('Classic Pancakes');
      expect(recipe!.category).toBe(RecipeCategory.Breakfast);
    });

    it('should return undefined for non-existent recipe id', async () => {
      const nonExistentId = 'non-existent-id';
      const recipe = await firstValueFrom(service.getRecipeById(nonExistentId));

      expect(recipe).toBeUndefined();
    });

    it('should return undefined for empty id', async () => {
      const recipe = await firstValueFrom(service.getRecipeById(''));

      expect(recipe).toBeUndefined();
    });

    it('should return correct recipe for each known id', async () => {
      // Test multiple known IDs
      const knownRecipes = [
        { id: '1', name: 'Classic Pancakes' },
        { id: '4', name: 'Caesar Salad' }
      ];

      for (const { id, name } of knownRecipes) {
        const recipe = await firstValueFrom(service.getRecipeById(id));
        expect(recipe).toBeDefined();
        expect(recipe!.id).toBe(id);
        expect(recipe!.name).toBe(name);
      }
    });
  });

  describe('searchRecipes', () => {
    it('should return all recipes for empty query', async () => {
      const recipes = await firstValueFrom(service.searchRecipes(''));

      expect(recipes.length).toBe(allRecipes.length);
    });

    it('should return all recipes for whitespace-only query', async () => {
      const recipes = await firstValueFrom(service.searchRecipes('   '));

      expect(recipes.length).toBe(allRecipes.length);
    });

    it('should search by recipe name (case insensitive)', async () => {
      const recipes = await firstValueFrom(service.searchRecipes('pancakes'));

      expect(recipes.length).toBe(1);
      expect(recipes[0].name).toBe('Classic Pancakes');
    });

    it('should search by recipe name (exact case)', async () => {
      const recipes = await firstValueFrom(service.searchRecipes('Pancakes'));

      expect(recipes.length).toBe(1);
      expect(recipes[0].name).toBe('Classic Pancakes');
    });

    it('should search by partial recipe name', async () => {
      const recipes = await firstValueFrom(service.searchRecipes('salad'));

      expect(recipes.length).toBeGreaterThanOrEqual(1);
      const saladRecipe = recipes.find(r => r.name === 'Caesar Salad');
      expect(saladRecipe).toBeDefined();
    });

    it('should search in ingredients list', async () => {
      const recipes = await firstValueFrom(service.searchRecipes('avocado'));

      expect(recipes.length).toBeGreaterThanOrEqual(1);
      const avocadoRecipe = recipes.find(r => r.name === 'Avocado Toast');
      expect(avocadoRecipe).toBeDefined();

      const hasAvocadoIngredient = avocadoRecipe!.ingredients.some(ingredient =>
        ingredient.toLowerCase().includes('avocado')
      );
      expect(hasAvocadoIngredient).toBe(true);
    });

    it('should search in multiple ingredients', async () => {
      const recipes = await firstValueFrom(service.searchRecipes('flour'));

      expect(recipes.length).toBeGreaterThan(0);

      // Should include recipes with flour in ingredients
      recipes.forEach(recipe => {
        const hasFlourIngredient = recipe.ingredients.some(ingredient =>
          ingredient.toLowerCase().includes('flour')
        );
        expect(hasFlourIngredient).toBe(true);
      });
    });

    it('should return empty array for query with no matches', async () => {
      const recipes = await firstValueFrom(service.searchRecipes('nonexistentingredient'));

      expect(recipes.length).toBe(0);
    });

    it('should search across name, description, and ingredients simultaneously', async () => {
      const recipes = await firstValueFrom(service.searchRecipes('eggs'));

      expect(recipes.length).toBeGreaterThan(0);

      recipes.forEach(recipe => {
        const matchesName = recipe.name.toLowerCase().includes('eggs');
        const matchesDescription = recipe.description.toLowerCase().includes('eggs');
        const matchesIngredients = recipe.ingredients.some(ingredient =>
          ingredient.toLowerCase().includes('eggs')
        );

        // Should match at least one of these
        expect(matchesName || matchesDescription || matchesIngredients).toBe(true);
      });
    });

    it('should return consistent results for same query', async () => {
      const query = 'butter';
      const firstResults = await firstValueFrom(service.searchRecipes(query));
      const secondResults = await firstValueFrom(service.searchRecipes(query));

      expect(secondResults.length).toBe(firstResults.length);
      expect(secondResults.map(r => r.id)).toEqual(firstResults.map(r => r.id));
    });
  });

  describe('filterByCategory', () => {
    it('should return all recipes for "All" category', async () => {
      const recipes = await firstValueFrom(service.filterByCategory('All'));

      expect(recipes.length).toBe(allRecipes.length);
    });

    it('should filter by Breakfast category', async () => {
      const recipes = await firstValueFrom(service.filterByCategory(RecipeCategory.Breakfast));

      expect(recipes.length).toBeGreaterThan(0);
      recipes.forEach(recipe => {
        expect(recipe.category).toBe(RecipeCategory.Breakfast);
      });

      // Verify known breakfast recipes are included
      const names = recipes.map(r => r.name);
      expect(names).toContain('Classic Pancakes');
      expect(names).toContain('Avocado Toast');
      expect(names).toContain('Scrambled Eggs');
    });

    it('should filter by Lunch category', async () => {
      const recipes = await firstValueFrom(service.filterByCategory(RecipeCategory.Lunch));

      expect(recipes.length).toBeGreaterThan(0);
      recipes.forEach(recipe => {
        expect(recipe.category).toBe(RecipeCategory.Lunch);
      });

      const names = recipes.map(r => r.name);
      expect(names).toContain('Caesar Salad');
    });

    it('should filter by Dinner category', async () => {
      const recipes = await firstValueFrom(service.filterByCategory(RecipeCategory.Dinner));

      expect(recipes.length).toBeGreaterThan(0);
      recipes.forEach(recipe => {
        expect(recipe.category).toBe(RecipeCategory.Dinner);
      });
    });

    it('should filter by Dessert category', async () => {
      const recipes = await firstValueFrom(service.filterByCategory(RecipeCategory.Dessert));

      expect(recipes.length).toBeGreaterThan(0);
      recipes.forEach(recipe => {
        expect(recipe.category).toBe(RecipeCategory.Dessert);
      });
    });

    it('should handle case sensitivity in category names', async () => {
      const recipes = await firstValueFrom(service.filterByCategory('breakfast'));

      expect(recipes.length).toBe(0); // Should not match due to case sensitivity
    });

    it('should return empty array for invalid category', async () => {
      const recipes = await firstValueFrom(service.filterByCategory('InvalidCategory'));

      expect(recipes.length).toBe(0);
    });

    it('should return consistent results for same category', async () => {
      const category = RecipeCategory.Lunch;
      const firstResults = await firstValueFrom(service.filterByCategory(category));
      const secondResults = await firstValueFrom(service.filterByCategory(category));

      expect(secondResults.length).toBe(firstResults.length);
      expect(secondResults.map(r => r.id)).toEqual(firstResults.map(r => r.id));
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle empty string category filter', async () => {
      const recipes = await firstValueFrom(service.filterByCategory(''));

      expect(recipes.length).toBe(0);
    });

    it('should maintain recipe data integrity across all operations', async () => {
      const allRecipes = await firstValueFrom(service.getRecipes());
      const searchResults = await firstValueFrom(service.searchRecipes('eggs'));
      const filteredResults = await firstValueFrom(service.filterByCategory(RecipeCategory.Breakfast));

      const allResultSets = [allRecipes, searchResults, filteredResults];
      allResultSets.forEach(results => {
        results.forEach(recipe => {
          expect(recipe.id).toBeDefined();
          expect(recipe.name).toBeDefined();
          expect(recipe.category).toBeDefined();
          expect(recipe.ingredients).toBeDefined();
          expect(recipe.instructions).toBeDefined();
          expect(recipe.prepTime).toBeDefined();
        });
      });
    });
  });
});