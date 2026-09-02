export interface RankedRules { version: string; completionBase: number; timeBonusPerSecond: number; impulsePenalty: number; rotationPenalty: number; }
export interface ScoreBreakdown { completion: number; timeBonus: number; impulsePenalty: number; rotationPenalty: number; total: number; }
export interface RankedRun { runId: string; levelId: string; seed: number; rulesVersion: string; completed: boolean; elapsedMs: number; impulses: number; rotations: number; submittedAt: number; replay: readonly { atMs: number; action: string }[]; }
export const DEFAULT_RANKED_RULES: RankedRules = { version: "ranked-v1", completionBase: 10000, timeBonusPerSecond: 10, impulsePenalty: 120, rotationPenalty: 15 };
export const scoreRankedRun = (run: RankedRun, rules: RankedRules = DEFAULT_RANKED_RULES): ScoreBreakdown => {
  const timeBonus = Math.max(0, Math.floor(run.elapsedMs / 1000) * -rules.timeBonusPerSecond);
  const impulsePenalty = Math.max(0, run.impulses) * rules.impulsePenalty;
  const rotationPenalty = Math.max(0, run.rotations) * rules.rotationPenalty;
  return { completion: run.completed ? rules.completionBase : 0, timeBonus, impulsePenalty, rotationPenalty, total: (run.completed ? rules.completionBase : 0) + timeBonus - impulsePenalty - rotationPenalty };
};
export const compareRankedRuns = (a: RankedRun, b: RankedRun): number => { const score = scoreRankedRun(b).total - scoreRankedRun(a).total; return score || a.elapsedMs - b.elapsedMs || a.impulses - b.impulses || a.rotations - b.rotations || a.submittedAt - b.submittedAt; };
