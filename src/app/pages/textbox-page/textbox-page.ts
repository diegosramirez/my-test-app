import { Component, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-textbox-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './textbox-page.html',
  styleUrl: './textbox-page.css',
})
export class TextboxPageComponent implements AfterViewInit {
  inputValue: string = '';

  ngAfterViewInit(): void {
    // TODO: emit textbox_page_viewed tracking event ({ route: '/textbox', timestamp: ISO 8601 })
  }
}
