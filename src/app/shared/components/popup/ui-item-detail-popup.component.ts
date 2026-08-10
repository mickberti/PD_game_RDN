import { CommonModule } from "@angular/common";
import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject } from "@angular/core";
import { BonusItem, ChestItem, CHEST_TYPES, ComponentEffect, EquipItem, FrameItem, HeroItem, PriceItem, RESOURCE_TYPES, ResourceItem } from "../../../core/models/game.models";
import { HeroProgressService } from "../../../core/services/progression/hero-progress.service";
import { InventoryMutationService } from "../../../core/services/inventory/inventory-mutation.service";
import { GameStateService } from "../../../core/services/state/game-state.service";
import { GameUtilsService } from "../../../core/services/ui/formatting/game-utils.service";
import { LevelUpgradeCost } from "../../../core/services/progression/level-progression.service";
import { UIPanelComponent } from "../../basic/ui-panel.component";
import { UiSpriteComponent } from "../../basic/ui-sprite.component";
import { UIButtonSpriteComponent } from "../../basic/ui-button-sprite.component";
import { defaultFrame } from "../../../core/models/mock/fantasy/utils-data";
import { createHeroExperienceProgress, createHeroFatigueProgress, createHeroHealProgress, createHeroManaProgress, recalculateHeroProgression } from "../../../core/services/progression/level-progression.service";
import { UIProgressStatItem, UIProgressStatsComponent } from "../../basic/ui-progress-stats.component";
import { UIPillComponent } from "../../basic/ui-pill.component";
import { UIPreviewAttributesComponent } from "../ui-preview-attributes.component";
import { UIPreviewStatItem, UIPreviewStatsComponent } from "../ui-preview-stats.component";
import { LoggerService } from "src/app/core/services/infrastructure/logging/logger.service";

