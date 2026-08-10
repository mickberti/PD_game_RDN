import Phaser from "phaser";
import { BaseMinigame } from "./base-minigame";
import { GameEventType } from "./game-event.model";
import { MinigameConfig, MinigameResult, MinigameType } from "./minigame.model";
import { CombatChargeReleaseMinigame } from "./plugins/combat-charge-release.minigame";
import { CombatTargetDirMinigame } from "./plugins/combat-target-dir.minigame";
import { CombatTargetTapMinigame } from "./plugins/combat-target-tap.minigame";
import { CombatTimingMinigame } from "./plugins/combat-timing.minigame";
import { LockpickDualAxisMinigame } from "./plugins/lockpick-dual-axis.minigame";
import { LockpickTimingMinigame } from "./plugins/lockpick-timing.minigame";
import { PressureLockMinigame } from "./plugins/lockpick-pressure-lock.minigame";
import { ReflexSequenceMinigame } from "./plugins/trap-reflex-sequence.minigame";
import { SlotMachineMinigame } from "./plugins/slot-machine.minigame";
import { TrapLaneRunnerMinigame } from "./plugins/trap-lane-runner.minigame";
import { TrapRuneStepMinigame } from "./plugins/trap-rune-step.minigame";

export interface MinigamePluginDefinition {
  pluginId: string;
  eventType: GameEventType;
  minigameType: MinigameType;
  label: string;
  description: string;
  isDefault?: boolean;
  difficultyWeight?: number | ((difficulty: number) => number);
  create: (
    scene: Phaser.Scene,
    config: MinigameConfig,
    onComplete: (result: MinigameResult) => void,
  ) => BaseMinigame;
}

const MINIGAME_PLUGINS: readonly MinigamePluginDefinition[] = [
  {
    pluginId: "combat-timing",
    eventType: "monster",
    minigameType: "combatTiming",
    label: "Monster",
    description: "Duello a fasi con attacco, difesa e speciale.",
    isDefault: true,
    difficultyWeight: (difficulty) => Math.max(1, 8 - difficulty),
    create: (scene, config, onComplete) => new CombatTimingMinigame(scene, config, onComplete),
  },
  {
    pluginId: "combat-target-tap",
    eventType: "monster",
    minigameType: "combatTargetTap",
    label: "Monster Target Tap",
    description: "Prototype combat con bersagli rapidi da toccare.",
    difficultyWeight: 4,
    create: (scene, config, onComplete) => new CombatTargetTapMinigame(scene, config, onComplete),
  },
  {
    pluginId: "combat-target-dir",
    eventType: "monster",
    minigameType: "combatTargetDir",
    label: "Monster Target Swipe",
    description: "Combat con bersagli da trascinare nella direzione indicata.",
    difficultyWeight: 4,
    create: (scene, config, onComplete) => new CombatTargetDirMinigame(scene, config, onComplete),
  },
  {
    pluginId: "combat-charge-release",
    eventType: "monster",
    minigameType: "combatChargeRelease",
    label: "Monster Charge",
    description: "Prototype combat con carica e rilascio arcade.",
    difficultyWeight: (difficulty) => Math.max(1, difficulty - 1),
    create: (scene, config, onComplete) => new CombatChargeReleaseMinigame(scene, config, onComplete),
  },
  {
    pluginId: "slot-machine",
    eventType: "slot",
    minigameType: "slotMachine",
    label: "Slot Machine",
    description: "Tre rulli arcani: investi gemme e cerca una combinazione vincente.",
    difficultyWeight: 2,
    create: (scene, config, onComplete) => new SlotMachineMinigame(scene, config, onComplete),
  },
  {
    pluginId: "reflex-sequence",
    eventType: "trap",
    minigameType: "reflexSequence",
    label: "Trap",
    description: "Sequenza rapida da memorizzare e ripetere.",
    isDefault: true,
    difficultyWeight: (difficulty) => Math.max(1, 7 - difficulty),
    create: (scene, config, onComplete) => new ReflexSequenceMinigame(scene, config, onComplete),
  },
  {
    pluginId: "trap-lane-runner",
    eventType: "trap",
    minigameType: "trapLaneRunner",
    label: "Trap Lane Runner",
    description: "Prototype trap a corsie con input touch-first.",
    difficultyWeight: 4,
    create: (scene, config, onComplete) => new TrapLaneRunnerMinigame(scene, config, onComplete),
  },
  {
    pluginId: "trap-rune-step",
    eventType: "trap",
    minigameType: "trapRuneStep",
    label: "Trap Rune Step",
    description: "Prototype trap runica a passi sequenziali.",
    difficultyWeight: (difficulty) => Math.max(1, difficulty - 2),
    create: (scene, config, onComplete) => new TrapRuneStepMinigame(scene, config, onComplete),
  },
  {
    pluginId: "lockpick-timing",
    eventType: "treasure",
    minigameType: "lockpickTiming",
    label: "Treasure",
    description: "Apertura dello scrigno con timing sul cursore.",
    isDefault: true,
    difficultyWeight: (difficulty) => Math.max(1, 7 - difficulty),
    create: (scene, config, onComplete) => new LockpickTimingMinigame(scene, config, onComplete),
  },
  {
    pluginId: "lockpick-dual-axis",
    eventType: "treasure",
    minigameType: "lockpickDualAxis",
    label: "Treasure Dual Axis",
    description: "Prototype scasso su doppio asse.",
    difficultyWeight: 4,
    create: (scene, config, onComplete) => new LockpickDualAxisMinigame(scene, config, onComplete),
  },
  {
    pluginId: "pressure-lock",
    eventType: "treasure",
    minigameType: "pressureLock",
    label: "Treasure Pressure Lock",
    description: "Prototype pressione serratura con impulsi.",
    difficultyWeight: (difficulty) => Math.max(1, difficulty - 1),
    create: (scene, config, onComplete) => new PressureLockMinigame(scene, config, onComplete),
  },
];

