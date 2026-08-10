import { Component, computed, effect, inject, signal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  IonContent,
  IonFooter,
  IonHeader,
  IonToolbar,
  PopoverController,
} from "@ionic/angular/standalone";
import { GameStateService } from "../../core/services/state/game-state.service";
import { HeroProgressService } from "../../core/services/progression/hero-progress.service";
import { InventoryMutationService } from "../../core/services/inventory/inventory-mutation.service";
import { CatalogSelectorService } from "../../core/services/catalog/catalog-selector.service";
import { EquipItem, FrameItem, IconItem,  } from "../../core/models/game.models";
import { UIHeaderComponent } from "src/app/shared/components/ui-header.component";
import { UIBottomNavComponent } from "src/app/shared/components/ui-bottom-nav.component";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { UiSpriteComponent } from "src/app/shared/basic/ui-sprite.component";
import { UIButtonComponent } from "src/app/shared/basic/ui-button.component";
import { UIHeroBAnnerComponent } from "../../shared/components/ui-hero-banner.component";
import { UIEquipFilterPopupComponent } from "src/app/shared/components/popup/ui-equip-filter-popup.component";
import { CommonModule } from "@angular/common";
import { UIEquipChestComponent } from "../../shared/components/box/ui-equip-box.component";
import {
  defaultIcon,
  defaultLevelRange,
  defaultMasteryRange,
} from "../../core/models/mock/fantasy/utils-data";
import { UIBandComponent } from "../../shared/basic/ui-band.component";
import { UIButtonSpriteComponent } from "../../shared/basic/ui-button-sprite.component";
import { UIHeroEquipComponent } from "../../shared/components/ui-hero-equip.component";
import { UIEquipComparePopupComponent } from "src/app/shared/components/popup/ui-equip-compare-popup.component";
import { UIConfirmActionPopupComponent } from "src/app/shared/components/popup/ui-confirm-action-popup.component";
import { UIItemDetailPopupComponent } from "src/app/shared/components/popup/ui-item-detail-popup.component";
import { UIActionFeedbackOverlayComponent } from "src/app/shared/components/ui-action-feedback-overlay.component";
import { FloatingNavigationService } from "../../core/services/app/navigation/floating-navigation.service";

