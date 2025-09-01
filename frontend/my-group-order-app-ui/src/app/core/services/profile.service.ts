import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

// Definisikan tipe data untuk profil agar konsisten
export interface IProfile {
  id: string;
  full_name: string;
  // Anda bisa menambahkan kolom lain di sini di masa depan
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private supabase!: SupabaseClient;
  private platformId = inject(PLATFORM_ID);

  constructor() {
    // Pastikan Supabase client hanya diinisialisasi di browser
    if (isPlatformBrowser(this.platformId)) {
      this.supabase = createClient(environment.supabase.url, environment.supabase.key);
    }
  }

  /**
   * Mengambil data profil untuk satu pengguna berdasarkan ID-nya.
   * @param userId ID pengguna yang profilnya ingin diambil.
   * @returns Promise yang berisi objek IProfile atau null jika tidak ditemukan.
   */
  async getProfile(userId: string): Promise<IProfile | null> {
    // Guard clause untuk mencegah eksekusi di server
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id, full_name') // Pilih kolom yang Anda butuhkan
        .eq('id', userId)
        .maybeSingle(); // Gunakan maybeSingle() untuk menghindari error jika data kosong

      if (error) {
        console.error('Error fetching profile:', error.message);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('An unexpected error occurred while fetching profile:', error);
      return null;
    }
  }
}
