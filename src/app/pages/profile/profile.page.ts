import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonToolbar
} from '@ionic/angular/standalone';

import { Timestamp } from '@angular/fire/firestore';

import { AuthService } from '../../core/services/auth/auth.service';
import { PlayerService } from '../../core/services/auth/player.service';
import { UIBottomNavComponent } from 'src/app/shared/components/ui-bottom-nav.component';
import { UIHeaderComponent } from 'src/app/shared/components/ui-header.component';
import { GameStateService } from '../../core/services/state/game-state.service';
import { LoggerService } from '../../core/services/infrastructure/logging/logger.service';
import { UserStatCardComponent } from "../../shared/components/ui-user-stat-card.component";
import { UIButtonComponent } from "../../shared/basic/ui-button.component";
import { UIPanelComponent } from "../../shared/basic/ui-panel.component";

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [IonHeader, IonToolbar, UIHeaderComponent, IonFooter, UIBottomNavComponent, IonContent, CommonModule, IonInput, IonSelect, IonSelectOption, FormsModule, IonNote, IonToast, UserStatCardComponent, UIButtonComponent, UIPanelComponent],

  template: `
    <ion-header>
  <ion-toolbar>
    <ui-header title="Settings" backPath="/hub"></ui-header>
  </ion-toolbar>
  </ion-header>


    <ion-content>

	<div class="screen profile-screen">
	<div class="profile-grid">
        <ui-user-stat-card/>
        <ui-panel variant="light">
		<div class="profile-info">
			<div>
				  <div class="label" position="stacked">Nome</div>
                  <span>{{ displayName() }}</span>
			  </div>
			  <div>
				  <div class="label" position="stacked">Email</div>
                  <span>{{ email() }}</span>
			  </div>
			  <div>
				  <div class="label" position="stacked">UID</div>
                  <span>{{ uid() }}</span>
			  </div>
			  <div>
				  <div class="label" position="stacked">ID Profilo univoco</div>
                  <span>{{ profileId() }}</span>
			  </div>
			  <div>
				  <div class="label" position="stacked">Ruolo</div>
                  <span>{{ role() }}</span>
			  </div>
			  <div>
				  <div class="label" position="stacked">Data creazione</div>
                  <span>{{ createdAt() }}</span>
			  </div>
			</div>
        </ui-panel>

        <ui-panel  variant="dark">
		<div class="profile-user">

			<div>
                <div class="label" position="stacked">Nickname</div>
                <ion-input
                  [(ngModel)]="form.nickname"
                  placeholder="Il tuo nickname"
                ></ion-input>
			</div>
			<div>
                <div class="label" position="stacked">Ruolo</div>
                <ion-input
                  [(ngModel)]="form.role"
                  placeholder="user"
                ></ion-input>
			</div>
			<div>
                <div class="label" position="stacked">Banner</div>
                <ion-select
                  [(ngModel)]="form.bannerUrl"
                  interface="popover"
                  placeholder="Seleziona un banner"
                >
                  <ion-select-option
                    *ngFor="let banner of availableBanners"
                    [value]="banner.url"
                  >
                    {{ banner.label }}
                  </ion-select-option>
                </ion-select>
			</div>
			<div>
                <div class="label" position="stacked">Icona profilo</div>
                <ion-select
                  [(ngModel)]="form.imageUrl"
                  interface="popover"
                  placeholder="Seleziona un'icona"
                >
                  <ion-select-option
                    *ngFor="let avatar of availableProfileIcons"
                    [value]="avatar.url"
                  >
                    {{ avatar.label }}
                  </ion-select-option>
                </ion-select>
			</div>
            <ion-note>
              L'ID profilo e la data di creazione vengono creati automaticamente
              dal server al primo accesso.
            </ion-note>
            <ui-button
              expand="block"
              class="ion-margin-top"
              (click)="saveProfile()"
              >Salva profilo</ui-button
            >
			</div>
        </ui-panel>

        <ui-panel variant="dark">
		 <div class="profile-logout">
		  <ion-note>
		    Sconnettendo il profilo verrai riportato alla schermata di login e
            dovrai autenticarti nuovamente per accedere al tuo profilo. I tuoi dati e progressi di gioco saranno salvati e disponibili al prossimo accesso.
		  </ion-note>
		  <ui-button
		    expand="block"
		    class="ion-margin-top"
		    (click)="logout()"
		    >Sconnetti profilo</ui-button
		  >
		  </div>
        </ui-panel>
      </div>

      <ion-toast
        [isOpen]="toastOpen"
        [message]="toastMessage"
        [color]="toastColor"
        [duration]="2200"
        (didDismiss)="toastOpen = false"
      ></ion-toast>
	  </div>
    </ion-content>

	<ion-footer>
	<ion-toolbar>
	  <ui-bottom-nav />
	</ion-toolbar>
	</ion-footer>
 
  `,
  styles: [
    `
      .owned-item {
        position: relative;
        overflow: hidden;
        --padding-start: 10px;
      }

      .owned-banner {
        position: absolute;
        inset: 0;
        background-size: cover;
        background-position: center;
        opacity: 0.2;
        pointer-events: none;
      }

      .owned-image {
        --size: 52px;
        border-radius: 10px;
        overflow: hidden;
        position: relative;
        z-index: 1;
      }

      ion-item.owned-item div {
        position: relative;
        z-index: 1;
      }
    `,
  ],
})
export class ProfilePage implements OnInit {
  private readonly gameState = inject(GameStateService);
  private readonly logger = inject(LoggerService);
  private readonly authService = inject(AuthService);
  private readonly playerService = inject(PlayerService);

