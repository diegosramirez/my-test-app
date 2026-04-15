import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, delay, map, tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Movie, CreateMovieRequest, UpdateMovieRequest, Genre } from '../models/movie.model';

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private readonly API_BASE = '/api/movies';
  private movies = new Map<string, Movie>();
  private moviesSubject = new BehaviorSubject<Movie[]>([]);
  public movies$ = this.moviesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeWithSampleData();
  }

  private initializeWithSampleData(): void {
    const sampleMovies: Movie[] = [
      {
        id: uuidv4(),
        title: 'The Matrix',
        genre: Genre.SCI_FI,
        year: 1999,
        watched: true
      },
      {
        id: uuidv4(),
        title: 'Inception',
        genre: Genre.SCI_FI,
        year: 2010,
        watched: false
      },
      {
        id: uuidv4(),
        title: 'The Shawshank Redemption',
        genre: Genre.DRAMA,
        year: 1994,
        watched: true
      }
    ];

    sampleMovies.forEach(movie => this.movies.set(movie.id, movie));
    this.updateMoviesSubject();
  }

  private updateMoviesSubject(): void {
    this.moviesSubject.next(Array.from(this.movies.values()));
  }

  private mockHttpResponse<T>(data: T, delayMs: number = 100): Observable<T> {
    return of(data).pipe(
      delay(delayMs),
      catchError(this.handleError)
    );
  }

  private handleError = (error: HttpErrorResponse) => {
    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client-side error: ${error.error.message}`;
    } else {
      errorMessage = `Server-side error: ${error.status} ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  };

  getMovies(): Observable<Movie[]> {
    return this.mockHttpResponse(Array.from(this.movies.values()));
  }

  getMovie(id: string): Observable<Movie | null> {
    const movie = this.movies.get(id) || null;
    if (!movie) {
      return throwError(() => new Error(`Movie with id ${id} not found`));
    }
    return this.mockHttpResponse(movie);
  }

  createMovie(movieData: CreateMovieRequest): Observable<Movie> {
    if (!this.validateMovieData(movieData)) {
      return throwError(() => new Error('Invalid movie data provided'));
    }

    const newMovie: Movie = {
      id: uuidv4(),
      ...movieData
    };

    this.movies.set(newMovie.id, newMovie);
    this.updateMoviesSubject();

    return this.mockHttpResponse(newMovie, 150);
  }

  updateMovie(movieData: UpdateMovieRequest): Observable<Movie> {
    if (!this.movies.has(movieData.id)) {
      return throwError(() => new Error(`Movie with id ${movieData.id} not found`));
    }

    if (!this.validateMovieData(movieData)) {
      return throwError(() => new Error('Invalid movie data provided'));
    }

    const updatedMovie: Movie = { ...movieData };
    this.movies.set(movieData.id, updatedMovie);
    this.updateMoviesSubject();

    return this.mockHttpResponse(updatedMovie, 120);
  }

  deleteMovie(id: string): Observable<void> {
    if (!this.movies.has(id)) {
      return throwError(() => new Error(`Movie with id ${id} not found`));
    }

    this.movies.delete(id);
    this.updateMoviesSubject();

    return this.mockHttpResponse(undefined, 100);
  }

  private validateMovieData(data: Omit<Movie, 'id'>): boolean {
    if (!data.title || data.title.trim().length === 0) {
      return false;
    }
    if (!Object.values(Genre).includes(data.genre)) {
      return false;
    }
    if (!data.year || data.year < 1900 || data.year > 2030) {
      return false;
    }
    if (typeof data.watched !== 'boolean') {
      return false;
    }
    return true;
  }
}