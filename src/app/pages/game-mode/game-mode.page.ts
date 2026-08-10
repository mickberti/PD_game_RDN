import { JsonPipe, NgClass, NgFor, NgIf } from "@angular/common";
import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { IonContent, IonFooter, IonHeader, IonToolbar, PopoverController } from "@ionic/angular/standalone";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { UIButtonComponent } from "src/app/shared/basic/ui-button.component";
import { UIButtonSpriteComponent } from "src/app/shared/basic/ui-button-sprite.component";
import { HeroItem } from "../../core/models/game.models";
import { PhaserGameParams } from "../../core/models/phaser-game-state.model";
import { getHeroSpriteAtlasSet } from "../../core/game/phaser/config/hero-atlas.config";
import { getMonsterSpriteAtlasSet } from "../../core/game/phaser/config/monster-atlas.config";
import { GameEvent } from "../../core/models/remote/event.model";
import { UIBandComponent } from "../../shared/basic/ui-band.component";
import { ThemeService } from "../../core/services/app/theme/theme.service";
import { GameStateService } from "../../core/services/state/game-state.service";
import { HeroProgressService } from "../../core/services/progression/hero-progress.service";
import { UiSpriteComponent } from "../../shared/basic/ui-sprite.component";
import { UIProgressbarComponent } from "../../shared/basic/ui-progress-bar.component";
import { UIProgressStarsComponent } from "../../shared/basic/ui-progress-stars.component";
import { UIProgressStatItem, UIProgressStatsComponent } from "../../shared/basic/ui-progress-stats.component";
import { ModeMasteryProgressionService } from "../../core/services/progression/mode-mastery-progression.service";
import { createHeroExperienceProgress, createHeroFatigueProgress, createHeroHealProgress, createHeroManaProgress } from "../../core/services/progression/level-progression.service";
import { UIConfirmActionPopupComponent } from "../../shared/components/popup/ui-confirm-action-popup.component";
import { UIInventoryBoxComponent } from "../../shared/components/box/ui-inventory-box.component";
import { UIEventDetailPopupComponent } from "../../shared/components/popup/ui-event-detail-popup.component";
import { UIItemDetailPopupComponent } from "../../shared/components/popup/ui-item-detail-popup.component";
import { PlayerService } from "../../core/services/auth/player.service";
import { buildHeroCombatTuning, buildMonsterCombatTuning, heroCombatTuningRows, scaleHeroCombatTuning } from "../../core/game/phaser/config/combat-tuning.config";
import { EventActivationService } from "../../core/services/progression/event-activation.service";
import { UIHeaderComponent } from "../../shared/components/ui-header.component";
import { UIBottomNavComponent } from "../../shared/components/ui-bottom-nav.component";
import { JuiceDirective } from "../../core/directive/juice.directive";
import { GameplaySessionService } from "../../core/services/gameplay/gameplay-session.service";

