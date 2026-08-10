import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, Timestamp, serverTimestamp, setDoc } from '@angular/fire/firestore';

import { LoggerService } from '../infrastructure/logging/logger.service';

@Injectable({ providedIn: 'root' })
export class TimeService {
  private readonly firestore = inject(Firestore);
  private readonly logger = inject(LoggerService);

  private offset = 0;
  private lastSyncAt = 0;
  private syncPromise: Promise<boolean> | null = null;
  private lastSyncErrorValue: string | null = null;

  get lastSyncError(): string | null {
    return this.lastSyncErrorValue;
  }

  async sync(force = false): Promise<boolean> {
	this.logger.logDebug('[TimeService] sync called with force =', force);
    const elapsedFromLastSync = Date.now() - this.lastSyncAt;
    const syncIntervalMs = 60_000;

    if (!force && this.lastSyncAt > 0 && elapsedFromLastSync < syncIntervalMs) {
      return this.lastSyncErrorValue === null;
    }

    if (this.syncPromise) {
      return this.syncPromise;
    }

    this.syncPromise = this.runSync();

    try {
      return await this.syncPromise;
    } finally {
      this.syncPromise = null;
    }
  }

  now(): number {
    return Date.now() + this.offset;
  }

  nowDate(): Date {
    return new Date(this.now());
  }

  setupAutoSync(): void {
	this.logger.logDebug('[TimeService] Setting up auto sync on visibility change and window focus');
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const refreshIfNeeded = () => {
      void this.sync();
    };

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        refreshIfNeeded();
      }
    });

    window.addEventListener('focus', refreshIfNeeded);
  }

  private async runSync(): Promise<boolean> {
    const start = Date.now();

    try {
	  const ref = doc(this.firestore, 'meta/time');
	  
	  await setDoc(ref, {
	    now: serverTimestamp()
	  });

	  const snap = await getDoc(ref);
	  
	  this.logger.logInfo('[TimeService] sync snap received', snap);
	  
      const end = Date.now();
      const data = snap.data();
      const now = data?.['now'];

      if (!(now instanceof Timestamp)) {
        this.logger.logWarning('[TimeService] Invalid time payload in meta/time document');
        this.lastSyncErrorValue = 'Il server non ha restituito un orario valido.';
        return false;
      }

      const serverTime = now.toDate().getTime();
      const latency = (end - start) / 2;

      this.offset = serverTime + latency - end;
      this.lastSyncAt = end;
      this.lastSyncErrorValue = null;

      this.logger.logInfo('[TimeService] offset updated', this.offset);
      return true;
    } catch (error) {
      this.logger.logError('[TimeService] sync failed', error);
      this.lastSyncErrorValue = error instanceof Error && error.message
        ? error.message
        : 'Errore durante la sincronizzazione dell\'orario con Firestore.';
      return false;
    }
  }
}
