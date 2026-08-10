import { RemoteConfigDocument } from "../remote/config.model";
import { GameEvent } from "../remote/event.model";
import { GameProgress, PlayerShop } from "../remote/progress.models";

import { GameCatalog } from "../game-catalog.model";
import { AuthUser } from "./auth-user.model";
import { PlayerProfile } from "./player-profile.model";


export interface AppGameState {
  user: AuthUser | null;
  player: PlayerProfile | null;
  progress: GameProgress | null;
  remoteConfig: RemoteConfigDocument | null;
  events: GameEvent[];
  playerShop: PlayerShop | null;
  catalog: GameCatalog;
  initialized: boolean;
  loading: boolean;
  error: string | null;
  lastRefreshAt: string | null;
}

/** @deprecated Use AppGameState. */
export type GameState = AppGameState;
