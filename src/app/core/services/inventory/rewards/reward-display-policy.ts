import { FrameItem, RewardItem, RewardItemType } from '../../../models/game.models';
import { RuleType } from '../../../models/remote/event.model';


const RULE_LABELS: Record<RuleType, string> = {
  xpRewardMultiplier: 'Moltiplicatore XP',
  gemRewardMultiplier: 'Moltiplicatore gemme',
  coinRewardMultiplier: 'Moltiplicatore coins',
  attackGameMultiplier: 'Moltiplicatore attacco',
  defenceGameMultiplier: 'Moltiplicatore difesa',
  specialGameMultiplier: 'Moltiplicatore speciale',
};

const RULE_FRAMES: Record<RuleType, FrameItem> = {
  xpRewardMultiplier: { name: 'btn_star_large', effect: 'none' },
  gemRewardMultiplier: { name: 'crystal_single', effect: 'none' },
  coinRewardMultiplier: { name: 'coin_single', effect: 'none' },
  attackGameMultiplier: { name: 'icon-sword-shield', effect: 'none' },
  defenceGameMultiplier: { name: 'equip-type-shield', effect: 'none' },
  specialGameMultiplier: { name: 'magic_dust_single', effect: 'none' },
};

const REWARD_LABELS: Record<RewardItemType, string> = {
  resource: 'Risorsa',
  'resource:res1': 'Polvere',
  'resource:res2': 'Gemme',
  equip: 'Equip',
  'equip:weapon': 'Arma',
  'equip:shield': 'Scudo',
  'equip:armor': 'Armatura',
  'equip:helmet': 'Elmo',
  'equip:ring': 'Anello',
  'equip:artifact': 'Artefatto',
  hero: 'Eroe',
  box: 'Chest',
  coins: 'Coins',
  gems: 'Gem',
  stars: 'Dust',
};

const REWARD_FRAMES: Record<RewardItemType, FrameItem> = {
  resource: { name: 'resource-dust-red', effect: 'none' },
  'resource:res1': { name: 'resource-dust-red', effect: 'none' },
  'resource:res2': { name: 'resource-gem-red-octagon', effect: 'none' },
  equip: { name: 'icon-sword-shield', effect: 'none' },
  'equip:weapon': { name: 'equip-type-weapon', effect: 'none' },
  'equip:shield': { name: 'equip-type-shield', effect: 'none' },
  'equip:armor': { name: 'equip-type-armor', effect: 'none' },
  'equip:helmet': { name: 'equip-type-helmet', effect: 'none' },
  'equip:ring': { name: 'equip-type-ring', effect: 'none' },
  'equip:artifact': { name: 'equip-type-staff', effect: 'none' },
  hero: { name: 'icon-hero-avatar', effect: 'none' },
  box: { name: 'chest', effect: 'none' },
  coins: { name: 'coin_single', effect: 'none' },
  gems: { name: 'crystal_single', effect: 'none' },
  stars: { name: 'magic_dust_single', effect: 'none' },
};

export function rewardLabel(type: RewardItemType): string {
  return REWARD_LABELS[type];
}

export function rewardFrame(type: RewardItemType): FrameItem {
  return REWARD_FRAMES[type];
}

export function rewardRange(reward: Pick<RewardItem, 'min' | 'max'>, formatter: (value: number) => string = String): string {
  return reward.min === reward.max
    ? `x${formatter(reward.min)}`
    : `x${formatter(reward.min)}-${formatter(reward.max)}`;
}

export function rewardMaxValue(rewards: readonly RewardItem[] | null | undefined, type: RewardItemType): number {
  return (rewards ?? [])
    .filter((reward) => reward.type === type)
    .reduce((total, reward) => total + Math.max(0, reward.max), 0);
}

export function rewardPreviewText(rewards: readonly RewardItem[] | null | undefined): string {
  return (rewards ?? [])
    .map((reward) => `${rewardLabel(reward.type)} ${rewardRange(reward)}`)
    .join(' · ');
}


export function ruleLabel(type: RuleType): string {
  return RULE_LABELS[type];
}

export function ruleFrame(type: RuleType): FrameItem {
  return RULE_FRAMES[type];
}
