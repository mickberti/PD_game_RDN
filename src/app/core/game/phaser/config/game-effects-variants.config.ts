/**
 * Varianti puramente visive degli effetti di combattimento.
 * Le dimensioni dell'effetto sono calcolate dall'area di combattimento reale.
 */
export const COMBAT_EFFECT_VARIANTS_CONFIG = {
  heroAttack: { 1: {}, 2: { colorPrimary: 0x38bdf8, colorSecondary: 0xe0f2fe, arcCount: 3 }, 3: { colorPrimary: 0x84cc16, colorSecondary: 0xfef08a, trailCount: 4 }, 4: { colorPrimary: 0xf97316, colorSecondary: 0xffedd5, sparkCount: 12 } },
  heroSpecial: { 1: {}, 2: { colorPrimary: 0x22d3ee, colorSecondary: 0x818cf8, ringCount: 4 }, 3: { colorPrimary: 0xf97316, colorSecondary: 0xfef3c7, slashCount: 5 }, 4: { colorPrimary: 0xd946ef, colorSecondary: 0xfde047, radialBurstCount: 18 } },
  heroDefense: { 1: {}, 2: { colorPrimary: 0x34d399, colorSecondary: 0xecfdf5, pulseCount: 3 } },
  monsterAttack: { 1: {}, 2: { colorPrimary: 0x7c3aed, colorSecondary: 0xf0abfc, arcCount: 2 }, 3: { colorPrimary: 0x65a30d, colorSecondary: 0xfde047, trailCount: 3 }, 4: { colorPrimary: 0xea580c, colorSecondary: 0xfef3c7, sparkCount: 10 } },
  monsterSpecial: { 1: {}, 2: { colorPrimary: 0x0ea5e9, colorSecondary: 0xe0f2fe, ringCount: 4 }, 3: { colorPrimary: 0xef4444, colorSecondary: 0xfde68a, slashCount: 5 }, 4: { colorPrimary: 0xa855f7, colorSecondary: 0xf9a8d4, radialBurstCount: 16 } },
  monsterDefense: { 1: {}, 2: { colorPrimary: 0x22c55e, colorSecondary: 0xdcfce7, pulseCount: 3 } },
};
