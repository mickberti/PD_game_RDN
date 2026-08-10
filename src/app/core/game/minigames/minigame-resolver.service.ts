import Phaser from "phaser";
import { DEFAULT_SLOT_MACHINE_CONFIG } from "./plugins/slot-machine.config";
import { DEFAULT_TRAP_REFLEX_SEQUENCE_UX_CONFIG } from "./plugins/trap-reflex-sequence.config";
import { GameEvent, HeroMinigameStats } from "./game-event.model";
import {
  getMinigamePluginByType,
  getMinigamePluginsByEventType,
  getMinigameWeightForDifficulty,
} from "./minigame-plugin.registry";
import {
  MinigameConfig,
  MinigameResultGrade,
  MinigameType,
  ResolvedMinigameConfig,
} from "./minigame.model";

export class MinigameResolverService {
  private readonly resolvers: Record<MinigameType, (event: GameEvent, heroStats: HeroMinigameStats) => ResolvedMinigameConfig> = {
    combatTiming: (event, heroStats) => this.resolveCombatTiming(event, heroStats),
    combatTargetTap: (event, heroStats) => this.resolveCombatTargetTap(event, heroStats),
    combatTargetDir: (event, heroStats) => this.resolveCombatTargetDir(event, heroStats),
    combatChargeRelease: (event, heroStats) => this.resolveCombatChargeRelease(event, heroStats),
    slotMachine: (event, heroStats) => this.resolveSlotMachine(event, heroStats),
    reflexSequence: (event, heroStats) => this.resolveReflexSequence(event, heroStats),
    trapLaneRunner: (event, heroStats) => this.resolveTrapLaneRunner(event, heroStats),
    trapRuneStep: (event, heroStats) => this.resolveTrapRuneStep(event, heroStats),
    lockpickTiming: (event, heroStats) => this.resolveLockpickTiming(event, heroStats),
    lockpickDualAxis: (event, heroStats) => this.resolveLockpickDualAxis(event, heroStats),
    pressureLock: (event, heroStats) => this.resolvePressureLock(event, heroStats),
  };

  resolve(event: GameEvent, heroStats: HeroMinigameStats, preferredType?: MinigameType): ResolvedMinigameConfig {
    const resolvedEvent = preferredType ? { ...event, minigameType: preferredType } : event;
    const selectedType = this.resolveType(resolvedEvent);
    return this.resolveByMinigameType(selectedType, resolvedEvent, heroStats);
  }

  resolveByMinigameType(
    minigameType: MinigameType,
    event: GameEvent,
    heroStats: HeroMinigameStats,
  ): ResolvedMinigameConfig {
    const resolveConfig = this.resolvers[minigameType];

    if (!resolveConfig) {
      throw new Error(`[MinigameResolverService] No config resolver registered for "${minigameType}".`);
    }

    return resolveConfig({ ...event, minigameType }, heroStats);
  }

  getAvailableMinigamesForEventType(eventType: GameEvent["type"]): MinigameType[] {
    return getMinigamePluginsByEventType(eventType).map((plugin) => plugin.minigameType);
  }

  pickMinigameType(availableTypes: readonly MinigameType[], difficulty: number, eventId = ""): MinigameType {
    if (!availableTypes.length) {
      throw new Error("[MinigameResolverService] Cannot pick a minigame from an empty pool.");
    }

    const weightedTypes = availableTypes.flatMap((type) => {
      const plugin = getMinigamePluginByType(type);
      const weight = plugin ? getMinigameWeightForDifficulty(plugin, difficulty) : 1;
      return Array.from({ length: Math.max(1, Math.round(weight)) }, () => type);
    });
    const hash = Array.from(`${eventId}:${difficulty}`).reduce(
      (sum, char, index) => sum + char.charCodeAt(0) * (index + 1),
      0,
    );

    return weightedTypes[Math.abs(hash) % weightedTypes.length] ?? availableTypes[0];
  }

  promoteSuccessByLuck(grade: MinigameResultGrade, heroStats: HeroMinigameStats): MinigameResultGrade {
    if (grade !== "success") {
      return grade;
    }

    const luckRoll = Phaser.Math.Between(1, 100);
    const luckChance = Phaser.Math.Clamp(heroStats.luck * 0.5, 0, 25);
    return luckRoll <= luckChance ? "perfect" : grade;
  }

