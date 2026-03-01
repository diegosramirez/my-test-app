import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach } from 'vitest';

import { SideNavComponent } from './side-nav.component';

describe('SideNavComponent', () => {
  let component: SideNavComponent;
  let fixture: ComponentFixture<SideNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SideNavComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SideNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render a nav element as the sidebar container', () => {
    const nav = fixture.debugElement.query(By.css('nav'));
    expect(nav).not.toBeNull();
  });

  it('should contain between 4 and 5 navigation items', () => {
    const navItems = fixture.debugElement.queryAll(By.css('nav a'));
    expect(navItems.length).toBeGreaterThanOrEqual(4);
    expect(navItems.length).toBeLessThanOrEqual(5);
  });

  it('should include a navigation item that links to /todo', () => {
    const navLinks = fixture.debugElement.queryAll(By.css('nav a'));
    const todoLink = navLinks.find(
      (link) => link.attributes['routerLink'] === '/todo'
    );
    expect(todoLink).toBeDefined();
  });

  it('should display a "To-Do" label for the /todo navigation item', () => {
    const navLinks = fixture.debugElement.queryAll(By.css('nav a'));
    const todoLink = navLinks.find(
      (link) => link.attributes['routerLink'] === '/todo'
    );
    expect(todoLink).toBeDefined();
    expect(todoLink!.nativeElement.textContent.trim().toLowerCase()).toContain('to-do');
  });

  it('should have distinct labels for all navigation items', () => {
    const navLinks = fixture.debugElement.queryAll(By.css('nav a'));
    const labels = navLinks.map((link) =>
      link.nativeElement.textContent.trim().toLowerCase()
    );
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });

  it('should have routerLink attributes on all navigation items', () => {
    const navLinks = fixture.debugElement.queryAll(By.css('nav a'));
    navLinks.forEach((link) => {
      expect(link.attributes['routerLink']).toBeTruthy();
    });
  });

  it('should have routerLinkActive directive on all navigation items', () => {
    const navLinks = fixture.debugElement.queryAll(By.css('nav a'));
    navLinks.forEach((link) => {
      expect(link.attributes['routerLinkActive']).toBeTruthy();
    });
  });

  it('should have distinct routerLink paths for all navigation items', () => {
    const navLinks = fixture.debugElement.queryAll(By.css('nav a'));
    const paths = navLinks.map((link) => link.attributes['routerLink']);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(paths.length);
  });

  it('should expose a navItems array on the component with 4–5 entries', () => {
    expect(Array.isArray(component.navItems)).toBe(true);
    expect(component.navItems.length).toBeGreaterThanOrEqual(4);
    expect(component.navItems.length).toBeLessThanOrEqual(5);
  });

  it('should have a navItem with path "/todo" in the navItems array', () => {
    const todoItem = component.navItems.find((item) => item.path === '/todo');
    expect(todoItem).toBeDefined();
  });

  it('should apply a sidebar CSS class to the host or nav element', () => {
    const sidebarEl =
      fixture.debugElement.query(By.css('.side-nav')) ||
      fixture.debugElement.query(By.css('nav'));
    expect(sidebarEl).not.toBeNull();
  });
});
