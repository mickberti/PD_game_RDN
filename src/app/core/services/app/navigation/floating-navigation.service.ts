import { inject, Injectable } from "@angular/core";
import { FloatingAction } from "src/app/shared/basic/ui-floating-panel.component";
import { AppNavigationService } from "./app-navigation.service";

@Injectable({ providedIn: "root" })
export class FloatingNavigationService {
  readonly nav = inject(AppNavigationService);

  contextActions: FloatingAction[] = [
    {
      label: 'Apri scheda utente',
      frameName: 'icon-search',
      action: () => this.goToHero(),
    },
    {
      label: 'Cambia contesto',
      frameName: 'icon-edit-scroll',
      action: () => this.goToHeroUpgrade(),
    },
    {
      label: 'Reset selezione',
      frameName: 'inventory',
      action: () => this.goToHeroWeaponEquip(),
    },
  ];

  /**
   * Apre la pagina di dettaglio dell'eroe dal menu flottante.
   * Delega la navigazione ad AppNavigationService per mantenere un unico punto di accesso
   * al Router e non restituisce valori perché l'azione è usata come callback UI.
   */
  goToHero(): void {
    this.nav.go('hero');
  }

  /**
   * Apre la pagina di potenziamento dell'eroe dal menu flottante.
   * Invoca la rotta `hero-upgrade` tramite il servizio di navigazione condiviso,
   * lasciando al Router Angular la gestione dell'esito.
   */
  goToHeroUpgrade(): void {
    this.nav.go('hero-upgrade');
  }

  /**
   * Apre la sezione equipaggiamento arma dell'eroe dal menu flottante.
   * Usa la rotta specifica `hero-equip/weapon` per portare l'utente direttamente
   * alla categoria arma invece che alla pagina generica dell'inventario.
   */
  goToHeroWeaponEquip(): void {
    this.nav.go('hero-equip/weapon');
  }
}
