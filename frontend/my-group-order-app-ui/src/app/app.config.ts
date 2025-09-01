import { ApplicationConfig, APP_INITIALIZER, provideZoneChangeDetection, isDevMode } from '@angular/core'; // <-- Import APP_INITIALIZER
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service'; // <-- Import AuthService
import { provideClientHydration } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';


// Buat sebuah "factory function" untuk initializer
export function authInitializerFactory(authService: AuthService): () => Promise<void> {
  return () => authService.initializeSession();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(),
    {
      provide: APP_INITIALIZER,
      useFactory: authInitializerFactory,
      deps: [AuthService], // Beritahu Angular bahwa factory ini butuh AuthService
      multi: true         // Wajib untuk APP_INITIALIZER
    }, provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })
  ]
};