  private resolveCombatTiming(event: GameEvent, heroStats: HeroMinigameStats): ResolvedMinigameConfig {
    const basePerfectZone = 38;
    const dexBonus = heroStats.dexterity * 0.85;
    const fatiguePenalty = heroStats.fatigue * 0.6;
    const difficultyPenalty = event.difficulty * 3.6;

    const perfect = Phaser.Math.Clamp(
      basePerfectZone + dexBonus - fatiguePenalty - difficultyPenalty,
      24,
      86,
    );

    const success = Phaser.Math.Clamp(perfect + 46 + heroStats.dexterity * 0.45 - event.difficulty * 2.1, perfect + 16, 170);
    const partial = Phaser.Math.Clamp(success + 56 - event.difficulty * 1.15, success + 12, 236);
    const cursorSpeed = Phaser.Math.Clamp(
      172 + event.difficulty * 18 + heroStats.fatigue * 3.2,
      150,
      320,
    );

    return {
      type: "combatTiming",
      event,
      heroStats,
      title: "Scontro improvviso",
      subtitle: "Genera una fase alla volta e combatti finche' qualcuno va a 0 HP.",
      cursorSpeed,
      zones: { perfect, success, partial },
    };
  }

  private resolveCombatTargetTap(event: GameEvent, heroStats: HeroMinigameStats): ResolvedMinigameConfig {
    const objectiveCount = Phaser.Math.Clamp(6 + Math.ceil(event.difficulty / 2), 6, 12);
    const targetLifeMs = Phaser.Math.Clamp(
      2500 + heroStats.dexterity * 20 - event.difficulty * 90 - heroStats.fatigue * 20,
      450,
      6600,
    );
    const targetRadius = Phaser.Math.Clamp(
      26 + heroStats.dexterity * 0.28 - event.difficulty * 1.2,
      18,
      26,
    );
    const targetRingRadius = Phaser.Math.Clamp(
      86 + event.difficulty * 4 - heroStats.fatigue * 0.8,
      78,
      150,
    );
    const spawnIntervalMs = Phaser.Math.Clamp(
      1500 - event.difficulty * 45 - heroStats.fatigue * 8,
      420,
      4900,
    );
    const timeLimitMs = objectiveCount * spawnIntervalMs + targetLifeMs + 300;

    return {
      type: "combatTargetTap",
      event,
      heroStats,
      title: "Assalto reattivo",
      subtitle: "Tocca attacco, parata e speciale. Evita i bersagli pericolosi.",
      objectiveCount,
      timeLimitMs,
      targetLifeMs,
      targetRadius,
      targetRingRadius,
      spawnIntervalMs,
    };
  }

  private resolveCombatTargetDir(event: GameEvent, heroStats: HeroMinigameStats): ResolvedMinigameConfig {
    const baseConfig = this.resolveCombatTargetTap(event, heroStats);
    return {
      ...baseConfig,
      type: "combatTargetDir",
      title: "Assalto direzionale",
      subtitle: "Trascina ogni azione nella direzione indicata. Evita i bersagli pericolosi.",
    };
  }

  private resolveSlotMachine(event: GameEvent, heroStats: HeroMinigameStats): ResolvedMinigameConfig {
    return {
      type: "slotMachine",
      event,
      heroStats,
      title: DEFAULT_SLOT_MACHINE_CONFIG.title,
      subtitle: DEFAULT_SLOT_MACHINE_CONFIG.description,
      slotMachine: DEFAULT_SLOT_MACHINE_CONFIG,
    };
  }

  private resolveCombatChargeRelease(event: GameEvent, heroStats: HeroMinigameStats): ResolvedMinigameConfig {
    const chargeSpeed = Phaser.Math.Clamp(
      0.45 + event.difficulty * 0.04 + heroStats.fatigue * 0.01,
      0.35,
      1.1,
    );
    const perfectZoneWidth = Phaser.Math.Clamp(
      12 + heroStats.dexterity * 0.25 - event.difficulty * 0.8,
      6,
      22,
    );
    const targetCenter = Phaser.Math.Clamp(
      70 - heroStats.strength * 0.1 + event.difficulty * 0.5,
      50,
      82,
    );
    const maxAttempts = event.difficulty >= 7 ? 1 : 2;
    const timeLimitMs = Phaser.Math.Clamp(
      2400 + maxAttempts * 1350 + heroStats.strength * 36 - event.difficulty * 40,
      2200,
      5400,
    );

    return {
      type: "combatChargeRelease",
      event,
      heroStats,
      title: "Colpo caricato",
      subtitle: "Una fase per volta: carica e risolvi finche' eroe o mostro crollano.",
      timeLimitMs,
      chargeSpeed,
      perfectZoneWidth,
      targetCenter,
      maxAttempts,
    };
  }

