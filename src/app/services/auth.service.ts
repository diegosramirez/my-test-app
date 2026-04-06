import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as bcrypt from 'bcryptjs';
import { UserService, User, UserRegistrationData } from './user.service';
import { ValidationService } from './validation.service';

export interface RegistrationRequest {
  email: string;
  password: string;
}

export interface RegistrationResult {
  success: boolean;
  user?: User;
  error?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
  };
}

export interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor(
    private userService: UserService,
    private validationService: ValidationService
  ) {
    this.initializeAuthState();
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeAuthState(): void {
    try {
      const currentUser = this.userService.getCurrentUser();
      this.currentUserSubject.next(currentUser);
    } catch (error) {
      console.error('Failed to initialize auth state:', error);
    }
  }

  /**
   * Register a new user with comprehensive validation and security
   */
  async register(request: RegistrationRequest): Promise<RegistrationResult> {
    try {
      this.isLoadingSubject.next(true);

      // Validate input data
      const validationResult = this.validateRegistrationData(request);
      if (!validationResult.success) {
        return validationResult;
      }

      // Normalize email
      const normalizedEmail = request.email.toLowerCase().trim();

      // Check for existing email
      if (this.userService.emailExists(normalizedEmail)) {
        return {
          success: false,
          error: 'An account with this email address already exists',
          fieldErrors: {
            email: 'This email is already registered'
          }
        };
      }

      // Hash password securely
      const passwordHash = await this.hashPassword(request.password);

      // Create user data
      const userData: UserRegistrationData = {
        email: normalizedEmail,
        passwordHash
      };

      // Attempt to create user
      const createResult = this.userService.createUser(userData);

      if (!createResult.success) {
        return {
          success: false,
          error: createResult.error || 'Failed to create account'
        };
      }

      // Set as current user
      const user = createResult.user!;
      this.userService.setCurrentUser(user);
      this.currentUserSubject.next(user);

      // Emit analytics event
      this.emitRegistrationEvent('registration_completed', {
        time_to_complete: Date.now(), // This would be calculated from form start
        password_strength: this.validationService.validatePasswordStrength(request.password).score
      });

      return {
        success: true,
        user
      };

    } catch (error) {
      console.error('Registration failed:', error);

      // Emit failure event
      this.emitRegistrationEvent('registration_failed', {
        error_type: 'system_error'
      });

      return {
        success: false,
        error: 'Registration failed due to a system error. Please try again.'
      };
    } finally {
      this.isLoadingSubject.next(false);
    }
  }

  /**
   * Validate registration data comprehensively
   */
  private validateRegistrationData(request: RegistrationRequest): RegistrationResult {
    const fieldErrors: { email?: string; password?: string } = {};
    let hasErrors = false;

    // Validate email
    const emailValidation = this.validationService.validateEmail(request.email);
    if (!emailValidation.isValid) {
      fieldErrors.email = emailValidation.error;
      hasErrors = true;
    }

    // Validate password strength
    const passwordValidation = this.validationService.validatePasswordStrength(request.password);
    if (!passwordValidation.isValid) {
      fieldErrors.password = passwordValidation.feedback.join(', ');
      hasErrors = true;
    }

    if (hasErrors) {
      // Emit validation error event
      this.emitRegistrationEvent('registration_validation_error', {
        field_name: Object.keys(fieldErrors).join(','),
        error_type: 'validation_failed'
      });

      return {
        success: false,
        error: 'Please correct the validation errors below',
        fieldErrors
      };
    }

    return { success: true };
  }

  /**
   * Hash password securely using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    try {
      // Use salt rounds of 12 for good security/performance balance
      const saltRounds = 12;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      console.error('Password hashing failed:', error);
      throw new Error('Failed to secure password');
    }
  }

  /**
   * Verify password against hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification failed:', error);
      return false;
    }
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      this.isLoadingSubject.next(true);

      const normalizedEmail = email.toLowerCase().trim();

      // Get user by email
      const user = this.userService.getUserByEmail(normalizedEmail);

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Verify password
      const passwordValid = await this.verifyPassword(password, user.passwordHash);
      if (!passwordValid) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Authenticate user and update lastLoginAt persistently
      const authResult = this.userService.authenticateUser(normalizedEmail, user.passwordHash);
      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error || 'Authentication failed'
        };
      }

      // Set current user session
      this.userService.setCurrentUser(authResult.user!);
      this.currentUserSubject.next(authResult.user!);

      return {
        success: true,
        user: authResult.user
      };

    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    } finally {
      this.isLoadingSubject.next(false);
    }
  }

  /**
   * Logout current user
   */
  logout(): void {
    this.userService.logout();
    this.currentUserSubject.next(null);
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if email is available for registration
   */
  isEmailAvailable(email: string): boolean {
    return !this.userService.emailExists(email);
  }

  /**
   * Emit analytics events for tracking
   */
  private emitRegistrationEvent(eventName: string, properties: any): void {
    try {
      // In a real application, this would send to analytics service
      // For now, we'll use console.log to demonstrate the tracking structure
      const event = {
        event: eventName,
        timestamp: new Date().toISOString(),
        properties: {
          user_agent: navigator.userAgent,
          referrer: document.referrer,
          ...properties
        }
      };

      console.log('Analytics Event:', event);

      // Custom event for potential future integration
      window.dispatchEvent(new CustomEvent('registration-analytics', {
        detail: event
      }));

    } catch (error) {
      console.error('Failed to emit analytics event:', error);
    }
  }

  /**
   * Handle form submission analytics
   */
  trackFormSubmission(attempt: number, validationState: any): void {
    this.emitRegistrationEvent('registration_form_submitted', {
      validation_state: validationState,
      attempt_number: attempt
    });
  }

  /**
   * Handle field focus analytics
   */
  trackFieldFocus(fieldName: string, validationState: any): void {
    this.emitRegistrationEvent('registration_field_focused', {
      field_name: fieldName,
      validation_state: validationState
    });
  }

  /**
   * Handle page view analytics
   */
  trackPageView(): void {
    this.emitRegistrationEvent('registration_page_viewed', {
      timestamp: Date.now()
    });
  }
}