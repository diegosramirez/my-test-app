import { TestBed } from '@angular/core/testing';
import { SettingsPageComponent } from './settings-page.component';

describe('SettingsPageComponent', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SettingsPageComponent],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render h1 with "Settings"', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Settings');
  });

  it('should have default currency USD', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    expect(fixture.componentInstance.currency).toBe('USD');
  });

  it('should have notifications enabled by default', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    expect(fixture.componentInstance.notificationsEnabled).toBe(true);
  });

  it('should have empty display name by default', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    expect(fixture.componentInstance.displayName).toBe('');
  });

  it('should render currency select', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select[aria-label="Currency"]');
    expect(select).toBeTruthy();
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(3);
  });

  it('should render checkbox for notifications', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();
    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeTruthy();
  });

  it('should render display name input', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[aria-label="Display name"]');
    expect(input).toBeTruthy();
  });

  it('should render save button', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.save-btn');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Save Settings');
  });

  it('should not show confirmation initially', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.save-confirmation')).toBeNull();
  });

  it('should show confirmation after save', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();
    fixture.componentInstance.onSave();
    fixture.detectChanges();
    const msg = fixture.nativeElement.querySelector('.save-confirmation');
    expect(msg).toBeTruthy();
    expect(msg.textContent).toContain('Settings saved!');
  });

  it('should hide confirmation after 3 seconds', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();
    fixture.componentInstance.onSave();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.save-confirmation')).toBeTruthy();
    vi.advanceTimersByTime(3000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.save-confirmation')).toBeNull();
  });

  it('should persist settings to localStorage on save', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    const comp = fixture.componentInstance;
    comp.currency = 'EUR';
    comp.displayName = 'Alice';
    comp.notificationsEnabled = false;
    comp.onSave();
    const stored = JSON.parse(localStorage.getItem('app-settings')!);
    expect(stored.currency).toBe('EUR');
    expect(stored.displayName).toBe('Alice');
    expect(stored.notificationsEnabled).toBe(false);
  });

  it('should load settings from localStorage on creation', () => {
    localStorage.setItem('app-settings', JSON.stringify({
      currency: 'GBP',
      displayName: 'Bob',
      notificationsEnabled: false,
    }));
    const fixture = TestBed.createComponent(SettingsPageComponent);
    const comp = fixture.componentInstance;
    expect(comp.currency).toBe('GBP');
    expect(comp.displayName).toBe('Bob');
    expect(comp.notificationsEnabled).toBe(false);
  });

  it('should set saved signal to true on save then false after timeout', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    const comp = fixture.componentInstance;
    expect(comp.saved()).toBe(false);
    comp.onSave();
    expect(comp.saved()).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(comp.saved()).toBe(false);
  });
});
