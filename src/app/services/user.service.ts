import { Injectable } from '@angular/core';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface UserRegistrationData {
  email: string;
  passwordHash: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly STORAGE_KEY = 'bmad_users';
  private readonly CURRENT_USER_KEY = 'bmad_current_user';

  constructor() {
    this.initializeStorage();
  }

  /**
   * Initialize localStorage with fallback handling
   */
  private initializeStorage(): void {
    try {
      if (!this.isStorageAvailable()) {
        console.warn('localStorage not available, user data will not persist');
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  /**
   * Check if localStorage is available
   */
  private isStorageAvailable(): boolean {
    try {
      const test = 'storage_test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all users from localStorage
   */
  private getUsers(): User[] {
    try {
      if (!this.isStorageAvailable()) {
        return [];
      }

      const usersJson = localStorage.getItem(this.STORAGE_KEY);
      if (!usersJson) {
        return [];
      }

      const users = JSON.parse(usersJson);
      // Convert date strings back to Date objects
      return users.map((user: any) => ({
        ...user,
        createdAt: new Date(user.createdAt),
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined
      }));
    } catch (error) {
      console.error('Failed to get users from storage:', error);
      return [];
    }
  }

  /**
   * Save users to localStorage with atomic operation
   */
  private saveUsers(users: User[]): boolean {
    try {
      if (!this.isStorageAvailable()) {
        return false;
      }

      const usersJson = JSON.stringify(users);
      localStorage.setItem(this.STORAGE_KEY, usersJson);
      return true;
    } catch (error) {
      console.error('Failed to save users to storage:', error);
      return false;
    }
  }

  /**
   * Check if email already exists (case-insensitive)
   */
  emailExists(email: string): boolean {
    try {
      const users = this.getUsers();
      return users.some(user =>
        user.email.toLowerCase() === email.toLowerCase()
      );
    } catch (error) {
      console.error('Failed to check email existence:', error);
      return false;
    }
  }

  /**
   * Get user by email (case-insensitive)
   */
  getUserByEmail(email: string): User | null {
    try {
      const users = this.getUsers();
      return users.find(user =>
        user.email.toLowerCase() === email.toLowerCase().trim()
      ) || null;
    } catch (error) {
      console.error('Failed to get user by email:', error);
      return null;
    }
  }

  /**
   * Create a new user account
   */
  createUser(userData: UserRegistrationData): { success: boolean; user?: User; error?: string } {
    try {
      const normalizedEmail = userData.email.toLowerCase().trim();

      // Check for duplicate email atomically
      const users = this.getUsers();
      const emailAlreadyExists = users.some(user =>
        user.email.toLowerCase() === normalizedEmail
      );

      if (emailAlreadyExists) {
        return {
          success: false,
          error: 'An account with this email address already exists'
        };
      }

      // Create new user
      const newUser: User = {
        id: this.generateUserId(),
        email: normalizedEmail,
        passwordHash: userData.passwordHash,
        createdAt: new Date()
      };

      // Add to users array and save atomically
      users.push(newUser);
      const saveSuccess = this.saveUsers(users);

      if (!saveSuccess) {
        return {
          success: false,
          error: 'Failed to save user data. Please try again.'
        };
      }

      return {
        success: true,
        user: newUser
      };
    } catch (error) {
      console.error('Failed to create user:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  /**
   * Authenticate user with email and password hash
   */
  authenticateUser(email: string, passwordHash: string): { success: boolean; user?: User; error?: string } {
    try {
      const users = this.getUsers();
      const user = users.find(u =>
        u.email.toLowerCase() === email.toLowerCase().trim() &&
        u.passwordHash === passwordHash
      );

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Update last login time
      user.lastLoginAt = new Date();
      this.saveUsers(users);

      return {
        success: true,
        user
      };
    } catch (error) {
      console.error('Failed to authenticate user:', error);
      return {
        success: false,
        error: 'Authentication failed. Please try again.'
      };
    }
  }

  /**
   * Get current logged-in user
   */
  getCurrentUser(): User | null {
    try {
      if (!this.isStorageAvailable()) {
        return null;
      }

      const userJson = localStorage.getItem(this.CURRENT_USER_KEY);
      if (!userJson) {
        return null;
      }

      const userData = JSON.parse(userJson);
      return {
        ...userData,
        createdAt: new Date(userData.createdAt),
        lastLoginAt: userData.lastLoginAt ? new Date(userData.lastLoginAt) : undefined
      };
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Set current logged-in user
   */
  setCurrentUser(user: User | null): boolean {
    try {
      if (!this.isStorageAvailable()) {
        return false;
      }

      if (user) {
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(this.CURRENT_USER_KEY);
      }
      return true;
    } catch (error) {
      console.error('Failed to set current user:', error);
      return false;
    }
  }

  /**
   * Logout current user
   */
  logout(): boolean {
    return this.setCurrentUser(null);
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  /**
   * Get user statistics for analytics
   */
  getUserStats(): { totalUsers: number; recentRegistrations: number } {
    try {
      const users = this.getUsers();
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const recentRegistrations = users.filter(user =>
        user.createdAt >= oneWeekAgo
      ).length;

      return {
        totalUsers: users.length,
        recentRegistrations
      };
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return { totalUsers: 0, recentRegistrations: 0 };
    }
  }

  /**
   * Clear all user data (for testing/development)
   */
  clearAllUsers(): boolean {
    try {
      if (!this.isStorageAvailable()) {
        return false;
      }

      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.CURRENT_USER_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear user data:', error);
      return false;
    }
  }
}