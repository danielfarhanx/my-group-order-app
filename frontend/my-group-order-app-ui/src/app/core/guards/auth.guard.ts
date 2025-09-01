import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Cek status login dari signal di AuthService
  if (authService.isLoggedIn()) {
    // Jika sudah login, izinkan akses
    return true;
  } else {
    // Jika belum login, alihkan ke halaman /login dan batalkan navigasi
    console.log('Akses ditolak oleh AuthGuard, mengalihkan ke /login');
    router.navigate(['/login']);
    return false;
  }
};
