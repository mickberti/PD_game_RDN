/** Presentation-only tuning for all flows and effects. */
export const EFFECT_PHASER_VISUAL = {
  /** Green conduits from the gear to gems whose operation is currently usable. */
  activeFlows: {
    color: 0x59e77c,
    coreTrailColor: 0x8fffb0,
    coreColor: 0xf3fff6,
    alpha: 0.95,
    widthMultiplier: 1.48,
    particleCount: 3,
    particleStaggerMs: 390,
    glowPulseDurationMs: 1050,
    glowTraceAlphaMultiplier: 0.15,
    glowInitialAlpha: 0.28,
    glowPeakAlpha: 0.92,
    haloRadius: 10,
    haloAlphaMultiplier: 0.12,
    haloFadeAlphaMultiplier: 0.3,
    haloMinScale: 0.75,
    haloScaleRange: 0.9,
    particleRadius: 4.6,
    particleStrokeWidth: 2,
    particleMinScale: 0.72,
    particleScaleRange: 0.75,
    intensityBase: 0.35,
    intensityRange: 0.65,
    directPathRatio: 0.72,
    /** The active conduit also enters gently, preventing a busy board on load. */
    initialAppearanceFadeInMs: 1000,
    /** Link continuation uses the same three-layer active-flow treatment, sized from its gem radius. */
    linkGlowWidthRadiusRatio: 1.3,
    linkMiddleWidthRadiusRatio: 0.78,
    linkCoreWidthRadiusRatio: 0.25,
    linkGlowAlpha: 0.15,
    linkMiddleAlpha: 0.22,
    linkCoreAlpha: 0.72,
    linkTargetRingRadiusRatio: 1.48,
    durationMs: 1450,
    repeatDelayMs: 250,
  },
  /** Yellow topology previews for the operation that follows the active one. */
  yellowFlows: {
    color: 0xf3ce55,
    coreColor: 0xf3fff6,
    alpha: 0.78,
    widthMultiplier: 1,
    particleCount: 1,
    particleStaggerMs: 390,
    glowPulseDurationMs: 1050,
    glowTraceAlphaMultiplier: 0.15,
    glowInitialAlpha: 0.28,
    glowPeakAlpha: 0.92,
    haloRadius: 10,
    haloAlphaMultiplier: 0.12,
    haloFadeAlphaMultiplier: 0.3,
    haloMinScale: 0.75,
    haloScaleRange: 0.9,
    particleRadius: 2.6,
    particleStrokeWidth: 2,
    particleMinScale: 0.72,
    particleScaleRange: 0.75,
    intensityBase: 0.35,
    intensityRange: 0.65,
    directPathRatio: 0.72,
    /** First appearance is intentionally delayed to avoid competing with the active flow. */
    initialAppearanceFadeInMs: 3500,
    durationMs: 1450,
    repeatDelayMs: 250,
  },
  /** Red section of a blocked active flow, after it leaves the gear. */
  blockedFlows: { color: 0xd94852, alpha: 0.76, widthMultiplier: 1.48 },
  /** Static effect links, their moving particles, and their active green continuation. */
  links: {
    alpha: 0.72,
    width: 3,
    outerGlowWidthExtra: 8,
    middleGlowWidthExtra: 4,
    outerGlowAlpha: 0.12,
    middleGlowAlpha: 0.28,
    coreAlpha: 0.9,
    particleRadius: 3.5,
    particleAlpha: 0.95,
    particleDurationMs: 1320,
    particleRepeatDelayMs: 220,
    particleMinScale: 0.7,
    particleScaleRange: 0.75,
    particleMinAlpha: 0.2,
    particleAlphaRange: 0.78,
    propagationParticleColor: 0xf5e58a,
    propagationParticleRadius: 2.8,
    propagationParticleAlpha: 0.98,
    propagationParticleScale: 1.35,
    propagationDurationMs: 620,
    propagationParticleCount: 3,
    propagationParticleStaggerMs: 90,
    propagationStageDelayMs: 260,
    propagationTrailColor: 0xffd568,
    propagationTrailWidth: 4,
    propagationTrailGlowWidthExtra: 6,
    propagationTrailAlpha: 0.9,
    activeColor: 0x62e98a,
    activeWidth: 4,
    activeGlowWidthExtra: 5,
    activeAlpha: 0.9,
    activeDurationMs: 680,
    /** Position of a non-adjacent link icon along the curve, measured from its source. */
    nonAdjacentIconProgress: 0.2,
  },
  /**
   * One-shot current released by the central impulse.  It is deliberately
   * independent from the ambient green/yellow flow so its density and rhythm
   * can be tuned without changing the board's readable state.
   */
  impulseDischarge: {
    /** Bright white core used by every particle tail. */
    color: 0xffffff,
    particleStrokeColor: 0xffffff,
    haloColor: 0x59e77c,
    /** Number of complete particle tails.  `1` preserves the original single-tail discharge. */
    tailCount: 3,
    /** Angular offset between tails; 2π/3 makes the default three tails interlace evenly. */
    tailPhaseSpread: (Math.PI * 2) / 3,
    particleCount: 14,
    particleRadius: 2.6,
    particleAlpha: 0.94,
    particleStrokeWidth: 1,
    particleStaggerMs: 34,
    particleMinScale: 0.5,
    particleScaleRange: 0.88,
    /** Direct trip from the impulse to the first active gems. */
    directDurationMs: 560,
    /** Duration of each curved link segment after the first gem. */
    linkSegmentDurationMs: 500,
    /** Consecutive links form a continuous current with no artificial pause. */
    linkGenerationDelayMs: 500,
    /** Side-to-side movement that makes the particles look intertwined. */
    weaveAmplitude: 11,
    weaveTurns: 2.4,
    phaseSpread: 0.7,
    haloRadius: 7,
    haloAlpha: 0.24,
    haloMinScale: 0.68,
    haloScaleRange: 0.9,
    arrivalBurstCount: 8,
    arrivalBurstDistance: 24,
    arrivalBurstDurationMs: 280,
    /** Numeric applied value shown at the exact arrival point of the discharge. */
    valueFloatDurationMs: 920,
    valueFloatRise: 52,
    valueFloatColor: 0xc5ffe0,
    depth: 22,
  },
  /** Contact feedback is presentation-only and is driven by IMPULSE_GEM_IMPACT. */
  impactFeedback: {
    reducedMotion: false,
    normal: {
      color: 0x9cf5ff,
      particleColor: 0xffff00,
      secondaryParticleColor: 0xeafff5,
      tertiaryParticleColor: 0x83e8ff,
      particles: 24,
      distanceRatio: 3.45,
      particleRadiusRatio: 0.33,
      durationMs: 780,
      pulseScale: 1.13,
      ring: {
        enabled: true,
        radiusRatio: 0.78,
        strokeWidthRatio: 0.12,
        color: 0xffff00,
        alpha: 0.96,
        targetScale: 1.42,
        durationMs: 150,
        holdMs: 0,
      },
    },
    absorbed: {
      color: 0x72dfff,
      particleColor: 0x333333,
      secondaryParticleColor: 0xc9fff1,
      tertiaryParticleColor: 0x83e8ff,
      particles: 24,
      distanceRatio: 2.16,
      particleRadiusRatio: 0.33,
      durationMs: 780,
      pulseScale: 1.06,
      ring: {
        enabled: true,
        radiusRatio: 0.78,
        strokeWidthRatio: 0.12,
        color: 0x333333,
        alpha: 0.96,
        targetScale: 1.42,
        durationMs: 150,
        holdMs: 0,
      },
    },
    /** Icon revealed above a gem when Shield, Wall or Ice consumes the impact. */
    absorbedIcon: {
      offsetYRatio: 0,
      sizeRatio: 1.12,
      /** Entire visible phase before an optional break animation. */
      durationMs: 800,
      depthOffset: 4,
      initialScale: 0.18,
      finalScale: 0.28,
      alpha: .8,
      fadeInMs: 340,
      holdMs: 560,
      fadeOutMs: 0,
      shatter: {
        /** Diagnostic switch: keep false while validating the base icon timeline. */
        enabled: true,
        fragments: 12,
        distanceRatio: 1.5,
        durationMs: 1000,
        /** No spin: the radial separation must read as an icon breaking, not a rotating gem. */
        rotation: 0,
        alpha: 0.96,
        finalScale: 0.82,
      },
    },
    /** The same staged break sequence, but applied to the gem itself on definitive zero. */
    zeroGemIcon: {
      offsetYRatio: 0,
      sizeRatio: 1,
      initialScale: 0.18,
      finalScale: 0.28,
      alpha: 0.8,
      durationMs: 800,
      fadeInMs: 340,
      holdMs: 560,
      fadeOutMs: 0,
      depthOffset: 4,
      shatter: {
        /** Diagnostic switch: keep false while validating the base gem timeline. */
        enabled: true,
        fragments: 12,
        distanceRatio: 1.5,
        durationMs: 1500,
        rotation: 0,
        alpha: 0.96,
        finalScale: 0.82,
      },
    },
    zero: {
      color: 0x9cf5ff,
      particleColor: 0xffff00,
      secondaryParticleColor: 0xeafff5,
      tertiaryParticleColor: 0x83e8ff,
      particles: 30,
      distanceRatio: 4.3125,
      particleRadiusRatio: 0.4125,
      durationMs: 975,
      pulseScale: 1.4125,
      shockwaveScale: 3.9,
      ring: {
        enabled: true,
        radiusRatio: 0.78,
        strokeWidthRatio: 0.12,
        color: 0xffff00,
        alpha: 0.96,
        targetScale: 2.1,
        durationMs: 150,
        holdMs: 0,
      },
    },
    label: {
      /** Must remain above impact particles, effect icons and shatter fragments. */
      depthOffset: 12,
      color: 0xf5fff8,
      panelColor: 0x102a20,
      strokeColor: 0x06110c,
      sizeRatio: 1.46,
      holdMs: 280,
      riseRatio: 1.75,
      durationMs: 1160,
      slotOffset: 15,
      maxSlots: 3,
    },
    haptics: { enabled: true, normalMs: 8, zeroMs: 22 },
    /** Keeps particles visible after the logical impact before the board may rebuild. */
    settleMs: 800,
    depth: 24,
  },
  gemHighlightDuration: 190,
  wallBreakDuration: 330,
  bombDuration: 360,
  linkDepth: 3,
  gemDepth: 8,
  flowDepth: 15,
  hudActiveEffectPulseScale: 0.1,
  hudActiveEffectPulseDurationMs: 900,
} as const;

/**
 * Single timing source for the visual arrival of an impulse on a gem.
 * Generation zero is the direct trip from the core; later generations arrive
 * at the end of their respective link segment.
 */
export const impulseImpactDelayMs = (generation: number): number => {
  const visual = EFFECT_PHASER_VISUAL.impulseDischarge;
  if (generation <= 0) return visual.directDurationMs;
  return impulseLinkStartDelayMs(generation) + visual.linkSegmentDurationMs;
};

/** Start time of a propagated link segment, measured from the impulse release. */
export const impulseLinkStartDelayMs = (generation: number): number => {
  const visual = EFFECT_PHASER_VISUAL.impulseDischarge;
  return (
    visual.directDurationMs +
    Math.max(0, generation - 1) * visual.linkGenerationDelayMs
  );
};
