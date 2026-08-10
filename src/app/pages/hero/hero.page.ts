import { CommonModule } from "@angular/common";
import { Component, computed, effect, inject, signal } from "@angular/core";
import { ActivatedRoute, ParamMap, Router } from "@angular/router";
import {
  IonContent,
  IonFooter,
  IonHeader,
  IonToolbar,
  PopoverController,
} from "@ionic/angular/standalone";

import { EquipItem, FrameItem, HeroAttribute, HeroItem, IconItem, PriceItem, UiTabItem,  } from "../../core/models/game.models";
import {
  defaultIcon,
  defaultLevelRange,
  defaultMasteryRange,
} from "../../core/models/mock/fantasy/utils-data";
import { GameStateService } from "../../core/services/state/game-state.service";
import { HeroProgressService } from "../../core/services/progression/hero-progress.service";
import { InventoryMutationService } from "../../core/services/inventory/inventory-mutation.service";
import { CatalogSelectorService } from "../../core/services/catalog/catalog-selector.service";
import { UIActionFeedbackOverlayComponent } from "src/app/shared/components/ui-action-feedback-overlay.component";
import { UIBottomNavComponent } from "src/app/shared/components/ui-bottom-nav.component";
import { UIHeaderComponent } from "src/app/shared/components/ui-header.component";
import { UIHeroPreviewComponent } from "src/app/shared/components/ui-hero-preview.component";
import { UIEquipChestComponent } from "src/app/shared/components/box/ui-equip-box.component";
import { UIUpgradeChestComponent } from "src/app/shared/components/box/ui-upgrade-box.component";
import { UIConfirmActionPopupComponent } from "src/app/shared/components/popup/ui-confirm-action-popup.component";
import { UIEquipComparePopupComponent } from "src/app/shared/components/popup/ui-equip-compare-popup.component";
import { UIEquipFilterPopupComponent } from "src/app/shared/components/popup/ui-equip-filter-popup.component";
import { UIHeroStatDetailPopupComponent } from "src/app/shared/components/popup/ui-hero-stat-detail-popup.component";
import { UIItemDetailPopupComponent } from "src/app/shared/components/popup/ui-item-detail-popup.component";
import { UiContentTabsComponent } from "../../shared/basic/ui-content-tabs.component";
import { LoggerService } from "../../core/services/infrastructure/logging/logger.service";

export type HeroUpgradeContentView = {
  page: "stat" | "equip";
  type?: string;
};

