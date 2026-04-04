import { Routes } from '@angular/router';
import { QrGeneratorComponent } from './components/qr-generator/qr-generator.component';

export const routes: Routes = [
  { path: '', redirectTo: '/qr-generator', pathMatch: 'full' },
  { path: 'qr-generator', component: QrGeneratorComponent },
  { path: '**', redirectTo: '/qr-generator' }
];
