import { ChangeDetectionStrategy, Component, effect, inject } from "@angular/core";
import { IonApp, IonRouterOutlet } from "@ionic/angular/standalone";
import { StatusBar } from '@capacitor/status-bar';
import { LoggerService } from "./core/services/infrastructure/logging/logger.service";
import { LoginService } from "./core/services/auth/login-service";
import { TimeService } from "./core/services/utils/time.service";
import { GameStateService } from "./core/services/state/game-state.service";
import { Router } from "@angular/router";
import { register } from 'swiper/element/bundle';
import { DirectRouteAccessService } from "./core/services/app/navigation/direct-route-access.service";

register();

@Component({
  selector: "app-root",
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: `<ion-app>
  <div class="fog-container">
    <div class="fog-img fog-img-first"></div>
    <div class="fog-img fog-img-second"></div>
  </div>
  <ion-router-outlet></ion-router-outlet>
  </ion-app>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
	private readonly gameState = inject(GameStateService);
	private readonly router = inject(Router);
	private readonly timeService = inject(TimeService);
	private readonly loginService = inject(LoginService);
	private readonly logger = inject(LoggerService);
	private readonly directRouteAccess = inject(DirectRouteAccessService);

	// 🔥 signal diretto (no RxJS)
	readonly initialized = this.gameState.initialized;
	readonly loading = this.gameState.loading;
	readonly progress = this.gameState.progress;
	readonly user = this.gameState.user;

	
	constructor() {
		this.initializeApp();
	}
	
	async initializeApp() {
	  
	  this.timeService.setupAutoSync();
	  this.loginService.refreshToken(); // 🔥 refresh token all'avvio (se presente) TEST DA ELIMINARE SE NON SERVE
	  this.handleAuthRouting();
	  await StatusBar.hide();
	}
	
	// 🧠 gestione globale routing auth
	private handleAuthRouting() {
	  effect(() => {
	    const initialized = this.initialized();
	    const loading = this.loading();
	    const user = this.user();

	    this.logger.logDebug('[AppComponent] effect → initialized:', initialized, 'user:', user);

	    const currentUrl = this.router.url;

	  this.logger.logDebug('[AppComponent] current URL:', currentUrl, 'user:', user);
	  
	    // Al primo avvio forza sempre la boot page finché l'utente non è stato
	    // caricato in memoria; da lì BootPage applica le regole di navigazione.
	    if (!initialized || loading) {
	      if (!this.directRouteAccess.enabled() && currentUrl !== '/boot') {
	        this.logger.logDebug('[AppComponent] redirect iniziale → /boot');
	        void this.router.navigateByUrl('/boot', { replaceUrl: true });
	      }
	      return;
	    }

	    // Durante la boot page la navigazione viene gestita da BootPage.
	    if (currentUrl === '/boot') {
	      return;
	    }

	    // 🔒 NON loggato → login
	    if (!user && currentUrl !== '/login') {
	      this.logger.logDebug('[AppComponent] redirect → /login');
	      this.router.navigateByUrl('/login');
	      return;
	    }

	    // Utente autenticato: entra direttamente nell'hub RDN.
	    if (user && currentUrl === '/login') {
	      const target: string = '/hub';

	      if (currentUrl !== target) {
	        this.logger.logDebug('[AppComponent] redirect →', target);
	        void this.router.navigateByUrl(target, { replaceUrl: true });
	      }
	    }
	  });
	}

}
