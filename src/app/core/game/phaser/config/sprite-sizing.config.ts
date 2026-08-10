import { PhaserSceneSpriteSizingParams } from "../../../models/phaser-game-state.model";

/** Dimensioni visuali e body Arcade degli sprite della scena Phaser. */
export const PHASER_SPRITE_SIZING_CONFIG: PhaserSceneSpriteSizingParams = {
  floor: { width: 48, height: 48 },
  wallTop: { width: 48, height: 48 },
  wallBot: { width: 48, height: 48 },
  wallSide: {
    width: 48,
    height: 48,
    originX: 0.5,
    originY: 0.5,
    mirrorOnRightHalf: true,
  },
  prop: { scale: 0.8, originX: 0.5, originY: 0.5 },
  staticTrap: { width: 48, height: 48 },
  dynamicTrap: { width: 48, height: 48 },
  heroFallback: { width: 32, height: 32 },
  heroAtlasCollisionBody: { width: 30.4, height: 66.88, offsetX: 7.6, offsetY: 0 },
  heroAtlasCollisionBodyByHeroId: {
    "hero-milo-traveler": { width: 30.4, height: 34, offsetX: 7.6, offsetY: 20 },
    "hero-liora-herbalist": { width: 30.4, height: 34, offsetX: 7.6, offsetY: 23 },
    "hero-brokk-artisan": { width: 30.4, height: 34, offsetX: 10, offsetY: 18 },
    "hero-nyra-mystic": { width: 30.4, height: 34, offsetX: 3, offsetY: 20 },
    "hero-pip-halfling": { width: 30.4, height: 34, offsetX: 7.6, offsetY: 20 },
    "hero-marta-baker": { width: 30.4, height: 34, offsetX: 7.6, offsetY: 20 },
    "hero-samir-merchant": { width: 30.4, height: 34, offsetX: 7.6, offsetY: 30 },
    "hero-elin-gatherer": { width: 30.4, height: 34, offsetX: 7.6, offsetY: 30 },
    "hero-grom-porter": { width: 30.4, height: 34, offsetX: 7.6, offsetY: 30 },
    "hero-eldrin-sage": { width: 30.4, height: 34, offsetX: 7.6, offsetY: 30 },
  },
  heroFallbackCollisionBody: {
    width: 30.4,
    height: 66.88,
    offsetX: 7.6,
    offsetY: 0,
  },
  monsterAtlasCollisionBody: {
    goblin: { width: 28, height: 57.4, offsetX: 10.5, offsetY: 0 },
    slime: { width: 28, height: 22.4, offsetX: 8.4, offsetY: 5.6 },
    bat: { width: 22.4, height: 22.4, offsetX: 11.2, offsetY: 5.6 },
    skeletor: { width: 33.6, height: 68.88, offsetX: 8.4, offsetY: 0 },
  },
};
