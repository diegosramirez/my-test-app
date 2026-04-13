import { Routes } from '@angular/router';
import { UpcomingFixturesComponent } from './components/upcoming-fixtures/upcoming-fixtures.component';

export const routes: Routes = [
  { path: '', redirectTo: '/fixtures', pathMatch: 'full' },
  { path: 'fixtures', component: UpcomingFixturesComponent },
  { path: '**', redirectTo: '/fixtures' }
];
