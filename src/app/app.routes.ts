import { Routes } from '@angular/router';
import { ImageGalleryDemoComponent } from './demo/image-gallery-demo.component';

export const routes: Routes = [
  { path: '', component: ImageGalleryDemoComponent },
  { path: 'demo', component: ImageGalleryDemoComponent },
  { path: '**', redirectTo: '' }
];
