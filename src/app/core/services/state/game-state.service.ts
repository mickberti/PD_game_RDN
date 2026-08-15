import { ShopItem } from "../../models/shop.models";
import { Injectable, computed, inject, signal } from "@angular/core";
import { combineLatest, firstValueFrom, throwError, timeout } from "rxjs";
import { filter } from "rxjs/operators";

import { AuthService } from "../auth/auth.service";
import { PlayerService } from "../auth/player.service";
import { LoggerService } from "../infrastructure/logging/logger.service";
import { TimeService } from "../utils/time.service";
import { AppGameState } from "../../models/auth/game-state.model";
import { EventService } from "../data/remote/event.service";
import { ShopService } from "../data/remote/shop.service";
import { ItemService } from "../data/remote/item.service";
import {
  GameDataProvider,
  MockGameDataProvider,
  RemoteGameDataProvider,
} from "../data/provider/game-data-provider.service";
import {
  DEFAULT_GAME_PROGRESS,
  DEFAULT_SHOP,
  GameProgress,
  PlayerShop,
  TimeShop,
} from "../../models/remote/progress.models";
import { normalizeGameProgress } from "../../models/remote/progress.mapper";
import { DEFAULT_REMOTE_CONFIG } from "../../models/remote/config.model";
import { ThemeService } from "../app/theme/theme.service";
import { RemoteConfigDocument } from "../../models/remote/config.model";
import { AvailabilityWindow, GameEvent } from "../../models/remote/event.model";

import { PLAYER_STATE_CONFIG } from "../../config/game-progression.config";
import { EMPTY_GAME_CATALOG, GameCatalog } from "../../models/game-catalog.model";
import { ProgressStoreService } from "./progress-store.service";
import { buildShopItemsByProgress } from "../shop/shop-generation.service";

export type GameDataSourceMode = "mock" | "remote";
export type BootstrapStepId = "theme" | "serverTime" | "firebaseAuth" | "playerProfile" | "gameData" | "routing";
export type BootstrapStepStatus = "pending" | "success" | "error";

export interface BootstrapStep {
  id: BootstrapStepId;
  label: string;
  status: BootstrapStepStatus;
  detail: string;
}

const GAME_DATA_SOURCE_MODE_STORAGE_KEY = "gameDataSourceMode";
const DEFAULT_GAME_DATA_SOURCE_MODE: GameDataSourceMode = "remote";
const INITIAL_BOOTSTRAP_STEPS: BootstrapStep[] = [
  { id: "theme", label: "Tema UI", status: "pending", detail: "In attesa" },
  { id: "serverTime", label: "Ora Firestore", status: "pending", detail: "In attesa" },
  { id: "firebaseAuth", label: "Firebase Auth", status: "pending", detail: "In attesa" },
  { id: "playerProfile", label: "Profilo utente", status: "pending", detail: "In attesa" },
  { id: "gameData", label: "Dati di gioco", status: "pending", detail: "In attesa" },
  { id: "routing", label: "Routing", status: "pending", detail: "In attesa" },
];

const INITIAL_STATE: AppGameState = {
  user: null,
  player: null,
  progress: null,
  remoteConfig: null,
  events: [],
  playerShop: null,
  catalog: EMPTY_GAME_CATALOG,
  initialized: false,
  loading: false,
  error: null,
  lastRefreshAt: null,
};

@Injectable({ providedIn: "root" })
export class GameStateService {
  private readonly auth = inject(AuthService);
  private readonly themeState = inject(ThemeService);
  private readonly playerService = inject(PlayerService);
  private readonly eventService = inject(EventService);
  private readonly progressStore = inject(ProgressStoreService);
  private readonly shopService = inject(ShopService);
  private readonly itemService = inject(ItemService);
  private readonly remoteGameDataProvider = inject(RemoteGameDataProvider);
  private readonly mockGameDataProvider = inject(MockGameDataProvider);
  private readonly logger = inject(LoggerService);
  private readonly timeService = inject(TimeService);
  private lastLoadedUid: string | null = null;
  private loadVersion = 0;
  private bootstrapCurrentStep: BootstrapStepId = "theme";

