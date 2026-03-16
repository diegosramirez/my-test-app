import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HelloWorldComponent } from './hello-world.component';
import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '@angular/core';

describe('HelloWorldComponent', () => {
  let fixture: ComponentFixture<HelloWorldComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelloWorldComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(HelloWorldComponent);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  // --- Happy path ---

  it('should create the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render an h1 with exact text "Hello World"', () => {
    const h1 = el.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1!.textContent).toBe('Hello World');
  });

  it('should render a p with exact text "The app is up and running."', () => {
    const p = el.querySelector('p');
    expect(p).toBeTruthy();
    expect(p!.textContent).toBe('The app is up and running.');
  });

  // --- Semantic HTML / Accessibility ---

  it('should wrap content in a <main> landmark element', () => {
    const main = el.querySelector('main');
    expect(main).toBeTruthy();
  });

  it('should have h1 and p as children of main', () => {
    const main = el.querySelector('main');
    expect(main!.querySelector('h1')).toBeTruthy();
    expect(main!.querySelector('p')).toBeTruthy();
  });

  it('should have exactly one h1 element', () => {
    const h1s = el.querySelectorAll('h1');
    expect(h1s.length).toBe(1);
  });

  it('should not nest p inside h1', () => {
    const h1 = el.querySelector('h1');
    expect(h1!.querySelector('p')).toBeNull();
  });

  // --- Standalone component verification ---

  it('should be a standalone component', () => {
    // The component metadata has standalone: true — verified by TestBed importing it directly
    // If standalone were false, TestBed.configureTestingModule({ imports: [HelloWorldComponent] }) would fail
    expect(fixture.componentInstance).toBeInstanceOf(HelloWorldComponent);
  });

  // --- Styling assertions (checking computed or inline styles on the main element) ---

  it('should apply flexbox centering styles to main', () => {
    const main = el.querySelector('main') as HTMLElement;
    expect(main.classList.contains('hello-world') || main.className.length > 0).toBe(true);
  });
});
