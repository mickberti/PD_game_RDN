import { CommonModule } from '@angular/common';
import { Component, inject} from '@angular/core';
import { IonCardContent, IonContent, IonButton, IonCard, IonCardHeader, IonHeader, IonToolbar, IonTitle, IonCardTitle } from '@ionic/angular/standalone';
import { LoginService } from '../../core/services/auth/login-service';
import { LoggerService } from '../../core/services/infrastructure/logging/logger.service';


@Component({
  selector: 'app-test-login',
  imports: [IonContent, IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonHeader, IonToolbar, IonTitle, IonToolbar, CommonModule],
  template: `
  <ion-header [translucent]="true">
    <ion-toolbar>
      <ion-title>
        Login
      </ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content [fullscreen]="true">
    <ion-header collapse="condense">
      <ion-toolbar>
        <ion-title size="large">Login into Google</ion-title>
      </ion-toolbar>
    </ion-header>

	<ion-card >
	  <ion-card-header>
	    <ion-card-title>Auth :</ion-card-title>
	  </ion-card-header>
	  <ion-card-content>
          <ion-button *ngIf="loginService.refresh_Access_token" (click)="loginService.logout()"
            expand="block">Logout</ion-button>
          <ion-button *ngIf="!loginService.refresh_Access_token" (click)="loginService.loginViaGoogle()"
            expand="block">Login via
            Google</ion-button>
			  </ion-card-content>
			</ion-card>


	<ion-card *ngIf="loginService.loginResponse">
	  <ion-card-header>
	    <ion-card-title>Login Response:</ion-card-title>
	  </ion-card-header>
	  <ion-card-content>

          <pre>{{ loginService.loginResponse }}</pre>
		    </ion-card-content>
		  </ion-card>

		  <ion-card *ngIf="loginService.googleUserEmail">
		    <ion-card-header>
		      <ion-card-title>User email:</ion-card-title>
		    </ion-card-header>
		    <ion-card-content>

          <pre>{{loginService.googleUserEmail}}</pre>
		    </ion-card-content>
		  </ion-card>
		  <ion-card *ngIf="loginService.refresh_Access_token">
		    <ion-card-header>
		      <ion-card-title>Access Token:</ion-card-title>
		    </ion-card-header>
		    <ion-card-content>

          <pre>{{loginService.refresh_Access_token}}</pre>
		    </ion-card-content>
		  </ion-card>
  </ion-content>
    `
})
export class Login2Page {

 readonly loginService = inject(LoginService);
 readonly loggerService = inject(LoggerService);

  constructor() {}

  ionViewDidEnter() {
	this.loggerService.logInfo('[Login2Page] ionViewDidEnter called, initializing login service');
    this.loginService.initialize();
  }
}