@Component({
  selector: "app-hero",
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    UIHeaderComponent,
    IonFooter,
    UIBottomNavComponent,
    UIHeroPreviewComponent,
    UIUpgradeChestComponent,
    UIActionFeedbackOverlayComponent,
    UIEquipChestComponent,
    UIConfirmActionPopupComponent,
    UiContentTabsComponent,
  ],
  template: ` <ion-header>
      <ion-toolbar>
        <ui-header title="Hero Upgrade" backPath="/hero"></ui-header>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="screen upgrade-screen hero-upgrade-layout">
        <section>
          @if (currentHero(); as hero) {
            <ui-hero-preview
              [hero]="hero"
              (phero)="previousHero()"
              (nhero)="nextHero()"
              (contentViewChange)="setContentView($event)"
              (upgrade)="requestHeroLevelUpgrade()"
              (heal)="requestHeroHeal()"
              (recoverFatigue)="requestHeroFatigueRecovery()"
            />
          }
        </section>

        <ui-content-tabs
          [tabs]="horizontalTabs()"
          [selected]="selectedType()"
          (selectedChange)="changeType($event)"
        />

        @if (contentView() === "stat") {
          @if (currentHero(); as hero) {
            <section class="upgrade-card">
              @for (stat of hero.stats; track stat.id) {
                <ui-upgrade-box
                  [hero]="hero"
                  [item]="stat"
                  (pressed)="openStatDetail(hero, stat)"
                ></ui-upgrade-box>
              }
            </section>
          }
        } @else {
          <section class="hero-upgrade-equip-panel">
            <div class="hero-equip-list">
              @for (equip of filteredEquip(); track equip.id) {
                <ui-equip-box
                  [item]="equip"
                  [isSelectedEquip]="equip.id === selectedEquip().id"
                  [isDeleteMode]="isDeleteMode()"
                  (balance)="preview(equip)"
                  (delete)="confirmDeleteEquip.set(equip)"
                />
              }
            </div>
          </section>
        }

        <ui-action-feedback-overlay
          [open]="!!actionFeedback()"
          [frame]="actionFeedback()?.frame"
          [text]="actionFeedback()?.text ?? ''"
          [variant]="actionFeedback()?.variant ?? 'gain'"
          [duration]="2500"
          ariaLabel="Feedback aggiornamento eroe"
          (closed)="actionFeedback.set(null)"
        />

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

        @if (confirmHeroHeal(); as hero) {
          <ui-confirm-action-popup
            [open]="true"
            [text]="heroHealConfirmText(hero)"
            [frame]="hero.frame"
            [price]="heroProgress.heroHealPrice(hero)"
            pricePrefix="Costo"
            confirmLabel="Cura"
            ariaLabel="Conferma cura eroe"
            (cancel)="confirmHeroHeal.set(null)"
            (confirm)="healHero()"
          />
        }

        @if (confirmHeroFatigueRecovery(); as hero) {
          <ui-confirm-action-popup
            [open]="true"
            [text]="heroFatigueRecoveryConfirmText(hero)"
            [frame]="hero.frame"
            [price]="canRecoverHeroFatigueForFree(hero) ? null : heroProgress.heroFatigueRecoveryPrice(hero)"
            pricePrefix="Costo"
            [confirmLabel]="canRecoverHeroFatigueForFree(hero) ? 'Recupera gratis' : 'Ripristina fatica'"
            ariaLabel="Conferma ripristino fatica eroe"
            (cancel)="confirmHeroFatigueRecovery.set(null)"
            (confirm)="recoverHeroFatigue()"
          />
        }

        @if (confirmDeleteEquip(); as equip) {
          <ui-confirm-action-popup
            [open]="true"
            [text]="deleteEquipConfirmText(equip)"
            [frame]="equip.frame"
            [price]="inventoryMutations.inventoryItemRefundPrice(equip)"
            pricePrefix="Ricavi"
            confirmLabel="Elimina"
            ariaLabel="Conferma eliminazione equip"
            (cancel)="confirmDeleteEquip.set(null)"
            (confirm)="deleteEquip()"
          />
        }
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ui-bottom-nav />
      </ion-toolbar>
    </ion-footer>`,
})
export class HeroPage {
  readonly state = inject(GameStateService);
  readonly heroProgress = inject(HeroProgressService);
  readonly inventoryMutations = inject(InventoryMutationService);
  private readonly catalogSelectors = inject(CatalogSelectorService);
  private readonly popoverCtrl = inject(PopoverController);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly logger = inject(LoggerService);

  readonly currentHero = this.state.currentHero;
  readonly actionFeedback = signal<{
    frame?: FrameItem;
    text: string;
    variant: "gain" | "sell" | "collect" | "open";
  } | null>(null);
  readonly contentView = signal<"stat" | "equip">(
    this.normalizeContentView(this.route.snapshot.paramMap.get("view")),
  );
  readonly selectedType = signal<string>(
    this.normalizeEquipType(this.route.snapshot.paramMap.get("type")),
  );
  readonly previewItem = signal<EquipItem | null>(null);
  readonly confirmDeleteEquip = signal<EquipItem | null>(null);
  readonly confirmHeroLevelUpgrade = signal<HeroItem | null>(null);
  readonly confirmHeroHeal = signal<HeroItem | null>(null);
  readonly confirmHeroFatigueRecovery = signal<HeroItem | null>(null);
  readonly isDeleteMode = signal<boolean>(false);
  readonly activeMasteryRange = signal<{ lower: number; upper: number }>(
    defaultMasteryRange,
  );
  readonly activeLevelRange = signal<{ lower: number; upper: number }>(
    defaultLevelRange,
  );

