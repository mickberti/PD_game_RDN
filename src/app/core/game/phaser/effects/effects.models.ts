/** The part of the board an effect belongs to. */
export enum EffectScope {
  GEM = "GEM",
  LINK = "LINK",
  AREA = "AREA",
}

export enum GemEffectType {
  SHIELD = "SHIELD",
  WALL = "WALL",
  MIRROR = "MIRROR",
  AMPLIFIER = "AMPLIFIER",
  INVERTER = "INVERTER",
  ICE = "ICE",
  FIRE = "FIRE",
  TIMER = "TIMER",
  CORRUPTION = "CORRUPTION",
}

/** A timer has one explicit clock source. Seconds are reserved for future level rules. */
export enum TimerUnit {
  IMPULSES = "IMPULSES",
  SECONDS = "SECONDS",
}

export enum LinkEffectType {
  ECHO = "ECHO",
  AMPLIFY = "AMPLIFY",
  INVERT = "INVERT",
  CHAIN = "CHAIN",
}

export enum AreaEffectType {
  BOMB = "BOMB",
  ICE = "ICE",
  INVERTER = "INVERTER",
}

/** Targets selected around the source gem. ALL always excludes the source itself. */
export enum AreaEffectRange {
  ADJACENT = "ADJACENT",
  TWO_ADJACENT = "TWO_ADJACENT",
  ALL = "ALL",
}

export enum LinkDirection {
  BIDIRECTIONAL = "BIDIRECTIONAL",
  FORWARD = "FORWARD",
  REVERSE = "REVERSE",
}

export interface BaseEffectConfig {
  id?: string;
  enabled?: boolean;
  priority?: number;
}

export interface ShieldEffectConfig extends BaseEffectConfig {
  scope: EffectScope.GEM;
  type: GemEffectType.SHIELD;
  strength: number;
  consumable?: boolean;
}
export interface BarrierEffectConfig extends BaseEffectConfig { scope: EffectScope.GEM; type: GemEffectType.WALL | GemEffectType.ICE | GemEffectType.FIRE; strength: number; }
export interface MirrorEffectConfig extends BaseEffectConfig { scope: EffectScope.GEM; type: GemEffectType.MIRROR; }
export interface AmplifierGemEffectConfig extends BaseEffectConfig { scope: EffectScope.GEM; type: GemEffectType.AMPLIFIER; multiplier: number; }
export interface InverterGemEffectConfig extends BaseEffectConfig { scope: EffectScope.GEM; type: GemEffectType.INVERTER; }
export interface TimerEffectConfig extends BaseEffectConfig { scope: EffectScope.GEM; type: GemEffectType.TIMER; turns: number; unit?: TimerUnit; }
export interface CorruptionEffectConfig extends BaseEffectConfig { scope: EffectScope.GEM; type: GemEffectType.CORRUPTION; amount: number; intervalTurns?: number; }
export type GemEffectConfig = ShieldEffectConfig | BarrierEffectConfig | MirrorEffectConfig | AmplifierGemEffectConfig | InverterGemEffectConfig | TimerEffectConfig | CorruptionEffectConfig;

export interface LinkEffectConfig extends BaseEffectConfig {
  scope: EffectScope.LINK;
  type: LinkEffectType;
  multiplier?: number;
  direction?: LinkDirection;
}

export interface AreaEffectConfig extends BaseEffectConfig {
  scope: EffectScope.AREA;
  type: AreaEffectType;
  /** Signed value applied by a BOMB. New presets use values from -7 to -2 and +2 to +7. */
  value?: number;
  /** Number of hits applied by propagated ICE. */
  strength?: number;
  range?: AreaEffectRange;
  /** Legacy radius alias: 1 = ADJACENT, 2 = TWO_ADJACENT. */
  radius?: number;
}

export type EffectConfig = GemEffectConfig | LinkEffectConfig | AreaEffectConfig;

export interface GemEffectTarget {
  type: EffectScope.GEM;
  gemIndex: number;
}

export interface LinkEffectTarget {
  type: EffectScope.LINK;
  fromGemIndex: number;
  toGemIndex: number;
}

