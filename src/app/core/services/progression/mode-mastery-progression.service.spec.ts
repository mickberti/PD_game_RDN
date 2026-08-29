import { calculateModeMasteryProgression } from './mode-mastery-progression.service';
import { RDN_LEVELS_PER_SPHERE_INCREMENT } from '../../game/rnd/levels.config';

describe('mode mastery progression', () => {
  it('changes difficulty exactly when a new board gem is introduced', () => {
    expect(calculateModeMasteryProgression(0).progress).toEqual(jasmine.objectContaining({ descr: 'Difficoltà: 4 gemme', current: 0, total: RDN_LEVELS_PER_SPHERE_INCREMENT }));
    expect(calculateModeMasteryProgression(RDN_LEVELS_PER_SPHERE_INCREMENT - 1).progress).toEqual(jasmine.objectContaining({ descr: 'Difficoltà: 4 gemme', current: RDN_LEVELS_PER_SPHERE_INCREMENT - 1, total: RDN_LEVELS_PER_SPHERE_INCREMENT }));
    expect(calculateModeMasteryProgression(RDN_LEVELS_PER_SPHERE_INCREMENT).progress).toEqual(jasmine.objectContaining({ descr: 'Difficoltà: 5 gemme', current: 0, total: RDN_LEVELS_PER_SPHERE_INCREMENT }));
  });
});
