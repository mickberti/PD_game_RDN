import { atlasData as gameFloorAtlas } from '../../../../../assets/game/fantasy_bg/atlas/atlas-game-pavimento-set1';
import { atlasData as gameWallAtlas } from '../../../../../assets/game/fantasy_bg/atlas/atlas-game-walls-set1';
import { atlasData as gamePropsAtlas } from '../../../../../assets/game/fantasy_bg/atlas/atlas-game-oggetti-set1';
import { atlasData as gameActionAtlas } from '../../../../../assets/game/fantasy_bg/atlas/atlas-game-action-set1';
import { atlasData as gameRuneAtlasSet1 } from '../../../../../assets/game/fantasy_bg/atlas/atlas-rune-set1';
import { atlasData as gameRuneAtlasSet2 } from '../../../../../assets/game/fantasy_bg/atlas/atlas-rune-set2';
import { atlasData as gameRuneAtlasSet3 } from '../../../../../assets/game/fantasy_bg/atlas/atlas-rune-set3';
import { atlasData as gameTrapsDirAtlasSet1 } from '../../../../../assets/game/fantasy_bg/atlas/atlas-traps-dir-set1';
import { atlasData as treasureResAtlasSet1 } from '../../../../../assets/ui/fantasy_bg/atlas/atlas-res-icons-set1';
import { atlasData as treasureResAtlasSet2 } from '../../../../../assets/ui/fantasy_bg/atlas/atlas-res-icons-set2';
import { atlasData as treasureChestAtlasSet1 } from '../../../../../assets/ui/fantasy_bg/atlas/atlas-chest-set1';
import { atlasData as panelSet1Atlas } from '../../../../../assets/ui/fantasy_bg/atlas/atlas-panel-set1';
import { atlasData as minigamePanelSet1Atlas } from '../../../../../assets/game/fantasy_bg/atlas/atlas-minigame-set1';
import { atlasData as minigamePanelSet2Atlas } from '../../../../../assets/game/fantasy_bg/atlas/atlas-minigame-set2';
import { atlasData as minigamePanelSet3Atlas } from '../../../../../assets/game/fantasy_bg/atlas/atlas-minigame-set3';
import { atlasData as minigameIconsSet2Atlas } from '../../../../../assets/ui/fantasy_bg/atlas/atlas-icons-set2';
import { atlasData as minigameIconsSet3Atlas } from '../../../../../assets/ui/fantasy_bg/atlas/atlas-icons-set3';
import { atlasData as minigameIconsSet4Atlas } from '../../../../../assets/ui/fantasy_bg/atlas/atlas-icons-set4';
import { atlasData as minigameIconsSet5Atlas } from '../../../../../assets/ui/fantasy_bg/atlas/atlas-icons-set5';
import { atlasData as minigameAbilitaSet1Atlas } from '../../../../../assets/ui/fantasy_bg/atlas/atlas-abilita-set1';
import { atlasData as fantasyPanelSet1Atlas } from '../../../../../assets/ui/fantasy/atlas-panel-set1';
import { atlasData as fantasyResAtlasSet1 } from '../../../../../assets/ui/fantasy/atlas-res-icons-set1';
import { atlasData as fantasyIconsSet2Atlas } from '../../../../../assets/ui/fantasy/atlas-icons-set2';
import { atlasData as raceResAtlasSet1 } from '../../../../../assets/ui/race/atlas/atlas-res-icons-set1';
import { atlasData as raceResAtlasSet2 } from '../../../../../assets/ui/race/atlas/atlas-res-icons-set2';
import { atlasData as raceChestAtlasSet1 } from '../../../../../assets/ui/race/atlas/atlas-chest-set1';
import { atlasData as racePanelSet1Atlas } from '../../../../../assets/ui/race/atlas/atlas-panel-set1';
import { atlasData as raceIconsSet2Atlas } from '../../../../../assets/ui/race/atlas/atlas-icons-set2';
import { atlasData as raceIconsSet3Atlas } from '../../../../../assets/ui/race/atlas/atlas-icons-set3';
import { atlasData as raceIconsSet4Atlas } from '../../../../../assets/ui/race/atlas/atlas-icons-set4';
import { atlasData as sketchResAtlasSet1 } from '../../../../../assets/ui/sketch/atlas/atlas-res-icons-set1';
import { atlasData as sketchResAtlasSet2 } from '../../../../../assets/ui/sketch/atlas/atlas-res-icons-set2';
import { atlasData as sketchChestAtlasSet1 } from '../../../../../assets/ui/sketch/atlas/atlas-chest-set1';
import { atlasData as sketchPanelSet1Atlas } from '../../../../../assets/ui/sketch/atlas/atlas-panel-set1';
import { atlasData as sketchIconsSet2Atlas } from '../../../../../assets/ui/sketch/atlas/atlas-icons-set2';
import { atlasData as sketchIconsSet3Atlas } from '../../../../../assets/ui/sketch/atlas/atlas-icons-set3';
import { atlasData as sketchIconsSet4Atlas } from '../../../../../assets/ui/sketch/atlas/atlas-icons-set4';


