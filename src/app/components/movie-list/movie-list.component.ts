import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, takeUntil, Subject } from 'rxjs';
import { Movie } from '../../models/movie.model';
import { WatchedFilter, FilterState } from '../../models/filter.model';
import { MovieService } from '../../services/movie.service';
import { MovieCardComponent } from '../movie-card/movie-card.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-movie-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MovieCardComponent, ConfirmDialogComponent],
  templateUrl: './movie-list.component.html',
  styleUrl: './movie-list.component.css'
})
export class MovieListComponent implements OnInit, OnDestroy {
  movies: Movie[] = [];
  filteredMovies: Movie[] = [];
  loading = false;
  error: string | null = null;

  searchQuery = '';
  private searchSubject = new BehaviorSubject<string>('');

  watchedFilter: WatchedFilter = 'all';
  private filterSubject = new BehaviorSubject<WatchedFilter>('all');

  showConfirmDialog = false;
  movieToDelete: Movie | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private movieService: MovieService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.setupSearchAndFilter();
    this.loadMovies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchAndFilter(): void {
    // Setup search with debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchQuery = query;
      this.applyFilters();
    });

    // Setup filter changes
    this.filterSubject.pipe(
      takeUntil(this.destroy$)
    ).subscribe(filter => {
      this.watchedFilter = filter;
      this.applyFilters();
    });

    // Listen to movies changes from service
    this.movieService.movies$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(movies => {
      this.movies = movies;
      this.applyFilters();
    });
  }

  loadMovies(): void {
    this.loading = true;
    this.error = null;

    this.movieService.getMovies().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (movies) => {
        this.movies = movies;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load movies. Please try again.';
        this.loading = false;
        console.error('Error loading movies:', err);
      }
    });
  }

  private applyFilters(): void {
    let filtered = [...this.movies];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(movie =>
        movie.title.toLowerCase().includes(query)
      );
    }

    // Apply watched filter
    if (this.watchedFilter === 'watched') {
      filtered = filtered.filter(movie => movie.watched);
    } else if (this.watchedFilter === 'unwatched') {
      filtered = filtered.filter(movie => !movie.watched);
    }

    this.filteredMovies = filtered;
  }

  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }

  onFilterChange(filter: WatchedFilter): void {
    this.filterSubject.next(filter);
  }

  onAddMovie(): void {
    this.router.navigate(['/movies/add']);
  }

  onToggleWatched(movie: Movie): void {
    const updatedMovie = { ...movie, watched: !movie.watched };
    this.movieService.updateMovie(updatedMovie).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        // Movie updated successfully - the observable will update the UI
      },
      error: (err) => {
        this.error = 'Failed to update movie. Please try again.';
        console.error('Error updating movie:', err);
      }
    });
  }

  onEditMovie(movie: Movie): void {
    this.router.navigate(['/movies/edit', movie.id]);
  }

  onDeleteMovie(movie: Movie): void {
    this.movieToDelete = movie;
    this.showConfirmDialog = true;
  }

  onConfirmDelete(): void {
    if (!this.movieToDelete) return;

    this.loading = true;
    this.movieService.deleteMovie(this.movieToDelete.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.loading = false;
        this.showConfirmDialog = false;
        this.movieToDelete = null;
      },
      error: (err) => {
        this.error = 'Failed to delete movie. Please try again.';
        this.loading = false;
        console.error('Error deleting movie:', err);
      }
    });
  }

  onCancelDelete(): void {
    this.showConfirmDialog = false;
    this.movieToDelete = null;
  }

  getHighlightedTitle(title: string): string {
    if (!this.searchQuery.trim()) {
      return title;
    }

    const query = this.searchQuery.trim();
    const regex = new RegExp(`(${query})`, 'gi');
    return title.replace(regex, '<mark>$1</mark>');
  }

  trackByMovieId(index: number, movie: Movie): string {
    return movie.id;
  }

  getWatchedCount(): number {
    return this.movies.filter(movie => movie.watched).length;
  }

  getUnwatchedCount(): number {
    return this.movies.filter(movie => !movie.watched).length;
  }

  getDeleteMessage(): string {
    if (!this.movieToDelete) return '';
    return `Are you sure you want to delete "${this.movieToDelete.title}"? This action cannot be undone.`;
  }
}