import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, startWith, takeUntil } from 'rxjs/operators';

import { Recipe, RecipeCategory, SearchFilters } from '../../models/recipe.interface';
import { RecipeService } from '../../services/recipe.service';
import { FavoritesService } from '../../services/favorites.service';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './recipe-list.component.html',
  styleUrl: './recipe-list.component.css'
})
export class RecipeListComponent implements OnInit, OnDestroy {
  recipes$!: Observable<Recipe[]>;
  favorites$!: Observable<string[]>;
  isLoading = false;

  searchQuery = '';
  selectedCategory = 'All';

  private searchSubject = new BehaviorSubject<string>('');
  private categorySubject = new BehaviorSubject<string>('All');
  private destroy$ = new Subject<void>();

  readonly categories = ['All', RecipeCategory.Breakfast, RecipeCategory.Lunch, RecipeCategory.Dinner, RecipeCategory.Dessert];

  constructor(
    private recipeService: RecipeService,
    private favoritesService: FavoritesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.favorites$ = this.favoritesService.favorites$;
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    // Combine search query and category filter with debouncing
    this.recipes$ = combineLatest([
      this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()),
      this.categorySubject.pipe(distinctUntilChanged())
    ]).pipe(
      switchMap(([query, category]) => {
        this.isLoading = true;

        if (query.trim() && category !== 'All') {
          // AND logic: both search and category
          return this.recipeService.searchRecipes(query).pipe(
            switchMap(searchResults => {
              const filteredByCategory = searchResults.filter(recipe => recipe.category === category);
              this.isLoading = false;
              return [filteredByCategory];
            })
          );
        } else if (query.trim()) {
          // Search only
          return this.recipeService.searchRecipes(query);
        } else if (category !== 'All') {
          // Category filter only
          return this.recipeService.filterByCategory(category);
        } else {
          // No filters
          return this.recipeService.getRecipes();
        }
      }),
      startWith([]),
      takeUntil(this.destroy$)
    );

    // Subscribe to loading state
    this.recipes$.subscribe(() => {
      this.isLoading = false;
    });
  }

  onSearchInput(query: string): void {
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.categorySubject.next(category);
  }

  onRecipeClick(recipeId: string): void {
    this.router.navigate(['/recipe', recipeId]);
  }

  toggleFavorite(recipeId: string, event: Event): void {
    event.stopPropagation(); // Prevent navigation when clicking favorite button
    this.favoritesService.toggleFavorite(recipeId);
  }

  isFavorite(recipeId: string, favorites: string[]): boolean {
    return favorites.includes(recipeId);
  }

  trackByRecipeId(index: number, recipe: Recipe): string {
    return recipe.id;
  }
}