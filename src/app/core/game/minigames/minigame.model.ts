import { GameEvent, GameEventType, HeroMinigameStats, SkillType } from "./game-event.model";
import { PhaserGameplayEventType } from "../../models/phaser-game-state.model";
import type { SlotMachineConfig } from "./plugins/slot-machine.config";

export type MinigameResultGrade =
  | "fail"
  | "partial"
  | "success"
  | "perfect";

export type MinigameType =
  | "combatTiming"
  | "combatTargetTap"
  | "combatTargetDir"
  | "combatChargeRelease"
  | "slotMachine"
  | "reflexSequence"
  | "trapLaneRunner"
  | "trapRuneStep"
  | "lockpickTiming"
  | "lockpickDualAxis"
  | "pressureLock";

export type ReflexSequenceInput =
    | "up"
    | "upRight"
    | "right"
    | "downRight"
    | "down"
    | "downLeft"
    | "left"
    | "upLeft"
    | "spikes"
    | "fire"
    | "poison"
    | "blades";

export type CombatSequenceAction =
  | "attack"
  | "defense"
  | "special"
  | "defenseSpecial";

export interface MinigameHeroHudConfig {
  portraitAtlasKey: string;
  portraitImageUrl?: string;
  portraitAtlasData?: object | string;
  portraitFrameName: string;
  health: { current: number; total: number };
  mana: { current: number; total: number };
  fatigue: { current: number; total: number };
}

export interface MinigameAnimatedAtlasConfig {
  atlasKey: string;
  imageUrl?: string;
  atlasData?: object | string;
  idleFrameName?: string;
}

export interface MinigameCombatantResourceConfig {
  current: number;
  total: number;
}

export interface MinigameMonsterHudConfig {
  name: string;
  health: MinigameCombatantResourceConfig;
  mana: MinigameCombatantResourceConfig;
}

export interface MinigameCombatEncounterConfig {
  hero: {
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
  };
  monster: {
    name: string;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
  };
}

export interface MinigameCombatVisualConfig {
  heroDownAtlas: MinigameAnimatedAtlasConfig;
  heroUpAtlas: MinigameAnimatedAtlasConfig;
  heroHorizAtlas: MinigameAnimatedAtlasConfig;
  monsterDownAtlas: MinigameAnimatedAtlasConfig;
  monsterHorizAtlas: MinigameAnimatedAtlasConfig;
  /** Scala dell'atlas del mostro, condivisa con la scena Phaser principale. */
  monsterScale?: number;
}

export interface MinigameResult {
  eventId: string;
  eventType: GameEventType;
  grade: MinigameResultGrade;
  score: number;
  usedSkill: SkillType;
  fatigueGained: number;
  rewardMultiplier: number;
  damageTaken: number;
}

export interface TimingZoneConfig {
  perfect: number;
  success: number;
  partial: number;
}

export type MinigameMetricDisplayMode =
  | "both"
  | "bar"
  | "text";

export interface MinigameConfig {
  type: MinigameType;
  event: GameEvent;
  heroStats: HeroMinigameStats;
  title: string;
  subtitle: string;
  heroHud?: MinigameHeroHudConfig;
  monsterHud?: MinigameMonsterHudConfig;
  combatVisuals?: MinigameCombatVisualConfig;
  combatEncounter?: MinigameCombatEncounterConfig;
  objectiveCount?: number;
  cursorSpeed?: number;
  zones?: TimingZoneConfig;
  sequenceLength?: number;
  actionSequence?: CombatSequenceAction[];
  timeLimitMs?: number;
  previewDurationMs?: number;
  previewStepMs?: number;
  requiredLocks?: number;
  maxFailures?: number;
  laneCount?: number;
  gridSize?: number;
  chargeDurationMs?: number;
  targetLifeMs?: number;
  targetRadius?: number;
  targetRingRadius?: number;
  spawnIntervalMs?: number;
  chargeSpeed?: number;
  perfectZoneWidth?: number;
  targetCenter?: number;
  maxAttempts?: number;
  obstacleSpeed?: number;
  moveCooldownMs?: number;
  rounds?: number;
  chooseTimeMs?: number;
  roundTransitionMs?: number;
  correctZoneHeight?: number;
  rotationSpeed?: number;
  stressGain?: number;
  stressDecay?: number;
  timeDisplayMode?: MinigameMetricDisplayMode;
  introDelayMs?: number;
  resultRevealDelayMs?: number;
  slotMachine?: SlotMachineConfig;
  runtimeEventEmitter?: (
    type: PhaserGameplayEventType,
    message: string,
    values: Record<string, number | string | boolean | null | undefined>,
  ) => void;
}

export type ResolvedMinigameConfig = MinigameConfig;

export interface MinigameOverlayPayload {
  event: GameEvent;
  heroStats: HeroMinigameStats;
  config: MinigameConfig;
  parentSceneKey?: string;
  onComplete?: (result: MinigameResult) => void;
}
