import { GameplaySessionVariant } from "../../models/gameplay-session.model";

export const RDN_ACTION_IDS = ["zero", "recalibrate", "break-shield", "purify", "shuffle", "freeze-time"] as const;
export type RdnActionId = typeof RDN_ACTION_IDS[number];
export interface RdnActionDefinition { id: RdnActionId; label: string; description: string; icon: string; charges: number; cooldownMs: number; modes: readonly GameplaySessionVariant[]; targeting: "active-flow" | "board" | "timer"; }
export interface RdnActionLoadout { version: 1; actionIds: [RdnActionId, RdnActionId, RdnActionId]; }
export interface RdnActionInstance { id: RdnActionId; charges: number; cooldownUntil: number; }

export const RDN_ACTION_CATALOG: Readonly<Record<RdnActionId, RdnActionDefinition>> = {
  zero: { id: "zero", label: "Azzeramento", description: "Azzera la gemma attiva.", icon: "action-lightning", charges: 1, cooldownMs: 0, modes: ["adventure", "time-attack", "free"], targeting: "active-flow" },
  recalibrate: { id: "recalibrate", label: "Ricalibra", description: "Ricalibra gli operatori numerici.", icon: "action-tornado", charges: 1, cooldownMs: 0, modes: ["adventure", "free"], targeting: "board" },
  "break-shield": { id: "break-shield", label: "Batti scudo", description: "Rimuove uno strato di scudo.", icon: "action-defense", charges: 1, cooldownMs: 0, modes: ["adventure", "free"], targeting: "active-flow" },
  purify: { id: "purify", label: "Purifica", description: "Rimuove un'afflizione negativa.", icon: "action-heal", charges: 1, cooldownMs: 0, modes: ["adventure", "free"], targeting: "active-flow" },
  shuffle: { id: "shuffle", label: "Rimescola", description: "Rigenera gli interni mantenendo una soluzione.", icon: "action-holy-star", charges: 1, cooldownMs: 0, modes: ["adventure", "free"], targeting: "board" },
  "freeze-time": { id: "freeze-time", label: "Congela tempo", description: "Blocca il timer per 5 secondi.", icon: "action-speed", charges: 1, cooldownMs: 0, modes: ["time-attack"], targeting: "timer" },
};

export const DEFAULT_RDN_ACTION_LOADOUT: RdnActionLoadout = { version: 1, actionIds: ["zero", "recalibrate", "freeze-time"] };
export const validateRdnActionLoadout = (value: unknown): RdnActionLoadout => {
  const ids = (value as Partial<RdnActionLoadout> | null)?.actionIds;
  if (!Array.isArray(ids) || ids.length !== 3 || ids.some((id) => !RDN_ACTION_IDS.includes(id as RdnActionId)) || new Set(ids).size !== 3) return DEFAULT_RDN_ACTION_LOADOUT;
  return { version: 1, actionIds: [ids[0] as RdnActionId, ids[1] as RdnActionId, ids[2] as RdnActionId] };
};
