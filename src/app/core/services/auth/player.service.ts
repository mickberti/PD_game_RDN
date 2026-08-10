import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp
} from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { LoggerService } from '../infrastructure/logging/logger.service';
import { AuthUser } from '../../models/auth/auth-user.model';
import { PlayerProfile } from '../../models/auth/player-profile.model';



@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly firestore = inject(Firestore);
  private readonly logger = inject(LoggerService);
  
  private playerSubject = new BehaviorSubject<PlayerProfile | null>(null);
  private playerLoadedSubject = new BehaviorSubject<boolean>(false);

  player$ = this.playerSubject.asObservable();
  playerLoaded$ = this.playerLoadedSubject.asObservable();


  async loadPlayer(uid: string, authUser?: AuthUser | null) {
    this.playerLoadedSubject.next(false);
	this.logger.logDebug('[PlayerService] : Loading player data for uid :', uid);
    try {
      const ref = doc(this.firestore, 'users', uid);
      const snap = await getDoc(ref);

	  this.logger.logDebug('[PlayerService] : Loading player data for uid OK :', snap);
      if (snap.exists()) {
        const profile = this.mapProfile(snap.data(), authUser);
        this.playerSubject.next(profile);

        if (!snap.data()['profileId'] || !snap.data()['createdAt']) {
          await setDoc(ref, {
            profileId: profile.profileId,
            createdAt: snap.data()['createdAt'] ?? serverTimestamp()
          }, { merge: true });
        }
      } else {
        const profile = this.createDefaultProfile(authUser);
        await setDoc(ref, {
          ...profile,
          createdAt: serverTimestamp()
        }, { merge: true });
        this.playerSubject.next({
          ...profile,
          createdAt: null
        });
      }
    } finally {
      this.playerLoadedSubject.next(true);
    }
  }

  async updateProfile(uid: string, payload: Pick<PlayerProfile, 'role' | 'nickname' | 'bannerUrl' | 'imageUrl'>): Promise<void> {
    const ref = doc(this.firestore, 'users', uid);
    await setDoc(ref, payload, { merge: true });

    const current = this.playerSubject.value;
    if (current) {
      this.playerSubject.next({
        ...current,
        ...payload
      });
    }
  }

  get player(): PlayerProfile | null {
    return this.playerSubject.value;
  }

  clear() {
    this.playerSubject.next(null);
    this.playerLoadedSubject.next(true);
  }

  private createDefaultProfile(authUser: AuthUser | null | undefined): Omit<PlayerProfile, 'createdAt'> {
    return {
      role: 'user',
      profileId: doc(collection(this.firestore, 'userProfiles')).id,
      nickname: '',
      bannerUrl: '',
      imageUrl: authUser?.photoURL ?? ''
    };
  }

  private mapProfile(data: Record<string, unknown>, authUser?: AuthUser | null): PlayerProfile {
    return {
      role: typeof data['role'] === 'string' ? data['role'] : 'user',
      profileId: typeof data['profileId'] === 'string'
        ? data['profileId']
        : doc(collection(this.firestore, 'userProfiles')).id,
      createdAt: data['createdAt'] instanceof Timestamp ? data['createdAt'] : null,
      nickname: typeof data['nickname'] === 'string'
        ? data['nickname']
        : '',
      bannerUrl: typeof data['bannerUrl'] === 'string' ? data['bannerUrl'] : '',
      imageUrl: typeof data['imageUrl'] === 'string'
        ? data['imageUrl']
        : (authUser?.photoURL ?? '')
    };
  }
}
