import { Pipe, PipeTransform } from '@angular/core';
import { formatRelativeTime } from '../utils/date-utils';

/**
 * Transforms an ISO 8601 timestamp to a relative time string.
 * Note: This is a pure pipe and won't re-evaluate while the dropdown stays open.
 * A future enhancement can pass a `refreshTick` argument to force re-evaluation.
 */
@Pipe({
  name: 'relativeTime',
  standalone: true,
  pure: true,
})
export class RelativeTimePipe implements PipeTransform {
  transform(isoString: string, _refreshTick?: number): string {
    return formatRelativeTime(isoString);
  }
}
