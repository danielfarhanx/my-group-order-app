import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

// Validator kustom untuk memeriksa apakah password cocok
function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (password?.value !== confirmPassword?.value) {
    return { passwordsMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm: FormGroup;
  registerError: string | null = null;
  registerSuccess: boolean = false;

  constructor() {
    this.registerForm = this.fb.group({
      // Supabase Auth tidak menyimpan nama di tabel auth.users secara default,
      // tapi kita bisa menambahkannya di tabel 'profiles' nanti.
      // Untuk sekarang, kita fokus pada email dan password.
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: passwordsMatchValidator }); // Terapkan validator kustom di level form group
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }

    this.registerError = null;
    this.registerSuccess = false;

    const { email, password, fullName } = this.registerForm.value;

    // Kirim fullName sebagai metadata
    this.authService.register({
      email,
      password,
      options: { // <-- Opsi tambahan
        data: {
          full_name: fullName // 'full_name' ini akan diambil oleh trigger di SQL
        }
      }
    }).subscribe({
      next: ({ user, error }) => {
        if (error) {
          this.registerError = error.message;
          return;
        }
        if (user) {
          this.registerSuccess = true;
          // Arahkan ke login setelah beberapa detik
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        }
      },
      error: (err) => {
        this.registerError = 'Terjadi kesalahan tak terduga. Silakan coba lagi.';
      }
    });
  }
}
