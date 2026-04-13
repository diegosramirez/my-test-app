import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-probability-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './probability-indicator.component.html',
  styleUrl: './probability-indicator.component.css'
})
export class ProbabilityIndicatorComponent {
  @Input() probability: number = 0; // 0.0 - 1.0
  @Input() label: string = '';
  @Input() outcome: 'home' | 'draw' | 'away' = 'home';
  @Input() confidence: 'high' | 'medium' | 'low' | 'unavailable' = 'low';
  @Input() showPercentage: boolean = true;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  get percentageValue(): number {
    return Math.round(this.probability * 100);
  }

  get progressBarClass(): string {
    const baseClasses = ['progress-bar'];

    // Add outcome-based color class
    baseClasses.push(`progress-bar--${this.outcome}`);

    // Add confidence class
    baseClasses.push(`progress-bar--${this.confidence}`);

    // Add size class
    baseClasses.push(`progress-bar--${this.size}`);

    // Add probability level class for additional styling
    if (this.probability >= 0.6) {
      baseClasses.push('progress-bar--high-probability');
    } else if (this.probability >= 0.4) {
      baseClasses.push('progress-bar--medium-probability');
    } else {
      baseClasses.push('progress-bar--low-probability');
    }

    return baseClasses.join(' ');
  }

  get confidenceLabel(): string {
    switch (this.confidence) {
      case 'high': return 'High confidence';
      case 'medium': return 'Medium confidence';
      case 'low': return 'Low confidence';
      case 'unavailable': return 'Unavailable';
      default: return '';
    }
  }

  get isCloseMatch(): boolean {
    // Consider it a close match if probability is between 25% and 60%
    return this.probability >= 0.25 && this.probability <= 0.6;
  }
}