@Component({
  selector: "ui-item-detail-popup",
  standalone: true,
  imports: [CommonModule, UIPanelComponent, UiSpriteComponent, UIButtonSpriteComponent, UIProgressStatsComponent, UIPillComponent, UIPreviewAttributesComponent, UIPreviewStatsComponent],
  template: `
    <ui-panel [variant]="'light'">
      <div class="equip-preview"> 
        <div class="equip-preview-title-row">
          <div class="equip-preview-title">Dettaglio oggetto</div>
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
              <ui-sprite [frame]="item?.frame ?? defaultFrame"></ui-sprite>
            </div>
            <div class="name">{{ title() }}</div>
            <div class="description">{{ description() }}</div>

            <ul class="stats" *ngIf="heroItem() as hero">
			  <ui-preview-attributes
			    direction="horizontal"
			    [level]=" hero.level"
			    [attack]="hero.attack ?? 0"
			    [defense]="hero.defense ?? 0"
			    [speed]="hero.velocita  ?? 0"
			    ariaLabel="Attributi equip attuale"
			  />
              <li class="stats-progress"><ui-progress-stats [items]="heroProgressStats(hero)" ariaLabel="Progressi eroe" /></li>
			  <li><ui-preview-stats direction="horizontal" [items]="heroAttributeStats(hero)" ariaLabel="Statistiche eroe" /></li>
              @if (showUpgrade && heroUpgradeCost(hero); as cost) {
                <li><strong>Prossimo livello:</strong> {{ cost.targetLevel }}</li>
                <li><strong>Costo upgrade:</strong> {{ upgradeCostLabel(cost) }}</li>
              }
              <li class="hero-rest-card">
                <strong>Riposo fatica</strong>
                <span>{{ heroFatigueStatus(hero) }}</span>
                @if ((hero.fatigue?.current ?? 0) > 0) {
                  <span>{{ heroFatigueRestActionLabel(hero) }}</span>
                }
              </li>
            </ul>

            <ul class="stats" *ngIf="equipItem() as equip">
			  <ui-preview-attributes
			    direction="horizontal"
			    [level]=" equip.level"
			    [attack]="equip.attack"
			    [defense]="equip.defense"
			    [speed]="equip.velocita"
			    ariaLabel="Attributi equip attuale"
			  />
              <li class="stats-progress"><ui-progress-stats [items]="equipProgressStats(equip)" ariaLabel="Progressi equip" /></li>
			  <li><ui-preview-stats direction="horizontal" [items]="[{label: 'Bonus', value: equipBonusLabel(equip)}]" ariaLabel="Bonus anteprima equip" /></li>
              @if (showUpgrade && equipUpgradeCost(equip); as cost) {
                <li><strong>Prossimo livello:</strong> {{ cost.targetLevel }}</li>
                <li><strong>Costo upgrade:</strong> {{ upgradeCostLabel(cost) }}</li>
              }
              
            </ul>
          </div>
        </section>

        @if (showUpgrade && upgradeFeedback) {
          <div class="upgrade-feedback" role="status" aria-live="polite">{{ upgradeFeedback }}</div>
        }

        @if (actionDisabled && actionDisabledReason) {
          <div class="action-disabled-reason" role="status" aria-live="polite">{{ actionDisabledReason }}</div>
        }

        <footer class="actions">
          @if (repairPrice(); as repairCost) {
            <div class="action-icon-stack">
              <ui-button-sprite
                [frame]="actionFrame('repair')"
                [size]="'sm'"
                [disabled]="!canRepairEquip()"
                ariaLabel="Ripara oggetto"
                (pressed)="repairEquip()"
              />
              <ui-pill [frame]="repairCost.frame" size="sm" [value]="repairCost.amount" />
            </div>
          }
          @if (showUpgrade && levelUpgradeLabel()) {
            <div class="action-icon-stack">
              <ui-button-sprite
                [frame]="actionFrame('upgrade')"
                [size]="'sm'"
                [disabled]="!canLevelUpgrade()"
                ariaLabel="Upgrade oggetto"
                (pressed)="upgradeLevel()"
              />
              @if (upgradePrice(); as price) {
                <ui-pill [frame]="price.frame" size="sm" [value]="price.amount" />
              }
            </div>
          }
          @if (heroItem(); as hero) {
            @if ((hero.fatigue?.current ?? 0) > 0) {
              <div class="action-icon-stack">
                <ui-button-sprite
                  [frame]="{ name: 'weight', effect: 'fx-shadow' }"
                  [size]="'sm'"
                  [disabled]="!canRecoverHeroFatigueForFreeFromPopup(hero) && !canRecoverHeroFatigueFromPopup(hero)"
                  [ariaLabel]="canRecoverHeroFatigueForFreeFromPopup(hero) ? 'Ripristina gratuitamente la fatica' : 'Ripristina subito la fatica'"
                  (pressed)="recoverHeroFatigueFromPopup()"
                />
                @if (!canRecoverHeroFatigueForFreeFromPopup(hero)) {
                  <ui-pill [frame]="heroProgress.heroFatigueRecoveryPrice(hero).frame" size="sm" [value]="formattedPriceAmount(heroProgress.heroFatigueRecoveryPrice(hero).amount)" />
                }
              </div>
            }
          }
          @if (actionLabel) {
            <div class="action-icon-stack">
              <ui-button-sprite
                [frame]="actionFrame('primary')"
                [size]="'sm'"
                [disabled]="actionDisabled"
                [ariaLabel]="actionLabel"
                (pressed)="onAction?.(item)"
              />
              @if (actionPrice) {
                <ui-pill [frame]="actionPrice.frame" size="sm" [value]="formattedPriceAmount(actionPrice.amount)" />
              }
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

    .action-disabled-reason {
      margin-top: 10px;
      text-align: center;
      font-weight: 700;
      color: #9a3412;
    }

    .upgrade-feedback {
      margin-top: 10px;
      text-align: center;
      font-weight: 700;
      color: #1aa34a;
    }

    .hero-rest-card {
      display: grid;
      gap: 4px;
      padding: 8px 10px;
      border-radius: 10px;
      background: rgba(30, 20, 16, 0.45);
      border: 1px solid rgba(255, 243, 196, 0.18);
    }

    .hero-rest-action {
      width: 100%;
    }
  `],
})
export class UIItemDetailPopupComponent implements OnChanges, OnDestroy {
  private readonly gameState = inject(GameStateService);
  readonly heroProgress = inject(HeroProgressService);
  private readonly inventoryMutations = inject(InventoryMutationService);
  private readonly utils = inject(GameUtilsService);
  private readonly logger = inject(LoggerService);
  @Input() item: EquipItem | HeroItem | ResourceItem | ChestItem | null = null;
  @Input() actionLabel?: string;
  @Input() actionPrice?: PriceItem | null;
  @Input() actionDisabled = false;
  @Input() actionDisabledReason?: string | null;
  @Input() showUpgrade = true;
  @Input() onAction?: (item: EquipItem | HeroItem | ResourceItem | ChestItem | null) => void;
  @Input() onDismiss?: (data?: any) => void;
  defaultFrame: FrameItem = defaultFrame;
  upgradeFeedback = "";
  private readonly nowTimer = window.setInterval(() => {
    this.now = Date.now();
  }, 1000);
  now = Date.now();

