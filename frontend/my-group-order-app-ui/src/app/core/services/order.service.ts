// src/app/core/services/order.service.ts
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BehaviorSubject, from, Observable, of, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

// --- UPDATE INTERFACE ---
export interface IParticipantOrder {
  id: string;
  user_id: string;       // ID unik pengguna yang memesan
  item_name: string;     // Nama item yang dipesan
  item_price: number;    // Harga satuan item
  quantity: number;     // Jumlah yang dipesan
  profiles?: { full_name: string };
  order_id: string;
  payment_status: string;
}
// Tambahkan detail menu dan parameter biaya ke interface utama
export interface IOrder {
  id: string;
  title: string;
  pic: string;
  participantCount: number;
  deadline: Date;
  status: string;
  created_by: string;
  // --- Data baru ---
  store_name?: string;
  order_menu_items?: { name: string; price: number }[];
  service_and_delivery_fee?: number;
  discount_percentage?: number;
  max_discount?: number;
  min_order_for_discount?: number;
  // Array untuk menampung semua pesanan yang masuk
  participant_orders?: IParticipantOrder[];
  profiles: { full_name: string; } | null;
}
// -----------------------


@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private supabase!: SupabaseClient;
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);

  // Buat "pemicu" yang bisa kita panggil dari mana saja
  private refreshTrigger = new BehaviorSubject<void>(undefined);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.supabase = createClient(environment.supabase.url, environment.supabase.key);
    }
  }

  /**
   * Mensimulasikan pengambilan daftar order yang aktif.
   * @returns Observable yang berisi array IOrder.
   */
  async getActiveOrders(): Promise<IOrder[]> {
    if (!this.supabase) return [];

    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        profiles (full_name),
        participant_orders (*, profiles(full_name))
      `)
      .eq('status', 'OPEN') // Hanya ambil yang statusnya OPEN
      .gt('deadline', new Date().toISOString()) // dan deadline-nya belum lewat
      .order('created_at', { ascending: false }); // Urutkan dari yang terbaru

    if (error) {
      console.error('Error fetching active orders:', error.message);
      return [];
    }
    return data || [];
  }

  // --- METHOD BARU ---
  /**
   * Mensimulasikan pengambilan detail satu order berdasarkan ID.
   * @param id ID dari order yang ingin diambil.
   * @returns Observable yang berisi data IOrder.
   */
  getOrderById(id: string): Promise<IOrder | null> {
    return this._fetchOrderById(id);
  }

  private async _fetchOrderById(id: string): Promise<IOrder | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        order_menu_items(*),
        participant_orders(*, profiles(full_name))
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching order details:', error.message);
      return null;
    }
    return data;
  }
  // --------------------
  // --- METHOD BARU: Untuk menambahkan pesanan ---
  /**
   * Mensimulasikan penambahan pesanan baru ke sebuah order.
   * @param orderId ID dari order yang dituju.
   * @param newOrder Data pesanan baru dari seorang peserta.
   * @returns Observable yang menandakan sukses.
   */
  async addParticipantOrder(newOrder: Partial<IParticipantOrder>): Promise<any> {
    if (!this.supabase) throw new Error('Supabase not initialized');

    const { order_id, user_id, item_name, quantity } = newOrder;

    // 1. Cek apakah sudah ada pesanan untuk user & item yang sama di order ini
    const { data: existingOrder, error: selectError } = await this.supabase
      .from('participant_orders')
      .select('id, quantity')
      .eq('order_id', order_id)
      .eq('user_id', user_id)
      .eq('item_name', item_name)
      .maybeSingle();

    if (selectError) {
      console.error('Error checking existing order:', selectError.message);
      throw selectError;
    }

    // 2. Jika SUDAH ADA, lakukan UPDATE
    if (existingOrder) {
      const newQuantity = existingOrder.quantity + (quantity || 1);
      const { data, error } = await this.supabase
        .from('participant_orders')
        .update({ quantity: newQuantity })
        .eq('id', existingOrder.id); // Update berdasarkan ID baris yang ada

      if (error) {
        console.error('Error updating participant order:', error.message);
        throw error;
      }
      // this.refreshTrigger.next();
      return data;
    }

    // 3. Jika TIDAK ADA, lakukan INSERT baru
    else {
      const { data, error } = await this.supabase
        .from('participant_orders')
        .insert(newOrder);

      if (error) {
        console.error('Error adding participant order:', error.message);
        throw error;
      }
      // this.refreshTrigger.next();
      return data;
    }
  }

  async createOrder(formData: any): Promise<any> {
    if (!this.supabase) throw new Error('Supabase not initialized');

    const currentUser = this.authService.currentUser();
    if (!currentUser) throw new Error('User not logged in');

    // 1. Pisahkan data menu dari data utama
    const { menu_items, ...mainOrderData } = formData;

    // 2. Insert data utama ke tabel 'orders'
    const { data: newOrder, error: orderError } = await this.supabase
      .from('orders')
      .insert({
        ...mainOrderData,
        created_by: currentUser.id, // Tambahkan ID PIC
        status: 'OPEN'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError.message);
      throw orderError;
    }

    // 3. Siapkan data menu dengan order_id yang baru
    const menuItemsWithOrderId = menu_items.map((item: any) => ({
      ...item,
      order_id: newOrder.id
    }));

    // 4. Insert data menu ke tabel 'order_menu_items'
    const { error: menuError } = await this.supabase
      .from('order_menu_items')
      .insert(menuItemsWithOrderId);

    if (menuError) {
      console.error('Error creating menu items:', menuError.message);
      // Di aplikasi production, Anda mungkin ingin menghapus order yang sudah dibuat jika langkah ini gagal
      throw menuError;
    }

    return newOrder;
  }

  async deleteParticipantOrder(participantOrderId: string): Promise<any> {
    if (!this.supabase) throw new Error('Supabase not initialized');

    const { data, error } = await this.supabase
      .from('participant_orders')
      .delete()
      .eq('id', participantOrderId);

    if (error) {
      console.error('Error deleting participant order:', error.message);
      throw error;
    }

    // Pemicu refresh agar UI otomatis update
    // this.refreshTrigger.next();
    return data;
  }

  // --- METHOD BARU: Menutup Order ---
  async closeOrder(orderId: string): Promise<any> {
    if (!this.supabase) throw new Error('Supabase not initialized');

    const { data, error } = await this.supabase
      .from('orders')
      .update({ status: 'CLOSED' }) // Ubah status menjadi 'CLOSED'
      .eq('id', orderId);

    if (error) {
      console.error('Error closing order:', error.message);
      throw error;
    }

    // this.refreshTrigger.next(); // Pemicu refresh agar UI update
    return data;
  }

  // --- METHOD BARU: Membatalkan Order ---
  async cancelOrder(orderId: string): Promise<any> {
    if (!this.supabase) throw new Error('Supabase not initialized');

    const { data, error } = await this.supabase
      .from('orders')
      .update({ status: 'CANCELED' }) // Ubah status menjadi 'CANCELED'
      .eq('id', orderId);

    if (error) {
      console.error('Error canceling order:', error.message);
      throw error;
    }

    // this.refreshTrigger.next(); // Pemicu refresh agar UI update
    return data;
  }

  async getClosedOrdersForUser(): Promise<IOrder[]> {
    if (!this.supabase) return [];

    const currentUser = this.authService.currentUser();
    if (!currentUser) return [];

    const commonSelectQuery = `
      *,
      profiles (full_name),
      participant_orders (*, profiles(full_name))
    `;

    // --- Query 1: Ambil order di mana user adalah PIC ---
    const { data: createdOrders, error: createdError } = await this.supabase
      .from('orders')
      .select(commonSelectQuery)
      .in('status', ['CLOSED', 'CANCELED'])
      .eq('created_by', currentUser.id);

    if (createdError) {
      console.error('Error fetching created orders:', createdError.message);
      throw createdError;
    }

    // --- Query 2: Ambil order di mana user adalah peserta ---
    // Pertama, cari tahu ID order mana saja yang diikuti user
    const { data: participatedOrderIds, error: participationError } = await this.supabase
      .from('participant_orders')
      .select('order_id')
      .eq('user_id', currentUser.id);

    if (participationError) {
      console.error('Error fetching participated order IDs:', participationError.message);
      throw participationError;
    }

    // Ubah hasilnya menjadi array ID saja: ['id1', 'id2', ...]
    const orderIds = participatedOrderIds.map(p => p.order_id);
    let participatedOrders: IOrder[] = [];

    // Jika user pernah ikut order, ambil detail order-order tersebut
    if (orderIds.length > 0) {
      const { data, error } = await this.supabase
        .from('orders')
        .select(commonSelectQuery)
        .in('status', ['CLOSED', 'CANCELED'])
        .in('id', orderIds);

      if (error) {
        console.error('Error fetching participated orders:', error.message);
        throw error;
      }
      participatedOrders = data || [];
    }

    // --- Gabungkan & Hapus Duplikat ---
    const allOrders = [...(createdOrders || []), ...participatedOrders];
    const uniqueOrders = Array.from(new Map(allOrders.map(order => [order.id, order])).values());

    // Urutkan hasil akhir berdasarkan tanggal deadline
    uniqueOrders.sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());

    return uniqueOrders;
  }

  async updateParticipantOrder(participantOrderId: string, newQuantity: number): Promise<any> {
    if (!this.supabase) throw new Error('Supabase not initialized');

    // Pastikan kuantitas baru valid
    if (newQuantity <= 0) {
      // Jika kuantitas 0 atau kurang, kita hapus saja pesanannya
      return this.deleteParticipantOrder(participantOrderId);
    }

    const { data, error } = await this.supabase
      .from('participant_orders')
      .update({ quantity: newQuantity })
      .eq('id', participantOrderId);

    if (error) {
      console.error('Error updating participant order:', error.message);
      throw error;
    }

    // Pemicu refresh agar UI otomatis update
    // this.refreshTrigger.next();
    return data;
  }

  async updatePaymentStatus(participantOrderId: string, newStatus: 'PAID' | 'UNPAID'): Promise<any> {
    if (!this.supabase) throw new Error('Supabase not initialized');

    const { data, error } = await this.supabase
      .from('participant_orders')
      .update({ payment_status: newStatus })
      .eq('id', participantOrderId);

    if (error) {
      console.error('Error updating payment status:', error.message);
      throw error;
    }

    // Pemicu refresh agar UI otomatis update
    // this.refreshTrigger.next();
    return data;
  }

  getSupabaseClient() { return this.supabase; }
}
