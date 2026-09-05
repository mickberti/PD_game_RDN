import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  OnInit,
  signal,
} from "@angular/core";
import {
  IonContent,
  IonFooter,
  IonHeader,
  IonToolbar,
} from "@ionic/angular/standalone";

import { UIAwardChestComponent } from "src/app/shared/components/box/ui-award-box.component";
import { UiRadialTabsComponent } from "src/app/shared/basic/ui-radial-tabs.component";

import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { AwardItem, FrameItem, PriceItem, UiTabItem,  } from "../../core/models/game.models";
import { GameEvent } from "../../core/models/remote/event.model";
import { rewardPreviewText } from "../../core/services/inventory/rewards/reward-display-policy";
import { UIHeaderComponent } from "src/app/shared/components/ui-header.component";
import { UIBottomNavComponent } from "src/app/shared/components/ui-bottom-nav.component";
import { UIPrestigeChestComponent } from "../../shared/components/box/ui-prestige-box.component";
import { UIFloatingPanelComponent } from "../../shared/basic/ui-floating-panel.component";
import { GameStateService } from "../../core/services/state/game-state.service";
import { UIActionFeedbackOverlayComponent } from "../../shared/components/ui-action-feedback-overlay.component";
import { FloatingNavigationService } from "../../core/services/app/navigation/floating-navigation.service";
import { UIEventDetailPopupComponent } from "../../shared/components/popup/ui-event-detail-popup.component";
import { AwardProgressionService } from "../../core/services/progression/award-progression.service";
import { UIEventChestComponent } from "../../shared/components/box/ui-event-box.component";
import { EventActivationService } from "../../core/services/progression/event-activation.service";

