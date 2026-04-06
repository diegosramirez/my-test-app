import { Routes } from '@angular/router';
import { DemoStarRatingComponent } from './demo-star-rating.component';

export const routes: Routes = [
  { path: '', component: DemoStarRatingComponent },
  { path: 'demo', component: DemoStarRatingComponent }
];
