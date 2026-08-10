import { CommonModule } from "@angular/common";
import { Component, CUSTOM_ELEMENTS_SCHEMA, computed, inject, signal } from "@angular/core";
import { IonContent } from "@ionic/angular/standalone";

import { WELCOME_STORY_STEPS } from "../../core/config/welcome-bonus.config";
import { FrameItem, OpenedRewardItem } from "../../core/models/game.models";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { WelcomeBonusService } from "../../core/services/inventory/rewards/welcome-bonus.service";
import { UIButtonComponent } from "../../shared/basic/ui-button.component";
import { UiSpriteComponent } from "../../shared/basic/ui-sprite.component";
import { UIActionFeedbackOverlayComponent, ActionFeedbackFrameItem } from "../../shared/components/ui-action-feedback-overlay.component";
import { LoggerService } from "src/app/core/services/infrastructure/logging/logger.service";
import { UIPanelComponent } from "../../shared/basic/ui-panel.component";
import { AnimateOnVisibleDirective } from "src/app/core/directive/AnimateOnVisibleDirective";

@Component({
  selector: "app-welcome",
  standalone: true,
  imports: [CommonModule, IonContent, UIButtonComponent, UiSpriteComponent, UIActionFeedbackOverlayComponent, UIPanelComponent, AnimateOnVisibleDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styleUrls: ["./welcome.page.scss"],
  template: `
    <ion-content>
      <main class="screen welcome-screen">
        <section class="welcome-hero">
          <div class="panel-title">Benvenuto nell'arena</div>
          <p>Scorri la storia, raggiungi il tesoro e apri il pacchetto bonus per partire con eroe, box e valute.</p>
        </section>

        <section class="welcome-gallery-shell">
          <swiper-container
            class="welcome-gallery"
            aria-label="Storia introduttiva"
            slides-per-view="auto"
            space-between="18"
            grab-cursor="true"
            pagination="true"
            keyboard="true"
          >
            @for (step of steps; track step.id; let index = $index) {
              <swiper-slide class="welcome-slide">
                <ui-panel [variant]="'dark'" title="{{ step.eyebrow }}">
                  <div class="welcome-card__art">
                    <ui-sprite [frame]="step.frame" [fit]="'cover'" />
                  </div>
                  <div class="welcome-card__copy" appAnimateOnVisible="fx-slideUpAnimation" [threshold]="0.4">
                    <div class="panel-title">{{ step.title }}</div>
                    <div>{{ step.text }}</div>
                  </div>
                </ui-panel>
              </swiper-slide>
            }

            <swiper-slide class="welcome-slide">
              <ui-panel [variant]="'dark'" title="Ricompense">
                <div class="welcome-card__box">
                  <ui-sprite [frame]="bonusFrame()" />
                </div>
                <div class="welcome-card__copy">
                  <div class="panel-title">{{ claimed() ? "Tesoro riscosso" : "Pacchetto bonus pronto" }}</div>
                  <div>Contiene 1 eroe mastery 1 variante 1 livello 1 casuale, 1 equipaggiamento mastery 1 variante 1 livello 1 casuale, 5 box mastery 1, 2 box mastery 2, 2000 coin e 50 gemme.</div>
                  <ui-button variant="primary" particleMode="part3" [disabled]="claimed() || feedbackOpen()" (pressed)="start()">
                    {{ claimed() ? "Già aperto" : "Inizia" }}
                  </ui-button>
                </div>
              </ui-panel>
            </swiper-slide>
          </swiper-container>
        </section>

        <ui-action-feedback-overlay
          [open]="feedbackOpen()"
          [frames]="feedbackFrames()"
          variant="open"
          [duration]="1600"
          [frameDelay]="250"
          [blocking]="true"
          [advanceOnClick]="true"
          ariaLabel="Ricompense pacchetto benvenuto"
          (sequenceEnded)="finish()"
          (closed)="finish()"
        />
      </main>
    </ion-content>
  `,
})
export class WelcomePage {
  private readonly welcomeBonus = inject(WelcomeBonusService);
  private readonly nav = inject(AppNavigationService);
  private readonly logger = inject(LoggerService);

  readonly steps = WELCOME_STORY_STEPS;
  readonly claimed = signal(this.welcomeBonus.hasClaimed());
  readonly feedbackOpen = signal(false);
  readonly rewards = signal<OpenedRewardItem[]>([]);
  readonly bonusFrame = computed<FrameItem>(() => this.welcomeBonus.bonusChest.frame);

  readonly feedbackFrames = computed<ActionFeedbackFrameItem[]>(() =>
    this.rewards().map((reward) => ({
      frame: reward.frame,
      text: `${reward.title} + ${reward.quantity}`,
      duration: reward.rewardType === "hero" ? 1900 : 1500,
      delayAfter: 200,
    })),
  );

  start(): void {
    const rewards = this.welcomeBonus.claim();
    this.logger.logInfo("[WelcomePage] claim rewards", rewards);
    this.rewards.set(rewards);
    this.claimed.set(true);
    this.feedbackOpen.set(rewards.length > 0);
    if (!rewards.length) this.finish();
  }

  finish(): void {
    this.feedbackOpen.set(false);
    this.nav.go("/hub");
  }
}
