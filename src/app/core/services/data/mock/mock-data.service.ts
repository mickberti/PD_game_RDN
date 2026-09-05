import { Injectable } from "@angular/core";
import { BottomNavItem, ModeItem, ScoreItem } from "../../../models/game.models";
import { fantasyBottomNav, fantasyBottomUtils } from "../../../models/mock/fantasy/button-navigation-data";
import { fantasyModes } from "../../../models/mock/fantasy/game-data";
import { GameTheme } from "../../app/theme/theme.service";

export interface ThemeMenuState {
  modes: ModeItem[];
  bottomNav: BottomNavItem[];
  bottomUtils: BottomNavItem[];
  scores: ScoreItem[];
}

@Injectable({ providedIn: "root" })
export class MockDataService {
  /** Menu e dati UI attivi per il tema corrente. */
  modes: ModeItem[] = fantasyModes;
  bottomNav: BottomNavItem[] = fantasyBottomNav;
  bottomUtils: BottomNavItem[] = fantasyBottomUtils;
  scores: ScoreItem[] = [];

  fantasyScores: ScoreItem[] = [
    {
      rank: 1,
      title: "James",
      subtitle: "1:36.48",
      color: "yellow",
      icon: { effect: "none", type: "kart", size: "sm" },
    },
    {
      rank: 2,
      title: "Charlotte",
      subtitle: "1:38.99",
      color: "cyan",
      icon: { effect: "none", type: "kart", size: "sm" },
    },
    {
      rank: 3,
      title: "Benjamin",
      subtitle: "1:39.30",
      color: "red",
      icon: { effect: "none", type: "kart", size: "sm" },
    },
    {
      rank: 4,
      title: "Sophia",
      subtitle: "1:40.64",
      color: "dark",
      icon: { effect: "none", type: "kart", size: "sm" },
    },
  ];

  // ####################################################
  // Initial mock data for the "RACE" theme
  // ####################################################

  raceBottomNav: BottomNavItem[] = [
    {
      id: "mode",
      title: "Mode",
      description: "Select game mode",
      route: "/hub",
      active: "home",
	  frame: {name: "crystal_single", effect: "none" },
    },
    {
      id: "kart",
      title: "Kart",
      description: "Select kart and customize",
      route: "/hero",
      active: "active",
	  frame: {name: "crystal_single", effect: "none" },
    },
    {
      id: "power",
      title: "Power",
      description: "View and equip power-ups",
      route: "/power-ups",
      active: "active",
	  frame: {name: "crystal_single", effect: "none" },
    },
    {
      id: "reward",
      title: "Reward",
      description: "Select reward and progress",
	      route: "/award",
      active: "active",
	  frame: {name: "crystal_single", effect: "none" },
    },
    {
      id: "shop",
      title: "Shop",
      description: "Buy coins and items",
      route: "/shop",
      active: "active",
	  frame: {name: "crystal_single", effect: "none" },
      badge: true,
    },
  ];

  raceModes: ModeItem[] = [
    {
      id: "cars",
      title: "2 Cars",
      description: "Seleziona e potenzia il tuo kart.",
      frame: { name: "crystal_single", effect: "none" },
      route: "/gameplay",
      progress: { descr: "", current: 1200, total: 2000 },
    },
    {
      id: "single",
      title: "Single Race",
      description: "Gara rapida arcade.",
      frame: { name: "crystal_single", effect: "none" },
      route: "/gameplay",
      progress: null,
    },
    {
      id: "cup",
      title: "Cup",
      description: "Campionato a tappe.",
      frame: { name: "crystal_single", effect: "none" },
      route: "/results",
      progress: null,
    },
  ];

