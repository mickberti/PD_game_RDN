import { CommonModule } from '@angular/common';
import { Component, inject} from '@angular/core';
import {
  IonContent,
} from '@ionic/angular/standalone';
import { LoginService } from '../../core/services/auth/login-service';
import { UIPanelComponent } from "../../shared/basic/ui-panel.component";
import { UIButtonComponent } from "../../shared/basic/ui-button.component";
import { AppNavigationService } from '../../core/services/app/navigation/app-navigation.service';
import { LoggerService } from '../../core/services/infrastructure/logging/logger.service';


@Component({
  selector: 'app-test-login',
  imports: [CommonModule, IonContent, UIPanelComponent, UIButtonComponent],
  template: `

  <ion-content>
  <main class="screen login-screen">

      <ui-panel [variant]="'primary'">
	  <div class="login-title"><h1>LOGIN VG GAWE</h1><p>Select your login</p></div>
        <div class="login-menu-actions">
          <ui-button (pressed)="loginService.loginViaGoogle()" >Google</ui-button>
          <ui-button variant="secondary" (pressed)="loginService.loginOffline()">Offline</ui-button>	
        </div>
      </ui-panel>

    </main>
  </ion-content>
    `
})
export class LoginPage {
	readonly loggerService = inject(LoggerService);
 readonly loginService = inject(LoginService);
 readonly nav = inject(AppNavigationService);

  constructor() {}

  ionViewDidEnter() {
	this.loggerService.logInfo('[LoginPage] ionViewDidEnter called');
    this.loginService.initialize();
  }
}