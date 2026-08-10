import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';

import { combineLatest } from 'rxjs';
import { filter, map, take, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth/auth.service';
import { LoggerService } from '../services/infrastructure/logging/logger.service';
import { GameStateService } from '../services/state/game-state.service';
import { DirectRouteAccessService } from '../services/app/navigation/direct-route-access.service';

export const AuthGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const logger = inject(LoggerService);
  const gameState = inject(GameStateService);
  const directRouteAccess = inject(DirectRouteAccessService);

  logger.logDebug('AuthGuard: Checking authentication status...');

  if (!gameState.initialized()) {
    if (directRouteAccess.enabled()) {
      return combineLatest([toObservable(gameState.initialized), auth.user$]).pipe(
        tap(([initialized, user]) =>
          logger.logDebug('[AuthGuard][wait-init] emission:', { initialized, user }),
        ),
        filter(([initialized]) => initialized),
        take(1),
        map(([_initialized, user]) => user ? true : router.createUrlTree(['/login'])),
      );
    }

    logger.logDebug('[AuthGuard] game state non inizializzato, redirect → /boot');
    return router.createUrlTree(['/boot']);
  }
  return auth.user$.pipe(
    tap(user => logger.logDebug('[AuthGuard][tap] emission:', user)),
    take(1),
    map(user => {
      logger.logDebug('[AuthGuard][map] final user:', user);
      return user
        ? true
        : router.createUrlTree(['/login']);
    })
  );
};
