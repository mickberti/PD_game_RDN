import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';

import { filter, map, take, tap } from 'rxjs/operators';

import { combineLatest } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';
import { PlayerService } from '../services/auth/player.service';
import { LoggerService } from '../services/infrastructure/logging/logger.service';
import { GameStateService } from '../services/state/game-state.service';
import { DirectRouteAccessService } from '../services/app/navigation/direct-route-access.service';

export const AdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const playerService = inject(PlayerService);
  const router = inject(Router);
  const logger = inject(LoggerService);
  const gameState = inject(GameStateService);
  const directRouteAccess = inject(DirectRouteAccessService);

  logger.logDebug('AdminGuard: Checking authentication and admin role...');

  if (!gameState.initialized()) {
    if (directRouteAccess.enabled()) {
      return combineLatest([
        toObservable(gameState.initialized),
        auth.user$,
        playerService.player$,
        playerService.playerLoaded$,
      ]).pipe(
        tap(([initialized, user, player, playerLoaded]) =>
          logger.logDebug('[AdminGuard][wait-init] emission:', { initialized, user, player, playerLoaded })
        ),
        filter(([initialized, user, _player, playerLoaded]) => initialized && (!user || playerLoaded)),
        take(1),
        map(([_initialized, user, player]) => {
          if (!user) {
            return router.createUrlTree(['/login']);
          }

          const role = (player as { role?: string } | null)?.role;
          return role === 'admin' ? true : router.createUrlTree(['/hub']);
        })
      );
    }

    logger.logDebug('[AdminGuard] game state non inizializzato, redirect → /boot');
    return router.createUrlTree(['/boot']);
  }
  return combineLatest([auth.user$, playerService.player$, playerService.playerLoaded$]).pipe(
    tap(([user, player, playerLoaded]) =>
      logger.logDebug('[AdminGuard][tap] emission:', { user, player, playerLoaded })
    ),
    filter(([user, _player, playerLoaded]) => !user || playerLoaded),
    take(1),
    map(([user, player]) => {
      logger.logDebug('[AdminGuard][map] final state:', { user, player });
      if (!user) {
        return router.createUrlTree(['/login']);
      }

      const role = (player as { role?: string } | null)?.role;
      const isAdmin = role === 'admin';

      logger.logDebug('[AdminGuard][map] role check:', { role, isAdmin });
      return isAdmin ? true : router.createUrlTree(['/hub']);
    })
  );
};
