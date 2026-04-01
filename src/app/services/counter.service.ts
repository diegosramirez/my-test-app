import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CounterService {
  private readonly _counter = signal(0);
  private readonly _history = signal<string[]>([]);

  readonly counter = this._counter.asReadonly();
  readonly history = this._history.asReadonly();
  readonly actionCount = computed(() => this._history().length);

  increment(): void {
    this._counter.update(v => v + 1);
    this._history.update(h => [...h, '+1']);
  }

  decrement(): void {
    this._counter.update(v => v - 1);
    this._history.update(h => [...h, '-1']);
  }

  reset(): void {
    this._counter.set(0);
    this._history.update(h => [...h, 'reset']);
  }
}
