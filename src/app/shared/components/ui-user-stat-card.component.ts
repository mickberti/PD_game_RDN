import { Component, computed, inject } from '@angular/core';
import {
  IonAvatar,
  IonCard,
  IonCardContent,
  IonCardTitle,
} from '@ionic/angular/standalone';
import { GameStateService } from '../../core/services/state/game-state.service';




@Component({
  selector: 'ui-user-stat-card',
  standalone: true,
  imports: [
    IonCard,
    IonCardTitle,
    IonCardContent,
    IonAvatar,

  ],
  template: `
    <ion-card class="stat-card" [style.background-image]="cardBannerStyle()">
      <ion-card-content>
	  <div class="header-row">
	    <div class="title-row">
	      <ion-avatar class="user-avatar" aria-hidden="true">
	        <img [src]="avatarUrl()" alt="Icona utente" loading="lazy" referrerpolicy="no-referrer" />
	      </ion-avatar>
	      <ion-card-title>{{ displayName() }}</ion-card-title>
	    </div>
	  </div>
	  <div class="currency-row" aria-label="Valute giocatore">
        Monete {{ coins() }} ·
        Gems {{ gems() }} ·
        Stars {{ dusts() }}
      </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .stat-card {
      position: relative;
      overflow: hidden;
      background-size: cover;
      background-position: center;
      isolation: isolate;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6));
      z-index: 0;
    }

    .stat-card ion-card-header,
    .stat-card ion-card-content {
      position: relative;
      z-index: 1;
      color: #fff;
    }

    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      border: 2px solid rgba(255, 255, 255, 0.65);
    }

    .currency-row {
      margin-top: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      opacity: 0.9;
    }

    ion-card-title {
      color: inherit;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }

    ion-button {
      --color: #fff;
    }

    .status-button-wrap {
      position: relative;
    }

    .nav-badge {
      position: absolute;
      top: 0;
      right: 0;
      min-width: 18px;
      min-height: 18px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      font-weight: 700;
      pointer-events: none;
    }
  `]
})
export class UserStatCardComponent {
  private readonly gameState = inject(GameStateService);

  //readonly progress = this.gameState.progress;
  readonly displayName = this.gameState.displayName;
  readonly coins = this.gameState.coins;
  readonly gems = this.gameState.gems;
  readonly dusts = this.gameState.dusts;
  readonly player = this.gameState.player;

  readonly avatarUrl = computed(() => this.player()?.imageUrl || 'https://api.dicebear.com/9.x/bottts/svg?seed=robot');
  readonly bannerUrl = computed(() => this.player()?.bannerUrl || 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1400&q=80');
  readonly cardBannerStyle = computed(() => `url('${this.bannerUrl()}')`);
  //readonly totalXp = computed(() => getTotalXp(this.progress().level, this.progress().xp));


  readonly hasAnyAvailableAbilityGem = computed(() => false); // TODO: implementare logica reale per le gemme abilità);
  //readonly hasAnyAvailableAbilityGem = computed(() => Object.values(this.progress().abilityGems).some((count) => count > 0));
}
