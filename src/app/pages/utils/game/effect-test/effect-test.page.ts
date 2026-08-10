import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, ViewChild, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonContent, IonFooter, IonToolbar } from "@ionic/angular/standalone";
import { Router } from "@angular/router";
import {
  buildEventMinigameModePreview,
  EVENT_MINIGAME_MODE_ORDER,
} from "src/app/core/game/phaser/config/event-minigame-mode.config";
import { getDefaultMinigamePlugins } from "src/app/core/game/minigames/minigame-plugin.registry";
import {
  EffectDirection,
  GameEffectKey,
  GameEffectOptions,
  HackSlashEffectTuning,
} from "src/app/core/game/phaser/effects/game-effects.manager";
import {
  GameplayDebugMinigameType,
  GameplaySessionVariant,
} from "src/app/core/models/gameplay-session.model";
import {
  GameResult,
  GameTheme,
  MonsterType,
  PhaserCombatTuningParams,
  PhaserControlsOrientation,
  PhaserEventMinigameModeId,
  PhaserSceneSpriteSizingParams,
} from "src/app/core/models/phaser-game-state.model";
import { buildHeroCombatTuning, buildMonsterCombatTuning } from "src/app/core/game/phaser/config/combat-tuning.config";
import { PHASER_SCENE_CONFIG } from "src/app/core/game/phaser/config/game-variables.config";
import { ThemeService } from "src/app/core/services/app/theme/theme.service";
import { GameplaySessionService } from "src/app/core/services/gameplay/gameplay-session.service";
import { HeroProgressService } from "src/app/core/services/progression/hero-progress.service";
import { GameStateService } from "src/app/core/services/state/game-state.service";
import { UIButtonComponent } from "src/app/shared/basic/ui-button.component";
import { UiSpriteComponent } from "src/app/shared/basic/ui-sprite.component";
import { UIBottomUtilsComponent } from "src/app/shared/components/ui-bottom-utils.component";
import { UiUtilsPageHeaderComponent } from "src/app/shared/components/ui-utils-page-header.component";
import { buildGameplayVariantView } from "src/app/pages/gameplay/gameplay-variant-defaults";
import { EmbeddedPhaserGameComponent } from "src/app/pages/gameplay/embedded-phaser-game.component";
import {
  cloneEffectTuning,
  EFFECT_FIELD_SCHEMAS,
  EffectFieldSchema,
  EffectOptionState,
  EffectTargetId,
  formatColorInput,
  GLOBAL_EFFECT_FIELD_SCHEMAS,
  GlobalEffectFieldKey,
  parseColorInput,
} from "./effect-test.shared";

type TesterLaunch = { id: number; kind: "full-game"; variant: GameplaySessionVariant };
type HeroCombatTuningState = NonNullable<NonNullable<PhaserCombatTuningParams["hero"]>>;
type MonsterCombatTuningState = NonNullable<NonNullable<PhaserCombatTuningParams["monsters"]>>;
type AreaKind = "attack" | "special" | "defense";

