import { Injectable } from '@angular/core';
import { Observable, of, delay, throwError } from 'rxjs';
import { SearchResult } from './search.models';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private readonly mockData: SearchResult[] = [
    {
      id: '1',
      title: 'Angular Guide: Getting Started',
      description: 'Learn the fundamentals of Angular framework and build your first application with step-by-step instructions.'
    },
    {
      id: '2',
      title: 'TypeScript Best Practices',
      description: 'Discover essential TypeScript patterns and techniques to write maintainable and scalable code.'
    },
    {
      id: '3',
      title: 'RxJS Observables Tutorial',
      description: 'Master reactive programming with RxJS operators and learn to handle asynchronous data streams effectively.'
    },
    {
      id: '4',
      title: 'Angular Component Architecture',
      description: 'Design robust component hierarchies and implement efficient data flow patterns in your Angular applications.'
    },
    {
      id: '5',
      title: 'Testing Angular Applications',
      description: 'Comprehensive guide to unit testing, integration testing, and end-to-end testing with Jasmine and Protractor.'
    },
    {
      id: '6',
      title: 'Angular Performance Optimization',
      description: 'Optimize your Angular apps with lazy loading, OnPush change detection, and advanced performance techniques.'
    },
    {
      id: '7',
      title: 'State Management with NgRx',
      description: 'Implement predictable state management patterns using NgRx Store, Effects, and Entity adapters.'
    },
    {
      id: '8',
      title: 'Angular Material Design',
      description: 'Build beautiful user interfaces with Angular Material components following Google Material Design guidelines.'
    }
  ];

  constructor(private cacheService: CacheService) {}

  search(query: string): Observable<SearchResult[]> {
    try {
      // Check cache first - let cache errors propagate through Observable
      const cachedResults = this.cacheService.get(query);
      if (cachedResults) {
        return of(cachedResults);
      }
    } catch (error) {
      // Propagate cache get errors through Observable stream
      return throwError(() => error);
    }

    // Simulate API call with delay
    const filteredResults = this.mockData.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
    );

    // Cache the results - handle cache set errors gracefully
    try {
      this.cacheService.set(query, filteredResults);
    } catch (error) {
      // Log error but don't fail the search operation
      console.warn('Failed to cache search results:', error);
    }

    // Return with simulated network delay
    const randomDelay = Math.floor(Math.random() * 300) + 200; // 200-500ms
    return of(filteredResults).pipe(delay(randomDelay));
  }

  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cacheService.size(),
      hitRate: 0 // This would be calculated based on tracking hits/misses
    };
  }
}