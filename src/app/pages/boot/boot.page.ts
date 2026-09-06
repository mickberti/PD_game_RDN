import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/state/game-state.service';
import { LoggerService } from '../../core/services/infrastructure/logging/logger.service';
import { ProgressLoginComponent } from "../../shared/basic/ui-progress-login.component";
import { IonContent } from '@ionic/angular/standalone';



@Component({
  selector: 'app-boot',
  standalone: true,
  imports: [ProgressLoginComponent, IonContent],
  template: `  
    <ion-content>
	<main class="screen boot-screen">
  	<section class="ui-stack">
  		<div class="boot-box">
  			<h1>GEARITHM: The Zero Mechanism</h1>
			@if (error(); as startupError) {
			  <section class="boot-error" role="alert">
				<h2>Inizializzazione non completata</h2>
				<p>È stato rilevato un problema durante l'avvio:</p>
				<pre>{{ startupError }}</pre>
				<button type="button" (click)="continueAfterError()">Continua comunque</button>
			  </section>
			} @else {
			  <p>Caricamento asset UI e gameplay</p>
			  <ui-progress-login [value]="loadingProgress()" />
			}
		</div>
	</section>
	<section class="boot-diagnostics" aria-label="Diagnostica inizializzazione">
	  @for (step of bootstrapSteps(); track step.id) {
		<div class="boot-diagnostic-row">
		  <span class="boot-diagnostic-dot" [class.success]="step.status === 'success'" [class.error]="step.status === 'error'"></span>
		  <span class="boot-diagnostic-label">{{ step.label }}</span>
		  <span class="boot-diagnostic-detail">{{ step.detail }}</span>
		</div>
	  }
	</section>
  </main>
  </ion-content>`,
  styles: [`  

  .boot-screen{
	background-image: var(--main-background-boot);
	background-repeat: no-repeat;
	background-position: center;
	background-size: cover;
	}
  .boot-box {
  	position:relative;
  	z-index:2;
  	display:grid;
  	justify-items:center;
  	gap:18px;
  	text-align:center;
  }
  h1 {
  	margin:0;
  	font-size:clamp(42px, 12vw, 72px); font-weight:1000; color:white; text-shadow:0 0 18px var(--ui-primary), 0 8px 0 rgba(0,0,0,.35);
  }
  p {
  	margin:0;
  	opacity:.82;
  }
  .boot-error {
    width:min(86vw, 520px); padding:20px; border:1px solid rgba(255, 166, 166, .8);
    border-radius:14px; background:rgba(58, 10, 15, .9); box-shadow:0 10px 34px rgba(0,0,0,.42);
  }
  .boot-error h2 { margin:0 0 10px; font-size:20px; color:#fecaca; }
  .boot-error pre { max-height:150px; margin:12px 0 16px; overflow:auto; white-space:pre-wrap; text-align:left; color:#fff; font:13px/1.45 monospace; }
  .boot-error button { border:0; border-radius:999px; padding:10px 18px; color:#09131a; font-weight:800; background:var(--ui-primary); }
  .boot-diagnostics {
    position:fixed; z-index:3; right:14px; bottom:calc(14px + env(safe-area-inset-bottom)); left:14px;
    display:grid; gap:5px; max-width:420px; margin:auto; padding:10px 12px;
    border: 2px solid rgba(255, 255, 255, 0.18);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.18); backdrop-filter:blur(8px);
  }
  .boot-diagnostic-row { display:grid; grid-template-columns:10px minmax(102px, .8fr) minmax(0, 1.6fr); gap:8px; align-items:center; text-align:left; font-size:11px; }
  .boot-diagnostic-dot { width:8px; height:8px; border-radius:50%; background:#ef4444; box-shadow:0 0 7px rgba(239,68,68,.85); }
  .boot-diagnostic-dot.success { background:#4ade80; box-shadow:0 0 7px rgba(74,222,128,.9); }
  .boot-diagnostic-dot.error { background:#fb7185; box-shadow:0 0 7px rgba(251,113,133,.95); }
  .boot-diagnostic-label { color:#e2e8f0; font-weight:700; }
  .boot-diagnostic-detail { overflow:hidden; color:#cbd5e1; text-overflow:ellipsis; white-space:nowrap; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BootPage implements OnInit {
  private readonly router = inject(Router);
  private readonly logger = inject(LoggerService);
  private readonly gameState = inject(GameStateService);
  readonly loadingProgress = signal(0);
  
  readonly initialized = this.gameState.initialized;
  readonly user = this.gameState.user;
  readonly progress = this.gameState.progress;
  readonly loading = this.gameState.loading;
  readonly error = this.gameState.error;
  readonly bootstrapSteps = this.gameState.bootstrapSteps;

  constructor() {
    this.handleAuthRouting();
  }
  
  ngOnInit(): void {
	this.logger.log('[BootPage] initialized, starting loading sequence');
    const timer = window.setInterval(() => {
      const next = Math.min(100, this.loadingProgress() + 8);
      this.loadingProgress.set(next);
	  if (next >= 100) {
		window.clearInterval(timer);
		this.logger.logDebug('[BootPage] loading UI completed, waiting app initialization');
	  }
	  this.logger.logDebug(`[BootPage] loading progress: ${this.loadingProgress()}%`);
    }, 70);


  }
  
  // 🧠 gestione globale routing auth
  private handleAuthRouting() {
	effect(() => {
	  const loadingCompleted = this.loadingProgress() >= 100;
	  const initialized = this.initialized();
	  const loading = this.loading();
	  const user = this.user();

	  if (!loadingCompleted || !initialized || loading || this.error()) {
		return;
	  }

	  const target = user ? '/hub' : '/login';
	  this.logger.logDebug('[BootPage] app initialized, navigating to:', target);
	  void this.router.navigateByUrl(target, { replaceUrl: true });
	});
  }

  continueAfterError(): void {
    const target = this.user() ? '/hub' : '/login';
    this.logger.logWarning('[BootPage] user continued after startup error:', this.error());
    void this.router.navigateByUrl(target, { replaceUrl: true });
  }
}