@Component({
  selector: "app-award",
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    UIHeaderComponent,
    IonFooter,
    UIBottomNavComponent,
    UIAwardChestComponent,
    UiRadialTabsComponent,
    UIPrestigeChestComponent,
    UIFloatingPanelComponent,
    UIActionFeedbackOverlayComponent,
    UIEventDetailPopupComponent,
    UIEventChestComponent
],
  template: `
    <ion-header>
      <ion-toolbar>
        <ui-header title="Reward" backPath="/hub"></ui-header>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="screen task-screen">
        <div class="reward-content">
          <ui-radial-tabs
            [tabs]="tabs"
            [selected]="type"
            (selectedChange)="onTabChange($event)"
          />
        </div>

        <ui-prestige-box
          *ngIf="false"
          variant="light"
          variantButton="secondary"
          buttonLabel="BUY"
          descrTitle="PRESTIGE"
          descrSubtitle="Prestige your account and reset all your progress for exclusive rewards and bonuses."
        />

        <section class="reward-list" *ngIf="!type.startsWith('event-'); else eventList">
          @for (rewards of currentItem(); track rewards.id) {
            <ui-award-box [item]="rewards" (collect)="collectReward($event)" />
          }
        </section>

        <ng-template #eventList>
          <section class="reward-list">
            @for (event of currentEvents(); track event.id) {
              <ui-event-box [event]="event" [progress]="state.progress()" (selected)="openEventDetail($event)" />
            }
          </section>
        </ng-template>

        <ui-event-detail-popup
          *ngIf="selectedEvent() as event"
          [event]="event"
          [priceItem]="eventPrice(event)"
          [primaryLabel]="eventPrimaryLabel(event)"
          [primaryDisabled]="isEventAlreadyActive(event)"
          [onPrimaryAction]="activateOrGoToEvent"
          [onDismiss]="closeEventDetail"
        />

        <ui-action-feedback-overlay
          [open]="!!purchaseFeedback()"
          [frame]="purchaseFeedback()?.frame"
          [text]="purchaseFeedback()?.text ?? ''"
          [variant]="purchaseFeedback()?.variant ?? 'gain'"
          [duration]="2500"
          ariaLabel="Oggetto acquistato"
          (closed)="purchaseFeedback.set(null)"
        />
      </div>
      <ui-floating-panel
        *ngIf="false"
        slot="fixed"
        title="Mario Rossi"
        subtitle="Cliente selezionato · Pratica #1234"
        initials="MR"
        status="active"
        [actions]="contextActions"
      >
      </ui-floating-panel>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ui-bottom-nav />
      </ion-toolbar>
    </ion-footer>
  `,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AwardPage implements OnInit {
  readonly state = inject(GameStateService);
  readonly nav = inject(AppNavigationService);
  readonly floating = inject(FloatingNavigationService);
  private readonly awardProgression = inject(AwardProgressionService);
  private readonly eventActivation = inject(EventActivationService);

  contextActions = this.floating.contextActions;
  readonly purchaseFeedback = signal<{
    frame: FrameItem;
    text: string;
    variant: "gain" | "sell" | "collect" | "open";
  } | null>(null);

  readonly tabs: UiTabItem[] = [
    {
      id: "reward",
      title: "Reward",
      frame: { name: "btn_star_large", effect: "none" },
      route: "",
      size: "lg",
    },
    {
      id: "event-daily",
      title: "Giornalieri",
      frame: { name: "chest-gift-pink", effect: "none" },
      route: "",
      size: "lg",
    },
    {
      id: "event-seasonal",
      title: "Stagionali",
      frame: { name: "btn_star_large", effect: "none" },
      route: "",
      size: "lg",
    },
    {
      id: "event-other",
      title: "Eventi",
      frame: { name: "btn_star_large", effect: "none" },
      route: "",
      size: "lg",
    },
  ];
  type: string = "reward";
  readonly currentItem = signal<AwardItem[]>([]);
  readonly currentEvents = signal<GameEvent[]>([]);
  readonly selectedEvent = signal<GameEvent | null>(null);
  private readonly syncRewardsFromCatalog = effect(() => {
    this.state.catalog();
    this.state.events();
    this.state.progress();
    this.updateCurrentItems();
  });

  ngOnInit(): void {
    const route = this.nav.getCurrentRoute();
    this.type = route.includes("event/daily") ? "event-daily" : route.includes("event/seasonal") ? "event-seasonal" : route.includes("event") ? "event-other" : "reward";
    this.updateCurrentItems();
  }

  onTabChange(tabId: string): void {
    this.type = tabId;
    this.updateCurrentItems();

    if (tabId.startsWith("event-")) {
      this.eventi(tabId);
      return;
    }
    this.rewards();
  }

  rewards(): void {
    this.nav.go("award/reward");
  }


  eventi(tabId = this.type): void {
    const segment = tabId === "event-daily" ? "daily" : tabId === "event-seasonal" ? "seasonal" : "other";
    this.nav.go(`award/event/${segment}`);
  }

  private updateCurrentItems(): void {
    if (this.type.startsWith("event-")) {
      this.currentItem.set([]);
      this.currentEvents.set(this.state.events()
        .filter((event) => this.matchesEventTab(event))
        .map((event) => ({ ...event })));
      return;
    }

    this.currentEvents.set([]);
    this.currentItem.set(
      this.awardProgression.resolveVisibleAwards(
        this.state.catalog().awards,
        this.state.progress(),
        undefined,
      ),
    );
  }

  openEventDetail(event: GameEvent): void {
    this.selectedEvent.set(event);
  }

  private matchesEventTab(event: GameEvent): boolean {
    if (this.type === "event-daily") return event.type === "daily" || event.reset?.type === "daily";
    if (this.type === "event-seasonal") return event.type === "seasonal";
    if (this.type === "event-other") return event.type !== "daily" && event.reset?.type !== "daily" && event.type !== "seasonal";
    return false;
  }

  readonly closeEventDetail = (): void => {
    this.selectedEvent.set(null);
  };

  readonly activateOrGoToEvent = async (event: GameEvent | null): Promise<void> => {
    if (!event) return;
    if (this.eventActivation.isActive(event, this.state.progress())) {
      this.selectedEvent.set(null);
      void this.nav.go(event.banner?.ctaRoute ?? "gameplay");
      return;
    }

    const nextProgress = this.eventActivation.activate(event, this.state.progress());
    if (!nextProgress) return;
    this.state.updateProgress(nextProgress);
    await this.state.persistProgressNow().catch(() => undefined);
    const rewardText = rewardPreviewText(event.reward) || 'Evento attivato';
    this.purchaseFeedback.set({
      frame: event.frame ?? event.framePanel ?? { name: 'btn_star_large', effect: 'none' },
      text: rewardText || 'Evento attivato',
      variant: "gain",
    });
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

  async collectReward(award: AwardItem): Promise<void> {
    if (award.state !== "collect") return;
    if (award.reward) {
      this.collectPrice(award.reward);
      this.purchaseFeedback.set({
        frame: award.reward.frame,
        text: `+${award.reward.amount ?? 1}`,
        variant: "gain",
      });
    }
    this.state.updateProgress(this.awardProgression.claimAward(this.state.progress(), award));
    await this.state.persistProgressNow().catch(() => undefined);
  }
  private collectPrice(price: PriceItem): void {
    const progress = this.state.progress();
    this.state.updateProgress({
      ...progress,
      coins: progress.coins + (price.type === "coin" ? price.amount : 0),
      gems: progress.gems + (price.type === "gem" ? price.amount : 0),
      dust: (progress.dust ?? 0) + (price.type === "dust" ? price.amount : 0),
      statistics: {
        ...progress.statistics,
      },
      lastUpdatedAt: new Date().toISOString(),
    });
  }
}
