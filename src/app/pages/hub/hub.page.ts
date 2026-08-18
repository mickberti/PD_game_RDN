import { CommonModule } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { IonContent, IonFooter, IonHeader, IonToolbar } from "@ionic/angular/standalone";
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
import { EventActivationService } from "../../core/services/progression/event-activation.service";
import { GameplaySessionService } from "../../core/services/gameplay/gameplay-session.service";
import { RDN_MAX_LEVEL } from "../../core/game/rnd/levels.config";
import { PuzzleDifficulty } from "../../core/game/rnd/difficulty-profile.config";

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
  imports: [IonHeader, IonToolbar, UIHeaderComponent, IonFooter, UIBottomNavComponent, IonContent, CommonModule, UIFloatingPanelComponent, ModeBoxComponent, UIEventBoxComponent, UIEventDetailPopupComponent],
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
            <section class="level-picker" role="dialog" aria-modal="true" aria-label="Difficolta Free" (click)="$event.stopPropagation()">
              <header class="level-picker__header"><div><span>FREE</span><h2>Scegli difficolta</h2><p>Partite illimitate, senza vite.</p></div></header>
              <p class="free-picker__label">Gemme operative: {{ freeSlotCount() }}</p>
              <div class="free-picker__slots">@for (count of freeSlotCounts; track count) { <button type="button" [class.free-picker__slot--selected]="freeSlotCount() === count" (click)="freeSlotCount.set(count)">{{ count }}</button> }</div>
              <div class="level-picker__grid">@for (difficulty of freeDifficulties; track difficulty) { <button type="button" class="level-picker__level" (click)="startFree(mode, difficulty)"><strong>{{ difficulty }}</strong><span>{{ freeDescription(difficulty) }}</span></button> }</div>
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
    .level-picker__close { width: 36px; height: 36px; border: 1px solid #d9ad54; border-radius: 50%; color: #ffe8a0; background: rgba(0, 0, 0, .32); font-size: 1.5rem; }
    .level-picker__grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
    .level-picker__level { display: grid; min-height: 65px; place-items: center; gap: 4px; border: 1px solid #bf9042; border-radius: 12px; color: #ffedbe; background: rgba(104, 69, 25, .42); }
    .level-picker__level strong { font-size: 1.1rem; }
    .level-picker__level span { min-height: 16px; color: #ffdc5f; font-size: .76rem; letter-spacing: -1px; }
    .level-picker__level--locked { border-color: rgba(255,255,255,.12); color: rgba(255,255,255,.35); background: rgba(0,0,0,.25); }
    .level-picker__level--locked span { color: rgba(255,255,255,.32); letter-spacing: 0; }
    .free-picker__label { margin: 8px 0; color: #ffdc6d; font-weight: 800; }
    .free-picker__slots { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 16px; }
    .free-picker__slots button { min-height: 40px; border: 1px solid #bf9042; border-radius: 10px; color: #ffedbe; background: rgba(104, 69, 25, .42); font-weight: 800; }
    .free-picker__slots .free-picker__slot--selected { border-color: #ffdc6d; background: rgba(178, 128, 33, .68); }
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
  readonly freeSlotCounts = [4, 5, 6, 7, 8] as const;
  readonly freeSlotCount = signal<number>(4);
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

  startFree(mode: ModeItem, difficulty: PuzzleDifficulty): void {
    const session = this.gameplaySession.startSession(mode, 1, mode.mastery ?? 1, { variant: "free", overrides: { freeDifficulty: difficulty, freeSeed: Math.floor(Math.random() * 0x7fffffff), freeSlotCount: this.freeSlotCount() } });
    this.freeMode.set(null); this.nav.go(this.gameplaySession.getRouteForVariant(session.variant));
  }
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
