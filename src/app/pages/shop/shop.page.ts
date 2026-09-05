import { Component, computed, inject } from "@angular/core";
import { IonContent, IonFooter, IonHeader, IonToolbar } from "@ionic/angular/standalone";
import { RDN_ACTION_CATALOG, RDN_ACTION_IDS, RdnActionId } from "../../core/game/phaser/config/rdn-actions.config";
import { GameStateService } from "../../core/services/state/game-state.service";
import { UIBottomNavComponent } from "../../shared/components/ui-bottom-nav.component";
import { UIHeaderComponent } from "../../shared/components/ui-header.component";

@Component({
  selector: "app-shop", standalone: true,
  imports: [IonHeader, IonToolbar, UIHeaderComponent, IonContent, IonFooter, UIBottomNavComponent],
  template: `<ion-header><ion-toolbar><ui-header title="Shop azioni" backPath="/hub" /></ion-toolbar></ion-header><ion-content><main class="screen action-shop"><p class="action-shop__balance">Monete: {{ state.coins() }}</p><section class="action-shop__list">@for (action of actions(); track action.id) { <article class="action-shop__item"><div><strong>{{ action.label }}</strong><p>{{ action.description }}</p><small>Possedute: {{ quantity(action.id) }}</small></div><button type="button" [disabled]="state.coins() < action.price" (click)="buy(action.id)">ACQUISTA · {{ action.price }}</button></article> }</section></main></ion-content><ion-footer><ion-toolbar><ui-bottom-nav /></ion-toolbar></ion-footer>`,
  styles: [`.action-shop { padding:20px; color:#f7e9c7; }.action-shop__balance { margin:0 0 16px; color:#ffdf70; font-weight:800; text-align:right; }.action-shop__list { display:grid; gap:10px; }.action-shop__item { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:16px; border:1px solid rgba(244,202,88,.45); border-radius:12px; background:rgba(7,23,30,.78); }.action-shop__item strong { color:#fff0ad; }.action-shop__item p { margin:5px 0; color:#c6ddd7; font-size:.85rem; }.action-shop__item small { color:#ffdf70; }.action-shop__item button { min-width:108px; min-height:40px; border:1px solid #ffdf72; border-radius:8px; color:#fff4bd; background:linear-gradient(#a76d1e,#623b12); font-weight:800; }.action-shop__item button:disabled { opacity:.42; }`],
})
export class ShopPage {
  readonly state = inject(GameStateService);
  readonly actions = computed(() => RDN_ACTION_IDS.map((id) => RDN_ACTION_CATALOG[id]));
  quantity(id: RdnActionId): number { return this.state.inventoryActions()[id] ?? 0; }
  buy(id: RdnActionId): void { const action = RDN_ACTION_CATALOG[id]; if (this.state.coins() < action.price) return; this.state.mutateProgress((progress) => ({ ...progress, coins: progress.coins - action.price, inventory: { ...progress.inventory, actions: { ...progress.inventory.actions, [id]: (progress.inventory.actions[id] ?? 0) + 1 } }, statistics: { ...progress.statistics, coinsSpent: progress.statistics.coinsSpent + action.price, itemsPurchased: progress.statistics.itemsPurchased + 1 }, lastUpdatedAt: new Date().toISOString() })); void this.state.persistProgressNow().catch(() => undefined); }
}
