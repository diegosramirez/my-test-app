/**
 * Lightweight analytics stub. Logs events to console in development.
 * Replace with a real analytics provider (e.g., Segment, Amplitude) in a follow-up story.
 */
export function trackEvent(name: string, properties: Record<string, unknown> = {}): void {
  // eslint-disable-next-line no-console
  console.log(`[Analytics] ${name}`, { ...properties, timestamp: new Date().toISOString() });
}
