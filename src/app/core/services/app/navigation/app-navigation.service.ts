import { Injectable, inject } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

@Injectable({ providedIn: "root" })
export class AppNavigationService {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /**
   * Naviga verso una rotta applicativa partendo dal path ricevuto.
   * Usa il Router Angular con un array di segmenti, così il chiamante può passare
   * sia path assoluti sia path già normalizzati e ricevere la Promise con l'esito.
   */
  go(path: string): Promise<boolean> {
    return this.router.navigate([path]);
  }

  /**
   * Apre la pagina di risultato partita con lo stato finale richiesto.
   * Costruisce la rotta `/result/:status`, dove `status` indica vittoria o sconfitta,
   * e restituisce l'esito della navigazione Angular.
   */
  result(status: "win" | "lose"): Promise<boolean> {
    return this.router.navigate(["/result", status]);
  }

  /**
   * Restituisce l'URL corrente gestito dal Router Angular.
   * È utile per componenti che devono derivare lo stato UI dalla rotta attiva senza
   * leggere direttamente `window.location`.
   */
  getCurrentRoute(): string {
    return this.router.url;
  }

  /**
   * Legge un parametro dichiarato nella rotta attiva.
   * Usa lo snapshot dell'ActivatedRoute corrente e restituisce `null` quando il
   * parametro non è presente nella route configuration.
   */
  getParam(param: string): string | null {
    return this.route.snapshot.paramMap.get(param);
  }

  /**
   * Cerca un segmento testuale nell'URL corrente e lo restituisce quando coincide col parametro richiesto.
   * Esegue il parsing dell'URL tramite Router, ispeziona i segmenti dell'outlet primario
   * e restituisce `null` se il segmento non è presente.
   */
  getParamUrl(param: string): string | null {
    const urlTree = this.router.parseUrl(this.router.url);
    return urlTree.root.children['primary']?.segments.find((segment) => segment.path === param)?.path || null;
  }
}
