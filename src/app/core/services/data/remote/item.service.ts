import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';

import { EMPTY_GAME_CATALOG, GameCatalog } from '../../../models/game-catalog.model';
import { AwardItem, ChestItem, EquipItem, HeroItem, InventoryItemType, ResourceItem } from '../../../models/game.models';
import { LoggerService } from '../../infrastructure/logging/logger.service';

const CATALOG_COLLECTIONS = {
  heroes: 'catalogHeroes',
  equip: 'catalogEquip',
  boxes: 'catalogChestes',
  resources: 'catalogResources',
  awards: 'catalogAwards'
} as const;

@Injectable({ providedIn: 'root' })
export class ItemService {
  private readonly firestore = inject(Firestore);
  private readonly logger = inject(LoggerService);

  private catalogCache: GameCatalog | null = null;
  private catalogPromise: Promise<GameCatalog> | null = null;

  async getCatalog(forceRefresh = false): Promise<GameCatalog> {
    // RDN no longer consumes remote item catalogues. Keep this compatibility
    // service inert while legacy administration screens are removed.
    void forceRefresh;
    return EMPTY_GAME_CATALOG;
    /*
    if (this.catalogCache && !forceRefresh) {
      this.logger.logDebug('[ItemService]: returning cached catalog');
      return this.catalogCache;
    }

    if (this.catalogPromise && !forceRefresh) {
      this.logger.logDebug('[ItemService]: returning existing catalog promise');
      return this.catalogPromise;
    }

    this.logger.logDebug('[ItemService]: Load catalog from Firestore');

    this.catalogPromise = (async () => {
      try {
        const [heroes, equip, boxes, resources, awards] = await Promise.all([
          this.loadInventoryCollection<HeroItem>(CATALOG_COLLECTIONS.heroes, 'hero'),
          this.loadInventoryCollection<EquipItem>(CATALOG_COLLECTIONS.equip, 'equip'),
          this.loadInventoryCollection<ChestItem>(CATALOG_COLLECTIONS.boxes, 'chest'),
          this.loadInventoryCollection<ResourceItem>(CATALOG_COLLECTIONS.resources, 'resource'),
          this.loadCollection<AwardItem>(CATALOG_COLLECTIONS.awards)
        ]);

        const catalog: GameCatalog = { heroes, equip, boxes, resources, awards };
        this.catalogCache = catalog;
        this.logger.logDebug('[ItemService]: Load OK', catalog);
        return catalog;
      } finally {
        this.catalogPromise = null;
      }
    })();

    return this.catalogPromise; */
  }

  clearCache(): void {
    this.catalogCache = null;
    this.catalogPromise = null;
  }

  private async loadCollection<T extends { id: string }>(collectionPath: string): Promise<T[]> {
    const ref = collection(this.firestore, collectionPath);
    const snap = await getDocs(ref);

    return snap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    } as T));
  }

  private async loadInventoryCollection<T extends { id: string; itemType?: InventoryItemType }>(
    collectionPath: string,
    itemType: InventoryItemType,
  ): Promise<T[]> {
    const items = await this.loadCollection<T>(collectionPath);
    return items.map((item) => ({ ...item, itemType }));
  }
}

export { ItemService as RemoteItemService };