  readonly bootstrapSteps = signal<BootstrapStep[]>(INITIAL_BOOTSTRAP_STEPS);

  readonly dataSourceMode = signal<GameDataSourceMode>(
    this.loadDataSourceMode(),
  );
  readonly isMockMode = computed(() => this.dataSourceMode() === "mock");
  readonly isRemoteMode = computed(() => this.dataSourceMode() === "remote");

  private readonly gameDataProvider = computed<GameDataProvider>(() =>
    this.isMockMode() ? this.mockGameDataProvider : this.remoteGameDataProvider,
  );

  readonly user$ = this.auth.user$;
  readonly player$ = this.playerService.player$;

  // 🔥 conversione Observable → Signal
  private readonly state = signal<AppGameState>(INITIAL_STATE);

  // 🎯 DERIVED STATE (signals)
  readonly user = computed(() => this.state().user);
  readonly player = computed(() => this.state().player);
  readonly events = computed(() => this.state().events);
  readonly shop = computed(() => this.flattenPlayerShop(this.progress().shop));
  readonly playerShop = computed(() => this.progress().shop);
  readonly catalog = computed(() => this.state().catalog);
  readonly remoteConfig = computed(() => this.state().remoteConfig);
  readonly initialized = computed(() => this.state().initialized);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly lastRefreshAt = computed(() => this.state().lastRefreshAt);
  readonly progress = this.progressStore.progress;

  readonly coins = computed(() => this.progress().coins);
  readonly gems = computed(() => this.progress().gems);
  readonly dusts = computed(
    () => this.progress().dust ?? DEFAULT_GAME_PROGRESS.dust,
  );
  readonly inventoryResources = computed(
    () => this.progress().inventory.resources,
  );
  readonly inventoryEquip = computed(() => this.progress().inventory.equip);
  readonly inventoryChestes = computed(() => this.progress().inventory.boxes);
  readonly inventoryHeroes = computed(() => this.progress().inventory.heroes);
  readonly currentHero = computed(() => {
    const inventory = this.progress().inventory;
    return (
      inventory.heroes.find((hero) => hero.id === inventory.selectedHeroId) ??
      inventory.heroes[0]
    );
  });

  readonly maxInventoryItemsPerCategory =
    PLAYER_STATE_CONFIG.maxInventoryItemsPerCategory;

  readonly displayName = computed(() => {
    const player = this.player();
    const nickname = player?.nickname?.trim();
    if (nickname) {
      return nickname;
    }

    return player?.profileId ?? this.user()?.displayName ?? "Giocatore";
  });

  constructor() {
    this.bootstrap();
  }

  setDataSourceMode(mode: GameDataSourceMode): void {
    this.logger.logDebug("DataSourceMode", mode);
    if (mode === this.dataSourceMode()) {
      return;
    }

    this.progressStore.setRemotePersistenceContext({
      enabled: mode === "remote",
      uid: this.user()?.uid ?? null,
    });
    this.dataSourceMode.set(mode);
    this.persistDataSourceMode(mode);
    void this.refresh();
  }

  toggleDataSourceMode(): void {
    this.setDataSourceMode(this.isMockMode() ? "remote" : "mock");
  }

  private loadDataSourceMode(): GameDataSourceMode {
    try {
      const value = localStorage.getItem(GAME_DATA_SOURCE_MODE_STORAGE_KEY);
      return value === "mock" || value === "remote"
        ? value
        : DEFAULT_GAME_DATA_SOURCE_MODE;
    } catch (error) {
      this.logger.logError("[GameState] data source mode load failed", error);
      return DEFAULT_GAME_DATA_SOURCE_MODE;
    }
  }

  private persistDataSourceMode(mode: GameDataSourceMode): void {
    try {
      localStorage.setItem(GAME_DATA_SOURCE_MODE_STORAGE_KEY, mode);
    } catch (error) {
      this.logger.logError(
        "[GameState] data source mode persist failed",
        error,
      );
    }
  }

