import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MovieService } from './movie.service';
import { Movie, CreateMovieRequest, UpdateMovieRequest, Genre } from '../models/movie.model';
import { firstValueFrom } from 'rxjs';

describe('MovieService', () => {
  let service: MovieService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MovieService]
    });
    service = TestBed.inject(MovieService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with sample data', async () => {
      const movies = await firstValueFrom(service.getMovies());

      expect(movies).toBeDefined();
      expect(movies.length).toBe(3);
      expect(movies.some(m => m.title === 'The Matrix')).toBe(true);
      expect(movies.some(m => m.title === 'Inception')).toBe(true);
      expect(movies.some(m => m.title === 'The Shawshank Redemption')).toBe(true);
    });

    it('should emit initial movies through movies$ observable', async () => {
      const movies = await firstValueFrom(service.movies$);

      expect(movies).toBeDefined();
      expect(movies.length).toBe(3);
    });
  });

  describe('getMovies', () => {
    it('should complete within 200ms', async () => {
      const startTime = Date.now();

      await firstValueFrom(service.getMovies());
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);
    });

    it('should return all movies', async () => {
      const movies = await firstValueFrom(service.getMovies());

      expect(movies).toBeDefined();
      expect(movies.length).toBeGreaterThan(0);
      movies.forEach(movie => {
        expect(movie.id).toBeDefined();
        expect(movie.title).toBeDefined();
        expect(Object.values(Genre)).toContain(movie.genre);
        expect(typeof movie.year).toBe('number');
        expect(typeof movie.watched).toBe('boolean');
      });
    });
  });

  describe('getMovie', () => {
    it('should complete within 200ms for existing movie', async () => {
      const movies = await firstValueFrom(service.getMovies());
      const movieId = movies[0].id;

      const startTime = Date.now();
      await firstValueFrom(service.getMovie(movieId));
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);
    });

    it('should return specific movie when found', async () => {
      const movies = await firstValueFrom(service.getMovies());
      const targetMovie = movies[0];

      const result = await firstValueFrom(service.getMovie(targetMovie.id));

      expect(result).toEqual(targetMovie);
    });

    it('should throw error for non-existent movie', async () => {
      const nonExistentId = 'non-existent-id';

      await expect(firstValueFrom(service.getMovie(nonExistentId))).rejects.toThrow('Movie with id non-existent-id not found');
    });
  });

  describe('createMovie', () => {
    it('should complete within 200ms', async () => {
      const newMovieData: CreateMovieRequest = {
        title: 'Test Movie',
        genre: Genre.ACTION,
        year: 2023,
        watched: false
      };

      const startTime = Date.now();
      await firstValueFrom(service.createMovie(newMovieData));
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);
    });

    it('should create movie with valid data', async () => {
      const newMovieData: CreateMovieRequest = {
        title: 'New Test Movie',
        genre: Genre.COMEDY,
        year: 2024,
        watched: true
      };

      const createdMovie = await firstValueFrom(service.createMovie(newMovieData));

      expect(createdMovie).toBeDefined();
      expect(createdMovie.id).toBeDefined();
      expect(createdMovie.title).toBe(newMovieData.title);
      expect(createdMovie.genre).toBe(newMovieData.genre);
      expect(createdMovie.year).toBe(newMovieData.year);
      expect(createdMovie.watched).toBe(newMovieData.watched);
    });

    it('should update movies$ observable after creation', async () => {
      const initialMovies = await firstValueFrom(service.movies$);
      const initialCount = initialMovies.length;

      const newMovieData: CreateMovieRequest = {
        title: 'Observable Test Movie',
        genre: Genre.DRAMA,
        year: 2023,
        watched: false
      };

      await firstValueFrom(service.createMovie(newMovieData));
      const updatedMovies = await firstValueFrom(service.movies$);

      expect(updatedMovies.length).toBe(initialCount + 1);
      expect(updatedMovies.some(m => m.title === 'Observable Test Movie')).toBe(true);
    });

    describe('validation - title', () => {
      it('should reject empty title', async () => {
        const invalidData: CreateMovieRequest = {
          title: '',
          genre: Genre.ACTION,
          year: 2023,
          watched: false
        };

        await expect(firstValueFrom(service.createMovie(invalidData))).rejects.toThrow('Invalid movie data provided');
      });

      it('should reject whitespace-only title', async () => {
        const invalidData: CreateMovieRequest = {
          title: '   ',
          genre: Genre.ACTION,
          year: 2023,
          watched: false
        };

        await expect(firstValueFrom(service.createMovie(invalidData))).rejects.toThrow('Invalid movie data provided');
      });

      it('should accept long titles with special characters', async () => {
        const longTitle = 'A Very Long Movie Title: The Sequel - Part 2 (Extended Director\'s Cut) [2024] & Other Characters!@#$%^&*()';
        const validData: CreateMovieRequest = {
          title: longTitle,
          genre: Genre.SCI_FI,
          year: 2024,
          watched: false
        };

        const result = await firstValueFrom(service.createMovie(validData));

        expect(result.title).toBe(longTitle);
      });
    });

    describe('validation - year boundaries (1900-2030)', () => {
      it('should accept year 1900', async () => {
        const validData: CreateMovieRequest = {
          title: 'Old Movie',
          genre: Genre.DRAMA,
          year: 1900,
          watched: true
        };

        const result = await firstValueFrom(service.createMovie(validData));
        expect(result.year).toBe(1900);
      });

      it('should accept year 2030', async () => {
        const validData: CreateMovieRequest = {
          title: 'Future Movie',
          genre: Genre.SCI_FI,
          year: 2030,
          watched: false
        };

        const result = await firstValueFrom(service.createMovie(validData));
        expect(result.year).toBe(2030);
      });

      it('should reject year below 1900', async () => {
        const invalidData: CreateMovieRequest = {
          title: 'Too Old Movie',
          genre: Genre.DRAMA,
          year: 1899,
          watched: false
        };

        await expect(firstValueFrom(service.createMovie(invalidData))).rejects.toThrow('Invalid movie data provided');
      });

      it('should reject year above 2030', async () => {
        const invalidData: CreateMovieRequest = {
          title: 'Too Future Movie',
          genre: Genre.SCI_FI,
          year: 2031,
          watched: false
        };

        await expect(firstValueFrom(service.createMovie(invalidData))).rejects.toThrow('Invalid movie data provided');
      });
    });

    describe('validation - genre', () => {
      it('should accept all valid genres', async () => {
        const genres = Object.values(Genre);

        for (const genre of genres) {
          const validData: CreateMovieRequest = {
            title: `Movie ${genre}`,
            genre: genre,
            year: 2023,
            watched: false
          };

          const result = await firstValueFrom(service.createMovie(validData));
          expect(result.genre).toBe(genre);
        }
      });

      it('should reject invalid genre', async () => {
        const invalidData = {
          title: 'Test Movie',
          genre: 'InvalidGenre' as Genre,
          year: 2023,
          watched: false
        };

        await expect(firstValueFrom(service.createMovie(invalidData))).rejects.toThrow('Invalid movie data provided');
      });
    });

    describe('validation - watched status', () => {
      it('should accept boolean true', async () => {
        const validData: CreateMovieRequest = {
          title: 'Watched Movie',
          genre: Genre.ACTION,
          year: 2023,
          watched: true
        };

        const result = await firstValueFrom(service.createMovie(validData));
        expect(result.watched).toBe(true);
      });

      it('should accept boolean false', async () => {
        const validData: CreateMovieRequest = {
          title: 'Unwatched Movie',
          genre: Genre.ACTION,
          year: 2023,
          watched: false
        };

        const result = await firstValueFrom(service.createMovie(validData));
        expect(result.watched).toBe(false);
      });
    });
  });

  describe('updateMovie', () => {
    let existingMovieId: string;

    beforeEach(async () => {
      const movies = await firstValueFrom(service.getMovies());
      existingMovieId = movies[0].id;
    });

    it('should complete within 200ms', async () => {
      const updateData: UpdateMovieRequest = {
        id: existingMovieId,
        title: 'Updated Title',
        genre: Genre.HORROR,
        year: 2024,
        watched: true
      };

      const startTime = Date.now();
      await firstValueFrom(service.updateMovie(updateData));
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);
    });

    it('should update existing movie with valid data', async () => {
      const updateData: UpdateMovieRequest = {
        id: existingMovieId,
        title: 'Updated Movie Title',
        genre: Genre.ROMANCE,
        year: 2025,
        watched: true
      };

      const updatedMovie = await firstValueFrom(service.updateMovie(updateData));

      expect(updatedMovie.id).toBe(existingMovieId);
      expect(updatedMovie.title).toBe('Updated Movie Title');
      expect(updatedMovie.genre).toBe(Genre.ROMANCE);
      expect(updatedMovie.year).toBe(2025);
      expect(updatedMovie.watched).toBe(true);
    });

    it('should update movies$ observable after update', async () => {
      const updateData: UpdateMovieRequest = {
        id: existingMovieId,
        title: 'Observable Update Test',
        genre: Genre.THRILLER,
        year: 2024,
        watched: false
      };

      await firstValueFrom(service.updateMovie(updateData));
      const updatedMovies = await firstValueFrom(service.movies$);
      const updatedMovie = updatedMovies.find(m => m.id === existingMovieId);

      expect(updatedMovie).toBeDefined();
      expect(updatedMovie!.title).toBe('Observable Update Test');
    });

    it('should throw error for non-existent movie', async () => {
      const updateData: UpdateMovieRequest = {
        id: 'non-existent-id',
        title: 'Updated Title',
        genre: Genre.ACTION,
        year: 2024,
        watched: false
      };

      await expect(firstValueFrom(service.updateMovie(updateData))).rejects.toThrow('Movie with id non-existent-id not found');
    });

    it('should validate updated data same as create', async () => {
      const invalidData: UpdateMovieRequest = {
        id: existingMovieId,
        title: '',
        genre: Genre.ACTION,
        year: 1800,
        watched: false
      };

      await expect(firstValueFrom(service.updateMovie(invalidData))).rejects.toThrow('Invalid movie data provided');
    });
  });

  describe('deleteMovie', () => {
    let movieToDeleteId: string;

    beforeEach(async () => {
      // Create a movie specifically for deletion test
      const newMovie = await firstValueFrom(service.createMovie({
        title: 'Movie to Delete',
        genre: Genre.ACTION,
        year: 2023,
        watched: false
      }));
      movieToDeleteId = newMovie.id;
    });

    it('should complete within 200ms', async () => {
      const startTime = Date.now();
      await firstValueFrom(service.deleteMovie(movieToDeleteId));
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);
    });

    it('should delete existing movie', async () => {
      const initialMovies = await firstValueFrom(service.getMovies());
      const initialCount = initialMovies.length;

      await firstValueFrom(service.deleteMovie(movieToDeleteId));

      const updatedMovies = await firstValueFrom(service.getMovies());
      expect(updatedMovies.length).toBe(initialCount - 1);
      expect(updatedMovies.some(m => m.id === movieToDeleteId)).toBe(false);
    });

    it('should update movies$ observable after deletion', async () => {
      const initialMovies = await firstValueFrom(service.movies$);
      const initialCount = initialMovies.length;

      await firstValueFrom(service.deleteMovie(movieToDeleteId));

      const updatedMovies = await firstValueFrom(service.movies$);
      expect(updatedMovies.length).toBe(initialCount - 1);
      expect(updatedMovies.some(m => m.id === movieToDeleteId)).toBe(false);
    });

    it('should throw error when deleting non-existent movie', async () => {
      const nonExistentId = 'non-existent-id';

      await expect(firstValueFrom(service.deleteMovie(nonExistentId))).rejects.toThrow('Movie with id non-existent-id not found');
    });

    it('should throw error when deleting already deleted movie', async () => {
      await firstValueFrom(service.deleteMovie(movieToDeleteId));

      await expect(firstValueFrom(service.deleteMovie(movieToDeleteId))).rejects.toThrow(`Movie with id ${movieToDeleteId} not found`);
    });
  });

  describe('error handling', () => {
    it('should handle validation errors consistently', async () => {
      const invalidCases = [
        { title: '', genre: Genre.ACTION, year: 2023, watched: false },
        { title: 'Valid Title', genre: Genre.ACTION, year: 1800, watched: false },
        { title: 'Valid Title', genre: Genre.ACTION, year: 2040, watched: false },
        { title: 'Valid Title', genre: 'InvalidGenre' as Genre, year: 2023, watched: false }
      ];

      for (const invalidCase of invalidCases) {
        await expect(firstValueFrom(service.createMovie(invalidCase))).rejects.toThrow('Invalid movie data provided');
      }
    });

    it('should maintain data integrity after failed operations', async () => {
      const initialMovies = await firstValueFrom(service.getMovies());
      const initialCount = initialMovies.length;

      // Try to create invalid movie
      try {
        await firstValueFrom(service.createMovie({
          title: '',
          genre: Genre.ACTION,
          year: 2023,
          watched: false
        }));
      } catch (error) {
        // Expected to fail
      }

      const moviesAfterFailedCreate = await firstValueFrom(service.getMovies());
      expect(moviesAfterFailedCreate.length).toBe(initialCount);

      // Try to delete non-existent movie
      try {
        await firstValueFrom(service.deleteMovie('non-existent'));
      } catch (error) {
        // Expected to fail
      }

      const moviesAfterFailedDelete = await firstValueFrom(service.getMovies());
      expect(moviesAfterFailedDelete.length).toBe(initialCount);
    });
  });

  describe('data persistence during session', () => {
    it('should persist data across multiple operations', async () => {
      // Create multiple movies
      const movie1 = await firstValueFrom(service.createMovie({
        title: 'Session Test 1',
        genre: Genre.ACTION,
        year: 2023,
        watched: false
      }));

      const movie2 = await firstValueFrom(service.createMovie({
        title: 'Session Test 2',
        genre: Genre.DRAMA,
        year: 2024,
        watched: true
      }));

      // Update first movie
      const updatedMovie1 = await firstValueFrom(service.updateMovie({
        id: movie1.id,
        title: 'Updated Session Test 1',
        genre: Genre.COMEDY,
        year: 2025,
        watched: true
      }));

      // Verify all changes persist
      const allMovies = await firstValueFrom(service.getMovies());
      const persistedMovie1 = allMovies.find(m => m.id === movie1.id);
      const persistedMovie2 = allMovies.find(m => m.id === movie2.id);

      expect(persistedMovie1).toEqual(updatedMovie1);
      expect(persistedMovie2).toEqual(movie2);

      // Delete one movie
      await firstValueFrom(service.deleteMovie(movie2.id));

      const finalMovies = await firstValueFrom(service.getMovies());
      expect(finalMovies.some(m => m.id === movie1.id)).toBe(true);
      expect(finalMovies.some(m => m.id === movie2.id)).toBe(false);
    });
  });
});