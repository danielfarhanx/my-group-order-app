import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { authGuard } from './core/guards/auth.guard';
import { publicGuard } from './core/guards/public.guard'; // <-- 1. Import guard baru
import { CreateOrderComponent } from './features/orders/create-order/create-order.component';
import { OrderDetailComponent } from './features/orders/order-detail/order-detail.component';

export const routes: Routes = [
  // Terapkan publicGuard pada rute login dan register
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [publicGuard] // <-- 2. Tambahkan di sini
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [publicGuard] // <-- 2. Tambahkan di sini
  },

  // Terapkan authGuard pada rute dashboard
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  // Rute baru untuk membuat order
  {
    path: 'orders/new',
    component: CreateOrderComponent,
    canActivate: [authGuard]
  },
  {
    path: 'orders/:id', // <-- Rute dinamis dengan parameter ID
    component: OrderDetailComponent,
    canActivate: [authGuard]
  },

  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
