import { CommonModule } from "@angular/common";
import { Component, Input, inject } from "@angular/core";
import { FrameItem, HeroAttribute, HeroItem, PriceItem } from "../../../core/models/game.models";
import { defaultFrame, defaultHeroAttribute } from "../../../core/models/mock/fantasy/utils-data";
import { LevelUpgradeCost } from "../../../core/services/progression/level-progression.service";
import { HeroProgressService } from "../../../core/services/progression/hero-progress.service";
import { GameStateService } from "../../../core/services/state/game-state.service";
import { UIButtonSpriteComponent } from "../../basic/ui-button-sprite.component";
import { UIButtonComponent } from "../../basic/ui-button.component";
import { UIPanelComponent } from "../../basic/ui-panel.component";
import { UIPillComponent } from "../../basic/ui-pill.component";
import { UiSpriteComponent } from "../../basic/ui-sprite.component";

@Component({
  selector: "ui-hero-stat-detail-popup",
  standalone: true,
  imports: [CommonModule, UIButtonComponent, UIButtonSpriteComponent, UIPanelComponent, UIPillComponent, UiSpriteComponent],
  template: `
    <ui-panel [variant]="'light'">
      <div class="equip-preview hero-stat-detail-preview">
        <div class="equip-preview-title-row">
          <div class="equip-preview-title">Dettaglio statistica</div>
          <ui-button-sprite
          class="popup-close-button"
          styleClass="popup-close-button"
          size="sm"
          [frame]="{ name: 'icon-close-large', effect: 'none' }"
          (pressed)="onDismiss?.()"
          ariaLabel="Chiudi popup"
          />
        </div>

        <section class="content">
          <div class="col preview">
            <div class="sprite-preview">
              <ui-sprite [frame]="attribute.frame ?? defaultFrame"></ui-sprite>
            </div>
            <div class="name">{{ attribute.title }}</div>
            <div class="description">{{ attribute.description }}</div>

            <ul class="stats">
              <li><strong>Eroe:</strong> {{ hero?.title ?? 'Nessun eroe' }}</li>
              <li><strong>Stato:</strong> {{ upgradeStatusLabel() }}</li>
            </ul>
          </div>
        </section>

        @if (upgradeFeedback) {
          <div class="upgrade-feedback" role="status" aria-live="polite">{{ upgradeFeedback }}</div>
        }

        <footer class="actions">
          <ui-button variant="secondary" [size]="'sm'" [disabled]="!canUpgrade()" (pressed)="upgradeStat()">
            <span class="upgrade-button-label">Upgrade</span>
            @if (upgradePrice(); as price) {
              <ui-pill [frame]="price.frame" size="sm" [value]="price.amount" />
            } @else {
              <span class="upgrade-button-free">Gratis</span>
            }
          </ui-button>
        </footer>
      </div>
    </ui-panel>
  `,
  styles: [`
    .upgrade-feedback {
      margin-top: 10px;
      text-align: center;
      font-weight: 700;
      color: #1aa34a;
    }

    .upgrade-button-label {
      margin-right: 6px;
    }

    .upgrade-button-free {
      font-weight: 700;
    }
  `],
})
export class UIHeroStatDetailPopupComponent {
  private readonly gameState = inject(GameStateService);
  private readonly heroProgress = inject(HeroProgressService);

  @Input() hero: HeroItem | null = null;
  @Input() stat: HeroAttribute = defaultHeroAttribute;
  @Input() onDismiss?: (data?: any) => void;
  @Input() onUpgraded?: (stat: HeroAttribute) => void;

  readonly defaultFrame: FrameItem = defaultFrame;
  upgradeFeedback = "";

  get attribute(): HeroAttribute {
    return this.hero?.stats.find((item) => item.id === this.stat.id) ?? this.stat ?? defaultHeroAttribute;
  }

  remainingPoints(): number {
    return Math.max(0, this.attribute.progress.total - this.attribute.progress.current);
  }

  upgradeCost(): LevelUpgradeCost | null {
    if (!this.hero) return null;
    return this.heroProgress.heroStatUpgradeCost(this.hero, this.attribute.id);
  }

  upgradePrice(): PriceItem | null {
    const cost = this.upgradeCost();
    if (!cost) return null;
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

  canUpgrade(): boolean {
    return !!this.hero && this.heroProgress.canUpgradeHeroStat(this.hero, this.attribute.id);
  }

  upgradeStatusLabel(): string {
    if (this.remainingPoints() <= 0) return "Statistica al massimo";
    return this.canUpgrade() ? "Upgrade disponibile" : "Risorse insufficienti";
  }

  upgradeCostLabel(cost: LevelUpgradeCost): string {
    if (cost.coin) return `${cost.coin.amount} monete`;
    if (cost.resource) return `${cost.resource.amount}x ${cost.resource.item.name}`;
    return "Gratis";
  }

  upgradeStat(): void {
    if (!this.hero || !this.canUpgrade()) return;

    const heroId = this.hero.id;
    const statId = this.attribute.id;
    if (!this.heroProgress.upgradeHeroStat(this.hero, statId)) return;

    const upgradedHero = this.gameState.inventoryHeroes().find((item) => item.id === heroId) ?? this.gameState.currentHero();
    if (upgradedHero) {
      const upgradedStat = upgradedHero.stats.find((item) => item.id === statId) ?? this.stat;
      this.hero = upgradedHero;
      this.stat = upgradedStat;
      this.upgradeFeedback = `Upgrade ottenuto: ${upgradedStat.title} ${upgradedStat.progress.current}/${upgradedStat.progress.total}`;
      this.onUpgraded?.(this.stat);
    }
  }
}
