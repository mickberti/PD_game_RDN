/** Active catalogue configuration facade. */
import { activeRdnCatalogueRuntime } from "../catalogues/catalogue.registry";

const levels = activeRdnCatalogueRuntime.levels as Partial<typeof import("../catalogues/v007/levels.config")>;
export const RDN_MAX_LEVEL = levels.RDN_MAX_LEVEL ?? 450;
export const RDN_MIN_SPHERES = levels.RDN_MIN_SPHERES ?? 4;
export const RDN_MAX_SPHERES = levels.RDN_MAX_SPHERES ?? 8;
export const RDN_MAX_TIMER_DIRECT_IMPULSES = levels.RDN_MAX_TIMER_DIRECT_IMPULSES ?? 15;
export const RDN_MAX_OPERATIONS_PER_SPHERE = levels.RDN_MAX_OPERATIONS_PER_SPHERE ?? 15;
export const RDN_MAX_GEAR_OPERATOR_MAGNITUDE = levels.RDN_MAX_GEAR_OPERATOR_MAGNITUDE ?? 15;
export const RDN_MAX_SPECIAL_OPERATORS = levels.RDN_MAX_SPECIAL_OPERATORS ?? 2;
export const RDN_MAX_AREA_EFFECTS_PER_BOARD = levels.RDN_MAX_AREA_EFFECTS_PER_BOARD ?? 2;
export const RDN_LEVELS_PER_SPHERE_INCREMENT = levels.RDN_LEVELS_PER_SPHERE_INCREMENT ?? Math.ceil(RDN_MAX_LEVEL / (RDN_MAX_SPHERES - RDN_MIN_SPHERES + 1));
export const rdnSphereCountForLevel = levels.rdnSphereCountForLevel ?? ((number: number): 4 | 5 | 6 | 7 | 8 => Math.min(RDN_MAX_SPHERES, RDN_MIN_SPHERES + Math.floor((Math.max(1, number) - 1) / RDN_LEVELS_PER_SPHERE_INCREMENT)) as 4 | 5 | 6 | 7 | 8);
