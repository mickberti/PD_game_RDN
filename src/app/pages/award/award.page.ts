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

import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { AwardItem, FrameItem, PriceItem } from "../../core/models/game.models";
import { UIHeaderComponent } from "src/app/shared/components/ui-header.component";
import { UIBottomNavComponent } from "src/app/shared/components/ui-bottom-nav.component";
import { UIPrestigeChestComponent } from "../../shared/components/box/ui-prestige-box.component";
import { UIFloatingPanelComponent } from "../../shared/basic/ui-floating-panel.component";
import { GameStateService } from "../../core/services/state/game-state.service";
import { UIActionFeedbackOverlayComponent } from "../../shared/components/ui-action-feedback-overlay.component";
import { FloatingNavigationService } from "../../core/services/app/navigation/floating-navigation.service";
import { AwardProgressionService } from "../../core/services/progression/award-progression.service";

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
    UIPrestigeChestComponent,
    UIFloatingPanelComponent,
    UIActionFeedbackOverlayComponent,
],
  template: `
    <ion-header>
      <ion-toolbar>
        <ui-header title="Traguardi" backPath="/hub"></ui-header>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="screen task-screen">
        <ui-prestige-box
          *ngIf="false"
          variant="light"
          variantButton="secondary"
          buttonLabel="BUY"
          descrTitle="PRESTIGE"
          descrSubtitle="Prestige your account and reset all your progress for exclusive rewards and bonuses."
        />

        <section class="reward-list">
          @for (rewards of currentItem(); track rewards.id) {
            <ui-award-box [item]="rewards" (collect)="collectReward($event)" />
          }
        </section>

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

  contextActions = this.floating.contextActions;
  readonly purchaseFeedback = signal<{
    frame: FrameItem;
    text: string;
    variant: "gain" | "sell" | "collect" | "open";
  } | null>(null);

  readonly currentItem = signal<AwardItem[]>([]);
  private readonly syncRewardsFromCatalog = effect(() => {
    this.state.catalog();
    this.state.progress();
    this.updateCurrentItems();
  });

  ngOnInit(): void {
    this.updateCurrentItems();
  }

  private updateCurrentItems(): void {
    this.currentItem.set(
      this.awardProgression.resolveVisibleAwards(
        this.state.catalog().awards,
        this.state.progress(),
        undefined,
      ),
    );
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
