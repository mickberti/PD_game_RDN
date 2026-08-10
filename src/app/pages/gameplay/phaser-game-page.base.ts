import { AfterViewInit, Directive, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild, computed, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import Phaser from "phaser";
import { Subscription, filter } from "rxjs";
import { HERO_FATIGUE_GAMEPLAY_CONFIG, PHASER_SCENE_CONFIG } from "../../core/game/phaser/config/game-variables.config";
import { MinigameOverlayScene } from "../../core/game/phaser/minigame-overlay.scene";
import { RunSetupOverlayScene } from "../../core/game/phaser/run-setup-overlay.scene";
import { GameScene } from "../../core/game/phaser/game-scene";
import { buildHeroCombatTuning, buildMonsterCombatTuning, heroCombatTuningRows, scaleHeroCombatTuning } from "../../core/game/phaser/config/combat-tuning.config";
import {
  buildEventMinigameModeConfig,
  DEFAULT_EVENT_MINIGAME_MAX_STAT_INFLUENCE_PERCENT,
} from "../../core/game/phaser/config/event-minigame-mode.config";
import { getHeroSpriteAtlasSet } from "../../core/game/phaser/config/hero-atlas.config";
import { getMonsterSpriteAtlasSet } from "../../core/game/phaser/config/monster-atlas.config";
import { ChestItem, ChestTypeId, FrameItem, HeroItem, Progress, ResourceItem, ResourceTypeId } from "../../core/models/game.models";
import { GameplayDebugMinigameType, GameplaySessionVariant } from "../../core/models/gameplay-session.model";
import {
  GameResult,
  GameTheme,
  MonsterType,
  PhaserControlsOrientation,
  PhaserEventMinigameModeId,
  PhaserGameParams,
  PhaserGameplayRuntimeEvent,
} from "../../core/models/phaser-game-state.model";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { GameplaySessionService } from "../../core/services/gameplay/gameplay-session.service";
import { MatchResultService } from "../../core/services/gameplay/match-result.service";
import { PhaserGameEventsService } from "../../core/services/gameplay/phaser/phaser-game-events.service";
import { TimeAttackRankingService } from "../../core/services/gameplay/time-attack-ranking.service";
import { InventoryMutationService } from "../../core/services/inventory/inventory-mutation.service";
import { EventActivationService } from "../../core/services/progression/event-activation.service";
import { HeroProgressService } from "../../core/services/progression/hero-progress.service";
import { GameStateService } from "../../core/services/state/game-state.service";
import { ThemeService } from "../../core/services/app/theme/theme.service";
import { GameUtilsService } from "../../core/services/ui/formatting/game-utils.service";
import { JuiceDirective } from "../../core/directive/juice.directive";
import { LoggerService } from "src/app/core/services/infrastructure/logging/logger.service";
import { GameEffectKey, GameEffectOptions, HackSlashEffectTuning } from "../../core/game/phaser/effects/game-effects.manager";

type GameplayVariantViewModel = {
  subtitle: string;
  matchLabel: string;
  params: Partial<PhaserGameParams>;
};

type HealJuiceBubble = {
  id: string;
  left: number;
  bottom: number;
  heightScale: string;
  widthScale: string;
  sizeScale: string;
  delay: string;
};

@Directive()
export abstract class PhaserGamePageBase implements OnInit, AfterViewInit, OnDestroy {
  private static readonly GAME_WIDTH = 400;
  private static readonly GAME_HEIGHT = 640;
  protected readonly settingsAccordion = {
    hero: false,
    monsters: false,
  };
  @ViewChild("gameContainer")
  private readonly gameContainer?: ElementRef<HTMLDivElement>;
  @ViewChild("gameJuice", { static: true })
  private readonly gameJuice?: JuiceDirective;
  @ViewChild("lowHealthJuice", { static: true })
  private readonly lowHealthJuice?: JuiceDirective;
    @ViewChild("healthJuice", { static: true })
  private readonly healthJuice?: JuiceDirective;
  private healJuiceCleanupTimer?: ReturnType<typeof setTimeout>;

  protected abstract get gameplayVariant(): GameplaySessionVariant;
  protected abstract buildGameplayView(modeTitle: string): GameplayVariantViewModel;

  readonly state = inject(GameStateService);
  readonly heroProgress = inject(HeroProgressService);
  readonly events = inject(PhaserGameEventsService);
  readonly nav = inject(AppNavigationService);
  readonly utils = inject(GameUtilsService);
  readonly inventoryMutations = inject(InventoryMutationService);
  readonly gameplaySession = inject(GameplaySessionService);
  readonly theme = inject(ThemeService);
  private readonly matchResults = inject(MatchResultService);
  private readonly timeAttackRanking = inject(TimeAttackRankingService);
  private readonly eventActivation = inject(EventActivationService);
  readonly logger = inject(LoggerService); 

  selectedHero: HeroItem = (this.state.currentHero() ?? this.state.inventoryHeroes()[0]) as HeroItem;

  readonly themes: GameTheme[] = ["Dungeon", "Bosco", "Canyon", "Montagna", "Deserto"];
  readonly controlsOrientations: Array<{ value: PhaserControlsOrientation; label: string }> = [
    { value: "vertical", label: "Verticale" },
    { value: "horizontal", label: "Orizzontale" },
  ];
  readonly monsterTypes: Array<{ value: MonsterType; label: string }> = [
    { value: "goblin", label: "Goblin" },
    { value: "slime", label: "Melma" },
    { value: "bat", label: "Pipistrello" },
    { value: "skeletor", label: "Skeletor" },
  ];
  readonly monsterConfigTypes: MonsterType[] = ["goblin", "slime", "bat", "skeletor"];

  params!: PhaserGameParams;
  settingsOpen = false;
  gameResult: GameResult | null = null;
  private game?: Phaser.Game;
  private restartSub?: Subscription;
  private resultSub?: Subscription;
  private gameplayEventSub?: Subscription;
  private resultNavigationTimer?: ReturnType<typeof setTimeout>;
  private pendingDebugMinigameTimer?: ReturnType<typeof setTimeout>;
  private initialRunSetupTimer?: ReturnType<typeof setTimeout>;
  private createGameRetryTimer?: ReturnType<typeof setTimeout>;
  private gameScaleRefreshTimer?: ReturnType<typeof setTimeout>;
  private gameContainerResizeObserver?: ResizeObserver;
  private resultHandled = false;
  @Output() readonly gameResolved = new EventEmitter<GameResult>();
  readonly minigameStatusMessage = signal<string | null>(null);
  readonly healJuiceBubbles = signal<HealJuiceBubble[]>([]);
  readonly collectedCoinAmount = signal(0);
  readonly collectedGemAmount = signal(0);
  readonly collectedDustAmount = signal(0);
  readonly collectedChestAmount = signal(0);
  readonly livesValue = toSignal(this.events.lives$, { initialValue: 3 });
  readonly elapsedMsValue = toSignal(this.events.elapsedMs$, { initialValue: 0 });
  readonly manaValue = toSignal(this.events.mana$, { initialValue: 0 });
  readonly fatigueValue = toSignal(this.events.fatigue$, { initialValue: 0 });
  readonly experienceValue = toSignal(this.events.experience$, {
    initialValue: { descr: "XP", current: this.selectedHero?.experience?.current ?? 0, total: this.selectedHero?.experience?.total ?? 1 },
  });
  readonly currentModeItem = computed(() =>
    this.theme.modes().find((mode) => mode.id === (this.params?.modeId ?? this.activeSession.modeId)) ?? null,
  );

  get activeSession() {
    return this.gameplaySession.getActiveSession(this.gameplayVariant);
  }

  get gameplayView() {
    return this.buildGameplayView(this.activeSession.modeTitle);
  }

  get gameplaySubtitle(): string {
    return this.gameplayView.subtitle;
  }

  get gameplayMatchLabel(): string {
    return this.gameplayView.matchLabel;
  }

  get supportsEventMinigames(): boolean {
    return this.activeSession.variant === "adventure";
  }

  get isTimeAttackMode(): boolean {
    return this.activeSession.variant === "time-attack";
  }

  get showEventModeProbabilities(): boolean {
    return this.params?.showEventModeProbabilities ?? PHASER_SCENE_CONFIG.showEventModeProbabilitiesInHud;
  }

  get currentEventModeFrame(): FrameItem {
    switch (this.params?.eventMinigameMode?.modeId) {
      case "strength":
        return { name: "skill-fist", effect: "none" };
      case "dexterity":
        return { name: "skill-feather-arrow", effect: "none" };
      case "intelligence":
        return { name: "skill-magic-book", effect: "none" };
      case "luck":
        return { name: "skill-mask", effect: "none" };
      default:
        return { name: "none", effect: "none" };
    }
  }

  formatElapsedTime(value: number | null | undefined = this.elapsedMsValue()): string {
    const elapsedMs = Math.max(0, Math.floor(Number(value ?? 0)));
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((elapsedMs % 1000) / 10);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
  }

  ngOnInit(): void {
    this.params = this.buildInitialParams();
  }

  ngAfterViewInit(): void {
    this.events.restart();

    this.restartSub = this.events.restart$.subscribe(() => {
      this.gameResult = null;
      this.resultHandled = false;
      this.restartPhaserScene();
    });

    this.resultSub = this.events.result$
      .pipe(filter((result): result is GameResult => result !== null))
      .subscribe((result) => {
        this.handleGameResult(result);
      });

    this.gameplayEventSub = this.events.gameplayEvent$.subscribe((event) => {
      this.handleGameplayEvent(event);
    });

    this.bindGameContainerResize();
    this.createGame();
  }

  ngOnDestroy(): void {
    this.restartSub?.unsubscribe();
    this.resultSub?.unsubscribe();
    this.gameplayEventSub?.unsubscribe();
    if (this.resultNavigationTimer) clearTimeout(this.resultNavigationTimer);
    if (this.pendingDebugMinigameTimer) clearTimeout(this.pendingDebugMinigameTimer);
    if (this.initialRunSetupTimer) clearTimeout(this.initialRunSetupTimer);
    if (this.createGameRetryTimer) clearTimeout(this.createGameRetryTimer);
    if (this.gameScaleRefreshTimer) clearTimeout(this.gameScaleRefreshTimer);
    if (this.healJuiceCleanupTimer) clearTimeout(this.healJuiceCleanupTimer);
    this.gameContainerResizeObserver?.disconnect();
    this.destroyGameInstance();
  }

  formattedNumber(value: number | null | undefined): string {
    return this.utils.formatCompactNumber(value);
  }

  formatProbabilityPercent(value: number | null | undefined): string {
    return `${Math.round(Math.max(0, Number(value ?? 0)) * 100)}%`;
  }

  heroHealthProgress(): Progress {
    return this.createProgress("HP", this.livesValue(), this.selectedHero.heal?.total ?? 0);
  }

  heroManaProgress(): Progress {
    return this.createProgress("Mana", this.manaValue(), this.selectedHero.mana?.total ?? 0);
  }

  heroFatigueProgress(): Progress {
    return this.createProgress("Fatigue", this.fatigueValue(), this.selectedHero.fatigue?.total ?? 0);
  }

  heroExperienceProgress(): Progress {
    return this.experienceValue();
  }

  applySettingsAndRestart(): void {
    this.settingsOpen = false;
    this.resumePhaserScene();
    this.events.restart();
  }

  restart(): void {
    this.settingsOpen = false;
    this.resumePhaserScene();
    this.events.restart();
  }

  openSettings(): void {
    this.settingsOpen = true;
    this.pausePhaserScene();
  }

  launchDebugMinigame(type: "monster" | "trap" | "treasure"): void {
    const scene = this.getMainScene();
    scene?.launchDebugMinigame(type);
  }

  applyDebugEffectsTuning(tuning: HackSlashEffectTuning): void {
    this.getMainScene()?.applyDebugEffectsTuning(tuning);
  }

  playDebugEffect(
    effectKey: GameEffectKey,
    targetId: "hero" | "monster" | "center",
    options?: GameEffectOptions,
  ): boolean {
    return this.getMainScene()?.playDebugEffect(effectKey, targetId, options) ?? false;
  }

  applyEventMinigameMode(modeId: PhaserEventMinigameModeId): void {
    const config = buildEventMinigameModeConfig(
      modeId,
      this.selectedHero,
      DEFAULT_EVENT_MINIGAME_MAX_STAT_INFLUENCE_PERCENT,
    );
    this.params = {
      ...this.params,
      eventMinigameMode: config,
    };
    this.getMainScene()?.updateEventMinigameMode(config);
  }

  pauseMatch(): void {
    this.settingsOpen = true;
    this.pausePhaserScene();
  }

  resumeMatch(): void {
    this.settingsOpen = false;
    this.resumePhaserScene();
  }

  abandonMatch(): void {
    this.pausePhaserScene();
    this.handleGameResult({
      status: "lose",
      state: "gameover",
      title: "Partita abbandonata",
      message: `${this.selectedHero.title} ha abbandonato la partita.`,
      score: Number(this.events.score$.value ?? 0),
      heroName: this.selectedHero.title,
      remainingHealth: this.selectedHero.heal?.current ?? 0,
      remainingMana: this.selectedHero.mana?.current ?? 0,
      remainingFatigue: this.selectedHero.fatigue?.current ?? 0,
      completedAt: new Date().toISOString(),
      reason: "abandoned",
      modeId: this.params.modeId,
      matchLevel: this.params.matchLevel,
    });
  }

  toggleMonsterType(type: MonsterType, checked: boolean): void {
    const current = new Set(this.params.monsterTypes ?? []);
    if (checked) current.add(type);
    else current.delete(type);
    this.params.monsterTypes = Array.from(current);
  }

  hasMonsterType(type: MonsterType): boolean {
    return Boolean(this.params.monsterTypes?.includes(type));
  }

  toggleSettingsAccordion(section: "hero" | "monsters"): void {
    this.settingsAccordion[section] = !this.settingsAccordion[section];
  }

  finalHeroCombatRows(): Array<{ label: string; value: number }> {
    if (!this.selectedHero) {
      return heroCombatTuningRows(this.buildFallbackHeroCombatTuning());
    }

    return heroCombatTuningRows(this.buildEventAdjustedHeroCombatTuning(this.selectedHero));
  }

  setHero(hero: HeroItem): void {
    if (this.isHeroDead(hero)) {
      this.nav.go("/hero");
      return;
    }

    this.selectedHero = hero;
    const updatedEventMinigameMode = this.params.eventMinigameMode
      ? buildEventMinigameModeConfig(
        this.params.eventMinigameMode.modeId,
        hero,
        DEFAULT_EVENT_MINIGAME_MAX_STAT_INFLUENCE_PERCENT,
      )
      : undefined;
    this.params = {
      ...this.params,
      ...this.buildHeroAtlasParams(hero),
      hero,
      combatTuning: {
        ...this.params.combatTuning,
        hero: this.buildEventAdjustedHeroCombatTuning(hero),
      },
      eventMinigameMode: updatedEventMinigameMode,
    };
    this.events.setExperience(hero.experience ?? this.createProgress("XP", 0, 1));
    this.events.restart();
  }

  private buildInitialParams(): PhaserGameParams {
    const hero = this.state.currentHero() ?? this.state.inventoryHeroes()[0];
    const {
      eventMinigameMode: _ignoredEventMinigameMode,
      ...launchOverrides
    } = this.gameplaySession.getLaunchOverrides() ?? {};
    return {
      modeId: this.activeSession.modeId,
      matchLevel: this.activeSession.matchLevel,
      uiThemeId: this.theme.activeTheme(),
      showEventModeProbabilities: PHASER_SCENE_CONFIG.showEventModeProbabilitiesInHud,
      sections: 10,
      theme: "Dungeon",
      movementAxes: 4,
      initialLives: 3,
      treasuresPerSection: 3,
      trapsPerSection: 2,
      enemiesPerSection: 1,
      mobileControls: true,
      controlsOrientation: "vertical",
      useSpritesAndAnimations: true,
      useHeroAtlas: true,
      useMonsterAtlas: true,
      showArcadeBodyDebug: false,
      showCombatAreaDebug: false,
      ...(hero ? this.buildHeroAtlasParams(hero) : {}),
      ...this.buildMonsterAtlasParams(),
      hero,
      slotMachineGems: this.state.gems(),
      monsterLevel: this.activeSession.mastery,
      monsterTypes: ["goblin", "slime", "bat", "skeletor"],
      combatTuning: {
        hero: hero ? this.buildEventAdjustedHeroCombatTuning(hero) : this.buildFallbackHeroCombatTuning(),
        monsters: buildMonsterCombatTuning(),
      },
      ...this.gameplayView.params,
      ...launchOverrides,
    };
  }

  private isHeroDead(hero: HeroItem): boolean {
    return (hero.heal?.current ?? 0) <= 0 || (hero.fatigue?.current ?? 0) >= (hero.fatigue?.total ?? 1);
  }

  private buildEventAdjustedHeroCombatTuning(hero: HeroItem): ReturnType<typeof buildHeroCombatTuning> {
    const events = this.state.events();
    const progress = this.state.progress();
    return scaleHeroCombatTuning(buildHeroCombatTuning(hero), {
      attack: this.eventActivation.ruleMultiplier(events, progress, "attackGameMultiplier"),
      defense: this.eventActivation.ruleMultiplier(events, progress, "defenceGameMultiplier"),
      special: this.eventActivation.ruleMultiplier(events, progress, "specialGameMultiplier"),
    });
  }

  private buildFallbackHeroCombatTuning(): ReturnType<typeof buildHeroCombatTuning> {
    return buildHeroCombatTuning();
  }

  private buildHeroAtlasParams(hero: HeroItem): Pick<PhaserGameParams, "heroAtlasKey" | "heroAtlasImage" | "heroAtlasJson" | "heroAtlasDirections"> {
    const atlasSet = getHeroSpriteAtlasSet(hero);
    const downAtlas = atlasSet.directions.down;

    return {
      heroAtlasKey: downAtlas.key,
      heroAtlasImage: downAtlas.imageUrl,
      heroAtlasJson: downAtlas.atlasData,
      heroAtlasDirections: atlasSet.directions,
    };
  }

  private buildMonsterAtlasParams(): Pick<PhaserGameParams, "monsterAtlasKey" | "monsterAtlasImage" | "monsterAtlasJson" | "monsterAtlasDirections"> {
    const atlasSet = getMonsterSpriteAtlasSet();
    const downAtlas = atlasSet.directions.down;

    return {
      monsterAtlasKey: downAtlas.key,
      monsterAtlasImage: downAtlas.imageUrl,
      monsterAtlasJson: downAtlas.atlasData,
      monsterAtlasDirections: atlasSet.directions,
    };
  }

  private createProgress(descr: string, current: number | null | undefined, total: number | null | undefined): Progress {
    return {
      descr,
      current: Math.max(0, Number(current ?? 0)),
      total: Math.max(1, Number(total ?? 1)),
    };
  }

  private handleGameResult(result: GameResult): void {
    if (this.resultHandled) return;
    this.resultHandled = true;
    this.destroyGameInstance();
    this.gameResult = result;
    this.gameResolved.emit(result);
    this.matchResults.completeMatch(result, result.modeId ?? this.params.modeId ?? "default", result.matchLevel ?? this.params.matchLevel ?? 1);
    void this.timeAttackRanking.submitResult(result, this.selectedHero);
    this.heroProgress.applyMatchProgressGains(this.selectedHero.id, result);
    this.heroProgress.setHeroHealth(this.selectedHero.id, result.remainingHealth);
    this.heroProgress.applyMatchFatigueAndStartRest(this.selectedHero.id, result.remainingFatigue + HERO_FATIGUE_GAMEPLAY_CONFIG.matchCompletionAmount);
    this.selectedHero = this.state.currentHero();

    if (this.resultNavigationTimer) {
      clearTimeout(this.resultNavigationTimer);
    }

    this.nav.go("/results/" + (result.status === "win" ? "win" : "lose"));
  }

  private createGame(attemptsRemaining = 10): void {
    const gameHost = this.gameContainer?.nativeElement;
    const hostWidth = Math.round(gameHost?.clientWidth ?? 0);
    const hostHeight = Math.round(gameHost?.clientHeight ?? 0);

    if (!gameHost || hostWidth <= 0 || hostHeight <= 0) {
      if (attemptsRemaining > 1) {
        this.createGameRetryTimer = window.setTimeout(() => {
          this.createGameRetryTimer = undefined;
          this.createGame(attemptsRemaining - 1);
        }, 120);
      }
      return;
    }

    const currentHero = this.state.currentHero();
    if (!currentHero) {
      if (attemptsRemaining > 1) {
        this.createGameRetryTimer = window.setTimeout(() => {
          this.createGameRetryTimer = undefined;
          this.createGame(attemptsRemaining - 1);
        }, 180);
      }
      return;
    }

    if (this.createGameRetryTimer) {
      clearTimeout(this.createGameRetryTimer);
      this.createGameRetryTimer = undefined;
    }

    this.selectedHero = currentHero;
    this.resetCollectedTreasureSummary();
    this.events.setExperience(this.selectedHero.experience ?? this.createProgress("XP", 0, 1));
    if (this.isHeroDead(this.selectedHero)) {
      this.events.setState("gameover");
      this.nav.go("/hero");
      return;
    }

    this.events.setState("boot");
    this.destroyGameInstance();

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: gameHost,
      width: PhaserGamePageBase.GAME_WIDTH,
      height: PhaserGamePageBase.GAME_HEIGHT,

      render: {
        antialias: true,
        antialiasGL: true,
        pixelArt: false,
        roundPixels: false,
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: PhaserGamePageBase.GAME_WIDTH,
        height: PhaserGamePageBase.GAME_HEIGHT,
      },
      physics: {
        default: "arcade",
        arcade: { debug: false },
      },
      scene: [new GameScene(this.params, this.events), new MinigameOverlayScene(), new RunSetupOverlayScene()],
    });
    this.scheduleGameScaleRefresh();
    this.scheduleInitialRunSetupSelection();
    this.schedulePendingDebugMinigame();
  }

  private restartPhaserScene(): void {
    const currentHero = this.state.currentHero();
    if (!currentHero) {
      return;
    }

    this.selectedHero = currentHero;
    this.resetCollectedTreasureSummary();
    this.events.setExperience(this.selectedHero.experience ?? this.createProgress("XP", 0, 1));
    if (this.isHeroDead(this.selectedHero)) {
      this.events.setState("gameover");
      this.nav.go("/hero");
      return;
    }

    if (this.supportsEventMinigames) {
      this.params = {
        ...this.params,
        eventMinigameMode: undefined,
      };
    }

    const scene = this.game?.scene.getScene("GameScene") as GameScene | undefined;
    if (scene?.scene) {
      scene.scene.restart({
        ...this.params,
        modeId: this.activeSession.modeId,
        matchLevel: this.activeSession.matchLevel,
        monsterLevel: this.activeSession.mastery,
        hero: this.selectedHero,
        combatTuning: {
          ...this.params.combatTuning,
          hero: this.buildEventAdjustedHeroCombatTuning(this.selectedHero),
        },
        eventsService: this.events,
      });
      this.scheduleInitialRunSetupSelection();
      this.schedulePendingDebugMinigame();
      return;
    }

    this.destroyGameInstance();
    this.createGame();
  }

  private destroyGameInstance(): void {
    if (this.pendingDebugMinigameTimer) {
      clearTimeout(this.pendingDebugMinigameTimer);
      this.pendingDebugMinigameTimer = undefined;
    }

    if (this.initialRunSetupTimer) {
      clearTimeout(this.initialRunSetupTimer);
      this.initialRunSetupTimer = undefined;
    }

    if (this.createGameRetryTimer) {
      clearTimeout(this.createGameRetryTimer);
      this.createGameRetryTimer = undefined;
    }

    if (this.gameScaleRefreshTimer) {
      clearTimeout(this.gameScaleRefreshTimer);
      this.gameScaleRefreshTimer = undefined;
    }

    if (!this.game) {
      this.clearGameHost();
      return;
    }

    try {
      this.game.destroy(true);
    } finally {
      this.game = undefined;
      this.clearGameHost();
    }
  }

  private clearGameHost(): void {
    const gameHost = this.gameContainer?.nativeElement;
    if (gameHost) {
      gameHost.replaceChildren();
    }
  }

  private bindGameContainerResize(): void {
    const gameHost = this.gameContainer?.nativeElement;
    if (!gameHost || typeof ResizeObserver === "undefined") {
      return;
    }

    this.gameContainerResizeObserver?.disconnect();
    this.gameContainerResizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width <= 0 || height <= 0) {
        return;
      }

      if (!this.game) {
        this.createGame();
        return;
      }

      this.scheduleGameScaleRefresh();
    });

    this.gameContainerResizeObserver.observe(gameHost);
  }

  private scheduleGameScaleRefresh(): void {
    if (!this.game) {
      return;
    }

    if (this.gameScaleRefreshTimer) {
      clearTimeout(this.gameScaleRefreshTimer);
    }

    this.gameScaleRefreshTimer = window.setTimeout(() => {
      this.gameScaleRefreshTimer = undefined;
      try {
        this.game?.scale.refresh();
      } catch (error) {
        this.logger.logWarning("[PhaserGamePageBase] scale refresh failed", error);
      }
    }, 80);
  }

  private getMainScene(): GameScene | undefined {
    return this.game?.scene.getScene("GameScene") as GameScene | undefined;
  }

  private pausePhaserScene(): void {
    const scene = this.getMainScene();
    if (scene?.scene?.isActive()) {
      this.events.setState("paused");
      scene.scene.pause();
    }
  }

  private resumePhaserScene(): void {
    const scene = this.getMainScene();
    if (scene?.scene?.isPaused()) {
      scene.scene.resume();
      this.events.setState("playing");
    }
  }

  private handleGameplayEvent(event: PhaserGameplayRuntimeEvent): void {
    this.logger.logDebug("[GameplayEvent] handleGameplayEvent",event);

    if (event.type === "treasure-collected") {
      this.applyCollectedTreasureReward(event);
    }

    if (event.type === "slot-machine-gems") {
      const delta = Math.round(Number(event.values["delta"] ?? 0));
      if (delta) {
        this.state.mutateProgress((progress) => ({
          ...progress,
          gems: Math.max(0, progress.gems + delta),
          lastUpdatedAt: new Date().toISOString(),
        }));
      }
    }

    if (event.type === "minigame-started" || event.type === "minigame-completed") {
      this.minigameStatusMessage.set(event.message);
      setTimeout(() => {
        if (this.minigameStatusMessage() === event.message) {
          this.minigameStatusMessage.set(null);
        }
      }, 2200);
    }

    if (!event.juiceEffect) {
      return;
    }

    if (event.type === "hero-healed") {
      this.playHealJuice(event.juiceEffect);
    } else if (event.type === "hero-low-health") {
      this.lowHealthJuice?.play(event.juiceEffect);
    } else {
      this.gameJuice?.play(event.juiceEffect);
    }
  }

  private playHealJuice(juiceEffect: string): void {
    if (this.healJuiceCleanupTimer) {
      clearTimeout(this.healJuiceCleanupTimer);
    }
    this.logger.logDebug('[phaser-game-page.base] playHealJuice ',juiceEffect);
    this.healthJuice?.play(juiceEffect);
    this.healJuiceBubbles.set(this.createHealJuiceBubbles());
    this.healJuiceCleanupTimer = window.setTimeout(() => {
      this.healJuiceBubbles.set([]);
      this.healJuiceCleanupTimer = undefined;
    }, 6200);
  }

  private createHealJuiceBubbles(): HealJuiceBubble[] {
    const baseId = `${Date.now()}-${Math.round(Math.random() * 100000)}`;

    return Array.from({ length: 16 }, (_, index) => ({
      id: `heal-bubble-${baseId}-${index}`,
      left: 72 + Math.round(Math.random() * 220),
      bottom: 18 + Math.round(Math.random() * 30),
      heightScale: (1 + Math.random() * 1.35).toFixed(2),
      widthScale: (-0.7 + Math.random() * 1.4).toFixed(2),
      sizeScale: (0.3 + Math.random() * 0.5).toFixed(2),
      delay: (index * 0.12).toFixed(2),
    }));
  }

  private schedulePendingDebugMinigame(): void {
    const pendingDebugMinigame = this.gameplaySession.consumeDebugMinigame();
    if (!pendingDebugMinigame) {
      return;
    }

    if (this.pendingDebugMinigameTimer) {
      clearTimeout(this.pendingDebugMinigameTimer);
    }

    this.pendingDebugMinigameTimer = window.setTimeout(() => {
      this.launchPendingDebugMinigame(pendingDebugMinigame);
      this.pendingDebugMinigameTimer = undefined;
    }, 500);
  }

  private launchPendingDebugMinigame(type: GameplayDebugMinigameType): void {
    if (!this.supportsEventMinigames) {
      return;
    }

    const scene = this.getMainScene();
    scene?.launchDebugMinigame(type);
  }

  private shouldPromptEventMinigameModeSelection(): boolean {
    return this.supportsEventMinigames && !this.params.eventMinigameMode;
  }

  private scheduleInitialRunSetupSelection(attemptsRemaining = 12): void {
    if (!this.shouldPromptEventMinigameModeSelection()) {
      return;
    }

    if (this.initialRunSetupTimer) {
      clearTimeout(this.initialRunSetupTimer);
    }

    this.initialRunSetupTimer = window.setTimeout(() => {
      this.initialRunSetupTimer = undefined;

      if (!this.shouldPromptEventMinigameModeSelection()) {
        return;
      }

      const mainScene = this.getMainScene();
      if (!mainScene?.scene?.isActive()) {
        if (attemptsRemaining > 1) {
          this.scheduleInitialRunSetupSelection(attemptsRemaining - 1);
        }
        return;
      }

      const overlayScene = this.game?.scene.getScene("RunSetupOverlayScene");
      if (overlayScene?.scene?.isActive()) {
        return;
      }

      this.events.setState("paused");
      mainScene.scene.launch("RunSetupOverlayScene", {
        hero: this.selectedHero,
        parentSceneKey: "GameScene",
        onSelect: (modeId: PhaserEventMinigameModeId) => {
          this.applyEventMinigameMode(modeId);
          this.events.setState("playing");
        },
      });
      mainScene.scene.pause();
    }, 180);
  }

  private resetCollectedTreasureSummary(): void {
    this.collectedCoinAmount.set(0);
    this.collectedGemAmount.set(0);
    this.collectedDustAmount.set(0);
    this.collectedChestAmount.set(0);
  }

  private applyCollectedTreasureReward(event: PhaserGameplayRuntimeEvent): void {
    const treasureValue = Math.max(1, Number(event.values["treasureValue"] ?? 0));
    const rewardKind = String(event.values["rewardKind"] ?? "coins");
    const resourceTypeId = this.asOptionalString(event.values["resourceTypeId"]) as ResourceTypeId | undefined;
    const chestTypeId = this.asOptionalString(event.values["chestTypeId"]) as ChestTypeId | undefined;
    const catalogItemId = this.asOptionalString(event.values["catalogItemId"]);

    this.state.runProgressMutationBatch(() => {
      if (rewardKind === "coins") {
        this.collectedCoinAmount.update((value) => value + treasureValue);
        this.state.mutateProgress((progress) => ({ ...progress, coins: progress.coins + treasureValue, lastUpdatedAt: new Date().toISOString() }));
        return;
      }

      if (rewardKind === "gems") {
        this.collectedGemAmount.update((value) => value + treasureValue);
        this.state.mutateProgress((progress) => ({ ...progress, gems: progress.gems + treasureValue, lastUpdatedAt: new Date().toISOString() }));
        return;
      }

      if (rewardKind === "dust") {
        this.collectedDustAmount.update((value) => value + treasureValue);
        this.state.mutateProgress((progress) => ({ ...progress, dust: (progress.dust ?? 0) + treasureValue, lastUpdatedAt: new Date().toISOString() }));
        return;
      }

      if (rewardKind === "resource") {
        const resource = this.resolveResourceReward(resourceTypeId, catalogItemId);
        if (!resource) return;
        this.inventoryMutations.addInventoryResource(resource, treasureValue);
        return;
      }

      if (rewardKind === "box") {
        const chest = this.resolveChestReward(chestTypeId, catalogItemId);
        if (!chest) return;
        this.collectedChestAmount.update((value) => value + treasureValue);
        this.inventoryMutations.addInventoryChest(chest, treasureValue);
      }
    });
  }

  private resolveResourceReward(resourceTypeId?: ResourceTypeId, catalogItemId?: string): ResourceItem | undefined {
    const resources = this.state.catalog().resources;
    if (catalogItemId) {
      const exact = resources.find((item) => item.id === catalogItemId);
      if (exact) return exact;
    }

    if (resourceTypeId) {
      return resources.filter((item) => item.type.id === resourceTypeId).sort((left, right) => right.level - left.level)[0];
    }

    return resources[0];
  }

  private resolveChestReward(chestTypeId?: ChestTypeId, catalogItemId?: string): ChestItem | undefined {
    const boxes = this.state.catalog().boxes;
    if (catalogItemId) {
      const exact = boxes.find((item) => item.id === catalogItemId);
      if (exact) return exact;
    }

    if (chestTypeId) {
      return boxes.find((item) => item.type.id === chestTypeId) ?? this.state.inventoryChestes().find((item) => item.type.id === chestTypeId);
    }

    return boxes[0] ?? this.state.inventoryChestes()[0];
  }

  private asOptionalString(value: unknown): string | undefined {
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }
}
