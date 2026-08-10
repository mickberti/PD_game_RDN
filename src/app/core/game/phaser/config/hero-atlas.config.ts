import { HeroItem } from '../../../models/game.models';
import { PhaserAtlasDataSet } from '../../../models/phaser-game-state.model';

import { atlasData as atlasFantasyBgHeroDownDataSet1c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-down-set1c';
import { atlasData as atlasFantasyBgHeroDownDataSet2c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-down-set2c';
import { atlasData as atlasFantasyBgHeroDownDataSet3c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-down-set3c';
import { atlasData as atlasFantasyBgHeroDownDataSet4c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-down-set4c';
import { atlasData as atlasFantasyBgHeroDownDataSet5c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-down-set5c';
import { atlasData as atlasFantasyBgHeroDownDataSet6c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-down-set6c';
import { atlasData as atlasFantasyBgHeroDownDataSet7c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-down-set7c';
import { atlasData as atlasFantasyBgHeroDownDataSet8c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-down-set8c';
import { atlasData as atlasFantasyBgHeroDownDataSet9c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-down-set9c';
import { atlasData as atlasFantasyBgHeroDownDataSet10c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-down-set10c';

import { atlasData as atlasFantasyBgHeroHorizDataSet1c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-horiz-set1c';
import { atlasData as atlasFantasyBgHeroHorizDataSet2c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-horiz-set2c';
import { atlasData as atlasFantasyBgHeroHorizDataSet3c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-horiz-set3c';
import { atlasData as atlasFantasyBgHeroHorizDataSet4c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-horiz-set4c';
import { atlasData as atlasFantasyBgHeroHorizDataSet5c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-horiz-set5c';
import { atlasData as atlasFantasyBgHeroHorizDataSet6c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-horiz-set6c';
import { atlasData as atlasFantasyBgHeroHorizDataSet7c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-horiz-set7c';
import { atlasData as atlasFantasyBgHeroHorizDataSet8c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-horiz-set8c';
import { atlasData as atlasFantasyBgHeroHorizDataSet9c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-horiz-set9c';
import { atlasData as atlasFantasyBgHeroHorizDataSet10c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-horiz-set10c';

import { atlasData as atlasFantasyBgHeroUpDataSet1c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-up-set1c';
import { atlasData as atlasFantasyBgHeroUpDataSet2c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-up-set2c';
import { atlasData as atlasFantasyBgHeroUpDataSet3c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-up-set3c';
import { atlasData as atlasFantasyBgHeroUpDataSet4c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-up-set4c';
import { atlasData as atlasFantasyBgHeroUpDataSet5c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-up-set5c';
import { atlasData as atlasFantasyBgHeroUpDataSet6c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-up-set6c';
import { atlasData as atlasFantasyBgHeroUpDataSet7c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-up-set7c';
import { atlasData as atlasFantasyBgHeroUpDataSet8c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-up-set8c';
import { atlasData as atlasFantasyBgHeroUpDataSet9c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-up-set9c';
import { atlasData as atlasFantasyBgHeroUpDataSet10c } from 'src/assets/game/fantasy_bg/atlas/atlas-hero-up-set10c';

export type HeroSpriteDirection = 'down' | 'up' | 'horiz';

export interface HeroSpriteDirectionAtlas {
  key: string;
  imageUrl: string;
  atlasData: PhaserAtlasDataSet;
  /** Scala puramente visuale di questa direzione. */
  scale: number;
}

export interface HeroSpriteAtlasSet {
  id: string;
  setId: number;
  label: string;
  heroIds: string[];
  directions: Record<HeroSpriteDirection, HeroSpriteDirectionAtlas>;
}

export interface HeroGameAtlasOption {
  id: string;
  label: string;
  setId: number;
  direction: HeroSpriteDirection;
  key: string;
  imageUrl: string;
  atlasData: PhaserAtlasDataSet;
  scale: number;
}

export const HERO_SPRITE_ATLAS_SETS: HeroSpriteAtlasSet[] = [
  {
    id: 'fantasy-bg-hero-set1c',
    setId: 1,
    label: 'Fantasy BG - Hero Set 1c',
    heroIds: ['hero-milo-traveler'],
    directions: {
      down: { key: 'hero-down-set1', imageUrl: 'assets/game/fantasy_bg/hero-down-set1c.png', atlasData: atlasFantasyBgHeroDownDataSet1c , scale: 0.38 },
      up: { key: 'hero-up-set1', imageUrl: 'assets/game/fantasy_bg/hero-up-set1c.png', atlasData: atlasFantasyBgHeroUpDataSet1c , scale: 0.38 },
      horiz: { key: 'hero-horiz-set1', imageUrl: 'assets/game/fantasy_bg/hero-horiz-set1c.png', atlasData: atlasFantasyBgHeroHorizDataSet1c , scale: 0.38 }
    }
  },
  {
    id: 'fantasy-bg-hero-set2',
    setId: 2,
    label: 'Fantasy BG - Hero Set 2',
    heroIds: ['hero-liora-herbalist'],
    directions: {
      down: { key: 'hero-down-set2', imageUrl: 'assets/game/fantasy_bg/hero-down-set2c.png', atlasData: atlasFantasyBgHeroDownDataSet2c , scale: 0.36 },
      up: { key: 'hero-up-set2', imageUrl: 'assets/game/fantasy_bg/hero-up-set2c.png', atlasData: atlasFantasyBgHeroUpDataSet2c , scale: 0.44 },
      horiz: { key: 'hero-horiz-set2', imageUrl: 'assets/game/fantasy_bg/hero-horiz-set2c.png', atlasData: atlasFantasyBgHeroHorizDataSet2c , scale: 0.44 }
    }
  },
  {
    id: 'fantasy-bg-hero-set3',
    setId: 3,
    label: 'Fantasy BG - Hero Set 3',
    heroIds: ['hero-brokk-artisan'],
    directions: {
      down: { key: 'hero-down-set3', imageUrl: 'assets/game/fantasy_bg/hero-down-set3c.png', atlasData: atlasFantasyBgHeroDownDataSet3c , scale: 0.3 },
      up: { key: 'hero-up-set3', imageUrl: 'assets/game/fantasy_bg/hero-up-set3c.png', atlasData: atlasFantasyBgHeroUpDataSet3c , scale: 0.38 },
      horiz: { key: 'hero-horiz-set3', imageUrl: 'assets/game/fantasy_bg/hero-horiz-set3c.png', atlasData: atlasFantasyBgHeroHorizDataSet3c , scale: 0.38 }
    }
  },
  {
    id: 'fantasy-bg-hero-set4',
    setId: 4,
    label: 'Fantasy BG - Hero Set 4',
    heroIds: ['hero-nyra-mystic'],
    directions: {
      down: { key: 'hero-down-set4', imageUrl: 'assets/game/fantasy_bg/hero-down-set4c.png', atlasData: atlasFantasyBgHeroDownDataSet4c , scale: 0.34 },
      up: { key: 'hero-up-set4', imageUrl: 'assets/game/fantasy_bg/hero-up-set4c.png', atlasData: atlasFantasyBgHeroUpDataSet4c , scale: 0.34 },
      horiz: { key: 'hero-horiz-set4', imageUrl: 'assets/game/fantasy_bg/hero-horiz-set4c.png', atlasData: atlasFantasyBgHeroHorizDataSet4c , scale: 0.34 }
    }
  },
  {
    id: 'fantasy-bg-hero-set5',
    setId: 5,
    label: 'Fantasy BG - Hero Set 5',
    heroIds: ['hero-pip-halfling'],
    directions: {
      down: { key: 'hero-down-set5', imageUrl: 'assets/game/fantasy_bg/hero-down-set5c.png', atlasData: atlasFantasyBgHeroDownDataSet5c , scale: 0.38 },
      up: { key: 'hero-up-set5', imageUrl: 'assets/game/fantasy_bg/hero-up-set5c.png', atlasData: atlasFantasyBgHeroUpDataSet5c , scale: 0.38 },
      horiz: { key: 'hero-horiz-set5', imageUrl: 'assets/game/fantasy_bg/hero-horiz-set5c.png', atlasData: atlasFantasyBgHeroHorizDataSet5c , scale: 0.38 }
    }
  },
  {
    id: 'fantasy-bg-hero-set6',
    setId: 6,
    label: 'Fantasy BG - Hero Set 6',
    heroIds: ['hero-marta-baker'],
    directions: {
      down: { key: 'hero-down-set6', imageUrl: 'assets/game/fantasy_bg/hero-down-set6c.png', atlasData: atlasFantasyBgHeroDownDataSet6c , scale: 0.38 },
      up: { key: 'hero-up-set6', imageUrl: 'assets/game/fantasy_bg/hero-up-set6c.png', atlasData: atlasFantasyBgHeroUpDataSet6c , scale: 0.38 },
      horiz: { key: 'hero-horiz-set6', imageUrl: 'assets/game/fantasy_bg/hero-horiz-set6c.png', atlasData: atlasFantasyBgHeroHorizDataSet6c , scale: 0.38 }
    }
  },
  {
    id: 'fantasy-bg-hero-set7',
    setId: 7,
    label: 'Fantasy BG - Hero Set 7',
    heroIds: ['hero-samir-merchant'],
    directions: {
      down: { key: 'hero-down-set7', imageUrl: 'assets/game/fantasy_bg/hero-down-set7c.png', atlasData: atlasFantasyBgHeroDownDataSet7c , scale: 0.38 },
      up: { key: 'hero-up-set7', imageUrl: 'assets/game/fantasy_bg/hero-up-set7c.png', atlasData: atlasFantasyBgHeroUpDataSet7c , scale: 0.38 },
      horiz: { key: 'hero-horiz-set7', imageUrl: 'assets/game/fantasy_bg/hero-horiz-set7c.png', atlasData: atlasFantasyBgHeroHorizDataSet7c , scale: 0.38 }
    }
  },
  {
    id: 'fantasy-bg-hero-set8',
    setId: 8,
    label: 'Fantasy BG - Hero Set 8',
    heroIds: ['hero-elin-gatherer'],
    directions: {
      down: { key: 'hero-down-set8', imageUrl: 'assets/game/fantasy_bg/hero-down-set8c.png', atlasData: atlasFantasyBgHeroDownDataSet8c , scale: 0.38 },
      up: { key: 'hero-up-set8', imageUrl: 'assets/game/fantasy_bg/hero-up-set8c.png', atlasData: atlasFantasyBgHeroUpDataSet8c , scale: 0.38 },
      horiz: { key: 'hero-horiz-set8', imageUrl: 'assets/game/fantasy_bg/hero-horiz-set8c.png', atlasData: atlasFantasyBgHeroHorizDataSet8c , scale: 0.38 }
    }
  },
  {
    id: 'fantasy-bg-hero-set9',
    setId: 9,
    label: 'Fantasy BG - Hero Set 9',
    heroIds: ['hero-grom-porter'],
    directions: {
      down: { key: 'hero-down-set9', imageUrl: 'assets/game/fantasy_bg/hero-down-set9c.png', atlasData: atlasFantasyBgHeroDownDataSet9c , scale: 0.38 },
      up: { key: 'hero-up-set9', imageUrl: 'assets/game/fantasy_bg/hero-up-set9c.png', atlasData: atlasFantasyBgHeroUpDataSet9c , scale: 0.38 },
      horiz: { key: 'hero-horiz-set9', imageUrl: 'assets/game/fantasy_bg/hero-horiz-set9c.png', atlasData: atlasFantasyBgHeroHorizDataSet9c , scale: 0.38 }
    }
  },
  {
    id: 'fantasy-bg-hero-set10',
    setId: 10,
    label: 'Fantasy BG - Hero Set 10',
    heroIds: ['hero-eldrin-sage'],
    directions: {
      down: { key: 'hero-down-set10', imageUrl: 'assets/game/fantasy_bg/hero-down-set10c.png', atlasData: atlasFantasyBgHeroDownDataSet10c , scale: 0.38 },
      up: { key: 'hero-up-set10', imageUrl: 'assets/game/fantasy_bg/hero-up-set10c.png', atlasData: atlasFantasyBgHeroUpDataSet10c , scale: 0.38 },
      horiz: { key: 'hero-horiz-set10', imageUrl: 'assets/game/fantasy_bg/hero-horiz-set10c.png', atlasData: atlasFantasyBgHeroHorizDataSet10c , scale: 0.38 }
    }
  }
];

/** Set dell'eroe usato quando l'ID selezionato non ha ancora sprite dedicati. */
export const FALLBACK_HERO_SPRITE_ATLAS_SET = HERO_SPRITE_ATLAS_SETS[0];

export const HERO_GAME_ATLAS_OPTIONS: HeroGameAtlasOption[] = HERO_SPRITE_ATLAS_SETS.reduce<HeroGameAtlasOption[]>((options, set) => {
  (Object.entries(set.directions) as Array<[HeroSpriteDirection, HeroSpriteDirectionAtlas]>).forEach(([direction, atlas]) => {
    options.push({
      id: `${set.id}-${direction}`,
      label: `${set.label} - ${direction}`,
      setId: set.setId,
      direction,
      ...atlas
    });
  });

  return options;
}, []);

export function getHeroSpriteAtlasSet(hero?: Pick<HeroItem, 'id'> | null): HeroSpriteAtlasSet {
  const heroId = hero?.id ?? '';
  console.log(`Searching for sprite atlas set for hero ID: ${heroId}`);
  return HERO_SPRITE_ATLAS_SETS.find((set) => set.heroIds.some((baseId) => heroId === baseId || heroId.startsWith(`${baseId}-`)))
    ?? FALLBACK_HERO_SPRITE_ATLAS_SET;
}
