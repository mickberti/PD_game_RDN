import { AwardItem, ChestItem, EquipItem, HeroItem, ResourceItem } from './game.models';

/**
 * Catalogo globale degli item disponibili nel gioco.
 *
 * Questo modello descrive il contenuto pubblicabile/ottenibile a livello globale
 * e deve restare separato dall'inventario del giocatore, che contiene invece le
 * copie possedute, quantità, progressi e stato utente.
 */
export interface GameCatalog {
  heroes: HeroItem[];
  equip: EquipItem[];
  boxes: ChestItem[];
  resources: ResourceItem[];
  awards: AwardItem[];
}

export const EMPTY_GAME_CATALOG: GameCatalog = {
  heroes: [],
  equip: [],
  boxes: [],
  resources: [],
  awards: []
};
