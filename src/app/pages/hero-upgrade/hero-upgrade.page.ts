import { Component, inject, signal } from "@angular/core";
import { IonContent, IonFooter, IonHeader, IonToolbar, PopoverController } from "@ionic/angular/standalone";

import { UIHeroPreviewComponent } from "src/app/shared/components/ui-hero-preview.component";
import { GameStateService } from "../../core/services/state/game-state.service";
import { HeroProgressService } from "../../core/services/progression/hero-progress.service";
import { LevelUpgradeCost } from "../../core/services/economy/pricing.service";
import { FrameItem, HeroAttribute, HeroItem, PriceItem } from "../../core/models/game.models";
import { UIUpgradeChestComponent } from "src/app/shared/components/box/ui-upgrade-box.component";
import { UIHeaderComponent } from "src/app/shared/components/ui-header.component";
import { UIBottomNavComponent } from "src/app/shared/components/ui-bottom-nav.component";
import { UIButtonComponent } from "../../shared/basic/ui-button.component";
import { LevelProgressionService } from "../../core/services/progression/level-progression.service";
import { UIHeroStatDetailPopupComponent } from "src/app/shared/components/popup/ui-hero-stat-detail-popup.component";
import { UIActionFeedbackOverlayComponent } from "src/app/shared/components/ui-action-feedback-overlay.component";
import { UIConfirmActionPopupComponent } from "src/app/shared/components/popup/ui-confirm-action-popup.component";
import { UIPillComponent } from "src/app/shared/basic/ui-pill.component";

@Component({
	selector: "app-hero-upgrade",
	standalone: true,
	imports: [IonContent, IonHeader, IonToolbar, UIHeaderComponent, IonFooter, UIBottomNavComponent, UIHeroPreviewComponent, UIUpgradeChestComponent, UIButtonComponent, UIActionFeedbackOverlayComponent, UIConfirmActionPopupComponent, UIPillComponent],
	template: `
  <ion-header>
    <ion-toolbar>
      <ui-header title="Hero Upgrade" backPath="/hero"></ui-header>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div class="screen upgrade-screen hero-upgrade-layout">
      <section>
	  @if (currentHero(); as hero) {
        <ui-hero-preview [hero]="hero" (phero)="previousHero()" (nhero)="nextHero()" (upgrade)="requestHeroLevelUpgrade()"/>
		@if (canLevelUp(hero)) {
		  <ui-button variant="primary" [disabled]="!heroProgress.canUpgradeHeroLevel(hero)" (pressed)="requestHeroLevelUpgrade()">
		    <span>Upgrade livello eroe</span>
		    @if (heroLevelUpgradePrice(hero); as price) {
		      <ui-pill [frame]="price.frame" size="sm" [value]="price.amount" />
		    }
		  </ui-button>
		}
		}
      </section>

      @if (currentHero(); as hero) {
        <section class="upgrade-card">
          @for (stat of hero.stats; track stat.id) {
            <ui-upgrade-box [hero]="hero" [item]="stat" (pressed)="openStatDetail(hero, stat)"></ui-upgrade-box>
          }
        </section>
      }
	  
      @if (confirmHeroLevelUpgrade(); as hero) {
        <ui-confirm-action-popup
          [open]="true"
          [text]="heroLevelUpgradeConfirmText(hero)"
          [frame]="hero.frame"
          [price]="heroLevelUpgradePrice(hero)"
          pricePrefix="Costo"
          confirmLabel="Upgrade"
          ariaLabel="Conferma upgrade livello eroe"
          (cancel)="confirmHeroLevelUpgrade.set(null)"
          (confirm)="upgradeHeroLevel()"
        />
      }

      <ui-action-feedback-overlay
        [open]="!!actionFeedback()"
        [frame]="actionFeedback()?.frame"
        [text]="actionFeedback()?.text ?? ''"
        [variant]="actionFeedback()?.variant ?? 'gain'"
        [duration]="2500"
        ariaLabel="Statistica eroe aumentata"
        (closed)="actionFeedback.set(null)"
      />
    </div>
  </ion-content>

  <ion-footer>
    <ion-toolbar>
      <ui-bottom-nav />
    </ion-toolbar>
  </ion-footer>`,
})
export class HeroUpgradePage {
	readonly state = inject(GameStateService);
	readonly heroProgress = inject(HeroProgressService);
	private readonly levelProgression = inject(LevelProgressionService);
	private readonly popoverCtrl = inject(PopoverController);

