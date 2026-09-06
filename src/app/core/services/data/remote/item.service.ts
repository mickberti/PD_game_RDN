import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';

import { EMPTY_GAME_CATALOG, GameCatalog } from '../../../models/game-catalog.model';
import { AwardItem } from '../../../models/game.models';
import { LoggerService } from '../../infrastructure/logging/logger.service';

const CATALOG_COLLECTIONS = {
  awards: 'catalogAwards'
} as const;

@Injectable({ providedIn: 'root' })
export class ItemService {
  private readonly firestore = inject(Firestore);
  private readonly logger = inject(LoggerService);

  private catalogCache: GameCatalog | null = null;
  private catalogPromise: Promise<GameCatalog> | null = null;

  async getCatalog(forceRefresh = false): Promise<GameCatalog> {
    if (!forceRefresh && this.catalogCache) return this.catalogCache;
    try {
      const awards = await this.loadCollection<AwardItem>(CATALOG_COLLECTIONS.awards);
      const catalog = { ...EMPTY_GAME_CATALOG, awards };
      this.catalogCache = catalog;
      return catalog;
    } catch (error) {
      this.logger.logWarning("[ItemService] catalogAwards non disponibile", error);
      return EMPTY_GAME_CATALOG;
    }
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
}

export { ItemService as RemoteItemService };
