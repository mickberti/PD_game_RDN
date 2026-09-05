import { generateStatisticAwards } from "../../../config/statistics-awards.config";
import type { AwardItem } from "../../game.models";

/** Temporary publishable catalogue. The Firestore seeder writes these documents to `catalogAwards`. */
export const TEMPORARY_RDN_CATALOG_AWARDS: readonly AwardItem[] = generateStatisticAwards();