  // 🚀 BOOTSTRAP GLOBALE
  private async bootstrap() {
    this.logger.logInfo("[GameState] bootstrap start");
    this.updateState({ loading: true, error: null });

    try {
      this.bootstrapCurrentStep = "theme";
      this.setBootstrapStep("theme", "pending", "Caricamento tema");
      this.themeState.initTheme();
      this.setBootstrapStep("theme", "success", "Completato");

      this.bootstrapCurrentStep = "serverTime";
      this.setBootstrapStep("serverTime", "pending", "Connessione a Firestore");
      const timeSynced = await this.awaitWithTimeout(
        this.timeService.sync(true),
        15_000,
        "Timeout durante la sincronizzazione dell'orario con Firestore.",
      );
      this.setBootstrapStep(
        "serverTime",
        timeSynced ? "success" : "error",
        timeSynced ? "Ricevuto" : (this.timeService.lastSyncError ?? "Sincronizzazione non riuscita"),
      );

      // 1️⃣ aspetta che Firebase Auth sia pronto
      this.bootstrapCurrentStep = "firebaseAuth";
      this.setBootstrapStep("firebaseAuth", "pending", "Lettura sessione");
      await firstValueFrom(
        this.auth.initialized$.pipe(
          filter((v) => v === true),
          timeout({
            first: 15_000,
            with: () => throwError(() => new Error("Timeout durante l'inizializzazione dell'autenticazione.")),
          }),
        ),
      );

      this.setBootstrapStep("firebaseAuth", "success", "Sessione ricevuta");
      const authError = this.auth.initializationError;
      this.setBootstrapStep(
        "playerProfile",
        authError ? "error" : "success",
        authError ?? "Profilo ricevuto",
      );
      this.logger.logInfo("[GameState] auth initialized");
      this.bindRealtime();
      this.logger.logInfo("[GameState] READY");
    } catch (error) {
      const message = this.errorMessage(error);
      this.logger.logError("[GameState] bootstrap failed", error);
      this.setBootstrapStep(this.bootstrapCurrentStep, "error", message);
      this.updateState({ initialized: true, loading: false, error: message });
    }
  }

  // 🔄 SYNC AUTOMATICO
  private bindRealtime() {
    this.logger.logInfo("[GameState] bind realtime");

    combineLatest([this.auth.user$, this.playerService.player$]).subscribe(
      async ([user, player]) => {
        this.updateState({ user, player, initialized: true });

        const uid = user?.uid ?? null;
        const authInitializationError = this.auth.initializationError;
        this.progressStore.setRemotePersistenceContext({
          enabled: this.isRemoteMode(),
          uid,
        });

        // Un'assenza di sessione e' uno stato valido: non tentare il preload
        // remoto (che richiede un utente autenticato) e completa comunque il
        // bootstrap, cosi' BootPage puo' inoltrare alla schermata di login.
        if (!user) {
          ++this.loadVersion;
          this.lastLoadedUid = null;
          this.updateState({
            loading: false,
            error: authInitializationError,
          });
          this.setBootstrapStep("gameData", "success", "Accesso richiesto");
          this.setBootstrapStep("routing", "success", "Pronto per l'accesso");
          return;
        }

        if (uid === this.lastLoadedUid) {
          return;
        }

        this.lastLoadedUid = uid;
        const currentLoadVersion = ++this.loadVersion;
        this.bootstrapCurrentStep = "gameData";
        this.setBootstrapStep("gameData", "pending", "Caricamento dati remoti");

        this.updateState({ loading: true, error: authInitializationError });

        try {
          const data = await this.loadSelectedProviderData(uid);

          // Scarta risultati obsoleti dovuti a race condition (logout/login rapidi o switch provider).
          if (currentLoadVersion !== this.loadVersion) {
            return;
          }

          this.updateState({
            ...data,
            error: authInitializationError ?? data.error,
            loading: false,
            lastRefreshAt: this.nowIso(),
          });
          this.setBootstrapStep(
            "gameData",
            data.error ? "error" : "success",
            data.error ?? "Ricevuti",
          );
          this.setBootstrapStep("routing", "success", "Pronto");
        } catch (error) {
          this.logger.logError("[GameState] preload failed", error);

          if (currentLoadVersion === this.loadVersion) {
            this.updateState({
              loading: false,
              error: this.errorMessage(error),
              initialized: true,
            });
            const message = this.errorMessage(error);
            this.setBootstrapStep("gameData", "error", message);
            this.setBootstrapStep("routing", "error", "Dati non disponibili");
          }
        }
      },
    );
  }

