import { TestBed } from '@angular/core/testing';
import { ProbabilityIndicatorComponent } from './probability-indicator.component';
import { ComponentFixture } from '@angular/core/testing';

describe('ProbabilityIndicatorComponent', () => {
  let component: ProbabilityIndicatorComponent;
  let fixture: ComponentFixture<ProbabilityIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProbabilityIndicatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProbabilityIndicatorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isFavorite getter', () => {
    it('should return true when probability is 0.5 or higher', () => {
      component.probability = 0.5;
      expect(component.isFavorite).toBe(true);

      component.probability = 0.7;
      expect(component.isFavorite).toBe(true);

      component.probability = 1.0;
      expect(component.isFavorite).toBe(true);
    });

    it('should return false when probability is below 0.5', () => {
      component.probability = 0.4;
      expect(component.isFavorite).toBe(false);

      component.probability = 0.2;
      expect(component.isFavorite).toBe(false);

      component.probability = 0.0;
      expect(component.isFavorite).toBe(false);
    });
  });

  describe('isClose getter', () => {
    it('should return true when probability is between 0.3 and 0.5', () => {
      component.probability = 0.3;
      expect(component.isClose).toBe(true);

      component.probability = 0.4;
      expect(component.isClose).toBe(true);

      component.probability = 0.49;
      expect(component.isClose).toBe(true);
    });

    it('should return false when probability is outside 0.3-0.5 range', () => {
      component.probability = 0.29;
      expect(component.isClose).toBe(false);

      component.probability = 0.5;
      expect(component.isClose).toBe(false);

      component.probability = 0.7;
      expect(component.isClose).toBe(false);
    });
  });

  describe('isUnderdog getter', () => {
    it('should return true when probability is below 0.3', () => {
      component.probability = 0.0;
      expect(component.isUnderdog).toBe(true);

      component.probability = 0.1;
      expect(component.isUnderdog).toBe(true);

      component.probability = 0.29;
      expect(component.isUnderdog).toBe(true);
    });

    it('should return false when probability is 0.3 or higher', () => {
      component.probability = 0.3;
      expect(component.isUnderdog).toBe(false);

      component.probability = 0.5;
      expect(component.isUnderdog).toBe(false);

      component.probability = 0.8;
      expect(component.isUnderdog).toBe(false);
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      component.probability = 0.65;
      component.label = 'Manchester City Win';
      fixture.detectChanges();
    });

    it('should display the label correctly', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const label = compiled.querySelector('.label');
      expect(label?.textContent).toContain('Manchester City Win');
    });

    it('should display the probability as a percentage', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const percentage = compiled.querySelector('.percentage');
      expect(percentage?.textContent).toContain('65%');
    });

    it('should set progress bar width based on probability', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const progressFill = compiled.querySelector('.progress-fill') as HTMLElement;
      expect(progressFill.style.width).toBe('65%');
    });

    it('should apply favorite class for high probability', () => {
      component.probability = 0.7;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const progressFill = compiled.querySelector('.progress-fill');
      expect(progressFill?.classList.contains('favorite')).toBe(true);
      expect(progressFill?.classList.contains('close')).toBe(false);
      expect(progressFill?.classList.contains('underdog')).toBe(false);
    });

    it('should apply close class for medium probability', () => {
      component.probability = 0.4;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const progressFill = compiled.querySelector('.progress-fill');
      expect(progressFill?.classList.contains('close')).toBe(true);
      expect(progressFill?.classList.contains('favorite')).toBe(false);
      expect(progressFill?.classList.contains('underdog')).toBe(false);
    });

    it('should apply underdog class for low probability', () => {
      component.probability = 0.2;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const progressFill = compiled.querySelector('.progress-fill');
      expect(progressFill?.classList.contains('underdog')).toBe(true);
      expect(progressFill?.classList.contains('favorite')).toBe(false);
      expect(progressFill?.classList.contains('close')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle zero probability', () => {
      component.probability = 0;
      component.label = 'No Chance';
      fixture.detectChanges();

      expect(component.isFavorite).toBe(false);
      expect(component.isClose).toBe(false);
      expect(component.isUnderdog).toBe(true);

      const compiled = fixture.nativeElement as HTMLElement;
      const percentage = compiled.querySelector('.percentage');
      expect(percentage?.textContent).toContain('0%');
    });

    it('should handle maximum probability', () => {
      component.probability = 1.0;
      component.label = 'Certain Win';
      fixture.detectChanges();

      expect(component.isFavorite).toBe(true);
      expect(component.isClose).toBe(false);
      expect(component.isUnderdog).toBe(false);

      const compiled = fixture.nativeElement as HTMLElement;
      const percentage = compiled.querySelector('.percentage');
      expect(percentage?.textContent).toContain('100%');
    });

    it('should handle empty label', () => {
      component.probability = 0.5;
      component.label = '';
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const label = compiled.querySelector('.label');
      expect(label?.textContent).toBe('');
    });

    it('should handle boundary values correctly', () => {
      // Test exactly 0.3 (boundary between underdog and close)
      component.probability = 0.3;
      expect(component.isUnderdog).toBe(false);
      expect(component.isClose).toBe(true);
      expect(component.isFavorite).toBe(false);

      // Test exactly 0.5 (boundary between close and favorite)
      component.probability = 0.5;
      expect(component.isUnderdog).toBe(false);
      expect(component.isClose).toBe(false);
      expect(component.isFavorite).toBe(true);
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      component.probability = 0.45;
      component.label = 'Team Win Probability';
      fixture.detectChanges();
    });

    it('should have proper element structure for screen readers', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const info = compiled.querySelector('.probability-info');
      const label = compiled.querySelector('.label');
      const percentage = compiled.querySelector('.percentage');
      const progressBar = compiled.querySelector('.progress-bar');

      expect(info).toBeTruthy();
      expect(label).toBeTruthy();
      expect(percentage).toBeTruthy();
      expect(progressBar).toBeTruthy();
    });
  });
});