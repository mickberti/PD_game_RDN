import { CommonModule } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { IonContent, IonFooter, IonHeader, IonRange, IonToolbar } from "@ionic/angular/standalone";
import { ThemeService } from "../../core/services/app/theme/theme.service";
import { UIHeaderComponent } from "src/app/shared/components/ui-header.component";
import { UIBottomNavComponent } from "src/app/shared/components/ui-bottom-nav.component";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { UIFloatingPanelComponent } from "../../shared/basic/ui-floating-panel.component";
import { FloatingNavigationService } from "../../core/services/app/navigation/floating-navigation.service";
import { GameStateService } from "../../core/services/state/game-state.service";
import { ModeItem, PriceItem } from "../../core/models/game.models";
import { GameEvent } from "../../core/models/remote/event.model";
import { ModeBoxComponent } from "../../shared/components/box/ui-mode-box.component";
import { UIEventBoxComponent } from "../../shared/components/box/ui-event-box.component";
import { UIEventDetailPopupComponent } from "../../shared/components/popup/ui-event-detail-popup.component";
import { UIButtonSpriteComponent } from "../../shared/basic/ui-button-sprite.component";
import { EventActivationService } from "../../core/services/progression/event-activation.service";
import { GameplaySessionService } from "../../core/services/gameplay/gameplay-session.service";
import { RDN_MAX_LEVEL } from "../../core/game/phaser/config/levels.config";
import { PuzzleDifficulty } from "../../core/game/phaser/puzzle.types";
import { FreeEffectSelections } from "../../core/models/gameplay-session.model";

const ACTIVE_GAME_MODE_IDS = new Set(["adventure", "time-attack", "free", "ranked"]);

type HubListItem =
  | { type: "mode"; item: ModeItem }
  | { type: "event"; item: GameEvent };

interface LevelPickerItem {
  number: number;
  unlocked: boolean;
  stars: number;
}

