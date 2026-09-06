import { Injectable, inject } from '@angular/core';
import { ThemeService } from '../../app/theme/theme.service';

import { atlasData as atlasFantasyBgIconDataSet1 } from 'src/assets/ui/fantasy_bg/atlas/atlas-icons-set1';
import { atlasData as atlasFantasyBgIconDataSet2 } from 'src/assets/ui/fantasy_bg/atlas/atlas-icons-set2';
import { atlasData as atlasFantasyBgIconDataSet3 } from 'src/assets/ui/fantasy_bg/atlas/atlas-icons-set3';
import { atlasData as atlasFantasyBgIconDataSet4 } from 'src/assets/ui/fantasy_bg/atlas/atlas-icons-set4';
import { atlasData as atlasFantasyBgIconDataSet5 } from 'src/assets/ui/fantasy_bg/atlas/atlas-icons-set5';
import { atlasData as atlasFantasyBgPanelDataSet1 } from 'src/assets/ui/fantasy_bg/atlas/atlas-panel-set1';
import { atlasData as atlasFantasyBgResIconDataSet1 } from 'src/assets/ui/fantasy_bg/atlas/atlas-res-icons-set1';
import { atlasData as atlasFantasyBgResIconDataSet2 } from 'src/assets/ui/fantasy_bg/atlas/atlas-res-icons-set2';
import { atlasData as atlasFantasyBgBoxDataSet1 } from 'src/assets/ui/fantasy_bg/atlas/atlas-box-set1';
import { atlasData as atlasFantasyBgTopDataSet1 } from 'src/assets/ui/fantasy_bg/atlas/atlas-top-set1';
import { atlasData as atlasFantasyBgButtonDataSet1 } from 'src/assets/ui/fantasy_bg/atlas/atlas-button-set1';
import { atlasData as atlasFantasyBgAbilitaDataSet1 } from 'src/assets/ui/fantasy_bg/atlas/atlas-abilita-set1';
import { atlasData as atlasFantasyBgCharactersDataSet1 } from 'src/assets/ui/fantasy_bg/atlas/atlas-characters-set1';
import { atlasData as atlasFantasyBgEquipDataSet1 } from 'src/assets/ui/fantasy_bg/atlas/atlas-equip-set1';
import { atlasData as atlasFantasyBgGameDataSet1 } from 'src/assets/ui/fantasy_bg/atlas/atlas-game-set1';
import { atlasData as atlasFantasyBgEquipTypeDataSet1 } from 'src/assets/ui/fantasy_bg/atlas/atlas-equip-type-set1';
import { atlasData as atlasFantasyBgStarDataSet1 } from 'src/assets/ui/fantasy_bg/atlas/atlas-star-set1';
import { atlasData as atlasFantasyBgStarDataSet2 } from 'src/assets/ui/fantasy_bg/atlas/atlas-star-set2';
import { atlasData as atlasFantasyBgChestDataSet1 } from 'src/assets/ui/fantasy_bg/atlas/atlas-chest-set1';
import { atlasData as atlasFantasyBgEventDataSet1 } from 'src/assets/ui/fantasy_bg/atlas/atlas-event-set1';
import { atlasData as atlasFantasyBgStoryDataSet1 } from 'src/assets/ui/fantasy_bg/atlas/atlas-story-set1';
import { atlasData as atlasFantasyBgBadgesDataSet1 } from 'src/assets/ui/fantasy_bg/atlas/atlas-badges-set1';
import { atlasData as atlasFantasyBgHudsDataSet1 } from 'src/assets/ui/fantasy_bg/atlas/atlas-hud-set1';
import { atlasData as atlasFantasyBgGemsDataSet1 } from 'src/assets/game/fantasy_bg/atlas/atlas-gem-set1';
import { atlasData as atlasFantasyBgEffectsDataSet1 } from 'src/assets/game/fantasy_bg/atlas/atlas-effect-set1';
import { atlasData as atlasFantasyBgEffectsDataSet2 } from 'src/assets/game/fantasy_bg/atlas/atlas-effect-set2';
import { atlasData as atlasGameActionsDataSet1 } from 'src/assets/game/fantasy_bg/atlas/atlas-game-action-set1';



export interface AtlasFrame {
  atlas: string;

  x: number;
  y: number;

  width: number;
  height: number;

  atlasWidth: number;
  atlasHeight: number;
}
interface AtlasFrameEntry {
  frame: { x: number; y: number; w: number; h: number };
}

