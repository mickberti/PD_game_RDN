import { Component, Input, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EquipItem, FrameItem, PriceItem } from "../../../core/models/game.models";
import { UiSpriteComponent } from "src/app/shared/basic/ui-sprite.component";
import { UIButtonSpriteComponent } from "../../basic/ui-button-sprite.component";
import { UIPanelComponent } from "../../basic/ui-panel.component";
import { defaultFrame } from "../../../core/models/mock/fantasy/utils-data";
import { LevelUpgradeCost } from "../../../core/services/progression/level-progression.service";
import { HeroProgressService } from "../../../core/services/progression/hero-progress.service";
import { GameStateService } from "../../../core/services/state/game-state.service";
import { UIProgressStatItem, UIProgressStatsComponent } from "../../basic/ui-progress-stats.component";
import { UIPreviewAttributesComponent } from "../ui-preview-attributes.component";
import { UIPreviewStatItem, UIPreviewStatsComponent } from "../ui-preview-stats.component";
import { UIPillComponent } from "../../basic/ui-pill.component";
import { InventoryMutationService } from "../../../core/services/inventory/inventory-mutation.service";

@Component({
  selector: "ui-equip-compare-popup",
  standalone: true,
  imports: [
    CommonModule,
    UiSpriteComponent,
    UIButtonSpriteComponent,
    UIPanelComponent,
    UIProgressStatsComponent,
    UIPreviewAttributesComponent,
    UIPreviewStatsComponent,
    UIPillComponent,
  ],
  template: `
  <ui-panel [variant]="'light'">
    <div class="equip-preview">
      <div class="equip-preview-title-row">
        <div class="equip-preview-title">Confronto equip</div>
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
        <div class="col current">
          <div class="name">Equip attuale</div>
          <div class="sprite-preview"><ui-sprite [frame]="currentEquip?.frame ?? defaultFrame"></ui-sprite></div>
          <div class="name">{{ currentEquip?.name || "Nessuno" }}</div>
          <ui-preview-attributes
            direction="vertical"
            [level]="currentEquip?.level ?? 0"
            [attack]="currentEquip?.attack ?? 0"
            [defense]="currentEquip?.defense ?? 0"
            [speed]="currentEquip?.velocita ?? 0"
            ariaLabel="Attributi equip attuale"
          />
          <ul class="stats">
            <li class="stats-progress"><ui-progress-stats [items]="equipProgressStats(currentEquip)" ariaLabel="Progressi equip attuale" /></li>
            <li><ui-preview-stats direction="vertical" [items]="equipBonusStats(currentEquip)" ariaLabel="Bonus equip attuale" /></li>
          </ul>
        </div>

        <div class="col arrow">
          <div class="vs"><ui-sprite [frame]="{ name: 'icon-balance', effect: 'none' }" /></div>
        </div>

        <div class="col preview">
          <div class="name">Anteprima</div>
          <div class="sprite-preview"><ui-sprite [frame]="previewEquip?.frame ?? defaultFrame"></ui-sprite></div>
          <div class="name">{{ previewEquip?.name }}</div>

          <ui-preview-attributes
            direction="vertical"
            [level]="previewEquip?.level ?? 0"
            [attack]="previewEquip?.attack ?? 0"
            [defense]="previewEquip?.defense ?? 0"
            [speed]="previewEquip?.velocita ?? 0"
            [compareLevel]="currentEquip?.level ?? 0"
            [compareAttack]="currentEquip?.attack ?? 0"
            [compareDefense]="currentEquip?.defense ?? 0"
            [compareSpeed]="currentEquip?.velocita ?? 0"
            ariaLabel="Attributi anteprima equip"
          />
          <ul class="stats">
            <li class="stats-progress"><ui-progress-stats [items]="equipProgressStats(previewEquip)" ariaLabel="Progressi anteprima equip" /></li>
            <li><ui-preview-stats direction="vertical" [items]="equipBonusStats(previewEquip, currentEquip)" ariaLabel="Bonus anteprima equip" /></li>
          </ul>
        </div>
      </section>

      @if (upgradeFeedback) {
        <div class="upgrade-feedback" role="status" aria-live="polite">{{ upgradeFeedback }}</div>
      }

      <footer class="actions">
        @if (levelUpgradeLabel()) {
          <div class="action-icon-stack">
            <ui-button-sprite
              [frame]="{ name: 'icon-arrow-up', effect: 'fx-power-glow' }"
              [size]="'sm'"
              [disabled]="!canLevelUpgrade()"
              ariaLabel="Upgrade equip"
              (pressed)="upgradeLevel()"
            />
            @if (upgradePrice(); as price) {
              <ui-pill [frame]="price.frame" size="sm" [value]="price.amount" />
            }
          </div>
        }
        @if (canEquipPreview()) {
          <div class="action-icon-stack">
            <ui-button-sprite
              [frame]="{ name: 'icon-badge-star', effect: 'none' }"
              [size]="'sm'"
              ariaLabel="Equipaggia"
              (pressed)="onEquip?.(previewEquip)"
            />
          </div>
        }
      </footer>
    </div>
  </ui-panel>
  `,
  styles: [`
    .actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .action-icon-stack {
      display: grid;
      justify-items: center;
      gap: 6px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
      text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.45);
      border: 2px solid var(--fantasy-border-strong, #5a321c);
      border-radius: 12px;
      background: rgba(30, 20, 16, 0.62);
      color: #fff3c4;
      padding: 5px;
      min-width: 70px;
    }

    .upgrade-feedback {
      margin-top: 10px;
      text-align: center;
      font-weight: 700;
      color: #1aa34a;
    }
  `],
})
export class UIEquipComparePopupComponent {
  private readonly gameState = inject(GameStateService);
  private readonly heroProgress = inject(HeroProgressService);
  private readonly inventoryMutations = inject(InventoryMutationService);

