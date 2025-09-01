// src/app/layout/navbar/navbar.component.ts
import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  authService = inject(AuthService);
  profileService = inject(ProfileService);

  userName = signal<string | null>(null);

  constructor() {
    // 2. Gunakan effect() di dalam constructor untuk bereaksi terhadap perubahan
    effect(async () => {
      // Baca nilai dari currentUser signal. Effect akan otomatis berjalan lagi jika ini berubah.
      const user = this.authService.currentUser();

      if (user) {
        // Jika ada user, ambil profilnya
        const profile = await this.profileService.getProfile(user.id);
        this.userName.set(profile?.full_name ?? null);
      } else {
        // Jika tidak ada user (logout), reset nama
        this.userName.set(null);
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
