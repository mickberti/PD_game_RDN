import { BottomNavItem } from "../../game.models";

export const fantasyBottomNav: BottomNavItem[] = [{
	id: "mode",
	title: "Mode",
	description: "Select game mode",
	route: "/hub",
	active: "active",
	frame: {name: "icon-home", effect: "none" },
}, {
	id: "game-guide",
	title: "Guida",
	description: "Regole, effetti e modalità di gioco",
	route: "/game-guide",
	active: "active",
	frame: {name: "icon-manual", effect: "none" },
}, {
	id: "inventory",
	title: "Bag",
	description: "View inventory",
	route: "/inventory",
	active: "active",
	frame: {name: "icon-inventory", effect: "none" },
}, {
	id: "reward",
	title: "Reward",
	description: "View reward and progress",
	route: "/reward",
	active: "active",
	frame: {name: "icon-trophy", effect: "none" },
}, {
	id: "shop",
	title: "Shop",
	description: "Buy coins and items",
	route: "/shop",
	active: "active",
	frame: {name: "icon-shop", effect: "none" },
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
		frame: {name: "icon-home", effect: "none" },
	}];
