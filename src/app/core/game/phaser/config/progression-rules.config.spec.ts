import {
  RDN_EFFECT_SIMPLIFICATIONS,
  RDN_GEM_EFFECT_FALLBACK_PRESETS,
  RDN_MODE_BOARD_PROGRESSION_RULES,
  rdnEffectRuleForLevel,
  rdnGemEffectCountForBoard,
  rdnLinkCountForBoard,
  rdnSpecialOperatorsForBoard,
} from '../catalogues/v011/progression-rules.config';

describe('RDN v011 progression rules', () => {
  for (const mode of ['adventure', 'time-attack'] as const) {
    it(`keeps special operators within the configured board budget in ${mode}`, () => {
      for (const spheres of [4, 6, 7, 8, 9]) {
        const rule = [...RDN_MODE_BOARD_PROGRESSION_RULES].reverse().find((row) => spheres >= row.minSpheres)!;
        const budget = mode === 'adventure' ? rule.adventure : rule.timeattack;
        for (const level of [1, 300, 301]) {
          const operators = rdnSpecialOperatorsForBoard(level, spheres, mode);
          expect(operators.length).toBeGreaterThanOrEqual(budget.specials);
          expect(operators.length).toBeLessThanOrEqual(Math.min(spheres, 2, budget.specials + budget.optionalSpecials));
          expect(new Set(operators).size).toBe(operators.length);
        }
      }
    });

    it(`keeps link and GEM-effect counts within the configured board budget in ${mode}`, () => {
      for (const spheres of [4, 6, 7, 8, 9]) {
        const rule = [...RDN_MODE_BOARD_PROGRESSION_RULES].reverse().find((row) => spheres >= row.minSpheres)!;
        const budget = mode === 'adventure' ? rule.adventure : rule.timeattack;
        for (const level of [1, 300, 301]) {
          expect(rdnLinkCountForBoard(level, spheres, mode)).toBeGreaterThanOrEqual(budget.links);
          expect(rdnLinkCountForBoard(level, spheres, mode)).toBeLessThanOrEqual(Math.min(spheres - 1, budget.links + budget.optionalLinks));
          expect(rdnGemEffectCountForBoard(level, mode, spheres)).toBeGreaterThanOrEqual(budget.effects);
          expect(rdnGemEffectCountForBoard(level, mode, spheres)).toBeLessThanOrEqual(budget.effects + budget.optionalEffects);
        }
      }
    });
  }

  it('keeps retries and same-category effect scaling configured', () => {
    expect(rdnEffectRuleForLevel(40).solutionAttemptsBeforeScaling).toBe(500);
    expect(RDN_EFFECT_SIMPLIFICATIONS.CORRUPTION_2).toBe('CORRUPTION_1');
    expect(RDN_EFFECT_SIMPLIFICATIONS.TIMER_7).toBe('TIMER_5');
    expect(RDN_EFFECT_SIMPLIFICATIONS.INVERTER_1).toBe('AMPLIFIER_X3');
    expect(RDN_GEM_EFFECT_FALLBACK_PRESETS).toEqual(['SHIELD_1', 'WALL_1', 'AMPLIFIER_X2', 'INVERTER_1', 'ICE_1', 'FIRE_1']);
  });
});
