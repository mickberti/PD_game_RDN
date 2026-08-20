import { createFreeModeEffectConfiguration, createProgressionEffectConfiguration, resolveEffectProgressionTier, shouldUseProgressionEffects, validateEffectComplexity } from "./effect-progression.config";
import { EffectScope } from "./effects.models";
import { LevelEffectConfigResolver } from "./level-effect-config.resolver";

describe("effect game-mode progression", () => {
  const resolver = new LevelEffectConfigResolver();

  it("keeps every level before the first introduction legacy", () => {
    expect(shouldUseProgressionEffects(19)).toBeFalse();
    expect(createProgressionEffectConfiguration("adventure", 19, 4, 1)).toBeUndefined();
  });

  it("uses only the four introduction milestones before level 81", () => {
    expect(shouldUseProgressionEffects(20)).toBeTrue();
    expect(shouldUseProgressionEffects(21)).toBeFalse();
    expect(shouldUseProgressionEffects(40)).toBeTrue();
    expect(shouldUseProgressionEffects(60)).toBeTrue();
    expect(shouldUseProgressionEffects(80)).toBeTrue();
    expect(shouldUseProgressionEffects(81)).toBeTrue();
  });

  it("creates valid, bounded deterministic stable configurations", () => {
    const first = createProgressionEffectConfiguration("adventure", 100, 7, 123);
    const second = createProgressionEffectConfiguration("adventure", 100, 7, 123);
    expect(first).toEqual(second);
    expect(validateEffectComplexity(first, "test")).toEqual([]);
    expect(resolver.resolve(first, 7).issues).toEqual([]);
    expect((first?.effects ?? []).filter((effect) => effect.target.type === EffectScope.LINK).length).toBeLessThanOrEqual(1);
    expect((first?.effects ?? []).filter((effect) => effect.target.type === EffectScope.AREA).length).toBeLessThanOrEqual(1);
  });

  it("maps Free effects explicitly and leaves OFF untouched", () => {
    expect(createFreeModeEffectConfiguration("EXPERT", 8, 14, false)).toBeUndefined();
    const configuration = createFreeModeEffectConfiguration("EXPERT", 8, 14, true);
    expect(configuration?.enabled).toBeTrue();
    expect(validateEffectComplexity(configuration, "free")).toEqual([]);
  });

  it("resolves the stable tier after the introduction sequence", () => {
    expect(resolveEffectProgressionTier(80).id).toBe("INTRO_ALL");
    expect(resolveEffectProgressionTier(81).id).toBe("STABLE");
  });
});
