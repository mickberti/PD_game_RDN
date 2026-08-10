import { BottomNavItem } from "../../game.models";

export const fantasyBottomNav: BottomNavItem[] = [{
	id: "mode",
	title: "Mode",
	description: "Select game mode",
	route: "/hub",
	active: "active",
	frame: {name: "icon-castle-s2", effect: "none" },
}, {
	id: "hero",
	title: "Hero",
	description: "Select and upgrade your hero",
	route: "/hero",
	active: "active",
	frame: {name: "icon-crown-s2", effect: "none" },
}, {
	id: "inventory",
	title: "Bag",
	description: "View inventory",
	route: "/inventory",
	active: "active",
	frame: {name: "icon-inventory-s2", effect: "none" },
}, {
	id: "reward",
	title: "Reward",
	description: "View reward and progress",
	route: "/reward",
	active: "active",
	frame: {name: "icon-trophy-s2", effect: "none" },
}, {
	id: "shop",
	title: "Shop",
	description: "Buy coins and items",
	route: "/shop",
	active: "active",
	frame: {name: "icon-shop-s2", effect: "none" },
	badge: true,
}];

export const fantasyBottomUtils	: BottomNavItem[] = [{
		id: "component-atlas-icons",
		title: "comp",
		description: "View component",
		route: "/utils/component-atlas-icon",
		active: "active",
		frame: {name: "fatigue", effect: "none" },
	}, {
		id: "frame-animation",
		title: "frame",
		description: "View frame animation",
		route: "/utils/frame-animation",
		active: "active",
		frame: {name: "settings", effect: "none" },
	}, {
		id: "mock",
		title: "mock",
		description: "mock",
		route: "/utils/data-mock",
		active: "active",
		frame: {name: "scroll", effect: "none" },
	}, {
		id: "firestore",
		title: "firestore",
		description: "firestore",
		route: "/admin",
		active: "active",
		frame: {name: "leaderboard", effect: "none" },
	},
		{
		id: "hub",
		title: "Hub",
		description: "Back to hub",
		route: "/hub",
		active: "active",
		frame: {name: "icon-castle-s2", effect: "none" },
	}];
