import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Movie } from '../../models/movie.model';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './movie-card.component.html',
  styleUrl: './movie-card.component.css'
})
export class MovieCardComponent {
  @Input() movie!: Movie;
  @Input() highlightedTitle: string = '';
  @Output() watchedToggle = new EventEmitter<Movie>();
  @Output() edit = new EventEmitter<Movie>();
  @Output() delete = new EventEmitter<Movie>();

  onWatchedToggle(): void {
    this.watchedToggle.emit(this.movie);
  }

  onEdit(): void {
    this.edit.emit(this.movie);
  }

  onDelete(): void {
    this.delete.emit(this.movie);
  }

  getHighlightedTitle(): string {
    if (!this.highlightedTitle || !this.movie.title) {
      return this.movie.title;
    }

    const query = this.highlightedTitle.toLowerCase();
    const title = this.movie.title;
    const index = title.toLowerCase().indexOf(query);

    if (index === -1) {
      return title;
    }

    return title.substring(0, index) +
           '<mark>' + title.substring(index, index + query.length) + '</mark>' +
           title.substring(index + query.length);
  }
}