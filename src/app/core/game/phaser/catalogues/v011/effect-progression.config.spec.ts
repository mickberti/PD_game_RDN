import { EffectScope } from "../../effects/effects.models";
import { policyCompatibleEffectConfiguration } from "./effect-progression.config";

describe("v011 link fallback", () => {
  const link = (fromGemIndex: number, toGemIndex: number) => ({
    preset: "CHAIN_LINK" as const,
    target: { type: EffectScope.LINK as const, fromGemIndex, toGemIndex },
  });

  it("reserves a Chain on its high-sphere cadence instead of falling back to Echo-only", () => {
    const result = policyCompatibleEffectConfiguration({
      enabled: true,
      effects: [
        link(0, 1),
        link(1, 2),
        { preset: "AREA_ICE_ALL", target: { type: EffectScope.AREA, sourceGemIndex: 3 } },
      ],
    }, "adventure", 227, 7, 0, [], false, false);

    expect(result.effects?.filter((effect) => effect.target.type === EffectScope.LINK).map((effect) => effect.preset)).toEqual(["CHAIN_LINK", "ECHO_LINK"]);
    expect(result.effects?.find((effect) => effect.target.type === EffectScope.AREA)?.preset).toBe("AREA_BOMB_MINUS_2");
  });

  it("keeps a transform link on high-sphere fallback boards outside the Chain cadence", () => {
    const result = policyCompatibleEffectConfiguration({
      enabled: true,
      effects: [
        link(0, 1),
        link(1, 2),
        { preset: "AREA_ICE_ALL", target: { type: EffectScope.AREA, sourceGemIndex: 3 } },
      ],
    }, "adventure", 226, 7, 0, [], false, false);

    expect(result.effects?.filter((effect) => effect.target.type === EffectScope.LINK).map((effect) => effect.preset)).toEqual(["DOUBLE_LINK", "ECHO_LINK"]);
  });
});
