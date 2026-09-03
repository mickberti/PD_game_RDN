import { GameplaySessionVariant } from "../../../models/gameplay-session.model";

/** The four gameplay actions always shown in the bottom HUD. */
export const RDN_ACTION_IDS = ["zero", "invert", "double", "skip"] as const;
export type RdnActionId = typeof RDN_ACTION_IDS[number];
export interface RdnActionDefinition { id: RdnActionId; label: string; description: string; icon: string; charges: number; cooldownMs: number; modes: readonly GameplaySessionVariant[]; targeting: "active-flow" | "board" | "timer"; }
export interface RdnActionLoadout { version: 1; actionIds: [RdnActionId, RdnActionId, RdnActionId, RdnActionId]; }
export interface RdnActionInstance { id: RdnActionId; charges: number; cooldownUntil: number; }

export const RDN_ACTION_CATALOG: Readonly<Record<RdnActionId, RdnActionDefinition>> = {
  zero: { id: "zero", label: "Azzeramento", description: "Azzera la gemma del flusso attivo.", icon: "reset-zero", charges: 1, cooldownMs: 0, modes: ["adventure", "time-attack", "free"], targeting: "active-flow" },
  invert: { id: "invert", label: "Cambia segno", description: "Inverte il segno della gemma del flusso attivo.", icon: "wind", charges: 1, cooldownMs: 0, modes: ["adventure", "time-attack", "free"], targeting: "active-flow" },
  double: { id: "double", label: "Moltiplica ×2", description: "Raddoppia il valore della gemma del flusso attivo.", icon: "add-impulse", charges: 1, cooldownMs: 0, modes: ["adventure", "time-attack", "free"], targeting: "active-flow" },
  skip: { id: "skip", label: "Salta flusso", description: "Salta il flusso operativo corrente.", icon: "skip-flow", charges: 1, cooldownMs: 0, modes: ["adventure", "time-attack", "free"], targeting: "active-flow" },
};

export const DEFAULT_RDN_ACTION_LOADOUT: RdnActionLoadout = { version: 1, actionIds: ["zero", "invert", "double", "skip"] };
export const validateRdnActionLoadout = (value: unknown): RdnActionLoadout => {
  const ids = (value as Partial<RdnActionLoadout> | null)?.actionIds;
  if (!Array.isArray(ids) || ids.length !== 4 || ids.some((id) => !RDN_ACTION_IDS.includes(id as RdnActionId)) || new Set(ids).size !== 4) return DEFAULT_RDN_ACTION_LOADOUT;
  return { version: 1, actionIds: [ids[0] as RdnActionId, ids[1] as RdnActionId, ids[2] as RdnActionId, ids[3] as RdnActionId] };
};
