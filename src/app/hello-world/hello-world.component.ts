import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-hello-world',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './hello-world.component.html',
  styleUrl: './hello-world.component.css'
})
export class HelloWorldComponent implements OnInit {
  currentDate: Date | null = null;
  dateError: boolean = false;

  ngOnInit(): void {
    try {
      this.currentDate = new Date();
      // Validate that the date is valid
      if (isNaN(this.currentDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      console.error('Error initializing date:', error);
      this.dateError = true;
      this.currentDate = null;
    }
  }
}