@Component({
  selector: "app-hero-equip",
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonFooter,
    UIHeaderComponent,
    UIBottomNavComponent,
    UiSpriteComponent,
    UIButtonComponent,
    UIHeroBAnnerComponent,
    CommonModule,
    UIEquipChestComponent,
    UIBandComponent,
    UIButtonSpriteComponent,
    UIHeroEquipComponent,
    UIConfirmActionPopupComponent,
    UIActionFeedbackOverlayComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ui-header title="Equipaggiamento" backPath="/hero-upgrade"></ui-header>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="screen equip-screen">
        <ui-hero-banner
          [navigation]="true"
          (phero)="previousHero()"
          (nhero)="nextHero()"
        ></ui-hero-banner>

        <ui-hero-equip [equip]="selectedEquip()" [variant]="'light'" />
        @if (canUpgradeSelectedEquip()) {
          <ui-button variant="primary" (pressed)="upgradeSelectedEquip()"
            >Upgrade livello equip</ui-button
          >
        }

        <ui-band variant="primary">
          <div class="equip-filters">
            <div>
              Filtri (XP {{ activeMasteryRange().lower }}-{{
                activeMasteryRange().upper
              }}
              · L {{ activeLevelRange().lower }}-{{ activeLevelRange().upper }})
            </div>
            <ui-button-sprite
              [frame]="{ name: 'icon-filter', effect: 'none' }"
              (pressed)="openFilterModal()"
            />
            <ui-button-sprite
              [frame]="{
                name: isDeleteMode() ? 'icon-confirm' : 'icon-cancel',
                effect: 'none',
              }"
              (pressed)="deleteEquipMode()"
            />
          </div>
        </ui-band>

        <div class="equip-body">
          <aside class="equip-types">
            <ui-button
              *ngFor="let type of equipType(); trackBy: trackById"
              variant="primary"
              styleClass="button-equip-types"
              [active]="selectedType() === type.id"
              size="sm"
              (pressed)="changeType(type.id)"
            >
              <div class="equip-types-sprite">
                <ui-sprite
                  [frame]="{ name: type.frameName, effect: 'none' }"
                ></ui-sprite>
              </div>
            </ui-button>
          </aside>

          <div class="equip-list">
            @for (equip of filteredEquip(); track equip.id) {
              <ui-equip-box
                [item]="equip"
                [isSelectedEquip]="equip.id === selectedEquip().id"
                [isDeleteMode]="isDeleteMode()"
                (assign)="confirmAssingEquip.set(equip)"
                (balance)="preview(equip)"
                (delete)="confirmDeleteEquip.set(equip)"
              />
            }
          </div>
        </div>

        <div *ngIf="confirmAssingEquip()" class="modal-backdrop">
          <section class="modal">
            <div class="modal-title-row">
              <h2>
                Do you really want to ({{ confirmAssingEquip()?.name }}) this
                Hero?
              </h2>
              <ui-button-sprite
                class="popup-close-button"
                styleClass="popup-close-button"
                size="sm"
                [frame]="{ name: 'icon-close-large', effect: 'none' }"
                (pressed)="confirmAssingEquip.set(null)"
                ariaLabel="Chiudi popup"
              />
            </div>
            <div class="modal-action">
              <ui-button variant="primary" (pressed)="applayEquip()"
                >Upgrade</ui-button
              >
            </div>
          </section>
        </div>

        <ui-action-feedback-overlay
          [open]="!!actionFeedback()"
          [frame]="actionFeedback()?.frame"
          [text]="actionFeedback()?.text ?? ''"
          [variant]="actionFeedback()?.variant ?? 'sell'"
          [duration]="2500"
          ariaLabel="Equipaggiamento eliminato"
          (closed)="actionFeedback.set(null)"
        />

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
        <ui-bottom-nav></ui-bottom-nav>
      </ion-toolbar>
    </ion-footer>
  `,
})
export class HeroEquipPage {
  // services
  private popoverCtrl = inject(PopoverController);
  readonly state = inject(GameStateService);
  private readonly heroProgress = inject(HeroProgressService);
  readonly inventoryMutations = inject(InventoryMutationService);
  private readonly catalogSelectors = inject(CatalogSelectorService);
  private nav = inject(AppNavigationService);
  private route = inject(ActivatedRoute);
  readonly floating = inject(FloatingNavigationService);

  // signals
  readonly selectedType = signal<string>(this.nav.getParam("type") ?? "weapon");
  readonly previewItem = signal<EquipItem | null>(null);
  readonly confirmAssingEquip = signal<EquipItem | null>(null);
  readonly confirmDeleteEquip = signal<EquipItem | null>(null);
  readonly isDeleteMode = signal<boolean>(false);
  readonly activeMasteryRange = signal<{ lower: number; upper: number }>(
    defaultMasteryRange,
  );
  readonly activeLevelRange = signal<{ lower: number; upper: number }>(
    defaultLevelRange,
  );
  readonly actionFeedback = signal<{
    frame?: FrameItem;
    text: string;
    variant: "gain" | "sell" | "collect" | "open";
  } | null>(null);

  // data lists (state-backed)
  readonly heroList = this.state.inventoryHeroes;
  readonly equipList = this.state.inventoryEquip;
  readonly equipType = this.catalogSelectors.equipTypes;

  // reactive current hero & selected equip
  readonly currentHero = this.state.currentHero;
  readonly selectedEquip = signal<EquipItem>(
    this.catalogSelectors.defaultEquip(),
  );

  // filtered equip (computed)
  readonly filteredEquip = computed(() => {
    const experience = this.activeMasteryRange();
    const level = this.activeLevelRange();
    //console.log("filteredEquip",this.equipList());
    return (this.equipList() ?? []).filter(
      (e) =>
        e.type?.id === this.selectedType() &&
        e.experience.current >= experience.lower &&
        e.experience.current <= experience.upper &&
        e.level >= level.lower &&
        e.level <= level.upper,
    );
  });

  // effect: ricalcola selectedEquip automaticamente quando cambia currentHero o selectedType
  private _autoCalc = effect(() => {
    this.calculateEquip();
  });

  // utile per debug/condizioni se vuoi sapere se c'è preview
  readonly hasPreview = computed(() => !!this.previewItem());

  contextActions = this.floating.contextActions;
  defaultIcon: IconItem = defaultIcon;

  ngOnInit(): void {
    const routeType = this.route.snapshot.paramMap.get("type");
    if (routeType) {
      this.selectedType.set(routeType);
    }

    // garantisce che abbiamo sempre un currentHero valido
    if (!this.currentHero()) {
      const heroes = this.heroList();
      if (heroes.length) this.heroProgress.selectHero(heroes[0]);
    }
    // effect già stabilito per ricalcolare selectedEquip
  }

  calculateEquip(): void {
    const _hero = this.currentHero();
    const _type = this.selectedType();
    if (!_hero || !Array.isArray(_hero.equip)) {
      this.selectedEquip.set(this.catalogSelectors.defaultEquip());
      return;
    }

    const found = _hero.equip.find((e) => e?.type?.id === _type);
    this.selectedEquip.set(found ?? this.catalogSelectors.defaultEquip());
    //console.log('_autoCalc',_hero,_type,found);
  }

  // navigation between heroes
  previousHero(): void {
    const list = this.heroList();
    const current = this.currentHero();
    if (!current || !list.length) return;
    const currentIndex = list.findIndex((h) => h.id === current.id);
    const previousIndex = (currentIndex - 1 + list.length) % list.length;
    this.heroProgress.selectHero(list[previousIndex]);
    // effect aggiornerà selectedEquip automaticamente
  }

  nextHero(): void {
    const list = this.heroList();
    const current = this.currentHero();
    if (!current || !list.length) return;
    const currentIndex = list.findIndex((h) => h.id === current.id);
    const nextIndex = (currentIndex + 1) % list.length;
    this.heroProgress.selectHero(list[nextIndex]);
    // effect aggiornerà selectedEquip automaticamente
  }

  changeType(type: string): void {
    this.selectedType.set(type);
    this.previewItem.set(null);
    // effect si occuperà di ricalcolare selectedEquip
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

  // Apri popover di preview (la popup non usa PopoverController internamente; la pagina lo gestisce)
  async preview(equip: EquipItem): Promise<void> {
      const selected = this.selectedEquip();
      const isBrokenEquip = !!equip.duration && equip.duration.current <= 0;
      if (selected && equip.id === selected.id) return;

      let pop: HTMLIonPopoverElement | undefined;

      if (isBrokenEquip) {
        pop = await this.popoverCtrl.create({
          component: UIItemDetailPopupComponent,
          componentProps: {
            item: equip,
            onDismiss: (d?: any) => pop?.dismiss(d),
          },
          translucent: true,
          cssClass: "equip-preview-popover",
        });

        await pop.present();
        return;
      }

      const props = {
        previewEquip: equip,
      currentEquip: selected,
      onEquip: (e: EquipItem | null) =>
        pop?.dismiss({ action: "equip", equip: e }),
      onDismiss: (d?: any) => pop?.dismiss(d),
    };

    pop = await this.popoverCtrl.create({
      component: UIEquipComparePopupComponent,
      componentProps: props,
      translucent: true,
      cssClass: "equip-preview-popover",
    });

    await pop.present();

    const { data } = await pop.onWillDismiss();
    if (data?.action === "equip" && data.equip) {
      this.confirmAssingEquip.set(data.equip as EquipItem);
    }
  }

  deleteEquipConfirmText(equip: EquipItem): string {
    return `Vuoi davvero eliminare ${equip.name} dall'inventario?`;
  }

  deleteEquipMode(): void {
    this.isDeleteMode.update((v) => !v);
    this.confirmAssingEquip.set(null);
    this.confirmDeleteEquip.set(null);
    this.previewItem.set(null);
  }

  deleteEquip(): void {
    const equip = this.confirmDeleteEquip();
    if (!equip) return;

    // aggiorna lo state rimuovendo l'elemento anche dagli eroi equipaggiati
    this.inventoryMutations.deleteInventoryEquipWithRefund(equip.id);
    this.actionFeedback.set({
      frame: equip.frame,
      text: "Eliminato",
      variant: "sell",
    });

    // pulisco UI
    this.confirmAssingEquip.set(null);
    this.confirmDeleteEquip.set(null);
    this.previewItem.set(null);
  }

  canUpgradeSelectedEquip(): boolean {
    const equip = this.selectedEquip();
    return this.heroProgress.canUpgradeEquip(equip);
  }

  upgradeSelectedEquip(): void {
    const hero = this.currentHero();
    const equip = this.selectedEquip();
    if (!hero || !this.heroProgress.canUpgradeEquip(equip)) return;

    const upgradedEquip = this.heroProgress.upgradeEquip(hero, equip);
    if (upgradedEquip) this.selectedEquip.set(upgradedEquip);
  }

  // applica equip alla hero corrente
  applayEquip(): void {
    const equip = this.confirmAssingEquip();
    if (!equip) return;

    const typeId = this.selectedType();
    const hero = this.currentHero();
    if (!hero) return;

    // aggiorna lo state service, la lista inventario eroi e la signal currentHero
    this.heroProgress.equipHero(hero, equip, typeId);

    //ricalcolo il signal di equip
    this.calculateEquip();

    // pulisci UI
    this.previewItem.set(null);
    this.confirmAssingEquip.set(null);
    this.confirmDeleteEquip.set(null);
    console.log("applayEquip");
  }

  // trackBy helper per *ngFor
  trackById(index: number, item: any) {
    return item?.id ?? index;
  }
}
