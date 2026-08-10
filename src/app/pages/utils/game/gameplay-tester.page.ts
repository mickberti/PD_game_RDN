import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { IonContent, IonFooter, IonToolbar } from "@ionic/angular/standalone";
import {
  buildEventMinigameModePreview,
  EVENT_MINIGAME_MODE_ORDER,
} from "../../../core/game/phaser/config/event-minigame-mode.config";
import { getDefaultMinigamePlugins } from "../../../core/game/minigames/minigame-plugin.registry";
import {
  GameplayDebugMinigameType,
  GameplaySessionVariant,
} from "../../../core/models/gameplay-session.model";
import {
  GameResult,
  GameTheme,
  MonsterType,
  PhaserControlsOrientation,
  PhaserEventMinigameModeId,
} from "../../../core/models/phaser-game-state.model";
import { ThemeService } from "../../../core/services/app/theme/theme.service";
import { GameStateService } from "../../../core/services/state/game-state.service";
import { HeroProgressService } from "../../../core/services/progression/hero-progress.service";
import { GameplaySessionService } from "../../../core/services/gameplay/gameplay-session.service";
import { UIButtonComponent } from "../../../shared/basic/ui-button.component";
import { UiSpriteComponent } from "../../../shared/basic/ui-sprite.component";
import { UIBottomUtilsComponent } from "../../../shared/components/ui-bottom-utils.component";
import { UiUtilsPageHeaderComponent } from "../../../shared/components/ui-utils-page-header.component";
import { buildGameplayVariantView } from "../../gameplay/gameplay-variant-defaults";
import { EmbeddedPhaserGameComponent } from "../../gameplay/embedded-phaser-game.component";

type TesterLaunch =
  | { id: number; kind: "full-game"; variant: GameplaySessionVariant };

@Component({
  selector: "app-gameplay-tester-page",
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
  templateUrl: "./gameplay-tester.page.html",
  styleUrls: ["./gameplay-tester.page.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameplayTesterPage {
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);
  private readonly state = inject(GameStateService);
  private readonly heroProgress = inject(HeroProgressService);
  private readonly gameplaySession = inject(GameplaySessionService);

  readonly variants: Array<{ value: GameplaySessionVariant; label: string }> = [
    { value: "time-attack", label: "Time Attack" },
    { value: "adventure", label: "Adventure" },
  ];
  readonly gameplayThemes: GameTheme[] = [
    "Dungeon",
    "Bosco",
    "Canyon",
    "Montagna",
    "Deserto",
  ];
  readonly controlsOrientations: Array<{
    value: PhaserControlsOrientation;
    label: string;
  }> = [
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

  readonly modes = computed(() => this.theme.modes());
  readonly heroes = computed(() =>
    [...this.state.inventoryHeroes()].sort((left, right) =>
      left.title.localeCompare(right.title),
    ),
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
  readonly monsterLevel = signal(1);
  readonly standaloneMinigameType = signal<GameplayDebugMinigameType>("monster");
  readonly standaloneMinigameDifficulty = signal(4);
  readonly standaloneRunModeId = signal<PhaserEventMinigameModeId>("luck");
  readonly selectedMonsterTypes = signal<MonsterType[]>([
    "goblin",
    "slime",
    "bat",
    "skeletor",
  ]);
  readonly selectedMode = computed(
    () =>
      this.modes().find((mode) => mode.id === this.selectedModeId()) ??
      this.modes()[0] ??
      null,
  );
  readonly selectedHero = computed(
    () =>
      this.heroes().find((hero) => hero.id === this.selectedHeroId()) ??
      this.heroes()[0] ??
      null,
  );
  readonly supportsMinigameDebug = computed(
    () => this.selectedVariant() === "adventure",
  );
  readonly gameplayPreview = computed(() =>
    buildGameplayVariantView(this.selectedVariant(), this.selectedMode()?.title ?? "Game Mode"),
  );
  readonly standaloneRunModes = computed(() => {
    const hero = this.selectedHero();
    if (!hero) {
      return [];
    }

    return EVENT_MINIGAME_MODE_ORDER.map((modeId) =>
      buildEventMinigameModePreview(modeId, hero),
    );
  });
  readonly selectedStandaloneRunMode = computed(
    () =>
      this.standaloneRunModes().find((option) => option.modeId === this.standaloneRunModeId()) ??
      this.standaloneRunModes()[0] ??
      null,
  );
  readonly activeLaunch = signal<TesterLaunch | null>(null);
  readonly activeGameLaunch = computed(() => {
    const launch = this.activeLaunch();
    return launch?.kind === "full-game" ? launch : null;
  });
  readonly lastDebugMinigame = signal<GameplayDebugMinigameType | null>(null);
  readonly lastGameResult = signal<GameResult | null>(null);
  readonly gameDebugInput = computed(() => {
    const hero = this.selectedHero();
    const mode = this.selectedMode();

    return {
      session: {
        modeId: mode?.id ?? null,
        modeTitle: mode?.title ?? null,
        variant: this.lastDebugMinigame() ? "adventure" : this.selectedVariant(),
        debugMinigame: this.lastDebugMinigame(),
        matchLevel: this.matchLevel(),
        mastery: this.mastery(),
        uiThemeId: this.theme.activeTheme(),
        standaloneRunModeId: this.selectedStandaloneRunMode()?.modeId ?? null,
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
        monsterLevel: this.monsterLevel(),
        monsterTypes: this.selectedMonsterTypes(),
        standaloneMinigame: {
          type: this.standaloneMinigameType(),
          difficulty: this.standaloneMinigameDifficulty(),
          runMode: this.selectedStandaloneRunMode(),
        },
      },
    };
  });
  private launchId = 0;

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

  restoreDefaults(): void {
    this.applyVariantDefaults(this.selectedVariant());
  }

  launchMatch(): void {
    this.lastDebugMinigame.set(null);
    this.launch(null);
  }

  launchDebugMinigame(debugMinigame: GameplayDebugMinigameType): void {
    this.lastDebugMinigame.set(debugMinigame);
    this.launch(debugMinigame);
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
        difficulty: this.standaloneMinigameDifficulty(),
        modeId: this.selectedStandaloneRunMode()?.modeId ?? this.standaloneRunModeId(),
      },
    });
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
    this.selectedMonsterTypes.set(
      defaults.monsterTypes ?? ["goblin", "slime", "bat", "skeletor"],
    );
  }

  private launch(debugMinigame: GameplayDebugMinigameType | null): void {
    const hero = this.selectedHero();
    const mode = this.selectedMode();
    if (!hero || !mode) {
      return;
    }

    this.lastGameResult.set(null);
    const variant = debugMinigame ? "adventure" : this.selectedVariant();
    this.heroProgress.setSelectedHero(hero);
    const session = this.gameplaySession.startSession(
      mode,
      this.matchLevel(),
      this.mastery(),
      {
        variant,
        debugMinigame,
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
          monsterLevel: this.monsterLevel(),
          monsterTypes: this.selectedMonsterTypes(),
        },
      },
    );
    const nextLaunch: TesterLaunch = {
      id: ++this.launchId,
      kind: "full-game",
      variant: session.variant,
    };
    this.activeLaunch.set(null);
    queueMicrotask(() => this.activeLaunch.set(nextLaunch));
  }

  handleGameResolved(result: GameResult): void {
    this.lastGameResult.set(result);
  }
}
