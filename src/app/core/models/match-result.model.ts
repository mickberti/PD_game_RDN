import { GameOutcomeStatus } from "./game.models";

/** Contratto indipendente dal motore per l'esito di una partita. */
export interface GameResult {
  status: GameOutcomeStatus;
  state: "won" | "gameover";
  title: string;
  message: string;
  score: number;
  elapsedMs?: number;
  heroName: string;
  remainingHealth: number;
  remainingMana: number;
  remainingFatigue: number;
  completedAt: string;
  reason?: string;
  enemiesKilled?: number;
  attacksPerformed?: number;
  specialsPerformed?: number;
  damageDealt?: number;
  damageReceived?: number;
  damageReceivedEvents?: number;
  blocksPerformed?: number;
  treasuresCollected?: number;
  modeId?: string;
  matchLevel?: number;
}
