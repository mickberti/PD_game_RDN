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
import { GameplaySession } from "../../core/models/gameplay-session.model";
import { RdnPuzzleService } from "../../core/services/gameplay/rnd-puzzle.service";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { RdnPhaserScene } from "../../core/game/phaser/rnd-phaser.scene";
import { RDN_MAX_LEVEL } from "../../core/game/rnd/levels.config";
import { GameStateService } from "../../core/services/state/game-state.service";
import { getPuzzleStars, hasPuzzleFailed } from "../../core/game/rnd/puzzle-score.policy";
import { RDN_ACTION_CATALOG, RdnActionInstance, validateRdnActionLoadout } from "../../core/game/rnd/rdn-actions.config";

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
  private readonly gameplaySession = inject(GameplaySessionService);
  private session: GameplaySession = this.gameplaySession.getActiveSession("adventure");
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
  private timeAttackEndAt?: number;
  private timeAttackPausedAt?: number;
  private timeAttackDurationSeconds?: number;
  private readonly outcome = signal<"win" | "lose" | null>(null);
  private readonly timeRemaining = signal<number | null>(null);
  private readonly timeRemainingMs = signal<number | null>(null);
  private readonly showInfo = signal(false);
  private readonly actionInstances = signal<RdnActionInstance[]>([]);
  constructor() {
    this.loadSessionPuzzle(this.session);
    this.resetActionInstances();
    const onVisibilityChange = () => this.handleTimeAttackVisibility();
    document.addEventListener("visibilitychange", onVisibilityChange);
    effect(() => {
      const nextSession = this.gameplaySession.activeSession();
      if (this.sameSession(nextSession, this.session)) return;
      this.session = nextSession;
      this.loadSessionPuzzle(nextSession);
      this.resetActionInstances();
      this.outcome.set(null);
      this.showInfo.set(false);
      this.resetTimeAttackTimer();
    }, { injector: this.injector });
    this.destroyRef.onDestroy(() => {
      this.hostResizeObserver?.disconnect();
      if (this.resizeFrame !== undefined) cancelAnimationFrame(this.resizeFrame);
      this.stopTimeAttackTimer();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      this.game?.destroy(true);
    });
  }
  ngAfterViewInit(): void {
    this.scene = new RdnPhaserScene({
      rotate: (direction, steps) =>
        this.dispatch({ type: "ROTATE", direction, steps }),
      impulse: () => this.impulse(),
      action: (slot) => this.useAction(slot),
      restart: () => this.restart(),
      undo: () => this.dispatch({ type: "UNDO" }),
      continue: () => this.continue(),
      retry: () => this.restart(),
      exit: () => this.exitGameplay(),
      info: () => this.showInfo.set(true),
      closeInfo: () => this.showInfo.set(false),
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
          flows: this.puzzle.flows(),
          queueStates: this.puzzle.queueStates(),
          actions: this.actionInstances().map((instance) => ({ icon: RDN_ACTION_CATALOG[instance.id].icon, charges: instance.charges, disabled: instance.charges <= 0 || !RDN_ACTION_CATALOG[instance.id].modes.includes(this.session.variant) })),
          modeLabel: this.session.variant === "free" ? "FREE" : this.session.variant === "time-attack" ? "TIME ATTACK" : "AVVENTURA",
          freeSettings: this.session.variant === "free" ? { difficulty: this.gameplaySession.getLaunchOverrides()?.freeDifficulty ?? "EASY", slotCount: this.gameplaySession.getLaunchOverrides()?.freeSlotCount ?? 4 } : undefined,
          outcome: this.outcome(),
          timeRemaining: this.timeRemaining(),
          timeRemainingMs: this.timeRemainingMs(),
          timeTotalSeconds: this.timeAttackDurationSeconds,
          showInfo: this.showInfo(),
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
    this.puzzle.saveAdventureRun();
    this.outcome.set(null);
    this.showInfo.set(false);
  }
  private impulse(): void {
    this.puzzle.dispatch({ type: "IMPULSE" });
    this.puzzle.saveAdventureRun();
    const failed = hasPuzzleFailed(this.puzzle.level(), this.puzzle.state());
    const won = this.puzzle.state().won && !failed;
    const queuesExhausted = this.session.variant === "time-attack" && this.puzzle.queueStates().every((queue) => queue.exhausted);
    if (won) {
      if (this.session.variant !== "free") this.recordCompletedLevel(getPuzzleStars(this.puzzle.level(), this.puzzle.state()));
      this.stopTimeAttackTimer();
    }
    if (won) this.outcome.set("win");
    else if (failed || queuesExhausted) this.finishTimeAttack("lose");
    else this.outcome.set(null);
  }
  private restart(): void {
    this.puzzle.dispatch({ type: "RESTART" });
    this.puzzle.saveAdventureRun();
    this.outcome.set(null);
    this.showInfo.set(false);
    this.resetTimeAttackTimer();
    this.resetActionInstances();
  }
  private continue(): void {
    if (this.session.variant === "free") {
      const overrides = this.gameplaySession.getLaunchOverrides();
      this.puzzle.load("free", 1, overrides?.freeDifficulty ?? "EASY", Math.floor(Math.random() * 0x7fffffff), overrides?.freeSlotCount);
      this.outcome.set(null); this.showInfo.set(false); return;
    }
    this.puzzle.load(
      this.session.variant,
      Math.min(RDN_MAX_LEVEL, this.puzzle.level().number + 1),
    );
    this.outcome.set(null);
    this.showInfo.set(false);
    this.resetTimeAttackTimer();
  }
  private resetTimeAttackTimer(): void {
    this.stopTimeAttackTimer();
    if (this.session.variant !== "time-attack") { this.timeRemaining.set(null); this.timeRemainingMs.set(null); this.timeAttackDurationSeconds = undefined; return; }
    const cost = this.puzzle.level().optimalCost;
    const seconds = Math.max(60, Math.min(180, 30 + (cost?.impulses ?? 0) * 3 + (cost?.rotationSteps ?? 0) * 2));
    this.timeAttackDurationSeconds = seconds;
    this.timeAttackEndAt = performance.now() + seconds * 1000;
    this.timeAttackPausedAt = undefined;
    const update = () => {
      if (this.timeAttackPausedAt !== undefined || this.timeAttackEndAt === undefined || this.outcome() !== null) return;
      const remainingMs = Math.max(0, this.timeAttackEndAt - performance.now());
      const remaining = Math.ceil(remainingMs / 1000);
      this.timeRemainingMs.set(remainingMs);
      this.timeRemaining.set(remaining);
      if (remainingMs === 0) this.finishTimeAttack("lose");
    };
    update();
    this.timeAttackTimer = setInterval(update, 250);
  }
  private stopTimeAttackTimer(): void {
    if (this.timeAttackTimer !== undefined) clearInterval(this.timeAttackTimer);
    this.timeAttackTimer = undefined;
    this.timeAttackEndAt = undefined;
    this.timeAttackPausedAt = undefined;
  }
  /** Time Attack pauses while the app is backgrounded; elapsed foreground time uses the monotonic performance clock. */
  private handleTimeAttackVisibility(): void {
    if (this.session.variant !== "time-attack" || this.timeAttackEndAt === undefined) return;
    const now = performance.now();
    if (document.hidden) { this.timeAttackPausedAt = now; return; }
    if (this.timeAttackPausedAt !== undefined) {
      this.timeAttackEndAt += now - this.timeAttackPausedAt;
      this.timeAttackPausedAt = undefined;
    }
  }
  private finishTimeAttack(outcome: "win" | "lose"): void {
    if (this.outcome() !== null) return;
    this.stopTimeAttackTimer();
    this.outcome.set(outcome);
  }
  private resetActionInstances(): void {
    const loadout = validateRdnActionLoadout(this.state.progress().rdnActionLoadout);
    this.actionInstances.set(loadout.actionIds.map((id) => ({ id, charges: RDN_ACTION_CATALOG[id].charges, cooldownUntil: 0 })));
  }
  private useAction(slot: number): void {
    const instance = this.actionInstances()[slot];
    if (!instance || instance.charges <= 0) return;
    const definition = RDN_ACTION_CATALOG[instance.id];
    if (!definition.modes.includes(this.session.variant) || this.outcome()) return;
    let applied = false;
    if (instance.id === "zero") applied = this.puzzle.zeroActiveTarget();
    if (instance.id === "freeze-time" && this.timeAttackEndAt !== undefined) { this.timeAttackEndAt += 5000; applied = true; }
    if (!applied) return;
    this.actionInstances.update((items) => items.map((item, index) => index === slot ? { ...item, charges: item.charges - 1 } : item));
  }
  private loadSessionPuzzle(session: GameplaySession): void {
    const overrides = this.gameplaySession.getLaunchOverrides();
    this.puzzle.load(session.variant, session.matchLevel, overrides?.freeDifficulty ?? "EASY", overrides?.freeSeed ?? 0, overrides?.freeSlotCount);
  }
  private exitGameplay(): void {
    // Leaving through the game UI always starts a fresh board on the next launch.
    this.puzzle.clearAdventureRun();
    void this.nav.go("/hub");
  }
  private sameSession(a: GameplaySession, b: GameplaySession): boolean {
    return a.launchId === b.launchId;
  }
  private recordCompletedLevel(stars: number): void {
    const completedLevel = this.puzzle.level().number;
    const modeId = this.session.modeId;
    const levelKey = String(completedLevel);
    this.state.mutateProgress((progress) => ({
      ...progress,
      gameModeLevels: {
        ...(progress.gameModeLevels ?? {}),
        [modeId]: Math.max(0, Math.min(RDN_MAX_LEVEL, Math.max(progress.gameModeLevels?.[modeId] ?? 0, completedLevel))),
      },
      gameModeLevelStars: {
        ...(progress.gameModeLevelStars ?? {}),
        [modeId]: {
          ...(progress.gameModeLevelStars?.[modeId] ?? {}),
          [levelKey]: Math.max(progress.gameModeLevelStars?.[modeId]?.[levelKey] ?? 0, Math.max(1, Math.min(3, stars))),
        },
      },
      lastUpdatedAt: new Date().toISOString(),
    }));
    void this.state.persistProgressNow().catch(() => undefined);
  }
}