@Component({
  selector: "app-effect-test-page",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonFooter,
    IonToolbar,
    UIButtonComponent,
    UiSpriteComponent,
    UIBottomUtilsComponent,
    UiUtilsPageHeaderComponent,
    EmbeddedPhaserGameComponent,
  ],
  templateUrl: "./effect-test.page.html",
  styleUrls: ["./effect-test.page.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EffectTestPage {
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);
  private readonly state = inject(GameStateService);
  private readonly heroProgress = inject(HeroProgressService);
  private readonly gameplaySession = inject(GameplaySessionService);

  @ViewChild(EmbeddedPhaserGameComponent)
  private embeddedGame?: EmbeddedPhaserGameComponent;

  readonly variants: Array<{ value: GameplaySessionVariant; label: string }> = [
    { value: "time-attack", label: "Time Attack" },
    { value: "adventure", label: "Adventure" },
  ];
  readonly gameplayThemes: GameTheme[] = ["Dungeon", "Bosco", "Canyon", "Montagna", "Deserto"];
  readonly controlsOrientations: Array<{ value: PhaserControlsOrientation; label: string }> = [
    { value: "vertical", label: "Verticale" },
    { value: "horizontal", label: "Orizzontale" },
  ];
  readonly monsterTypes: Array<{ value: MonsterType; label: string }> = [
    { value: "goblin", label: "Goblin" },
    { value: "slime", label: "Slime" },
    { value: "bat", label: "Bat" },
    { value: "skeletor", label: "Skeletor" },
  ];
  readonly debugMinigames = getDefaultMinigamePlugins().map((plugin) => ({
    value: plugin.eventType,
    label: plugin.label,
    description: plugin.description,
  }));
  readonly effectKeys = Object.values(GameEffectKey);
  readonly effectTargets: Array<{ id: EffectTargetId; label: string }> = [
    { id: "hero", label: "Hero" },
    { id: "monster", label: "Monster vicino" },
    { id: "center", label: "Centro camera" },
  ];
  readonly directions: EffectDirection[] = ["right", "left", "up", "down"];
  readonly globalFieldSchemas = GLOBAL_EFFECT_FIELD_SCHEMAS;
  readonly combatMonsterType = signal<MonsterType>("goblin");
  readonly effectAnchorHelp = [
    { label: "Base X/Y", meaning: "L'anchor parte da target.x e da target.y meno il 25% dell'altezza visuale del target." },
    { label: "Start X offset", meaning: "Sposta l'effetto a sinistra o destra rispetto all'anchor base del target." },
    { label: "Start Y offset", meaning: "Sposta l'effetto in alto o in basso rispetto all'anchor base del target." },
    { label: "Forward distance", meaning: "Negli slash spinge l'effetto in avanti lungo la direzione corrente dopo il posizionamento iniziale." },
    { label: "Play offset X/Y", meaning: "Override temporanei del trigger corrente, utili per fare prove veloci senza cambiare il tuning dell'effetto." },
  ] as const;
  readonly combatMeaningRows = [
    { label: "Range attacco", meaning: "Lunghezza del rettangolo di hitbox lungo la direzione frontale. Non e la distanza del centro." },
    { label: "Ampiezza attacco", meaning: "Spessore del rettangolo di hitbox sul lato corto. Non e un raggio." },
    { label: "Range speciale", meaning: "Lunghezza del rettangolo dello speciale lungo la direzione frontale." },
    { label: "Ampiezza speciale", meaning: "Spessore del rettangolo dello speciale sul lato corto. Non e un raggio." },
    { label: "Range difesa", meaning: "Profondita del rettangolo di scudo davanti al personaggio, con centro spostato in avanti." },
    { label: "Ampiezza difesa", meaning: "Larghezza del rettangolo di scudo sul lato corto. La difesa e rettangolare, non radiale." },
    { label: "Hold / repeat", meaning: "attacksPerHold limita quante azioni parte un hold; repeatAfterMs riapre un nuovo ciclo automatico mentre il tasto resta premuto." },
  ] as const;

  readonly modes = computed(() => this.theme.modes());
  readonly heroes = computed(() =>
    [...this.state.inventoryHeroes()].sort((left, right) => left.title.localeCompare(right.title)),
  );
  readonly selectedModeId = signal(this.theme.modes()[0]?.id ?? "default");
  readonly selectedHeroId = signal(this.state.currentHero()?.id ?? "");
  readonly selectedVariant = signal<GameplaySessionVariant>(
    this.gameplaySession.resolveVariant(this.theme.modes()[0]?.id),
  );
  readonly matchLevel = signal(1);
  readonly mastery = signal(1);
  readonly sections = signal(10);
  readonly selectedTheme = signal<GameTheme>("Dungeon");
  readonly movementAxes = signal<4 | 8>(4);
  readonly initialLives = signal(3);
  readonly treasuresPerSection = signal(3);
  readonly trapsPerSection = signal(2);
  readonly enemiesPerSection = signal(1);
  readonly mobileControls = signal(true);
  readonly controlsOrientation = signal<PhaserControlsOrientation>("vertical");
  readonly useSpritesAndAnimations = signal(true);
  readonly useHeroAtlas = signal(true);
  readonly useMonsterAtlas = signal(true);
  readonly showArcadeBodyDebug = signal(true);
  readonly showCombatAreaDebug = signal(true);
  readonly monsterLevel = signal(1);
  readonly standaloneMinigameType = signal<GameplayDebugMinigameType>("monster");
  readonly standaloneRunModeId = signal<PhaserEventMinigameModeId>("luck");
  readonly selectedMonsterTypes = signal<MonsterType[]>(["goblin", "slime", "bat", "skeletor"]);
  readonly selectedMode = computed(
    () => this.modes().find((mode) => mode.id === this.selectedModeId()) ?? this.modes()[0] ?? null,
  );
  readonly selectedHero = computed(
    () => this.heroes().find((hero) => hero.id === this.selectedHeroId()) ?? this.heroes()[0] ?? null,
  );
  readonly supportsMinigameDebug = computed(() => this.selectedVariant() === "adventure");
  readonly gameplayPreview = computed(() =>
    buildGameplayVariantView(this.selectedVariant(), this.selectedMode()?.title ?? "Game Mode"),
  );
  readonly standaloneRunModes = computed(() => {
    const hero = this.selectedHero();
    if (!hero) {
      return [];
    }

    return EVENT_MINIGAME_MODE_ORDER.map((modeId) => buildEventMinigameModePreview(modeId, hero));
  });
  readonly activeLaunch = signal<TesterLaunch | null>(null);
  readonly activeGameLaunch = computed(() => {
    const launch = this.activeLaunch();
    return launch?.kind === "full-game" ? launch : null;
  });
  readonly lastGameResult = signal<GameResult | null>(null);
  readonly gameDebugInput = computed(() => {
    const hero = this.selectedHero();
    const mode = this.selectedMode();

    return {
      session: {
        modeId: mode?.id ?? null,
        modeTitle: mode?.title ?? null,
        variant: this.selectedVariant(),
        matchLevel: this.matchLevel(),
        mastery: this.mastery(),
        uiThemeId: this.theme.activeTheme(),
      },
      hero: hero
        ? {
          id: hero.id,
          title: hero.title,
          level: hero.level,
          mastery: hero.mastery,
          variant: hero.variant,
        }
        : null,
      launch: {
        sections: this.sections(),
        theme: this.selectedTheme(),
        movementAxes: this.movementAxes(),
        initialLives: this.initialLives(),
        treasuresPerSection: this.treasuresPerSection(),
        trapsPerSection: this.trapsPerSection(),
        enemiesPerSection: this.enemiesPerSection(),
        mobileControls: this.mobileControls(),
        controlsOrientation: this.controlsOrientation(),
        useSpritesAndAnimations: this.useSpritesAndAnimations(),
        useHeroAtlas: this.useHeroAtlas(),
        useMonsterAtlas: this.useMonsterAtlas(),
        showArcadeBodyDebug: this.showArcadeBodyDebug(),
        showCombatAreaDebug: this.showCombatAreaDebug(),
        monsterLevel: this.monsterLevel(),
        monsterTypes: this.selectedMonsterTypes(),
        combatTuning: this.combatTuning,
      },
      effect: {
        key: this.selectedEffectKey,
        target: this.selectedEffectTarget,
        tuning: this.effectTuning,
        options: this.buildEffectOptions(),
      },
    };
  });

  effectTuning: HackSlashEffectTuning = cloneEffectTuning();
  selectedEffectKey: GameEffectKey = GameEffectKey.HeroAttack;
  selectedEffectTarget: EffectTargetId = "hero";
  effectOptions: EffectOptionState = {
    direction: "right",
    scale: 1,
    alpha: 1,
    duration: 0,
    offsetX: 0,
    offsetY: 0,
    followTarget: false,
    force: true,
    colorPrimary: "",
    colorSecondary: "",
  };
  combatTuning: PhaserCombatTuningParams = this.buildDefaultCombatTuning();
  spriteSizing: PhaserSceneSpriteSizingParams = this.buildDefaultSpriteSizing();

  private launchId = 0;
  private tuningSyncTimer?: number;

  constructor() {
    this.applyVariantDefaults(this.selectedVariant());
  }

  onModeChange(modeId: string): void {
    this.selectedModeId.set(modeId);
    const resolvedVariant = this.gameplaySession.resolveVariant(modeId);
    this.selectedVariant.set(resolvedVariant);
    this.applyVariantDefaults(resolvedVariant);
  }

  onVariantChange(variant: GameplaySessionVariant): void {
    this.selectedVariant.set(variant);
    this.applyVariantDefaults(variant);
  }

  onHeroChange(heroId: string): void {
    this.selectedHeroId.set(heroId);
    this.resetCombatTuning();
  }

  toggleMonsterType(type: MonsterType, enabled: boolean): void {
    const next = new Set(this.selectedMonsterTypes());
    if (enabled) {
      next.add(type);
    } else {
      next.delete(type);
    }
    this.selectedMonsterTypes.set(Array.from(next));
  }

  hasMonsterType(type: MonsterType): boolean {
    return this.selectedMonsterTypes().includes(type);
  }

  launchMatch(): void {
    const hero = this.selectedHero();
    const mode = this.selectedMode();
    if (!hero || !mode) {
      return;
    }

    this.lastGameResult.set(null);
    this.heroProgress.setSelectedHero(hero);
    const session = this.gameplaySession.startSession(mode, this.matchLevel(), this.mastery(), {
      variant: this.selectedVariant(),
      debugMinigame: null,
      overrides: {
        sections: this.sections(),
        theme: this.selectedTheme(),
        movementAxes: this.movementAxes(),
        initialLives: this.initialLives(),
        treasuresPerSection: this.treasuresPerSection(),
        trapsPerSection: this.trapsPerSection(),
        enemiesPerSection: this.enemiesPerSection(),
        mobileControls: this.mobileControls(),
        controlsOrientation: this.controlsOrientation(),
        useSpritesAndAnimations: this.useSpritesAndAnimations(),
        useHeroAtlas: this.useHeroAtlas(),
        useMonsterAtlas: this.useMonsterAtlas(),
        showArcadeBodyDebug: this.showArcadeBodyDebug(),
        showCombatAreaDebug: this.showCombatAreaDebug(),
        monsterLevel: this.monsterLevel(),
        monsterTypes: this.selectedMonsterTypes(),
        combatTuning: this.cloneCombatTuning(),
        spriteSizing: this.cloneSpriteSizing(),
      },
    });

    const nextLaunch: TesterLaunch = {
      id: ++this.launchId,
      kind: "full-game",
      variant: session.variant,
    };

    this.activeLaunch.set(null);
    queueMicrotask(() => {
      this.activeLaunch.set(nextLaunch);
      this.scheduleTuningSync();
    });
  }

  openStandaloneMinigame(type: GameplayDebugMinigameType): void {
    const hero = this.selectedHero();
    if (!hero) {
      return;
    }

    this.heroProgress.setSelectedHero(hero);
    void this.router.navigate(["/utils/game/minigame", type], {
      queryParams: {
        heroId: hero.id,
        difficulty: 4,
        modeId: this.standaloneRunModes()[0]?.modeId ?? this.standaloneRunModeId(),
      },
    });
  }

  handleGameResolved(result: GameResult): void {
    this.lastGameResult.set(result);
  }

  currentEffectFields(): EffectFieldSchema[] {
    return EFFECT_FIELD_SCHEMAS[this.selectedEffectKey];
  }

  fieldMin(field: EffectFieldSchema): number | null {
    return field.min ?? null;
  }

  fieldMax(field: EffectFieldSchema): number | null {
    return field.max ?? null;
  }

  globalFieldValue(key: string): number {
    return this.effectTuning[key as GlobalEffectFieldKey];
  }

  currentEffectConfig(): Record<string, unknown> {
    return this.effectTuning[this.selectedEffectConfigKey()] as unknown as Record<string, unknown>;
  }

  currentEffectValue(key: string): string | number | boolean {
    const value = this.currentEffectConfig()[key];
    if (typeof value === "number" && key.toLowerCase().includes("color")) {
      return formatColorInput(value);
    }
    if (typeof value === "boolean") {
      return value;
    }
    return Number.isFinite(Number(value)) ? Number(value) : String(value ?? "");
  }

  updateGlobalField(key: string, value: unknown): void {
    const target = this.effectTuning as unknown as Record<string, unknown>;
    target[key] = Number(value);
    this.syncTuningToGame();
  }

  updateCurrentEffectField(key: string, value: unknown, type: EffectFieldSchema["type"]): void {
    const config = this.currentEffectConfig();
    if (type === "boolean") {
      config[key] = Boolean(value);
    } else if (type === "color") {
      config[key] = parseColorInput(String(value));
    } else {
      config[key] = Number(value);
    }
    this.syncTuningToGame();
  }

  applyTuningToGame(): void {
    this.syncTuningToGame();
  }

  resetCombatTuning(): void {
    this.combatTuning = this.buildDefaultCombatTuning();
  }

  resetBodySizing(): void {
    this.spriteSizing = this.buildDefaultSpriteSizing();
  }

  heroAtlasCollisionBody() {
    const heroId = this.selectedHero()?.id;
    if (!heroId) return this.spriteSizing.heroAtlasCollisionBody;
    return this.spriteSizing.heroAtlasCollisionBodyByHeroId[heroId]
      ?? (this.spriteSizing.heroAtlasCollisionBodyByHeroId[heroId] = { ...this.spriteSizing.heroAtlasCollisionBody });
  }

  monsterAtlasBody() {
    return this.spriteSizing.monsterAtlasCollisionBody[this.combatMonsterType()];
  }

  heroCombat(): HeroCombatTuningState {
    return (this.combatTuning.hero ?? {}) as HeroCombatTuningState;
  }

  monsterCombat(type = this.combatMonsterType()): NonNullable<MonsterCombatTuningState[MonsterType]> {
    const monsters = (this.combatTuning.monsters ?? {}) as MonsterCombatTuningState;
    return monsters[type] ?? (JSON.parse(JSON.stringify(buildMonsterCombatTuning()[type])) as NonNullable<MonsterCombatTuningState[MonsterType]>);
  }

  combatRangeMeaning(kind: AreaKind): string {
    return kind === "defense"
      ? "Rettangolo: profondità dello scudo. Cerchio: portata frontale fino al bordo esterno."
      : "Rettangolo: lunghezza frontale. Cerchio: portata fino al bordo esterno.";
  }

  combatWidthMeaning(kind: AreaKind): string {
    return kind === "defense"
      ? "Rettangolo: larghezza dello scudo. Cerchio: diametro."
      : "Rettangolo: spessore laterale. Cerchio: diametro.";
  }

  playSelectedEffect(): void {
    this.embeddedGame?.playDebugEffect(this.selectedEffectKey, this.selectedEffectTarget, this.buildEffectOptions());
  }

  playAllEffects(): void {
    this.effectKeys.forEach((effectKey, index) => {
      window.setTimeout(() => {
        this.embeddedGame?.playDebugEffect(effectKey, this.selectedEffectTarget, this.buildEffectOptions());
      }, index * 320);
    });
  }

  resetEffectsTuning(): void {
    this.effectTuning = cloneEffectTuning();
    this.syncTuningToGame();
  }

  private applyVariantDefaults(variant: GameplaySessionVariant): void {
    const defaults = buildGameplayVariantView(variant, this.selectedMode()?.title ?? "Game Mode").params;
    this.sections.set(defaults.sections ?? 10);
    this.selectedTheme.set(defaults.theme ?? "Dungeon");
    this.movementAxes.set(defaults.movementAxes ?? 4);
    this.initialLives.set(defaults.initialLives ?? 3);
    this.treasuresPerSection.set(defaults.treasuresPerSection ?? 3);
    this.trapsPerSection.set(defaults.trapsPerSection ?? 2);
    this.enemiesPerSection.set(defaults.enemiesPerSection ?? 1);
    this.mobileControls.set(defaults.mobileControls ?? true);
    this.controlsOrientation.set(defaults.controlsOrientation ?? "vertical");
    this.useSpritesAndAnimations.set(defaults.useSpritesAndAnimations ?? true);
    this.useHeroAtlas.set(defaults.useHeroAtlas ?? true);
    this.useMonsterAtlas.set(defaults.useMonsterAtlas ?? true);
    this.monsterLevel.set(this.mastery());
    this.selectedMonsterTypes.set(defaults.monsterTypes ?? ["goblin", "slime", "bat", "skeletor"]);
  }

  private scheduleTuningSync(): void {
    if (this.tuningSyncTimer) {
      clearTimeout(this.tuningSyncTimer);
    }

    this.tuningSyncTimer = window.setTimeout(() => {
      this.syncTuningToGame();
      this.tuningSyncTimer = undefined;
    }, 500);
  }

  private syncTuningToGame(): void {
    this.embeddedGame?.applyDebugEffectsTuning(this.effectTuning);
  }

  private buildEffectOptions(): GameEffectOptions {
    const options: GameEffectOptions = {
      direction: this.effectOptions.direction,
      followTarget: this.effectOptions.followTarget,
      force: this.effectOptions.force,
    };

    if (this.effectOptions.scale > 0) {
      options.scale = this.effectOptions.scale;
    }
    if (this.effectOptions.alpha > 0) {
      options.alpha = this.effectOptions.alpha;
    }
    if (this.effectOptions.duration > 0) {
      options.duration = this.effectOptions.duration;
    }
    if (this.effectOptions.offsetX !== 0) {
      options.offsetX = this.effectOptions.offsetX;
    }
    if (this.effectOptions.offsetY !== 0) {
      options.offsetY = this.effectOptions.offsetY;
    }
    if (this.effectOptions.colorPrimary.trim()) {
      options.colorPrimary = parseColorInput(this.effectOptions.colorPrimary);
    }
    if (this.effectOptions.colorSecondary.trim()) {
      options.colorSecondary = parseColorInput(this.effectOptions.colorSecondary);
    }

    return options;
  }

  private selectedEffectConfigKey(): keyof HackSlashEffectTuning {
    switch (this.selectedEffectKey) {
      case GameEffectKey.HeroAttack:
        return "heroAttack";
      case GameEffectKey.HeroSpecial:
        return "heroSpecial";
      case GameEffectKey.HeroDefense:
        return "heroDefense";
      case GameEffectKey.MonsterAttack:
        return "monsterAttack";
      case GameEffectKey.MonsterSpecial:
        return "monsterSpecial";
      case GameEffectKey.MonsterDefense:
        return "monsterDefense";
      case GameEffectKey.Heal:
        return "heal";
      case GameEffectKey.Poison:
        return "poison";
      case GameEffectKey.Explosion:
        return "explosion";
      case GameEffectKey.Hit:
      default:
        return "hit";
    }
  }

  private buildDefaultCombatTuning(): PhaserCombatTuningParams {
    const hero = this.selectedHero() ?? this.state.currentHero() ?? this.state.inventoryHeroes()[0];
    return {
      hero: hero ? JSON.parse(JSON.stringify(buildHeroCombatTuning(hero))) as HeroCombatTuningState : undefined,
      monsters: JSON.parse(JSON.stringify(buildMonsterCombatTuning())) as MonsterCombatTuningState,
    };
  }

  private cloneCombatTuning(): PhaserCombatTuningParams {
    return JSON.parse(JSON.stringify(this.combatTuning)) as PhaserCombatTuningParams;
  }

  private buildDefaultSpriteSizing(): PhaserSceneSpriteSizingParams {
    return JSON.parse(JSON.stringify(PHASER_SCENE_CONFIG.spriteSizing)) as PhaserSceneSpriteSizingParams;
  }

  private cloneSpriteSizing(): PhaserSceneSpriteSizingParams {
    return JSON.parse(JSON.stringify(this.spriteSizing)) as PhaserSceneSpriteSizingParams;
  }
}
