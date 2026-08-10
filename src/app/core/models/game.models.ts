import { StatisticDefinition } from "./remote/progress.models";
import { AvailabilityWindow } from "./remote/event.model";
import { CollectibleState } from "./shop.models";

export type GameOutcomeStatus = "win" | "lose";
/** @deprecated Use GameOutcomeStatus. */
export type ResultStatus = GameOutcomeStatus;

export const ICON_TYPES = [
	"kart",
	"trophy",
	"speed",
	"fuel",
	"gear",
	"chest",
	"coin",
	"gem",
	"star",
	"potion",
	"coin-triple",
	"gem-triple",
	"star-triple",
	"potion-triple",
	"coin-many",
	"gem-many",
	"star-many",
	"potion-many",
	"map",
	"shop",
	"bag",
	"home",
	"settings",
	"profile",
	"friends",
	"messages",
	"notifications",
	"search",
	"help",
	"logout",
	"video",
	"music",
	"sfx",
	"service",
	"attack",
	"defense",
	"magic",
	"progress",
	"task",
] as const;

export const COMPONENT_SIZE = ['xs' , 'sm' , 'md' , 'lg'] as const;
export const PRICE_TYPES = ['coin' , 'gem' , 'dust'] as const;
export const COMPONENT_MODE = ['primary' , 'secondary' , 'complementary' , 'dark' , 'light', 'none'] as const;
export const COMPONENT_EFFECT = [
  'none',
  'fx-new',
  'fx-uncommon',
  'fx-rare',
  'fx-mythic',
  'fx-legendary',
  'fx-poisoned',
  'fx-frozen',
  'fx-fire',
  'fx-hologram',
  'fx-cursed',
  'fx-arcane-rune',
  'fx-holy-aura',
  'fx-shadow',
  'fx-shadow-veil',
  'fx-nitro-boost',
  'fx-turbo-heat',
  'fx-neon-drift',
  'fx-storm-spark',
  'fx-power-glow',
  'fx-box-open',
  'fx-float',
  'fx-box-enter'
] as const;

export const COMPONENT_JUICY_EFFECT = [
  'fx-juicy_bounce',
  'fx-juicy_bounce_shadow',
  'fx-juicy_coinup',
  'fx-juicy_shake_1',
  'fx-juicy_shake_1_blod',
  'fx-juicy_shake_2',
  'fx-juicy_shake_3',
  'fx-juicy_shake_4',
  'fx-juicy_fade',
  'fx-juicy_zipright',
  'fx-juicy_screenshake',
  'fx-juicy_bubbleup',
  'fx-juicy_bubbleup-1',
  'fx-juicy_bubbleup-2',
  'fx-juicy_bubbleup-3',
  'fx-juicy_bubbleup-4',
  'fx-juicy_collision-fade',
  'fx-juicy__particle',
  'fx-juicy__particle',
  'fx-juicy_attack-initiate',
  'fx-juicy_attack-receive',
  'fx-juicy_smokepuff',
  'fx-juicy_bubble',
  'fx-juicy_titlesweep',
  'fx-juicy_titlespin',
  'fx-juicy_drift',
  'fx-juicy_walk',
  'fx-juicy_hover',
  'fx-juicy_hover_shadow',
  'fx-juicy_idle',
  'fx-juicy_hover_shadow_gold',
  'fx-juicy_hover_shadow_blod',
  'fx-gold-collect',
  'fx-gold-text',
  'fx-gold-fly-to-hud'
] as const;

export const ITEM_TYPE = ['item' , 'hero' , 'deal' , 'global', 'reward', 'resource', 'box', 'stagione'] as const;
export const INVENTORY_ITEM_TYPES = ['hero', 'equip', 'resource', 'chest'] as const;
export const RESOURCE_TYPES = ['res1' , 'res2'] as const;
export const CHEST_TYPES = ['box1' , 'box2'] as const;
export const EQUIP_REWARD_TYPES = ['weapon', 'shield', 'armor', 'helmet', 'ring', 'artifact'] as const;
export const REWARD_ITEM_TYPES = [
	'resource',
	'resource:res1',
	'resource:res2',
	'equip',
	'equip:weapon',
	'equip:shield',
	'equip:armor',
	'equip:helmet',
	'equip:ring',
	'equip:artifact',
	'hero',
	'box',
	'coins',
	'gems',
	'stars',
] as const;

