import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonContent } from "@ionic/angular/standalone";

import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { UIButtonComponent } from "src/app/shared/basic/ui-button.component";
import { UIRankingChestComponent } from "src/app/shared/components/box/ui-ranking-box.component";
import { ScoreItem } from "../../core/models/game.models";
import { TimeAttackRankingService } from "../../core/services/gameplay/time-attack-ranking.service";

@Component({
  selector: "app-ranking",
  standalone: true,
  imports: [IonContent, UIButtonComponent, UIRankingChestComponent, CommonModule],

  template: `
  <ion-content >
    
    <div class="screen ranking-screen">
    <div class="road-bg"></div>
	
    
	
    <section class="ranking-list">
      <p *ngIf="loading()">Caricamento classifica...</p>
      <p *ngIf="!loading() && !scores().length">Nessun risultato Time Attack disponibile.</p>
      @for (s of scores(); track s.rank) {
		<ui-ranking-box [item]="s" />
      }
    </section>
	
    <div class="renking-actions">
	  <ui-button variant="primary" (pressed)="go('/hub')">Home</ui-button>
	  <ui-button variant="secondary" (pressed)="go('/gameplay')" >Again</ui-button>
	  <ui-button variant="complementary">Share</ui-button>
    </div>
	</div>
  </ion-content>`,
})
export class RankingPage implements OnInit {
  readonly nav = inject(AppNavigationService);
  private readonly rankings = inject(TimeAttackRankingService);
  readonly scores = signal<ScoreItem[]>([]);
  readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      const entries = await this.rankings.loadTopEntries();
      this.scores.set(this.rankings.toScoreItems(entries));
    } catch {
      this.scores.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  go(route: string): void {
    this.nav.go(route);
  }
}
