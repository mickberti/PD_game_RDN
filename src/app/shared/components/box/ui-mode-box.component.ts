import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject } from "@angular/core";
import { ModeItem, Progress } from "../../../core/models/game.models";
import { GameStateService } from "../../../core/services/state/game-state.service";
import { isAvailableNow } from "../../../core/services/utils/availability/availability.util";
import { UIProgressbarComponent } from "../../../shared/basic/ui-progress-bar.component";
import { UIProgressStarsComponent } from "../../basic/ui-progress-stars.component";
import { ModeMasteryProgressionService } from "../../../core/services/progression/mode-mastery-progression.service";
import { RDN_MAX_LEVEL } from "../../../core/game/rnd/levels.config";

@Component({
  selector: "ui-mode-box",
  standalone: true,
  imports: [CommonModule, UIProgressbarComponent, UIProgressStarsComponent],
  template: `
    <article class="mode-item" [class.mode-item--inactive]="!active()">
      <button type="button" class="mode-item__launch" [disabled]="!active()" (click)="select.emit(mode)">
        <div class="mode-item__background" [style.background-image]="backgroundImage()" aria-hidden="true"></div>
        <ui-progress-stars class="mode-item__mastery" [mastery]="mastery()" direction="vertical" />
        <div class="mode-item__overlay">
          <div class="mode-item__copy">
            <span class="mode-item__status" *ngIf="!active()">Non disponibile</span>
            <strong>{{ mode.title }}</strong>
            <span>{{ mode.description }}</span>
            <span class="mode-item__level">Livello {{ playableLevel() }} / {{ maxLevel }}</span>
            <span class="mode-item__stars">★ {{ totalStars() }} / {{ maxLevel * 3 }}</span>
            <ui-progress-bar *ngIf="progress() as itemProgress" direction="horizontal" [progress]="itemProgress" />
          </div>
        </div>
      </button>
      <button *ngIf="supportsLevelSelection()" type="button" class="mode-item__levels" [disabled]="!active()" (click)="selectLevels.emit(mode)" aria-label="Scegli un livello">
        ☷
      </button>
    </article>
  `,
  styles: [`
    :host { display: block; }

    .mode-item {
      position: relative;
      display: block;
      width: 100%;
      min-height: 180px;
      overflow: hidden;
      border: 0;
      border-radius: 24px;
      padding: 0;
    }
    .mode-item__launch {
      display: block;
      width: 100%;
      min-height: 180px;
      overflow: hidden;
      border: 2px solid rgba(255, 213, 74, 0.85);
      border-radius: 24px;
      padding: 0;
      color: #fff;
      background: #151221;
      box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
      text-align: left;
    }

    .mode-item__launch:not(:disabled), .mode-item__levels:not(:disabled) { cursor: pointer; }
    .mode-item--inactive { filter: grayscale(0.8); opacity: 0.62; }

    .mode-item__mastery { position: absolute; top: 12px; right: 12px; z-index: 2; width: 36px; height: 36px; }

    .mode-item__background {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      background-position: center;
      background-repeat: no-repeat;
      background-size: cover;
    }

    .mode-item__overlay {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      min-height: 180px;
      padding: 18px;
      background: linear-gradient(180deg, rgba(11, 7, 24, 0.06) 0%, rgba(11, 7, 24, 0.74) 100%);
      gap: 16px;
    }

    .mode-item__copy { display: grid; gap: 6px; max-width: 72%; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.55); }
    .mode-item__copy strong { font-size: 1.25rem; line-height: 1.1; }
    .mode-item__copy span { font-size: 0.9rem; line-height: 1.25; }
    .mode-item__status { width: fit-content; border-radius: 999px; padding: 3px 8px; background: rgba(0, 0, 0, 0.48); font-size: 0.72rem !important; text-transform: uppercase; letter-spacing: 0.06em; }
    .mode-item__level { width: fit-content; border: 1px solid rgba(255, 213, 74, 0.76); border-radius: 999px; padding: 3px 8px; background: rgba(12, 8, 3, 0.58); color: #ffe39a; font-size: 0.78rem !important; font-weight: 800; }
    .mode-item__stars { width: fit-content; border-radius: 999px; padding: 3px 8px; background: rgba(38, 20, 2, .68); color: #ffd75d; font-size: .78rem !important; font-weight: 800; }
    .mode-item__levels { position: absolute; z-index: 3; right: 12px; bottom: 12px; width: 42px; height: 42px; border: 1px solid rgba(255, 221, 119, .9); border-radius: 50%; color: #ffe8a1; background: rgba(17, 12, 5, .84); font-size: 1.45rem; line-height: 1; box-shadow: 0 3px 10px rgba(0, 0, 0, .55); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModeBoxComponent {
  @Input({ required: true }) mode!: ModeItem;
  @Output() select = new EventEmitter<ModeItem>();
  @Output() selectLevels = new EventEmitter<ModeItem>();

  private readonly state = inject(GameStateService);
  private readonly masteryProgression = inject(ModeMasteryProgressionService);
  readonly maxLevel = RDN_MAX_LEVEL;

  readonly active = computed(() => isAvailableNow(this.mode?.availability));
  readonly supportsLevelSelection = computed(() => this.mode?.id === "adventure" || this.mode?.id === "time-attack");
  readonly backgroundImage = computed(() => {
    const backgrounds: Readonly<Record<string, string>> = {
      adventure: "game-set2.png",
      "time-attack": "game-set3.png",
      free: "game-set4.png",
      ranked: "game-set5.png",
    };
    const filename = backgrounds[this.mode?.id] ?? "game-set2.png";
    return `url('/assets/ui/fantasy_bg/${filename}')`;
  });

  readonly masteryProgress = computed(() => this.masteryProgression.calculateFromNextMatchLevel(
    this.levelReached() + 1
  ));

  readonly levelReached = computed(() => Math.max(0, Math.min(this.maxLevel, this.state.progress().gameModeLevels?.[this.mode?.id] ?? 0)));
  /** The Hub shows the level that will actually start when this mode is selected. */
  readonly playableLevel = computed(() => Math.min(this.maxLevel, this.levelReached() + 1));
  readonly totalStars = computed(() => Object.values(this.state.progress().gameModeLevelStars?.[this.mode?.id] ?? {})
    .reduce((total, stars) => total + Math.max(0, Math.min(3, Number(stars) || 0)), 0));

  readonly mastery = computed(() => this.masteryProgress().mastery);

  readonly progress = computed<Progress | null>(() => {
    const configuredProgress = this.mode?.progress;
    if (!configuredProgress) {
      return this.masteryProgress().progress;
    }

    return {
      ...configuredProgress,
      ...this.masteryProgress().progress,
      descr: configuredProgress.descr || this.masteryProgress().progress.descr,
    };
  });
}
