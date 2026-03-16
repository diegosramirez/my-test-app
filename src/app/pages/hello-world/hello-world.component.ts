import { Component } from '@angular/core';

@Component({
  selector: 'app-hello-world',
  standalone: true,
  template: `
    <main class="hello-world">
      <h1>Hello World</h1>
      <p>The app is up and running.</p>
    </main>
  `,
  styles: [`
    .hello-world {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      max-width: 40rem;
      margin: 0 auto;
      padding-inline: 1rem;
      text-align: center;
    }
  `]
})
export class HelloWorldComponent {}
