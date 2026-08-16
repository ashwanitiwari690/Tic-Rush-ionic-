import { Routes } from '@angular/router';
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage) },
  { path: 'select-mode', loadComponent: () => import('./pages/select-mode/select-mode.page').then(m => m.SelectModePage) },
  { path: 'game', loadComponent: () => import('./pages/game/game.page').then(m => m.GamePage) },
  { path: 'settings', loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage) },
  { path: 'profile', loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage) },
  { path: 'shop', loadComponent: () => import('./pages/shop/shop.page').then(m => m.ShopPage) },
  { path: '**', redirectTo: 'home' }
];