  @Input() previewEquip!: EquipItem | null;
  @Input() currentEquip!: EquipItem | null;

  @Input() onDismiss?: (data?: any) => void;
  @Input() onEquip?: (equip: EquipItem | null) => void;

  defaultFrame: FrameItem = defaultFrame;
  readonly defaultProgress = { descr: "", current: 0, total: 1 };
  upgradeFeedback = "";

  equipProgressStats(equip: EquipItem | null): UIProgressStatItem[] {
    return [
      { label: "Exp", progress: equip?.experience ?? this.defaultProgress, kind: "experience" },
      { label: "Dur", progress: equip?.duration ?? this.defaultProgress, kind: "duration" },
    ];
  }

  equipBonusStats(equip: EquipItem | null, compareEquip: EquipItem | null = null): UIPreviewStatItem[] {
    return [{
      label: "Bonus",
      value: this.bonusLabel(equip),
      delta: compareEquip ? this.statValue(equip, "bonus") - this.statValue(compareEquip, "bonus") : null,
    }];
  }

  bonusLabel(equip: EquipItem | null): string {
    const bonuses = equip?.bonuses?.length ? equip.bonuses : (equip?.bonus ? [equip.bonus] : []);
    const activeBonuses = bonuses.filter((bonus) => bonus.type !== "none" && bonus.value);
    if (!activeBonuses.length) return "Nessuno";

    return activeBonuses.map((bonus) => {
      const sign = bonus.malus ? "-" : "+";
      return `${bonus.type} ${sign}${bonus.value}`;
    }).join(" · ");
  }

  equipUpgradeCost(equip: EquipItem): LevelUpgradeCost {
    return this.heroProgress.equipUpgradeCost(equip);
  }

  canLevelUpgrade(): boolean {
    return this.previewEquip ? this.heroProgress.canUpgradeEquipLevel(this.previewEquip) : false;
  }

  canEquipPreview(): boolean {
    return !!this.previewEquip && this.inventoryMutations.canEquipHero(this.previewEquip);
  }

  levelUpgradeLabel(): string | null {
    if (!this.previewEquip) return null;
    return `Upgrade Lv ${this.equipUpgradeCost(this.previewEquip).targetLevel}`;
  }

  upgradePrice(): PriceItem | null {
    if (!this.previewEquip) return null;
    const cost = this.equipUpgradeCost(this.previewEquip);
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

  upgradeLevel(): void {
    const equip = this.previewEquip;
    if (equip && this.heroProgress.upgradeEquipLevel(equip)) {
      const upgradedEquip = this.gameState.inventoryEquip().find((item) => item.id === equip.id) ?? equip;
      this.previewEquip = upgradedEquip;
      this.upgradeFeedback = this.equipUpgradeFeedback(equip, upgradedEquip);
    }
  }

  private equipUpgradeFeedback(before: EquipItem, after: EquipItem): string {
    const parts = [
      `Lv ${before.level}->${after.level}`,
      this.statDeltaLabel("Att", before.attack ?? 0, after.attack ?? 0),
      this.statDeltaLabel("Dif", before.defense ?? 0, after.defense ?? 0),
      this.statDeltaLabel("Vel", before.velocita ?? 0, after.velocita ?? 0),
    ].filter(Boolean);

    return `Upgrade ottenuto: ${parts.join(" · ")}`;
  }

  private statDeltaLabel(label: string, before: number, after: number): string {
    const delta = after - before;
    if (!delta) return "";
    return `${label} +${delta}`;
  }

  private statValue(equip: EquipItem | null, stat: "level" | "attack" | "defense" | "velocita" | "bonus"): number {
    if (!equip) return 0;
    if (stat === "bonus") {
      return (equip.bonuses?.length ? equip.bonuses : (equip.bonus ? [equip.bonus] : []))
        .reduce((total, bonus) => total + (bonus.malus ? -1 : 1) * (bonus.value ?? 0), 0);
    }
    return equip[stat] ?? 0;
  }

  delta(stat: "level" | "attack" | "defense" | "velocita" | "bonus"): string {
    const p = this.statValue(this.previewEquip, stat);
    const c = this.statValue(this.currentEquip, stat);
    const d = p - c;
    if (d === 0) return "+/-0";
    return (d > 0 ? "+" : "") + d.toString();
  }

  deltaClass(stat: "level" | "attack" | "defense" | "velocita" | "bonus") {
    const p = this.statValue(this.previewEquip, stat);
    const c = this.statValue(this.currentEquip, stat);
    const d = p - c;
    if (d > 0) return "positive";
    if (d < 0) return "negative";
    return "";
  }
}
