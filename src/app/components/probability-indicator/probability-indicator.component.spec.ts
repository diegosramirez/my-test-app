import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProbabilityIndicatorComponent } from './probability-indicator.component';

describe('ProbabilityIndicatorComponent', () => {
  let component: ProbabilityIndicatorComponent;
  let fixture: ComponentFixture<ProbabilityIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProbabilityIndicatorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ProbabilityIndicatorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display correct percentage', () => {
    component.probability = 0.45;
    component.label = 'Arsenal Win';
    fixture.detectChanges();

    const percentageElement = fixture.nativeElement.querySelector('.percentage');
    expect(percentageElement.textContent.trim()).toBe('45%');
  });

  it('should display correct label', () => {
    component.probability = 0.30;
    component.label = 'Liverpool Win';
    fixture.detectChanges();

    const labelElement = fixture.nativeElement.querySelector('.probability-label span:first-child');
    expect(labelElement.textContent.trim()).toBe('Liverpool Win');
  });

  it('should set correct width for progress bar', () => {
    component.probability = 0.65;
    fixture.detectChanges();

    const progressFill = fixture.nativeElement.querySelector('.progress-fill');
    expect(progressFill.style.width).toBe('65%');
  });

  describe('getColorClass', () => {
    it('should return "favorite" for probability >= 0.5', () => {
      component.probability = 0.75;
      expect(component.getColorClass()).toBe('favorite');

      component.probability = 0.5;
      expect(component.getColorClass()).toBe('favorite');
    });

    it('should return "close" for probability 0.3-0.49', () => {
      component.probability = 0.45;
      expect(component.getColorClass()).toBe('close');

      component.probability = 0.3;
      expect(component.getColorClass()).toBe('close');
    });

    it('should return "underdog" for probability 0.15-0.29', () => {
      component.probability = 0.25;
      expect(component.getColorClass()).toBe('underdog');

      component.probability = 0.15;
      expect(component.getColorClass()).toBe('underdog');
    });

    it('should return "unlikely" for probability < 0.15', () => {
      component.probability = 0.1;
      expect(component.getColorClass()).toBe('unlikely');

      component.probability = 0.05;
      expect(component.getColorClass()).toBe('unlikely');
    });
  });

  it('should apply correct CSS class to progress fill', () => {
    component.probability = 0.8; // favorite
    fixture.detectChanges();

    const progressFill = fixture.nativeElement.querySelector('.progress-fill');
    expect(progressFill.classList.contains('favorite')).toBe(true);
  });

  it('should handle zero probability', () => {
    component.probability = 0;
    component.label = 'Draw';
    fixture.detectChanges();

    const percentageElement = fixture.nativeElement.querySelector('.percentage');
    expect(percentageElement.textContent.trim()).toBe('0%');

    const progressFill = fixture.nativeElement.querySelector('.progress-fill');
    expect(progressFill.style.width).toBe('0%');
    expect(progressFill.classList.contains('unlikely')).toBe(true);
  });

  it('should handle maximum probability', () => {
    component.probability = 1;
    component.label = 'Certain Win';
    fixture.detectChanges();

    const percentageElement = fixture.nativeElement.querySelector('.percentage');
    expect(percentageElement.textContent.trim()).toBe('100%');

    const progressFill = fixture.nativeElement.querySelector('.progress-fill');
    expect(progressFill.style.width).toBe('100%');
    expect(progressFill.classList.contains('favorite')).toBe(true);
  });
});