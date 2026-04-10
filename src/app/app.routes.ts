import { Routes } from '@angular/router';
import { HelloWorldComponent } from './components/hello-world/hello-world.component';

export const routes: Routes = [
  { path: '', component: HelloWorldComponent, pathMatch: 'full' }
];
