import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private readonly STORAGE_KEY = 'recipe-favorites';
  private favoritesSubject = new BehaviorSubject<string[]>(this.loadFavorites());
  public favorites$ = this.favoritesSubject.asObservable();

  constructor() {
    // Listen for storage changes from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY) {
        this.favoritesSubject.next(this.loadFavorites());
      }
    });
  }

  getFavorites(): string[] {
    return this.favoritesSubject.value;
  }

  addFavorite(recipeId: string): void {
    try {
      const favorites = this.getFavorites();
      if (!favorites.includes(recipeId)) {
        const newFavorites = [...favorites, recipeId];
        this.saveFavorites(newFavorites);
        this.favoritesSubject.next(newFavorites);
      }
    } catch (error) {
      console.error('Error adding favorite:', error);
      // Graceful fallback - continue without localStorage
    }
  }

  removeFavorite(recipeId: string): void {
    try {
      const favorites = this.getFavorites();
      const newFavorites = favorites.filter(id => id !== recipeId);
      this.saveFavorites(newFavorites);
      this.favoritesSubject.next(newFavorites);
    } catch (error) {
      console.error('Error removing favorite:', error);
      // Graceful fallback - continue without localStorage
    }
  }

  isFavorite(recipeId: string): boolean {
    return this.getFavorites().includes(recipeId);
  }

  toggleFavorite(recipeId: string): void {
    if (this.isFavorite(recipeId)) {
      this.removeFavorite(recipeId);
    } else {
      this.addFavorite(recipeId);
    }
  }

  private loadFavorites(): string[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error);
      return []; // Graceful fallback
    }
  }

  private saveFavorites(favorites: string[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving favorites to localStorage:', error);
      // Graceful fallback - continue without persistence
    }
  }
}