  // 🧠 UPDATE PARZIALE SICURO
  private updateState(partial: Partial<AppGameState>) {
    if (partial.progress) {
      this.progressStore.setProgress(partial.progress, { persistMode: "none" });
    }

    this.state.update((current) => ({
      ...current,
      ...partial,
    }));
  }

  getProgressSnapshot(): GameProgress {
    return this.progressStore.getProgressSnapshot();
  }

  mutateProgress(mutator: (progress: GameProgress) => GameProgress): void {
    this.progressStore.mutateProgress(mutator);
  }

  runProgressMutationBatch<T>(operation: () => T): T {
    return this.progressStore.runProgressMutationBatch(operation);
  }

  async persistProgressNow(): Promise<void> {
    await this.progressStore.persistProgressNow();
  }

  setProgress(progress: GameProgress): void {
    this.updateProgress(progress);
  }

  updateProgress(progress: GameProgress): void {
    this.progressStore.updateProgress(progress);
    this.updateState({ progress: this.progressStore.getProgressSnapshot() });
  }

  async resetUserProgress(): Promise<void> {
    this.logger.logDebug("[GameState] reset user progress", this.dataSourceMode());

    const progress = this.isMockMode()
      ? await this.mockGameDataProvider.loadProgress(this.user()?.uid ?? null)
      : normalizeGameProgress({
          ...DEFAULT_GAME_PROGRESS,
          lastUpdatedAt: new Date().toISOString(),
        });

    this.progressStore.setRemotePersistenceContext({
      enabled: this.isRemoteMode(),
      uid: this.user()?.uid ?? null,
    });
    this.progressStore.setProgress(progress, { persistMode: "none" });
    this.updateState({ progress });

    if (this.isRemoteMode()) {
      await this.progressStore.resetProgressIfRemote(progress);
    }
  }

  // 🔄 REFRESH MANUALE (eventi + shop)
  async refresh() {
    this.logger.logDebug("[GameState] refresh");
    this.updateState({ loading: true, error: null });

    const currentLoadVersion = ++this.loadVersion;

    try {
      await this.timeService.sync(true);

      const user = await firstValueFrom(this.auth.user$);
      const uid = user?.uid ?? null;
      this.progressStore.setRemotePersistenceContext({
        enabled: this.isRemoteMode(),
        uid,
      });
      const data = await this.loadSelectedProviderData(uid, true);

      if (currentLoadVersion !== this.loadVersion) {
        return;
      }

      this.updateState({
        initialized: true,
        loading: false,
        lastRefreshAt: this.nowIso(),
        ...data,
      });
    } catch (error) {
      this.logger.logError("[GameState] refresh failed", error);

      if (currentLoadVersion !== this.loadVersion) {
        return;
      }

      this.updateState({
        initialized: true,
        loading: false,
        error: this.errorMessage(error),
      });
    }
  }

