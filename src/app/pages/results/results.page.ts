import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { IonContent, IonFooter, IonHeader, IonToolbar } from "@ionic/angular/standalone";

import { UIButtonComponent } from "src/app/shared/basic/ui-button.component";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { GameUtilsService } from "../../core/services/ui/formatting/game-utils.service";
import { MatchResultDetails, MatchResultService } from "../../core/services/gameplay/match-result.service";
import { UIHeaderComponent } from "../../shared/components/ui-header.component";
import { UIBottomNavComponent } from "../../shared/components/ui-bottom-nav.component";
import { UiSpriteComponent } from "../../shared/basic/ui-sprite.component";
import { UIBandComponent } from "../../shared/basic/ui-band.component";
import { UIProgressbarComponent } from "../../shared/basic/ui-progress-bar.component";
import { FrameItem, Progress } from "../../core/models/game.models";
import { ThemeService } from "../../core/services/app/theme/theme.service";
import { GameStateService } from "../../core/services/state/game-state.service";
import { StatisticType } from "../../core/models/remote/progress.models";
import { STATISTIC_AWARD_TIERS, STATISTIC_DEFINITIONS } from "../../core/config/statistics-awards.config";

type ResultRewardChip = {
  id: string;
  label: string;
  value: string;
  frame: FrameItem;
  detail?: string;
};

type ResultStatisticCard = {
  id: StatisticType;
  title: string;
  increment: number;
  current: number;
  target: number;
  percent: number;
  progress: Progress;
  description: string;
};

