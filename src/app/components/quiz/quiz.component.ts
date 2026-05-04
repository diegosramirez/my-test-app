import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctAnswerIndex: number;
  category: string;
}

export interface QuizOption {
  id: string;
  text: string;
  letter: string;
}

export interface QuizState {
  currentQuestion: QuizQuestion | null;
  selectedOptionId: string | null;
  isAnswered: boolean;
  showFeedback: boolean;
  isCorrect: boolean | null;
}

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz.component.html',
  styleUrl: './quiz.component.scss'
})
export class QuizComponent implements OnInit {
  // Mock data for initial validation
  private readonly mockQuestion: QuizQuestion = {
    id: 'q1',
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

  state: QuizState = {
    currentQuestion: null,
    selectedOptionId: null,
    isAnswered: false,
    showFeedback: false,
    isCorrect: null
  };

  ngOnInit(): void {
    this.loadQuestion();
  }

  private loadQuestion(): void {
    this.state = {
      currentQuestion: this.mockQuestion,
      selectedOptionId: null,
      isAnswered: false,
      showFeedback: false,
      isCorrect: null
    };
  }

  onOptionSelect(optionId: string): void {
    if (this.state.isAnswered) {
      return;
    }

    this.state.selectedOptionId = optionId;
  }

  onSubmitAnswer(): void {
    if (!this.state.selectedOptionId || !this.state.currentQuestion || this.state.isAnswered) {
      return;
    }

    const selectedIndex = this.state.currentQuestion.options.findIndex(
      option => option.id === this.state.selectedOptionId
    );

    // Handle both valid and invalid option selections
    const isCorrect = selectedIndex !== -1 && selectedIndex === this.state.currentQuestion.correctAnswerIndex;

    this.state = {
      ...this.state,
      isAnswered: true,
      showFeedback: true,
      isCorrect
    };
  }

  onTryAgain(): void {
    this.loadQuestion();
  }

  isOptionSelected(optionId: string): boolean {
    return this.state.selectedOptionId === optionId;
  }

  isOptionCorrect(optionId: string): boolean {
    if (!this.state.currentQuestion || !this.state.showFeedback) {
      return false;
    }

    const optionIndex = this.state.currentQuestion.options.findIndex(
      option => option.id === optionId
    );

    return optionIndex === this.state.currentQuestion.correctAnswerIndex;
  }

  isOptionIncorrect(optionId: string): boolean {
    if (!this.state.showFeedback) {
      return false;
    }

    return this.isOptionSelected(optionId) && !this.isOptionCorrect(optionId);
  }

  canSubmit(): boolean {
    return this.state.selectedOptionId !== null && !this.state.isAnswered;
  }

  getFeedbackMessage(): string {
    if (!this.state.showFeedback) {
      return '';
    }

    return this.state.isCorrect
      ? 'Correct! Well done.'
      : 'Incorrect. The correct answer is highlighted above.';
  }

  trackByOptionId(index: number, option: QuizOption): string {
    return option.id;
  }
}