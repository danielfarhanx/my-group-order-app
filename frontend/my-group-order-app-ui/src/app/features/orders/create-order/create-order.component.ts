import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../../layout/navbar/navbar.component';
import { OrderService } from '../../../core/services/order.service'; // Pastikan path ini benar
import { Subscription } from 'rxjs';

// Fungsi ini akan kita gunakan untuk memeriksa apakah tanggal berada di masa depan
function futureDateValidator(control: AbstractControl): ValidationErrors | null {
  const selectedDate = new Date(control.value);
  const now = new Date();
  // Set detik dan milidetik ke 0 untuk perbandingan yang lebih adil
  now.setSeconds(0, 0);

  if (selectedDate < now) {
    return { pastDate: true }; // Kembalikan error jika tanggal sudah lampau
  }
  return null; // Kembalikan null jika valid
}

@Component({
  selector: 'app-create-order',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './create-order.component.html',
})
export class CreateOrderComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private orderService = inject(OrderService); // Kita akan gunakan ini nanti

  orderForm!: FormGroup;
  timeUntilCloseMessage: string | null = null;
  private deadlineSub!: Subscription;

  ngOnInit(): void {
    this.orderForm = this.fb.group({
      title: ['', Validators.required],
      store_name: ['', Validators.required],
      deadline: ['', [Validators.required, futureDateValidator]],
      menu_items: this.fb.array([
        this.createMenuItem()
      ]),

      // --- PENAMBAHAN BAGIAN PERHITUNGAN ---
      service_and_delivery_fee: [0, [Validators.required, Validators.min(0)]],
      discount_percentage: [0, [Validators.min(0), Validators.max(100)]],
      max_discount: [0, [Validators.min(0)]],
      min_order_for_discount: [0, [Validators.min(0)]]
    });

    // Dengarkan perubahan pada field deadline
    this.deadlineSub = this.orderForm.get('deadline')!.valueChanges.subscribe(value => {
      this.updateTimeUntilClose(value);
    });
  }

  // Method baru untuk menghitung dan memperbarui pesan sisa waktu
  updateTimeUntilClose(deadlineValue: string | null): void {
    if (!deadlineValue || this.orderForm.get('deadline')?.invalid) {
      this.timeUntilCloseMessage = null;
      return;
    }

    const deadline = new Date(deadlineValue);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();

    if (diffMs <= 0) {
      this.timeUntilCloseMessage = null;
      return;
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    this.timeUntilCloseMessage = `(Akan tutup dalam ~${diffHours} jam ${diffMins} menit)`;
  }

  // Helper untuk membuat satu baris item menu
  createMenuItem(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      price: [null, [Validators.required, Validators.min(0)]],
    });
  }

  // Getter untuk akses mudah ke FormArray di template HTML
  get menu_items(): FormArray {
    return this.orderForm.get('menu_items') as FormArray;
  }

  // Method untuk menambah baris item menu baru
  addMenuItem(): void {
    this.menu_items.push(this.createMenuItem());
  }

  // Method untuk menghapus baris item menu
  removeMenuItem(index: number): void {
    this.menu_items.removeAt(index);
  }

  // Method yang dijalankan saat form disubmit
  async onSubmit(): Promise<void> { // Jadikan async
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }

    try {
      // Panggil service yang sesungguhnya
      await this.orderService.createOrder(this.orderForm.value);
      alert('Order baru berhasil dibuat!');
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      alert(`Gagal membuat order: ${error.message}`);
    }
  }

  // Pastikan kita berhenti "mendengarkan" saat komponen dihancurkan
  ngOnDestroy(): void {
    if (this.deadlineSub) {
      this.deadlineSub.unsubscribe();
    }
  }
}
