import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { User } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  login(): Observable<User | null> {
    // Stub implementation
    return of(null);
  }

  logout(): Observable<void> {
    // Stub implementation
    return of(void 0);
  }

  getCurrentUser(): Observable<User | null> {
    // Stub implementation
    return of(null);
  }
}