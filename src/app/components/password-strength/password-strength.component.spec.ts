import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import { PasswordStrengthComponent } from './password-strength.component';
import { PasswordStrength } from '../../types/password-strength.type';

describe('PasswordStrengthComponent', () => {
  let component: PasswordStrengthComponent;
  let fixture: ComponentFixture<PasswordStrengthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordStrengthComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PasswordStrengthComponent);
    component = fixture.componentInstance;
  });

  describe('Password Strength Visualization', () => {
    it('should display weak password indicator with red styling', () => {
      // Given: Weak password strength
      component.strength = 'weak';
      component.password = '123';
      fixture.detectChanges();

      // When: Component renders
      const weakIndicator = fixture.debugElement.query(By.css('[data-testid="strength-weak"]'));
      const strengthBar = fixture.debugElement.query(By.css('.strength-bar'));

      // Then: Shows red weak indicator
      expect(weakIndicator).toBeTruthy();
      expect(weakIndicator.nativeElement.textContent).toContain('Weak');
      expect(strengthBar.nativeElement.classList).toContain('weak');

      const strengthMeter = fixture.debugElement.query(By.css('.strength-meter'));
      expect(strengthMeter.nativeElement.style.width).toBe('33%');
      expect(strengthMeter.nativeElement.classList).toContain('red');
    });

    it('should display medium password indicator with orange styling', () => {
      // Given: Medium password strength
      component.strength = 'medium';
      component.password = 'Password123';
      fixture.detectChanges();

      // When: Component renders
      const mediumIndicator = fixture.debugElement.query(By.css('[data-testid="strength-medium"]'));
      const strengthBar = fixture.debugElement.query(By.css('.strength-bar'));

      // Then: Shows orange medium indicator
      expect(mediumIndicator).toBeTruthy();
      expect(mediumIndicator.nativeElement.textContent).toContain('Medium');
      expect(strengthBar.nativeElement.classList).toContain('medium');

      const strengthMeter = fixture.debugElement.query(By.css('.strength-meter'));
      expect(strengthMeter.nativeElement.style.width).toBe('66%');
      expect(strengthMeter.nativeElement.classList).toContain('orange');
    });

    it('should display strong password indicator with green styling', () => {
      // Given: Strong password strength
      component.strength = 'strong';
      component.password = 'StrongP@ssw0rd123!';
      fixture.detectChanges();

      // When: Component renders
      const strongIndicator = fixture.debugElement.query(By.css('[data-testid="strength-strong"]'));
      const strengthBar = fixture.debugElement.query(By.css('.strength-bar'));

      // Then: Shows green strong indicator
      expect(strongIndicator).toBeTruthy();
      expect(strongIndicator.nativeElement.textContent).toContain('Strong');
      expect(strengthBar.nativeElement.classList).toContain('strong');

      const strengthMeter = fixture.debugElement.query(By.css('.strength-meter'));
      expect(strengthMeter.nativeElement.style.width).toBe('100%');
      expect(strengthMeter.nativeElement.classList).toContain('green');
    });

    it('should not display strength indicator when password is empty', () => {
      // Given: Empty password
      component.strength = '';
      component.password = '';
      fixture.detectChanges();

      // When: Component renders
      const strengthIndicators = fixture.debugElement.queryAll(By.css('[data-testid*="strength-"]'));
      const strengthMeter = fixture.debugElement.query(By.css('.strength-meter'));

      // Then: No strength indicators shown
      expect(strengthIndicators.length).toBe(0);
      expect(strengthMeter.nativeElement.style.width).toBe('0%');
    });
  });

  describe('Password Requirements Display', () => {
    it('should show all password requirements with proper status indicators', () => {
      component.password = 'test';
      fixture.detectChanges();

      const requirements = fixture.debugElement.queryAll(By.css('[data-testid*="requirement-"]'));
      expect(requirements.length).toBeGreaterThan(0);

      const lengthRequirement = fixture.debugElement.query(By.css('[data-testid="requirement-length"]'));
      const numberRequirement = fixture.debugElement.query(By.css('[data-testid="requirement-numbers"]'));
      const specialRequirement = fixture.debugElement.query(By.css('[data-testid="requirement-special"]'));
      const uppercaseRequirement = fixture.debugElement.query(By.css('[data-testid="requirement-uppercase"]'));

      expect(lengthRequirement).toBeTruthy();
      expect(numberRequirement).toBeTruthy();
      expect(specialRequirement).toBeTruthy();
      expect(uppercaseRequirement).toBeTruthy();
    });

    it('should mark length requirement as satisfied when password is 8+ characters', () => {
      component.password = 'password';
      fixture.detectChanges();

      const lengthRequirement = fixture.debugElement.query(By.css('[data-testid="requirement-length"]'));
      expect(lengthRequirement.nativeElement.classList).toContain('satisfied');

      const checkIcon = lengthRequirement.query(By.css('.check-icon'));
      expect(checkIcon).toBeTruthy();
    });

    it('should mark number requirement as satisfied when password contains numbers', () => {
      component.password = 'password123';
      fixture.detectChanges();

      const numberRequirement = fixture.debugElement.query(By.css('[data-testid="requirement-numbers"]'));
      expect(numberRequirement.nativeElement.classList).toContain('satisfied');
    });

    it('should mark special character requirement as satisfied when password contains special chars', () => {
      component.password = 'password@';
      fixture.detectChanges();

      const specialRequirement = fixture.debugElement.query(By.css('[data-testid="requirement-special"]'));
      expect(specialRequirement.nativeElement.classList).toContain('satisfied');
    });

    it('should mark uppercase requirement as satisfied when password contains uppercase letters', () => {
      component.password = 'Password';
      fixture.detectChanges();

      const uppercaseRequirement = fixture.debugElement.query(By.css('[data-testid="requirement-uppercase"]'));
      expect(uppercaseRequirement.nativeElement.classList).toContain('satisfied');
    });

    it('should show unsatisfied state with warning icon for unmet requirements', () => {
      component.password = 'test';
      fixture.detectChanges();

      const numberRequirement = fixture.debugElement.query(By.css('[data-testid="requirement-numbers"]'));
      expect(numberRequirement.nativeElement.classList).toContain('unsatisfied');

      const warningIcon = numberRequirement.query(By.css('.warning-icon'));
      expect(warningIcon).toBeTruthy();
    });
  });

  describe('Accessibility Features', () => {
    it('should provide proper ARIA labels for strength indicators', () => {
      component.strength = 'medium';
      component.password = 'Password123';
      fixture.detectChanges();

      const strengthContainer = fixture.debugElement.query(By.css('.password-strength-container'));
      expect(strengthContainer.nativeElement.getAttribute('aria-label')).toContain('Password strength: medium');

      const strengthMeter = fixture.debugElement.query(By.css('.strength-meter'));
      expect(strengthMeter.nativeElement.getAttribute('role')).toBe('progressbar');
      expect(strengthMeter.nativeElement.getAttribute('aria-valuenow')).toBe('66');
      expect(strengthMeter.nativeElement.getAttribute('aria-valuemin')).toBe('0');
      expect(strengthMeter.nativeElement.getAttribute('aria-valuemax')).toBe('100');
    });

    it('should announce strength changes to screen readers', () => {
      const ariaLiveRegion = fixture.debugElement.query(By.css('[aria-live="polite"]'));
      expect(ariaLiveRegion).toBeTruthy();

      component.strength = 'strong';
      fixture.detectChanges();

      expect(ariaLiveRegion.nativeElement.textContent).toContain('Password strength improved to strong');
    });

    it('should use semantic markup for requirements list', () => {
      const requirementsList = fixture.debugElement.query(By.css('ul[data-testid="requirements-list"]'));
      expect(requirementsList).toBeTruthy();

      const listItems = requirementsList.queryAll(By.css('li'));
      expect(listItems.length).toBeGreaterThan(0);

      listItems.forEach(item => {
        expect(item.nativeElement.getAttribute('role')).toBe('listitem');
      });
    });
  });

  describe('Visual Design and Styling', () => {
    it('should display strength meter with proper visual progression', () => {
      // Test weak state
      component.strength = 'weak';
      fixture.detectChanges();
      let strengthMeter = fixture.debugElement.query(By.css('.strength-meter'));
      expect(strengthMeter.nativeElement.style.width).toBe('33%');

      // Test medium state
      component.strength = 'medium';
      fixture.detectChanges();
      expect(strengthMeter.nativeElement.style.width).toBe('66%');

      // Test strong state
      component.strength = 'strong';
      fixture.detectChanges();
      expect(strengthMeter.nativeElement.style.width).toBe('100%');
    });

    it('should use consistent color scheme for different strength levels', () => {
      const colorTests: Array<{strength: PasswordStrength, expectedColor: string}> = [
        { strength: 'weak', expectedColor: 'red' },
        { strength: 'medium', expectedColor: 'orange' },
        { strength: 'strong', expectedColor: 'green' }
      ];

      colorTests.forEach(({ strength, expectedColor }) => {
        component.strength = strength;
        fixture.detectChanges();

        const strengthMeter = fixture.debugElement.query(By.css('.strength-meter'));
        expect(strengthMeter.nativeElement.classList).toContain(expectedColor);
      });
    });

    it('should provide visual feedback for requirement completion', () => {
      component.password = 'CompletePassword123!';
      fixture.detectChanges();

      const requirements = fixture.debugElement.queryAll(By.css('[data-testid*="requirement-"]'));
      requirements.forEach(requirement => {
        expect(requirement.nativeElement.classList).toContain('satisfied');

        const checkIcon = requirement.query(By.css('.check-icon'));
        expect(checkIcon).toBeTruthy();
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very long passwords without performance issues', () => {
      const longPassword = 'a'.repeat(1000) + 'A1!';

      const startTime = performance.now();
      component.password = longPassword;
      component.calculateStrength();
      fixture.detectChanges();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(component.strength).toBeDefined();
    });

    it('should handle special Unicode characters in passwords', () => {
      component.password = 'Päßwörd123!€';
      component.calculateStrength();
      fixture.detectChanges();

      expect(component.strength).toBeTruthy();
      const lengthRequirement = fixture.debugElement.query(By.css('[data-testid="requirement-length"]'));
      expect(lengthRequirement.nativeElement.classList).toContain('satisfied');
    });

    it('should handle empty or undefined password gracefully', () => {
      component.password = '';
      component.calculateStrength();
      fixture.detectChanges();

      expect(component.strength).toBe('');

      component.password = undefined as any;
      component.calculateStrength();
      fixture.detectChanges();

      expect(component.strength).toBe('');
    });

    it('should update strength when password input changes', () => {
      spyOn(component, 'calculateStrength');

      component.password = 'newpassword';
      component.ngOnChanges({
        password: {
          currentValue: 'newpassword',
          previousValue: 'oldpassword',
          firstChange: false,
          isFirstChange: () => false
        }
      });

      expect(component.calculateStrength).toHaveBeenCalled();
    });
  });

  describe('Integration with Parent Component', () => {
    it('should emit strength changes to parent component', () => {
      spyOn(component.strengthChange, 'emit');

      component.password = 'StrongP@ssw0rd123!';
      component.calculateStrength();

      expect(component.strengthChange.emit).toHaveBeenCalledWith('strong');
    });

    it('should receive password updates from parent correctly', () => {
      const testPassword = 'TestPassword123!';

      component.password = testPassword;
      fixture.detectChanges();

      expect(component.password).toBe(testPassword);
    });
  });

  describe('Internationalization Support', () => {
    it('should support localized requirement text', () => {
      // Assume i18n setup
      component.requirementTexts = {
        length: 'Minimum 8 caractères',
        numbers: 'Contient des chiffres',
        special: 'Contient des caractères spéciaux',
        uppercase: 'Contient des majuscules'
      };

      fixture.detectChanges();

      const lengthRequirement = fixture.debugElement.query(By.css('[data-testid="requirement-length"]'));
      expect(lengthRequirement.nativeElement.textContent).toContain('caractères');
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should adapt layout for mobile screens', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      const strengthContainer = fixture.debugElement.query(By.css('.password-strength-container'));
      const computedStyle = window.getComputedStyle(strengthContainer.nativeElement);

      // Should stack requirements vertically on mobile
      expect(computedStyle.flexDirection).toBe('column');
    });

    it('should maintain readable text size on small screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 320 });
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      const requirements = fixture.debugElement.queryAll(By.css('[data-testid*="requirement-"]'));
      requirements.forEach(requirement => {
        const computedStyle = window.getComputedStyle(requirement.nativeElement);
        const fontSize = parseFloat(computedStyle.fontSize);
        expect(fontSize).toBeGreaterThanOrEqual(14); // Minimum readable size
      });
    });
  });
});