import { Injectable, computed, inject, signal } from '@angular/core';
import { App as CapacitorApp } from '@capacitor/app';

import { DEFAULT_GAME_PROGRESS, GameProgress } from '../../models/remote/progress.models';
import { normalizeGameProgress, serializeGameProgress } from '../../models/remote/progress.mapper';
import { ProgressService } from '../data/remote/progress.service';
import { LoggerService } from '../infrastructure/logging/logger.service';

type ProgressPersistMode = 'deferred' | 'immediate' | 'none';

interface ProgressUpdateOptions {
  persistMode?: ProgressPersistMode;
}

interface ProgressMutationBatchOptions {
  saveOnComplete?: boolean;
  persistMode?: Exclude<ProgressPersistMode, 'none'>;
}

const LOCAL_PROGRESS_SNAPSHOT_KEY_PREFIX = 'progressSnapshot:';
const REMOTE_SAVE_DEBOUNCE_MS = 8_000;
const REMOTE_SAVE_RETRY_MS = 15_000;

@Injectable({ providedIn: 'root' })
export class ProgressStoreService {
  private readonly progressService = inject(ProgressService);
  private readonly logger = inject(LoggerService);

  private readonly progressState = signal<GameProgress | null>(null);
  private readonly remotePersistenceEnabled = signal(true);
  private readonly remotePersistenceUid = signal<string | null>(null);
  private readonly dirtySinceLastRemoteSave = signal(false);
  private progressUpdateBatchDepth = 0;
  private progressSavePending = false;
  private pendingPersistMode: Exclude<ProgressPersistMode, 'none'> = 'deferred';
  private deferredSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private activeSavePromise: Promise<void> | null = null;
  private lifecycleBound = false;

  readonly progress = computed(() => this.progressState() ?? DEFAULT_GAME_PROGRESS);
  readonly hasPendingRemoteChanges = computed(() => this.dirtySinceLastRemoteSave());

  constructor() {
    this.bindPersistenceLifecycle();
  }

  setRemotePersistenceContext(options: { enabled: boolean; uid: string | null }): void {
    const previousUid = this.remotePersistenceUid();
    const uidChanged = previousUid !== options.uid;

    this.remotePersistenceEnabled.set(options.enabled);
    this.remotePersistenceUid.set(options.uid);

    if (uidChanged) {
      this.clearScheduledRemoteSave();
      this.clearRetryTimer();
      this.progressSavePending = false;
      this.pendingPersistMode = 'deferred';
      this.hydrateFromLocalSnapshot(options.uid);
    }

    if (!options.enabled || !options.uid) {
      return;
    }

    if (this.dirtySinceLastRemoteSave()) {
      this.scheduleDeferredRemoteSave();
    }
  }

  setRemotePersistenceEnabled(enabled: boolean): void {
    this.remotePersistenceEnabled.set(enabled);
  }

  getProgressSnapshot(): GameProgress {
    return this.progress();
  }

  setProgress(progress: GameProgress, options: ProgressUpdateOptions = {}): void {
    this.updateProgress(progress, options);
  }

  updateProgress(progress: GameProgress, options: ProgressUpdateOptions = {}): void {
    const persistMode = options.persistMode ?? 'deferred';
    const nextProgress: GameProgress = {
      ...progress,
      lastUpdatedAt: progress.lastUpdatedAt ?? new Date().toISOString(),
    };

    this.progressState.set(nextProgress);
    this.persistLocalSnapshot(nextProgress);

    if (persistMode === 'none') {
      return;
    }

    this.markRemoteProgressDirty();

    if (this.progressUpdateBatchDepth > 0) {
      this.progressSavePending = true;
      this.pendingPersistMode = this.mergePersistModes(this.pendingPersistMode, persistMode);
      return;
    }

    if (persistMode === 'immediate') {
      void this.persistProgressNow().catch(() => undefined);
      return;
    }

    this.scheduleDeferredRemoteSave();
  }

  mutateProgress(mutator: (progress: GameProgress) => GameProgress, options: ProgressUpdateOptions = {}): void {
    this.updateProgress(mutator(this.progress()), options);
  }