export const GAME_ATLAS = {
  floor: { key: 'atlas-game-pavimento-set1', imageUrl: '/assets/game/fantasy_bg/game-pavimento-set1.png', data: gameFloorAtlas },
  walls: { key: 'atlas-game-walls-set1', imageUrl: '/assets/game/fantasy_bg/game-wall-set1.png', data: gameWallAtlas },
  props: { key: 'atlas-game-oggetti-set1', imageUrl: '/assets/game/fantasy_bg/game-oggetti-set1.png', data: gamePropsAtlas },
  actions: { key: 'atlas-game-action-set1', imageUrl: '/assets/game/fantasy_bg/game-action-set1.png', data: gameActionAtlas },
  runesSet1: { key: 'atlas-game-rune-set1', imageUrl: '/assets/game/fantasy_bg/game-rune-set1.png', data: gameRuneAtlasSet1 },
  runesSet2: { key: 'atlas-game-rune-set2', imageUrl: '/assets/game/fantasy_bg/game-rune-set2.png', data: gameRuneAtlasSet2 },
  runesSet3: { key: 'atlas-game-rune-set3', imageUrl: '/assets/game/fantasy_bg/game-rune-set3.png', data: gameRuneAtlasSet3 },
  trapsDirSet1: { key: 'atlas-game-traps-dir-set1', imageUrl: '/assets/game/fantasy_bg/game-traps-dir-set1.png', data: gameTrapsDirAtlasSet1 }
} as const;

export const TREASURE_ATLAS = {
  resIconsSet1: { key: 'treasure-res-icons-set1', imageUrl: '/assets/ui/fantasy_bg/res-icon-set1.png', data: treasureResAtlasSet1 },
  resIconsSet2: { key: 'treasure-res-icons-set2', imageUrl: '/assets/ui/fantasy_bg/res-icon-set2.png', data: treasureResAtlasSet2 },
  chestSet1: { key: 'treasure-chest-set1', imageUrl: '/assets/ui/fantasy_bg/chest-set1.png', data: treasureChestAtlasSet1 }
} as const;

export const MOBILE_UI_ATLAS = {
  panelSet1: { key: 'mobile-ui-panel-set1', imageUrl: '/assets/ui/fantasy_bg/panel-set1.png', data: panelSet1Atlas }
} as const;

export const MINIGAME_UI_ATLAS = {
  panelSet1: { key: 'atlas-minigame-set1', imageUrl: '/assets/game/fantasy_bg/minigame-set1.png', data: minigamePanelSet1Atlas },
  panelSet2: { key: 'atlas-minigame-set2', imageUrl: '/assets/game/fantasy_bg/minigame-set2.png', data: minigamePanelSet2Atlas },
  panelSet3: { key: 'atlas-minigame-set3', imageUrl: '/assets/game/fantasy_bg/minigame-set3.png', data: minigamePanelSet3Atlas },
} as const;

export const MINIGAME_BUTTON_ATLAS = {
  iconsSet2: { key: 'atlas-minigame-icons-set2', imageUrl: '/assets/ui/fantasy_bg/icon-set2.png', data: minigameIconsSet2Atlas },
  iconsSet3: { key: 'atlas-minigame-icons-set3', imageUrl: '/assets/ui/fantasy_bg/icon-set3.png', data: minigameIconsSet3Atlas },
  iconsSet4: { key: 'atlas-minigame-icons-set4', imageUrl: '/assets/ui/fantasy_bg/icons-set4.png', data: minigameIconsSet4Atlas },
  iconsSet5: { key: 'atlas-minigame-icons-set5', imageUrl: '/assets/ui/fantasy_bg/icons-set5.png', data: minigameIconsSet5Atlas },
  abilitaSet1: { key: 'atlas-minigame-abilita-set1', imageUrl: '/assets/ui/fantasy_bg/abilita-set1.png', data: minigameAbilitaSet1Atlas }
} as const;