  private async loadSelectedProviderData(
    uid: string | null,
    forceRefresh = false,
  ): Promise<{
    progress: GameProgress;
    remoteConfig: RemoteConfigDocument;
    events: GameEvent[];
    shop: ShopItem[];
    catalog: GameCatalog;
    error: string | null;
  }> {
    const provider = this.gameDataProvider();
    const current = this.state();
    const failures: string[] = [];

    const [loadedProgress, remoteConfig, events, catalog] = await Promise.all([
      this.withFallback(
        "progress",
        provider.loadProgress(uid),
        this.progress(),
        failures,
      ),
      this.withFallback(
        "remoteConfig",
        provider.loadConfig(),
        current.remoteConfig ?? DEFAULT_REMOTE_CONFIG,
        failures,
      ),
      this.withFallback(
        "events",
        provider.loadEvents(forceRefresh),
        current.events,
        failures,
      ),
      this.withFallback(
        "catalog",
        provider.loadCatalog(forceRefresh),
        current.catalog ?? EMPTY_GAME_CATALOG,
        failures,
      ),
    ]);

    const { progress, regenerated, deferred } = this.ensurePlayerShop(loadedProgress, catalog);
    const shop = this.flattenPlayerShop(progress.shop);

    if (deferred) {
      this.logger.logWarning(
        "[GameStateService] player shop regeneration deferred: catalog not ready",
      );
    }

    if (regenerated && !deferred && this.isRemoteMode() && uid) {
      await this.progressStore.persistProgressIfRemote(progress, { awaitSave: true });
    }

    this.logger.logDebug(
      "[GameStateService] loadSelectedProviderData -> progress",
      progress,
    );
    this.logger.logDebug(
      "[GameStateService] loadSelectedProviderData -> remoteConfig",
      remoteConfig,
    );
    this.logger.logDebug(
      "[GameStateService] loadSelectedProviderData -> events",
      events,
    );
    this.logger.logDebug(
      "[GameStateService] loadSelectedProviderData -> shop",
      shop,
    );
    this.logger.logDebug(
      "[GameStateService] loadSelectedProviderData -> catalog",
      catalog,
    );
    return {
      progress,
      remoteConfig,
      events,
      shop,
      catalog,
      error: failures.length
        ? `Dati caricati parzialmente: ${failures.join(", ")}`
        : null,
    };
  }

  private ensurePlayerShop(
    progress: GameProgress,
    catalog: GameCatalog,
  ): { progress: GameProgress; regenerated: boolean; deferred: boolean } {
    const now = this.timeService.nowDate();
    const currentShop = progress.shop ?? DEFAULT_SHOP;

    if (
      this.needsPlayerShopRegeneration(currentShop, now) &&
      !this.isCatalogReadyForShopGeneration(catalog)
    ) {
      return {
        progress,
        regenerated: false,
        deferred: true,
      };
    }

    let regenerated = false;

    const daily = this.ensureTimeShop(currentShop.daily, "daily", progress.level, catalog, now, {
      heroCount: 1,
      equipCount: 3,
      resourceCount: 3,
      boxCount: 1,
    });
    const weekly = this.ensureTimeShop(currentShop.weekly, "weekly", progress.level + 2, catalog, now, {
      heroCount: 2,
      equipCount: 5,
      resourceCount: 3,
      boxCount: 2,
    });
    const season = this.ensureTimeShop(currentShop.season, "season", progress.level + 10, catalog, now, {
      heroCount: 3,
      equipCount: 6,
      resourceCount: 4,
      boxCount: 3,
    });

    regenerated = daily.regenerated || weekly.regenerated || season.regenerated;

    if (!regenerated) {
      return { progress, regenerated, deferred: false };
    }

    return {
      progress: {
        ...progress,
        shop: {
          daily: daily.shop,
          weekly: weekly.shop,
          season: season.shop,
        },
        lastUpdatedAt: now.toISOString(),
      },
      regenerated,
      deferred: false,
    };
  }

  private ensureTimeShop(
    shop: TimeShop | undefined,
    period: keyof PlayerShop,
    playerLevel: number,
    catalog: GameCatalog,
    now: Date,
    counts: { heroCount: number; equipCount: number; resourceCount: number; boxCount: number },
  ): { shop: TimeShop; regenerated: boolean } {
    if (shop?.item?.length && !this.isShopExpired(shop, now)) {
      return { shop, regenerated: false };
    }

    const availability = this.createShopAvailability(period, now);
    return {
      shop: {
        availability,
        item: buildShopItemsByProgress({
          level: playerLevel,
          ...counts,
          heroItems: catalog.heroes,
          equipItems: catalog.equip,
          resourceItems: catalog.resources,
          chestItems: catalog.boxes,
          idSuffix: `${period}-${availability.startAt}`.replace(/[^a-zA-Z0-9]/g, ""),
        }).map((item) => ({ ...item, availability })),
      },
      regenerated: true,
    };
  }

