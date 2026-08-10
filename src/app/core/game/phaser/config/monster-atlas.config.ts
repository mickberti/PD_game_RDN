import { MonsterType, PhaserAtlasDataSet } from '../../../models/phaser-game-state.model';
import { atlasData as atlasFantasyBgGoblinDownDataSet2 } from 'src/assets/game/fantasy_bg/atlas/atlas-goblin-down-set2';
import { atlasData as atlasFantasyBgGoblinHorizDataSet2 } from 'src/assets/game/fantasy_bg/atlas/atlas-goblin-horiz-set2';
import { atlasData as atlasFantasyBgGoblinUpDataSet2 } from 'src/assets/game/fantasy_bg/atlas/atlas-goblin-up-set2';
import { atlasData as atlasFantasyBgBatDownDataSet1 } from 'src/assets/game/fantasy_bg/atlas/atlas-bat-down-set1';
import { atlasData as atlasFantasyBgBatHorizDataSet1 } from 'src/assets/game/fantasy_bg/atlas/atlas-bat-horiz-set1';
import { atlasData as atlasFantasyBgBatUpDataSet1 } from 'src/assets/game/fantasy_bg/atlas/atlas-bat-up-set1';
import { atlasData as atlasFantasyBgSkelDownDataSet1 } from 'src/assets/game/fantasy_bg/atlas/atlas-skel-down-set1';
import { atlasData as atlasFantasyBgSkelHorizDataSet1 } from 'src/assets/game/fantasy_bg/atlas/atlas-skel-horiz-set1';
import { atlasData as atlasFantasyBgSkelUpDataSet1 } from 'src/assets/game/fantasy_bg/atlas/atlas-skel-up-set1';
import { atlasData as atlasFantasyBgSlimeDownDataSet1 } from 'src/assets/game/fantasy_bg/atlas/atlas-slime-down-set1';
import { atlasData as atlasFantasyBgSlimeHorizDataSet1 } from 'src/assets/game/fantasy_bg/atlas/atlas-slime-horiz-set1';
import { atlasData as atlasFantasyBgSlimeUpDataSet1 } from 'src/assets/game/fantasy_bg/atlas/atlas-slime-up-set1';

export type MonsterSpriteDirection = 'down' | 'up' | 'horiz';

export interface MonsterSpriteDirectionAtlas {
  key: string;
  imageUrl: string;
  atlasData: PhaserAtlasDataSet;
  /** Scala puramente visuale di questa direzione. */
  scale: number;
}

export interface MonsterSpriteAtlasSet {
  id: string;
  setId: number;
  label: string;
  monsterTypes: MonsterType[];
  directions: Record<MonsterSpriteDirection, MonsterSpriteDirectionAtlas>;
}

export interface MonsterGameAtlasOption {
  id: string;
  label: string;
  setId: number;
  direction: MonsterSpriteDirection;
  key: string;
  imageUrl: string;
  atlasData: PhaserAtlasDataSet;
  scale: number;
}

export const MONSTER_SPRITE_ATLAS_SETS: MonsterSpriteAtlasSet[] = [
  {
    id: 'fantasy-bg-goblin-set2',
    setId: 2,
    label: 'Fantasy BG - Goblin Set 2',
    monsterTypes: ['goblin'],
    directions: {
      down: { key: 'monster-goblin-down-set2', imageUrl: 'assets/game/fantasy_bg/goblin-down-set2.png', atlasData: atlasFantasyBgGoblinDownDataSet2 , scale: 0.35 },
      up: { key: 'monster-goblin-up-set2', imageUrl: 'assets/game/fantasy_bg/goblin-up-set2.png', atlasData: atlasFantasyBgGoblinUpDataSet2 , scale: 0.35 },
      horiz: { key: 'monster-goblin-horiz-set2', imageUrl: 'assets/game/fantasy_bg/goblin-horiz-set2.png', atlasData: atlasFantasyBgGoblinHorizDataSet2 , scale: 0.35 }
    }
  },
  {
    id: 'fantasy-bg-bat-set1',
    setId: 3,
    label: 'Fantasy BG - BAt Set 1',
    monsterTypes: ['bat'],
    directions: {
      down: { key: 'monster-bat-down-set1', imageUrl: 'assets/game/fantasy_bg/bat-down-set1.png', atlasData: atlasFantasyBgBatDownDataSet1 , scale: 0.28 },
      up: { key: 'monster-bat-up-set1', imageUrl: 'assets/game/fantasy_bg/bat-up-set1.png', atlasData: atlasFantasyBgBatUpDataSet1 , scale: 0.28 },
      horiz: { key: 'monster-bat-horiz-set1', imageUrl: 'assets/game/fantasy_bg/bat-horiz-set1.png', atlasData: atlasFantasyBgBatHorizDataSet1 , scale: 0.28 }
    }
  },
  {
    id: 'fantasy-bg-skeletor-set1',
    setId: 4,
    label: 'Fantasy BG - Skeletor Set 1',
    monsterTypes: ['skeletor'],
    directions: {
      down: { key: 'monster-skeletor-down-set1', imageUrl: 'assets/game/fantasy_bg/skel-down-set1.png', atlasData: atlasFantasyBgSkelDownDataSet1 , scale: 0.42 },
      up: { key: 'monster-skeletor-up-set1', imageUrl: 'assets/game/fantasy_bg/skel-up-set1.png', atlasData: atlasFantasyBgSkelUpDataSet1 , scale: 0.42 },
      horiz: { key: 'monster-skeletor-horiz-set1', imageUrl: 'assets/game/fantasy_bg/skel-horiz-set1.png', atlasData: atlasFantasyBgSkelHorizDataSet1 , scale: 0.42 }
    }
  },
  {
    id: 'fantasy-bg-slime-set1',
    setId: 5,
    label: 'Fantasy BG - slime Set 1',
    monsterTypes: ['slime'],
    directions: {
      down: { key: 'monster-slime-down-set1', imageUrl: 'assets/game/fantasy_bg/slime-down-set1.png', atlasData: atlasFantasyBgSlimeDownDataSet1 , scale: 0.28 },
      up: { key: 'monster-slime-up-set1', imageUrl: 'assets/game/fantasy_bg/slime-up-set1.png', atlasData: atlasFantasyBgSlimeUpDataSet1 , scale: 0.28 },
      horiz: { key: 'monster-slime-horiz-set1', imageUrl: 'assets/game/fantasy_bg/slime-horiz-set1.png', atlasData: atlasFantasyBgSlimeHorizDataSet1 , scale: 0.28 }
    }
  }
];

export const MONSTER_GAME_ATLAS_OPTIONS: MonsterGameAtlasOption[] = MONSTER_SPRITE_ATLAS_SETS.reduce<MonsterGameAtlasOption[]>((options, set) => {
  (Object.entries(set.directions) as Array<[MonsterSpriteDirection, MonsterSpriteDirectionAtlas]>).forEach(([direction, atlas]) => {
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

export function getMonsterSpriteAtlasSet(monsterType?: MonsterType | null): MonsterSpriteAtlasSet {
  return MONSTER_SPRITE_ATLAS_SETS.find((set) => monsterType && set.monsterTypes.includes(monsterType)) ?? MONSTER_SPRITE_ATLAS_SETS[0];
}