export interface AreaEffectTarget {
  type: EffectScope.AREA;
  sourceGemIndex: number;
}

export type EffectTarget = GemEffectTarget | LinkEffectTarget | AreaEffectTarget;

/** Runtime identifiers are deliberately separate from authoring-time array indexes. */
export interface RuntimeGemReference {
  id: string;
  index: number;
}

export type ResolvedEffectTarget =
  | { type: EffectScope.GEM; gem: RuntimeGemReference }
  | { type: EffectScope.LINK; fromGem: RuntimeGemReference; toGem: RuntimeGemReference }
  | { type: EffectScope.AREA; sourceGem: RuntimeGemReference };

export interface ResolvedEffect {
  id: string;
  config: EffectConfig;
  target: ResolvedEffectTarget;
}

export interface FlowRules {
  maxDepth: number;
  allowMultipleIncomingFlows: boolean;
  combineStrategy: FlowCombineStrategy;
}

export enum FlowCombineStrategy {
  SUM = "SUM",
}

export const DEFAULT_FLOW_RULES: FlowRules = {
  maxDepth: 6,
  allowMultipleIncomingFlows: true,
  combineStrategy: FlowCombineStrategy.SUM,
};

/** Optional affinity carried by a numeric gear operator through its whole flow. */
export type ElementalAffinity = "fire" | "ice";

export type FlowSourceType = "DIRECT" | "PROPAGATED" | "AREA";

export interface FlowEvent {
  id: string;
  rootFlowId: string;
  originGemId: string;
  currentGemId: string;
  value: number;
  elementalAffinity?: ElementalAffinity;
  generation: number;
  sourceType: FlowSourceType;
  visitedLinks: ReadonlySet<string>;
}

export interface EffectRuntimeState {
  wallRemainingStrength: Readonly<Record<string, number>>;
  iceRemainingStrength: Readonly<Record<string, number>>;
  fireRemainingStrength: Readonly<Record<string, number>>;
  /** Temporary ice applied by an area effect, keyed by target gem id. */
  areaIceRemainingStrength: Readonly<Record<string, number>>;
  shieldRemainingStrength: Readonly<Record<string, number>>;
  timerRemainingTurns: Readonly<Record<string, number>>;
  completedTimerIds: readonly string[];
  expiredTimerIds: readonly string[];
  turn: number;
}

export type EffectEngineEventType = "FLOW_STARTED" | "FLOW_PROPAGATED" | "FLOW_ARRIVED" | "FLOW_MERGED" | "CHAIN_BLOCKED" | "SHIELD_ABSORBED" | "SHIELD_DEPLETED" | "WALL_HIT" | "WALL_BROKEN" | "MIRROR_APPLIED" | "GEM_AMPLIFIER_APPLIED" | "GEM_INVERTER_APPLIED" | "ICE_HIT" | "ICE_BROKEN" | "FIRE_HIT" | "FIRE_BROKEN" | "ELEMENTAL_BYPASSED" | "ELEMENTAL_BLOCKED" | "TIMER_TICK" | "TIMER_EXPIRED" | "TIMER_COMPLETED" | "CORRUPTION_APPLIED" | "AREA_TRIGGERED" | "BOMB_TRIGGERED" | "AREA_ICE_TRIGGERED" | "AREA_ICE_APPLIED" | "AREA_INVERTER_TRIGGERED" | "AREA_INVERTER_APPLIED" | "GEM_VALUE_CHANGED";
export interface EffectEngineEvent {
  type: EffectEngineEventType;
  flowId?: string;
  gemId?: string;
  linkId?: string;
  value?: number;
  generation: number;
  incomingValue?: number;
  absorbedValue?: number;
  effectiveValue?: number;
  remainingStrength?: number;
  initialStrength?: number;
  multiplier?: number;
  valueBeforeOperation?: number;
  valueAfterOperation?: number;
  valueAfterInversion?: number;
  remainingTurns?: number;
  initialTurns?: number;
  previousValue?: number;
  newValue?: number;
  amount?: number;
  elementalAffinity?: ElementalAffinity;
  turn?: number;
}
