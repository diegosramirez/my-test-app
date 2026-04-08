/**
 * Formats a date as a human-readable relative time string.
 *
 * @param date - Date object or ISO date string to format
 * @returns Human-readable relative time string (e.g., "2 hours ago", "yesterday", "in 3 days")
 * @example
 * formatRelativeTime(new Date()) // "just now"
 * formatRelativeTime('2024-01-01T10:00:00Z') // "3 months ago"
 * formatRelativeTime(new Date(Date.now() + 60000)) // "in 1 minute"
 */
export function formatRelativeTime(date: Date | string): string {
  try {
    // Convert string to Date if needed
    const targetDate = typeof date === 'string' ? new Date(date) : date;

    // Validate the date
    if (!targetDate || isNaN(targetDate.getTime())) {
      return 'Invalid date';
    }

    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();
    const absDiffMs = Math.abs(diffMs);
    const isFuture = diffMs > 0;

    // Time constants in milliseconds
    const MINUTE = 60 * 1000;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;
    const WEEK = 7 * DAY;
    const MONTH = 30 * DAY; // Approximate month for consistency
    const YEAR = 365 * DAY; // Approximate year for consistency

    // Helper function to get singular/plural form
    const getTimeUnit = (value: number, unit: string): string => {
      if (value === 1) {
        return `1 ${unit}`;
      }
      return `${value} ${unit}s`;
    };

    // Helper function to format the result
    const formatResult = (timeString: string, isFuture: boolean): string => {
      if (isFuture) {
        return `in ${timeString}`;
      }
      return `${timeString} ago`;
    };

    // Less than 1 minute
    if (absDiffMs < MINUTE) {
      if (isFuture) {
        // For future dates under 1 minute, calculate seconds for consistency
        const seconds = Math.floor(absDiffMs / 1000);
        if (seconds < 5) {
          return 'in a moment';
        }
        return formatResult(getTimeUnit(seconds, 'second'), true);
      }
      return 'just now';
    }

    // Minutes (1-59)
    if (absDiffMs < HOUR) {
      const minutes = Math.floor(absDiffMs / MINUTE);
      return formatResult(getTimeUnit(minutes, 'minute'), isFuture);
    }

    // Hours (1-23)
    if (absDiffMs < DAY) {
      const hours = Math.floor(absDiffMs / HOUR);
      return formatResult(getTimeUnit(hours, 'hour'), isFuture);
    }

    // Days (1-6) - handle "yesterday" and "tomorrow" special cases
    if (absDiffMs < WEEK) {
      const days = Math.floor(absDiffMs / DAY);
      if (days === 1) {
        return isFuture ? 'tomorrow' : 'yesterday';
      }
      return formatResult(getTimeUnit(days, 'day'), isFuture);
    }

    // Weeks (1-4)
    if (absDiffMs < MONTH) {
      const weeks = Math.floor(absDiffMs / WEEK);
      return formatResult(getTimeUnit(weeks, 'week'), isFuture);
    }

    // Months (1-11) - but if 12+ months, show as years
    if (absDiffMs < YEAR) {
      const months = Math.floor(absDiffMs / MONTH);
      if (months >= 12) {
        // If 12+ months, show as years instead
        const years = Math.floor(absDiffMs / YEAR);
        return formatResult(getTimeUnit(years === 0 ? 1 : years, 'year'), isFuture);
      }
      return formatResult(getTimeUnit(months, 'month'), isFuture);
    }

    // Years (12+ months)
    const years = Math.floor(absDiffMs / YEAR);
    return formatResult(getTimeUnit(years, 'year'), isFuture);

  } catch (error) {
    // Never throw exceptions, always return fallback
    return 'Invalid date';
  }
}