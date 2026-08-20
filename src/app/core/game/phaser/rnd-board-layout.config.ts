/**
 * Single source of truth for the board geometry. Values expressed as ratios are
 * relative to `boardRadius`, the radius used for the outer value orbit.
 */
export interface RdnBoardLayout {
  positions: 4 | 5 | 6 | 7 | 8;
  ring: { diameter: number; offsetX: number; offsetY: number; angle: number; };
  gear: { diameter: number; offsetX: number; offsetY: number; angle: number; };
  outerSlots: { radius: number; angleOffset: number; sphereRadius: number; badgeOffsetX: number; badgeOffsetY: number; };
  innerSlots: { radius: number; angleOffset: number; sphereRadius: number; };
  impulse: { radius: number; iconSize: number; };
  trail: { startRadius: number; controlRadius: number; bend: number; sphereRadius: number; glowWidth: number; middleWidth: number; coreWidth: number; };
}

export const RDN_BOARD_LAYOUTS: Record<RdnBoardLayout["positions"], RdnBoardLayout> = {
  4: { positions: 4, ring: { diameter: 2.18, offsetX: 0, offsetY: 0, angle: 0 }, gear: { diameter: 1.47, offsetX: 0, offsetY: 0, angle: 0 }, outerSlots: { radius: .91, angleOffset: 0, sphereRadius: .125, badgeOffsetX: -.11, badgeOffsetY: .13 }, innerSlots: { radius: .65, angleOffset: 0, sphereRadius: .115 }, impulse: { radius: .29, iconSize: .60 }, trail: { startRadius: .22, controlRadius: .60, bend: .10, sphereRadius: .19, glowWidth: .11, middleWidth: .07, coreWidth: .023 } },
  5: { positions: 5, ring: { diameter: 2.20, offsetX: 0, offsetY: 0, angle: 0 }, gear: { diameter: 1.44, offsetX: 0, offsetY: 0, angle: 0 }, outerSlots: { radius: .91, angleOffset: 0, sphereRadius: .12, badgeOffsetX: -.105, badgeOffsetY: .125 }, innerSlots: { radius: .64, angleOffset: 0, sphereRadius: .11 }, impulse: { radius: .28, iconSize: .42 }, trail: { startRadius: .22, controlRadius: .60, bend: .10, sphereRadius: .18, glowWidth: .105, middleWidth: .065, coreWidth: .02 } },
  6: { positions: 6, ring: { diameter: 2.18, offsetX: 0, offsetY: 0, angle: 0 }, gear: { diameter: 1.44, offsetX: 0, offsetY: 0, angle: 0 }, outerSlots: { radius: .91, angleOffset: 0, sphereRadius: .115, badgeOffsetX: -.10, badgeOffsetY: .12 }, innerSlots: { radius: .64, angleOffset: 0, sphereRadius: .105 }, impulse: { radius: .28, iconSize: .41 }, trail: { startRadius: .22, controlRadius: .60, bend: .09, sphereRadius: .17, glowWidth: .10, middleWidth: .06, coreWidth: .019 } },
  7: { positions: 7, ring: { diameter: 2.18, offsetX: 0, offsetY: 0, angle: 0 }, gear: { diameter: 1.45, offsetX: 0, offsetY: 0, angle: 0 }, outerSlots: { radius: .91, angleOffset: 0, sphereRadius: .10, badgeOffsetX: -.095, badgeOffsetY: .11 }, innerSlots: { radius: .64, angleOffset: 0, sphereRadius: .10 }, impulse: { radius: .275, iconSize: .40 }, trail: { startRadius: .22, controlRadius: .60, bend: .085, sphereRadius: .16, glowWidth: .092, middleWidth: .055, coreWidth: .018 } },
  8: { positions: 8, ring: { diameter: 2.18, offsetX: 0, offsetY: 0, angle: 0 }, gear: { diameter: 1.46, offsetX: 0, offsetY: 0, angle: 0 }, outerSlots: { radius: .91, angleOffset: 0, sphereRadius: .105, badgeOffsetX: -.09, badgeOffsetY: .105 }, innerSlots: { radius: .64, angleOffset: 0, sphereRadius: .095 }, impulse: { radius: .27, iconSize: .39 }, trail: { startRadius: .22, controlRadius: .60, bend: .08, sphereRadius: .15, glowWidth: .085, middleWidth: .05, coreWidth: .016 } },
};

/**
 * Number typography is defined per ring size, separately for outer and inner
 * gems. Both reserve the width of a signed two-digit value (for example -99),
 * keeping +1, -1 and +/-99 visually homogeneous instead of scaling per text.
 */
export const RDN_GEM_NUMERAL_CONFIG: Record<RdnBoardLayout["positions"], { outerFontSizeRatio: number; innerFontSizeRatio: number; reservedWidthRatio: number }> = {
  4: { outerFontSizeRatio: .23, innerFontSizeRatio: .22, reservedWidthRatio: .90 },
  5: { outerFontSizeRatio: .22, innerFontSizeRatio: .21, reservedWidthRatio: .90 },
  6: { outerFontSizeRatio: .21, innerFontSizeRatio: .20, reservedWidthRatio: .89 },
  7: { outerFontSizeRatio: .20, innerFontSizeRatio: .20, reservedWidthRatio: .88 },
  8: { outerFontSizeRatio: .20, innerFontSizeRatio: .19, reservedWidthRatio: .87 },
};

/** Global presentation tuning, intentionally kept outside the scene for fast visual iteration. */
export const RDN_PHASER_VISUAL_CONFIG = {
  /** Percentage applied independently to width and height of the stretched background. */
  backgroundScalePercent: 100,
  /** Distance from the bottom edge for the three action buttons. */
  actionButtonsBottomOffset: 85,
  /** Board radius caps preserve a 1:1 board on narrow, wide and tall screens. */
  boardWidthRadiusRatio: .46,
  boardHeightRadiusRatio: .31,
} as const;

/** Shared canvas motion tokens; gameplay rules never depend on these timings. */
export const RDN_MOTION = {
  dragSnapMs: 260,
  impulseChargeMs: 90,
  impulseDispatchDelayMs: 160,
  zeroImpactMs: 520,
  operationFloatMs: 2060,
  maxZeroParticles: 28,
  blockedAlpha: .76,
} as const;

export const getRdnBoardLayout = (positions: number): RdnBoardLayout => RDN_BOARD_LAYOUTS[positions as RdnBoardLayout["positions"]] ?? RDN_BOARD_LAYOUTS[6];
export const rdnRingTextureKey = (layout: RdnBoardLayout, set: number): string => `rdn-ring-${layout.positions}-set${set}`;
export const rdnGearTextureKey = (layout: RdnBoardLayout, set: number): string => `rdn-gear-${layout.positions}-set${set}`;
