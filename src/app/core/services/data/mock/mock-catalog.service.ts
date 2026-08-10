import { Injectable } from "@angular/core";

import { GameCatalog } from "../../../models/game-catalog.model";
import { AwardItem, BottomNavItem, EquipItem, EquipType, HeroItem, ModeItem, ScoreItem } from "../../../models/game.models";
import type { GameTheme } from "../../app/theme/theme.service";
import { fantasyAwards } from "../../../models/mock/fantasy/awards-data";
import { chestItemsMock } from "../../../models/mock/fantasy/box-data";
import { fantasyBottomNav, fantasyBottomUtils } from "../../../models/mock/fantasy/button-navigation-data";
import { equipItemsVariantMock, equipTypesMock } from "../../../models/mock/fantasy/equip-data";
import { fantasyModes } from "../../../models/mock/fantasy/game-data";
import { mockHeroItems } from "../../../models/mock/fantasy/hero-data";
import { resourceItemsMock } from "../../../models/mock/fantasy/resource-data";

export interface MockThemeCatalogData {
  modes: ModeItem[];
  bottomNav: BottomNavItem[];
  bottomUtils: BottomNavItem[];
  awards: AwardItem[];
  scores: ScoreItem[];
  heroes: HeroItem[];
  equipType: EquipType[];
  equipItem: EquipItem[];
}

@Injectable({ providedIn: "root" })
export class MockCatalogService {
  createFantasyThemeCatalog(scores: ScoreItem[]): MockThemeCatalogData {
    return {
      modes: fantasyModes,
      bottomNav: fantasyBottomNav,
      bottomUtils: fantasyBottomUtils,
      awards: fantasyAwards,
      scores,
      heroes: mockHeroItems,
      equipType: equipTypesMock,
      equipItem: equipItemsVariantMock,
    };
  }

  createThemeCatalog(
    theme: GameTheme,
    options: {
      raceModes: ModeItem[];
      raceBottomNav: BottomNavItem[];
      raceHeroes: HeroItem[];
      raceScores: ScoreItem[];
      sketchModes: ModeItem[];
      sketchBottomNav: BottomNavItem[];
      sketchHeroes: HeroItem[];
      sketchScores: ScoreItem[];
      fantasyScores: ScoreItem[];
    },
  ): MockThemeCatalogData {
    if (theme === "fantasy" || theme === "fantasy_bg") {
      return this.createFantasyThemeCatalog(options.fantasyScores);
    }

    if (theme === "sketch") {
      return {
        modes: options.sketchModes,
        bottomNav: options.sketchBottomNav,
        bottomUtils: fantasyBottomUtils,
        awards: fantasyAwards,
        scores: options.sketchScores,
        heroes: options.sketchHeroes,
        equipType: equipTypesMock,
        equipItem: [],
      };
    }

    return {
      modes: options.raceModes,
      bottomNav: options.raceBottomNav,
      bottomUtils: fantasyBottomUtils,
      awards: fantasyAwards,
      scores: options.raceScores,
      heroes: options.raceHeroes,
      equipType: equipTypesMock,
      equipItem: [],
    };
  }

  createFantasyGameCatalog(): GameCatalog {
    return {
      heroes: mockHeroItems.map(item => ({ ...item, equip: [...item.equip], stats: item.stats.map(stat => ({ ...stat })) })),
      equip: equipItemsVariantMock.map(item => ({ ...item })),
      boxes: chestItemsMock.map(item => ({ ...item, reward: item.reward.map(reward => ({ ...reward })) })),
      resources: resourceItemsMock.map(item => ({ ...item })),
      awards: fantasyAwards.map(item => ({
        ...item,
        progress: item.progress ? { ...item.progress } : item.progress,
        price: item.reward ? { ...item.reward, frame: { ...item.reward.frame } } : item.reward,
        frame: item.frame ? { ...item.frame } : item.frame,
        framePanel: item.framePanel ? { ...item.framePanel } : item.framePanel,
      })),
    };
  }
}
