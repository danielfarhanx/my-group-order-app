import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  forgotPasswordForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading = false;

  constructor() {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) return;

    this.errorMessage = null;
    this.successMessage = null;
    this.isLoading = true;

    const email = this.forgotPasswordForm.value.email;

    this.authService.resetPasswordRequest(email).subscribe({
      next: ({ error }) => {
        this.isLoading = false;
        if (error) {
          this.errorMessage = error.message;
          return;
        }
        this.successMessage = 'Kami telah mengirim link reset password ke email Anda. Silakan cek inbox Anda.';
        this.forgotPasswordForm.reset();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Terjadi kesalahan. Silakan coba lagi.';
      }
    });
  }
}
