import { DEFAULT_HACK_SLASH_EFFECT_TUNING, GameEffectKey, HackSlashEffectTuning } from "src/app/core/game/phaser/effects/game-effects.manager";

export type EffectTargetId = "hero" | "monster" | "center";
export type EffectFieldInputType = "number" | "boolean" | "color";

export interface EffectOptionState {
  direction: "up" | "down" | "left" | "right";
  scale: number;
  alpha: number;
  duration: number;
  offsetX: number;
  offsetY: number;
  followTarget: boolean;
  force: boolean;
  colorPrimary: string;
  colorSecondary: string;
}

export interface EffectFieldSchema {
  key: string;
  label: string;
  type: EffectFieldInputType;
  min?: number;
  max?: number;
  step?: number;
}

export type GlobalEffectFieldKey = keyof Pick<
  HackSlashEffectTuning,
  "globalScale" | "globalAlpha" | "globalDurationMultiplier" | "globalDepthOffset"
>;

export const GLOBAL_EFFECT_FIELD_SCHEMAS: EffectFieldSchema[] = [
  { key: "globalScale", label: "Global scale", type: "number", min: 0.2, max: 4, step: 0.05 },
  { key: "globalAlpha", label: "Global alpha", type: "number", min: 0.05, max: 2, step: 0.05 },
  { key: "globalDurationMultiplier", label: "Duration multiplier", type: "number", min: 0.2, max: 3, step: 0.05 },
  { key: "globalDepthOffset", label: "Depth offset", type: "number", min: 1, max: 200, step: 1 },
];

