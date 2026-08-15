import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  ViewChild,
  effect,
  inject,
  signal,
} from "@angular/core";
import { IonContent } from "@ionic/angular/standalone";
import * as Phaser from "phaser";
import { GameplaySessionService } from "../../core/services/gameplay/gameplay-session.service";
import { RdnPuzzleService } from "../../core/services/gameplay/rnd-puzzle.service";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { RdnPhaserScene } from "../../core/game/phaser/rnd-phaser.scene";
import { RDN_MAX_LEVEL } from "../../core/game/rnd/levels.config";
import { GameStateService } from "../../core/services/state/game-state.service";

@Component({
  selector: "app-gameplay",
  standalone: true,
  imports: [IonContent],
  template: `<ion-content [fullscreen]="true" [scrollY]="false"
    ><div #gameHost class="rnd-phaser-host"></div
  ></ion-content>`,
  styles: [
    `
      :host,
      ion-content {
        display: block;
        height: 100%;
      }
      .rnd-phaser-host {
        width: 100%;
        height: 100%;
        min-height: 100dvh;
        background: #111;
        overflow: hidden;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
      }
      .rnd-phaser-host canvas {
        display: block;
        touch-action: none;
        pointer-events: auto;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameplayPageComponent implements AfterViewInit {
  @ViewChild("gameHost", { static: true })
  private readonly host!: ElementRef<HTMLDivElement>;
  private readonly session = inject(GameplaySessionService).getActiveSession(
    "adventure",
  );
  private readonly puzzle = inject(RdnPuzzleService);
  private readonly state = inject(GameStateService);
  private readonly nav = inject(AppNavigationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private game?: Phaser.Game;
  private scene?: RdnPhaserScene;
  private hostResizeObserver?: ResizeObserver;
  private resizeFrame?: number;
  private timeAttackTimer?: ReturnType<typeof setInterval>;
  private readonly outcome = signal<"win" | "lose" | null>(null);
  private readonly timeRemaining = signal<number | null>(null);
  constructor() {
    this.puzzle.load(this.session.variant, this.session.matchLevel);
    this.destroyRef.onDestroy(() => {
      this.hostResizeObserver?.disconnect();
      if (this.resizeFrame !== undefined) cancelAnimationFrame(this.resizeFrame);
      this.stopTimeAttackTimer();
      this.game?.destroy(true);
    });
  }
  ngAfterViewInit(): void {
    this.scene = new RdnPhaserScene({
      rotate: (direction, steps) =>
        this.dispatch({ type: "ROTATE", direction, steps }),
      impulse: () => this.impulse(),
      restart: () => this.restart(),
      undo: () => this.dispatch({ type: "UNDO" }),
      continue: () => this.continue(),
      retry: () => this.restart(),
      exit: () => void this.nav.go("/hub"),
    });
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.host.nativeElement,
      backgroundColor: "#111714",
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: Math.max(1, this.host.nativeElement.clientWidth),
        height: Math.max(1, this.host.nativeElement.clientHeight),
      },
      scene: [this.scene],
    });
    this.game.canvas.style.touchAction = "none";
    this.game.canvas.style.pointerEvents = "auto";
    this.game.canvas.style.display = "block";
    this.observeHostSize();
    effect(
      () => {
        const model = {
          level: this.puzzle.level(),
          state: this.puzzle.state(),
          previews: this.puzzle.previews(),
          nextPreviews: this.puzzle.nextPreviews(),
          outcome: this.outcome(),
          timeRemaining: this.timeRemaining(),
        };
        this.scene?.setModel(model);
      },
      { injector: this.injector },
    );
    this.resetTimeAttackTimer();
  }
  ionViewDidEnter(): void {
    this.resizeGame();
  }
  private observeHostSize(): void {
    this.hostResizeObserver = new ResizeObserver(() => this.resizeGame());
    this.hostResizeObserver.observe(this.host.nativeElement);
    this.resizeGame();
  }
  private resizeGame(): void {
    if (this.resizeFrame !== undefined) cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = requestAnimationFrame(() => {
      const width = this.host.nativeElement.clientWidth;
      const height = this.host.nativeElement.clientHeight;
      if (this.game && width > 0 && height > 0) this.game.scale.resize(width, height);
      this.resizeFrame = undefined;
    });
  }
  private dispatch(
    action: import("../../core/game/rnd/puzzle.types").PuzzleAction,
  ): void {
    this.puzzle.dispatch(action);
    this.outcome.set(null);
  }
  private impulse(): void {
    this.puzzle.dispatch({ type: "IMPULSE" });
    if (this.puzzle.state().won) { this.recordCompletedLevel(); this.stopTimeAttackTimer(); }
    this.outcome.set(
      this.puzzle.state().won
        ? "win"
        : this.puzzle.previews().some((preview) => preview.active)
          ? null
          : "lose",
    );
  }
  private restart(): void {
    this.puzzle.dispatch({ type: "RESTART" });
    this.outcome.set(null);
    this.resetTimeAttackTimer();
  }
  private continue(): void {
    this.puzzle.load(
      this.session.variant,
      Math.min(RDN_MAX_LEVEL, this.puzzle.level().number + 1),
    );
    this.outcome.set(null);
    this.resetTimeAttackTimer();
  }
  private resetTimeAttackTimer(): void {
    this.stopTimeAttackTimer();
    if (this.session.variant !== "time-attack") { this.timeRemaining.set(null); return; }
    const cost = this.puzzle.level().optimalCost;
    const seconds = Math.max(60, Math.min(180, 30 + (cost?.impulses ?? 0) * 3 + (cost?.rotationSteps ?? 0) * 2));
    const endAt = Date.now() + seconds * 1000;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      this.timeRemaining.set(remaining);
      if (remaining === 0) { this.stopTimeAttackTimer(); this.outcome.set("lose"); }
    };
    update();
    this.timeAttackTimer = setInterval(update, 250);
  }
  private stopTimeAttackTimer(): void {
    if (this.timeAttackTimer !== undefined) clearInterval(this.timeAttackTimer);
    this.timeAttackTimer = undefined;
  }
  private recordCompletedLevel(): void {
    const completedLevel = this.puzzle.level().number;
    const modeId = this.session.modeId;
    this.state.mutateProgress((progress) => ({
      ...progress,
      gameModeLevels: {
        ...(progress.gameModeLevels ?? {}),
        [modeId]: Math.max(0, Math.min(RDN_MAX_LEVEL, Math.max(progress.gameModeLevels?.[modeId] ?? 0, completedLevel))),
      },
      lastUpdatedAt: new Date().toISOString(),
    }));
    void this.state.persistProgressNow().catch(() => undefined);
  }
}
