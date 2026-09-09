import { CommonModule } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { IonContent, IonFooter, IonHeader, IonToolbar } from "@ionic/angular/standalone";

import { RDN_ACTION_CATALOG, RDN_ACTION_IDS, RdnActionDefinition, RdnActionId } from "../../core/game/phaser/config/rdn-actions.config";
import { FrameItem } from "../../core/models/game.models";
import { GameStateService } from "../../core/services/state/game-state.service";
import { UiSpriteComponent } from "../../shared/basic/ui-sprite.component";
import { UIPanelComponent } from "../../shared/basic/ui-panel.component";
import { UIActionFeedbackOverlayComponent } from "../../shared/components/ui-action-feedback-overlay.component";
import { UIBottomNavComponent } from "../../shared/components/ui-bottom-nav.component";
import { UIHeaderComponent } from "../../shared/components/ui-header.component";

@Component({
  selector: "app-shop", standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, UIHeaderComponent, IonContent, IonFooter, UIBottomNavComponent, UiSpriteComponent, UIPanelComponent, UIActionFeedbackOverlayComponent],
  template: `<ion-header><ion-toolbar><ui-header title="Shop azioni" backPath="/hub" /></ion-toolbar></ion-header><ion-content><main class="screen action-page"><section class="action-grid">@for (action of actions(); track action.id) { <article class="action-box" (click)="open(action)"><ui-sprite class="action-box__bg" [frame]="{name:'card-lunar-banner', effect:'none'}"/><ui-sprite class="action-box__icon" [frame]="{name:action.icon, effect:'none'}"/><small>Possedute: {{ quantity(action.id) }}</small><button type="button" [disabled]="state.coins() < action.price" (click)="$event.stopPropagation(); buy(action.id)">ACQUISTA · {{ action.price }}</button></article> }</section></main>@if (selected(); as action) { <div class="action-modal" (click)="close()"><ui-panel variant="dark" styleClass="action-detail" (click)="$event.stopPropagation()"><button class="action-detail__close" type="button" aria-label="Chiudi dettagli azione" (click)="close()"><ui-sprite [frame]="{name:'icon-close', effect:'none'}"/></button><div class="action-detail__title"><ui-sprite class="action-detail__icon" [frame]="{name:action.icon, effect:'none'}"/><h2>{{ action.label }}</h2></div><p>{{ action.description }}</p><h3>Come usarla</h3><p>{{ action.tutorial }}</p><button type="button" [disabled]="state.coins() < action.price" (click)="buy(action.id)">ACQUISTA · {{ action.price }}</button></ui-panel></div> }<ui-action-feedback-overlay [open]="!!purchaseFeedback()" [frame]="purchaseFeedback()?.frame" [text]="purchaseFeedback()?.text ?? ''" [variant]="purchaseFeedback()?.variant ?? 'gain'" [duration]="1800" ariaLabel="Azione acquistata" (closed)="purchaseFeedback.set(null)" /></ion-content><ion-footer><ion-toolbar><ui-bottom-nav /></ion-toolbar></ion-footer>`,
  styles: [`.action-page{padding:18px;color:#f7e9c7}.balance{text-align:right;color:#ffdf70;font-weight:800}.action-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.action-box{position:relative;min-height:220px;overflow:hidden;padding:24px 14px 15px;text-align:center;cursor:pointer;isolation:isolate}.action-box__bg{position:absolute;inset:0;width:100%;height:100%;z-index:-1;opacity:.98}.action-box__icon{width:62px;height:62px;margin:35px auto 25px}.action-box strong,.action-box small{display:block;margin-top:8px}.action-box strong{color:#fff3ae}.action-box small{color:#d8e8df}.action-box button,.action-detail button{margin-top:12px;border:1px solid #ffe17d;border-radius:8px;padding:8px 10px;background:#825018;color:#fff5c4;font-weight:800}.action-box button:disabled,.action-detail button:disabled{opacity:.4}.action-modal{position:fixed;inset:0;z-index:100;background:#061014bb;display:grid;place-items:center;padding:22px}.action-detail{position:relative;max-width:390px;text-align:center}.action-detail__title{display:flex;align-items:center;justify-content:center;gap:10px;margin:0 34px 14px}.action-detail__icon{flex:0 0 46px;width:46px;height:46px}.action-detail h2{margin:0;color:#fff0a6}.action-detail h3{color:#ffdb72}.action-detail__close{position:absolute;left:10px;top:8px;display:grid;place-items:center;width:34px;height:34px;margin:0!important;padding:4px!important;background:transparent!important;border:0!important}.action-detail__close ui-sprite{width:26px;height:26px}@media(max-width:360px){.action-grid{grid-template-columns:1fr}}`],
})
export class ShopPage {
  readonly state = inject(GameStateService);
  readonly actions = computed(() => RDN_ACTION_IDS.map((id) => RDN_ACTION_CATALOG[id]));
  readonly selected = signal<RdnActionDefinition | null>(null);
  readonly purchaseFeedback = signal<{ frame: FrameItem; text: string; variant: "gain" } | null>(null);
  quantity(id: RdnActionId): number { return this.state.inventoryActions()[id] ?? 0; }
  open(action: RdnActionDefinition): void { this.selected.set(action); }
  close(): void { this.selected.set(null); }
  buy(id: RdnActionId): void { const action = RDN_ACTION_CATALOG[id]; if (this.state.coins() < action.price) return; this.state.mutateProgress((progress) => ({ ...progress, coins: progress.coins - action.price, inventory: { ...progress.inventory, actions: { ...progress.inventory.actions, [id]: (progress.inventory.actions[id] ?? 0) + 1 } }, lastUpdatedAt: new Date().toISOString() })); this.purchaseFeedback.set({ frame: { name: action.icon, effect: "none" }, text: "ACQUISTATO", variant: "gain" }); void this.state.persistProgressNow().catch(() => undefined); }
}
