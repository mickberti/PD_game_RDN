import { GameUtilsService } from './game-utils.service';
import { RDN_LEVELS_PER_SPHERE_INCREMENT } from '../../../game/phaser/config/levels.config';

describe('GameUtilsService', () => {
  const service = new GameUtilsService();

  it('updates game-mode stars when the board gains a gem', () => {
    expect(service.calculateModeDifficultyStars(1)).toEqual(['rank-green-4-star']);
    expect(service.calculateModeDifficultyStars(RDN_LEVELS_PER_SPHERE_INCREMENT)).toEqual(['rank-green-4-star']);
    expect(service.calculateModeDifficultyStars(RDN_LEVELS_PER_SPHERE_INCREMENT + 1)).toEqual(['rank-laurel-green-star']);
  });
});