@Component({
  selector: "app-results",
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonFooter,
    UIButtonComponent,
    UIHeaderComponent,
    UIBottomNavComponent,
    UiSpriteComponent,
    UIBandComponent,
    UIProgressbarComponent,
    CommonModule,
  ],
  template: `
  <ion-header>
    <ion-toolbar class="results-toolbar">
      <ui-header title="Match Result" backPath="/hub"></ui-header>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div class="screen results-screen">
      <ng-container *ngIf="details() as detail; else noDetails">
        <section class="results-hero">
          <ui-sprite class="results-hero__bg" [frame]="modeFrame()" fit="cover" anchor="center" />
          <div class="results-hero__overlay">
            <div class="results-hero__hero">
              <ui-sprite class="results-hero__hero-frame" [frame]="heroFrame()" fit="contain" anchor="center" />
            </div>
            <div class="results-hero__copy">
              <span class="results-hero__eyebrow">{{ modeTitle() }}</span>
              <h1>{{ win ? 'Victory' : 'Defeat' }}</h1>
              <p>{{ detail.result.message }}</p>
            </div>
            <div class="results-hero__status">
              <ui-band [variant]="win ? 'secondary' : 'complementary'" [title]="win ? 'COMPLETED' : 'YOU LOSE'"></ui-band>
            </div>
          </div>
        </section>

        <section class="results-grid">
          <article class="results-card">
            <div class="results-card__title">Dettagli partita</div>
            <div class="result-info-grid">
              <div class="result-info-pill">
                <span>Livello partita</span>
                <strong>{{ detail.matchLevel }}</strong>
              </div>
              <div class="result-info-pill">
                <span>Score</span>
                <strong>{{ formatNumber(detail.result.score) }}</strong>
              </div>
              <div class="result-info-pill">
                <span>HP rimasti</span>
                <strong>{{ formatNumber(detail.result.remainingHealth) }}</strong>
              </div>
              <div class="result-info-pill">
                <span>Fatica finale</span>
                <strong>{{ formatNumber(detail.result.remainingFatigue) }}</strong>
              </div>
            </div>
          </article>

          <article class="results-card">
            <div class="results-card__title">Tesori e ricompense</div>
            <div class="reward-rail" aria-label="Lista orizzontale dei tesori e premi ottenuti">
              <div class="reward-chip" *ngFor="let item of rewardChips()">
                <div class="reward-chip__icon">
                  <ui-sprite [frame]="item.frame" fit="contain" anchor="center" />
                </div>
                <strong>{{ item.value }}</strong>
                <span>{{ item.label }}</span>
                <small *ngIf="item.detail">{{ item.detail }}</small>
              </div>
            </div>
          </article>

          <article class="results-card results-card--full">
            <div class="results-card__title">Statistiche incrementate</div>
            <div class="stats-list" *ngIf="statCards().length; else noStats">
              <div class="stat-card" *ngFor="let stat of statCards()">
                <div class="stat-card__head">
                  <div>
                    <strong>{{ stat.title }}</strong>
                    <span>{{ stat.description }}</span>
                  </div>
                  <div class="stat-card__delta">+{{ formatNumber(stat.increment) }}</div>
                </div>
                <ui-progress-bar
                  variant="secondary"
                  direction="horizontal"
                  labelDisplay="none"
                  [progress]="stat.progress" />
                <div class="stat-card__meta">
                  <span>{{ formatNumber(stat.current) }}/{{ formatNumber(stat.target) }}</span>
                  <strong>{{ stat.percent }}%</strong>
                </div>
              </div>
            </div>
          </article>
        </section>

        <div class="result-actions">
          <ui-button (pressed)="nav.go('/hub')">{{ win ? 'Claim' : 'Okay' }}</ui-button>
          <ui-button *ngIf="win" variant="secondary" (pressed)="nav.go('/store')">Watch x2</ui-button>
        </div>
      </ng-container>

      <ng-template #noDetails>
        <section class="results-empty">
          <ui-band variant="complementary" title="Nessun risultato disponibile"></ui-band>
          <p>Non sono presenti dettagli della partita corrente.</p>
          <ui-button (pressed)="nav.go('/hub')">Torna alla hub</ui-button>
        </section>
      </ng-template>

      <ng-template #noStats>
        <p class="results-empty-copy">Nessuna statistica incrementata in questa partita.</p>
      </ng-template>
    </div>
  </ion-content>

  <ion-footer>
    <ion-toolbar class="results-toolbar">
      <ui-bottom-nav />
    </ion-toolbar>
  </ion-footer>
`,
  styles: [`
    ion-header, ion-footer, .results-toolbar {
      --background: transparent;
      --border-color: transparent;
      background: transparent !important;
      box-shadow: none !important;
    }

    ion-content {
      --background: transparent;
    }

    .results-screen {
      display: grid;
      gap: 18px;
      padding: 14px 14px 110px;
    }

    .results-hero {
      position: relative;
      overflow: hidden;
      min-height: 220px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 26px;
      background: #151221;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
    }

    .results-hero__bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    .results-hero__overlay {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 110px minmax(0, 1fr);
      align-items: end;
      gap: 16px;
      min-height: 220px;
      padding: 18px;
      background: linear-gradient(180deg, rgba(11, 7, 24, 0.12) 0%, rgba(11, 7, 24, 0.84) 100%);
    }

    .results-hero__hero {
      align-self: center;
      display: grid;
      place-items: center;
      width: 100px;
      height: 100px;
      border: 2px solid rgba(255, 255, 255, 0.18);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.18);
    }

    .results-hero__hero-frame {
      width: 84px;
      height: 84px;
      filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.38));
    }

    .results-hero__copy {
      display: grid;
      gap: 6px;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.55);
    }

    .results-hero__copy h1 {
      margin: 0;
      font-size: 1.85rem;
      line-height: 1;
      color: #fff4bf;
    }

    .results-hero__copy p {
      margin: 0;
      color: rgba(255, 255, 255, 0.88);
      line-height: 1.35;
    }

    .results-hero__eyebrow {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #f8e7b5;
    }

    .results-hero__status {
      grid-column: 1 / -1;
      justify-self: start;
    }

    .results-grid {
      display: grid;
      gap: 16px;
    }

    .results-card {
      display: grid;
      gap: 12px;
      padding: 16px;
      border: 2px solid rgba(255, 255, 255, 0.18);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.18);
    }

    .results-card__title {
      color: #f8e7b5;
      font-size: 0.84rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .result-info-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .result-info-pill {
      display: grid;
      gap: 4px;
      padding: 12px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.07);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    }

    .result-info-pill span,
    .stat-card__head span,
    .reward-chip span,
    .reward-chip small,
    .results-empty-copy {
      color: rgba(255, 255, 255, 0.72);
    }

    .result-info-pill strong,
    .stat-card__head strong,
    .reward-chip strong,
    .stat-card__meta strong {
      color: #fff;
    }

    .reward-rail {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 4px;
      scrollbar-width: thin;
    }

    .reward-chip {
      flex: 0 0 104px;
      display: grid;
      gap: 6px;
      justify-items: center;
      padding: 12px 10px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.07);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
      text-align: center;
    }

    .reward-chip__icon {
      display: grid;
      place-items: center;
      width: 58px;
      height: 58px;
      border-radius: 16px;
      background: radial-gradient(circle at top, rgba(253, 230, 138, 0.28), rgba(15, 23, 42, 0.24));
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
    }

    .reward-chip__icon ui-sprite {
      width: 42px;
      height: 42px;
    }

    .stats-list {
      display: grid;
      gap: 12px;
    }

    .stat-card {
      display: grid;
      gap: 10px;
      padding: 14px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.06);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    }

    .stat-card__head {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 12px;
    }

    .stat-card__head > div:first-child {
      display: grid;
      gap: 4px;
    }

    .stat-card__delta {
      min-width: max-content;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(250, 204, 21, 0.16);
      color: #fde68a;
      font-weight: 900;
    }

    .stat-card__meta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 0.85rem;
    }

    .result-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .results-empty {
      display: grid;
      gap: 14px;
      justify-items: center;
      padding: 24px 18px 120px;
      text-align: center;
    }

    .results-empty p {
      margin: 0;
      color: rgba(255, 255, 255, 0.82);
    }

    @media (max-width: 720px) {
      .results-hero__overlay {
        grid-template-columns: 1fr;
      }

      .results-hero__hero {
        width: 88px;
        height: 88px;
      }

      .result-info-grid {
        grid-template-columns: 1fr;
      }

      .result-actions {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsPage implements OnInit {
  readonly nav = inject(AppNavigationService);
  private readonly route = inject(ActivatedRoute);
  private readonly utils = inject(GameUtilsService);
  private readonly matchResults = inject(MatchResultService);
  private readonly theme = inject(ThemeService);
  private readonly state = inject(GameStateService);

  readonly details = signal<MatchResultDetails | null>(null);
  win = false;

  readonly modeItem = computed(() => {
    const modeId = this.details()?.modeId;
    return this.theme.modes().find((mode) => mode.id === modeId) ?? null;
  });

  readonly modeTitle = computed(() => this.modeItem()?.title ?? this.details()?.modeId ?? "Game Mode");
  readonly modeFrame = computed<FrameItem>(() => this.modeItem()?.frame ?? { name: "none", effect: "none" });
  readonly heroFrame = computed<FrameItem>(() => this.state.currentHero()?.frame ?? { name: "hero", effect: "none" });

  readonly rewardChips = computed<ResultRewardChip[]>(() => {
    const detail = this.details();
    if (!detail) return [];
    const coinFrame: FrameItem = { name: "coin_single", effect: "none" };
    const gemFrame: FrameItem = { name: "crystal_single", effect: "none" };
    const chestFrame: FrameItem = { name: "chest", effect: "none" };

    return [
      {
        id: "coins-collected",
        label: "Coin raccolti",
        value: "+" + this.formatNumber(detail.reward.collectedCoins),
        frame: coinFrame,
      },
      {
        id: "gems-collected",
        label: "Gemme raccolte",
        value: "+" + this.formatNumber(detail.reward.collectedGems),
        frame: gemFrame,
      },
      {
        id: "coins-bonus",
        label: "Bonus coin",
        value: "+" + this.formatNumber(detail.reward.bonusCoins),
        frame: coinFrame,
      },
      {
        id: "gems-bonus",
        label: "Bonus gemme",
        value: "+" + this.formatNumber(detail.reward.bonusGems),
        frame: gemFrame,
      },
      {
        id: "boxes",
        label: "Box vinte",
        value: "+" + this.formatNumber(detail.reward.boxes),
        frame: chestFrame,
        detail: detail.reward.boxName || undefined,
      },
    ];
  });

  readonly statCards = computed<ResultStatisticCard[]>(() => {
    const detail = this.details();
    if (!detail) return [];

    const statistics = this.state.progress().statistics;

    return Object.entries(detail.statisticsIncremented)
      .filter(([, value]) => value > 0)
      .map(([key, increment]) => {
        const statisticType = key as StatisticType;
        const definition = STATISTIC_DEFINITIONS[statisticType];
        const tiers = STATISTIC_AWARD_TIERS[statisticType] ?? [];
        const current = statistics[statisticType] ?? Number(increment);
        const nextTier = tiers.find((tier) => current <= tier.target) ?? tiers[tiers.length - 1];
        const target = Math.max(1, nextTier?.target ?? current);
        const percent = Math.min(100, Math.round((current / target) * 100));

        return {
          id: statisticType,
          title: definition?.title ?? key,
          increment: Number(increment),
          current,
          target,
          percent,
          progress: {
            descr: definition?.title ?? key,
            current: Math.min(current, target),
            total: target,
          },
          description: definition?.description ?? "Progresso statistica",
        };
      });
  });

  ngOnInit(): void {
    this.win = this.route.snapshot.paramMap.get("status") === "win";
    this.details.set(this.matchResults.getLastDetails());
  }

  formatNumber(value: number | null | undefined): string {
    return this.utils.formatCompactNumber(value);
  }

  completedAtLabel(value: string | null | undefined): string {
    if (!value) return "-";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";

    return parsed.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
}
