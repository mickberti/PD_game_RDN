import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { environment } from "../../../environments/environment";

/** Debug content must never be reachable through the production UI or direct URL. */
export const EffectPlaygroundGuard: CanActivateFn = () => environment.production ? inject(Router).createUrlTree(["/hub"]) : true;