  runProgressMutationBatch<T>(operation: () => T, options: ProgressMutationBatchOptions = {}): T {
    const saveOnComplete = options.saveOnComplete ?? true;
    const persistMode = options.persistMode ?? 'deferred';
    this.progressUpdateBatchDepth += 1;

    try {
      return operation();
    } finally {
      this.progressUpdateBatchDepth = Math.max(this.progressUpdateBatchDepth - 1, 0);

      if (this.progressUpdateBatchDepth === 0 && this.progressSavePending) {
        this.progressSavePending = false;
        const nextPersistMode = this.pendingPersistMode;
        this.pendingPersistMode = 'deferred';

        if (saveOnComplete) {
          if (nextPersistMode === 'immediate' || persistMode === 'immediate') {
            void this.persistProgressNow().catch(() => undefined);
          } else {
            this.scheduleDeferredRemoteSave();
          }
        }
      }
    }
  }

  async persistProgressNow(): Promise<void> {
    await this.persistProgressIfRemote(this.progress(), { awaitSave: true });
  }

  async retryPendingPersistenceNow(): Promise<void> {
    if (!this.dirtySinceLastRemoteSave()) {
      return;
    }

    await this.persistProgressNow();
  }

  async resetProgressIfRemote(progress: GameProgress = this.progress()): Promise<void> {
    const uid = this.remotePersistenceUid();
    if (!this.remotePersistenceEnabled() || !uid) {
      return;
    }

    this.clearScheduledRemoteSave();
    this.clearRetryTimer();

    await this.progressService.resetUserProgress(uid, progress).catch((error) => {
      this.logger.logError('[ProgressStore] progress reset failed', error);
      throw error;
    });

    this.progressState.set(progress);
    this.persistLocalSnapshot(progress);
    this.dirtySinceLastRemoteSave.set(false);
  }

  clearProgress(options: { removeLocalSnapshot?: boolean } = {}): void {
    this.progressState.set(null);
    this.progressSavePending = false;
    this.pendingPersistMode = 'deferred';
    this.dirtySinceLastRemoteSave.set(false);
    this.clearScheduledRemoteSave();
    this.clearRetryTimer();

    if (options.removeLocalSnapshot) {
      this.removeLocalSnapshot(this.remotePersistenceUid());
    }
  }

  persistProgressIfRemote(progress?: GameProgress): void;
  persistProgressIfRemote(progress: GameProgress, options: { awaitSave: true }): Promise<void>;
  persistProgressIfRemote(progress: GameProgress = this.progress(), options?: { awaitSave?: boolean }): void | Promise<void> {
    const uid = this.remotePersistenceUid();
    if (!this.remotePersistenceEnabled() || !uid) {
      return options?.awaitSave ? Promise.resolve() : undefined;
    }

    this.markRemoteProgressDirty();
    const saveOperation = this.persistRemoteSnapshot(uid, progress);

    if (options?.awaitSave) {
      return saveOperation;
    }

    void saveOperation.catch(() => undefined);
    return undefined;
  }

  private markRemoteProgressDirty(): void {
    if (!this.remotePersistenceEnabled() || !this.remotePersistenceUid()) {
      return;
    }

    this.dirtySinceLastRemoteSave.set(true);
  }

  private async persistRemoteSnapshot(uid: string, progress: GameProgress): Promise<void> {
    if (this.activeSavePromise) {
      this.progressSavePending = true;
      this.pendingPersistMode = this.mergePersistModes(this.pendingPersistMode, 'immediate');
      return this.activeSavePromise;
    }

    this.clearScheduledRemoteSave();
    this.clearRetryTimer();

    const snapshot = normalizeGameProgress(progress);
    const snapshotSignature = this.createSnapshotSignature(snapshot);

    this.activeSavePromise = this.progressService.saveUserProgress(uid, snapshot)
      .then(() => {
        const currentUid = this.remotePersistenceUid();
        const currentSignature = this.createSnapshotSignature(this.progress());

        if (currentUid === uid && currentSignature === snapshotSignature) {
          this.dirtySinceLastRemoteSave.set(false);
        } else {
          this.dirtySinceLastRemoteSave.set(true);
          this.progressSavePending = true;
          this.pendingPersistMode = this.mergePersistModes(this.pendingPersistMode, 'deferred');
        }
      })
      .catch((error) => {
        this.logger.logError('[ProgressStore] progress save failed', error);
        this.dirtySinceLastRemoteSave.set(true);
        this.progressSavePending = true;
        this.pendingPersistMode = this.mergePersistModes(this.pendingPersistMode, 'deferred');
        this.scheduleRetry();
        throw error;
      })
      .finally(() => {
        this.activeSavePromise = null;

        if (this.progressSavePending && this.remotePersistenceEnabled() && this.remotePersistenceUid()) {
          const nextMode = this.pendingPersistMode;
          this.progressSavePending = false;
          this.pendingPersistMode = 'deferred';

          if (nextMode === 'immediate') {
            void this.persistProgressNow().catch(() => undefined);
          } else {
            this.scheduleDeferredRemoteSave();
          }
        }
      });

    return this.activeSavePromise;
  }