export const ATRIBUTE_TYPES = ['Forza' , 'Destrezza', 'Costituzione', 'Intelligenza', 'Saggezza', 'Carisma'] as const;
export const BONUS_TYPES = ['none', 'Attak', 'Defence', 'velocita'] as const;
export const MASTERY_TYPES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const VARIANTS_TYPES = [0 , 1, 2];
export const BONUS_VALUES = [1, 2, 3];

export type AttributeType = typeof ATRIBUTE_TYPES[number];
export type BonusType = typeof BONUS_TYPES[number];
export type ItemType = typeof ITEM_TYPE[number];
export type InventoryItemType = typeof INVENTORY_ITEM_TYPES[number];
export type IconType = typeof ICON_TYPES[number];
export type PriceType = typeof PRICE_TYPES[number];
export type masteryType = typeof MASTERY_TYPES[number];
export type variantsType = typeof VARIANTS_TYPES[number];
export type BonusValue = typeof BONUS_VALUES[number];

export type ComponentMode = typeof COMPONENT_MODE[number];
export type ComponentSize = typeof COMPONENT_SIZE[number];
export type ComponentEffect = typeof COMPONENT_EFFECT[number];
export type ComponentJuicyEffect = typeof COMPONENT_JUICY_EFFECT[number];
export type UIButtonParticleMode = 'none' | 'part1' | 'part2' | 'part3';

export type ResourceTypeId = typeof RESOURCE_TYPES[number];
export type ChestTypeId = typeof CHEST_TYPES[number];
export type EquipRewardTypeId = typeof EQUIP_REWARD_TYPES[number];
export type RewardItemType = typeof REWARD_ITEM_TYPES[number];

export type InventoryItem = ResourceItem | EquipItem | ChestItem | HeroItem;

export interface TypedInventoryItem {
  itemType: InventoryItemType;
}

export const isInventoryItemType = (value: unknown): value is InventoryItemType =>
  typeof value === 'string' && INVENTORY_ITEM_TYPES.includes(value as InventoryItemType);

export const hasInventoryItemType = <T extends InventoryItemType>(
  item: { itemType?: unknown } | null | undefined,
  itemType: T,
): item is TypedInventoryItem & { itemType: T } => item?.itemType === itemType;


export interface UIButtonParticleConfig {
  count?: number;
  frameNames?: string[];
  effect?: ComponentJuicyEffect | 'juicy__particle' | `fx-${string}`;
  minJump?: number;
  maxJump?: number;
  minSize?: number;
  maxSize?: number;
  spin?: boolean;
  originX?: number;
  originY?: number;
}

export interface UIButtonParticleItem {
  id: string;
  jump: string;
  direction: string;
  spin: string;
  size: string;
  frameName: string;
  effectClass: string;
  originX: number;
  originY: number;
}

export interface UiTabItem {
  id: string;
  title: string;
  frame?: FrameItem;
  route: string;
  size: ComponentSize;
}

export interface ResourceType {
  id: ResourceTypeId;
  title: string;
  description: string;
  frame: FrameItem;
}

export interface ChestType {
  id: ChestTypeId;
  title: string;
  frame: FrameItem;
}

export interface RewardItem {
  type: RewardItemType;
  min: number;
  max: number;
  variantChances?: Partial<Record<variantsType, number>>;
  masteryChances?: Partial<Record<masteryType, number>>;
  resourceLevelChances?: Partial<Record<number, number>>;
}

export interface OpenedRewardItem {
  id: string;
  title: string;
  subtitle: string;
  frame: FrameItem;
  quantity: number;
  rewardType: RewardItemType;
  item?: ResourceItem | EquipItem | HeroItem | ChestItem;
}

export type IconItem = {
	type: IconType;
	effect: ComponentEffect;
	size: ComponentSize;
}

export type FrameItem = {
	name: string;
	effect: ComponentEffect;
	height?: number;
	width?: number;
}