export interface AtlasConfigOption {
  id: string;
  label: string;
  data: AtlasDataSet;
}
export type AtlasSource = 'effects' | 'actions' | 'effect-actions';
/** Legacy UI names mapped to the refreshed generic icon atlas. */
const ICON_SET1_FRAME_ALIASES: Readonly<Record<string, string>> = {
  'icon-profile-s2': 'icon-user', 'icon-settings-s2': 'icon-settings',
  'icon-play': 'icon-forward', 'icon-close-large': 'icon-close', 'icon-cancel': 'icon-close',
  'icon-shop-s2': 'icon-shop', 'icon-inventory-s2': 'icon-inventory', 'icon-trophy-s2': 'icon-trophy',
};
interface AtlasDataSet {
  frames: Record<string, AtlasFrameEntry>;
  meta?: { image?: string; size?: { w: number; h: number } };
}

@Injectable({
  providedIn: 'root'
})
export class AtlasService {
  private readonly theme = inject(ThemeService);

  /**
   * Atlas frames registry
   */
  readonly framesDefault: AtlasFrame = {
      atlas: '/assets/ui/not_found.png',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      atlasWidth: 0,
      atlasHeight: 0
  };
  
  private readonly atlasFantasybgDataSets: AtlasDataSet[] = [
    atlasFantasyBgIconDataSet1,
    atlasFantasyBgIconDataSet2,
	atlasFantasyBgIconDataSet3,
	atlasFantasyBgIconDataSet4,
  atlasFantasyBgIconDataSet5,
    atlasFantasyBgPanelDataSet1,
    atlasFantasyBgResIconDataSet1,
	atlasFantasyBgResIconDataSet2,
    atlasFantasyBgChestDataSet1,
  	atlasFantasyBgTopDataSet1,
	atlasFantasyBgButtonDataSet1,
	atlasFantasyBgAbilitaDataSet1,
	atlasFantasyBgCharactersDataSet1,
	atlasFantasyBgEquipDataSet1,
	atlasFantasyBgGameDataSet1,
	atlasFantasyBgEquipTypeDataSet1,
	atlasFantasyBgStarDataSet1,
	atlasFantasyBgStarDataSet2,
	atlasFantasyBgBoxDataSet1,
	atlasFantasyBgEventDataSet1,
	atlasFantasyBgStoryDataSet1,
	atlasFantasyBgBadgesDataSet1,
  atlasFantasyBgHudsDataSet1,
  atlasFantasyBgGemsDataSet1,
  atlasFantasyBgEffectsDataSet1,
  atlasFantasyBgEffectsDataSet2
  ];
  
  private readonly atlasDataSets: AtlasDataSet[] = [
    ...this.atlasFantasybgDataSets
  ];
  private readonly namedAtlasDataSets: Readonly<Record<AtlasSource, AtlasDataSet>> = {
    effects: atlasFantasyBgEffectsDataSet1,
    actions: atlasGameActionsDataSet1,
    'effect-actions': atlasFantasyBgEffectsDataSet2,
  };

