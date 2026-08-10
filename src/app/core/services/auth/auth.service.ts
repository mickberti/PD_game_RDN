import { Injectable, inject } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  User,
  authState,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from '@angular/fire/auth';

import {
  BehaviorSubject,
  Observable,
  map,
  tap
} from 'rxjs';


import { PlayerService } from './player.service';

import { environment } from '../../../../environments/environment';
import { LoggerService } from '../infrastructure/logging/logger.service';
import { AuthUser } from '../../models/auth/auth-user.model';


@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly playerService = inject(PlayerService);
  private readonly logger = inject(LoggerService);

  private readonly provider = new GoogleAuthProvider();
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly initializedSubject = new BehaviorSubject<boolean>(false);
  private readonly initializationErrorSubject = new BehaviorSubject<string | null>(null);
  
  readonly loading$ = this.loadingSubject.asObservable();
  readonly initialized$ = this.initializedSubject.asObservable();

  get initializationError(): string | null {
    return this.initializationErrorSubject.value;
  }

  initialized = false;
  
  // 🔥 Firebase user google raw
  readonly firebaseUser$: Observable<User | null> = authState(this.auth);

  // 🔥 User google mappato
  readonly user$: Observable<AuthUser | null> = this.firebaseUser$.pipe(
    map((user) => (user ? this.mapUser(user) : null))
  );

  constructor() {
    this.initAuthListener();
  }

  // 🧠 CORE: gestisce reload + login automatico
  private initAuthListener() {
    this.firebaseUser$
      .pipe(
        tap(async (user) => {
          this.initializationErrorSubject.next(null);
          if (user) {
            // 🔥 carica player da Firestore
			this.logger.logInfo('[AuthService] : User logged in, loading player data for uid:', user.uid);
            try {
              await this.playerService.loadPlayer(user.uid, this.mapUser(user));
            } catch (error) {
              const message = error instanceof Error && error.message
                ? error.message
                : 'Impossibile caricare il profilo utente da Firestore.';
              this.logger.logError('[AuthService] : Player initialization failed', error);
              this.initializationErrorSubject.next(message);
              this.playerService.clear();
            } finally {
              // Non lasciare mai la boot page in attesa se Firestore fallisce.
              this.initializedSubject.next(true);
            }
          } else {
            this.playerService.clear();
          }

          // segnala che auth è pronta
		  this.logger.logInfo('[AuthService] : Auth state initialized');
		  // segnala che auth è pronta
		  this.initializedSubject.next(true);
        })
      )
      .subscribe();
  }

  // 🔐 LOGIN
  async signInWithGoogle(): Promise<void> {
    this.loadingSubject.next(true);

    try {
      const isBrowser =
        typeof window !== 'undefined' &&
        window.matchMedia('(display-mode: browser)').matches && environment.signInWithPopup;

      if (isBrowser) {
		this.logger.logInfo('[AuthService] : Detected browser environment, using signInWithPopup');
        await signInWithPopup(this.auth, this.provider);
      } else {
		this.logger.logInfo('[AuthService] : Detected non-browser environment, using signInWithRedirect');
        await signInWithRedirect(this.auth, this.provider);
      }
    } finally {
		this.logger.logInfo('[AuthService] : Sign-in process completed, setting loading to false');
      this.loadingSubject.next(false);
    }
  }

  async handleRedirectResult(): Promise<void> {
    try {
		if(environment.enableCapacitorSocialLogin) {
			this.logger.logInfo('[AuthService] : Capacitor social login enabled, skipping redirect result handling');

			
		}else{
			this.logger.logInfo('[AuthService] : Handling redirect result');
			  const result = await getRedirectResult(this.auth);

			  this.logger.logInfo('[AuthService] : Redirect result obtained', result);
			  
			  if (result?.user) {
			    this.logger.logInfo('[AuthService] : Redirect sign-in successful for uid:', result.user.uid);
			  }
		}

    } catch (err) {
      this.logger.logError('[AuthService] : Error handling redirect result', err);
    }
  }
  
  // 🚪 LOGOUT
  async logout(): Promise<void> {
	this.logger.logInfo('[AuthService] : Logging out user');
    await signOut(this.auth);
    this.playerService.clear();
  }


  // 🧠 mapping
  private mapUser(user: User): AuthUser {
	this.logger.logInfo('[AuthService] : Mapping Firebase User to AuthUser for uid:', user.uid);
    return {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL
    };
  }
}
