/**
 * Single source of truth for the board geometry. Values expressed as ratios are
 * relative to `boardRadius`, the radius used for the outer value orbit.
 */
export interface RdnBoardLayout {
  positions: 4 | 5 | 6 | 7 | 8;
  ring: {
    diameter: number;
    /** Independent texture scaling: tune these when a ring asset appears oval. */
    widthScale: number;
    heightScale: number;
    offsetX: number;
    offsetY: number;
    angle: number;
  };
  gear: { diameter: number; offsetX: number; offsetY: number; angle: number };
  outerSlots: {
    radius: number;
    angleOffset: number;
    sphereRadius: number;
    badgeOffsetX: number;
    badgeOffsetY: number;
  };
  innerSlots: { radius: number; angleOffset: number; sphereRadius: number };
  impulse: { radius: number; iconSize: number };
  trail: {
    startRadius: number;
    controlRadius: number;
    bend: number;
    sphereRadius: number;
    glowWidth: number;
    middleWidth: number;
    coreWidth: number;
  };
}

export type RdnVisualSet = 1 | 2 | 3;
export type RdnGemSlotGroup = "outerSlots" | "innerSlots";

/** Per-gem correction applied on top of the unchanged base layout. Angles are degrees; radius is a parent-radius ratio. */
export interface RdnGemSlotOffset {
  angularOffset: number;
  radialOffset: number;
}

export interface RdnGemPlacementCalibration {
  outerSlots: RdnGemSlotOffset[];
  innerSlots: RdnGemSlotOffset[];
}

export interface RdnRingThemeOffset {
  diameterOffset: number;
  widthScaleMultiplier: number;
  heightScaleMultiplier: number;
  offsetX: number;
  offsetY: number;
  angleOffset: number;
}

export interface RdnGearThemeOffset {
  diameterOffset: number;
  offsetX: number;
  offsetY: number;
  angleOffset: number;
}

export interface RdnThemeDecorationCalibration {
  ring: RdnRingThemeOffset;
  gear: RdnGearThemeOffset;
}

/**
 * Theme-specific fine tuning for imperfect ring and gear artwork.
 * Every slot is explicit: angularOffset is in degrees, radialOffset is a parent-radius ratio.
 * Zero preserves the base geometry exactly.
 */
