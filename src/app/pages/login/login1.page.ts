import { CommonModule } from '@angular/common';
import { Component} from '@angular/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { IonCardContent, IonContent, IonButton, IonCard, IonCardHeader, IonHeader, IonToolbar, IonTitle, IonCardTitle } from '@ionic/angular/standalone';
import { GoogleAuthProvider, signInWithCredential, getAuth, User } from '@angular/fire/auth';
import { environment } from "../../../environments/environment";


@Component({
  selector: 'app-test-login',
  imports: [IonContent, IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonHeader, IonToolbar, IonTitle, IonToolbar, CommonModule],
  template: `
  <ion-header>
    <ion-toolbar>
      <ion-title>Test Google Login</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">

    <ion-button expand="block" (click)="init()">
      Init Plugin
    </ion-button>

    <ion-button expand="block" color="primary" (click)="loginGoogle()">
      Login Google
    </ion-button>

    <ion-button expand="block" color="medium" (click)="logout()">
      Logout
    </ion-button>

    <ion-card *ngIf="user">
      <ion-card-header>
        <ion-card-title>User</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p><b>Email:</b> {{user.email}}</p>
        <p><b>UID:</b> {{user.uid}}</p>
      </ion-card-content>
    </ion-card>

    <ion-card>
      <ion-card-header>
        <ion-card-title>Log</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <div *ngFor="let l of log" style="font-size:12px; margin-bottom:4px;">
          {{l}}
        </div>
      </ion-card-content>
    </ion-card>

  </ion-content>
    `
})
export class Login1Page {

  user: User | null = null;
  log: string[] = [];

  constructor() {}

  async init() {
    try {
      await SocialLogin.initialize({
		google: {
		    webClientId: environment.webClientId,
		    mode: 'online'
		}
      });
      this.addLog('Init OK');
    } catch (e: any) {
      this.addLog('Init ERROR: ' + JSON.stringify(e));
    }
  }

  async loginGoogle() {
    try {
      this.addLog('Login start');

      const res = await SocialLogin.login({
		provider: 'google',
		options: {
		    scopes: ['email', 'profile'],
		    forceRefreshToken: true
		}
      });

	  this.addLog('Google response: ' + JSON.stringify(res));

	  // Capgo typing: result può essere online o offline
	  const idToken = (res as any)?.result?.idToken;

	  if (!idToken) {
	    throw new Error('ID TOKEN NULL');
	  }

      const credential = GoogleAuthProvider.credential(idToken);

      const auth = getAuth();
      const cred = await signInWithCredential(auth, credential);

      this.user = cred.user;

      this.addLog('Firebase login OK: ' + this.user?.email);

    } catch (e: any) {
      this.addLog('Login ERROR: ' + JSON.stringify(e));
    }
  }

  async logout() {
    try {
      await SocialLogin.logout({ provider: 'google' });
      await getAuth().signOut();
      this.user = null;
      this.addLog('Logout OK');
    } catch (e: any) {
      this.addLog('Logout ERROR: ' + JSON.stringify(e));
    }
  }

  private addLog(msg: string) {
    console.log(msg);
    this.log.unshift(new Date().toISOString() + ' - ' + msg);
  }
}