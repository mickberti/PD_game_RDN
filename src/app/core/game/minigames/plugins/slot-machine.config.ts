import { GAME_ATLAS } from "../../phaser/config/game-atlas.config";

export interface SlotMachineSymbol {
  id: string;
  label: string;
  atlasKey?: string;
  frameName?: string;
  fallbackColor: number;
  weight: number;
}

export interface SlotMachineWinRule {
  id: string;
  label: string;
  pattern: readonly string[];
  probabilityWeight: number;
  rewardGems: number;
  message: string;
  isJackpot?: boolean;
}

export interface SlotMachineAnimationConfig {
  reelWidth: number;
  reelHeight: number;
  symbolSize: number;
  symbolGap: number;
  visibleSymbolCount: number;
  reelCyclesMin: number;
  reelCyclesMax: number;
  reelStopBounce: boolean;
  reelStopBounceDistance: number;
  reelStopBounceDuration: number;
  winIconPulseScale: number;
  winIconPulseDuration: number;
  winIconGlowColor: number;
  winFrameGlowColor: number;
  winFramePulseDuration: number;
}

export interface SlotMachinePosition {
  x: number;
  y: number;
}

export interface SlotMachineSwipeAreaConfig extends SlotMachinePosition {
  width: number;
  height: number;
  minSwipeDistance: number;
}

export interface SlotMachineLayoutConfig {
  gemsText: SlotMachinePosition;
  spinsText: SlotMachinePosition;
  statusText: SlotMachinePosition;
  spinButton: SlotMachinePosition;
  reels: readonly SlotMachinePosition[];
  swipeArea: SlotMachineSwipeAreaConfig;
}

export interface SlotMachineConfig {
  title: string;
  description: string;
  panelFrame?: string;
  initialGems: number;
  spinCost: number;
  maxSpins: number;
  reelCount: 3;
  spinDurationMs: number;
  reelDelayMs: number;
  reelTickMs: number;
  winChance: number;
  symbols: readonly SlotMachineSymbol[];
  winRules: readonly SlotMachineWinRule[];
  animation: SlotMachineAnimationConfig;
  layout: SlotMachineLayoutConfig;
}

export const DEFAULT_SLOT_SYMBOLS: readonly SlotMachineSymbol[] = [
  { id: "sword", label: "Spada", atlasKey: GAME_ATLAS.actions.key, frameName: "action-attack", fallbackColor: 0xfacc15, weight: 24 },
  { id: "shield", label: "Scudo", atlasKey: GAME_ATLAS.actions.key, frameName: "action-defense", fallbackColor: 0x60a5fa, weight: 24 },
  { id: "magic", label: "Magia", atlasKey: GAME_ATLAS.actions.key, frameName: "action-tornado", fallbackColor: 0xa78bfa, weight: 18 },
  { id: "heal", label: "Cura", fallbackColor: 0x22c55e, weight: 16 },
  { id: "poison", label: "Veleno", atlasKey: GAME_ATLAS.actions.key, frameName: "action-poison", fallbackColor: 0x84cc16, weight: 12 },
  { id: "gem", label: "Gemma", fallbackColor: 0x38bdf8, weight: 6 },
];

export const DEFAULT_SLOT_WIN_RULES: readonly SlotMachineWinRule[] = [
  { id: "triple-gem", label: "Tripla Gemma", pattern: ["gem", "gem", "gem"], probabilityWeight: 2, rewardGems: 120, message: "Jackpot di gemme!", isJackpot: true },
  { id: "triple-magic", label: "Tripla Magia", pattern: ["magic", "magic", "magic"], probabilityWeight: 5, rewardGems: 80, message: "Potere arcano!" },
  { id: "triple-sword", label: "Tripla Spada", pattern: ["sword", "sword", "sword"], probabilityWeight: 8, rewardGems: 50, message: "Combo offensiva!" },
  { id: "two-shields", label: "Doppio Scudo", pattern: ["shield", "shield", "*"], probabilityWeight: 14, rewardGems: 25, message: "Difesa fortunata!" },
  { id: "any-heal", label: "Cura", pattern: ["heal", "*", "*"], probabilityWeight: 18, rewardGems: 15, message: "Energia recuperata!" },
];

export const DEFAULT_SLOT_MACHINE_CONFIG: SlotMachineConfig = {
  title: "Slot Arcana",
  description: "Spendi gemme per attivare i tre rulli e trovare una combinazione vincente.",
  initialGems: 100,
  spinCost: 10,
  maxSpins: 10,
  reelCount: 3,
  spinDurationMs: 900,
  reelDelayMs: 180,
  reelTickMs: 80,
  winChance: 0.28,
  symbols: DEFAULT_SLOT_SYMBOLS,
  winRules: DEFAULT_SLOT_WIN_RULES,
  layout: {
    gemsText: { x: -116, y: -150 },
    spinsText: { x: 116, y: -200 },
    statusText: { x: 0, y: -165 },
    spinButton: { x: -100, y: -60 },
    reels: [
      { x: -80, y: 78 },
      { x: -10, y: 78 },
      { x: 60, y: 78 },
    ],
    swipeArea: { x: 167, y: 30, width: 60, height: 200, minSwipeDistance: 48 },
  },
  animation: {
    reelWidth: 78,
    reelHeight: 165,
    symbolSize: 52,
    symbolGap: 14,
    visibleSymbolCount: 5,
    reelCyclesMin: 22,
    reelCyclesMax: 28,
    reelStopBounce: true,
    reelStopBounceDistance: 8,
    reelStopBounceDuration: 140,
    winIconPulseScale: 1.18,
    winIconPulseDuration: 420,
    winIconGlowColor: 0xfacc15,
    winFrameGlowColor: 0xf59e0b,
    winFramePulseDuration: 650,
  },
};
