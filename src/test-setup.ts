import 'zone.js';
import 'zone.js/testing';

import { getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

// Create Jasmine compatibility layer for Vitest
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeTruthy(): T;
      toBeFalsy(): T;
      toEqual(expected: any): T;
      toBe(expected: any): T;
      toContain(expected: any): T;
      toHaveBeenCalled(): T;
      toHaveBeenCalledWith(...args: any[]): T;
      toHaveBeenCalledTimes(expected: number): T;
    }
  }
}

// Mock jasmine functions for Vitest compatibility
(globalThis as any).jasmine = {
  createSpyObj: (name: string, methods: string[]) => {
    const obj: any = {};
    methods.forEach(method => {
      obj[method] = vi.fn();
    });
    return obj;
  },
  createSpy: (name?: string) => vi.fn()
};

// Provide done function for async tests
(globalThis as any).done = () => {};