import { GameplaySessionVariant } from "../../../models/gameplay-session.model";

/** Fixed action set shown in the expandable gameplay panel. */
export const RDN_ACTION_IDS = ["invert", "skip", "zero", "cleanse-corruption", "break-chains", "destroy-fire-walls", "destroy-ice-walls", "destroy-stone-walls"] as const;
export type RdnActionId = typeof RDN_ACTION_IDS[number];
export interface RdnActionDefinition { id: RdnActionId; label: string; description: string; icon: string; price: number; charges: number; cooldownMs: number; modes: readonly GameplaySessionVariant[]; targeting: "active-flow" | "board" | "timer"; }
export interface RdnActionInstance { id: RdnActionId; charges: number; cooldownUntil: number; }

const ALL_MODES = ["adventure", "time-attack", "free"] as const;
export const RDN_ACTION_CATALOG: Readonly<Record<RdnActionId, RdnActionDefinition>> = {
  zero: { id: "zero", label: "Azzeramento gemma", description: "Porta a zero la gemma del flusso attivo.", icon: "reset-zero", price: 100, charges: 1, cooldownMs: 0, modes: ALL_MODES, targeting: "active-flow" },
  "destroy-fire-walls": { id: "destroy-fire-walls", label: "Distruggi muri fuoco", description: "Rimuove tutti i muri di fuoco dal tabellone.", icon: "destroy-fire-wall", price: 180, charges: 1, cooldownMs: 0, modes: ALL_MODES, targeting: "board" },
  "destroy-ice-walls": { id: "destroy-ice-walls", label: "Distruggi muri ghiaccio", description: "Rimuove tutti i muri di ghiaccio dal tabellone.", icon: "destroy-ice-wall", price: 180, charges: 1, cooldownMs: 0, modes: ALL_MODES, targeting: "board" },
  "destroy-stone-walls": { id: "destroy-stone-walls", label: "Distruggi muri pietra", description: "Rimuove tutti i muri di pietra dal tabellone.", icon: "destroy-wall", price: 160, charges: 1, cooldownMs: 0, modes: ALL_MODES, targeting: "board" },
  skip: { id: "skip", label: "Skip impulso", description: "Salta il flusso operativo corrente.", icon: "skip-flow", price: 120, charges: 1, cooldownMs: 0, modes: ALL_MODES, targeting: "active-flow" },
  "cleanse-corruption": { id: "cleanse-corruption", label: "Annulla corruzione", description: "Rimuove tutti gli effetti corruzione dal tabellone.", icon: "cleanse-corruption", price: 160, charges: 1, cooldownMs: 0, modes: ALL_MODES, targeting: "board" },
  invert: { id: "invert", label: "Inverti segno", description: "Inverte il segno della gemma del flusso attivo.", icon: "effect-mirror-sign", price: 100, charges: 1, cooldownMs: 0, modes: ALL_MODES, targeting: "active-flow" },
  "break-chains": { id: "break-chains", label: "Rompi catene", description: "Rimuove tutte le catene dal tabellone.", icon: "break-chain", price: 140, charges: 1, cooldownMs: 0, modes: ALL_MODES, targeting: "board" },
};
