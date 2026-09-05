import { ShopItem } from "../../../models/shop.models";
import { Injectable, inject } from '@angular/core';

import { MOCK_REMOTE_CONFIG } from '../../../models/mock/remote-config.mock';
import { DEFAULT_REMOTE_CONFIG, RemoteConfigDocument } from '../../../models/remote/config.model';
import { GameEvent } from '../../../models/remote/event.model';
import { DEFAULT_GAME_PROGRESS, GameProgress } from '../../../models/remote/progress.models';
import { createMockGameProgress, normalizeGameProgress } from '../../../models/remote/progress.mapper';

import { GameCatalog } from '../../../models/game-catalog.model';
import { EventService } from '../remote/event.service';
import { RemoteConfigService } from '../remote/config.service';
import { ProgressService } from '../remote/progress.service';
import { ShopService, resolveAvailableShopItems } from '../remote/shop.service';
import { ItemService } from '../remote/item.service';
import { PLAYER_STATE_CONFIG } from '../../../config/game-progression.config';
import { TimeService } from '../../utils/time.service';
import { getActiveGameEvents } from '../../utils/availability/game-event-availability.util';
import { createInitialPlayerInventory } from '../../inventory/factories/player-inventory.factory';
import { mapMockShopToShopItems } from '../../../models/mock/shop.mapper';
import { LoggerService } from '../../infrastructure/logging/logger.service';
import { mockGameEvents } from "src/app/core/models/mock/fantasy/event-data";
import { MockCatalogService } from '../mock/mock-catalog.service';
import { MockSessionService } from '../mock/mock-session.service';

export interface GameDataProvider {
  loadProgress(uid: string | null): Promise<GameProgress>;
  loadConfig(): Promise<RemoteConfigDocument>;
  loadEvents(forceRefresh?: boolean): Promise<GameEvent[]>;
  loadShop(forceRefresh?: boolean): Promise<ShopItem[]>;
  loadCatalog(forceRefresh?: boolean): Promise<GameCatalog>;
}

@Injectable({ providedIn: 'root' })
export class RemoteGameDataProvider implements GameDataProvider {
  private readonly progressService = inject(ProgressService);
  private readonly remoteConfigService = inject(RemoteConfigService);
  private readonly eventService = inject(EventService);
  private readonly shopService = inject(ShopService);
  private readonly itemService = inject(ItemService);
  private readonly logger = inject(LoggerService);

  async loadProgress(uid: string | null): Promise<GameProgress> {
	this.logger.logDebug('[RemoteGameDataProvider] loadProgress',uid);
    if (!uid) {
      return normalizeGameProgress(DEFAULT_GAME_PROGRESS);
    }

    return this.progressService.loadUserProgress(uid);
  }

  loadConfig(): Promise<RemoteConfigDocument> {
	this.logger.logDebug('[RemoteGameDataProvider] loadProgress');
    return this.remoteConfigService.loadPublicConfig();
  }

  loadEvents(forceRefresh = false): Promise<GameEvent[]> {
	this.logger.logDebug('[RemoteGameDataProvider] loadEvents',forceRefresh);
    return this.eventService.getActiveEvents(forceRefresh);
  }

  async loadShop(_forceRefresh = false): Promise<ShopItem[]> {
    return [];
  }

  async loadCatalog(_forceRefresh = false): Promise<GameCatalog> {
    return { heroes: [], equip: [], boxes: [], resources: [], awards: [] };
  }
}

@Injectable({ providedIn: 'root' })
export class MockGameDataProvider implements GameDataProvider {
  private readonly mockCatalog = inject(MockCatalogService);
  private readonly mockSession = inject(MockSessionService);
  private readonly timeService = inject(TimeService);
  private eventsCache: GameEvent[] | null = null;
  private readonly logger = inject(LoggerService);

  async loadProgress(_uid: string | null): Promise<GameProgress> {
	this.logger.logDebug('[MockGameDataProvider] loadProgress',_uid);
    const inventory = createInitialPlayerInventory(this.mockSession.createFantasySession());

    return createMockGameProgress(
      inventory,
      {
        coins: PLAYER_STATE_CONFIG.initialCoins,
        gems: PLAYER_STATE_CONFIG.initialGems,
        dust: PLAYER_STATE_CONFIG.initialDust,
        lastUpdatedAt: new Date(0).toISOString()
      }
    );
  }

  async loadConfig(): Promise<RemoteConfigDocument> {
	this.logger.logDebug('[MockGameDataProvider] loadConfig',);
    return {
      ...DEFAULT_REMOTE_CONFIG,
      ...MOCK_REMOTE_CONFIG,
      news: [...MOCK_REMOTE_CONFIG.news]
    };
  }

  async loadEvents(forceRefresh = false): Promise<GameEvent[]> {
	this.logger.logDebug('[MockGameDataProvider] loadEvents',forceRefresh);
    await this.timeService.sync(forceRefresh);

    if (this.eventsCache && !forceRefresh) {
      return this.eventsCache;
    }

    this.eventsCache = getActiveGameEvents(
      mockGameEvents.map(event => ({ ...event })),
      this.timeService.nowDate()
    );

    return this.eventsCache;
  }

  async loadShop(_forceRefresh = false): Promise<ShopItem[]> {
    return [];
  }

  async loadCatalog(_forceRefresh = false): Promise<GameCatalog> {
    return { heroes: [], equip: [], boxes: [], resources: [], awards: [] };
  }
}
