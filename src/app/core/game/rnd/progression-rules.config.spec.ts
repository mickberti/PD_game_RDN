import { RDN_EFFECT_SIMPLIFICATIONS, RDN_GEM_EFFECT_FALLBACK_PRESETS, rdnEffectRuleForLevel, rdnGemEffectCountForBoard, rdnLinkCountForBoard, rdnSpecialOperatorsForBoard } from './progression-rules.config';

describe('RDN progression rules', () => {
  it('introduces one special only from seven spheres and never more than two', () => {
    expect(rdnSpecialOperatorsForBoard(300, 6)).toEqual([]);
    expect(rdnSpecialOperatorsForBoard(301, 7)).toHaveSize(1);
    expect(rdnSpecialOperatorsForBoard(300, 7)).toHaveSize(2);
    expect(rdnSpecialOperatorsForBoard(300, 8)).toHaveSize(2);
  });

  it('configures fixed and optional links by sphere count', () => {
    expect(rdnLinkCountForBoard(301, 6)).toBe(1);
    expect(rdnLinkCountForBoard(300, 6)).toBe(2);
    expect(rdnLinkCountForBoard(301, 7)).toBe(2);
    expect(rdnLinkCountForBoard(300, 7)).toBe(3);
    expect(rdnLinkCountForBoard(300, 8)).toBe(3);
    expect(rdnLinkCountForBoard(301, 8)).toBe(3);
  });

  it('configures retries and only same-category effect scaling', () => {
    expect(rdnEffectRuleForLevel(40).solutionAttemptsBeforeScaling).toBe(500);
    expect(RDN_EFFECT_SIMPLIFICATIONS.CORRUPTION_2).toBe('CORRUPTION_1');
    expect(RDN_EFFECT_SIMPLIFICATIONS.TIMER_7).toBe('TIMER_10');
    expect(RDN_EFFECT_SIMPLIFICATIONS.INVERTER_1).toBeUndefined();
    expect(RDN_GEM_EFFECT_FALLBACK_PRESETS).toEqual(["SHIELD_1", "WALL_1", "AMPLIFIER_X2", "INVERTER_1", "ICE_1"]);
  });

  it('configures the GEM-effect interval by sphere count', () => {
    expect([2, 3]).toContain(rdnGemEffectCountForBoard(1, 6));
    expect([3, 4]).toContain(rdnGemEffectCountForBoard(2, 7));
    expect([4, 5]).toContain(rdnGemEffectCountForBoard(3, 8));
  });
});
