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

/** The RDN application has one visual theme and one menu data source. */
@Injectable({ providedIn: "root" })
export class MockDataService {
  modes: ModeItem[] = fantasyModes;
  bottomNav: BottomNavItem[] = fantasyBottomNav;
  bottomUtils: BottomNavItem[] = fantasyBottomUtils;
  scores: ScoreItem[] = [];

  setTheme(_theme: GameTheme): void {
    this.modes = fantasyModes;
    this.bottomNav = fantasyBottomNav;
    this.bottomUtils = fantasyBottomUtils;
    this.scores = [];
  }
}