  readonly heroList = this.state.inventoryHeroes;
  readonly equipList = this.state.inventoryEquip;
  readonly equipType = this.catalogSelectors.equipTypes;
  readonly selectedEquip = signal<EquipItem>(
    this.catalogSelectors.defaultEquip(),
  );
  readonly defaultIcon: IconItem = defaultIcon;

  readonly horizontalTabs = computed<UiTabItem[]>(() =>
    this.catalogSelectors.heroEquipTabs(),
  );

  readonly filteredEquip = computed(() => {
    /*
		const experience = this.activeMasteryRange();
		const level = this.activeLevelRange();

		return (this.equipList() ?? []).filter(
			(e) =>
				e.type?.id === this.selectedType() &&
				e.experience.current >= experience.lower &&
				e.experience.current <= experience.upper &&
				e.level >= level.lower &&
				e.level <= level.upper,
		);
		*/
    return this.equipList().filter((e) => e.type?.id === this.selectedType());
  });

  private readonly _autoCalc = effect(() => {
    this.calculateEquip();
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      this.applyRouteParams(params);
    });
  }

  previousHero(): void {
    const heroList = this.state.inventoryHeroes();
    const currentIndex = heroList.findIndex(
      (h) => h.id === this.currentHero()?.id,
    );
    const previousIndex =
      (currentIndex - 1 + heroList.length) % heroList.length;
    const previousHero = heroList[previousIndex] ?? heroList[0];
    if (previousHero) this.heroProgress.selectHero(previousHero);
  }

  nextHero(): void {
    const heroList = this.state.inventoryHeroes();
    const currentIndex = heroList.findIndex(
      (h) => h.id === this.currentHero()?.id,
    );
    const nextIndex = (currentIndex + 1) % heroList.length;
    const nextHero = heroList[nextIndex] ?? heroList[0];
    if (nextHero) this.heroProgress.selectHero(nextHero);
  }

  setContentView(view: HeroUpgradeContentView): void {
    const page = this.normalizeContentView(view.page);
    const type = this.normalizeEquipType(view.type ?? this.selectedType());

    this.contentView.set(page);
    if (page === "equip") {
      this.selectedType.set(type);
    }

    this.confirmDeleteEquip.set(null);
    this.confirmHeroLevelUpgrade.set(null);
    this.confirmHeroHeal.set(null);
    this.confirmHeroFatigueRecovery.set(null);
    this.previewItem.set(null);
    void this.router.navigate(this.buildHeroRoute(page, type), {
      replaceUrl: true,
    });
  }

  async openStatDetail(hero: HeroItem, stat: HeroAttribute): Promise<void> {
    let pop: HTMLIonPopoverElement | undefined;

    pop = await this.popoverCtrl.create({
      component: UIHeroStatDetailPopupComponent,
      componentProps: {
        hero,
        stat,
        onDismiss: (data?: any) => pop?.dismiss(data),
        onUpgraded: (upgradedStat: HeroAttribute) =>
          this.showStatUpgradeFeedback(upgradedStat),
      },
      translucent: true,
      cssClass: "equip-preview-popover",
    });

    await pop.present();
  }

  heroLevelUpgradePrice(hero: HeroItem): PriceItem | null {
    return this.priceFromUpgradeCost(this.heroProgress.heroUpgradeCost(hero));
  }

  heroLevelUpgradeConfirmText(hero: HeroItem): string {
    return `Vuoi portare ${hero.title} al livello ${this.heroProgress.heroUpgradeCost(hero).targetLevel}?`;
  }

  requestHeroLevelUpgrade(): void {
    const hero = this.currentHero();
    this.confirmHeroLevelUpgrade.set(hero);
  }

  heroHealConfirmText(hero: HeroItem): string {
    return `Vuoi curare ${hero.title} e ripristinare tutta la vita?`;
  }

  heroFatigueRecoveryConfirmText(hero: HeroItem): string {
    if (this.canRecoverHeroFatigueForFree(hero)) {
      return `Il riposo di ${hero.title} Ã¨ terminato. Vuoi ripristinare gratuitamente tutta la fatica?`;
    }

    const resolvedHero = this.heroProgress.resolveHeroFatigueRecovery(hero);
    return `Vuoi azzerare subito la fatica di ${resolvedHero.title}? Recupero automatico completo tra ${this.heroProgress.formatHeroFatigueRecoveryTime(resolvedHero)}.`;
  }

  canRecoverHeroFatigueForFree(hero: HeroItem): boolean {
    return this.heroProgress.canRecoverHeroFatigueForFree(hero);
  }

  requestHeroHeal(): void {
    const hero = this.currentHero();
    this.confirmHeroHeal.set(hero);
  }

  requestHeroFatigueRecovery(): void {
    const hero = this.currentHero();
    this.confirmHeroFatigueRecovery.set(
      hero ? this.heroProgress.ensureHeroFatigueRestTimer(hero) : null,
    );
  }

  healHero(): void {
    const hero = this.currentHero();
    if (!hero) return;

    if (!this.heroProgress.healHero(hero)) return;

    const healedHero = this.currentHero();
    this.confirmHeroHeal.set(null);
    this.actionFeedback.set({
      frame: healedHero?.frame ?? hero.frame,
      text: `Curato ${healedHero?.title ?? hero.title}`,
      variant: "gain",
    });
  }

  recoverHeroFatigue(): void {
    const hero = this.currentHero();
    if (!hero) return;

    const recoveredForFree = this.canRecoverHeroFatigueForFree(hero);
    const recovered = recoveredForFree
      ? this.heroProgress.recoverHeroFatigueForFreeAfterRest(hero)
      : this.heroProgress.recoverHeroFatigueWithPayment(hero);
    if (!recovered) return;

    const recoveredHero = this.currentHero();
    this.confirmHeroFatigueRecovery.set(null);
    this.actionFeedback.set({
      frame: recoveredHero?.frame ?? hero.frame,
      text: recoveredForFree
        ? `Fatica ripristinata gratuitamente per ${recoveredHero?.title ?? hero.title}`
        : `Fatica ripristinata per ${recoveredHero?.title ?? hero.title}`,
      variant: "gain",
    });
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

  calculateEquip(): void {
    const hero = this.currentHero();
    const type = this.selectedType();
    if (!hero || !Array.isArray(hero.equip)) {
      this.selectedEquip.set(this.catalogSelectors.defaultEquip());
      return;
    }

    const found = hero.equip.find((e) => e?.type?.id === type);
    this.selectedEquip.set(found ?? this.catalogSelectors.defaultEquip());
  }

  changeType(type: string): void {
    const normalizedType = this.normalizeEquipType(type);
    this.selectedType.set(normalizedType);
    this.previewItem.set(null);
    this.logger.logDebug("[HeroPage][changeType]", type, normalizedType);
    if (normalizedType === "stat") {
      void this.router.navigate(this.buildHeroRoute("stat"), {
        replaceUrl: true,
      });
    } else {
      void this.router.navigate(this.buildHeroRoute("equip", normalizedType), {
        replaceUrl: true,
      });
    }
  }

  async openFilterModal(): Promise<void> {
    let pop: HTMLIonPopoverElement | undefined;

    pop = await this.popoverCtrl.create({
      component: UIEquipFilterPopupComponent,
      componentProps: {
        experienceRange: this.activeMasteryRange(),
        levelRange: this.activeLevelRange(),
        onDismiss: (data?: any) => pop?.dismiss(data),
        onApply: (filters: {
          experience: { lower: number; upper: number };
          level: { lower: number; upper: number };
        }) => pop?.dismiss({ action: "apply", filters }),
      },
      translucent: true,
      cssClass: "equip-filter-popover",
    });

    await pop.present();

    const { data } = await pop.onWillDismiss();
    if (data?.action === "apply" && data.filters) {
      this.activeMasteryRange.set({ ...data.filters.experience });
      this.activeLevelRange.set({ ...data.filters.level });
    }
  }

  async preview(equip: EquipItem): Promise<void> {
    const selected = this.selectedEquip();
    const hasComparableEquip =
      selected.id !== this.catalogSelectors.defaultEquip().id;
    let pop: HTMLIonPopoverElement | undefined;
    const isBrokenEquip = !!equip.duration && equip.duration.current <= 0;

    if (!hasComparableEquip || equip.id === selected.id || isBrokenEquip) {
      pop = await this.popoverCtrl.create({
        component: UIItemDetailPopupComponent,
        componentProps: {
          item: equip,
          actionLabel: !hasComparableEquip && !isBrokenEquip ? "Equipaggia" : undefined,
          onAction: !hasComparableEquip && !isBrokenEquip
            ? (e: EquipItem | null) =>
                pop?.dismiss({ action: "equip", equip: e })
            : undefined,
          onDismiss: (d?: any) => pop?.dismiss(d),
        },
        translucent: true,
        cssClass: "equip-preview-popover",
      });

      await pop.present();

      const { data } = await pop.onWillDismiss();
      if (data?.action === "equip" && data.equip) {
        this.applayEquip(data.equip as EquipItem);
      }
      return;
    }

    pop = await this.popoverCtrl.create({
      component: UIEquipComparePopupComponent,
      componentProps: {
        previewEquip: equip,
        currentEquip: selected,
        onEquip: (e: EquipItem | null) =>
          pop?.dismiss({ action: "equip", equip: e }),
        onDismiss: (d?: any) => pop?.dismiss(d),
      },
      translucent: true,
      cssClass: "equip-preview-popover",
    });

    await pop.present();

    const { data } = await pop.onWillDismiss();
    if (data?.action === "equip" && data.equip) {
      this.applayEquip(data.equip as EquipItem);
    }
  }

  deleteEquipConfirmText(equip: EquipItem): string {
    return `Vuoi davvero eliminare ${equip.name} dall'inventario?`;
  }

  deleteEquipMode(): void {
    this.isDeleteMode.update((v) => !v);
    this.confirmDeleteEquip.set(null);
    this.previewItem.set(null);
  }

  deleteEquip(): void {
    const equip = this.confirmDeleteEquip();
    if (!equip) return;

    this.inventoryMutations.deleteInventoryEquipWithRefund(equip.id);
    this.actionFeedback.set({
      frame: equip.frame,
      text: "Eliminato",
      variant: "sell",
    });

    this.confirmDeleteEquip.set(null);
    this.previewItem.set(null);
  }

  applayEquip(equip: EquipItem): void {
    const typeId = this.selectedType();
    const hero = this.currentHero();
    if (!hero) return;

    this.heroProgress.equipHero(hero, equip, typeId);
    this.calculateEquip();

    this.previewItem.set(null);
    this.confirmDeleteEquip.set(null);

    this.actionFeedback.set({
      frame: equip.frame,
      text: "Equipaggiato",
      variant: "gain",
    });
  }

  trackById(index: number, item: any): string | number {
    return item?.id ?? index;
  }

  private showStatUpgradeFeedback(stat: HeroAttribute): void {
    this.actionFeedback.set({
      frame: stat.frame,
      text: `Level up ${stat.title} ${stat.progress.current}`,
      variant: "gain",
    });
  }

  private priceFromUpgradeCost(
    cost: ReturnType<HeroProgressService["heroUpgradeCost"]>,
  ): PriceItem | null {
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

  private applyRouteParams(params: ParamMap): void {
    const view = this.normalizeContentView(params.get("view"));
    const type = this.normalizeEquipType(params.get("type"));

    if (type === "stat") {
      this.contentView.set(type);
      this.selectedType.set(type);
      return;
    }
    this.contentView.set(view);
    if (view === "equip") {
      this.selectedType.set(type);
    }
  }

  private buildHeroRoute(view: "stat" | "equip", type: string = ""): string[] {
    return view === "equip" ? ["/hero", view, type] : ["/hero", view];
  }

  private normalizeContentView(view: string | null): "stat" | "equip" {
    return view === "equip" ? "equip" : "stat";
  }

  private normalizeEquipType(type: string | null | undefined): string {
    if (!type) return "stat";
    if (type === "stat") {
      return "stat";
    }
    if (type === "delete") {
      return "delete";
    }
    return this.catalogSelectors.normalizeEquipType(type);
  }
}
