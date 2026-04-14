import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, combineLatest, startWith, map } from 'rxjs';
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from '../../interfaces/recipe.interface';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './recipe-list.component.html',
  styleUrl: './recipe-list.component.css'
})
export class RecipeListComponent implements OnInit, OnDestroy {
  recipes: Recipe[] = [];
  filteredRecipes: Recipe[] = [];
  searchQuery = '';
  selectedCategory = 'all';
  categories = ['all', 'breakfast', 'lunch', 'dinner', 'dessert', 'appetizer'];

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  private categorySubject = new Subject<string>();

  constructor(
    private recipeService: RecipeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Load all recipes initially
    this.loadRecipes();

    // Setup unified filtering with both search and category
    const search$ = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      startWith(this.searchQuery)
    );

    const category$ = this.categorySubject.pipe(
      startWith(this.selectedCategory)
    );

    combineLatest([search$, category$]).pipe(
      switchMap(([searchQuery, category]) =>
        this.recipeService.searchRecipes(searchQuery).pipe(
          map(recipes => this.applyCategoryFilter(recipes, category))
        )
      ),
      takeUntil(this.destroy$)
    ).subscribe(recipes => {
      this.filteredRecipes = recipes;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRecipes(): void {
    this.recipeService.getRecipes().subscribe(recipes => {
      this.recipes = recipes;
      this.filteredRecipes = recipes;
    });
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.categorySubject.next(category);
  }

  private applyCategoryFilter(recipes: Recipe[], category: string): Recipe[] {
    if (category === 'all') {
      return recipes;
    }
    return recipes.filter(recipe => recipe.category === category);
  }

  onRecipeClick(recipeId: string): void {
    this.router.navigate(['/recipe', recipeId]);
  }

  isFavorite(recipeId: string): boolean {
    return this.recipeService.isFavorite(recipeId);
  }

  toggleFavorite(event: Event, recipeId: string): void {
    event.stopPropagation();
    if (this.isFavorite(recipeId)) {
      this.recipeService.removeFavorite(recipeId);
    } else {
      this.recipeService.addFavorite(recipeId);
    }
  }

  get hasSearchResults(): boolean {
    return this.searchQuery.trim().length >= 2;
  }

  get emptyStateMessage(): string {
    if (this.hasSearchResults && this.filteredRecipes.length === 0) {
      return `No recipes found for "${this.searchQuery}". Try adjusting your search terms or browse by category.`;
    }

    if (this.selectedCategory !== 'all' && this.filteredRecipes.length === 0) {
      return `No ${this.selectedCategory} recipes available. Try selecting a different category.`;
    }

    return '';
  }
}