import { Routes } from '@angular/router';
import { MatchListComponent } from './components/match-list/match-list.component';

export const routes: Routes = [
  {
    path: '',
    component: MatchListComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