@Component({
  selector: "app-game-mode",
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonFooter,
    UIButtonComponent,
    UIButtonSpriteComponent,
    UIBandComponent,
    UiSpriteComponent,
    UIProgressbarComponent,
    UIProgressStarsComponent,
    UIProgressStatsComponent,
    UIConfirmActionPopupComponent,
    UIInventoryBoxComponent,
    UIEventDetailPopupComponent,
    UIHeaderComponent,
    UIBottomNavComponent,
    JuiceDirective,
    NgFor,
    NgIf,
    NgClass,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
  <ion-header>
    <ion-toolbar>
      <ui-header title="Game Mode" backPath="/hub"></ui-header>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div class="screen gamemode-screen">
      <div class="gamemode-panel">
        <ui-confirm-action-popup
          *ngIf="confirmHeroHeal() as hero"
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
        <ui-confirm-action-popup
          *ngIf="confirmHeroFatigueRecovery() as hero"
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
        <ui-event-detail-popup
          *ngIf="selectedEvent() as event"
          [event]="event"
          primaryLabel="Vai agli eventi"
          [onPrimaryAction]="goToSelectedEvent"
          [onDismiss]="closeEventDetail"
        />

		<section class="mode-hero" *ngIf="selectedMode() as mode">
			<ui-sprite class="mode-hero__frame" [frame]="mode.frame" />
		</section>
		
        <section class="mode-hero__descr" *ngIf="selectedMode() as mode">
          <div class="mode-hero__content">
            <span class="mode-hero__eyebrow">Modalità selezionata</span>
            <h1>{{ mode.title }}</h1>
            <p>{{ mode.description }}</p>
          </div>
		  <div class="gm-mastery" *ngIf="modeMasteryProgress() as masteryProgress">
		    <ui-progress-stars [mastery]="masteryProgress.mastery" direction="horizontal" />
		  </div>
		  <div *ngIf="modeProgress() as progress" class="gm-progress">
		    <span>{{ progress.descr || 'Avanzamento' }}</span>
		    <ui-progress-bar direction="horizontal" [progress]="progress" />
		  </div>
        </section>

        <section class="active-events" *ngIf="activeEvents().length">
          <div class="gm-desc-title">Eventi attivi</div>
          <div class="active-events__rail" aria-label="Lista orizzontale eventi attivi">
            <button
              type="button"
              class="event-frame-chip"
              *ngFor="let event of activeEvents(); trackBy: trackEvent"
              [attr.aria-label]="'Apri dettaglio evento ' + event.title"
              (click)="openEvent(event)">
              <ui-sprite [frame]="event.frame ?? { name: 'none', effect: 'none' }" />
            </button>
          </div>
        </section>

        <ui-band variant="secondary" title="SELECT YOUR HERO"></ui-band>

        <swiper-container
          class="hero-selection"
          aria-label="Lista eroi selezionabili"
          slides-per-view="auto"
          space-between="14"
          grab-cursor="true"
          keyboard="true"
        >
          <swiper-slide class="hero-selection__slide" *ngFor="let hero of heroes(); trackBy: trackHero">
            <article
              class="hero-option"
              [appJuice]="'fx-juicy_bounce_shadow'"
              #heroJuice="appJuice"
              [attr.aria-disabled]="!isHeroAvailable(hero)"
              [ngClass]="{ 'hero-option--selected': selectedHero()?.id === hero.id, 'hero-option--unavailable': !isHeroAvailable(hero) }"
              (click)="selectHero(hero, heroJuice)">
            <ui-inventory-box
              [item]="hero"
              cardFrame="icon-hex-light"
              [cliccable]="false"
            />
            <ui-progress-stats
              class="hero-option__progress"
              [items]="heroCardProgressStats(hero)"
              labelDisplay="none"
              ariaLabel="Risorse eroe"
            />
            <div class="hero-option__meta">
              <strong *ngIf="false">{{ hero.title }}</strong>
              <span>Lv {{ hero.level }} · M{{ hero.mastery }} · V{{ hero.variant }}</span>
              <div class="hero-option-actions">
                <ui-button-sprite
                  [frame]="{ name: 'icon-info', effect: 'none' }"
                  [size]="'xs'"
                  [ariaLabel]="'Apri dettaglio di ' + hero.title"
                  (pressed)="openHeroDetail(hero, $event)" />
                <ui-button-sprite
                  *ngIf="canHealHero(hero)"
                  [frame]="{ name: 'icon-heart', effect: 'fx-power-glow' }"
                  [size]="'xs'"
                  [ariaLabel]="'Cura HP di ' + hero.title"
                  (pressed)="requestHeroHeal(hero, $event)" />
                <ui-button-sprite
                  *ngIf="canRecoverHeroFatigue(hero)"
                  [frame]="{ name: 'weight', effect: 'fx-shadow' }"
                  [size]="'xs'"
                  [ariaLabel]="'Ripristina fatica di ' + hero.title"
                  (pressed)="requestHeroFatigueRecovery(hero, $event)" />
              </div>
            </div>
            </article>
          </swiper-slide>
        </swiper-container>

        <div class="gm-desc gm-final-values" *ngIf="isAdmin() && selectedHero() as hero">
          <div class="gm-desc-title">Valori finali eroe in gioco</div>
          <div class="gm-desc-subtitle">Calcolati da statistiche ed equipaggiamento attivo</div>
          <dl>
            <ng-container *ngFor="let row of finalHeroCombatRows(hero)">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </ng-container>
          </dl>
        </div>

        <div class="gm-actions">
          <ui-button (pressed)="play()" [disabled]="!selectedHero() || !isHeroAvailable(selectedHero()!)">PLAY</ui-button>
        </div>
      </div>
    </div>
  </ion-content>

  <ion-footer>
    <ion-toolbar>
      <ui-bottom-nav />
    </ion-toolbar>
  </ion-footer>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameModePage {
  readonly nav = inject(AppNavigationService);
  private readonly route = inject(ActivatedRoute);
  private readonly theme = inject(ThemeService);
  private readonly state = inject(GameStateService);
  readonly heroProgress = inject(HeroProgressService);
  private readonly masteryProgression = inject(ModeMasteryProgressionService);
  private readonly eventActivation = inject(EventActivationService);
  private readonly playerService = inject(PlayerService);
  private readonly popoverCtrl = inject(PopoverController);
  private readonly gameplaySession = inject(GameplaySessionService);

  readonly modeId = signal(this.route.snapshot.paramMap.get("modeId"));
  readonly heroes = computed(() => this.sortHeroesLikeInventory(this.state.inventoryHeroes()));
  readonly selectedHero = signal<HeroItem | null>(this.state.currentHero());
  readonly confirmHeroHeal = signal<HeroItem | null>(null);
  readonly confirmHeroFatigueRecovery = signal<HeroItem | null>(null);
  readonly selectedEvent = signal<GameEvent | null>(null);
  readonly isAdmin = computed(() => this.playerService.player?.role === "admin");
  readonly selectedMode = computed(() => {
    const modeId = this.modeId();
    const modes = this.theme.modes();
    return modes.find((mode) => mode.id === modeId) ?? modes.find((mode) => mode.route === "/game-mode") ?? modes[0] ?? null;
  });
  readonly modeTitle = computed(() => this.selectedMode()?.title ?? "GAME MODE");
  readonly modeDescription = computed(() => this.selectedMode()?.description ?? "Seleziona una modalità dalla hub");
  readonly activeEvents = computed(() => {
    const now = Date.now();

    return this.state.events()
      .filter((event) => this.eventActivation.isActive(event, this.state.progress(), new Date(now)))
      .sort((a, b) => b.priority - a.priority);
  });
  readonly currentMatchLevel = computed(() => this.state.progress().gameModeLevels?.[this.selectedMode()?.id ?? 'default'] ?? 1);
  readonly modeMasteryProgress = computed(() => this.masteryProgression.calculateFromNextMatchLevel(this.currentMatchLevel()));

  readonly modeProgress = computed(() => {
    const mode = this.selectedMode();
    if (!mode?.progress) {
      return null;
    }

    return {
      ...mode.progress,
      ...this.modeMasteryProgress().progress,
      descr: mode.progress.descr || this.modeMasteryProgress().progress.descr,
    };
  });

  readonly gameParamsPreview = computed(() => {
    const hero = this.selectedHero();

    return hero ? this.buildGameParamsPreview(hero) : null;
  });

  trackHero(_index: number, hero: HeroItem): string {
    return hero.id;
  }

  trackEvent(_index: number, event: GameEvent): string {
    return event.id;
  }

  selectHero(hero: HeroItem, juice?: JuiceDirective): void {
    if (!this.isHeroAvailable(hero)) {
      juice?.play("juicy__shake__1");
      return;
    }
    juice?.play("fx-juicy_bounce_shadow");
    this.selectedHero.set(hero);
    this.heroProgress.setSelectedHero(hero);
  }

  openEvent(event: GameEvent): void {
    this.selectedEvent.set(event);
  }

  readonly closeEventDetail = (): void => {
    this.selectedEvent.set(null);
  };

  readonly goToSelectedEvent = (_event: GameEvent | null): void => {
    const event = this.selectedEvent();
    void this.nav.go(event?.banner?.ctaRoute ?? "/award/event");
  };

  async openHeroDetail(hero: HeroItem, event?: Event | void): Promise<void> {
    this.stopEventPropagation(event);
    this.selectedHero.set(hero);
    this.heroProgress.setSelectedHero(hero);

    let pop: HTMLIonPopoverElement | undefined;
    pop = await this.popoverCtrl.create({
      component: UIItemDetailPopupComponent,
      componentProps: {
        item: hero,
        showUpgrade: true,
        onDismiss: (data?: any) => pop?.dismiss(data),
      },
      translucent: true,
      cssClass: "equip-preview-popover",
    });

    await pop.present();
  }

  play(): void {
    const hero = this.selectedHero();
    if (!hero || !this.isHeroAvailable(hero)) return;
    this.selectedHero.set(hero);
    this.heroProgress.setSelectedHero(hero);
    const mode = this.selectedMode();
    const session = this.gameplaySession.startSession(mode, this.currentMatchLevel(), this.modeMasteryProgress().mastery);
    void this.nav.go(this.gameplaySession.getRouteForVariant(session.variant));
  }

  isHeroAvailable(hero: HeroItem): boolean {
    return this.heroProgress.canHeroPlay(hero);
  }

  canHealHero(hero: HeroItem): boolean {
    return (hero.heal?.current ?? 0) < (hero.heal?.total ?? 1);
  }

  canRecoverHeroFatigue(hero: HeroItem): boolean {
    return (hero.fatigue?.current ?? 0) > 0;
  }

    heroCardProgressStats(hero: HeroItem): UIProgressStatItem[] {
    return [
      { label: "HP", progress: hero.heal ?? {descr:'', current: 0, total: 1}, kind: "heal" },
      { label: "Mana", progress: hero.mana ?? {descr:'', current: 0, total: 1}, kind: "mana" },
      { label: "Fat", progress: hero.fatigue ?? {descr:'', current: 0, total: 1}, kind: "fatigue" },
      { label: "Exp", progress: hero.experience ?? {descr:'', current: 0, total: 1}, kind: "experience" },
    ];
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

  requestHeroHeal(hero: HeroItem, event?: Event | void): void {
    this.stopEventPropagation(event);
    this.confirmHeroHeal.set(hero);
  }

  requestHeroFatigueRecovery(hero: HeroItem, event?: Event | void): void {
    this.stopEventPropagation(event);
    this.confirmHeroFatigueRecovery.set(this.heroProgress.ensureHeroFatigueRestTimer(hero));
  }

  healHero(): void {
    const hero = this.confirmHeroHeal();
    if (!hero || !this.heroProgress.healHero(hero)) return;
    const refreshedHero = this.state.inventoryHeroes().find((item) => item.id === hero.id) ?? this.state.currentHero();
    this.selectedHero.set(refreshedHero);
    this.heroProgress.setSelectedHero(refreshedHero);
    this.confirmHeroHeal.set(null);
  }

  recoverHeroFatigue(): void {
    const hero = this.confirmHeroFatigueRecovery();
    if (!hero) return;

    const recoveredForFree = this.canRecoverHeroFatigueForFree(hero);
    const recovered = recoveredForFree
      ? this.heroProgress.recoverHeroFatigueForFreeAfterRest(hero)
      : this.heroProgress.recoverHeroFatigueWithPayment(hero);
    if (!recovered) return;

    const refreshedHero = this.state.inventoryHeroes().find((item) => item.id === hero.id) ?? this.state.currentHero();
    this.selectedHero.set(refreshedHero);
    this.heroProgress.setSelectedHero(refreshedHero);
    this.confirmHeroFatigueRecovery.set(null);
  }

  finalHeroCombatRows(hero: HeroItem): Array<{ label: string; value: number }> {
    return heroCombatTuningRows(buildHeroCombatTuning(hero));
  }

  private sortHeroesLikeInventory(heroes: HeroItem[]): HeroItem[] {
    return [...heroes].sort((a, b) => {
      const variantDiff = a.variant - b.variant;
      if (variantDiff !== 0) return variantDiff * -1;

      const masteryDiff = a.mastery - b.mastery;
      if (masteryDiff !== 0) return masteryDiff * -1;

      const levelDiff = a.level - b.level;
      if (levelDiff !== 0) return levelDiff * -1;

      return a.title.localeCompare(b.title) * -1;
    });
  }

  private buildGameParamsPreview(hero: HeroItem): Omit<PhaserGameParams, "heroAtlasJson" | "monsterAtlasJson"> {
    const { heroAtlasJson: _heroAtlasJson, monsterAtlasJson: _monsterAtlasJson, ...preview } = this.buildGameParams(hero);
    return preview;
  }

  private buildGameParams(hero: HeroItem): PhaserGameParams {
    return {
      modeId: this.selectedMode()?.id ?? 'default',
      matchLevel: this.currentMatchLevel(),
      uiThemeId: this.theme.activeTheme(),
      sections: 10,
      theme: "Dungeon",
      movementAxes: 4,
      initialLives: 3,
      treasuresPerSection: 3,
      trapsPerSection: 2,
      enemiesPerSection: 1,
      mobileControls: true,
      controlsOrientation: "vertical",
      useSpritesAndAnimations: true,
      useHeroAtlas: true,
      useMonsterAtlas: true,
      ...this.buildHeroAtlasParams(hero),
      ...this.buildMonsterAtlasParams(),
      hero,
      monsterLevel: this.modeMasteryProgress().mastery,
      monsterTypes: ["goblin", "slime", "bat", "skeletor"],
      combatTuning: {
        hero: this.buildEventAdjustedHeroCombatTuning(hero),
        monsters: buildMonsterCombatTuning()
      }
    };
  }

  private buildEventAdjustedHeroCombatTuning(hero: HeroItem): ReturnType<typeof buildHeroCombatTuning> {
    const events = this.state.events();
    const progress = this.state.progress();
    return scaleHeroCombatTuning(buildHeroCombatTuning(hero), {
      attack: this.eventActivation.ruleMultiplier(events, progress, 'attackGameMultiplier'),
      defense: this.eventActivation.ruleMultiplier(events, progress, 'defenceGameMultiplier'),
      special: this.eventActivation.ruleMultiplier(events, progress, 'specialGameMultiplier'),
    });
  }

  private buildHeroAtlasParams(hero: HeroItem): Pick<PhaserGameParams, "heroAtlasKey" | "heroAtlasImage" | "heroAtlasJson" | "heroAtlasDirections"> {
    const atlasSet = getHeroSpriteAtlasSet(hero);
    const downAtlas = atlasSet.directions.down;

    return {
      heroAtlasKey: downAtlas.key,
      heroAtlasImage: downAtlas.imageUrl,
      heroAtlasJson: downAtlas.atlasData,
      heroAtlasDirections: atlasSet.directions
    };
  }

  private buildMonsterAtlasParams(): Pick<PhaserGameParams, "monsterAtlasKey" | "monsterAtlasImage" | "monsterAtlasJson" | "monsterAtlasDirections"> {
    const atlasSet = getMonsterSpriteAtlasSet();
    const downAtlas = atlasSet.directions.down;

    return {
      monsterAtlasKey: downAtlas.key,
      monsterAtlasImage: downAtlas.imageUrl,
      monsterAtlasJson: downAtlas.atlasData,
      monsterAtlasDirections: atlasSet.directions
    };
  }

  private stopEventPropagation(event?: Event | void): void {
    if (event instanceof Event) {
      event.stopPropagation();
    }
  }
}
