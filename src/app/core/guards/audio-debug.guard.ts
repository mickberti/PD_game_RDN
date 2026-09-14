import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { environment } from "../../../environments/environment";

/** Keeps the diagnostic route unavailable even if its URL is entered in production. */
export const AudioDebugGuard: CanActivateFn = () => environment.production ? inject(Router).createUrlTree(["/hub"]) : true;