export const EFFECT_FIELD_SCHEMAS: Record<GameEffectKey, EffectFieldSchema[]> = {
  [GameEffectKey.HeroAttack]: [
    { key: "enabled", label: "Enabled", type: "boolean" },
    { key: "originOffsetX", label: "Start X offset", type: "number", min: -120, max: 120, step: 1 },
    { key: "colorPrimary", label: "Primary", type: "color" },
    { key: "colorSecondary", label: "Secondary", type: "color" },
    { key: "colorCore", label: "Core", type: "color" },
    { key: "alpha", label: "Alpha", type: "number", min: 0.05, max: 1.5, step: 0.05 },
    { key: "duration", label: "Duration", type: "number", min: 60, max: 1200, step: 10 },
    { key: "scale", label: "Scale", type: "number", min: 0.2, max: 3, step: 0.05 },
    { key: "arcCount", label: "Arc count", type: "number", min: 1, max: 6, step: 1 },
    { key: "arcRadius", label: "Arc radius", type: "number", min: 8, max: 120, step: 1 },
    { key: "arcThickness", label: "Arc thickness", type: "number", min: 1, max: 20, step: 1 },
    { key: "arcSpread", label: "Arc spread", type: "number", min: 20, max: 170, step: 1 },
    { key: "trailCount", label: "Trail count", type: "number", min: 0, max: 5, step: 1 },
    { key: "sparkCount", label: "Spark count", type: "number", min: 0, max: 20, step: 1 },
    { key: "sparkDistance", label: "Spark distance", type: "number", min: 4, max: 120, step: 1 },
    { key: "forwardOffset", label: "Forward distance", type: "number", min: 0, max: 120, step: 1 },
    { key: "verticalOffset", label: "Start Y offset", type: "number", min: -120, max: 120, step: 1 },
    { key: "rotationOffsetDeg", label: "Rotation deg", type: "number", min: -180, max: 180, step: 1 },
  ],
  [GameEffectKey.MonsterAttack]: [
    { key: "enabled", label: "Enabled", type: "boolean" },
    { key: "originOffsetX", label: "Start X offset", type: "number", min: -120, max: 120, step: 1 },
    { key: "colorPrimary", label: "Primary", type: "color" },
    { key: "colorSecondary", label: "Secondary", type: "color" },
    { key: "colorCore", label: "Core", type: "color" },
    { key: "alpha", label: "Alpha", type: "number", min: 0.05, max: 1.5, step: 0.05 },
    { key: "duration", label: "Duration", type: "number", min: 60, max: 1200, step: 10 },
    { key: "scale", label: "Scale", type: "number", min: 0.2, max: 3, step: 0.05 },
    { key: "arcCount", label: "Arc count", type: "number", min: 1, max: 6, step: 1 },
    { key: "arcRadius", label: "Arc radius", type: "number", min: 8, max: 120, step: 1 },
    { key: "arcThickness", label: "Arc thickness", type: "number", min: 1, max: 20, step: 1 },
    { key: "arcSpread", label: "Arc spread", type: "number", min: 20, max: 170, step: 1 },
    { key: "trailCount", label: "Trail count", type: "number", min: 0, max: 5, step: 1 },
    { key: "sparkCount", label: "Spark count", type: "number", min: 0, max: 20, step: 1 },
    { key: "sparkDistance", label: "Spark distance", type: "number", min: 4, max: 120, step: 1 },
    { key: "forwardOffset", label: "Forward distance", type: "number", min: 0, max: 120, step: 1 },
    { key: "verticalOffset", label: "Start Y offset", type: "number", min: -120, max: 120, step: 1 },
    { key: "rotationOffsetDeg", label: "Rotation deg", type: "number", min: -180, max: 180, step: 1 },
  ],
  [GameEffectKey.HeroSpecial]: [
    { key: "enabled", label: "Enabled", type: "boolean" },
    { key: "originOffsetX", label: "Start X offset", type: "number", min: -120, max: 120, step: 1 },
    { key: "colorPrimary", label: "Primary", type: "color" },
    { key: "colorSecondary", label: "Secondary", type: "color" },
    { key: "colorCore", label: "Core", type: "color" },
    { key: "alpha", label: "Alpha", type: "number", min: 0.05, max: 1.5, step: 0.05 },
    { key: "duration", label: "Duration", type: "number", min: 80, max: 1600, step: 10 },
    { key: "scale", label: "Scale", type: "number", min: 0.2, max: 3, step: 0.05 },
    { key: "ringCount", label: "Ring count", type: "number", min: 0, max: 8, step: 1 },
    { key: "slashCount", label: "Slash count", type: "number", min: 0, max: 8, step: 1 },
    { key: "radialBurstCount", label: "Burst count", type: "number", min: 0, max: 24, step: 1 },
    { key: "radius", label: "Radius", type: "number", min: 8, max: 140, step: 1 },
    { key: "expansion", label: "Expansion", type: "number", min: 1, max: 4, step: 0.05 },
    { key: "rotationSpeed", label: "Rotation speed", type: "number", min: -360, max: 360, step: 1 },
    { key: "verticalOffset", label: "Start Y offset", type: "number", min: -120, max: 120, step: 1 },
  ],
  [GameEffectKey.MonsterSpecial]: [
    { key: "enabled", label: "Enabled", type: "boolean" },
    { key: "originOffsetX", label: "Start X offset", type: "number", min: -120, max: 120, step: 1 },
    { key: "colorPrimary", label: "Primary", type: "color" },
    { key: "colorSecondary", label: "Secondary", type: "color" },
    { key: "colorCore", label: "Core", type: "color" },
    { key: "alpha", label: "Alpha", type: "number", min: 0.05, max: 1.5, step: 0.05 },
    { key: "duration", label: "Duration", type: "number", min: 80, max: 1600, step: 10 },
    { key: "scale", label: "Scale", type: "number", min: 0.2, max: 3, step: 0.05 },
    { key: "ringCount", label: "Ring count", type: "number", min: 0, max: 8, step: 1 },
    { key: "slashCount", label: "Slash count", type: "number", min: 0, max: 8, step: 1 },
    { key: "radialBurstCount", label: "Burst count", type: "number", min: 0, max: 24, step: 1 },
    { key: "radius", label: "Radius", type: "number", min: 8, max: 140, step: 1 },
    { key: "expansion", label: "Expansion", type: "number", min: 1, max: 4, step: 0.05 },
    { key: "rotationSpeed", label: "Rotation speed", type: "number", min: -360, max: 360, step: 1 },
    { key: "verticalOffset", label: "Start Y offset", type: "number", min: -120, max: 120, step: 1 },
  ],
  [GameEffectKey.HeroDefense]: [
    { key: "enabled", label: "Enabled", type: "boolean" },
    { key: "originOffsetX", label: "Start X offset", type: "number", min: -120, max: 120, step: 1 },
    { key: "colorPrimary", label: "Primary", type: "color" },
    { key: "colorSecondary", label: "Secondary", type: "color" },
    { key: "alpha", label: "Alpha", type: "number", min: 0.05, max: 1.5, step: 0.05 },
    { key: "duration", label: "Duration", type: "number", min: 80, max: 1600, step: 10 },
    { key: "scale", label: "Scale", type: "number", min: 0.2, max: 3, step: 0.05 },
    { key: "radius", label: "Radius", type: "number", min: 8, max: 120, step: 1 },
    { key: "ringThickness", label: "Ring thickness", type: "number", min: 1, max: 14, step: 1 },
    { key: "pulseCount", label: "Pulse count", type: "number", min: 1, max: 8, step: 1 },
    { key: "verticalOffset", label: "Start Y offset", type: "number", min: -120, max: 120, step: 1 },
    { key: "followTarget", label: "Follow target", type: "boolean" },
  ],
  [GameEffectKey.MonsterDefense]: [
    { key: "enabled", label: "Enabled", type: "boolean" },
    { key: "originOffsetX", label: "Start X offset", type: "number", min: -120, max: 120, step: 1 },
    { key: "colorPrimary", label: "Primary", type: "color" },
    { key: "colorSecondary", label: "Secondary", type: "color" },
    { key: "alpha", label: "Alpha", type: "number", min: 0.05, max: 1.5, step: 0.05 },
    { key: "duration", label: "Duration", type: "number", min: 80, max: 1600, step: 10 },
    { key: "scale", label: "Scale", type: "number", min: 0.2, max: 3, step: 0.05 },
    { key: "radius", label: "Radius", type: "number", min: 8, max: 120, step: 1 },
    { key: "ringThickness", label: "Ring thickness", type: "number", min: 1, max: 14, step: 1 },
    { key: "pulseCount", label: "Pulse count", type: "number", min: 1, max: 8, step: 1 },
    { key: "verticalOffset", label: "Start Y offset", type: "number", min: -120, max: 120, step: 1 },
    { key: "followTarget", label: "Follow target", type: "boolean" },
  ],
  [GameEffectKey.Heal]: [
    { key: "enabled", label: "Enabled", type: "boolean" },
    { key: "originOffsetX", label: "Start X offset", type: "number", min: -120, max: 120, step: 1 },
    { key: "colorPrimary", label: "Primary", type: "color" },
    { key: "colorSecondary", label: "Secondary", type: "color" },
    { key: "colorCore", label: "Core", type: "color" },
    { key: "alpha", label: "Alpha", type: "number", min: 0.05, max: 1.5, step: 0.05 },
    { key: "duration", label: "Duration", type: "number", min: 80, max: 2000, step: 10 },
    { key: "scale", label: "Scale", type: "number", min: 0.2, max: 3, step: 0.05 },
    { key: "ringCount", label: "Ring count", type: "number", min: 0, max: 8, step: 1 },
    { key: "moteCount", label: "Mote count", type: "number", min: 0, max: 24, step: 1 },
    { key: "riseDistance", label: "Rise distance", type: "number", min: 8, max: 160, step: 1 },
    { key: "radius", label: "Radius", type: "number", min: 8, max: 120, step: 1 },
    { key: "verticalOffset", label: "Start Y offset", type: "number", min: -120, max: 120, step: 1 },
  ],
  [GameEffectKey.Poison]: [
    { key: "enabled", label: "Enabled", type: "boolean" },
    { key: "originOffsetX", label: "Start X offset", type: "number", min: -120, max: 120, step: 1 },
    { key: "colorPrimary", label: "Primary", type: "color" },
    { key: "colorSecondary", label: "Secondary", type: "color" },
    { key: "alpha", label: "Alpha", type: "number", min: 0.05, max: 1.5, step: 0.05 },
    { key: "duration", label: "Duration", type: "number", min: 80, max: 2000, step: 10 },
    { key: "scale", label: "Scale", type: "number", min: 0.2, max: 3, step: 0.05 },
    { key: "hazeCount", label: "Haze count", type: "number", min: 0, max: 8, step: 1 },
    { key: "moteCount", label: "Mote count", type: "number", min: 0, max: 24, step: 1 },
    { key: "riseDistance", label: "Rise distance", type: "number", min: 8, max: 160, step: 1 },
    { key: "radius", label: "Radius", type: "number", min: 8, max: 120, step: 1 },
    { key: "verticalOffset", label: "Start Y offset", type: "number", min: -120, max: 120, step: 1 },
    { key: "wobble", label: "Wobble", type: "number", min: 0, max: 40, step: 1 },
  ],
  [GameEffectKey.Explosion]: [
    { key: "enabled", label: "Enabled", type: "boolean" },
    { key: "originOffsetX", label: "Start X offset", type: "number", min: -120, max: 120, step: 1 },
    { key: "colorPrimary", label: "Primary", type: "color" },
    { key: "colorSecondary", label: "Secondary", type: "color" },
    { key: "colorCore", label: "Core", type: "color" },
    { key: "alpha", label: "Alpha", type: "number", min: 0.05, max: 1.5, step: 0.05 },
    { key: "duration", label: "Duration", type: "number", min: 80, max: 1600, step: 10 },
    { key: "scale", label: "Scale", type: "number", min: 0.2, max: 3, step: 0.05 },
    { key: "ringCount", label: "Ring count", type: "number", min: 0, max: 8, step: 1 },
    { key: "shardCount", label: "Shard count", type: "number", min: 0, max: 24, step: 1 },
    { key: "radius", label: "Radius", type: "number", min: 8, max: 120, step: 1 },
    { key: "expansion", label: "Expansion", type: "number", min: 1, max: 4, step: 0.05 },
    { key: "verticalOffset", label: "Start Y offset", type: "number", min: -120, max: 120, step: 1 },
  ],
  [GameEffectKey.Hit]: [
    { key: "enabled", label: "Enabled", type: "boolean" },
    { key: "originOffsetX", label: "Start X offset", type: "number", min: -120, max: 120, step: 1 },
    { key: "colorPrimary", label: "Primary", type: "color" },
    { key: "colorSecondary", label: "Secondary", type: "color" },
    { key: "alpha", label: "Alpha", type: "number", min: 0.05, max: 1.5, step: 0.05 },
    { key: "duration", label: "Duration", type: "number", min: 40, max: 800, step: 10 },
    { key: "scale", label: "Scale", type: "number", min: 0.2, max: 3, step: 0.05 },
    { key: "slashCount", label: "Slash count", type: "number", min: 0, max: 8, step: 1 },
    { key: "sparkCount", label: "Spark count", type: "number", min: 0, max: 16, step: 1 },
    { key: "radius", label: "Radius", type: "number", min: 4, max: 80, step: 1 },
    { key: "verticalOffset", label: "Start Y offset", type: "number", min: -120, max: 120, step: 1 },
  ],
};

export function cloneEffectTuning(): HackSlashEffectTuning {
  return JSON.parse(JSON.stringify(DEFAULT_HACK_SLASH_EFFECT_TUNING)) as HackSlashEffectTuning;
}

export function parseColorInput(value: string): number {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return 0xffffff;
  }
  if (normalized.startsWith("#")) {
    return Number.parseInt(normalized.slice(1), 16);
  }
  if (normalized.startsWith("0x") || normalized.startsWith("0X")) {
    return Number.parseInt(normalized.slice(2), 16);
  }
  return Number.parseInt(normalized, 16);
}

export function formatColorInput(value: unknown): string {
  const numeric = Number(value ?? 0);
  return `0x${numeric.toString(16).padStart(6, "0")}`;
}