  ngOnDestroy(): void {
    clearInterval(this.nowTimer);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes["item"] || !this.isHero(this.item)) {
      return;
    }

    this.item = this.heroProgress.ensureHeroFatigueRestTimer(this.item);
  }

  isEquip(value: EquipItem | HeroItem | ResourceItem | ChestItem | null | undefined): value is EquipItem {
	//this.logger.logDebug('[UIItemDetailPopupComponent] isEquip',(!!value && "attack" in value && "defense" in value),value);
    return value?.itemType === "equip";
  }

  isHero(value: EquipItem | HeroItem | ResourceItem | ChestItem | null | undefined): value is HeroItem {
	//this.logger.logDebug('[UIItemDetailPopupComponent] isHero',(!!value && "stats" in value && Array.isArray(value.stats)),value);
    return value?.itemType === "hero";
  }

  isResource(value: EquipItem | HeroItem | ResourceItem | ChestItem | null | undefined): value is ResourceItem {
    return value?.itemType === "resource";
  }

  isChest(value: EquipItem | HeroItem | ResourceItem | ChestItem | null | undefined): value is ChestItem {
    return value?.itemType === "chest";
  }

  title(): string {
    const value = this.item;
    if (this.isHero(value)) return value.title;
    if (this.isEquip(value) || this.isResource(value) || this.isChest(value)) return value.name;
    return "Oggetto";
  }
  heroItem(): HeroItem | null {
    const value = this.item;
    return this.isHero(value) ? recalculateHeroProgression(value) : null;
  }

  equipItem(): EquipItem | null {
    const value = this.item;
    return this.isEquip(value) ? value : null;
  }

  description(): string {
    const value = this.item;
    if (this.isHero(value)) return value.description;
    if (this.isEquip(value)) return value.effect;
    if (this.isResource(value)) return value.description;
    if (this.isChest(value)) return `Chest: ${value.type.title}`;
    return "Nessuna descrizione disponibile";
  }

  heroProgressStats(hero: HeroItem): UIProgressStatItem[] {
    return [
      { label: "Heal", progress: hero.heal ?? createHeroHealProgress(hero.level, hero.mastery, hero.variant), kind: "heal" },
      { label: "Mana", progress: hero.mana ?? createHeroManaProgress(hero.level, hero.mastery, hero.variant), kind: "mana" },
      { label: "Fat", progress: hero.fatigue ?? createHeroFatigueProgress(hero.level, hero.mastery, hero.variant), kind: "fatigue" },
      { label: "Exp", progress: hero.experience ?? createHeroExperienceProgress(hero.level), kind: "experience" },
    ];
  }

  heroFatigueCountdown(hero: HeroItem): string {
    const remainingMs = this.heroProgress.getHeroFatigueRecoveryRemainingMs(hero, this.now);
    if (remainingMs <= 0) {
      return "Recupero completato";
    }

    const totalSeconds = Math.ceil(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  hasHeroFatigueRest(hero: HeroItem): boolean {
    return (hero.fatigue?.current ?? 0) > 0 && !!hero.fatigueRest?.endsAt;
  }

  heroFatigueRestActionLabel(hero: HeroItem): string {
    return this.canRecoverHeroFatigueForFreeFromPopup(hero)
      ? "Recupera gratis"
      : `Countdown: ${this.heroFatigueCountdown(hero)}`;
  }

  heroFatigueStatus(hero: HeroItem): string {
    const fatigue = Math.max(0, Math.round(hero.fatigue?.current ?? 0));
    const total = Math.max(1, Math.round(hero.fatigue?.total ?? 1));
    if (fatigue <= 0) {
      return "Stanchezza recuperata";
    }
    if (fatigue >= total) {
      return "Eroe esausto: attendi il riposo o paga il recupero";
    }
    return `Stanchezza residua ${fatigue}/${total}`;
  }

  canRecoverHeroFatigueFromPopup(hero: HeroItem): boolean {
    return (hero.fatigue?.current ?? 0) > 0 && this.heroProgress.canRecoverHeroFatigue(hero);
  }

  canRecoverHeroFatigueForFreeFromPopup(hero: HeroItem): boolean {
    return this.heroProgress.canRecoverHeroFatigueForFree(hero, this.now);
  }

  recoverHeroFatigueForFreeFromPopup(): void {
    const hero = this.heroItem();
    if (!hero || !this.heroProgress.recoverHeroFatigueForFreeAfterRest(hero, this.now)) {
      return;
    }

    const recoveredHero = this.gameState.inventoryHeroes().find((item) => item.id === hero.id) ?? hero;
    this.refreshPopupItem(recoveredHero);
    this.upgradeFeedback = `Fatica ripristinata gratuitamente per ${recoveredHero.title}`;
  }

  recoverHeroFatigueFromPopup(): void {
    const hero = this.heroItem();
    if (!hero) {
      return;
    }

    const recoveredForFree = this.canRecoverHeroFatigueForFreeFromPopup(hero);
    const recovered = recoveredForFree
      ? this.heroProgress.recoverHeroFatigueForFreeAfterRest(hero, this.now)
      : this.heroProgress.recoverHeroFatigueWithPayment(hero);
    if (!recovered) return;

    const recoveredHero = this.gameState.inventoryHeroes().find((item) => item.id === hero.id) ?? hero;
    this.refreshPopupItem(recoveredHero);
    this.upgradeFeedback = recoveredForFree
      ? `Fatica ripristinata gratuitamente per ${recoveredHero.title}`
      : `Fatica ripristinata per ${recoveredHero.title}`;
  }

  equipProgressStats(equip: EquipItem): UIProgressStatItem[] {
    return [
      { label: "Exp", progress: equip.experience, kind: "experience" },
      { label: "Dur", progress: equip.duration, kind: "duration" },
    ];
  }

  heroAttributeStats(hero: HeroItem): UIPreviewStatItem[] {
    return hero.stats.map((stat) => ({
      label: stat.title,
      frame: stat.frame,
      value: `${stat.progress.current}/${stat.progress.total}`,
    }));
  }

  bonusLabel(bonus: BonusItem | null | undefined): string {
	this.logger.logDebug('[UIItemDetailPopupComponent] bonusLabel',bonus);
    if (!bonus || bonus.type === "none" || !bonus.value) return "Nessuno";

    const sign = bonus.malus ? "-" : "+";
    return `${bonus.type} ${sign}${bonus.value}`;
  }

  equipBonusLabel(equip: EquipItem | null | undefined): string {
    const bonuses = equip?.bonuses?.length ? equip.bonuses : (equip?.bonus ? [equip.bonus] : []);
    const activeBonuses = bonuses.filter((bonus) => bonus.type !== "none" && bonus.value);
    if (!activeBonuses.length) return "Nessuno";

    return activeBonuses.map((bonus) => this.bonusLabel(bonus)).join(" · ");
  }

  heroUpgradeCost(hero: HeroItem): LevelUpgradeCost {
    return this.heroProgress.heroUpgradeCost(hero);
  }

  equipUpgradeCost(equip: EquipItem): LevelUpgradeCost {
    return this.heroProgress.equipUpgradeCost(equip);
  }

  repairPrice(): PriceItem | null {
    const equip = this.equipItem();
    if (!equip || equip.duration.current > 0) return null;
    return this.inventoryMutations.equipRepairPrice(equip);
  }

  canRepairEquip(): boolean {
    const equip = this.equipItem();
    return !!equip && this.inventoryMutations.canRepairEquip(equip);
  }

  canLevelUpgrade(): boolean {
    const hero = this.heroItem();
    if (hero) return this.heroProgress.canUpgradeHeroLevel(hero);

    const equip = this.equipItem();
    if (equip) return this.heroProgress.canUpgradeEquipLevel(equip);

    return false;
  }

  levelUpgradeLabel(): string | null {
    const hero = this.heroItem();
    if (hero) return `Upgrade Lv ${this.heroUpgradeCost(hero).targetLevel}`;

    const equip = this.equipItem();
    if (equip) return `Upgrade Lv ${this.equipUpgradeCost(equip).targetLevel}`;

    return null;
  }

  upgradePrice(): PriceItem | null {
    const hero = this.heroItem();
    if (hero) return this.priceFromUpgradeCost(this.heroUpgradeCost(hero));

    const equip = this.equipItem();
    if (equip) return this.priceFromUpgradeCost(this.equipUpgradeCost(equip));

    return null;
  }

  formattedPriceAmount(value: number): string {
    return this.utils.formatCompactNumber(value);
  }

  actionFrame(kind: "repair" | "upgrade" | "primary"): FrameItem {
    if (kind === "repair") {
      return { name: "anvil", effect: "none" };
    }

    if (kind === "upgrade") {
      return { name: "icon-arrow-up", effect: "fx-power-glow" as ComponentEffect };
    }

    if (this.isHero(this.item)) {
      return { name: "icon-hero-avatar", effect: "none" };
    }

    if (this.isEquip(this.item)) {
      return { name: "icon-sword-shield", effect: "none" };
    }

    if (this.isChest(this.item)) {
      return { name: "chest", effect: "none" };
    }

    return { name: "scroll", effect: "none" };
  }

  upgradeCostLabel(cost: LevelUpgradeCost): string {
    if (cost.coin) return `${cost.coin.amount} monete`;
    if (cost.resource) return `${cost.resource.amount}x ${cost.resource.item.name}`;
    return "Gratis";
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

  private refreshPopupItem(item: HeroItem | EquipItem): void {
    this.item = item;
  }

  private heroUpgradeFeedback(before: HeroItem, after: HeroItem): string {
    const parts = [
      `Lv ${before.level}→${after.level}`,
      this.statDeltaLabel("Att", before.attack ?? 0, after.attack ?? 0),
      this.statDeltaLabel("Dif", before.defense ?? 0, after.defense ?? 0),
      this.statDeltaLabel("Vel", before.velocita ?? 0, after.velocita ?? 0),
    ].filter(Boolean);

    return `Upgrade ottenuto: ${parts.join(" · ")}`;
  }

  private equipUpgradeFeedback(before: EquipItem, after: EquipItem): string {
    const parts = [
      `Lv ${before.level}→${after.level}`,
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

  repairEquip(): void {
    const equip = this.equipItem();
    if (!equip) return;

    if (this.inventoryMutations.repairEquip(equip)) {
      const repairedEquip = this.gameState.inventoryEquip().find((item) => item.id === equip.id) ?? equip;
      this.refreshPopupItem(repairedEquip);
      this.upgradeFeedback = `Riparato: Dur ${equip.duration.current}→${repairedEquip.duration.current}`;
    }
  }

  upgradeLevel(): void {
    const hero = this.heroItem();
    if (hero) {
      if (this.heroProgress.upgradeHeroLevel(hero)) {
        const upgradedHero = this.gameState.inventoryHeroes().find((item) => item.id === hero.id) ?? hero;
        this.refreshPopupItem(upgradedHero);
        this.upgradeFeedback = this.heroUpgradeFeedback(hero, upgradedHero);
      }
      return;
    }

    const equip = this.equipItem();
    if (equip && this.heroProgress.upgradeEquipLevel(equip)) {
      const upgradedEquip = this.gameState.inventoryEquip().find((item) => item.id === equip.id) ?? equip;
      this.refreshPopupItem(upgradedEquip);
      this.upgradeFeedback = this.equipUpgradeFeedback(equip, upgradedEquip);
    }
  }
}
