import { Injectable } from '@angular/core';

export const PASSWORD_LENGTH_BUCKETS = {
  SHORT: 'short',   // 8-11
  MEDIUM: 'medium', // 12-19
  LONG: 'long',     // 20+
} as const;

export type PasswordLengthCategory = typeof PASSWORD_LENGTH_BUCKETS[keyof typeof PASSWORD_LENGTH_BUCKETS];

export function getPasswordLengthCategory(length: number): PasswordLengthCategory {
  if (length < 12) return PASSWORD_LENGTH_BUCKETS.SHORT;
  if (length < 20) return PASSWORD_LENGTH_BUCKETS.MEDIUM;
  return PASSWORD_LENGTH_BUCKETS.LONG;
}

export function extractEmailDomain(email: string): string {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1] : '';
}

export interface AnalyticsEvent {
  name: string;
  properties: Record<string, string | number>;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly eventLog: AnalyticsEvent[] = [];

  trackSignupAttempted(email: string, passwordLength: number): void {
    this.track({
      name: 'signup_step1_attempted',
      properties: {
        email_domain: extractEmailDomain(email),
        password_length_category: getPasswordLengthCategory(passwordLength),
      },
    });
  }

  trackSignupValidationFailed(errorType: string): void {
    this.track({
      name: 'signup_validation_failed',
      properties: { error_type: errorType },
    });
  }

  trackSignupCompleted(userId: string, step: number): void {
    this.track({
      name: 'signup_step1_completed',
      properties: { user_id: userId, step },
    });
  }

  trackRateLimitExceeded(attemptCount: number): void {
    this.track({
      name: 'signup_rate_limit_exceeded',
      properties: { attempt_count: attemptCount },
    });
  }

  getEvents(): readonly AnalyticsEvent[] {
    return this.eventLog;
  }

  private track(event: AnalyticsEvent): void {
    this.eventLog.push(event);
  }
}