  readonly displayName = computed(
    () => this.gameState.user()?.displayName ?? '-',
  );
  readonly nickname = computed(() => {
    const player = this.gameState.player();
    const nickname = player?.nickname?.trim();
    if (nickname) {
      return nickname;
    }

    return player?.profileId ?? this.gameState.user()?.displayName ?? '-';
  });
  readonly email = computed(() => this.gameState.user()?.email ?? '-');
  readonly uid = computed(() => this.gameState.user()?.uid ?? '-');
  readonly role = computed(() => this.gameState.player()?.role ?? '-');
  readonly profileId = computed(
    () => this.gameState.player()?.profileId ?? '-',
  );
  readonly createdAt = computed(() => {
    const createdAt = this.gameState.player()?.createdAt;
    if (createdAt instanceof Timestamp) {
      return createdAt.toDate().toLocaleString();
    }

    return createdAt ? String(createdAt) : '-';
  });

  form = {
    role: '',
    nickname: '',
    bannerUrl: '',
    imageUrl: '',
  };

  readonly availableProfileIcons = [
    {
      label: 'Robot',
      url: 'https://api.dicebear.com/9.x/bottts/svg?seed=robot',
    },
    {
      label: 'Ape',
      url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=ape',
    },
    {
      label: 'Knight',
      url: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=knight',
    },
    {
      label: 'Fox',
      url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=fox',
    },
  ];

  readonly availableBanners = [
    {
      label: 'Aurora',
      url: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1400&q=80',
    },
    {
      label: 'Mountain',
      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=80',
    },
    {
      label: 'Neon City',
      url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1400&q=80',
    },
    {
      label: 'Galaxy',
      url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1400&q=80',
    },
  ];

  toastOpen = false;
  toastMessage = '';
  toastColor: 'success' | 'danger' = 'success';


  async ngOnInit(): Promise<void> {
    const uid = this.gameState.user()?.uid;
    if (!uid) {
      return;
    }

    const player = this.gameState.player();
    this.form = {
      role: player?.role ?? 'user',
      nickname: player?.nickname ?? '',
      bannerUrl: player?.bannerUrl || this.availableBanners[0].url,
      imageUrl: player?.imageUrl || this.availableProfileIcons[0].url,
    };

  }

  async saveProfile(): Promise<void> {
    const uid = this.gameState.user()?.uid;
    if (!uid) {
      return;
    }

    try {
      await this.playerService.updateProfile(uid, {
        role: this.form.role || 'user',
        nickname: this.form.nickname.trim(),
        bannerUrl: this.form.bannerUrl.trim(),
        imageUrl: this.form.imageUrl.trim(),
      });
      this.toastMessage = 'Profilo aggiornato con successo.';
      this.toastColor = 'success';
      this.toastOpen = true;
    } catch {
      this.toastMessage = 'Errore durante il salvataggio del profilo.';
      this.toastColor = 'danger';
      this.toastOpen = true;
    }
  }
  
  async logout(): Promise<void> {
    this.logger.logInfo('AppTopBar : Logout initiated');
    this.gameState.reset();
    await this.authService.logout();
  }

}
