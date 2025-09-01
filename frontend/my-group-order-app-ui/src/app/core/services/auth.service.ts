import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common'; // <-- Import ini
import { Router } from '@angular/router';
import { createClient, SupabaseClient, User, AuthError, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase!: SupabaseClient; // Ubah inisialisasi

  // 2. Inject PLATFORM_ID untuk mendeteksi lingkungan
  private platformId = inject(PLATFORM_ID);

  // Gunakan signal untuk menampung data user yang sedang login
  currentUser = signal<User | null>(null);

  constructor(private router: Router) {
    // 3. Bungkus semua logika Supabase dengan pengecekan isPlatformBrowser
    if (isPlatformBrowser(this.platformId)) {
      this.supabase = createClient(environment.supabase.url, environment.supabase.key);

      this.supabase.auth.onAuthStateChange((event, session) => {
        this.currentUser.set(session?.user ?? null);
      });
    }
  }

  public initializeSession(): Promise<void> {
    return new Promise((resolve) => {
      if (!isPlatformBrowser(this.platformId)) {
        // Jika di server, langsung selesaikan
        return resolve();
      }

      this.supabase.auth.getSession().then(({ data: { session } }) => {
        this.currentUser.set(session?.user ?? null);
        // Selesaikan promise setelah sesi diperiksa
        resolve();
      });
    });
  }

  register(credentials: { email: string; password: string; options?: any }): Observable<{ user: User | null; error: AuthError | null }> {
    if (!this.supabase) return from(Promise.resolve({ user: null, error: new AuthError('Supabase client not initialized on server', 500) }));
    return from(this.supabase.auth.signUp(credentials)).pipe(
      map(({ data, error }) => ({ user: data.user, error }))
    );
  }

  login(credentials: { email: string; password: string }): Observable<{ session: Session | null; error: AuthError | null }> {
    if (!this.supabase) return from(Promise.resolve({ session: null, error: new AuthError('Supabase client not initialized on server', 500) }));
    return from(this.supabase.auth.signInWithPassword(credentials)).pipe(
      map(({ data, error }) => ({ session: data.session, error }))
    );
  }

  async logout(): Promise<void> {
    if (!this.supabase) return;
    await this.supabase.auth.signOut();
    this.router.navigate(['/login']);
  }

  // Helper untuk memeriksa status login
  isLoggedIn(): boolean {
    return !!this.currentUser();
  }

  // Helper untuk mendapatkan sesi saat ini jika diperlukan
  async getSession() {
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }
}