export const RDN_GEM_PLACEMENT_CALIBRATIONS: Record<RdnBoardLayout["positions"], Record<RdnVisualSet, RdnGemPlacementCalibration>> = {
  4: {
    1: {
      outerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: -0.8, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0.8, radialOffset: 0 }, // Gemma 4
      ],
      innerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
      ],
    },
    2: {
      outerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: -0.8, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0.8, radialOffset: 0 }, // Gemma 4
      ],
      innerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
      ],
    },
    3: {
      outerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: -0.8, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0.8, radialOffset: 0 }, // Gemma 4
      ],
      innerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
      ],
    }
  },
  5: {
    1: {
      outerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 2.8, radialOffset: 0.01 }, // Gemma 2
        { angularOffset: -2, radialOffset: 0.03 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0.03 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0.03 }, // Gemma 5
      ],
      innerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0 }, // Gemma 5
      ],
    },
    2: {
      outerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 3, radialOffset: 0.03 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0.03 }, // Gemma 3
        { angularOffset: 2, radialOffset: 0.03 }, // Gemma 4
        { angularOffset: -1, radialOffset: 0.03 }, // Gemma 5
      ],
      innerSlots: [
        { angularOffset: 0, radialOffset: -0.03 }, // Gemma 1
        { angularOffset: 0, radialOffset: -0.03 }, // Gemma 2
        { angularOffset: 0, radialOffset: -0.03 }, // Gemma 3
        { angularOffset: 0, radialOffset: -0.03 }, // Gemma 4
        { angularOffset: 0, radialOffset: -0.03 }, // Gemma 5
      ],
    },
    3: {
      outerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0.03 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0.03 }, // Gemma 3
        { angularOffset: 4, radialOffset: 0.03 }, // Gemma 4
        { angularOffset: -1, radialOffset: 0.03 }, // Gemma 5
      ],
      innerSlots: [
        { angularOffset: 0, radialOffset: 0.03 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0.01 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0.03 }, // Gemma 3
        { angularOffset: 2, radialOffset: 0.03 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0.03 }, // Gemma 5
      ],
    }
  },
  6: {
    1: {
      outerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0 }, // Gemma 5
        { angularOffset: 0, radialOffset: 0 }, // Gemma 6
      ],
      innerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0 }, // Gemma 5
        { angularOffset: 0, radialOffset: 0 }, // Gemma 6
      ],
    },
    2: {
      outerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0 }, // Gemma 5
        { angularOffset: 0, radialOffset: 0 }, // Gemma 6
      ],
      innerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0 }, // Gemma 5
        { angularOffset: 0, radialOffset: 0 }, // Gemma 6
      ],
    },
    3: {
      outerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0 }, // Gemma 5
        { angularOffset: 0, radialOffset: 0 }, // Gemma 6
      ],
      innerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0 }, // Gemma 5
        { angularOffset: 0, radialOffset: 0 }, // Gemma 6
      ],
    }
  },
  7: {
    1: {
      outerSlots: [
        { angularOffset: 0, radialOffset: -0.05 }, // Gemma 1
        { angularOffset: 6, radialOffset: -0.02 }, // Gemma 2
        { angularOffset: 9, radialOffset: -0.05 }, // Gemma 3
        { angularOffset: 4, radialOffset: -0.02 }, // Gemma 4
        { angularOffset: -2, radialOffset: -0.01 }, // Gemma 5
        { angularOffset: -7, radialOffset: -0.02 }, // Gemma 6
        { angularOffset: -5, radialOffset: -0.01 }, // Gemma 7
      ],
      innerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 3, radialOffset: 0 }, // Gemma 2
        { angularOffset: 8, radialOffset: 0 }, // Gemma 3
        { angularOffset: 4, radialOffset: 0 }, // Gemma 4
        { angularOffset: -2, radialOffset: 0 }, // Gemma 5
        { angularOffset: -4, radialOffset: 0 }, // Gemma 6
        { angularOffset: -3, radialOffset: 0 }, // Gemma 7
      ],
    },
    2: {
      outerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0 }, // Gemma 5
        { angularOffset: 0, radialOffset: 0 }, // Gemma 6
        { angularOffset: 0, radialOffset: 0 }, // Gemma 7
      ],
      innerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0 }, // Gemma 5
        { angularOffset: 0, radialOffset: 0 }, // Gemma 6
        { angularOffset: 0, radialOffset: 0 }, // Gemma 7
      ],
    },
    3: {
      outerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0 }, // Gemma 5
        { angularOffset: 0, radialOffset: 0 }, // Gemma 6
        { angularOffset: 0, radialOffset: 0 }, // Gemma 7
      ],
      innerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0 }, // Gemma 5
        { angularOffset: 0, radialOffset: 0 }, // Gemma 6
        { angularOffset: 0, radialOffset: 0 }, // Gemma 7
      ],
    }
  },
  8: {
    1: {
      outerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0 }, // Gemma 5
        { angularOffset: 0, radialOffset: 0 }, // Gemma 6
        { angularOffset: 0, radialOffset: 0 }, // Gemma 7
        { angularOffset: 0, radialOffset: 0 }, // Gemma 8
      ],
      innerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0 }, // Gemma 5
        { angularOffset: 0, radialOffset: 0 }, // Gemma 6
        { angularOffset: 0, radialOffset: 0 }, // Gemma 7
        { angularOffset: 0, radialOffset: 0 }, // Gemma 8
      ],
    },
    2: {
      outerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0 }, // Gemma 5
        { angularOffset: 0, radialOffset: 0 }, // Gemma 6
        { angularOffset: 0, radialOffset: 0 }, // Gemma 7
        { angularOffset: 0, radialOffset: 0 }, // Gemma 8
      ],
      innerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0 }, // Gemma 5
        { angularOffset: 0, radialOffset: 0 }, // Gemma 6
        { angularOffset: 0, radialOffset: 0 }, // Gemma 7
        { angularOffset: 0, radialOffset: 0 }, // Gemma 8
      ],
    },
    3: {
      outerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0 }, // Gemma 5
        { angularOffset: 0, radialOffset: 0 }, // Gemma 6
        { angularOffset: 0, radialOffset: 0 }, // Gemma 7
        { angularOffset: 0, radialOffset: 0 }, // Gemma 8
      ],
      innerSlots: [
        { angularOffset: 0, radialOffset: 0 }, // Gemma 1
        { angularOffset: 0, radialOffset: 0 }, // Gemma 2
        { angularOffset: 0, radialOffset: 0 }, // Gemma 3
        { angularOffset: 0, radialOffset: 0 }, // Gemma 4
        { angularOffset: 0, radialOffset: 0 }, // Gemma 5
        { angularOffset: 0, radialOffset: 0 }, // Gemma 6
        { angularOffset: 0, radialOffset: 0 }, // Gemma 7
        { angularOffset: 0, radialOffset: 0 }, // Gemma 8
      ],
    }
  }
};

