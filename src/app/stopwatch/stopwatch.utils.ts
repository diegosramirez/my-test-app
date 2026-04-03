/**
 * Formats milliseconds to mm:ss.ss display format
 * @param ms Milliseconds to format
 * @returns Formatted time string in mm:ss.ss format
 */
export function formatTime(ms: number): string {
  // Handle edge cases
  if (ms < 0) ms = 0;
  if (ms >= 5999990) ms = 5999990; // 99:59.99 in milliseconds

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

/**
 * Checks if the timer has reached the maximum allowed duration
 * @param ms Milliseconds to check
 * @returns True if overflow detected (99:59.99 or greater)
 */
export function isOverflow(ms: number): boolean {
  return ms >= 5999990; // 99:59.99 in milliseconds
}

/**
 * Gets the maximum allowed duration in milliseconds
 * @returns Maximum duration (99:59.99) in milliseconds
 */
export function getMaxDuration(): number {
  return 5999990; // 99:59.99 in milliseconds
}