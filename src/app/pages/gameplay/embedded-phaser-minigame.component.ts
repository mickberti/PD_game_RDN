import { CommonModule } from "@angular/common";
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from "@angular/core";
import Phaser from "phaser";
import { buildStandaloneMinigamePayload } from "../../core/game/minigames/minigame-launch.factory";
import { GameEventType } from "../../core/game/minigames/game-event.model";
import { MinigameResult, MinigameType } from "../../core/game/minigames/minigame.model";
import { StandaloneMinigameBootstrapScene } from "../../core/game/minigames/standalone-minigame-bootstrap.scene";
import { MinigameOverlayScene } from "../../core/game/phaser/minigame-overlay.scene";
import { HeroItem } from "../../core/models/game.models";
import { UIButtonComponent } from "../../shared/basic/ui-button.component";

@Component({
  selector: "app-embedded-phaser-minigame",
  standalone: true,
  imports: [CommonModule, UIButtonComponent],
  template: `
    <div class="standalone-minigame">
      <div #gameContainer class="standalone-minigame__canvas"></div>

      <section *ngIf="lastResult() as result" class="standalone-minigame__result">
        <strong>{{ result.eventType | titlecase }} · {{ result.grade | uppercase }}</strong>
        <span>
          Score {{ result.score }} · Reward x{{ result.rewardMultiplier }} · Damage {{ result.damageTaken }} · Fatigue {{ result.fatigueGained }}
        </span>
        <ui-button variant="secondary" size="sm" (pressed)="restartFromResult()">Restart minigioco</ui-button>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .standalone-minigame {
      display: grid;
      gap: 12px;
    }

    .standalone-minigame__canvas {
      display: grid;
      place-items: center;
      min-height: 660px;
      max-width: 420px;
      max-height: min(78dvh, 860px);
      margin-inline: auto;
      width: 100%;
      padding: 12px;
      border-radius: 18px;
      background: radial-gradient(circle at top, rgba(250, 204, 21, 0.12), transparent 20rem), rgba(2, 6, 23, 0.88);
      border: 1px solid rgba(148, 163, 184, 0.18);
      overflow: hidden;
    }

    .standalone-minigame__canvas canvas {
      display: block;
      max-width: 100%;
      max-height: 100%;
      margin: auto;
      image-rendering: auto;
    }

    .standalone-minigame__result {
      display: grid;
      gap: 8px;
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.84);
      border: 1px solid rgba(125, 211, 252, 0.24);
      color: #e2e8f0;
      justify-items: start;
    }

    .standalone-minigame__result strong {
      color: #fef3c7;
    }

    .standalone-minigame__result span {
      color: #cbd5e1;
      font-size: 14px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmbeddedPhaserMinigameComponent implements AfterViewInit, OnChanges, OnDestroy {
  private static readonly WIDTH = 400;
  private static readonly HEIGHT = 640;

  @Input({ required: true }) hero!: HeroItem;
  @Input({ required: true }) minigameType!: GameEventType;
  @Input() preferredMinigameType?: MinigameType;
  @Input() difficulty = 4;
  @Input() launchId = 0;
  @Output() readonly minigameResolved = new EventEmitter<MinigameResult>();

  @ViewChild("gameContainer", { static: true })
  private readonly gameContainer!: ElementRef<HTMLDivElement>;

  private readonly zone = inject(NgZone);
  private game?: Phaser.Game;
  private viewReady = false;

  readonly lastResult = signal<MinigameResult | null>(null);

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.restartMinigame();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewReady) {
      return;
    }

    if (changes["launchId"] || changes["hero"] || changes["minigameType"] || changes["preferredMinigameType"] || changes["difficulty"]) {
      this.restartMinigame();
    }
  }

  ngOnDestroy(): void {
    this.destroyGame();
  }

  restartFromResult(): void {
    this.restartMinigame();
  }

  private restartMinigame(): void {
    if (!this.hero || !this.minigameType) {
      return;
    }

    this.destroyGame();
    this.lastResult.set(null);

    const payload = buildStandaloneMinigamePayload({
      type: this.minigameType,
      hero: this.hero,
      difficulty: this.difficulty,
      preferredMinigameType: this.preferredMinigameType,
      onComplete: (result) => {
        this.zone.run(() => {
          this.lastResult.set(result);
          this.minigameResolved.emit(result);
        });
      },
    });

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.gameContainer.nativeElement,
      width: EmbeddedPhaserMinigameComponent.WIDTH,
      height: EmbeddedPhaserMinigameComponent.HEIGHT,
      backgroundColor: "#050816",
      render: {
        antialias: true,
        antialiasGL: true,
        pixelArt: false,
        roundPixels: false,
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: EmbeddedPhaserMinigameComponent.WIDTH,
        height: EmbeddedPhaserMinigameComponent.HEIGHT,
      },
      scene: [
        new StandaloneMinigameBootstrapScene(payload),
        new MinigameOverlayScene(),
      ],
    });
  }

  private destroyGame(): void {
    this.game?.destroy(true);
    this.game = undefined;
  }
}