/**
 * Theme-specific texture calibration for ring and gear. Values are applied on top
 * of RDN_BOARD_LAYOUTS, so zero/one preserves its base geometry exactly.
 */
export const RDN_THEME_DECORATION_CALIBRATIONS: Record<RdnBoardLayout["positions"], Record<RdnVisualSet, RdnThemeDecorationCalibration>> = {
  4: {
    1: { ring: { diameterOffset: 0, widthScaleMultiplier: 1, heightScaleMultiplier: 1, offsetX: 0, offsetY: 0, angleOffset: 0 }, gear: { diameterOffset: 0, offsetX: 0, offsetY: 0, angleOffset: 0 } },
    2: { ring: { diameterOffset: 0, widthScaleMultiplier: 1, heightScaleMultiplier: 1, offsetX: 0, offsetY: 0, angleOffset: 0 }, gear: { diameterOffset: 0, offsetX: 0, offsetY: 0, angleOffset: 0 } },
    3: { ring: { diameterOffset: 0, widthScaleMultiplier: 1, heightScaleMultiplier: 1, offsetX: 0, offsetY: 0, angleOffset: 0 }, gear: { diameterOffset: 0, offsetX: 0, offsetY: 0, angleOffset: 0 } }
  },
  5: {
    1: { ring: { diameterOffset: 0, widthScaleMultiplier: 1, heightScaleMultiplier: 1, offsetX: 0, offsetY: 0, angleOffset: 0 }, gear: { diameterOffset: 0, offsetX: 0, offsetY: 0, angleOffset: 0 } },
    2: { ring: { diameterOffset: 0, widthScaleMultiplier: 1, heightScaleMultiplier: 1, offsetX: 0, offsetY: 0, angleOffset: 0 }, gear: { diameterOffset: 0, offsetX: 0, offsetY: 0, angleOffset: 0 } },
    3: { ring: { diameterOffset: 0, widthScaleMultiplier: 1, heightScaleMultiplier: 1, offsetX: 0, offsetY: 0, angleOffset: 0 }, gear: { diameterOffset: 0, offsetX: 0, offsetY: 0, angleOffset: 0 } }
  },
  6: {
    1: { ring: { diameterOffset: 0, widthScaleMultiplier: 1, heightScaleMultiplier: 1, offsetX: 0, offsetY: 0, angleOffset: 0 }, gear: { diameterOffset: 0, offsetX: 0, offsetY: 0, angleOffset: 0 } },
    2: { ring: { diameterOffset: 0, widthScaleMultiplier: 1, heightScaleMultiplier: 1, offsetX: 0, offsetY: 0, angleOffset: 0 }, gear: { diameterOffset: 0, offsetX: 0, offsetY: 0, angleOffset: 0 } },
    3: { ring: { diameterOffset: 0, widthScaleMultiplier: 1, heightScaleMultiplier: 1, offsetX: 0, offsetY: 0, angleOffset: 0 }, gear: { diameterOffset: 0, offsetX: 0, offsetY: 0, angleOffset: 0 } }
  },
  7: {
    1: { ring: { diameterOffset: 0, widthScaleMultiplier: 1, heightScaleMultiplier: 1, offsetX: 0, offsetY: 0, angleOffset: 0 }, gear: { diameterOffset: 0, offsetX: 0, offsetY: 0, angleOffset: 0 } },
    2: { ring: { diameterOffset: 0, widthScaleMultiplier: 1, heightScaleMultiplier: 1, offsetX: 0, offsetY: 0, angleOffset: 0 }, gear: { diameterOffset: 0, offsetX: 0, offsetY: 0, angleOffset: 0 } },
    3: { ring: { diameterOffset: 0, widthScaleMultiplier: 1, heightScaleMultiplier: 1, offsetX: 0, offsetY: 0, angleOffset: 0 }, gear: { diameterOffset: 0, offsetX: 0, offsetY: 0, angleOffset: 0 } }
  },
  8: {
    1: { ring: { diameterOffset: 0, widthScaleMultiplier: 1, heightScaleMultiplier: 1, offsetX: 0, offsetY: 0, angleOffset: 0 }, gear: { diameterOffset: 0, offsetX: 0, offsetY: 0, angleOffset: 0 } },
    2: { ring: { diameterOffset: 0, widthScaleMultiplier: 1, heightScaleMultiplier: 1, offsetX: 0, offsetY: 0, angleOffset: 0 }, gear: { diameterOffset: 0, offsetX: 0, offsetY: 0, angleOffset: 0 } },
    3: { ring: { diameterOffset: 0, widthScaleMultiplier: 1, heightScaleMultiplier: 1, offsetX: 0, offsetY: 0, angleOffset: 0 }, gear: { diameterOffset: 0, offsetX: 0, offsetY: 0, angleOffset: 0 } }
  }
};

