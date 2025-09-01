import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const publicGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Cek status login dari AuthService
  if (authService.isLoggedIn()) {
    // Jika SUDAH login, alihkan ke dashboard dan batalkan navigasi
    console.log('Akses ditolak oleh PublicGuard, mengalihkan ke /dashboard');
    router.navigate(['/dashboard']);
    return false;
  } else {
    // Jika BELUM login, izinkan akses ke halaman login/register
    return true;
  }
};
