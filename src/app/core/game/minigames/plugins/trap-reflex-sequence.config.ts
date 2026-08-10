export interface TrapReflexSequenceUxConfig {
  layout: { statusY: number; timerY: number; timerBarY: number; buttonY: number; buttonWidth: number; buttonHeight: number; buttonX: readonly number[]; activeSymbolCount: number; timerBarWidth: number; timerBarHeight: number };
  sequenceLengths: { easy: number; medium: number; hard: number };
  grid: {
    columns: number;
    cellSize: number;
    cellGap: number;
    perspectiveRowSpreadX: number;
    perspectiveRowLiftY: number;
    perspectiveRowGapGrowth: number;
    cellAlpha: number;
    cellStrokeAlpha: number;
    sequenceGridY: number;
  };
  memoryReveal: {
    centerScale: number;
    cellScale: number;
    fadeInDuration: number;
    rotationDuration: number;
    rotationDegrees: number;
    holdDuration: number;
    interRuneDelay: number;
    moveToCellDuration: number;
    arrivalGlowDuration: number;
  };
  playerInput: {
    centerScale: number;
    cellScale: number;
    correctShineDuration: number;
    moveToCellDuration: number;
    errorJuiceDuration: number;
  };
}

export const DEFAULT_TRAP_REFLEX_SEQUENCE_UX_CONFIG: TrapReflexSequenceUxConfig = {
  layout: { statusY: 88, timerY: 112, timerBarY: 131, buttonY: 195, buttonWidth: 80, buttonHeight: 80, buttonX: [-110, 0, 110], activeSymbolCount: 3, timerBarWidth: 220, timerBarHeight: 9 },
  sequenceLengths: { easy: 3, medium: 6, hard: 9 },
  grid: {
    columns: 3,
    cellSize: 65,
    cellGap: 10,
    perspectiveRowSpreadX: 5,
    perspectiveRowLiftY: 5,
    perspectiveRowGapGrowth: 3,
    cellAlpha: 0.1,
    cellStrokeAlpha: 0.3,
    sequenceGridY: -42,
  },
  memoryReveal: {
    centerScale: 1,
    cellScale: 0.5,
    fadeInDuration: 160,
    rotationDuration: 650,
    rotationDegrees: 1080,
    holdDuration: 140,
    interRuneDelay: 220,
    moveToCellDuration: 420,
    arrivalGlowDuration: 360,
  },
  playerInput: {
    centerScale: 1,
    cellScale: 0.1,
    correctShineDuration: 420,
    moveToCellDuration: 360,
    errorJuiceDuration: 320,
  },
};
