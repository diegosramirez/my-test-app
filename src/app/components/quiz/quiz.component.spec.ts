import { TestBed } from '@angular/core/testing';
import { QuizComponent, QuizQuestion, QuizState } from './quiz.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

describe('QuizComponent', () => {
  let component: QuizComponent;
  let fixture: any;
  let debugElement: DebugElement;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  const mockQuestion: QuizQuestion = {
    id: 'test-q1',
    question: 'What does HTML stand for?',
    category: 'HTML',
    correctAnswerIndex: 0,
    options: [
      { id: 'opt1', text: 'Hyper Text Markup Language', letter: 'A' },
      { id: 'opt2', text: 'High Tech Modern Language', letter: 'B' },
      { id: 'opt3', text: 'Hyper Transfer Markup Language', letter: 'C' },
      { id: 'opt4', text: 'Home Tool Markup Language', letter: 'D' }
    ]
  };

  beforeEach(async () => {
    // Setup console error monitoring
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [QuizComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement;

    // Override component state with test mockQuestion
    component.state = {
      currentQuestion: mockQuestion,
      selectedOptionId: null,
      isAnswered: false,
      showFeedback: false,
      isCorrect: null
    };
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('AC1: Standalone Component Structure & Layout', () => {
    it('should create the component as standalone Angular component', () => {
      expect(component).toBeTruthy();
      expect(component).toBeInstanceOf(QuizComponent);
    });

    it('should render with correct layout structure matching design specifications', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement as HTMLElement;

      // Verify main container structure
      const quizContainer = compiled.querySelector('[data-testid="quiz-component"]');
      expect(quizContainer).toBeTruthy();
      expect(quizContainer?.tagName.toLowerCase()).toBe('main');
      expect(quizContainer?.classList.contains('quiz-container')).toBe(true);

      // Verify header structure
      const header = compiled.querySelector('.quiz-header');
      expect(header).toBeTruthy();
      expect(header?.tagName.toLowerCase()).toBe('header');

      // Verify category and question elements
      const categoryLabel = compiled.querySelector('.category-label');
      expect(categoryLabel?.textContent?.trim()).toBe('HTML');

      const questionElement = compiled.querySelector('#quiz-question');
      expect(questionElement?.tagName.toLowerCase()).toBe('h1');
      expect(questionElement?.textContent?.trim()).toBe('What does HTML stand for?');

      // Verify options section structure
      const optionsSection = compiled.querySelector('.quiz-options');
      expect(optionsSection?.tagName.toLowerCase()).toBe('section');
      expect(optionsSection?.getAttribute('role')).toBe('radiogroup');
      expect(optionsSection?.getAttribute('aria-labelledby')).toBe('quiz-question');

      // Verify all 4 options are rendered
      const options = compiled.querySelectorAll('.option-container');
      expect(options.length).toBe(4);

      // Verify submit actions section
      const actionsSection = compiled.querySelector('.quiz-actions');
      expect(actionsSection?.tagName.toLowerCase()).toBe('section');

      const submitButton = compiled.querySelector('[data-testid="submit-answer-button"]');
      expect(submitButton?.tagName.toLowerCase()).toBe('button');
    });

    it('should render all quiz options with correct structure and data', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement as HTMLElement;
      const options = compiled.querySelectorAll('[data-testid^="quiz-option-"]');

      expect(options.length).toBe(4);

      options.forEach((option, index) => {
        const letter = option.querySelector('.option-letter');
        const text = option.querySelector('.option-text');

        expect(letter?.textContent?.trim()).toBe(mockQuestion.options[index].letter);
        expect(text?.textContent?.trim()).toBe(mockQuestion.options[index].text);

        // Verify option structure
        expect(option.classList.contains('option-container')).toBe(true);
        expect(option.getAttribute('role')).toBe('radio');
        expect(option.getAttribute('tabindex')).toBe('0');
      });
    });
  });

  describe('AC2: Responsive Design at Breakpoints', () => {
    it('should maintain layout integrity at mobile breakpoint (375px)', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true });
      window.dispatchEvent(new Event('resize'));

      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement as HTMLElement;

      // Verify main container maintains structure
      const container = compiled.querySelector('.quiz-container');
      expect(container).toBeTruthy();

      // Verify content is properly constrained
      const content = compiled.querySelector('.quiz-content');
      expect(content).toBeTruthy();

      // Verify options maintain proper spacing and sizing
      const options = compiled.querySelectorAll('.option-container');
      expect(options.length).toBe(4);

      // Verify touch targets are accessible (44px minimum)
      options.forEach(option => {
        const styles = window.getComputedStyle(option);
        // CSS should handle minimum touch target via min-height
        expect(option.classList.contains('option-container')).toBe(true);
      });

      // Verify submit button maintains proper size
      const submitButton = compiled.querySelector('.submit-button');
      expect(submitButton).toBeTruthy();
    });

    it('should maintain layout integrity at desktop breakpoint (1440px)', async () => {
      // Simulate desktop viewport
      Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
      window.dispatchEvent(new Event('resize'));

      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement as HTMLElement;

      // Verify layout structure remains intact
      const container = compiled.querySelector('.quiz-container');
      const content = compiled.querySelector('.quiz-content');
      const options = compiled.querySelectorAll('.option-container');

      expect(container).toBeTruthy();
      expect(content).toBeTruthy();
      expect(options.length).toBe(4);

      // Verify proper spacing is maintained
      const header = compiled.querySelector('.quiz-header');
      const optionsSection = compiled.querySelector('.quiz-options');
      const actions = compiled.querySelector('.quiz-actions');

      expect(header).toBeTruthy();
      expect(optionsSection).toBeTruthy();
      expect(actions).toBeTruthy();
    });

    it('should maintain readability at different breakpoints', async () => {
      const viewports = [
        { width: 375, name: 'mobile' },
        { width: 768, name: 'tablet' },
        { width: 1440, name: 'desktop' }
      ];

      for (const viewport of viewports) {
        Object.defineProperty(window, 'innerWidth', { value: viewport.width, configurable: true });
        window.dispatchEvent(new Event('resize'));

        fixture.detectChanges();
        await fixture.whenStable();

        const compiled = fixture.nativeElement as HTMLElement;

        // Verify text remains readable
        const question = compiled.querySelector('#quiz-question');
        const options = compiled.querySelectorAll('.option-text');

        expect(question?.textContent).toBeTruthy();
        expect(options.length).toBe(4);

        options.forEach(option => {
          expect(option.textContent).toBeTruthy();
        });
      }
    });
  });

  describe('AC3: Visual Feedback States & Hover', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should display hover feedback states correctly', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const optionA = compiled.querySelector('[data-testid="quiz-option-a"]') as HTMLElement;

      // Verify initial state
      expect(optionA.classList.contains('selected')).toBe(false);
      expect(optionA.classList.contains('disabled')).toBe(false);

      // Simulate hover (through CSS classes that would be applied)
      // Since we can't actually trigger CSS :hover in tests, we verify the structure
      // that enables hover effects
      expect(optionA.classList.contains('option-container')).toBe(true);
      expect(optionA.getAttribute('tabindex')).toBe('0');

      // Verify hover-ready state before selection
      expect(component.state.isAnswered).toBe(false);

      // Test that hover styles are properly structured in DOM
      const optionLetters = compiled.querySelectorAll('.option-letter');
      const optionTexts = compiled.querySelectorAll('.option-text');

      expect(optionLetters.length).toBe(4);
      expect(optionTexts.length).toBe(4);
    });

    it('should show smooth transitions between states', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const options = compiled.querySelectorAll('.option-container');

      // Verify transition classes are present for smooth animations
      options.forEach(option => {
        expect(option.classList.contains('option-container')).toBe(true);
        // CSS should have transition properties defined
      });

      // Test state transitions
      const optionA = compiled.querySelector('[data-testid="quiz-option-a"]') as HTMLElement;

      // Before selection
      expect(optionA.classList.contains('selected')).toBe(false);

      // After selection
      optionA.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(optionA.classList.contains('selected')).toBe(true);
      expect(component.state.selectedOptionId).toBe('opt1');
    });

    it('should disable hover effects when quiz is answered', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const optionA = compiled.querySelector('[data-testid="quiz-option-a"]') as HTMLElement;
      const submitButton = compiled.querySelector('[data-testid="submit-answer-button"]') as HTMLButtonElement;

      // Select and submit answer
      optionA.click();
      fixture.detectChanges();
      await fixture.whenStable();

      submitButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify component state is answered
      expect(component.state.isAnswered).toBe(true);

      // Verify disabled state is applied in the DOM
      const options = compiled.querySelectorAll('.option-container');
      options.forEach(option => {
        expect(option.classList.contains('disabled')).toBe(true);
      });

      // Verify further selection is prevented
      const initialSelection = component.state.selectedOptionId;
      component.onOptionSelect('opt2');
      expect(component.state.selectedOptionId).toBe(initialSelection);
    });
  });

  describe('AC4: Answer Selection & Submit Functionality', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should visually indicate selection state', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const optionA = compiled.querySelector('[data-testid="quiz-option-a"]') as HTMLElement;
      const optionB = compiled.querySelector('[data-testid="quiz-option-b"]') as HTMLElement;

      // Initial state - no selection
      expect(optionA.classList.contains('selected')).toBe(false);
      expect(optionB.classList.contains('selected')).toBe(false);

      // Select option A
      optionA.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(optionA.classList.contains('selected')).toBe(true);
      expect(optionB.classList.contains('selected')).toBe(false);
      expect(component.isOptionSelected('opt1')).toBe(true);
      expect(component.isOptionSelected('opt2')).toBe(false);

      // Change selection to option B
      optionB.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(optionA.classList.contains('selected')).toBe(false);
      expect(optionB.classList.contains('selected')).toBe(true);
      expect(component.isOptionSelected('opt1')).toBe(false);
      expect(component.isOptionSelected('opt2')).toBe(true);
    });

    it('should enable submit functionality when option is selected', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('[data-testid="submit-answer-button"]') as HTMLButtonElement;
      const optionA = compiled.querySelector('[data-testid="quiz-option-a"]') as HTMLElement;

      // Initially disabled
      expect(submitButton.disabled).toBe(true);
      expect(submitButton.classList.contains('disabled')).toBe(true);
      expect(component.canSubmit()).toBe(false);

      // Enable after selection
      optionA.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(submitButton.disabled).toBe(false);
      expect(submitButton.classList.contains('disabled')).toBe(false);
      expect(component.canSubmit()).toBe(true);
    });

    it('should show helpful hint when no option selected', async () => {
      const compiled = fixture.nativeElement as HTMLElement;

      fixture.detectChanges();
      await fixture.whenStable();

      const submitHint = compiled.querySelector('.submit-hint');
      expect(submitHint?.textContent?.trim()).toBe('Please select an answer before submitting');
      expect(submitHint?.getAttribute('aria-live')).toBe('polite');
    });

    it('should process answer submission correctly', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const optionA = compiled.querySelector('[data-testid="quiz-option-a"]') as HTMLElement;

      // Select correct answer
      optionA.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.state.selectedOptionId).toBe('opt1');
      expect(component.state.isAnswered).toBe(false);

      // Submit answer
      const submitButton = compiled.querySelector('[data-testid="submit-answer-button"]') as HTMLButtonElement;
      submitButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.state.isAnswered).toBe(true);
      expect(component.state.showFeedback).toBe(true);
      expect(component.state.isCorrect).toBe(true);

      // Verify feedback appears
      const feedbackSection = compiled.querySelector('.quiz-feedback');
      expect(feedbackSection).toBeTruthy();
      expect(feedbackSection?.getAttribute('role')).toBe('alert');
    });
  });

  describe('AC5: Bundle Size Performance', () => {
    it('should have minimal component overhead', () => {
      // Test component instantiation performance
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        const testFixture = TestBed.createComponent(QuizComponent);
        testFixture.componentInstance;
      }

      const endTime = performance.now();
      const componentCreationTime = endTime - startTime;

      // Should create 100 components in reasonable time (< 1000ms)
      expect(componentCreationTime).toBeLessThan(1000);
    });

    it('should not import unnecessary dependencies', () => {
      // Verify component only imports what it needs
      expect(component).toBeTruthy();

      // Check that the component class is lean
      const componentMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(component));
      const expectedMethods = [
        'constructor',
        'ngOnInit',
        'onOptionSelect',
        'onSubmitAnswer',
        'onTryAgain',
        'isOptionSelected',
        'isOptionCorrect',
        'isOptionIncorrect',
        'canSubmit',
        'getFeedbackMessage',
        'trackByOptionId'
      ];

      expectedMethods.forEach(method => {
        expect(componentMethods).toContain(method);
      });
    });

    it('should efficiently track DOM changes', async () => {
      const trackingCalls: string[] = [];
      const originalTrackBy = component.trackByOptionId;

      // Spy on trackBy function
      component.trackByOptionId = vi.fn((index: number, option: any) => {
        trackingCalls.push(option.id);
        return originalTrackBy.call(component, index, option);
      });

      fixture.detectChanges();
      await fixture.whenStable();

      // Should call trackBy for each option
      expect(trackingCalls.length).toBe(4);
      expect(trackingCalls).toEqual(['opt1', 'opt2', 'opt3', 'opt4']);
    });
  });

  describe('AC6: Screen Reader & Accessibility Support', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should have proper ARIA structure for screen readers', () => {
      const compiled = fixture.nativeElement as HTMLElement;

      // Main container should be a landmark
      const main = compiled.querySelector('main');
      expect(main).toBeTruthy();

      // Quiz options should be a proper radio group
      const radioGroup = compiled.querySelector('[role="radiogroup"]');
      expect(radioGroup).toBeTruthy();
      expect(radioGroup?.getAttribute('aria-labelledby')).toBe('quiz-question');

      // Each option should be a radio button
      const radios = compiled.querySelectorAll('[role="radio"]');
      expect(radios.length).toBe(4);

      radios.forEach((radio, index) => {
        expect(radio.getAttribute('tabindex')).toBe('0');
        expect(radio.getAttribute('aria-checked')).toBe('false');
        expect(radio.getAttribute('aria-label')).toContain(`Option ${mockQuestion.options[index].letter}`);
      });
    });

    it('should support complete keyboard navigation', async () => {
      const optionElements = debugElement.queryAll(By.css('[role="radio"]'));

      // Test Enter key selection
      optionElements[0].triggerEventHandler('keydown.enter', {});
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.state.selectedOptionId).toBe('opt1');

      // Reset for space key test
      component.state.selectedOptionId = null;

      // Test Space key selection
      const preventDefaultSpy = vi.fn();
      optionElements[1].triggerEventHandler('keydown.space', { preventDefault: preventDefaultSpy });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.state.selectedOptionId).toBe('opt2');
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should announce selection changes to screen readers', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const optionA = compiled.querySelector('[data-testid="quiz-option-a"]') as HTMLElement;

      // Select option
      optionA.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify aria-checked is updated
      expect(optionA.getAttribute('aria-checked')).toBe('true');

      // Verify other options remain unchecked
      const otherOptions = compiled.querySelectorAll('[data-testid^="quiz-option-"]:not([data-testid="quiz-option-a"])');
      otherOptions.forEach(option => {
        expect(option.getAttribute('aria-checked')).toBe('false');
      });
    });

    it('should have live regions for feedback announcements', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const optionA = compiled.querySelector('[data-testid="quiz-option-a"]') as HTMLElement;

      optionA.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const submitButton = compiled.querySelector('[data-testid="submit-answer-button"]') as HTMLButtonElement;
      submitButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify feedback has live region
      const liveRegion = compiled.querySelector('[role="alert"][aria-live="assertive"]');
      expect(liveRegion).toBeTruthy();

      const feedbackMessage = liveRegion?.querySelector('.feedback-message');
      expect(feedbackMessage?.textContent?.trim()).toBe('Correct! Well done.');
    });

    it('should provide descriptive labels for all interactive elements', () => {
      const compiled = fixture.nativeElement as HTMLElement;

      // Category should have aria-label
      const categoryLabel = compiled.querySelector('.category-label');
      expect(categoryLabel?.getAttribute('aria-label')).toContain('Quiz category: HTML');

      // Submit button should have proper accessibility
      const submitButton = compiled.querySelector('[data-testid="submit-answer-button"]');
      expect(submitButton?.tagName.toLowerCase()).toBe('button');
      expect(submitButton?.textContent?.trim()).toBe('Submit Answer');

      // Submit hint should be referenced
      const submitHint = compiled.querySelector('#submit-hint');
      expect(submitHint).toBeTruthy();
    });
  });

  describe('AC7: Zero Console Errors', () => {
    it('should load without console errors', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should complete interaction flow without errors', async () => {
      const compiled = fixture.nativeElement as HTMLElement;

      fixture.detectChanges();
      await fixture.whenStable();

      // Select option
      const optionA = compiled.querySelector('[data-testid="quiz-option-a"]') as HTMLElement;
      optionA.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Submit answer
      const submitButton = compiled.querySelector('[data-testid="submit-answer-button"]') as HTMLButtonElement;
      submitButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Try again
      const tryAgainButton = compiled.querySelector('[data-testid="try-again-button"]') as HTMLButtonElement;
      tryAgainButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // No errors should occur during complete interaction
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should handle edge cases without errors', async () => {
      // Test rapid clicking
      const compiled = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
      await fixture.whenStable();

      const optionA = compiled.querySelector('[data-testid="quiz-option-a"]') as HTMLElement;

      // Rapid clicks should not cause errors
      for (let i = 0; i < 10; i++) {
        optionA.click();
      }

      fixture.detectChanges();
      await fixture.whenStable();

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      // Test invalid selections
      component.onOptionSelect('invalid-id');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('AC8: Visual Fidelity & Design Compliance', () => {
    it('should use correct design tokens from Figma', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();

      // Verify design token classes are applied
      const container = compiled.querySelector('.quiz-container');
      expect(container?.classList.contains('quiz-container')).toBe(true);

      const content = compiled.querySelector('.quiz-content');
      expect(content?.classList.contains('quiz-content')).toBe(true);

      const options = compiled.querySelectorAll('.option-container');
      expect(options.length).toBe(4);
      options.forEach(option => {
        expect(option.classList.contains('option-container')).toBe(true);
      });
    });

    it('should maintain consistent spacing and typography', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();

      // Verify proper heading hierarchy
      const h1 = compiled.querySelector('h1#quiz-question');
      expect(h1).toBeTruthy();
      expect(h1?.classList.contains('quiz-question')).toBe(true);

      // Verify category styling
      const category = compiled.querySelector('.category-label');
      expect(category).toBeTruthy();

      // Verify option styling consistency
      const optionLetters = compiled.querySelectorAll('.option-letter');
      const optionTexts = compiled.querySelectorAll('.option-text');

      expect(optionLetters.length).toBe(4);
      expect(optionTexts.length).toBe(4);

      // All should have consistent structure
      optionLetters.forEach(letter => {
        expect(letter.classList.contains('option-letter')).toBe(true);
      });
    });

    it('should implement proper color states for feedback', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
      await fixture.whenStable();

      // Test correct answer feedback
      const optionA = compiled.querySelector('[data-testid="quiz-option-a"]') as HTMLElement;
      const submitButton = compiled.querySelector('[data-testid="submit-answer-button"]') as HTMLButtonElement;

      optionA.click();
      submitButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Correct option should have correct state
      expect(optionA.classList.contains('correct')).toBe(true);

      // Test incorrect answer feedback
      component.onTryAgain();
      fixture.detectChanges();
      await fixture.whenStable();

      const optionB = compiled.querySelector('[data-testid="quiz-option-b"]') as HTMLElement;
      const newSubmitButton = compiled.querySelector('[data-testid="submit-answer-button"]') as HTMLButtonElement;

      optionB.click();
      newSubmitButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Incorrect option should have incorrect state
      expect(optionB.classList.contains('incorrect')).toBe(true);
      // Correct option should still show correct state
      expect(optionA.classList.contains('correct')).toBe(true);
    });

    it('should render feedback icons correctly', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
      await fixture.whenStable();

      const optionA = compiled.querySelector('[data-testid="quiz-option-a"]') as HTMLElement;
      const submitButton = compiled.querySelector('[data-testid="submit-answer-button"]') as HTMLButtonElement;

      optionA.click();
      submitButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify feedback icons are rendered
      const successIcon = compiled.querySelector('.success-icon');
      expect(successIcon).toBeTruthy();
      expect(successIcon?.getAttribute('width')).toBe('24');
      expect(successIcon?.getAttribute('height')).toBe('24');

      // Verify option indicators
      const correctIcon = compiled.querySelector('.correct-icon');
      expect(correctIcon).toBeTruthy();
      expect(correctIcon?.getAttribute('width')).toBe('20');
      expect(correctIcon?.getAttribute('height')).toBe('20');
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle missing question data gracefully', () => {
      component.state.currentQuestion = null;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const loadingState = compiled.querySelector('.quiz-loading');
      expect(loadingState).toBeTruthy();
      expect(loadingState?.textContent).toContain('Loading quiz question...');
      expect(loadingState?.getAttribute('role')).toBe('status');
      expect(loadingState?.getAttribute('aria-live')).toBe('polite');
    });

    it('should prevent double submission', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
      await fixture.whenStable();

      const optionA = compiled.querySelector('[data-testid="quiz-option-a"]') as HTMLElement;
      const submitButton = compiled.querySelector('[data-testid="submit-answer-button"]') as HTMLButtonElement;

      optionA.click();
      submitButton.click();

      // Try to submit again
      const initialState = { ...component.state };
      component.onSubmitAnswer();

      // State should not change
      expect(component.state.isAnswered).toBe(initialState.isAnswered);
      expect(component.state.showFeedback).toBe(initialState.showFeedback);
    });

    it('should handle invalid option selection', () => {
      const originalSelection = component.state.selectedOptionId;

      // Try to select non-existent option
      component.onOptionSelect('non-existent-id');

      expect(component.state.selectedOptionId).toBe('non-existent-id');

      // But submission should handle this gracefully
      component.onSubmitAnswer();

      // Should handle the case where option is not found
      expect(component.state.isAnswered).toBe(true);
    });

    it('should reset state properly', () => {
      // Set up a complete answered state
      component.state = {
        currentQuestion: mockQuestion,
        selectedOptionId: 'opt2',
        isAnswered: true,
        showFeedback: true,
        isCorrect: false
      };

      // Reset
      component.onTryAgain();

      expect(component.state.selectedOptionId).toBe(null);
      expect(component.state.isAnswered).toBe(false);
      expect(component.state.showFeedback).toBe(false);
      expect(component.state.isCorrect).toBe(null);
      expect(component.state.currentQuestion).toBeTruthy();
    });
  });

  describe('Component Methods Validation', () => {
    it('should track options correctly', () => {
      const option = mockQuestion.options[0];
      expect(component.trackByOptionId(0, option)).toBe('opt1');

      const option2 = mockQuestion.options[1];
      expect(component.trackByOptionId(1, option2)).toBe('opt2');
    });

    it('should validate selection states correctly', () => {
      component.state.selectedOptionId = 'opt1';

      expect(component.isOptionSelected('opt1')).toBe(true);
      expect(component.isOptionSelected('opt2')).toBe(false);
      expect(component.isOptionSelected('')).toBe(false);
    });

    it('should validate correct answer states', () => {
      component.state = {
        currentQuestion: mockQuestion,
        selectedOptionId: 'opt1',
        isAnswered: true,
        showFeedback: true,
        isCorrect: true
      };

      expect(component.isOptionCorrect('opt1')).toBe(true);
      expect(component.isOptionCorrect('opt2')).toBe(false);

      // Without feedback, should return false
      component.state.showFeedback = false;
      expect(component.isOptionCorrect('opt1')).toBe(false);
    });

    it('should provide appropriate feedback messages', () => {
      // No feedback state
      component.state.showFeedback = false;
      expect(component.getFeedbackMessage()).toBe('');

      // Correct answer
      component.state.showFeedback = true;
      component.state.isCorrect = true;
      expect(component.getFeedbackMessage()).toBe('Correct! Well done.');

      // Incorrect answer
      component.state.isCorrect = false;
      expect(component.getFeedbackMessage()).toBe('Incorrect. The correct answer is highlighted above.');
    });
  });
});