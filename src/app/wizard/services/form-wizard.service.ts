import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  WizardFormData,
  WizardStep,
  PersonalInfo,
  AddressInfo,
  StepValidationState
} from '../models/wizard-form-data.interface';

@Injectable({
  providedIn: 'root'
})
export class FormWizardService {
  private readonly STORAGE_KEY = 'wizard-form-data';

  private formDataSubject = new BehaviorSubject<WizardFormData>(this.initializeFormData());
  private currentStepSubject = new BehaviorSubject<WizardStep>(WizardStep.PERSONAL);

  public readonly formData$ = this.formDataSubject.asObservable();
  public readonly currentStep$ = this.currentStepSubject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  private initializeFormData(): WizardFormData {
    const sessionId = this.generateSessionId();
    const now = new Date();

    return {
      personalInfo: {
        name: '',
        email: '',
        phone: ''
      },
      addressInfo: {
        street: '',
        city: '',
        state: '',
        zipCode: ''
      },
      currentStep: WizardStep.PERSONAL,
      completedSteps: [],
      sessionId,
      timestamps: {
        started: now,
        stepStarted: now,
        lastUpdated: now
      }
    };
  }

  private generateSessionId(): string {
    return 'wizard_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  saveStepData(step: WizardStep, data: Partial<PersonalInfo | AddressInfo>): void {
    const currentData = this.formDataSubject.value;
    const updatedData = { ...currentData };
    updatedData.timestamps.lastUpdated = new Date();

    if (step === WizardStep.PERSONAL) {
      updatedData.personalInfo = { ...updatedData.personalInfo, ...data };
    } else if (step === WizardStep.ADDRESS) {
      updatedData.addressInfo = { ...updatedData.addressInfo, ...data };
    }

    // Mark step as completed if valid
    if (this.isStepValid(step, updatedData) && !updatedData.completedSteps.includes(step)) {
      updatedData.completedSteps.push(step);
    }

    this.formDataSubject.next(updatedData);
    this.saveToStorage(updatedData);
  }

  getStepData(step: WizardStep): PersonalInfo | AddressInfo {
    const data = this.formDataSubject.value;

    switch (step) {
      case WizardStep.PERSONAL:
        return data.personalInfo;
      case WizardStep.ADDRESS:
        return data.addressInfo;
      default:
        return data.personalInfo;
    }
  }

  setCurrentStep(step: WizardStep): void {
    const currentData = this.formDataSubject.value;
    const updatedData = {
      ...currentData,
      currentStep: step,
      timestamps: {
        ...currentData.timestamps,
        stepStarted: new Date(),
        lastUpdated: new Date()
      }
    };

    this.formDataSubject.next(updatedData);
    this.currentStepSubject.next(step);
    this.saveToStorage(updatedData);
  }

  isStepValid(step: WizardStep, data?: WizardFormData): boolean {
    const formData = data || this.formDataSubject.value;

    switch (step) {
      case WizardStep.PERSONAL:
        const personal = formData.personalInfo;
        return !!(personal.name && personal.name.length >= 2 &&
                  personal.email && this.isValidEmail(personal.email) &&
                  personal.phone && this.isValidPhone(personal.phone));

      case WizardStep.ADDRESS:
        const address = formData.addressInfo;
        return !!(address.street && address.street.length >= 5 &&
                  address.city && address.city.length >= 2 &&
                  address.state &&
                  address.zipCode && this.isValidZipCode(address.zipCode));

      case WizardStep.REVIEW:
        return this.isStepValid(WizardStep.PERSONAL, formData) &&
               this.isStepValid(WizardStep.ADDRESS, formData);

      default:
        return false;
    }
  }

  canAccessStep(step: WizardStep): boolean {
    const data = this.formDataSubject.value;

    switch (step) {
      case WizardStep.PERSONAL:
        return true;
      case WizardStep.ADDRESS:
        return this.isStepValid(WizardStep.PERSONAL, data);
      case WizardStep.REVIEW:
        return this.isStepValid(WizardStep.PERSONAL, data) &&
               this.isStepValid(WizardStep.ADDRESS, data);
      default:
        return false;
    }
  }

  clearFormData(): void {
    const newData = this.initializeFormData();
    this.formDataSubject.next(newData);
    this.currentStepSubject.next(WizardStep.PERSONAL);
    this.removeFromStorage();
  }

  private saveToStorage(data: WizardFormData): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save form data to localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data: WizardFormData = JSON.parse(stored);
        // Restore Date objects
        data.timestamps.started = new Date(data.timestamps.started);
        data.timestamps.stepStarted = new Date(data.timestamps.stepStarted);
        data.timestamps.lastUpdated = new Date(data.timestamps.lastUpdated);

        this.formDataSubject.next(data);
        this.currentStepSubject.next(data.currentStep);
      }
    } catch (error) {
      console.warn('Failed to load form data from localStorage:', error);
      this.clearFormData();
    }
  }

  private removeFromStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to remove form data from localStorage:', error);
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  }

  private isValidZipCode(zipCode: string): boolean {
    const zipRegex = /^\d{5}$/;
    return zipRegex.test(zipCode);
  }
}