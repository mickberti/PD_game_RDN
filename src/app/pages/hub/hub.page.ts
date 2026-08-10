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

const ACTIVE_GAME_MODE_IDS = new Set(["adventure", "time-attack"]);

type HubListItem =
  | { type: "mode"; item: ModeItem }
  | { type: "event"; item: GameEvent };

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
              <ui-mode-box [mode]="entry.item" (select)="openMode($event)" />
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
  readonly highlightEvents = computed(() => this.state.events().filter((event) => event.type === "highlight"));
  readonly hubItems = computed<HubListItem[]>(() => this.buildHubItems(
    this.theme.modes().filter((mode) => ACTIVE_GAME_MODE_IDS.has(mode.id)),
    this.highlightEvents(),
  ));

  contextActions = this.floating.contextActions;

  openMode(mode: ModeItem): void {
    const matchLevel = this.state.progress().gameModeLevels?.[mode.id] ?? 1;
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