  private resolveReflexSequence(event: GameEvent, heroStats: HeroMinigameStats): ResolvedMinigameConfig {
    const sequenceLength = event.difficulty <= 3
      ? DEFAULT_TRAP_REFLEX_SEQUENCE_UX_CONFIG.sequenceLengths.easy
      : event.difficulty <= 6
        ? DEFAULT_TRAP_REFLEX_SEQUENCE_UX_CONFIG.sequenceLengths.medium
        : DEFAULT_TRAP_REFLEX_SEQUENCE_UX_CONFIG.sequenceLengths.hard;
    const baseTimeMs = 12200;
    const previewbaseTimeMs = 2680;
    const dexBonus = heroStats.dexterity * 35;
    const intBonus = heroStats.intelligence * 20;
    const fatiguePenalty = heroStats.fatigue * 30;
    const difficultyPenalty = event.difficulty * 180;

    const timeLimitMs = Phaser.Math.Clamp(
      baseTimeMs + dexBonus + intBonus - fatiguePenalty - difficultyPenalty,
      5200,
      12200,
    );

    const previewDurationMs = Phaser.Math.Clamp(
      previewbaseTimeMs + heroStats.intelligence * 34 - event.difficulty * 35,
      1200,
      3200,
    );

    return {
      type: "reflexSequence",
      event,
      heroStats,
      title: "Trappola a riflessi",
      subtitle: "Ripeti la sequenza prima che scada il tempo.",
      sequenceLength,
      timeLimitMs,
      previewDurationMs,
      previewStepMs: Phaser.Math.Clamp(
        420 + heroStats.dexterity * 8 - event.difficulty * 14,
        240,
        520,
      ),
    };
  }

  private resolveTrapLaneRunner(event: GameEvent, heroStats: HeroMinigameStats): ResolvedMinigameConfig {
    const laneCount = event.difficulty <= 3 ? 3 : event.difficulty <= 6 ? 5 : 7;
    const timeLimitMs = Phaser.Math.Clamp(
      12000 + heroStats.dexterity * 40 - event.difficulty * 200,
      7500,
      12000,
    );
    const obstacleSpeed = Phaser.Math.Clamp(
      160 + event.difficulty * 22 + heroStats.fatigue * 4,
      140,
      380,
    );
    const spawnIntervalMs = Phaser.Math.Clamp(
      950 - event.difficulty * 55 - heroStats.fatigue * 8,
      420,
      950,
    );
    const moveCooldownMs = Phaser.Math.Clamp(
      260 - heroStats.dexterity * 3 + heroStats.fatigue * 5,
      90,
      320,
    );
    const previewDurationMs = Phaser.Math.Clamp(
      340 + heroStats.intelligence * 18 - event.difficulty * 15,
      0,
      650,
    );

    return {
      type: "trapLaneRunner",
      event,
      heroStats,
      title: "Corsa tra le trappole",
      subtitle: "Tocca a sinistra o destra per cambiare corsia ed evitare gli ostacoli.",
      timeLimitMs,
      laneCount,
      obstacleSpeed,
      spawnIntervalMs,
      moveCooldownMs,
      previewDurationMs,
    };
  }

  private resolveTrapRuneStep(event: GameEvent, heroStats: HeroMinigameStats): ResolvedMinigameConfig {
    const gridSize = event.difficulty <= 3 ? 3 : event.difficulty <= 6 ? 6 : 9;
    const rounds = event.difficulty <= 3 ? 3 : event.difficulty <= 6 ? 4 : 5;
    const previewMs = Phaser.Math.Clamp(
      2750 + heroStats.intelligence * 12 - event.difficulty * 20,
      1250,
      4000,
    );
    const chooseTimeMs = Phaser.Math.Clamp(
      1700 + heroStats.dexterity * 10 - heroStats.fatigue * 10 - event.difficulty * 20,
      700,
      3400,
    );
    const timeLimitMs = rounds * (previewMs + chooseTimeMs + 140);
    const roundTransitionMs = Phaser.Math.Clamp(
      720 + heroStats.intelligence * 16 - event.difficulty * 10,
      650,
      1400,
    );

    return {
      type: "trapRuneStep",
      event,
      heroStats,
      title: "Passo runico",
      subtitle: "Osserva le rune, memorizza la cella sicura e scegli in fretta.",
      timeLimitMs,
      gridSize,
      rounds,
      previewDurationMs: previewMs,
      chooseTimeMs,
      roundTransitionMs,
    };
  }

