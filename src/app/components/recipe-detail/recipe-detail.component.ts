import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from '../../interfaces/recipe.interface';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recipe-detail.component.html',
  styleUrl: './recipe-detail.component.css'
})
export class RecipeDetailComponent implements OnInit, OnDestroy {
  recipe: Recipe | null = null;
  recipeId: string | null = null;
  isLoading = true;
  notFound = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recipeService: RecipeService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.recipeId = params['id'];
      this.loadRecipe();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRecipe(): void {
    if (!this.recipeId) {
      this.notFound = true;
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.notFound = false;

    this.recipeService.getRecipeById(this.recipeId).subscribe(recipe => {
      this.recipe = recipe;
      this.notFound = !recipe;
      this.isLoading = false;
    });
  }

  isFavorite(): boolean {
    return this.recipe ? this.recipeService.isFavorite(this.recipe.id) : false;
  }

  toggleFavorite(): void {
    if (!this.recipe) return;

    if (this.isFavorite()) {
      this.recipeService.removeFavorite(this.recipe.id);
    } else {
      this.recipeService.addFavorite(this.recipe.id);
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}