export const getRdnThemeDecorationCalibration = (positions: number, visualSet: number): RdnThemeDecorationCalibration =>
  RDN_THEME_DECORATION_CALIBRATIONS[positions as RdnBoardLayout["positions"]]?.[visualSet as RdnVisualSet] ??
  RDN_THEME_DECORATION_CALIBRATIONS[6][1];

export const getRdnGemSlotOffset = (positions: number, visualSet: number, group: RdnGemSlotGroup, index: number): RdnGemSlotOffset =>
  RDN_GEM_PLACEMENT_CALIBRATIONS[positions as RdnBoardLayout["positions"]]?.[visualSet as RdnVisualSet]?.[group]?.[index] ?? { angularOffset: 0, radialOffset: 0 };

export const RDN_BOARD_LAYOUTS: Record<
  RdnBoardLayout["positions"],
  RdnBoardLayout
> = {
  4: {
    positions: 4,
    ring: { diameter: 2.38, widthScale: 1, heightScale: 1, offsetX: 0, offsetY: 0, angle: 0 },
    gear: { diameter: 1.47, offsetX: 0, offsetY: 0, angle: 0 },
    outerSlots: {
      radius: 0.98,
      angleOffset: 0,
      sphereRadius: 0.125,
      badgeOffsetX: -0.11,
      badgeOffsetY: 0.13,
    },
    innerSlots: { radius: 0.65, angleOffset: 0, sphereRadius: 0.115 },
    impulse: { radius: 0.29, iconSize: 0.6 },
    trail: {
      startRadius: 0.22,
      controlRadius: 0.6,
      bend: 0.1,
      sphereRadius: 0.19,
      glowWidth: 0.11,
      middleWidth: 0.07,
      coreWidth: 0.023,
    },
  },
  5: {
    positions: 5,
    ring: { diameter: 2.2, widthScale: 1, heightScale: 0.95, offsetX: 0, offsetY: -0.03, angle: 0 },
    gear: { diameter: 1.44, offsetX: 0, offsetY: 0, angle: 0 },
    outerSlots: {
      radius: 0.91,
      angleOffset: 0,
      sphereRadius: 0.12,
      badgeOffsetX: -0.105,
      badgeOffsetY: 0.125,
    },
    innerSlots: { radius: 0.64, angleOffset: 0, sphereRadius: 0.11 },
    impulse: { radius: 0.28, iconSize: 0.6 },
    trail: {
      startRadius: 0.22,
      controlRadius: 0.6,
      bend: 0.1,
      sphereRadius: 0.18,
      glowWidth: 0.105,
      middleWidth: 0.065,
      coreWidth: 0.02,
    },
  },
  6: {
    positions: 6,
    ring: { diameter: 2.18, widthScale: 1, heightScale: 1, offsetX: 0, offsetY: 0, angle: 0 },
    gear: { diameter: 1.44, offsetX: 0, offsetY: 0, angle: 0 },
    outerSlots: {
      radius: 0.91,
      angleOffset: 0,
      sphereRadius: 0.115,
      badgeOffsetX: -0.1,
      badgeOffsetY: 0.12,
    },
    innerSlots: { radius: 0.66, angleOffset: 0, sphereRadius: 0.105 },
    impulse: { radius: 0.28, iconSize: 0.6 },
    trail: {
      startRadius: 0.22,
      controlRadius: 0.6,
      bend: 0.09,
      sphereRadius: 0.17,
      glowWidth: 0.1,
      middleWidth: 0.06,
      coreWidth: 0.019,
    },
  },
  7: {
    positions: 7,
    ring: { diameter: 2.05, widthScale: 1, heightScale: 1, offsetX: 0, offsetY: 0, angle: 0 },
    gear: { diameter: 1.45, offsetX: 0, offsetY: 0, angle: 0 },
    outerSlots: {
      radius: 0.91,
      angleOffset: 0,
      sphereRadius: 0.1,
      badgeOffsetX: -0.095,
      badgeOffsetY: 0.11,
    },
    innerSlots: { radius: 0.68, angleOffset: 0, sphereRadius: 0.1 },
    impulse: { radius: 0.275, iconSize: 0.6 },
    trail: {
      startRadius: 0.22,
      controlRadius: 0.6,
      bend: 0.085,
      sphereRadius: 0.16,
      glowWidth: 0.092,
      middleWidth: 0.055,
      coreWidth: 0.018,
    },
  },
  8: {
    positions: 8,
    ring: { diameter: 2.18, widthScale: 1, heightScale: 1, offsetX: 0, offsetY: 0, angle: 0 },
    gear: { diameter: 1.46, offsetX: 0, offsetY: 0, angle: 0 },
    outerSlots: {
      radius: 0.91,
      angleOffset: 0,
      sphereRadius: 0.105,
      badgeOffsetX: -0.09,
      badgeOffsetY: 0.105,
    },
    innerSlots: { radius: 0.68, angleOffset: 0, sphereRadius: 0.095 },
    impulse: { radius: 0.27, iconSize: 0.6 },
    trail: {
      startRadius: 0.22,
      controlRadius: 0.6,
      bend: 0.08,
      sphereRadius: 0.15,
      glowWidth: 0.085,
      middleWidth: 0.05,
      coreWidth: 0.016,
    },
  },
};