  private scheduleDeferredRemoteSave(): void {
    if (!this.remotePersistenceEnabled() || !this.remotePersistenceUid()) {
      return;
    }

    if (this.activeSavePromise) {
      this.progressSavePending = true;
      this.pendingPersistMode = this.mergePersistModes(this.pendingPersistMode, 'deferred');
      return;
    }

    this.clearScheduledRemoteSave();
    this.deferredSaveTimer = setTimeout(() => {
      this.deferredSaveTimer = null;
      void this.persistProgressNow().catch(() => undefined);
    }, REMOTE_SAVE_DEBOUNCE_MS);
  }

  private scheduleRetry(): void {
    if (!this.remotePersistenceEnabled() || !this.remotePersistenceUid()) {
      return;
    }

    this.clearRetryTimer();
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (!this.dirtySinceLastRemoteSave()) {
        return;
      }

      void this.persistProgressNow().catch(() => undefined);
    }, REMOTE_SAVE_RETRY_MS);
  }

  private bindPersistenceLifecycle(): void {
    if (this.lifecycleBound || typeof window === 'undefined') {
      return;
    }

    this.lifecycleBound = true;

    window.addEventListener('online', () => {
      void this.retryPendingPersistenceNow().catch(() => undefined);
    });

    window.addEventListener('focus', () => {
      void this.retryPendingPersistenceNow().catch(() => undefined);
    });

    window.addEventListener('beforeunload', () => {
      void this.persistProgressNow().catch(() => undefined);
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          void this.persistProgressNow().catch(() => undefined);
          return;
        }

        void this.retryPendingPersistenceNow().catch(() => undefined);
      });
    }

    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void this.retryPendingPersistenceNow().catch(() => undefined);
        return;
      }

      void this.persistProgressNow().catch(() => undefined);
    }).catch((error) => {
      this.logger.logWarning('[ProgressStore] appStateChange listener unavailable', error);
    });
  }

  private hydrateFromLocalSnapshot(uid: string | null): void {
    const snapshot = this.readLocalSnapshot(uid);
    if (!snapshot) {
      this.progressState.set(null);
      return;
    }

    this.progressState.set(snapshot);
  }

  private persistLocalSnapshot(progress: GameProgress): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(
        this.localSnapshotKey(this.remotePersistenceUid()),
        JSON.stringify(serializeGameProgress(progress)),
      );
    } catch (error) {
      this.logger.logWarning('[ProgressStore] local progress snapshot persist failed', error);
    }
  }

  private readLocalSnapshot(uid: string | null): GameProgress | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const raw = localStorage.getItem(this.localSnapshotKey(uid));
      if (!raw) {
        return null;
      }

      return normalizeGameProgress(JSON.parse(raw) as Partial<GameProgress>);
    } catch (error) {
      this.logger.logWarning('[ProgressStore] local progress snapshot read failed', error);
      return null;
    }
  }

  private removeLocalSnapshot(uid: string | null): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem(this.localSnapshotKey(uid));
    } catch (error) {
      this.logger.logWarning('[ProgressStore] local progress snapshot delete failed', error);
    }
  }

  private localSnapshotKey(uid: string | null): string {
    return `${LOCAL_PROGRESS_SNAPSHOT_KEY_PREFIX}${uid ?? 'guest'}`;
  }

  private createSnapshotSignature(progress: GameProgress): string {
    return JSON.stringify(serializeGameProgress(progress));
  }

  private mergePersistModes(
    current: Exclude<ProgressPersistMode, 'none'>,
    next: ProgressPersistMode,
  ): Exclude<ProgressPersistMode, 'none'> {
    if (next === 'immediate') {
      return 'immediate';
    }

    return current;
  }

  private clearScheduledRemoteSave(): void {
    if (this.deferredSaveTimer) {
      clearTimeout(this.deferredSaveTimer);
      this.deferredSaveTimer = null;
    }
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
}
