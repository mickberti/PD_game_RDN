/** Shared gameplay limits, independent from catalogue generation. */
export const RDN_MAX_LEVEL = 450;
export const RDN_MIN_SPHERES = 4;
export const RDN_MAX_SPHERES = 9;
export const RDN_MAX_TIMER_DIRECT_IMPULSES = 15;
/** Upper bound for the planned operations of one sphere. Raise progressively for high-level catalogues. */
export const RDN_MAX_OPERATIONS_PER_SPHERE = 15;
/** Largest absolute numeric operator that can appear in the gear. */
export const RDN_MAX_GEAR_OPERATOR_MAGNITUDE = 15;
/** Absolute cap for one-use special operators placed in the gear. */
export const RDN_MAX_SPECIAL_OPERATORS = 2;
/** Absolute cap for area effects assigned to one generated board. */
export const RDN_MAX_AREA_EFFECTS_PER_BOARD = 2;

/** Number of levels in each sphere-count band; recalculated when the catalogue size changes. */
export const RDN_LEVELS_PER_SPHERE_INCREMENT = Math.ceil(RDN_MAX_LEVEL / (RDN_MAX_SPHERES - RDN_MIN_SPHERES + 1));

export const rdnSphereCountForLevel = (number: number): 4 | 5 | 6 | 7 | 8 | 9 => {
  const band = Math.min(RDN_MAX_SPHERES - RDN_MIN_SPHERES, Math.floor((Math.max(1, number) - 1) / RDN_LEVELS_PER_SPHERE_INCREMENT));
  return (RDN_MIN_SPHERES + band) as 4 | 5 | 6 | 7 | 8 | 9;
};