export interface ModeItem {
	id: string;
	title: string;
	description: string;
	frame: FrameItem;
	route: string;
	availability?: AvailabilityWindow;
	progress?: Progress | null;
	mastery?: masteryType;
}

export interface Progress {
	descr: string, 
	current: number, 
	total: number 
}

export interface BonusItem {
	type: BonusType,
	title: string,
	value: number,
	malus: boolean
}

export interface PanelItem {
	variant: ComponentMode;
	stat: CollectibleState;
	size: "sm" | "md";
	title?: string;
}	
	
export interface BottomNavItem {
	id: string;
	title: string;
	description: string;
	route: string;
	active: string;
	badge?: boolean;
	frame: FrameItem;
}

export interface HeroPowerMultiplier {
  id: string;
  title: string;
  value: number;
}

export interface HeroFatigueRestState {
  startedAt: string;
  endsAt: string;
  durationMs: number;
}

export interface HeroItem extends TypedInventoryItem {
  itemType: 'hero';
  id: string;
  title: string;
  description: string;
  level: number;
  mastery: masteryType;
  variant: variantsType;
  heal?: Progress;
  mana?: Progress;
  fatigue?: Progress;
  experience?: Progress;
  attack?: number;
  defense?: number;
  velocita?: number;
  stats: HeroAttribute[];
  price?: PriceItem;
  equip: EquipItem[];
  powerMultipliers?: HeroPowerMultiplier[];
  fatigueRest?: HeroFatigueRestState;
  frame: FrameItem;
}

export interface PriceItem {
	frame: FrameItem;
	type: PriceType;
	amount: number;
}

export interface HeroAttribute {
	id: AttributeType;
	title: string;
	description: string;
	/** @deprecated Use description. */
	descriprion?: string;
	frame?: FrameItem;
	/** Valore base positivo aggiunto al current quando la statistica entra nei calcoli. */
	bonus: number;
	/** Valore base negativo sottratto al current quando la statistica entra nei calcoli. */
	malus: number;
	progress: Progress;
}

export interface GlobalItem {
  id: string;
  framePanel?: FrameItem;
  frame?: FrameItem;
  type?: ItemType;
  title: string;
  subtitle?: string;
  icon?: IconItem;
  progress?: Progress | null;
  stars?: number;
  state: CollectibleState;
  price?: PriceItem;
  stock?: number;
}

export interface AwardItem {
  id: string;
  framePanel?: FrameItem;
  frame?: FrameItem;
  type?: ItemType;
  title: string;
  subtitle?: string;
  icon?: IconItem;
  statisticDefinition: StatisticDefinition;
  progress?: Progress | null;
  stars?: number;
  state: CollectibleState;
  reward?: PriceItem;
  stock?: number;
}

export interface ScoreItem{
	icon: IconItem;
	rank: number;
	title: string;
	subtitle: string;
	color: "yellow" | "red" | "cyan" | "green" | "dark" | "blue";
}

export interface EquipItem extends TypedInventoryItem {
  itemType: 'equip';
  id: string;
  name: string;
  type: EquipType;
  mastery: masteryType;
  level: number;
  variant: variantsType;
  duration: Progress;
  attack: number;
  defense: number;
  velocita: number;
  effect: string;
  experience: Progress;
  bonus: BonusItem;
  bonuses?: BonusItem[];
  price?: PriceItem;
  frame: FrameItem;
}

export interface ResourceItem extends TypedInventoryItem {
  itemType: 'resource';
  id: string;
  name: string;
  description: string;
  type: ResourceType;
  level: number;
  mastery: number;
  price?: PriceItem;
  frame: FrameItem;
  stock?: number;
}

export interface ChestItem extends TypedInventoryItem {
  itemType: 'chest';
  id: string;
  name: string;
  type: ChestType;
  level: number;
  mastery: number;
  description: string;
  reward: RewardItem[];
  price?: PriceItem;
  frame: FrameItem;
  stock?: number;
}

export interface EquipType {
	id: string; 
	title: string; 
	frameName: string;
}

/** @deprecated Use HeroAttribute. */
export type HeroAttibute = HeroAttribute;