  private isCatalogReadyForShopGeneration(catalog: GameCatalog): boolean {
    return (
      catalog.heroes.length > 0 &&
      catalog.equip.length > 0 &&
      catalog.resources.length > 0 &&
      catalog.boxes.length > 0
    );
  }

  private isPlayerShopUsable(shop: PlayerShop | undefined): boolean {
    return Boolean(
      shop &&
      this.isTimeShopUsable(shop.daily) &&
      this.isTimeShopUsable(shop.weekly) &&
      this.isTimeShopUsable(shop.season),
    );
  }

  private isTimeShopUsable(shop: TimeShop | undefined): boolean {
    return Boolean(
      shop?.availability?.startAt &&
      shop?.availability?.endAt &&
      Array.isArray(shop?.item) &&
      shop.item.length > 0,
    );
  }

  private needsPlayerShopRegeneration(shop: PlayerShop | undefined, now: Date): boolean {
    if (!shop) {
      return true;
    }

    return (
      !this.isTimeShopUsable(shop.daily) ||
      !this.isTimeShopUsable(shop.weekly) ||
      !this.isTimeShopUsable(shop.season) ||
      this.isShopExpired(shop.daily, now) ||
      this.isShopExpired(shop.weekly, now) ||
      this.isShopExpired(shop.season, now)
    );
  }

  private isShopExpired(shop: TimeShop, now: Date): boolean {
    const endAt = shop.availability?.endAt ? new Date(shop.availability.endAt) : null;
    return !shop.availability?.startAt || !endAt || Number.isNaN(endAt.getTime()) || now >= endAt;
  }

  private createShopAvailability(period: keyof PlayerShop, now: Date): AvailabilityWindow {
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);

    if (period === "daily") {
      end.setUTCDate(end.getUTCDate() + 1);
    } else if (period === "weekly") {
      const day = start.getUTCDay() || 7;
      start.setUTCDate(start.getUTCDate() - day + 1);
      end.setTime(start.getTime());
      end.setUTCDate(end.getUTCDate() + 7);
    } else {
      const seasonMonth = Math.floor(start.getUTCMonth() / 3) * 3;
      start.setUTCMonth(seasonMonth, 1);
      end.setTime(start.getTime());
      end.setUTCMonth(end.getUTCMonth() + 3);
    }

    return { startAt: start.toISOString(), endAt: end.toISOString() };
  }

  private flattenPlayerShop(shop: PlayerShop | undefined): ShopItem[] {
    return [
      ...(shop?.daily?.item ?? []),
      ...(shop?.weekly?.item ?? []),
      ...(shop?.season?.item ?? []),
    ];
  }

  private async withFallback<T>(
    label: string,
    promise: Promise<T>,
    fallback: T,
    failures: string[],
  ): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      this.logger.logError(`[GameState] ${label} load failed`, error);
      failures.push(label);
      return fallback;
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return "Impossibile caricare lo stato di gioco.";
  }

  private awaitWithTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
    message: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
      operation.then(
        (result) => {
          window.clearTimeout(timer);
          resolve(result);
        },
        (error: unknown) => {
          window.clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  private setBootstrapStep(
    id: BootstrapStepId,
    status: BootstrapStepStatus,
    detail: string,
  ): void {
    this.bootstrapSteps.update((steps) =>
      steps.map((step) => step.id === id ? { ...step, status, detail } : step),
    );
  }

  private nowIso(): string {
    return new Date().toISOString();
  }

  updateInventory(partial: Partial<GameProgress["inventory"]>): void {
    const currentProgress = this.progress();
    const inventory = { ...currentProgress.inventory, ...partial };
    this.updateProgress({
      ...currentProgress,
      inventory,
      lastUpdatedAt: new Date().toISOString(),
    });
  }

  // 🧹 RESET (logout / cambio utente)
  reset() {
    this.logger.logInfo("[GameState] reset");
    this.progressStore.clearProgress({ removeLocalSnapshot: true });
    this.progressStore.setRemotePersistenceContext({
      enabled: false,
      uid: null,
    });
    this.updateState(INITIAL_STATE);
    this.eventService.clearCache();
    this.shopService.clearCache();
    this.itemService.clearCache();
  }
}
