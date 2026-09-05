import { Component, computed, inject } from "@angular/core";
import { IonContent, IonFooter, IonHeader, IonToolbar } from "@ionic/angular/standalone";
import { RDN_ACTION_CATALOG, RDN_ACTION_IDS } from "../../core/game/phaser/config/rdn-actions.config";
import { GameStateService } from "../../core/services/state/game-state.service";
import { UIBottomNavComponent } from "../../shared/components/ui-bottom-nav.component";
import { UIHeaderComponent } from "../../shared/components/ui-header.component";

@Component({
  selector: "app-inventory", standalone: true,
  imports: [IonHeader, IonToolbar, UIHeaderComponent, IonContent, IonFooter, UIBottomNavComponent],
  template: `<ion-header><ion-toolbar><ui-header title="Inventario azioni" backPath="/hub" /></ion-toolbar></ion-header><ion-content><main class="screen action-inventory"><p>Azioni disponibili</p><section>@for (action of actions(); track action.id) { <article><div><strong>{{ action.label }}</strong><small>{{ action.description }}</small></div><b>×{{ quantity(action.id) }}</b></article> }</section></main></ion-content><ion-footer><ion-toolbar><ui-bottom-nav /></ion-toolbar></ion-footer>`,
  styles: [`.action-inventory { padding:20px; color:#f7e9c7; }.action-inventory > p { color:#ffdf70; font-weight:800; }.action-inventory section { display:grid; gap:10px; }.action-inventory article { display:flex; justify-content:space-between; align-items:center; gap:14px; padding:15px; border:1px solid rgba(244,202,88,.42); border-radius:12px; background:rgba(7,23,30,.78); }.action-inventory strong { display:block; color:#fff0ad; }.action-inventory small { display:block; margin-top:4px; color:#c6ddd7; }.action-inventory b { color:#ffdf70; font-size:1.25rem; }`],
})
export class InventoryPage {
  readonly state = inject(GameStateService);
  readonly actions = computed(() => RDN_ACTION_IDS.map((id) => RDN_ACTION_CATALOG[id]));
  quantity(id: typeof RDN_ACTION_IDS[number]): number { return this.state.inventoryActions()[id] ?? 0; }
}