  raceScores: ScoreItem[] = [
    {
      rank: 1,
      title: "James",
      subtitle: "1:36.48",
      color: "yellow",
      icon: { effect: "none", type: "kart", size: "sm" },
    },
    {
      rank: 2,
      title: "Charlotte",
      subtitle: "1:38.99",
      color: "cyan",
      icon: { effect: "none", type: "kart", size: "sm" },
    },
    {
      rank: 3,
      title: "Benjamin",
      subtitle: "1:39.30",
      color: "red",
      icon: { effect: "none", type: "kart", size: "sm" },
    },
    {
      rank: 4,
      title: "Sophia",
      subtitle: "1:40.64",
      color: "dark",
      icon: { effect: "none", type: "kart", size: "sm" },
    },
  ];

  skrechBottomNav: BottomNavItem[] = [
    {
      id: "mode",
      title: "Mode",
      description: "Select game mode",
      route: "/hub",
      active: "active",
	  frame: {name: "crystal_single", effect: "none" },
    },
    {
      id: "hero",
      title: "Hero",
      description: "Select and upgrade your hero",
      route: "/hero",
      active: "active",
	  frame: {name: "crystal_single", effect: "none" },
    },
    {
      id: "challenges",
      title: "Challenges",
      description: "Complete time-limited challenges for rewards",
      route: "/power-ups",
      active: "active",
	  frame: {name: "crystal_single", effect: "none" },
    },
    {
      id: "reward",
      title: "Reward",
      description: "Select reward and progress",
	      route: "/award",
      active: "active",
	  frame: {name: "crystal_single", effect: "none" },
    },
    {
      id: "shop",
      title: "Shop",
      description: "Buy coins and items",
      route: "/shop",
      active: "active",
      badge: true,
	  frame: {name: "crystal_single", effect: "none" },
    },
  ];

  sketchModes: ModeItem[] = [
    {
      id: "adventure",
      title: "Adventure",
      description: "Modalità principale con ricompense progressive.",
      frame: { name: "crystal_single", effect: "none" },
      route: "/gameplay",
      progress: { descr: "dfasffs", current: 1200, total: 2000 },
    },
    {
      id: "time",
      title: "Time Challenge",
      description: "Sfida veloce con timer e chest rara.",
      frame: { name: "crystal_single", effect: "none" },
      route: "/gameplay",
      progress: null,
    },
    {
      id: "island",
      title: "Dead Island",
      description: "Area bloccata per update futuro.",
      frame: { name: "crystal_single", effect: "none" },
      route: "/results",
      progress: null,
    },
  ];

  sketchScores: ScoreItem[] = [
    {
      rank: 1,
      title: "James",
      subtitle: "1:36.48",
      color: "yellow",
      icon: { effect: "none", type: "kart", size: "sm" },
    },
    {
      rank: 2,
      title: "Charlotte",
      subtitle: "1:38.99",
      color: "cyan",
      icon: { effect: "none", type: "kart", size: "sm" },
    },
    {
      rank: 3,
      title: "Benjamin",
      subtitle: "1:39.30",
      color: "red",
      icon: { effect: "none", type: "kart", size: "sm" },
    },
    {
      rank: 4,
      title: "Sophia",
      subtitle: "1:40.64",
      color: "dark",
      icon: { effect: "none", type: "kart", size: "sm" },
    },
  ];

  setTheme(theme: GameTheme): void {
    const state = this.createMenuState(theme);
    this.modes = state.modes;
    this.bottomNav = state.bottomNav;
    this.bottomUtils = state.bottomUtils;
    this.scores = state.scores;
  }

  private createMenuState(theme: GameTheme): ThemeMenuState {
    if (theme === "sketch") {
      return {
        modes: this.sketchModes,
        bottomNav: this.skrechBottomNav,
        bottomUtils: fantasyBottomUtils,
        scores: this.sketchScores,
      };
    }

    if (theme === "race") {
      return {
        modes: this.raceModes,
        bottomNav: this.raceBottomNav,
        bottomUtils: fantasyBottomUtils,
        scores: this.raceScores,
      };
    }

    return {
      modes: fantasyModes,
      bottomNav: fantasyBottomNav,
      bottomUtils: fantasyBottomUtils,
      scores: this.fantasyScores,
    };
  }
}
