import type { MinigameType } from "./minigame.model";

export type GameEventType =
  | "monster"
  | "trap"
  | "treasure"
  | "slot";

export type SkillType =
  | "strength"
  | "dexterity"
  | "intelligence"
  | "defense"
  | "luck"
  | "fatigue";

export interface GameEvent {
  id: string;
  type: GameEventType;
  title: string;
  difficulty: number;
  minigameType?: MinigameType;
  primarySkill: SkillType;
  secondarySkill?: SkillType;
  riskLevel?: number;
  rewardValue?: number;
  damageValue?: number;
}

export interface HeroMinigameStats {
  strength: number;
  dexterity: number;
  intelligence: number;
  defense: number;
  luck: number;
  fatigue: number;
}
