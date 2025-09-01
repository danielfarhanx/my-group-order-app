// src/app/features/auth/login/login.component.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
// Import yang diperlukan untuk Reactive Forms
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  // Inject service yang kita butuhkan
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm: FormGroup;
  loginError: string | null = null;

  constructor() {
    // Definisikan form dan validasinya
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  // Method ini akan dijalankan saat form disubmit
  onSubmit(): void {
    if (this.loginForm.invalid) return;
    this.loginError = null;

    this.authService.login(this.loginForm.value).subscribe({
      next: ({ session, error }) => {
        if (error) {
          this.loginError = error.message; // Tampilkan error dari Supabase
          return;
        }
        // Jika berhasil, 'onAuthStateChange' di service akan handle sisanya
        // Kita hanya perlu navigasi
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        // Handle error tak terduga
        this.loginError = 'Terjadi kesalahan tak terduga. Silakan coba lagi.';
      }
    });
  }
}
