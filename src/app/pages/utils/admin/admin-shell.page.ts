import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  IonContent,
  IonToolbar,
  IonFooter,
  IonRouterOutlet
} from '@ionic/angular/standalone';
import { UIBottomUtilsComponent } from "../../../shared/components/ui-bottom-utils.component";

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonToolbar,
    IonContent,
	IonFooter,
    IonRouterOutlet,
    UIBottomUtilsComponent
],
  template: `

    <ion-content class="ion-padding">
	  	<ion-router-outlet ></ion-router-outlet>
    </ion-content>
	
	<ion-footer>
	  <ion-toolbar>
	    <ui-bottom-utils />
	  </ion-toolbar>
	</ion-footer>
  `,
  styles: [`
	.admin-toolbar {
	  display: flex;
	  align-items: center;
	  gap: 16px;
	}

	.admin-title {
	  font-weight: 600;
	  font-size: 16px;
	  white-space: nowrap;
	}

	.admin-nav {
	  flex: 1;
	}`]
})
export class AdminShellPage {}
