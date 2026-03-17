import { TestBed } from '@angular/core/testing';
import { SettingsPageComponent } from './settings-page.component';

describe('SettingsPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsPageComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should be standalone', () => {
    expect((SettingsPageComponent as any).ɵcmp.standalone).toBe(true);
  });

  it('should render h1 with "Settings"', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Settings');
  });

  it('should render "Coming soon." subtitle', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p').textContent).toContain('Coming soon.');
  });
});
