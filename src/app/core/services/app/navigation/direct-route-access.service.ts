import { Injectable, signal } from "@angular/core";

const DIRECT_ROUTE_ACCESS_STORAGE_KEY = "allowDirectRouteAccess";

@Injectable({ providedIn: "root" })
export class DirectRouteAccessService {
  readonly enabled = signal(this.load());

  setEnabled(enabled: boolean): void {
    this.enabled.set(enabled);
    localStorage.setItem(
      DIRECT_ROUTE_ACCESS_STORAGE_KEY,
      enabled ? "true" : "false",
    );
  }

  toggle(): void {
    this.setEnabled(!this.enabled());
  }

  private load(): boolean {
    return localStorage.getItem(DIRECT_ROUTE_ACCESS_STORAGE_KEY) === "true";
  }
}
