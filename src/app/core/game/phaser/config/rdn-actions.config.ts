import { GameplaySessionVariant } from "../../../models/gameplay-session.model";

/** Fixed action set shown in the expandable gameplay panel. */
export const RDN_ACTION_IDS = ["invert", "skip", "zero", "cleanse-corruption", "break-chains", "destroy-fire-walls", "destroy-ice-walls", "destroy-stone-walls"] as const;
export type RdnActionId = typeof RDN_ACTION_IDS[number];
export interface RdnActionDefinition { id: RdnActionId; label: string; description: string; icon: string; charges: number; cooldownMs: number; modes: readonly GameplaySessionVariant[]; targeting: "active-flow" | "board" | "timer"; }
/** Retained only to safely read progress saved by older releases. */
export interface RdnActionLoadout { version: 1; actionIds: readonly RdnActionId[]; }
export interface RdnActionInstance { id: RdnActionId; charges: number; cooldownUntil: number; }

const ALL_MODES = ["adventure", "time-attack", "free"] as const;
export const RDN_ACTION_CATALOG: Readonly<Record<RdnActionId, RdnActionDefinition>> = {
  zero: { id: "zero", label: "Azzeramento gemma", description: "Porta a zero la gemma del flusso attivo.", icon: "reset-zero", charges: 1, cooldownMs: 0, modes: ALL_MODES, targeting: "active-flow" },
  "destroy-fire-walls": { id: "destroy-fire-walls", label: "Distruggi muri fuoco", description: "Rimuove tutti i muri di fuoco dal tabellone.", icon: "destroy-fire-wall", charges: 1, cooldownMs: 0, modes: ALL_MODES, targeting: "board" },
  "destroy-ice-walls": { id: "destroy-ice-walls", label: "Distruggi muri ghiaccio", description: "Rimuove tutti i muri di ghiaccio dal tabellone.", icon: "destroy-ice-wall", charges: 1, cooldownMs: 0, modes: ALL_MODES, targeting: "board" },
  "destroy-stone-walls": { id: "destroy-stone-walls", label: "Distruggi muri pietra", description: "Rimuove tutti i muri di pietra dal tabellone.", icon: "destroy-wall", charges: 1, cooldownMs: 0, modes: ALL_MODES, targeting: "board" },
  skip: { id: "skip", label: "Skip impulso", description: "Salta il flusso operativo corrente.", icon: "skip-flow", charges: 1, cooldownMs: 0, modes: ALL_MODES, targeting: "active-flow" },
  "cleanse-corruption": { id: "cleanse-corruption", label: "Annulla corruzione", description: "Rimuove tutti gli effetti corruzione dal tabellone.", icon: "cleanse-corruption", charges: 1, cooldownMs: 0, modes: ALL_MODES, targeting: "board" },
  invert: { id: "invert", label: "Inverti segno", description: "Inverte il segno della gemma del flusso attivo.", icon: "effect-mirror-sign", charges: 1, cooldownMs: 0, modes: ALL_MODES, targeting: "active-flow" },
  "break-chains": { id: "break-chains", label: "Rompi catene", description: "Rimuove tutte le catene dal tabellone.", icon: "break-chain", charges: 1, cooldownMs: 0, modes: ALL_MODES, targeting: "board" },
};

export const DEFAULT_RDN_ACTION_LOADOUT: RdnActionLoadout = { version: 1, actionIds: RDN_ACTION_IDS };
export const validateRdnActionLoadout = (_value: unknown): RdnActionLoadout => DEFAULT_RDN_ACTION_LOADOUT;
