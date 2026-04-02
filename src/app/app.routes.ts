import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'chat',
    loadComponent: () =>
      import('./features/chat-room/chat-room.component').then((m) => m.ChatRoomComponent),
  },
  { path: '**', redirectTo: '' },
];