type UiThemeId = 'fantasy_bg' | 'fantasy' | 'sketch' | 'race';
type AtlasEntry = { key: string; imageUrl: string; data: unknown };

const PHASER_UI_THEME_ATLASES: Record<UiThemeId, {
  treasure?: Partial<Record<keyof typeof TREASURE_ATLAS, AtlasEntry>>;
  mobile?: Partial<Record<keyof typeof MOBILE_UI_ATLAS, AtlasEntry>>;
  minigameUi?: Partial<Record<keyof typeof MINIGAME_UI_ATLAS, AtlasEntry>>;
  minigameButtons?: Partial<Record<keyof typeof MINIGAME_BUTTON_ATLAS, AtlasEntry>>;
}> = {
  fantasy_bg: {},
  fantasy: {
    treasure: {
      resIconsSet1: { key: TREASURE_ATLAS.resIconsSet1.key, imageUrl: '/assets/ui/fantasy/res-icons-set1.png', data: fantasyResAtlasSet1 },
    },
    mobile: {
      panelSet1: { key: MOBILE_UI_ATLAS.panelSet1.key, imageUrl: '/assets/ui/fantasy/panel-set1.png', data: fantasyPanelSet1Atlas },
    },
    minigameButtons: {
      iconsSet2: { key: MINIGAME_BUTTON_ATLAS.iconsSet2.key, imageUrl: '/assets/ui/fantasy/icons-set2.png', data: fantasyIconsSet2Atlas },
    },
  },
  race: {
    treasure: {
      resIconsSet1: { key: TREASURE_ATLAS.resIconsSet1.key, imageUrl: '/assets/ui/race/res-icons-set1.png', data: raceResAtlasSet1 },
      resIconsSet2: { key: TREASURE_ATLAS.resIconsSet2.key, imageUrl: '/assets/ui/race/res-icons-set2.png', data: raceResAtlasSet2 },
      chestSet1: { key: TREASURE_ATLAS.chestSet1.key, imageUrl: '/assets/ui/race/chest-set1.png', data: raceChestAtlasSet1 },
    },
    mobile: {
      panelSet1: { key: MOBILE_UI_ATLAS.panelSet1.key, imageUrl: '/assets/ui/race/panel-set1.png', data: racePanelSet1Atlas },
    },
    minigameButtons: {
      iconsSet2: { key: MINIGAME_BUTTON_ATLAS.iconsSet2.key, imageUrl: '/assets/ui/race/icon-set2.png', data: raceIconsSet2Atlas },
      iconsSet3: { key: MINIGAME_BUTTON_ATLAS.iconsSet3.key, imageUrl: '/assets/ui/race/icon-set3.png', data: raceIconsSet3Atlas },
      iconsSet4: { key: MINIGAME_BUTTON_ATLAS.iconsSet4.key, imageUrl: '/assets/ui/race/icon-set4.png', data: raceIconsSet4Atlas },
    },
  },
  sketch: {
    treasure: {
      resIconsSet1: { key: TREASURE_ATLAS.resIconsSet1.key, imageUrl: '/assets/ui/sketch/res-icons-set1.png', data: sketchResAtlasSet1 },
      resIconsSet2: { key: TREASURE_ATLAS.resIconsSet2.key, imageUrl: '/assets/ui/sketch/res-icons-set2.png', data: sketchResAtlasSet2 },
      chestSet1: { key: TREASURE_ATLAS.chestSet1.key, imageUrl: '/assets/ui/sketch/chest-set1.png', data: sketchChestAtlasSet1 },
    },
    mobile: {
      panelSet1: { key: MOBILE_UI_ATLAS.panelSet1.key, imageUrl: '/assets/ui/sketch/panel-set1.png', data: sketchPanelSet1Atlas },
    },
    minigameButtons: {
      iconsSet2: { key: MINIGAME_BUTTON_ATLAS.iconsSet2.key, imageUrl: '/assets/ui/sketch/icon-set2.png', data: sketchIconsSet2Atlas },
      iconsSet3: { key: MINIGAME_BUTTON_ATLAS.iconsSet3.key, imageUrl: '/assets/ui/sketch/icon-set3.png', data: sketchIconsSet3Atlas },
      iconsSet4: { key: MINIGAME_BUTTON_ATLAS.iconsSet4.key, imageUrl: '/assets/ui/sketch/icon-set4.png', data: sketchIconsSet4Atlas },
    },
  },
};

