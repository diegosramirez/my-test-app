import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

export interface NavItem {
  label: string;
  route: string;
  icon?: string;
}

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
})
export class SideNavComponent {
  readonly navItems: NavItem[] = [
    { label: 'Home', route: '/home', icon: 'home' },
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'To-Do', route: '/todo', icon: 'check_circle' },
    { label: 'Profile', route: '/profile', icon: 'person' },
    { label: 'Settings', route: '/settings', icon: 'settings' },
  ];
}