@Component({
  selector: "app-hub",
  standalone: true,
  imports: [IonHeader, IonToolbar, UIHeaderComponent, IonFooter, UIBottomNavComponent, IonContent, IonRange, CommonModule, UIFloatingPanelComponent, ModeBoxComponent, UIEventBoxComponent, UIEventDetailPopupComponent, UIButtonSpriteComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ui-header title="Settings" backPath="/hub"></ui-header>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="screen hub-screen">
        <section class="screen-list hub-list">
          @for (entry of hubItems(); track trackHubItem(entry)) {
            @if (entry.type === "mode") {
              <ui-mode-box [mode]="entry.item" (select)="openMode($event)" (selectLevels)="openLevelPicker($event)" />
            } @else {
			  <ui-event-box  [event]="entry.item" (selected)="openEvent($event)" />
            }
          }
        </section>

        <ui-event-detail-popup
          *ngIf="selectedEvent() as event"
          [event]="event"
          [priceItem]="eventPrice(event)"
          [primaryLabel]="eventPrimaryLabel(event)"
          [primaryDisabled]="isEventAlreadyActive(event)"
          [onPrimaryAction]="activateEvent"
          [onDismiss]="closeEventDetail"
        />

        @if (levelPickerMode(); as mode) {
          <div class="level-picker-backdrop" role="presentation" (click)="closeLevelPicker()">
            <section class="level-picker" role="dialog" aria-modal="true" [attr.aria-label]="'Livelli ' + mode.title" (click)="$event.stopPropagation()">
              <header class="level-picker__header">
                <div>
                  <span>SELEZIONA LIVELLO</span>
                  <h2>{{ mode.title }}</h2>
                  <p>★ {{ totalStars(mode) }} / {{ maxGameStars }} stelle raccolte</p>
                </div>
                <button type="button" class="level-picker__close" (click)="closeLevelPicker()" aria-label="Chiudi selettore livelli">×</button>
              </header>
              <div class="level-picker__grid">
                @for (level of levelsFor(mode); track level.number) {
                  <button
                    type="button"
                    class="level-picker__level"
                    [class.level-picker__level--locked]="!level.unlocked"
                    [disabled]="!level.unlocked"
                    (click)="openLevel(mode, level.number)"
                    [attr.aria-label]="level.unlocked ? 'Gioca livello ' + level.number : 'Livello ' + level.number + ' bloccato'"
                  >
                    <strong>{{ level.number }}</strong>
                    <span>{{ level.unlocked ? starLabel(level.stars) : '🔒' }}</span>
                  </button>
                }
              </div>
            </section>
          </div>
        }
        @if (freeMode(); as mode) {
          <div class="level-picker-backdrop" role="presentation" (click)="freeMode.set(null)">
            <section class="level-picker free-picker" role="dialog" aria-modal="true" aria-label="Impostazioni partita Free" (click)="$event.stopPropagation()">
              <header class="level-picker__header"><div><span>MODALITÀ FREE</span><h2>Configura la sfida</h2><p>Partite illimitate, senza vite.</p></div><ui-button-sprite class="level-picker__close" styleClass="popup-close-button" size="md" [frame]="{ name: 'icon-close-large', effect: 'none' }" (pressed)="freeMode.set(null)" ariaLabel="Chiudi impostazioni Free" /></header>
              <section class="free-picker__section" aria-labelledby="free-spheres-label">
                <div class="free-picker__heading"><span id="free-spheres-label">SFERE OPERATIVE</span><strong>{{ freeSlotCount() }}</strong></div>
                <div class="free-picker__tick-labels" aria-hidden="true">@for (count of freeSlotCounts; track count) { <span [class.free-picker__tick-label--selected]="freeSlotCount() === count">{{ count }}</span> }</div>
                <ion-range class="free-picker__range" [min]="4" [max]="9" [step]="1" [snaps]="true" [ticks]="true" [value]="freeSlotCount()" (ionChange)="onFreeSlotCountChange($event)" aria-label="Numero di sfere operative"></ion-range>
              </section>










              <section class="free-picker__section" aria-labelledby="free-effects-label">
                <div class="free-picker__heading"><span id="free-effects-label">EFFETTI ATTIVI</span><strong>{{ enabledEffectCount() }}/3</strong></div>
                <div class="free-picker__effects" role="group" aria-label="Categorie di effetti">
                  @for (effect of freeEffectOptions; track effect.key) { <button type="button" class="free-picker__effect" [class.free-picker__effect--enabled]="freeEffectSelections()[effect.key]" [attr.aria-pressed]="freeEffectSelections()[effect.key]" (click)="toggleFreeEffect(effect.key)"><span>{{ effect.label }}</span><small>{{ freeEffectSelections()[effect.key] ? 'ON' : 'OFF' }}</small></button> }
                </div>
              </section>
              <section class="free-picker__section" aria-labelledby="free-difficulty-label">
                <div class="free-picker__heading"><span id="free-difficulty-label">DIFFICOLTÀ</span><strong>{{ freeDifficulty() }}</strong></div>
                <div class="free-picker__difficulty-labels" aria-hidden="true">@for (difficulty of freeDifficulties; track difficulty) { <span [class.free-picker__difficulty-label--selected]="freeDifficulty() === difficulty">{{ difficulty }}</span> }</div>
                <ion-range class="free-picker__range" [min]="0" [max]="3" [step]="1" [snaps]="true" [ticks]="true" [value]="freeDifficultyIndex()" (ionChange)="onFreeDifficultyChange($event)" aria-label="Difficoltà"></ion-range>
                <p class="free-picker__description">{{ freeDescription(freeDifficulty()) }}</p>
              </section>
              <section class="free-picker__section" aria-labelledby="free-theme-label">
                <div class="free-picker__heading"><span id="free-theme-label">TEMA GRAFICO</span><strong>SET {{ freeTheme() }}</strong></div>
                <div class="free-picker__theme-labels" aria-hidden="true">@for (theme of freeThemes; track theme) { <span [class.free-picker__difficulty-label--selected]="freeTheme() === theme">SET {{ theme }}</span> }</div>
                <ion-range class="free-picker__range" [min]="1" [max]="3" [step]="1" [snaps]="true" [ticks]="true" [value]="freeTheme()" (ionChange)="onFreeThemeChange($event)" aria-label="Tema grafico"></ion-range>
              </section>
              <button type="button" class="free-picker__start" (click)="startFree(mode)">INIZIA PARTITA</button>
            </section>
          </div>
        }
      </div>

      <ui-floating-panel
        *ngIf="false"
        slot="fixed"
        title="Mario Rossi"
        subtitle="Cliente selezionato · Pratica #1234"
        initials="MR"
        status="active"
        [actions]="contextActions">
      </ui-floating-panel>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ui-bottom-nav />
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    .hub-list { display: grid; gap: 18px; padding-bottom: 96px; }
    .level-picker-backdrop { position: fixed; z-index: 1000; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(3, 5, 10, .76); }
    .level-picker { width: min(560px, 100%); max-height: min(680px, calc(100dvh - 40px)); overflow: auto; border: 2px solid #b98c38; border-radius: 22px; padding: 20px; color: #f7e9c7; background: linear-gradient(145deg, #292015, #0d1219); box-shadow: 0 20px 65px rgba(0, 0, 0, .65); }
    .level-picker__header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
    .level-picker__header span { color: #e0b959; font-size: .72rem; font-weight: 800; letter-spacing: .12em; }
    .level-picker__header h2 { margin: 4px 0; font-size: 1.5rem; }
    .level-picker__header p { margin: 0; color: #ffdc6d; font-weight: 800; }
    .level-picker__close { width: 36px; height: 36px;color: #ffe8a0; background: rgba(0, 0, 0, .32); font-size: 1.5rem; }
    .level-picker__grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
    .level-picker__level { display: grid; min-height: 65px; place-items: center; gap: 4px; border: 1px solid #bf9042; border-radius: 12px; color: #ffedbe; background: rgba(104, 69, 25, .42); }
    .level-picker__level strong { font-size: 1.1rem; }
    .level-picker__level span { min-height: 16px; color: #ffdc5f; font-size: .76rem; letter-spacing: -1px; }
    .level-picker__level--locked { border-color: rgba(255,255,255,.12); color: rgba(255,255,255,.35); background: rgba(0,0,0,.25); }
    .level-picker__level--locked span { color: rgba(255,255,255,.32); letter-spacing: 0; }
    .free-picker { --bar-background: rgba(8, 29, 38, .86); --bar-background-active: #f4bf4c; --bar-height: 8px; --knob-background: #fff0ab; --knob-size: 22px; position: relative; border: 0; border-radius: 0; padding: 42px 46px 38px; background: url('/assets/ui/fantasy_bg/panel/panel2-set1.png') center / 100% 100% no-repeat; filter: drop-shadow(0 20px 30px rgba(0, 0, 0, .58)); }
    .free-picker > * { position: relative; z-index: 1; }
    .free-picker .level-picker__header { margin-bottom: 12px; }
    .free-picker__section { margin-top: 16px; padding: 12px 14px 10px; border: 1px solid rgba(255, 212, 105, .33); border-radius: 12px; background: rgba(5, 20, 29, .5); box-shadow: inset 0 1px rgba(255, 246, 195, .12); }
    .free-picker__heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: #f4d47b; font-size: .75rem; font-weight: 900; letter-spacing: .11em; }
    .free-picker__heading strong { color: #fff0ad; font-size: 1rem; letter-spacing: .04em; }
    .free-picker__tick-labels, .free-picker__difficulty-labels, .free-picker__theme-labels { display: grid; align-items: end; margin: 10px 8px -5px; color: #b5c8c7; font-size: .74rem; font-weight: 900; text-align: center; }
    .free-picker__tick-labels { grid-template-columns: repeat(6, 1fr); }
    .free-picker__difficulty-labels { grid-template-columns: repeat(4, 1fr); font-size: .62rem; letter-spacing: .02em; }
    .free-picker__theme-labels { grid-template-columns: repeat(3, 1fr); font-size: .68rem; letter-spacing: .04em; }
    .free-picker__tick-label--selected, .free-picker__difficulty-label--selected { color: #ffea91; text-shadow: 0 0 10px rgba(255, 204, 84, .72); }
    .free-picker__range { padding: 10px 0 0; }
    .free-picker__range::part(tick) { width: 3px; height: 12px; border-radius: 2px; background: #8eb5b7; }
    .free-picker__range::part(tick-active) { background: #ffe487; }
    .free-picker__effects { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
    .free-picker__effect { display: grid; min-height: 58px; gap: 3px; place-items: center; border: 1px solid rgba(167, 204, 197, .42); border-radius: 9px; color: #bdcecd; background: rgba(4, 18, 27, .7); font-weight: 900; letter-spacing: .04em; }
    .free-picker__effect small { color: #778c92; font-size: .62rem; }
    .free-picker__effect--enabled { border-color: #f4ca58; color: #fff0ac; background: linear-gradient(180deg, rgba(134, 98, 31, .76), rgba(31, 74, 65, .82)); box-shadow: inset 0 0 16px rgba(255, 219, 112, .22), 0 0 12px rgba(255, 203, 75, .15); }
    .free-picker__effect--enabled small { color: #93f0b9; }
    .free-picker__description { min-height: 18px; margin: 4px 0 0; color: #c6ddd7; font-size: .78rem; text-align: center; }
    .free-picker__start { width: 100%; min-height: 48px; margin-top: 18px; border: 1px solid #ffdf72; border-radius: 11px; color: #fff4bd; background: linear-gradient(180deg, #a76d1e, #623b12); box-shadow: inset 0 1px rgba(255,255,255,.34), 0 5px 0 #2e1a08; font-weight: 900; letter-spacing: .1em; }
    @media (max-width: 420px) { .free-picker { padding: 36px 34px 32px; } .free-picker::before { inset: 24px; } .free-picker__difficulty-labels { font-size: .54rem; } }
  `],
})
export class HubPage {
  readonly theme = inject(ThemeService);
  readonly nav = inject(AppNavigationService);
  readonly floating = inject(FloatingNavigationService);
  readonly state = inject(GameStateService);
  private readonly eventActivation = inject(EventActivationService);
  private readonly gameplaySession = inject(GameplaySessionService);

  readonly selectedEvent = signal<GameEvent | null>(null);
  readonly levelPickerMode = signal<ModeItem | null>(null);
  readonly freeMode = signal<ModeItem | null>(null);
  readonly freeDifficulties: readonly PuzzleDifficulty[] = ["EASY", "NORMAL", "HARD", "EXPERT"];
  readonly freeSlotCounts = [4, 5, 6, 7, 8, 9] as const;
  readonly freeSlotCount = signal<number>(4);
  readonly freeDifficulty = signal<PuzzleDifficulty>("EASY");
  readonly freeThemes = [1, 2, 3] as const;
  readonly freeTheme = signal<1 | 2 | 3>(3);
  readonly freeEffectSelections = signal<FreeEffectSelections>({ gem: false, link: false, area: false });
  readonly freeEffectOptions: readonly { key: keyof FreeEffectSelections; label: string }[] = [
    { key: "gem", label: "GEMMA" }, { key: "link", label: "LINK" }, { key: "area", label: "AREA" },
  ];
  readonly freeDifficultyIndex = computed(() => this.freeDifficulties.indexOf(this.freeDifficulty()));
  readonly enabledEffectCount = computed(() => Object.values(this.freeEffectSelections()).filter(Boolean).length);
  readonly maxGameStars = RDN_MAX_LEVEL * 3;
  readonly highlightEvents = computed(() => this.state.events().filter((event) => event.type === "highlight"));
  readonly hubItems = computed<HubListItem[]>(() => this.buildHubItems(
    this.theme.modes().filter((mode) => ACTIVE_GAME_MODE_IDS.has(mode.id)),
    this.highlightEvents(),
  ));

  contextActions = this.floating.contextActions;

  openMode(mode: ModeItem): void {
    if (mode.id === "ranked") { this.nav.go("/ranking"); return; }
    if (mode.id === "free") { this.freeMode.set(mode); return; }
    const completedLevel = Math.max(0, Math.min(RDN_MAX_LEVEL, this.state.progress().gameModeLevels?.[mode.id] ?? 0));
    this.launchLevel(mode, Math.min(RDN_MAX_LEVEL, completedLevel + 1));
  }

  startFree(mode: ModeItem): void {
    const selections = this.freeEffectSelections();
    const session = this.gameplaySession.startSession(mode, 1, mode.mastery ?? 1, { variant: "free", overrides: { freeDifficulty: this.freeDifficulty(), freeSeed: Math.floor(Math.random() * 0x7fffffff), freeSlotCount: this.freeSlotCount(), freeTheme: this.freeTheme(), freeEffectsEnabled: this.enabledEffectCount() > 0, freeEffectSelections: selections } });
    this.freeMode.set(null); this.nav.go(this.gameplaySession.getRouteForVariant(session.variant));
  }
  onFreeSlotCountChange(event: Event): void { this.freeSlotCount.set(Number((event as CustomEvent<{ value: number }>).detail.value)); }
  onFreeDifficultyChange(event: Event): void { this.freeDifficulty.set(this.freeDifficulties[Math.round(Number((event as CustomEvent<{ value: number }>).detail.value))] ?? "EASY"); }
  onFreeThemeChange(event: Event): void { const theme = Math.round(Number((event as CustomEvent<{ value: number }>).detail.value)); this.freeTheme.set(theme === 1 || theme === 2 || theme === 3 ? theme : 3); }
  toggleFreeEffect(effect: keyof FreeEffectSelections): void { this.freeEffectSelections.update((selections) => ({ ...selections, [effect]: !selections[effect] })); }
  freeDescription(difficulty: PuzzleDifficulty): string { return difficulty === "EASY" ? "Soluzioni brevi" : difficulty === "NORMAL" ? "Segni misti e DIV2" : difficulty === "HARD" ? "Piu flussi e DIV3" : "Massima complessita"; }

  openLevelPicker(mode: ModeItem): void {
    this.levelPickerMode.set(mode);
  }

  closeLevelPicker(): void {
    this.levelPickerMode.set(null);
  }

  openLevel(mode: ModeItem, level: number): void {
    if (level > this.unlockedThrough(mode)) return;
    this.closeLevelPicker();
    this.launchLevel(mode, level);
  }

  levelsFor(mode: ModeItem): LevelPickerItem[] {
    const unlockedThrough = this.unlockedThrough(mode);
    const stars = this.state.progress().gameModeLevelStars?.[mode.id] ?? {};
    return Array.from({ length: RDN_MAX_LEVEL }, (_, index) => {
      const number = index + 1;
      return { number, unlocked: number <= unlockedThrough, stars: Math.max(0, Math.min(3, Number(stars[String(number)]) || 0)) };
    });
  }

  totalStars(mode: ModeItem): number {
    return Object.values(this.state.progress().gameModeLevelStars?.[mode.id] ?? {})
      .reduce((total, stars) => total + Math.max(0, Math.min(3, Number(stars) || 0)), 0);
  }

  starLabel(stars: number): string {
    return stars > 0 ? "★".repeat(stars) + "☆".repeat(3 - stars) : "☆☆☆";
  }

  private unlockedThrough(mode: ModeItem): number {
    const completedLevel = Math.max(0, Math.min(RDN_MAX_LEVEL, this.state.progress().gameModeLevels?.[mode.id] ?? 0));
    return Math.min(RDN_MAX_LEVEL, completedLevel + 1);
  }

  private launchLevel(mode: ModeItem, matchLevel: number): void {
    const session = this.gameplaySession.startSession(mode, matchLevel, mode.mastery ?? 1);
    this.nav.go(this.gameplaySession.getRouteForVariant(session.variant));
  }

  openEvent(event: GameEvent): void {
    this.selectedEvent.set(event);
  }

  readonly closeEventDetail = (): void => {
    this.selectedEvent.set(null);
  };

  readonly activateEvent = async (event: GameEvent | null): Promise<void> => {
    if (!event || this.eventActivation.isActive(event, this.state.progress())) return;
    const nextProgress = this.eventActivation.activate(event, this.state.progress());
    if (!nextProgress) return;
    this.state.updateProgress(nextProgress);
    await this.state.persistProgressNow().catch(() => undefined);
    this.selectedEvent.set(null);
  };

  eventPrice(event: GameEvent): PriceItem {
    return this.eventActivation.resolvePrice(event);
  }

  eventPrimaryLabel(event: GameEvent): string {
    return this.isEventAlreadyActive(event) ? "Evento acquistato" : "Acquista evento";
  }

  isEventAlreadyActive(event: GameEvent): boolean {
    return this.eventActivation.isActive(event, this.state.progress());
  }

  trackHubItem(entry: HubListItem): string {
    return `${entry.type}-${entry.item.id}`;
  }

  private buildHubItems(modes: ModeItem[], events: GameEvent[]): HubListItem[] {
    const items: HubListItem[] = [];
    const maxCycles = Math.ceil(modes.length / 2);

    for (let cycle = 0; cycle < maxCycles; cycle += 1) {
      const firstMode = modes[cycle * 2];
      const secondMode = modes[cycle * 2 + 1];
      const event = events[cycle];

      if (firstMode) {
        items.push({ type: "mode", item: firstMode });
      }
      if (secondMode) {
        items.push({ type: "mode", item: secondMode });
      }
      if (event) {
        items.push({ type: "event", item: event });
      }
    }

    if (events.length > maxCycles) {
      items.push(...events.slice(maxCycles).map((event) => ({ type: "event" as const, item: event })));
    }

    return items;
  }
}
