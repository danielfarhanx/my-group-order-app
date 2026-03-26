import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  resetPasswordForm: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;

  constructor() {
    this.resetPasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Cek apakah ada session (user sudah klik link dari email)
    // Supabase otomatis akan set session ketika user klik link reset
  }

  // Custom validator untuk memastikan password dan confirm password sama
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.resetPasswordForm.invalid) return;

    this.errorMessage = null;
    this.isLoading = true;

    const newPassword = this.resetPasswordForm.value.password;

    this.authService.updatePassword(newPassword).subscribe({
      next: ({ error }) => {
        this.isLoading = false;
        if (error) {
          this.errorMessage = error.message;
          return;
        }
        // Password berhasil diupdate, redirect ke login
        alert('Password berhasil diubah! Silakan login dengan password baru Anda.');
        this.router.navigate(['/login']);
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Terjadi kesalahan. Silakan coba lagi atau minta link reset password baru.';
      }
    });
  }

  get passwordMismatch(): boolean {
    const confirmPassword = this.resetPasswordForm.get('confirmPassword');
    return !!(confirmPassword?.hasError('passwordMismatch') && confirmPassword?.touched);
  }
}
