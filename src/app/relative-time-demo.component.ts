import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { formatRelativeTime } from './shared/utils/date-time.util';

interface TimeExample {
  label: string;
  date: Date;
  formatted: string;
  testId: string;
}

@Component({
  selector: 'app-relative-time-demo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="demo-container">
      <h1>Relative Time Utility Demo</h1>
      <p class="description">
        This page demonstrates the formatRelativeTime utility function with various test cases.
      </p>

      <section class="time-examples">
        <h2>Time Examples</h2>

        <div class="example-grid">
          @for (example of timeExamples(); track example.testId) {
            <div class="time-card" [attr.data-testid]="example.testId">
              <div class="label">{{ example.label }}</div>
              <div class="formatted" [attr.data-testid]="example.testId + '-formatted'">
                {{ example.formatted }}
              </div>
              <div class="original" [attr.data-testid]="example.testId + '-original'">
                {{ example.date.toISOString() }}
              </div>
            </div>
          }
        </div>
      </section>

      <section class="error-examples">
        <h2>Error Handling Examples</h2>

        <div class="example-grid">
          @for (error of errorExamples(); track error.testId) {
            <div class="time-card" [attr.data-testid]="error.testId">
              <div class="label">{{ error.label }}</div>
              <div class="formatted" [attr.data-testid]="error.testId + '-formatted'">
                {{ error.result }}
              </div>
              <div class="input">Input: {{ error.input }}</div>
            </div>
          }
        </div>
      </section>

      <section class="performance-test">
        <h2>Performance Test</h2>
        <div class="performance-card" data-testid="performance-test">
          <div class="label">Function execution time (100 calls)</div>
          <div class="performance-result" data-testid="performance-result">
            {{ performanceResult() }}
          </div>
          <button
            (click)="runPerformanceTest()"
            data-testid="performance-button"
            class="test-button">
            Run Performance Test
          </button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .demo-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      font-family: system-ui, -apple-system, sans-serif;
    }

    h1 {
      color: #333;
      margin-bottom: 0.5rem;
    }

    .description {
      color: #666;
      margin-bottom: 2rem;
    }

    h2 {
      color: #444;
      margin: 2rem 0 1rem 0;
    }

    .example-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .time-card {
      border: 1px solid #ddd;
      padding: 1rem;
      border-radius: 8px;
      background: #f9f9f9;
    }

    .label {
      font-weight: bold;
      color: #333;
      margin-bottom: 0.5rem;
    }

    .formatted {
      font-size: 1.2rem;
      color: #0066cc;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .original, .input {
      font-size: 0.9rem;
      color: #666;
      font-family: monospace;
    }

    .performance-card {
      border: 2px solid #0066cc;
      padding: 1.5rem;
      border-radius: 8px;
      background: #f0f8ff;
    }

    .performance-result {
      font-size: 1.1rem;
      color: #0066cc;
      margin: 0.5rem 0;
      font-weight: 500;
    }

    .test-button {
      background: #0066cc;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }

    .test-button:hover {
      background: #0052a3;
    }
  `]
})
export class RelativeTimeDemoComponent implements OnInit {
  timeExamples = signal<TimeExample[]>([]);
  errorExamples = signal<{label: string; input: string; result: string; testId: string}[]>([]);
  performanceResult = signal<string>('Click button to run test');

  ngOnInit() {
    this.setupTimeExamples();
    this.setupErrorExamples();
  }

  private setupTimeExamples() {
    const now = new Date();

    const examples: TimeExample[] = [
      {
        label: 'Current time',
        date: now,
        formatted: formatRelativeTime(now),
        testId: 'current-time'
      },
      {
        label: '5 minutes ago',
        date: new Date(now.getTime() - 5 * 60000),
        formatted: formatRelativeTime(new Date(now.getTime() - 5 * 60000)),
        testId: 'five-minutes-ago'
      },
      {
        label: '2 hours ago',
        date: new Date(now.getTime() - 2 * 3600000),
        formatted: formatRelativeTime(new Date(now.getTime() - 2 * 3600000)),
        testId: 'two-hours-ago'
      },
      {
        label: 'Yesterday',
        date: new Date(now.getTime() - 24 * 3600000),
        formatted: formatRelativeTime(new Date(now.getTime() - 24 * 3600000)),
        testId: 'yesterday'
      },
      {
        label: '3 days ago',
        date: new Date(now.getTime() - 3 * 24 * 3600000),
        formatted: formatRelativeTime(new Date(now.getTime() - 3 * 24 * 3600000)),
        testId: 'three-days-ago'
      },
      {
        label: '1 week ago',
        date: new Date(now.getTime() - 7 * 24 * 3600000),
        formatted: formatRelativeTime(new Date(now.getTime() - 7 * 24 * 3600000)),
        testId: 'one-week-ago'
      },
      {
        label: '1 month ago',
        date: new Date(now.getTime() - 30 * 24 * 3600000),
        formatted: formatRelativeTime(new Date(now.getTime() - 30 * 24 * 3600000)),
        testId: 'one-month-ago'
      },
      {
        label: '1 year ago',
        date: new Date(now.getTime() - 365 * 24 * 3600000),
        formatted: formatRelativeTime(new Date(now.getTime() - 365 * 24 * 3600000)),
        testId: 'one-year-ago'
      },
      {
        label: 'Tomorrow',
        date: new Date(now.getTime() + 24 * 3600000),
        formatted: formatRelativeTime(new Date(now.getTime() + 24 * 3600000)),
        testId: 'tomorrow'
      },
      {
        label: 'In 2 hours',
        date: new Date(now.getTime() + 2 * 3600000),
        formatted: formatRelativeTime(new Date(now.getTime() + 2 * 3600000)),
        testId: 'in-two-hours'
      },
      {
        label: 'In 5 minutes',
        date: new Date(now.getTime() + 5 * 60000),
        formatted: formatRelativeTime(new Date(now.getTime() + 5 * 60000)),
        testId: 'in-five-minutes'
      }
    ];

    this.timeExamples.set(examples);
  }

  private setupErrorExamples() {
    const errorCases = [
      { label: 'Invalid date string', input: 'not-a-date', testId: 'invalid-string' },
      { label: 'Empty string', input: '', testId: 'empty-string' },
      { label: 'Null value', input: 'null', testId: 'null-value' },
      { label: 'Undefined value', input: 'undefined', testId: 'undefined-value' }
    ];

    const examples = errorCases.map(errorCase => ({
      ...errorCase,
      result: this.getErrorResult(errorCase.input)
    }));

    this.errorExamples.set(examples);
  }

  private getErrorResult(input: string): string {
    switch (input) {
      case 'null':
        return formatRelativeTime(null as any);
      case 'undefined':
        return formatRelativeTime(undefined as any);
      default:
        return formatRelativeTime(input);
    }
  }

  runPerformanceTest() {
    const testDate = new Date(Date.now() - 3600000); // 1 hour ago
    const iterations = 100;

    // Warmup
    formatRelativeTime(testDate);

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      formatRelativeTime(testDate);
    }
    const end = performance.now();

    const totalTime = end - start;
    const avgTime = totalTime / iterations;

    this.performanceResult.set(
      `Total: ${totalTime.toFixed(3)}ms | Average: ${avgTime.toFixed(3)}ms per call`
    );
  }
}