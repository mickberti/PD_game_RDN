import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { LoggerService } from '../../infrastructure/logging/logger.service';
import { DEFAULT_GAME_PROGRESS, GameProgress } from '../../../models/remote/progress.models';
import { normalizeGameProgress, serializeGameProgress } from '../../../models/remote/progress.mapper';



@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly firestore = inject(Firestore);
  private readonly logger = inject(LoggerService);

  async loadUserProgress(uid: string): Promise<GameProgress> {
	this.logger.logDebug('[ProgressService] : Loading progress for user :', uid);
	
    const ref = doc(this.firestore, `users/${uid}/private/progress`);
    const snapshot = await getDoc(ref);

	this.logger.logDebug('[ProgressService] : Loading progress for user OK :', snapshot);
	
    if (!snapshot.exists()) {
	  this.logger.logWarning('[ProgressService] : Progress document does not exist for user, using default progress');    
	  return normalizeGameProgress(DEFAULT_GAME_PROGRESS);
    }

    return normalizeGameProgress(snapshot.data() as Partial<GameProgress>);
  }

  async saveUserProgress(uid: string, progress: GameProgress): Promise<void> {
	this.logger.logDebug('[ProgressService] : Saving progress for user :', uid, progress);
    const ref = doc(this.firestore, `users/${uid}/private/progress`);

    await setDoc(ref, {
      ...serializeGameProgress(progress),
      lastUpdatedAt: new Date().toISOString()
    }, { merge: true });
  }

  async resetUserProgress(uid: string, progress: GameProgress): Promise<void> {
	this.logger.logDebug('[ProgressService] : Resetting progress for user :', uid, progress);
    const ref = doc(this.firestore, `users/${uid}/private/progress`);

    await setDoc(ref, {
      ...serializeGameProgress(progress),
      lastUpdatedAt: new Date().toISOString()
    }, { merge: false });
  }
}
