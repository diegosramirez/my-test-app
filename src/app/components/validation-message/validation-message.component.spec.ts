import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import { ValidationMessageComponent } from './validation-message.component';
import { ValidationMessageType } from '../../types/validation-message.type';

describe('ValidationMessageComponent', () => {
  let component: ValidationMessageComponent;
  let fixture: ComponentFixture<ValidationMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationMessageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ValidationMessageComponent);
    component = fixture.componentInstance;
  });

  describe('Message Display', () => {
    it('should display error message with red styling and error icon', () => {
      // Given: Error message
      component.message = 'Please enter a valid email address';
      component.type = 'error';
      component.show = true;
      fixture.detectChanges();

      // When: Component renders
      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      const errorIcon = fixture.debugElement.query(By.css('[data-testid="error-icon"]'));

      // Then: Shows red error message with icon
      expect(messageContainer).toBeTruthy();
      expect(messageContainer.nativeElement.classList).toContain('error');
      expect(messageContainer.nativeElement.textContent.trim()).toBe('Please enter a valid email address');
      expect(errorIcon).toBeTruthy();
    });

    it('should display success message with green styling and success icon', () => {
      // Given: Success message
      component.message = 'Email address is valid';
      component.type = 'success';
      component.show = true;
      fixture.detectChanges();

      // When: Component renders
      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      const successIcon = fixture.debugElement.query(By.css('[data-testid="success-icon"]'));

      // Then: Shows green success message with icon
      expect(messageContainer).toBeTruthy();
      expect(messageContainer.nativeElement.classList).toContain('success');
      expect(messageContainer.nativeElement.textContent.trim()).toBe('Email address is valid');
      expect(successIcon).toBeTruthy();
    });

    it('should display warning message with orange styling and warning icon', () => {
      // Given: Warning message
      component.message = 'Password could be stronger';
      component.type = 'warning';
      component.show = true;
      fixture.detectChanges();

      // When: Component renders
      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      const warningIcon = fixture.debugElement.query(By.css('[data-testid="warning-icon"]'));

      // Then: Shows orange warning message with icon
      expect(messageContainer).toBeTruthy();
      expect(messageContainer.nativeElement.classList).toContain('warning');
      expect(messageContainer.nativeElement.textContent.trim()).toBe('Password could be stronger');
      expect(warningIcon).toBeTruthy();
    });

    it('should display info message with blue styling and info icon', () => {
      // Given: Info message
      component.message = 'Password must be at least 8 characters';
      component.type = 'info';
      component.show = true;
      fixture.detectChanges();

      // When: Component renders
      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      const infoIcon = fixture.debugElement.query(By.css('[data-testid="info-icon"]'));

      // Then: Shows blue info message with icon
      expect(messageContainer).toBeTruthy();
      expect(messageContainer.nativeElement.classList).toContain('info');
      expect(messageContainer.nativeElement.textContent.trim()).toBe('Password must be at least 8 characters');
      expect(infoIcon).toBeTruthy();
    });

    it('should not display message when show is false', () => {
      // Given: Message with show set to false
      component.message = 'This should not be visible';
      component.type = 'error';
      component.show = false;
      fixture.detectChanges();

      // When: Component renders
      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));

      // Then: No message is displayed
      expect(messageContainer).toBeFalsy();
    });

    it('should not display message when message is empty', () => {
      // Given: Empty message
      component.message = '';
      component.type = 'error';
      component.show = true;
      fixture.detectChanges();

      // When: Component renders
      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));

      // Then: No message is displayed
      expect(messageContainer).toBeFalsy();
    });

    it('should handle undefined or null messages gracefully', () => {
      component.message = undefined as any;
      component.type = 'error';
      component.show = true;
      fixture.detectChanges();

      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      expect(messageContainer).toBeFalsy();

      component.message = null as any;
      fixture.detectChanges();

      const messageContainer2 = fixture.debugElement.query(By.css('.validation-message'));
      expect(messageContainer2).toBeFalsy();
    });
  });

  describe('Accessibility Features', () => {
    it('should provide proper ARIA attributes for screen readers', () => {
      component.message = 'Email is required';
      component.type = 'error';
      component.show = true;
      component.fieldId = 'email-input';
      fixture.detectChanges();

      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));

      expect(messageContainer.nativeElement.getAttribute('role')).toBe('alert');
      expect(messageContainer.nativeElement.getAttribute('aria-live')).toBe('polite');
      expect(messageContainer.nativeElement.getAttribute('id')).toBe('email-input-error');
      expect(messageContainer.nativeElement.getAttribute('aria-atomic')).toBe('true');
    });

    it('should use assertive aria-live for error messages', () => {
      component.message = 'Critical validation error';
      component.type = 'error';
      component.show = true;
      fixture.detectChanges();

      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      expect(messageContainer.nativeElement.getAttribute('aria-live')).toBe('assertive');
    });

    it('should use polite aria-live for non-error messages', () => {
      const nonErrorTypes: ValidationMessageType[] = ['success', 'warning', 'info'];

      nonErrorTypes.forEach(type => {
        component.message = `Test ${type} message`;
        component.type = type;
        component.show = true;
        fixture.detectChanges();

        const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
        expect(messageContainer.nativeElement.getAttribute('aria-live')).toBe('polite');
      });
    });

    it('should provide descriptive text for icons', () => {
      component.message = 'Test error message';
      component.type = 'error';
      component.show = true;
      fixture.detectChanges();

      const errorIcon = fixture.debugElement.query(By.css('[data-testid="error-icon"]'));
      expect(errorIcon.nativeElement.getAttribute('aria-hidden')).toBe('true');

      const iconText = fixture.debugElement.query(By.css('.sr-only'));
      expect(iconText.nativeElement.textContent).toContain('Error');
    });

    it('should associate message with form field using aria-describedby', () => {
      component.message = 'Field validation message';
      component.type = 'error';
      component.show = true;
      component.fieldId = 'password-input';
      fixture.detectChanges();

      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      expect(messageContainer.nativeElement.getAttribute('id')).toBe('password-input-error');
    });
  });

  describe('Animation and Transitions', () => {
    it('should apply fade-in animation when message appears', () => {
      component.message = 'New validation message';
      component.type = 'error';
      component.show = true;
      fixture.detectChanges();

      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      expect(messageContainer.nativeElement.classList).toContain('fade-in');
    });

    it('should apply fade-out animation when message disappears', () => {
      // Setup visible message
      component.message = 'Visible message';
      component.type = 'error';
      component.show = true;
      fixture.detectChanges();

      // Hide message
      component.show = false;
      fixture.detectChanges();

      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      if (messageContainer) {
        expect(messageContainer.nativeElement.classList).toContain('fade-out');
      }
    });

    it('should handle rapid show/hide toggles gracefully', () => {
      component.message = 'Toggle test message';
      component.type = 'error';

      // Rapid toggling
      component.show = true;
      fixture.detectChanges();

      component.show = false;
      fixture.detectChanges();

      component.show = true;
      fixture.detectChanges();

      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      expect(messageContainer).toBeTruthy();
    });
  });

  describe('Styling and Visual Design', () => {
    it('should apply consistent spacing and typography', () => {
      component.message = 'Test message for styling';
      component.type = 'error';
      component.show = true;
      fixture.detectChanges();

      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      const computedStyle = window.getComputedStyle(messageContainer.nativeElement);

      expect(parseFloat(computedStyle.marginTop)).toBeGreaterThan(0);
      expect(parseFloat(computedStyle.fontSize)).toBeGreaterThan(0);
      expect(computedStyle.fontWeight).toBeDefined();
    });

    it('should use distinct colors for different message types', () => {
      const colorTests: Array<{type: ValidationMessageType, expectedClass: string}> = [
        { type: 'error', expectedClass: 'error' },
        { type: 'success', expectedClass: 'success' },
        { type: 'warning', expectedClass: 'warning' },
        { type: 'info', expectedClass: 'info' }
      ];

      colorTests.forEach(({ type, expectedClass }) => {
        component.message = `Test ${type} message`;
        component.type = type;
        component.show = true;
        fixture.detectChanges();

        const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
        expect(messageContainer.nativeElement.classList).toContain(expectedClass);
      });
    });

    it('should display icons alongside text without layout issues', () => {
      component.message = 'Message with icon';
      component.type = 'success';
      component.show = true;
      fixture.detectChanges();

      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      const icon = messageContainer.query(By.css('[data-testid="success-icon"]'));
      const textContent = messageContainer.query(By.css('.message-text'));

      expect(icon).toBeTruthy();
      expect(textContent).toBeTruthy();

      const containerStyle = window.getComputedStyle(messageContainer.nativeElement);
      expect(containerStyle.display).toBe('flex');
      expect(containerStyle.alignItems).toBe('center');
    });
  });

  describe('Message Content Handling', () => {
    it('should handle long validation messages gracefully', () => {
      const longMessage = 'This is a very long validation message that should wrap properly and maintain readability even when it contains multiple lines of text that exceed the normal width of the container.';

      component.message = longMessage;
      component.type = 'error';
      component.show = true;
      fixture.detectChanges();

      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      expect(messageContainer.nativeElement.textContent.trim()).toBe(longMessage);

      const computedStyle = window.getComputedStyle(messageContainer.nativeElement);
      expect(computedStyle.wordWrap).toBe('break-word');
    });

    it('should sanitize and display HTML content safely', () => {
      component.message = '<script>alert("xss")</script>Safe message';
      component.type = 'error';
      component.show = true;
      fixture.detectChanges();

      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      expect(messageContainer.nativeElement.textContent).not.toContain('<script>');
      expect(messageContainer.nativeElement.textContent).toContain('Safe message');
    });

    it('should support basic formatting in messages', () => {
      component.message = 'Password must contain: uppercase, lowercase, numbers, and symbols';
      component.type = 'info';
      component.show = true;
      component.allowFormatting = true;
      fixture.detectChanges();

      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      expect(messageContainer.nativeElement.innerHTML).toContain('Password must contain');
    });

    it('should handle special characters and internationalization', () => {
      component.message = 'L\'adresse e-mail doit être valide (français: àéèêë)';
      component.type = 'error';
      component.show = true;
      fixture.detectChanges();

      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      expect(messageContainer.nativeElement.textContent).toContain('français');
      expect(messageContainer.nativeElement.textContent).toContain('àéèêë');
    });
  });

  describe('Integration with Form Controls', () => {
    it('should emit message click events for interactive messages', () => {
      spyOn(component.messageClicked, 'emit');

      component.message = 'Click for more info';
      component.type = 'info';
      component.show = true;
      component.clickable = true;
      fixture.detectChanges();

      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      messageContainer.nativeElement.click();

      expect(component.messageClicked.emit).toHaveBeenCalled();
    });

    it('should support custom CSS classes for specific use cases', () => {
      component.message = 'Custom styled message';
      component.type = 'error';
      component.show = true;
      component.customClass = 'custom-validation-style';
      fixture.detectChanges();

      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      expect(messageContainer.nativeElement.classList).toContain('custom-validation-style');
    });

    it('should handle multiple validation messages for the same field', () => {
      component.messages = [
        { text: 'Field is required', type: 'error' },
        { text: 'Must be a valid format', type: 'warning' }
      ];
      component.show = true;
      fixture.detectChanges();

      const messageContainers = fixture.debugElement.queryAll(By.css('.validation-message'));
      expect(messageContainers.length).toBe(2);
      expect(messageContainers[0].nativeElement.textContent.trim()).toBe('Field is required');
      expect(messageContainers[1].nativeElement.textContent.trim()).toBe('Must be a valid format');
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should adapt text size and spacing for mobile screens', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      window.dispatchEvent(new Event('resize'));

      component.message = 'Mobile validation message';
      component.type = 'error';
      component.show = true;
      fixture.detectChanges();

      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      const computedStyle = window.getComputedStyle(messageContainer.nativeElement);

      const fontSize = parseFloat(computedStyle.fontSize);
      expect(fontSize).toBeGreaterThanOrEqual(14); // Minimum readable size
    });

    it('should maintain icon visibility and alignment on small screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 320 });

      component.message = 'Error on small screen';
      component.type = 'error';
      component.show = true;
      fixture.detectChanges();

      const icon = fixture.debugElement.query(By.css('[data-testid="error-icon"]'));
      const computedStyle = window.getComputedStyle(icon.nativeElement);

      expect(parseFloat(computedStyle.width)).toBeGreaterThan(0);
      expect(parseFloat(computedStyle.height)).toBeGreaterThan(0);
    });
  });

  describe('Performance Considerations', () => {
    it('should not re-render unnecessarily when message content is unchanged', () => {
      spyOn(component, 'ngOnChanges').and.callThrough();

      component.message = 'Stable message';
      component.type = 'error';
      component.show = true;
      fixture.detectChanges();

      // Same message again
      component.message = 'Stable message';
      fixture.detectChanges();

      // Should not trigger unnecessary updates
      expect(component.ngOnChanges).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid message updates efficiently', () => {
      const messages = [
        'Message 1',
        'Message 2',
        'Message 3',
        'Message 4',
        'Message 5'
      ];

      const startTime = performance.now();

      messages.forEach(msg => {
        component.message = msg;
        component.type = 'info';
        component.show = true;
        fixture.detectChanges();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle component destruction gracefully', () => {
      component.message = 'Test message';
      component.type = 'error';
      component.show = true;
      fixture.detectChanges();

      expect(() => {
        fixture.destroy();
      }).not.toThrow();
    });

    it('should handle invalid message types gracefully', () => {
      component.message = 'Test message';
      component.type = 'invalid' as any;
      component.show = true;

      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();

      const messageContainer = fixture.debugElement.query(By.css('.validation-message'));
      expect(messageContainer.nativeElement.classList).toContain('default');
    });
  });
});