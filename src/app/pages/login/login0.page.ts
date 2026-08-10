import { Component, DestroyRef, inject } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController
} from '@ionic/angular/standalone';

import { AuthService } from '../../core/services/auth/auth.service';
import { LoggerService } from '../../core/services/infrastructure/logging/logger.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonSpinner],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>VG Gawe</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="app-page-shell login-shell">
        <h1>Base project pronto</h1>
        <p>
          Login Google, progressi su Firestore, configurazione pubblica letta dal server e hub principale
          già predisposto.
        </p>

        <ion-button expand="block" size="large" (click)="login()" [disabled]="loading">
          @if (loading) {
            <ion-spinner name="crescent"></ion-spinner>
          } @else {
            Accedi con Google
          }
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .login-shell {
        min-height: 100%;
        display: grid;
        align-content: center;
        gap: 16px;
      }
    `
  ]
})
export class Login0Page {
  private readonly authService = inject(AuthService);
  private readonly toastController = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);
  private readonly logger = inject(LoggerService);

  loading = false;

  constructor() {
	this.logger.logInfo('[LoginPage] constructor called');
    const subLoading = this.authService.loading$.subscribe((value) => {
      this.loading = value;
    });

    this.destroyRef.onDestroy(() => {
      subLoading.unsubscribe();
    });
  }

  async login(): Promise<void> {
    try {
		this.logger.logInfo('[LoginPage] login() called');
      await this.authService.signInWithGoogle();
    } catch (error) {
      const toast = await this.toastController.create({
        message: 'Login page : Login fallito. Controlla la configurazione Firebase e Google Auth.',
        duration: 2500,
        color: 'danger'
      });
      await toast.present();
      this.logger.logError(error);
    }
  }
}
