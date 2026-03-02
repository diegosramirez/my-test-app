import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { LayoutModule as CdkLayoutModule } from '@angular/cdk/layout';

import { SidenavContainerComponent } from './sidenav/sidenav-container.component';
import { SidenavComponent } from './sidenav/sidenav.component';
import { SidenavToggleDirective } from './sidenav/sidenav-toggle.directive';

@NgModule({
  declarations: [
    SidenavContainerComponent,
    SidenavComponent,
    SidenavToggleDirective,
  ],
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    CdkLayoutModule,
  ],
  exports: [
    SidenavContainerComponent,
    SidenavComponent,
    SidenavToggleDirective,
  ],
})
export class AppLayoutModule {}
