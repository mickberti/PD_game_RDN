/** Shared gameplay limits, independent from catalogue generation. */
export const RDN_MAX_LEVEL = 350;
export const RDN_MIN_SPHERES = 4;
export const RDN_MAX_SPHERES = 8;
export const RDN_MAX_TIMER_DIRECT_IMPULSES = 10;

/** Number of levels in each sphere-count band; recalculated when the catalogue size changes. */
export const RDN_LEVELS_PER_SPHERE_INCREMENT = Math.ceil(RDN_MAX_LEVEL / (RDN_MAX_SPHERES - RDN_MIN_SPHERES + 1));

export const rdnSphereCountForLevel = (number: number): 4 | 5 | 6 | 7 | 8 => {
  const band = Math.min(RDN_MAX_SPHERES - RDN_MIN_SPHERES, Math.floor((Math.max(1, number) - 1) / RDN_LEVELS_PER_SPHERE_INCREMENT));
  return (RDN_MIN_SPHERES + band) as 4 | 5 | 6 | 7 | 8;
};