  readonly configuredAtlasOptions: AtlasConfigOption[] = [
    { id: 'fantasy-bg-icons-set1', label: 'Fantasy BG - Icons Set 1', data: atlasFantasyBgIconDataSet1 },
    { id: 'fantasy-bg-icons-set2', label: 'Fantasy BG - Icons Set 2', data: atlasFantasyBgIconDataSet2 },
	{ id: 'fantasy-bg-icons-set3', label: 'Fantasy BG - Icons Set 3', data: atlasFantasyBgIconDataSet3 },
	{ id: 'fantasy-bg-icons-set4', label: 'Fantasy BG - Icons Set 4', data: atlasFantasyBgIconDataSet4 },
  { id: 'fantasy-bg-icons-set5', label: 'Fantasy BG - Icons Set 5', data: atlasFantasyBgIconDataSet5 },
	{ id: 'fantasy-bg-stars-set1', label: 'Fantasy BG - Stars Set 1', data: atlasFantasyBgStarDataSet1 },
	{ id: 'fantasy-bg-stars-set2', label: 'Fantasy BG - Stars Set 2', data: atlasFantasyBgStarDataSet2 },
    { id: 'fantasy-bg-panel-set1', label: 'Fantasy BG - Panel Set 1', data: atlasFantasyBgPanelDataSet1 },
    { id: 'fantasy-bg-res-icons-set1', label: 'Fantasy BG - Resource Icons Set 1', data: atlasFantasyBgResIconDataSet1 },
	{ id: 'fantasy-bg-res-icons-set2', label: 'Fantasy BG - Resource Icons Set 2', data: atlasFantasyBgResIconDataSet2 },
    { id: 'fantasy-bg-box-set1', label: 'Fantasy BG - Box Set 1', data: atlasFantasyBgBoxDataSet1 },
    { id: 'fantasy-bg-top-set1', label: 'Fantasy BG - Top Set 1', data: atlasFantasyBgTopDataSet1 },
    { id: 'fantasy-bg-hud-set1', label: 'Fantasy BG - HUD Set 1', data: atlasFantasyBgHudsDataSet1 },
	{ id: 'fantasy-bg-button-set1', label: 'Fantasy BG - Button Set 1', data: atlasFantasyBgButtonDataSet1 },
	{ id: 'fantasy-bg-abilita-set1', label: 'Fantasy BG - Abilità Set 1', data: atlasFantasyBgAbilitaDataSet1 },
	{ id: 'fantasy-bg-characters-set1', label: 'Fantasy BG - Characters Set 1', data: atlasFantasyBgCharactersDataSet1 },
	{ id: 'fantasy-bg-equips-set1', label: 'Fantasy BG - Equip Set 1', data: atlasFantasyBgEquipDataSet1 },
	{ id: 'fantasy-bg-game-set1', label: 'Fantasy BG - Game Set 1', data: atlasFantasyBgGameDataSet1 },
	{ id: 'fantasy-bg-equip-type-set1', label: 'Fantasy BG - Equip Type Set 1', data: atlasFantasyBgEquipTypeDataSet1 },
	{ id: 'fantasy-bg-chest-type-set1', label: 'Fantasy BG - Chest Type Set 1', data: atlasFantasyBgChestDataSet1 },
	{ id: 'fantasy-bg-event-type-set1', label: 'Fantasy BG - Event Type Set 1', data: atlasFantasyBgEventDataSet1 },
	{ id: 'fantasy-bg-story-type-set1', label: 'Fantasy BG - Story Type Set 1', data: atlasFantasyBgStoryDataSet1 },
	{ id: 'fantasy-bg-badges-type-set1', label: 'Fantasy BG - Badges Type Set 1', data: atlasFantasyBgBadgesDataSet1 },
  { id: 'fantasy-bg-gems-type-set1', label: 'Fantasy BG - Gems Type Set 1', data: atlasFantasyBgGemsDataSet1 },
  { id: 'fantasy-bg-effects-type-set1', label: 'Fantasy BG - Effects Type Set 1', data: atlasFantasyBgEffectsDataSet1 },
  { id: 'fantasy-bg-effects-type-set2', label: 'Fantasy BG - Effects Type Set 2', data: atlasFantasyBgEffectsDataSet2 }

  ];

  /**
   * Compatibility list for the generic atlas utility. Removed hero and monster
   * sheets now fall back to the remaining UI atlases.
   */
  readonly configuredAtlasHeroOptions: AtlasConfigOption[] = this.configuredAtlasOptions;

  /**
   * Risolve il frame di un atlas partendo dal nome logico usato dai componenti UI.
   * Scansiona in ordine i dataset configurati, verifica che il frame e i metadati immagine
   * siano presenti e restituisce coordinate, dimensioni e path dell'atlas; se non trova
   * nulla usa il frame di fallback `not_found`.
   */
  resolveFrame(frameName: string, source?: AtlasSource): AtlasFrame {
    // Some gameplay effects (currently FIRE and CHAIN) intentionally use the
    // action atlas. `effects` therefore resolves its primary atlas first and
    // falls back to that companion atlas without changing every UI consumer.
    const dataSets = source === 'effects'
      ? [this.namedAtlasDataSets.effects, this.namedAtlasDataSets['effect-actions']]
      : source ? [this.namedAtlasDataSets[source]] : this.atlasDataSets;
    const resolvedFrameName = source ? frameName : ICON_SET1_FRAME_ALIASES[frameName] ?? frameName;
    for (const atlas of dataSets) {
      const frame = atlas.frames[resolvedFrameName];
      if (!frame) {
		//console.log("AtlasERVICE - not found ",frameName, atlas.meta?.image);
        continue;
      }

      const image = atlas.meta?.image;
      const size = atlas.meta?.size;

      if (!image || !size) {
        continue;
      }

      return {
        atlas: this.resolveThemeAtlasImagePath(image),
        x: frame.frame.x,
        y: frame.frame.y,
        width: frame.frame.w,
        height: frame.frame.h,
        atlasWidth: size.w,
        atlasHeight: size.h
      };
    }

    return this.framesDefault;
  }

  private resolveThemeAtlasImagePath(image: string): string {
    return image.startsWith('/') ? image : `/${image}`;
  }
}