/**
 * Number typography is defined per ring size, separately for outer and inner
 * gems. Both reserve the width of a signed two-digit value (for example -99),
 * keeping +1, -1 and +/-99 visually homogeneous instead of scaling per text.
 */
export const RDN_GEM_NUMERAL_CONFIG: Record<
  RdnBoardLayout["positions"],
  {
    outerFontSizeRatio: number;
    innerFontSizeRatio: number;
    reservedWidthRatio: number;
  }
> = {
  4: {
    outerFontSizeRatio: 0.23,
    innerFontSizeRatio: 0.22,
    reservedWidthRatio: 0.9,
  },
  5: {
    outerFontSizeRatio: 0.22,
    innerFontSizeRatio: 0.21,
    reservedWidthRatio: 0.9,
  },
  6: {
    outerFontSizeRatio: 0.21,
    innerFontSizeRatio: 0.2,
    reservedWidthRatio: 0.89,
  },
  7: {
    outerFontSizeRatio: 0.2,
    innerFontSizeRatio: 0.2,
    reservedWidthRatio: 0.88,
  },
  8: {
    outerFontSizeRatio: 0.2,
    innerFontSizeRatio: 0.19,
    reservedWidthRatio: 0.87,
  },
};

/** Global presentation tuning, intentionally kept outside the scene for fast visual iteration. */
export const RDN_PHASER_VISUAL_CONFIG = {
  /** Percentage applied independently to width and height of the stretched background. */
  backgroundScalePercent: 100,
  /** HUD content is centred within this maximum width instead of spreading across wide screens. */
  hudMaxWidth: 640,
  /** Minimum empty space reserved at the left and right edges of the HUD, in canvas pixels. */
  hudSideMargin: 18,
  /** Vertical displacement applied to the complete top HUD, in canvas pixels. */
  hudVerticalOffset: 10,
  /** Distance from the bottom edge for the three action buttons. */
  actionButtonsBottomOffset: 85,
  /** Board radius caps preserve a 1:1 board on narrow, wide and tall screens. */
  boardWidthRadiusRatio: 0.46,
  boardHeightRadiusRatio: 0.31,
} as const;

/** Shared canvas motion tokens; gameplay rules never depend on these timings. */
export const RDN_MOTION = {
  dragSnapMs: 260,
  impulseChargeMs: 90,
  impulseDispatchDelayMs: 160,
  zeroImpactMs: 520,
  operationFloatMs: 2060,
  maxZeroParticles: 28,
  blockedAlpha: 0.76,
  /** Transaction timings: math is precomputed; only these values affect presentation. */
  impulseTravelMs: 500,
  impulseLinkTravelMs: 580,
  impulseNodePauseMs: 530,
} as const;

export const getRdnBoardLayout = (positions: number): RdnBoardLayout =>
  RDN_BOARD_LAYOUTS[positions as RdnBoardLayout["positions"]] ??
  RDN_BOARD_LAYOUTS[6];
export const rdnRingTextureKey = (
  layout: RdnBoardLayout,
  set: number,
): string => `rdn-ring-${layout.positions}-set${set}`;
export const rdnGearTextureKey = (
  layout: RdnBoardLayout,
  set: number,
): string => `rdn-gear-${layout.positions}-set${set}`;
