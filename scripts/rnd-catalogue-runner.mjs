process.env.RDN_GENERATE_CATALOGUE = "1";

const levels = await import("../src/app/core/game/rnd/levels.config.ts");

export const catalogue = {
  levels: levels.RDN_LEVELS,
  audit: levels.RDN_SOLUTION_TABLE,
};