export function getMinigamePlugins(): readonly MinigamePluginDefinition[] {
  return MINIGAME_PLUGINS;
}

export function getMinigamePluginByEventType(eventType: GameEventType): MinigamePluginDefinition | undefined {
  return MINIGAME_PLUGINS.find((plugin) => plugin.eventType === eventType && plugin.isDefault)
    ?? MINIGAME_PLUGINS.find((plugin) => plugin.eventType === eventType);
}

export function getMinigamePluginByType(type: MinigameType): MinigamePluginDefinition | undefined {
  return MINIGAME_PLUGINS.find((plugin) => plugin.minigameType === type);
}

export function getMinigamePluginById(pluginId: string): MinigamePluginDefinition | undefined {
  return MINIGAME_PLUGINS.find((plugin) => plugin.pluginId === pluginId);
}

export function getDefaultMinigamePlugins(): readonly MinigamePluginDefinition[] {
  return MINIGAME_PLUGINS.filter((plugin) => plugin.isDefault);
}

export function getMinigamePluginsByEventType(eventType: GameEventType): readonly MinigamePluginDefinition[] {
  return MINIGAME_PLUGINS.filter((plugin) => plugin.eventType === eventType);
}

export function getMinigameWeightForDifficulty(plugin: MinigamePluginDefinition, difficulty: number): number {
  const weight = typeof plugin.difficultyWeight === "function"
    ? plugin.difficultyWeight(difficulty)
    : plugin.difficultyWeight;

  return Math.max(0, Number(weight ?? 1));
}

export function isRegisteredMinigameEventType(value: string | null | undefined): value is GameEventType {
  return !!value && MINIGAME_PLUGINS.some((plugin) => plugin.eventType === value);
}

export function isRegisteredMinigameType(value: string | null | undefined): value is MinigameType {
  return !!value && MINIGAME_PLUGINS.some((plugin) => plugin.minigameType === value);
}
