import { ShopItem } from "../../shop.models";
import { effect } from "@angular/core";
import { AwardItem, FrameItem, GlobalItem, HeroAttribute, IconItem, ScoreItem } from "../../game.models";
import { defaulthero } from "./hero-data";

export const defaultGlobalItem: GlobalItem = {
	id: "a1",
	title: "Achievements",
	state: "collect",
};

export const defaultAchievements: GlobalItem = {
	id: "a1",
	title: "Achievements",
	progress: {
		descr: "Tap 300k times",
		current: 30,
		total: 100,
	},
	stars: 3,
	state: "collect",
	icon: { effect: "none", type: "chest", size: "sm" },
};

export const defaultAward: AwardItem = {
	id: "r1",
	type: "reward",
	title: "Name Rewards",
	subtitle: "Reach stage 950",
	statisticDefinition: 	{
	  type: 'enemiesKilled',
	  category: 'combat',
	  title: 'Nemici uccisi',
	  description: 'Numero totale di nemici sconfitti.',
	},
	progress: {
		descr: "Tap 300k times",
		current: 30,
		total: 100,
	},
	icon: { effect: "none", type: "chest", size: "sm" },
	state: "received",
};

export const defaultPowerUps: GlobalItem = {
	id: "attack",
	title: "Attacco aumentato",
	subtitle: "Aumenta la velocità per 10 secondi.",
	icon: { effect: "none", type: "attack", size: "md" },
	price: { frame: {name: "none", effect: "none" }, type: 'gem',amount: 300 },
	state: "collect",
	type: "hero",
};

export const defaultShop: ShopItem = {
	id: "free",
	framePanel: { name: "card-parchment-red-banner", effect: "none" },
	title: "100 Coins",
	item: defaulthero,
	price: { frame: {name: "none", effect: "none" }, type: 'gem',amount: 150 },
	subtitle: "free",
	state: "collect",
	type: "deal",
	stock: 5,
};



export const defaultRanking: ScoreItem = {
    rank: 1,
    icon: { effect: 'none', type: 'trophy', size: 'sm' },
    title: 'Top Player',
    subtitle: '2.450.000 punti',
    color: 'yellow',
  };

  export const defaultFrame: FrameItem = { 
  	effect: "none", 
  	name: "coin", 
  	height: 0,
	width: 0
  };
  
  export const defaultIcon: IconItem = { 
  	effect: "none", 
  	type: "coin", 
  	size: "sm" 
  };
  
  export const defaultHeroAttribute: HeroAttribute = {
		id: "Forza",
		title: "Forza",
		description: "Forza per secondo",
        frame: {name: "skill-fist", effect: "none" },
        bonus: 0,
        malus: 0,
        progress: { descr: "", current: 24, total: 100 },
      }
  
export const defaultMasteryRange: { lower: number; upper: number } = { lower: 1, upper: 10 }

export const defaultLevelRange: { lower: number; upper: number } = { lower: 1, upper: 100 };


/** @deprecated Use defaultHeroAttribute. */
export const defaultHeroAttibute = defaultHeroAttribute;
