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
import { RDN_MAX_LEVEL } from "../../core/game/phaser/config/levels.config";
import { GameStateService } from "../../core/services/state/game-state.service";
import { getPuzzleStars, hasPuzzleFailed } from "../../core/game/phaser/puzzle-score.policy";
import { RDN_ACTION_CATALOG, RDN_ACTION_IDS, RdnActionId, RdnActionInstance } from "../../core/game/phaser/config/rdn-actions.config";
import { ImpulseResolutionPlan } from "../../core/game/phaser/puzzle.types";
import { EffectPlaygroundService } from "../../core/services/gameplay/effect-playground.service";
import { EffectTutorialService } from "../../core/services/gameplay/effect-tutorial.service";
import { RDN_LEVEL_COIN_REWARDS, rdnCoinsForStars } from "../../core/game/phaser/config/rdn-level-rewards.config";
import { RdnRewardedAdService } from "../../core/services/gameplay/rdn-rewarded-ad.service";
import { StatisticType } from "../../core/models/remote/progress.models";

@Component({
  selector: "app-gameplay",
  standalone: true,
  imports: [IonContent],
  template: `<ion-content [fullscreen]="true" [scrollY]="false"
    ><div #gameHost class="rnd-phaser-host" [class.game-blocked]="resumePrompt()"></div>
    @if (resumePrompt()) {
      <div class="saved-run-backdrop" (pointerdown)="$event.stopPropagation()" (pointerup)="$event.stopPropagation()" (click)="$event.stopPropagation()">
        <section class="saved-run-panel" role="dialog" aria-modal="true" aria-labelledby="saved-run-title" (pointerdown)="$event.stopPropagation()" (pointerup)="$event.stopPropagation()">
          <span class="saved-run-eyebrow">PARTITA SALVATA</span>
          <h2 id="saved-run-title">Riprendere il livello?</h2>
          <p>È stata trovata una partita non completata per questo livello.</p>
          <div class="saved-run-actions"><button type="button" (pointerdown)="$event.stopPropagation()" (click)="continueSavedRun()">CONTINUA</button><button type="button" class="saved-run-secondary" (pointerdown)="$event.stopPropagation()" (click)="restartSavedRun()">RICOMINCIA</button></div>
        </section>
      </div>
    }
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
      .rnd-phaser-host.game-blocked { pointer-events: none; }
      .saved-run-backdrop { position: fixed; z-index: 10000; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(3, 5, 10, .76); pointer-events: auto; touch-action: none; }
      .saved-run-panel { width: min(430px, 100%); padding: 42px 38px 34px; color: #f7e9c7; text-align: center; background: url('/assets/ui/fantasy_bg/panel/panel2-set2.png') center / 100% 100% no-repeat; filter: drop-shadow(0 20px 30px rgba(0,0,0,.58)); }
      .saved-run-eyebrow { color: #e0b959; font-size: .72rem; font-weight: 900; letter-spacing: .12em; }
      .saved-run-panel h2 { margin: 8px 0 10px; color: #fff0ad; font-size: 1.45rem; }
      .saved-run-panel p { margin: 0 auto 24px; max-width: 290px; color: #d6e2d9; line-height: 1.4; }
      .saved-run-actions { display: grid; gap: 10px; }
      .saved-run-actions button { min-height: 44px; border: 1px solid #ffdf72; border-radius: 11px; color: #fff4bd; background: linear-gradient(180deg, #a76d1e, #623b12); font-weight: 900; letter-spacing: .08em; }
      .saved-run-actions .saved-run-secondary { border-color: rgba(255,212,105,.55); color: #d9d0b9; background: rgba(4,18,27,.72); }
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
  private readonly playground = inject(EffectPlaygroundService);
  private readonly effectTutorial = inject(EffectTutorialService);
  private readonly rewardedAd = inject(RdnRewardedAdService);
  readonly levelReward = signal<{ coins: number; bonusClaimed: boolean; adUnavailable: boolean } | null>(null);
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
  private readonly selectedGemIndex = signal<number | null>(null);
  private readonly selectedGearGemIndex = signal<number | null>(null);
  private readonly selectedLinkEffectId = signal<string | null>(null);
  readonly resumePrompt = signal(false);
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
      this.levelReward.set(null);
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
      impulse: () => this.resumePrompt() ? null : this.impulse(),
      action: (slot) => this.useAction(slot),
      restart: () => this.restart(),
      undo: () => this.dispatch({ type: "UNDO" }),
      continue: () => this.continue(),
      retry: () => this.restart(),
      exit: () => this.exitGameplay(),
      claimDoubleReward: () => this.claimDoubleReward(),
      info: () => this.showInfo.set(true),
      closeInfo: () => { this.showInfo.set(false); this.selectedGemIndex.set(null); this.selectedGearGemIndex.set(null); this.selectedLinkEffectId.set(null); },
      dismissTutorial: (id) => this.effectTutorial.markSeen(id),
      gemInfo: (index, source = "ring") => { this.showInfo.set(false); this.selectedLinkEffectId.set(null); this.selectedGemIndex.set(source === "ring" ? index : null); this.selectedGearGemIndex.set(source === "gear" ? index : null); },
      linkInfo: (effectId) => { this.showInfo.set(false); this.selectedGemIndex.set(null); this.selectedGearGemIndex.set(null); this.selectedLinkEffectId.set(effectId); },
      nextPlaygroundScenario: () => this.changePlaygroundScenario(1),
      previousPlaygroundScenario: () => this.changePlaygroundScenario(-1),
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
          effectPreviewEvents: this.puzzle.effectPreviewEvents(),
          queueStates: this.puzzle.queueStates(),
          actions: this.session.variant === "effect-playground" ? [] : this.actionInstances().map((instance) => ({ icon: RDN_ACTION_CATALOG[instance.id].icon, label: RDN_ACTION_CATALOG[instance.id].label, description: RDN_ACTION_CATALOG[instance.id].description, charges: instance.charges, disabled: instance.charges <= 0 })),
          modeLabel: this.session.variant === "effect-playground" ? "EFFECT PLAYGROUND" : this.session.variant === "free" ? "FREE" : this.session.variant === "time-attack" ? "TIME ATTACK" : "AVVENTURA",
          freeSettings: this.session.variant === "free" ? { difficulty: this.gameplaySession.getLaunchOverrides()?.freeDifficulty ?? "EASY", slotCount: this.gameplaySession.getLaunchOverrides()?.freeSlotCount ?? 4, effectsEnabled: this.gameplaySession.getLaunchOverrides()?.freeEffectsEnabled ?? false, theme: this.gameplaySession.getLaunchOverrides()?.freeTheme ?? 3 } : undefined,
          playground: this.session.variant === "effect-playground" ? { scenario: this.playground.scenario(), index: this.playground.index() + 1, total: 7, lines: [`Valori: ${this.puzzle.state().outerValues.join(", ")}`, `Eventi: ${this.puzzle.state().lastEffectEvents?.length ?? 0}`] } : undefined,
          tutorial: this.session.variant === "effect-playground" ? null : this.effectTutorial.tutorialForLevel(this.puzzle.level()),
          selectedGemIndex: this.selectedGemIndex(),
          selectedGearGemIndex: this.selectedGearGemIndex(),
          selectedLinkEffectId: this.selectedLinkEffectId(),
          outcome: this.outcome(),
          levelReward: this.levelReward() ?? undefined,
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
    action: import("../../core/game/phaser/puzzle.types").PuzzleAction,
  ): void {
    this.puzzle.dispatch(action);
    this.puzzle.saveAdventureRun();
    this.saveCurrentRun();
    this.outcome.set(null);
    this.showInfo.set(false);
    this.selectedGemIndex.set(null);
    this.selectedGearGemIndex.set(null);
    this.selectedLinkEffectId.set(null);
    if (action.type === "ROTATE" && action.steps > 0) this.incrementStatistics({ rotationsPerformed: action.steps });
  }
  private impulse(): ImpulseResolutionPlan | null {
    if (this.outcome() !== null) return null;
    if (this.puzzle.flows().some((flow) => !flow.interactable)) return null;
    const plan = this.puzzle.planImpulse();
    this.puzzle.dispatch({ type: "IMPULSE" });
    this.recordImpulseStatistics();
    this.puzzle.saveAdventureRun();
    this.saveCurrentRun();
    const failed = hasPuzzleFailed(this.puzzle.level(), this.puzzle.state());
    const won = this.completeWonLevel();
    const queuesExhausted = this.session.variant === "time-attack" && this.puzzle.queueStates().every((queue) => queue.exhausted);
    if (won) this.outcome.set("win");
    else if (failed || queuesExhausted) this.finishTimeAttack("lose");
    else this.outcome.set(null);
    return plan;
  }
  private restart(): void {
    this.puzzle.dispatch({ type: "RESTART" });
    this.puzzle.saveAdventureRun();
    this.saveCurrentRun();
    this.outcome.set(null);
    this.showInfo.set(false);
    this.selectedGemIndex.set(null);
    this.selectedGearGemIndex.set(null);
    this.selectedLinkEffectId.set(null);
    this.resetTimeAttackTimer();
    this.resetActionInstances();
    this.levelReward.set(null);
    if (this.session.variant !== "effect-playground") this.incrementStatistics({ gamesPlayed: 1 });
  }
  private continue(): void {
    if (this.session.variant === "effect-playground") { this.changePlaygroundScenario(1); return; }
    if (this.session.variant === "free") {
      const overrides = this.gameplaySession.getLaunchOverrides();
      this.puzzle.load("free", 1, overrides?.freeDifficulty ?? "EASY", Math.floor(Math.random() * 0x7fffffff), overrides?.freeSlotCount, overrides?.freeEffectSelections ?? overrides?.freeEffectsEnabled ?? false);
      this.outcome.set(null); this.showInfo.set(false); this.levelReward.set(null); return;
    }
    this.puzzle.load(
      this.session.variant,
      Math.min(RDN_MAX_LEVEL, this.puzzle.level().number + 1),
    );
    this.outcome.set(null);
    this.showInfo.set(false);
    this.levelReward.set(null);
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
    const inventory = this.state.inventoryActions();
    this.actionInstances.set(RDN_ACTION_IDS.map((id) => ({ id, charges: Math.max(0, inventory[id] ?? 0), cooldownUntil: 0 })));
  }
  private useAction(slot: number): void {
    if (this.session.variant === "effect-playground") return;
    const instance = this.actionInstances()[slot];
    if (!instance || instance.charges <= 0) return;
    const definition = RDN_ACTION_CATALOG[instance.id];
    if (!definition.modes.includes(this.session.variant) || this.outcome() || !this.canUseAction(instance.id)) return;
    let applied = false;
    if (instance.id === "zero") applied = this.puzzle.zeroActiveTarget();
    if (instance.id === "invert") applied = this.puzzle.invertActiveTarget();
    if (instance.id === "skip") applied = this.puzzle.skipCurrentFlow();
    if (instance.id === "destroy-fire-walls") applied = this.puzzle.destroyFireWalls();
    if (instance.id === "destroy-ice-walls") applied = this.puzzle.destroyIceWalls();
    if (instance.id === "destroy-stone-walls") applied = this.puzzle.destroyStoneWalls();
    if (instance.id === "cleanse-corruption") applied = this.puzzle.cleanseCorruption();
    if (instance.id === "break-chains") applied = this.puzzle.breakChains();
    if (!applied) return;
    const actionStatistics: Partial<Record<StatisticType, number>> = { actionsUsed: 1 };
    if (instance.id === "zero") actionStatistics.gemsReset = 1;
    if (instance.id === "invert") actionStatistics.signsInverted = 1;
    if (instance.id === "skip") actionStatistics.impulsesSkipped = 1;
    if (instance.id === "cleanse-corruption") actionStatistics.corruptionsCleansed = 1;
    if (instance.id === "break-chains") actionStatistics.chainsBroken = 1;
    if (instance.id === "destroy-fire-walls" || instance.id === "destroy-ice-walls" || instance.id === "destroy-stone-walls") {
      actionStatistics.wallsDestroyed = 1;
      actionStatistics.effectsResolved = 1;
    }
    this.incrementStatistics(actionStatistics);
    this.actionInstances.update((items) => items.map((item, index) => index === slot ? { ...item, charges: item.charges - 1 } : item));
    this.state.mutateProgress((progress) => ({ ...progress, inventory: { ...progress.inventory, actions: { ...progress.inventory.actions, [instance.id]: Math.max(0, (progress.inventory.actions[instance.id] ?? 0) - 1) }, }, lastUpdatedAt: new Date().toISOString() }));
    void this.state.persistProgressNow().catch(() => undefined);
    this.saveCurrentRun();
    if (this.completeWonLevel()) this.outcome.set("win");
  }
  /** User actions do not dispatch an impulse, so they must finalize victory themselves. */
  private completeWonLevel(): boolean {
    if (!this.puzzle.state().won || hasPuzzleFailed(this.puzzle.level(), this.puzzle.state())) return false;
    if (this.session.variant !== "free" && this.session.variant !== "effect-playground") this.levelReward.set(this.recordCompletedLevel(getPuzzleStars(this.puzzle.level(), this.puzzle.state())));
    this.stopTimeAttackTimer();
    if (this.session.variant !== "effect-playground") this.puzzle.clearSavedRun(this.session.variant as "adventure" | "time-attack" | "free");
    return true;
  }
  private incrementStatistics(updates: Partial<Record<StatisticType, number>>): void {
    this.state.mutateProgress((progress) => {
      const statistics = { ...progress.statistics };
      for (const [type, amount] of Object.entries(updates) as [StatisticType, number][]) if (amount > 0) statistics[type] = (statistics[type] ?? 0) + amount;
      return { ...progress, statistics, lastUpdatedAt: new Date().toISOString() };
    });
  }
  private recordImpulseStatistics(): void {
    const events = this.puzzle.state().lastEffectEvents ?? [];
    const count = (...types: string[]): number => events.filter((event) => types.includes(event.type)).length;
    const specials = this.puzzle.state().lastOperationResults.filter((result) => result.valid && result.resourceConsumed).length;
    this.incrementStatistics({
      impulsesPlayed: 1,
      effectsResolved: count("SHIELD_DEPLETED", "WALL_BROKEN", "ICE_BROKEN", "FIRE_BROKEN", "TIMER_COMPLETED", "MIRROR_APPLIED", "GEM_AMPLIFIER_APPLIED", "GEM_INVERTER_APPLIED", "AREA_TRIGGERED", "AREA_ICE_TRIGGERED", "AREA_INVERTER_TRIGGERED"),
      wallsDestroyed: count("WALL_BROKEN", "ICE_BROKEN", "FIRE_BROKEN"), shieldsResolved: count("SHIELD_DEPLETED"),
      linksActivated: count("FLOW_PROPAGATED"), areasTriggered: count("AREA_TRIGGERED", "AREA_ICE_TRIGGERED", "AREA_INVERTER_TRIGGERED"), specialOperatorsUsed: specials,
      timersCompleted: count("TIMER_COMPLETED"), mirrorsApplied: count("MIRROR_APPLIED"),
      amplifiersApplied: count("GEM_AMPLIFIER_APPLIED"), invertersApplied: count("GEM_INVERTER_APPLIED", "AREA_INVERTER_APPLIED"),
      elementalBypasses: count("ELEMENTAL_BYPASSED"),
    });
  }
  private claimDoubleReward(): void {
    const reward = this.levelReward();
    if (!reward || reward.bonusClaimed || reward.adUnavailable) return;
    void this.rewardedAd.showLevelCompletionAd().then((watched) => {
      if (!watched) { this.levelReward.update((current) => current ? { ...current, adUnavailable: true } : current); return; }
      this.state.mutateProgress((progress) => ({ ...progress, coins: progress.coins + reward.coins, lastUpdatedAt: new Date().toISOString() }));
      void this.state.persistProgressNow().catch(() => undefined);
      this.levelReward.update((current) => current ? { ...current, bonusClaimed: true } : current);
    });
  }
  private canUseAction(id: RdnActionId): boolean {
    if (id === "zero") return this.puzzle.canZeroActiveTarget();
    if (id === "invert") return this.puzzle.canInvertActiveTarget();
    if (id === "skip") return this.puzzle.canSkipCurrentFlow();
    if (id === "destroy-fire-walls") return this.puzzle.canDestroyFireWalls();
    if (id === "destroy-ice-walls") return this.puzzle.canDestroyIceWalls();
    if (id === "destroy-stone-walls") return this.puzzle.canDestroyStoneWalls();
    if (id === "cleanse-corruption") return this.puzzle.canCleanseCorruption();
    return this.puzzle.canBreakChains();
  }
  private async loadSessionPuzzle(session: GameplaySession): Promise<void> {
    if (session.variant === "effect-playground") { this.puzzle.loadDebugLevel(this.playground.level()); return; }
    const overrides = this.gameplaySession.getLaunchOverrides();
    await this.puzzle.load(session.variant, session.matchLevel, overrides?.freeDifficulty ?? "EASY", overrides?.freeSeed ?? 0, overrides?.freeSlotCount, overrides?.freeEffectSelections ?? overrides?.freeEffectsEnabled ?? false);
    this.incrementStatistics({ gamesPlayed: 1 });
    const levelId = this.puzzle.level().id;
    if (this.puzzle.hasSavedRun(session.variant, levelId)) this.resumePrompt.set(true);
  }
  async continueSavedRun(): Promise<void> { this.resumePrompt.set(false); const overrides = this.gameplaySession.getLaunchOverrides(); await this.puzzle.restoreSavedRun(this.session.variant as "adventure" | "time-attack" | "free", this.session.matchLevel, overrides?.freeSeed, overrides?.freeSlotCount); this.resetTimeAttackTimer(); }
  restartSavedRun(): void { this.resumePrompt.set(false); this.puzzle.clearSavedRun(this.session.variant as "adventure" | "time-attack" | "free"); this.puzzle.dispatch({ type: "RESTART" }); }
  private saveCurrentRun(): void { if (this.session.variant === "effect-playground") return; const overrides = this.gameplaySession.getLaunchOverrides(); this.puzzle.saveCurrentRun(this.session.variant as "adventure" | "time-attack" | "free", overrides?.freeSeed, overrides?.freeSlotCount); }
  private changePlaygroundScenario(direction: -1 | 1): void {
    if (this.session.variant !== "effect-playground") return;
    if (direction > 0) this.playground.next(); else this.playground.previous();
    this.puzzle.loadDebugLevel(this.playground.level());
    this.outcome.set(null); this.showInfo.set(false); this.selectedGemIndex.set(null); this.selectedGearGemIndex.set(null); this.selectedLinkEffectId.set(null);
  }
  private exitGameplay(): void {
    void this.nav.go("/hub");
  }
  private sameSession(a: GameplaySession, b: GameplaySession): boolean {
    return a.launchId === b.launchId;
  }
  private recordCompletedLevel(stars: number): { coins: number; bonusClaimed: boolean; adUnavailable: boolean } {
    const completedLevel = this.puzzle.level().number;
    const modeId = this.session.modeId;
    const levelKey = String(completedLevel);
    const normalizedStars = Math.max(1, Math.min(3, Math.floor(stars)));
    const previousStars = Math.max(0, Math.min(3, this.state.progress().gameModeLevelStars?.[modeId]?.[levelKey] ?? 0));
    const coins = previousStars >= 3 ? RDN_LEVEL_COIN_REWARDS.perfectReplayCoins : Math.max(0, rdnCoinsForStars(normalizedStars) - (previousStars > 0 ? rdnCoinsForStars(previousStars) : 0));
    this.state.mutateProgress((progress) => ({
      ...progress,
      coins: progress.coins + coins,
      statistics: {
        ...progress.statistics,
        levelsCompleted: (progress.statistics.levelsCompleted ?? 0) + 1,
        highestLevelReached: Math.max(progress.statistics.highestLevelReached ?? 0, completedLevel),
      },
      gameModeLevels: {
        ...(progress.gameModeLevels ?? {}),
        [modeId]: Math.max(0, Math.min(RDN_MAX_LEVEL, Math.max(progress.gameModeLevels?.[modeId] ?? 0, completedLevel))),
      },
      gameModeLevelStars: {
        ...(progress.gameModeLevelStars ?? {}),
        [modeId]: {
          ...(progress.gameModeLevelStars?.[modeId] ?? {}),
          [levelKey]: Math.max(progress.gameModeLevelStars?.[modeId]?.[levelKey] ?? 0, normalizedStars),
        },
      },
      lastUpdatedAt: new Date().toISOString(),
    }));
    void this.state.persistProgressNow().catch(() => undefined);
    return { coins, bonusClaimed: false, adUnavailable: false };
  }
}
