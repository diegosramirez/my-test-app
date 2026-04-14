import { TestBed } from '@angular/core/testing';
import { RecipeService } from './recipe.service';
import { Recipe } from '../interfaces/recipe.interface';

describe('RecipeService', () => {
  let service: RecipeService;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return mockLocalStorage[key] || null;
    });

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });

    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete mockLocalStorage[key];
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(RecipeService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Recipe Operations', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should return all recipes when getRecipes is called', () => {
      return new Promise<void>((resolve) => {
        service.getRecipes().subscribe(recipes => {
          expect(recipes).toHaveLength(12);
          expect(recipes[0]).toEqual(expect.objectContaining({
            id: '1',
            name: 'Classic Pancakes',
            category: 'breakfast'
          }));
          resolve();
        });
      });
    });

    it('should return recipes array copy (not reference)', () => {
      return new Promise<void>((resolve) => {
        service.getRecipes().subscribe(recipes => {
          const originalLength = recipes.length;
          recipes.push({} as Recipe); // Modify returned array

          service.getRecipes().subscribe(secondCall => {
            expect(secondCall).toHaveLength(originalLength); // Should be unchanged
            resolve();
          });
        });
      });
    });

    it('should get recipe by valid ID', () => {
      return new Promise<void>((resolve) => {
        service.getRecipeById('1').subscribe(recipe => {
          expect(recipe).toEqual(expect.objectContaining({
            id: '1',
            name: 'Classic Pancakes',
            category: 'breakfast'
          }));
          resolve();
        });
      });
    });

    it('should return null for invalid recipe ID', () => {
      return new Promise<void>((resolve) => {
        service.getRecipeById('invalid-id').subscribe(recipe => {
          expect(recipe).toBeNull();
          resolve();
        });
      });
    });

    it('should return null for empty ID', () => {
      return new Promise<void>((resolve) => {
        service.getRecipeById('').subscribe(recipe => {
        expect(recipe).toBeNull();
        resolve();
        });
      });
    });
  });

  describe('Search Functionality', () => {
    it('should return all recipes for empty search query', () => {
      return new Promise<void>((resolve) => {
        service.searchRecipes('').subscribe(recipes => {
        expect(recipes).toHaveLength(12);
        resolve();
        });
      });
    });

    it('should return all recipes for whitespace-only query', () => {
      return new Promise<void>((resolve) => {
        service.searchRecipes('   ').subscribe(recipes => {
        expect(recipes).toHaveLength(12);
        resolve();
        });
      });
    });

    it('should return all recipes for single character query', () => {
      return new Promise<void>((resolve) => {
        service.searchRecipes('a').subscribe(recipes => {
        expect(recipes).toHaveLength(12);
        resolve();
        });
      });
    });

    it('should search recipes by name (case insensitive)', () => {
      return new Promise<void>((resolve) => {
        service.searchRecipes('pancakes').subscribe(recipes => {
        expect(recipes).toHaveLength(1);
        expect(recipes[0].name).toBe('Classic Pancakes');
        resolve();
        });
      });
    });

    it('should search recipes by name (uppercase)', () => {
      return new Promise<void>((resolve) => {
        service.searchRecipes('PANCAKES').subscribe(recipes => {
        expect(recipes).toHaveLength(1);
        expect(recipes[0].name).toBe('Classic Pancakes');
        resolve();
        });
      });
    });

    it('should search recipes by partial name match', () => {
      return new Promise<void>((resolve) => {
        service.searchRecipes('choco').subscribe(recipes => {
        expect(recipes).toHaveLength(1);
        expect(recipes[0].name).toBe('Chocolate Chip Cookies');
        resolve();
        });
      });
    });

    it('should search recipes by ingredient', () => {
      return new Promise<void>((resolve) => {
        service.searchRecipes('avocado').subscribe(recipes => {
        expect(recipes).toHaveLength(2); // Avocado Toast and Quinoa Bowl
        const names = recipes.map(r => r.name);
        expect(names).toContain('Avocado Toast');
        expect(names).toContain('Quinoa Bowl');
        resolve();
        });
      });
    });

    it('should search recipes by ingredient (case insensitive)', () => {
      return new Promise<void>((resolve) => {
        service.searchRecipes('EGGS').subscribe(recipes => {
        expect(recipes.length).toBeGreaterThan(0);
        const hasEggIngredient = recipes.some(recipe =>
          recipe.ingredients.some(ingredient =>
            ingredient.toLowerCase().includes('egg')
          )
        );
        expect(hasEggIngredient).toBe(true);
        resolve();
        });
      });
    });

    it('should return empty array for non-matching search', () => {
      return new Promise<void>((resolve) => {
        service.searchRecipes('nonexistent').subscribe(recipes => {
        expect(recipes).toHaveLength(0);
        resolve();
        });
      });
    });

    it('should handle search query with leading/trailing spaces', () => {
      return new Promise<void>((resolve) => {
        service.searchRecipes('  pancakes  ').subscribe(recipes => {
        expect(recipes).toHaveLength(1);
        expect(recipes[0].name).toBe('Classic Pancakes');
        resolve();
        });
      });
    });
  });

  describe('Category Filtering', () => {
    it('should return all recipes for "all" category', () => {
      return new Promise<void>((resolve) => {
        service.filterByCategory('all').subscribe(recipes => {
        expect(recipes).toHaveLength(12);
        resolve();
        });
      });
    });

    it('should return all recipes for empty category', () => {
      return new Promise<void>((resolve) => {
        service.filterByCategory('').subscribe(recipes => {
        expect(recipes).toHaveLength(12);
        resolve();
        });
      });
    });

    it('should filter recipes by breakfast category', () => {
      return new Promise<void>((resolve) => {
        service.filterByCategory('breakfast').subscribe(recipes => {
        expect(recipes).toHaveLength(3);
        recipes.forEach(recipe => {
          expect(recipe.category).toBe('breakfast');
        });
        resolve();
        });
      });
    });

    it('should filter recipes by lunch category', () => {
      return new Promise<void>((resolve) => {
        service.filterByCategory('lunch').subscribe(recipes => {
        expect(recipes).toHaveLength(3);
        recipes.forEach(recipe => {
          expect(recipe.category).toBe('lunch');
        });
        resolve();
        });
      });
    });

    it('should filter recipes by dinner category', () => {
      return new Promise<void>((resolve) => {
        service.filterByCategory('dinner').subscribe(recipes => {
        expect(recipes).toHaveLength(3);
        recipes.forEach(recipe => {
          expect(recipe.category).toBe('dinner');
        });
        resolve();
        });
      });
    });

    it('should filter recipes by dessert category', () => {
      return new Promise<void>((resolve) => {
        service.filterByCategory('dessert').subscribe(recipes => {
        expect(recipes).toHaveLength(3);
        recipes.forEach(recipe => {
          expect(recipe.category).toBe('dessert');
        });
        resolve();
        });
      });
    });

    it('should handle category filter case insensitively', () => {
      return new Promise<void>((resolve) => {
        service.filterByCategory('BREAKFAST').subscribe(recipes => {
        expect(recipes).toHaveLength(3);
        recipes.forEach(recipe => {
          expect(recipe.category).toBe('breakfast');
        });
        resolve();
        });
      });
    });

    it('should return empty array for non-existent category', () => {
      return new Promise<void>((resolve) => {
        service.filterByCategory('nonexistent').subscribe(recipes => {
        expect(recipes).toHaveLength(0);
        resolve();
        });
      });
    });
  });

  describe('Favorites Management', () => {
    describe('getFavorites', () => {
      it('should return empty array when no favorites exist', () => {
        const favorites = service.getFavorites();
        expect(favorites).toEqual([]);
      });

      it('should return stored favorites', () => {
        mockLocalStorage['recipe-favorites'] = JSON.stringify(['1', '2', '3']);
        const favorites = service.getFavorites();
        expect(favorites).toEqual(['1', '2', '3']);
      });

      it('should handle corrupted localStorage data', () => {
        mockLocalStorage['recipe-favorites'] = 'invalid-json';
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const favorites = service.getFavorites();
        expect(favorites).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith('Error reading favorites from localStorage:', expect.any(Error));

        consoleSpy.mockRestore();
      });

      it('should handle localStorage access errors', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
          throw new Error('localStorage access denied');
        });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const favorites = service.getFavorites();
        expect(favorites).toEqual([]);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    describe('addFavorite', () => {
      it('should add new favorite successfully', () => {
        const result = service.addFavorite('1');
        expect(result).toBe(true);
        expect(mockLocalStorage['recipe-favorites']).toBe('["1"]');
      });

      it('should not duplicate existing favorites', () => {
        service.addFavorite('1');
        service.addFavorite('1');

        expect(mockLocalStorage['recipe-favorites']).toBe('["1"]');
      });

      it('should add multiple favorites', () => {
        service.addFavorite('1');
        service.addFavorite('2');
        service.addFavorite('3');

        const favorites = JSON.parse(mockLocalStorage['recipe-favorites']);
        expect(favorites).toEqual(['1', '2', '3']);
      });

      it('should handle localStorage write errors', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
          throw new Error('localStorage quota exceeded');
        });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const result = service.addFavorite('1');
        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Error adding favorite to localStorage:', expect.any(Error));

        consoleSpy.mockRestore();
      });

      it('should handle localStorage getItem errors during add', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
          throw new Error('localStorage read error');
        });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const result = service.addFavorite('1');
        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    describe('removeFavorite', () => {
      beforeEach(() => {
        mockLocalStorage['recipe-favorites'] = JSON.stringify(['1', '2', '3']);
      });

      it('should remove existing favorite successfully', () => {
        const result = service.removeFavorite('2');
        expect(result).toBe(true);

        const favorites = JSON.parse(mockLocalStorage['recipe-favorites']);
        expect(favorites).toEqual(['1', '3']);
      });

      it('should handle removing non-existent favorite', () => {
        const result = service.removeFavorite('99');
        expect(result).toBe(true);

        const favorites = JSON.parse(mockLocalStorage['recipe-favorites']);
        expect(favorites).toEqual(['1', '2', '3']);
      });

      it('should handle localStorage write errors during remove', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
          throw new Error('localStorage write error');
        });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const result = service.removeFavorite('1');
        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Error removing favorite from localStorage:', expect.any(Error));

        consoleSpy.mockRestore();
      });

      it('should handle localStorage read errors during remove', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
          throw new Error('localStorage read error');
        });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const result = service.removeFavorite('1');
        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    describe('isFavorite', () => {
      it('should return false when no favorites exist', () => {
        expect(service.isFavorite('1')).toBe(false);
      });

      it('should return true for existing favorite', () => {
        mockLocalStorage['recipe-favorites'] = JSON.stringify(['1', '2', '3']);
        expect(service.isFavorite('2')).toBe(true);
      });

      it('should return false for non-existing favorite', () => {
        mockLocalStorage['recipe-favorites'] = JSON.stringify(['1', '2', '3']);
        expect(service.isFavorite('99')).toBe(false);
      });

      it('should handle localStorage errors gracefully', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
          throw new Error('localStorage error');
        });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(service.isFavorite('1')).toBe(false);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should maintain favorites state across multiple operations', () => {
      // Add favorites
      service.addFavorite('1');
      service.addFavorite('3');

      // Check they exist
      expect(service.isFavorite('1')).toBe(true);
      expect(service.isFavorite('3')).toBe(true);
      expect(service.isFavorite('2')).toBe(false);

      // Remove one
      service.removeFavorite('1');

      // Check updated state
      expect(service.isFavorite('1')).toBe(false);
      expect(service.isFavorite('3')).toBe(true);

      // Verify getFavorites returns correct list
      expect(service.getFavorites()).toEqual(['3']);
    });

    it('should work correctly with real recipe IDs', () => {
      return new Promise<void>((resolve) => {
        service.getRecipes().subscribe(recipes => {
        const firstRecipe = recipes[0];

        // Add to favorites
        const addResult = service.addFavorite(firstRecipe.id);
        expect(addResult).toBe(true);
        expect(service.isFavorite(firstRecipe.id)).toBe(true);

        // Remove from favorites
        const removeResult = service.removeFavorite(firstRecipe.id);
        expect(removeResult).toBe(true);
        expect(service.isFavorite(firstRecipe.id)).toBe(false);

        resolve();
        });
      });
    });
  });
});