  private resolveLockpickTiming(event: GameEvent, heroStats: HeroMinigameStats): ResolvedMinigameConfig {
    const requiredLocks = event.difficulty <= 3 ? 1 : event.difficulty <= 6 ? 2 : 3;
    const basePerfectZone = 34;
    const dexBonus = heroStats.dexterity * 0.75;
    const intBonus = heroStats.intelligence * 0.45;
    const fatiguePenalty = heroStats.fatigue * 0.55;
    const difficultyPenalty = event.difficulty * 3.2;

    const perfect = Phaser.Math.Clamp(
      basePerfectZone + dexBonus + intBonus - fatiguePenalty - difficultyPenalty,
      20,
      72,
    );

    const success = Phaser.Math.Clamp(perfect + 40 + heroStats.dexterity * 0.35 - event.difficulty * 1.6, perfect + 14, 148);
    const partial = Phaser.Math.Clamp(success + 44 - event.difficulty, success + 10, 208);
    const cursorSpeed = Phaser.Math.Clamp(
      405 + event.difficulty * 12 + heroStats.fatigue * 1.8 - heroStats.intelligence * 2,
      280,
      720,
    );

    return {
      type: "lockpickTiming",
      event,
      heroStats,
      title: "Scrigno sigillato",
      subtitle: "Allinea il grimaldello e sblocca tutte le serrature.",
      cursorSpeed,
      requiredLocks,
      maxFailures: requiredLocks + 1,
      zones: { perfect, success, partial },
    };
  }

  private resolveLockpickDualAxis(event: GameEvent, heroStats: HeroMinigameStats): ResolvedMinigameConfig {
    const correctZoneHeight = Phaser.Math.Clamp(
      70 + heroStats.dexterity * 1.1 - event.difficulty * 6 - heroStats.fatigue * 1.5,
      28,
      95,
    );
    const rotationSpeed = Phaser.Math.Clamp(
      18 + heroStats.dexterity * 0.35 - event.difficulty * 0.8,
      8,
      28,
    );
    const stressGain = Phaser.Math.Clamp(
      18 + event.difficulty * 3 + heroStats.fatigue * 1.2 - heroStats.luck * 0.4,
      8,
      40,
    );
    const stressDecay = Phaser.Math.Clamp(
      10 + heroStats.intelligence * 0.3,
      6,
      22,
    );
    const timeLimitMs = Phaser.Math.Clamp(
      12500 + heroStats.dexterity * 10 + heroStats.intelligence * 24 - heroStats.fatigue * 5 - event.difficulty * 180,
      7800,
      14000,
    );

    return {
      type: "lockpickDualAxis",
      event,
      heroStats,
      title: "Serratura a doppio asse",
      subtitle: "Allinea il grimaldello in verticale e ruota senza spezzarlo.",
      timeLimitMs,
      correctZoneHeight,
      rotationSpeed,
      stressGain,
      stressDecay,
    };
  }

  private resolvePressureLock(event: GameEvent, heroStats: HeroMinigameStats): ResolvedMinigameConfig {
    const objectiveCount = Phaser.Math.Clamp(3 + Math.floor(event.difficulty / 2), 3, 7);
    const timeLimitMs = Phaser.Math.Clamp(
      3380 + heroStats.intelligence * 78 + heroStats.luck * 18 - heroStats.fatigue * 22 - event.difficulty * 49,
      1800,
      5000,
    );

    return {
      type: "pressureLock",
      event,
      heroStats,
      title: "Serratura a pressione",
      subtitle: "Prototype plug-in per impulsi e pressione controllata.",
      objectiveCount,
      timeLimitMs,
    };
  }

  private resolveType(event: GameEvent): MinigameType {
    const explicitType = event.minigameType;

    if (explicitType) {
      const plugin = getMinigamePluginByType(explicitType);
      if (plugin?.eventType === event.type) {
        return explicitType;
      }
    }

    const availableTypes = this.getAvailableMinigamesForEventType(event.type);
    return this.pickMinigameType(availableTypes, event.difficulty, event.id);
  }
}