	readonly currentHero = this.state.currentHero;
	readonly actionFeedback = signal<{ frame?: FrameItem; text: string; variant: "gain" | "sell" | "collect" | "open" } | null>(null);
	readonly confirmHeroLevelUpgrade = signal<HeroItem | null>(null);
	
	previousHero(): void {
		const heroList = this.state.inventoryHeroes();
		if (!heroList.length) return;
		const currentIndex = heroList.findIndex(h => h.id === this.currentHero()?.id);
		const previousIndex = (currentIndex - 1 + heroList.length) % heroList.length;
		this.heroProgress.setSelectedHero(heroList[previousIndex]);
	}

	nextHero(): void {
		const heroList = this.state.inventoryHeroes();
		if (!heroList.length) return;
		const currentIndex = heroList.findIndex(h => h.id === this.currentHero()?.id);
		const nextIndex = (currentIndex + 1) % heroList.length;
		this.heroProgress.setSelectedHero(heroList[nextIndex]);
	}
	
	async openStatDetail(hero: HeroItem, stat: HeroAttribute): Promise<void> {
		let pop: HTMLIonPopoverElement | undefined;

		pop = await this.popoverCtrl.create({
			component: UIHeroStatDetailPopupComponent,
			componentProps: {
				hero,
				stat,
				onDismiss: (data?: any) => pop?.dismiss(data),
				onUpgraded: (upgradedStat: HeroAttribute) => this.showStatUpgradeFeedback(upgradedStat),
			},
			translucent: true,
			cssClass: "equip-preview-popover",
		});

		await pop.present();
	}

	canLevelUp(hero: HeroItem): boolean {
		return this.levelProgression.hasHeroExperienceForUpgrade(hero);
	}

	heroLevelUpgradePrice(hero: HeroItem): PriceItem | null {
		return this.priceFromUpgradeCost(this.heroProgress.heroUpgradeCost(hero));
	}

	heroLevelUpgradeConfirmText(hero: HeroItem): string {
		return `Vuoi portare ${hero.title} al livello ${this.heroProgress.heroUpgradeCost(hero).targetLevel}?`;
	}

	requestHeroLevelUpgrade(): void {
		const hero = this.currentHero();
		if (!hero || !this.canLevelUp(hero)) return;
		this.confirmHeroLevelUpgrade.set(hero);
	}

	upgradeHeroLevel(): void {
		const hero = this.currentHero();
		if (!hero) return;

		if (!this.heroProgress.upgradeHeroLevel(hero)) return;

		const upgradedHero = this.currentHero();
		this.confirmHeroLevelUpgrade.set(null);
		this.actionFeedback.set({
			frame: upgradedHero?.frame ?? hero.frame,
			text: `Level up ${upgradedHero?.title ?? hero.title} Lv ${upgradedHero?.level ?? hero.level + 1}`,
			variant: "gain",
		});
	}

	private priceFromUpgradeCost(cost: LevelUpgradeCost): PriceItem | null {
		if (cost.coin) return cost.coin;
		if (cost.resource) {
			return {
				frame: cost.resource.item.frame,
				type: cost.resource.item.price?.type ?? "dust",
				amount: cost.resource.amount,
			};
		}
		return null;
	}

	private showStatUpgradeFeedback(stat: HeroAttribute): void {
		this.actionFeedback.set({
			frame: stat.frame,
			text: `Level up ${stat.title} ${stat.progress.current}`,
			variant: "gain",
		});
	}
}
