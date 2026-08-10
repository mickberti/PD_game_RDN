import { GameplaySessionVariant } from "../../core/models/gameplay-session.model";
import { PhaserGameParams } from "../../core/models/phaser-game-state.model";

export function buildGameplayVariantView(
  variant: GameplaySessionVariant,
  modeTitle: string,
): {
  subtitle: string;
  matchLabel: string;
  params: Partial<PhaserGameParams>;
} {
  if (variant === "adventure") {
    return {
      subtitle: "Adventure Core",
      matchLabel: `${modeTitle} · Esplorazione`,
      params: {
        sections: 12,
        initialLives: 4,
        treasuresPerSection: 4,
        enemiesPerSection: 2,
      },
    };
  }

  return {
    subtitle: "Dungeon Run",
    matchLabel: `${modeTitle} · Sprint`,
    params: {},
  };
}