export function resolveTreasureAtlas(uiThemeId: UiThemeId | string | undefined) {
  return resolveAtlasGroup(TREASURE_ATLAS, PHASER_UI_THEME_ATLASES[normalizeUiThemeId(uiThemeId)].treasure);
}

export function resolveMobileUiAtlas(uiThemeId: UiThemeId | string | undefined) {
  return resolveAtlasGroup(MOBILE_UI_ATLAS, PHASER_UI_THEME_ATLASES[normalizeUiThemeId(uiThemeId)].mobile);
}

export function resolveMinigameUiAtlas(uiThemeId: UiThemeId | string | undefined) {
  return resolveAtlasGroup(MINIGAME_UI_ATLAS, PHASER_UI_THEME_ATLASES[normalizeUiThemeId(uiThemeId)].minigameUi);
}

export function resolveMinigameButtonAtlas(uiThemeId: UiThemeId | string | undefined) {
  return resolveAtlasGroup(MINIGAME_BUTTON_ATLAS, PHASER_UI_THEME_ATLASES[normalizeUiThemeId(uiThemeId)].minigameButtons);
}

function normalizeUiThemeId(uiThemeId: UiThemeId | string | undefined): UiThemeId {
  return uiThemeId === 'fantasy' || uiThemeId === 'sketch' || uiThemeId === 'race' ? uiThemeId : 'fantasy_bg';
}

function resolveAtlasGroup<T extends Record<string, AtlasEntry>>(
  fallbackGroup: T,
  overrides?: Partial<Record<keyof T, AtlasEntry>>,
): T {
  if (!overrides) {
    return fallbackGroup;
  }

  return Object.fromEntries(
    Object.entries(fallbackGroup).map(([key, entry]) => [key, overrides[key as keyof T] ?? entry]),
  ) as T;
}

export const BACKGROUND_FRAMES = {
  floor: [
    'floor-tile-r01-c01', 'floor-tile-r01-c02', 'floor-tile-r01-c03', 'floor-tile-r01-c04', 'floor-tile-r01-c05', 'floor-tile-r01-c06', 'floor-tile-r01-c07',
    'floor-tile-r02-c01', 'floor-tile-r02-c02', 'floor-tile-r02-c03', 'floor-tile-r02-c04', 'floor-tile-r02-c05', 'floor-tile-r02-c06', 'floor-tile-r02-c07',
    'floor-tile-r03-c01', 'floor-tile-r03-c02', 'floor-tile-r03-c03', 'floor-tile-r03-c04', 'floor-tile-r03-c05', 'floor-tile-r03-c06', 'floor-tile-r03-c07',
	'floor-tile-r04-c01', 'floor-tile-r04-c02', 'floor-tile-r04-c03', 'floor-tile-r04-c04', 'floor-tile-r04-c05', 'floor-tile-r04-c06', 'floor-tile-r04-c07',
	
  ],
  wallTop: ['wall-top-01', 'wall-top-02', 'wall-top-03', 'wall-top-04', 'wall-top-05', 'wall-top-06', 'wall-arch-gate'],
  wallMid: ['wall-mid-01', 'wall-mid-02', 'wall-mid-03', 'wall-mid-04'],
  wallSide: ['wall-pillar-01', 'wall-pillar-02', 'wall-pillar-03', 'wall-pillar-04', 'wall-pillar-05', 'wall-pillar-06'],
  props: [
    'prop-barrel-01', 'prop-barrel-02', 'prop-pot-small-01', 'prop-pot-tall-01',
    'prop-crate-01', 'prop-crate-small-01', 'prop-sack-01', 'prop-stone-rubble-altar-01'
  ],
  staticTrap: ['trap-spikes-01', 'trap-spikes-02', 'trap-spikes-03', 'trap-spikes-04', 'trap-spikes-05'],
  dynamicTrap: ['trap-spikes-01', 'trap-spikes-02', 'trap-spikes-03', 'trap-spikes-04', 'trap-spikes-05']
} as const;
