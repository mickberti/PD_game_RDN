import { createFreeModeEffectConfiguration, createProgressionEffectConfiguration, resolveEffectProgressionTier, shouldUseProgressionEffects, validateEffectComplexity } from "./effect-progression.config";
import { EffectScope } from "./effects.models";
import { LevelEffectConfigResolver } from "./level-effect-config.resolver";

describe("effect game-mode progression", () => {
  const resolver = new LevelEffectConfigResolver();

  it("keeps only levels before the first introduction legacy", () => {
    expect(shouldUseProgressionEffects(9)).toBeFalse();
    expect(createProgressionEffectConfiguration("adventure", 9, 4, 1)).toBeUndefined();
  });

  it("uses the configured effect tier for every level from 10 onward", () => {
    expect(shouldUseProgressionEffects(20)).toBeTrue();
    expect(shouldUseProgressionEffects(21)).toBeTrue();
    expect(shouldUseProgressionEffects(40)).toBeTrue();
    expect(shouldUseProgressionEffects(60)).toBeTrue();
    expect(shouldUseProgressionEffects(80)).toBeTrue();
    expect(shouldUseProgressionEffects(81)).toBeTrue();
  });

  it("creates valid, bounded deterministic stable configurations", () => {
    const first = createProgressionEffectConfiguration("adventure", 101, 7, 123);
    const second = createProgressionEffectConfiguration("adventure", 101, 7, 123);
    expect(first).toEqual(second);
    expect(validateEffectComplexity(first, "test")).toEqual([]);
    expect(resolver.resolve(first, 7).issues).toEqual([]);
    expect((first?.effects ?? []).filter((effect) => effect.target.type === EffectScope.LINK).length).toBeLessThanOrEqual(3);
    expect((first?.effects ?? []).filter((effect) => effect.target.type === EffectScope.AREA).length).toBeLessThanOrEqual(1);
  });

  it("uses the one-hit wall throughout the introductory wall tier", () => {
    expect(createProgressionEffectConfiguration("adventure", 20, 4, 1)?.effects?.[0].preset).toBe("WALL_1");
    expect(createProgressionEffectConfiguration("adventure", 29, 4, 1)?.effects?.[0].preset).toBe("WALL_1");
  });

  it("adds the optional five-sphere link every three catalogue levels", () => {
    const linkCount = (level: number) => (createProgressionEffectConfiguration("adventure", level, 5, 123)?.effects ?? []).filter((effect) => effect.target.type === EffectScope.LINK).length;
    expect(linkCount(72)).toBe(1);
    expect(linkCount(73)).toBe(0);
  });

  it("maps Free effects explicitly and leaves OFF untouched", () => {
    expect(createFreeModeEffectConfiguration("EXPERT", 8, 14, false)).toBeUndefined();
    const configuration = createFreeModeEffectConfiguration("EXPERT", 8, 14, true);
    expect(configuration?.enabled).toBeTrue();
    expect(validateEffectComplexity(configuration, "free")).toEqual([]);
  });

  it("resolves the stable tier after the introduction sequence", () => {
    expect(resolveEffectProgressionTier(80).id).toBe("AREA");
    expect(resolveEffectProgressionTier(100).id).toBe("AREA");
    expect(resolveEffectProgressionTier(101).id).toBe("STABLE");
  });
});
