import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, switchMap, map } from 'rxjs';
import { NavbarComponent } from '../../../layout/navbar/navbar.component';
import { OrderService, IOrder, IParticipantOrder, IRouletteResult } from '../../../core/services/order.service';
// Import yang diperlukan untuk Reactive Forms
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { CalculationService, IOrderSummary } from '../../../core/services/calculation.service'; // <-- Import service baru
import { RealtimeChannel } from '@supabase/supabase-js';

// Gabungkan IOrder dengan IOrderSummary
export type ICalculatedOrder = IOrder & { summary: IOrderSummary };

@Component({
  selector: 'app-order-detail',
  standalone: true,
  // Tambahkan ReactiveFormsModule ke imports
  imports: [CommonModule, NavbarComponent, RouterLink, ReactiveFormsModule],
  templateUrl: './order-detail.component.html',
})
export class OrderDetailComponent implements OnInit {

  constructor(public authService: AuthService) {}
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);
  // private authService = inject(AuthService); // <-- Inject AuthService
  private calculationService = inject(CalculationService); // <-- Inject service
  private fb = inject(FormBuilder); // <-- Inject FormBuilder

  order = signal<ICalculatedOrder | null>(null);
  private realtimeChannel!: RealtimeChannel;

  // Roulette Feature state
  rouletteResult = signal<IRouletteResult | null>(null);
  roulettePickers = signal<{ userId: string; userName: string }[]>([]);
  tempPickedUsers = signal<{ userId: string; userName: string }[]>([]);
  numToPick = 1;
  triesCount = 0;
  isRolling = false;
  hasUnsavedResult = false;
  // Fee editing state
  isEditingFees = signal<boolean>(false);
  feesForm!: FormGroup;

  joinOrderForm!: FormGroup; // <-- Deklarasi form group baru

  // Variabel untuk melacak state edit
  editingOrderId: string | null = null;
  editForm!: FormGroup;

  ngOnInit(): void {
    // this.loadOrderData();

    // Inisialisasi form untuk edit parameter biaya
    this.feesForm = this.fb.group({
      service_and_delivery_fee: [0, [Validators.required, Validators.min(0)]],
      discount_percentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      max_discount: [0, [Validators.required, Validators.min(0)]],
      min_order_for_discount: [0, [Validators.required, Validators.min(0)]]
    });

    // Inisialisasi form untuk ikut memesan
    this.joinOrderForm = this.fb.group({
      // Kita akan menyimpan objek menu item lengkap untuk kemudahan
      menuItem: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
    });

    // Inisialisasi form untuk edit
    this.editForm = this.fb.group({
      quantity: [1, [Validators.required, Validators.min(0)]]
    });

    const orderId = this.route.snapshot.paramMap.get('id');
    if (orderId) {
      this.loadInitialOrderData(orderId);
      // Mulai mendengarkan perubahan real-time
      this.subscribeToOrderChanges(orderId);
    }
  }

  loadOrderData(): void {
    // Alur reaktif untuk memuat data:
    // 1. Ambil parameter dari URL (`paramMap`).
    // 2. Gunakan `switchMap` untuk membatalkan request lama jika ID berubah.
    // 3. Panggil `orderService.getOrderById` dengan ID yang didapat.
    // this.order$ = this.route.paramMap.pipe(
    //   switchMap(params => {
    //     const id = params.get('id');
    //     if (id) {
    //       return this.orderService.getOrderById(id);
    //     }
    //     return new Observable<undefined>();
    //   }),
    //   map(order => {
    //     if (!order) return undefined;
    //     // Hitung summary dan gabungkan ke data order
    //     const summary = this.calculationService.calculateOrderSummary(order);
    //     return { ...order, summary };
    //   })
    // );
  }

  // Method untuk handle submit form pemesanan
  async onJoinOrderSubmit(): Promise<void> { // <-- Jadikan async
    if (this.joinOrderForm.invalid) return;

    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      alert('Error: Anda harus login untuk memesan.');
      return;
    }

    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) return;

    const formValue = this.joinOrderForm.value;
    const selectedItem = JSON.parse(formValue.menuItem);

    // Siapkan data untuk dikirim ke Supabase
    const newParticipantOrder = {
      order_id: orderId,
      user_id: currentUser.id,
      item_name: selectedItem.name,
      item_price: selectedItem.price,
      quantity: formValue.quantity,
    };

    try {
      await this.orderService.addParticipantOrder(newParticipantOrder);
      alert('Pesanan Anda berhasil ditambahkan!');
      this.joinOrderForm.reset({ quantity: 1, menuItem: null });

      // Di langkah berikutnya, kita akan buat ini refresh otomatis
      // window.location.reload(); // <-- Refresh sementara untuk melihat data baru
    } catch (error: any) {
      alert(`Gagal menambahkan pesanan: ${error.message}`);
    }
  }

  async onDeleteMyOrder(participantOrderId: string): Promise<void> {
    // Tampilkan konfirmasi sebelum menghapus
    if (confirm('Apakah Anda yakin ingin menghapus pesanan ini?')) {
      try {
        await this.orderService.deleteParticipantOrder(participantOrderId);
        alert('Pesanan berhasil dihapus.');
      } catch (error: any) {
        alert(`Gagal menghapus pesanan: ${error.message}`);
      }
    }
  }

  // Method untuk menutup order
  async onCloseOrder(): Promise<void> {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) return;

    if (confirm('Apakah Anda yakin ingin menutup order ini? Peserta tidak akan bisa bergabung atau mengubah pesanan lagi.')) {
      try {
        await this.orderService.closeOrder(orderId);
        alert('Order berhasil ditutup.');
      } catch (error: any) {
        alert(`Gagal menutup order: ${error.message}`);
      }
    }
  }

  // Method untuk membatalkan order
  async onCancelOrder(): Promise<void> {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) return;

    if (confirm('PERINGATAN: Apakah Anda yakin ingin membatalkan order ini? Aksi ini tidak bisa diurungkan.')) {
      try {
        await this.orderService.cancelOrder(orderId);
        alert('Order berhasil dibatalkan.');
      } catch (error: any) {
        alert(`Gagal membatalkan order: ${error.message}`);
      }
    }
  }

  // Method untuk memulai mode edit
  onStartEdit(pOrder: IParticipantOrder): void {
    this.editingOrderId = pOrder.id;
    // Isi form dengan kuantitas saat ini
    this.editForm.patchValue({ quantity: pOrder.quantity });
  }

  // Method untuk membatalkan edit
  onCancelEdit(): void {
    this.editingOrderId = null;
  }

  // Method untuk menyimpan perubahan
  async onSaveEdit(participantOrderId: string): Promise<void> {
    if (this.editForm.invalid) return;

    try {
      const newQuantity = this.editForm.value.quantity;
      await this.orderService.updateParticipantOrder(participantOrderId, newQuantity);
      // Keluar dari mode edit setelah berhasil
      this.editingOrderId = null;
    } catch (error: any) {
      alert(`Gagal menyimpan perubahan: ${error.message}`);
    }
  }

  async onTogglePaymentStatus(pOrder: IParticipantOrder): Promise<void> {
    try {
      const newStatus = pOrder.payment_status === 'PAID' ? 'UNPAID' : 'PAID';
      await this.orderService.updatePaymentStatus(pOrder.id, newStatus);
    } catch (error: any) {
      alert(`Gagal mengubah status pembayaran: ${error.message}`);
    }
  }

  async loadInitialOrderData(id: string): Promise<void> {
    const fetchedOrder = await this.orderService.getOrderById(id);
    if (fetchedOrder) {
      const summary = this.calculationService.calculateOrderSummary(fetchedOrder);
      this.order.set({ ...fetchedOrder, summary });
      if (fetchedOrder.status === 'CLOSED') {
        this.loadRouletteResult(id);
      }
    }
  }

  async loadRouletteResult(orderId: string): Promise<void> {
    try {
      const result = await this.orderService.getRouletteResult(orderId);
      this.rouletteResult.set(result);
      if (result) {
        const participants = this.order()?.summary.summaryByUser || [];
        const pickers = result.picker_ids.map((id: string) => {
          const matched = participants.find(p => p.userId === id);
          return {
            userId: id,
            userName: matched ? matched.userName : 'Pengguna tidak dikenal'
          };
        });
        this.roulettePickers.set(pickers);
        this.triesCount = result.tries_count;
        this.numToPick = result.picker_ids.length;
        this.hasUnsavedResult = false;
        this.tempPickedUsers.set([]);
      } else {
        this.roulettePickers.set([]);
      }
    } catch (err) {
      console.error('Error loading roulette result:', err);
    }
  }

  subscribeToOrderChanges(orderId: string): void {
    const supabase = this.orderService.getSupabaseClient();

    this.realtimeChannel = supabase
      .channel(`order-detail-realtime:${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participant_orders', filter: `order_id=eq.${orderId}` },
        (payload) => {
          console.log('Perubahan real-time terdeteksi pada participant_orders!', payload);
          this.loadInitialOrderData(orderId);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'roulette_results', filter: `order_id=eq.${orderId}` },
        (payload) => {
          console.log('Perubahan real-time terdeteksi pada roulette_results!', payload);
          this.loadRouletteResult(orderId);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          console.log('Perubahan real-time terdeteksi pada orders!', payload);
          this.loadInitialOrderData(orderId);
        }
      )
      .subscribe();
  }

  startEditFees(): void {
    const currentOrder = this.order();
    if (!currentOrder) return;
    this.feesForm.patchValue({
      service_and_delivery_fee: currentOrder.service_and_delivery_fee || 0,
      discount_percentage: currentOrder.discount_percentage || 0,
      max_discount: currentOrder.max_discount || 0,
      min_order_for_discount: currentOrder.min_order_for_discount || 0
    });
    this.isEditingFees.set(true);
  }

  cancelEditFees(): void {
    this.isEditingFees.set(false);
  }

  async saveEditFees(): Promise<void> {
    if (this.feesForm.invalid) return;
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) return;

    try {
      await this.orderService.updateOrderFees(orderId, this.feesForm.value);
      alert('Parameter biaya berhasil diperbarui!');
      this.isEditingFees.set(false);
      this.loadInitialOrderData(orderId);
    } catch (error: any) {
      alert(`Gagal memperbarui parameter biaya: ${error.message}`);
    }
  }

  runRoulette(): void {
    const currentOrder = this.order();
    if (!currentOrder || currentOrder.status !== 'CLOSED') return;
    const participants = currentOrder.summary.summaryByUser || [];
    if (participants.length === 0) {
      alert('Tidak ada peserta untuk dipilih dalam roulette.');
      return;
    }
    if (this.numToPick < 1 || this.numToPick > participants.length) {
      alert(`Jumlah orang yang dipilih harus antara 1 dan ${participants.length}.`);
      return;
    }

    this.triesCount++;
    this.isRolling = true;
    this.hasUnsavedResult = false;

    let spinTime = 0;
    const interval = setInterval(() => {
      // Shuffle and pick temp candidates
      const shuffled = [...participants].sort(() => 0.5 - Math.random());
      this.tempPickedUsers.set(shuffled.slice(0, this.numToPick));
      spinTime += 100;

      if (spinTime >= 1500) { // Roll for 1.5 seconds
        clearInterval(interval);
        // Select final candidates
        const finalShuffled = [...participants].sort(() => 0.5 - Math.random());
        this.tempPickedUsers.set(finalShuffled.slice(0, this.numToPick));
        this.isRolling = false;
        this.hasUnsavedResult = true;
      }
    }, 100);
  }

  async saveRouletteResult(): Promise<void> {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) return;

    const pickerIds = this.tempPickedUsers().map(u => u.userId);
    if (pickerIds.length === 0) return;

    try {
      await this.orderService.saveRouletteResult(orderId, pickerIds, this.triesCount);
      alert('Hasil roulette berhasil disimpan!');
      this.hasUnsavedResult = false;
      this.loadRouletteResult(orderId);
    } catch (error: any) {
      alert(`Gagal menyimpan hasil roulette: ${error.message}`);
    }
  }

  cancelUnsavedRoulette(): void {
    this.hasUnsavedResult = false;
    this.tempPickedUsers.set([]);
    const saved = this.rouletteResult();
    if (saved) {
      this.triesCount = saved.tries_count;
      this.numToPick = saved.picker_ids.length;
    } else {
      this.triesCount = 0;
      this.numToPick = 1;
    }
  }

  async deleteRouletteResult(): Promise<void> {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) return;

    if (confirm('Apakah Anda yakin ingin menghapus hasil roulette yang disimpan?')) {
      try {
        await this.orderService.deleteRouletteResult(orderId);
        alert('Hasil roulette berhasil dihapus.');
        this.rouletteResult.set(null);
        this.roulettePickers.set([]);
        this.triesCount = 0;
        this.numToPick = 1;
        this.tempPickedUsers.set([]);
        this.hasUnsavedResult = false;
      } catch (error: any) {
        alert(`Gagal menghapus hasil roulette: ${error.message}`);
      }
    }
  }

  ngOnDestroy(): void {
    // Wajib: Hentikan langganan saat komponen ditutup untuk menghindari memory leak
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }
  }
}
