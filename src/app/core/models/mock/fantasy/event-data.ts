import { GameEvent } from '../../remote/event.model';

const farPast = '2026-01-01T00:00:00.000Z';
const farFuture = '2027-12-31T23:59:59.999Z';


const resourceLevel: Record<number, Partial<Record<number, number>>> = {
  1: { 1: 85, 2: 15 },
  2: { 1: 55, 2: 35, 3: 10 },
  3: { 1: 35, 2: 30, 3: 25, 4: 10 },
  4: { 1: 20, 2: 25, 3: 30, 4: 20, 5: 5 },
  5: { 1: 10, 2: 20, 3: 30, 4: 25, 5: 15 },
};

/**
 * Catalogo mock degli eventi fantasy.
 * Copre le varianti principali di GameEvent: type, mode, reset,
 * availability, duration, reward, banner e rules.
 */
export const mockGameEvents: GameEvent[] = [
  {
    id: 'event-highlight-dragon-hunt',
    title: 'Caccia al Drago',
    enabled: true,
    availability: { startAt: farPast, endAt: farFuture },
    priority: 100,
    type: 'highlight',
    mode: 'solo',
	invertText: true,
	framePanel: {name: 'event-market-stall', effect: 'none'},
	frame: {name: 'badge-star-purple', effect: 'fx-new'},
	reward: [
	  { type: "coins", min: 250, max: 250 },
	  { type: "gems", min: 50, max: 50 },
	  { type: "stars", min: 20, max: 20 },
	],
    banner: { imageUrl: 'assets/img/events/dragon-hunt.png', ctaRoute: '/gameplay' },
    priceItem: { frame: { name: 'icon-gem', effect: 'none' }, type: 'gem', amount: 30 },
    rules: [
      { frame: { name: 'btn_star_large', effect: 'none' }, type: 'xpRewardMultiplier', amount: 1.5 },
      { frame: { name: 'icon-coin', effect: 'none' }, type: 'coinRewardMultiplier', amount: 2 },
      { frame: { name: 'icon-attack', effect: 'none' }, type: 'attackGameMultiplier', amount: 1.15 },
    ],
    reset: { type: 'daily' },
    duration: { days: 7, event: true }
  },
  {
    id: 'event-highlight-arcane-surge',
    title: 'Impulso Arcano',
    enabled: true,
    priority: 90,
    type: 'highlight',
    mode: 'coop',
	framePanel: {name: 'event-treasure-hoard', effect: 'none'},
	frame: {name: 'badge-trophy-blue', effect: 'fx-new'},
	reward: [
	  { type: "resource:res1", min: 5, max: 5, resourceLevelChances: resourceLevel[1] },
	  { type: "coins", min: 160, max: 160 },
	  { type: "equip", min: 1, max: 1, variantChances: { 0: 75, 1: 20, 2: 5 }, masteryChances: { 1: 60, 2: 25, 3: 15 } },
	],
    banner: { imageUrl: 'assets/img/events/arcane-surge.png', ctaRoute: '/award/event' },
    priceItem: { frame: { name: 'icon-gem', effect: 'none' }, type: 'gem', amount: 24 },
    rules: [
      { frame: { name: 'icon-gem', effect: 'none' }, type: 'gemRewardMultiplier', amount: 1.4 },
      { frame: { name: 'icon-magic', effect: 'none' }, type: 'specialGameMultiplier', amount: 1.25 },
    ],
    reset: { type: 'event' },
    availability: { startAt: farPast, endAt: farFuture, weekdays: [1, 2, 3, 4, 5, 6, 7] }
  },
  {
    id: 'event-seasonal-frostfall',
    title: 'Stagione Brina',
    enabled: true,
    availability: { startAt: farPast, endAt: farFuture },
    priority: 70,
    type: 'seasonal',
    mode: 'coop',
	framePanel: {name: 'event-harvest-festival', effect: 'none'},
	frame: {name: 'badge-crown-red', effect: 'fx-new'},
	reward: [
	  { type: "resource:res1", min: 5, max: 5, resourceLevelChances: resourceLevel[2] },
	  { type: "coins", min: 160, max: 160 },
	  { type: "equip", min: 1, max: 1, variantChances: { 0: 75, 1: 20, 2: 5 }, masteryChances: { 1: 60, 2: 25, 3: 15 } },
	],
    banner: { imageUrl: 'assets/img/events/frostfall.png', ctaRoute: '/award/stagione' },
    priceItem: { frame: { name: 'icon-gem', effect: 'none' }, type: 'gem', amount: 60 },
    rules: [
      { frame: { name: 'icon-defense', effect: 'none' }, type: 'defenceGameMultiplier', amount: 1.2 },
      { frame: { name: 'btn_star_large', effect: 'none' }, type: 'xpRewardMultiplier', amount: 1.3 },
    ],
    reset: { type: 'interval', intervalHours: 48 },
    duration: { startAt: farPast, endAt: farFuture }
  },
  {
    id: 'event-daily-arcane-market',
    title: 'Mercato Arcano',
    enabled: true,
    priority: 50,
    type: 'daily',
    mode: 'solo',
	invertText: true,
	framePanel: {name: 'event-alchemy-shop', effect: 'none'},
	frame: {name: 'badge-spellbook-purple', effect: 'fx-new'},
	 reward: [
	   { type: "resource:res2", min: 3, max: 3, resourceLevelChances: resourceLevel[2] },
	   { type: "stars", min: 3, max: 3 },
	   { type: "equip", min: 1, max: 1, variantChances: { 0: 70, 1: 25, 2: 5 }, masteryChances: { 1: 55, 2: 30, 3: 15 } },
	{ type: "hero", min: 1, max: 1, variantChances: { 0: 80, 1: 18, 2: 2 }, masteryChances: { 1: 70, 2: 20, 3: 10 } },
	 ],
    banner: { imageUrl: 'assets/img/events/arcane-market.png', ctaRoute: '/shop' },
    priceItem: { frame: { name: 'icon-coin', effect: 'none' }, type: 'coin', amount: 250 },
    rules: [
      { frame: { name: 'icon-gem', effect: 'none' }, type: 'gemRewardMultiplier', amount: 1.25 },
      { frame: { name: 'icon-coin', effect: 'none' }, type: 'coinRewardMultiplier', amount: 1.1 },
    ],
    reset: { type: 'daily' },
    availability: { startAt: farPast, endAt: farFuture, weekdays: [1, 3, 5, 7] }
  },
  {
    id: 'event-tournament-arena',
    title: 'Arena dei Campioni',
    enabled: true,
    availability: { startAt: farPast, endAt: farFuture },
    priority: 40,
    type: 'tournament',
    mode: 'pvp',
	framePanel: {name: 'event-royal-rewards', effect: 'none'},
	frame: {name: 'badge-crystal-shield-blue', effect: 'fx-new'},
	 reward: [
	   { type: "resource:res2", min: 6, max: 6, resourceLevelChances: resourceLevel[2] },
	   { type: "stars", min: 3, max: 3 },
	   { type: "equip", min: 1, max: 1, variantChances: { 0: 70, 1: 25, 2: 5 }, masteryChances: { 1: 55, 2: 30, 3: 15 } },
	{ type: "hero", min: 1, max: 1, variantChances: { 0: 80, 1: 18, 2: 2 }, masteryChances: { 1: 70, 2: 20, 3: 10 } },
	 ],
    banner: { imageUrl: 'assets/img/events/arena.png', ctaRoute: '/ranking' },
    priceItem: { frame: { name: 'icon-gem', effect: 'none' }, type: 'gem', amount: 40 },
    rules: [
      { frame: { name: 'icon-attack', effect: 'none' }, type: 'attackGameMultiplier', amount: 1.1 },
      { frame: { name: 'icon-defense', effect: 'none' }, type: 'defenceGameMultiplier', amount: 1.1 },
    ],
    reset: { type: 'never' },
    duration: { hours: 12 }
  },
  {
    id: 'event-disabled-tournament',
    title: 'Torneo Disabilitato',
    enabled: false,
    availability: { startAt: farPast, endAt: farFuture },
    priority: 999,
    type: 'tournament',
    mode: 'pvp',
	framePanel: {name: 'event-mystic-crystal', effect: 'none'},
	frame: {name: 'badge-chest-green', effect: 'fx-new'},
  },
  {
    id: 'event-future-season',
    title: 'Stagione Futura',
    enabled: true,
    availability: { startAt: '2099-01-01T00:00:00.000Z', endAt: farFuture },
    priority: 900,
    type: 'seasonal',
    mode: 'coop',
	framePanel: {name: 'none', effect: 'none'},
	frame: {name: 'badge-moon-purple', effect: 'fx-new'},
  }
];
