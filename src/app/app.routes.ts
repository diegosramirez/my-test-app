import { Routes } from '@angular/router';
import { WeatherSearchComponent } from './components/weather-search.component';

export const routes: Routes = [
  { path: '', component: WeatherSearchComponent },
  { path: '**', redirectTo: '' }
];
