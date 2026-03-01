import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { SideNavComponent } from './side-nav/side-nav.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent, SideNavComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have the correct title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toBe('my-test-app');
  });

  it('should render the side-nav component', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const sideNavEl = fixture.debugElement.query(By.directive(SideNavComponent));
    expect(sideNavEl).not.toBeNull();
  });

  it('should render a router-outlet element', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const routerOutlet = fixture.debugElement.query(By.css('router-outlet'));
    expect(routerOutlet).not.toBeNull();
  });

  it('should have a layout wrapper containing both sidebar and main content', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const layoutWrapper = fixture.debugElement.query(By.css('.app-layout'));
    expect(layoutWrapper).not.toBeNull();
  });

  it('should render the sidebar inside the layout wrapper', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const layoutWrapper = fixture.debugElement.query(By.css('.app-layout'));
    const sideNavInsideLayout = layoutWrapper.query(By.directive(SideNavComponent));
    expect(sideNavInsideLayout).not.toBeNull();
  });

  it('should render the main content area inside the layout wrapper', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const layoutWrapper = fixture.debugElement.query(By.css('.app-layout'));
    const mainContent = layoutWrapper.query(By.css('.main-content'));
    expect(mainContent).not.toBeNull();
  });

  it('should render router-outlet inside the main content area', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const mainContent = fixture.debugElement.query(By.css('.main-content'));
    const routerOutlet = mainContent.query(By.css('router-outlet'));
    expect(routerOutlet).not.toBeNull();
  });
});
