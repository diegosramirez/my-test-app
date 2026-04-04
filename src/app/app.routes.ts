import { Routes } from '@angular/router';
import { QrCodeGeneratorComponent } from './qr-code-generator.component';

export const routes: Routes = [
  { path: '', redirectTo: '/qr-generator', pathMatch: 'full' },
  { path: 'qr-generator', component: QrCodeGeneratorComponent }
];
