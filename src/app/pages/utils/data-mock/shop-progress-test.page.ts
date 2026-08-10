import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonFooter, IonToolbar } from '@ionic/angular/standalone';
import { buildShopItemsByProgress, getShopUnlocksByPlayerLevel } from '../../../core/models/mock/fantasy/shop-data';
import { ShopItem } from '../../../core/models/shop.models';
import { UIShopBoxComponent } from '../../../shared/components/box/ui-shop-box.component';
import { UIBottomUtilsComponent } from '../../../shared/components/ui-bottom-utils.component';
import { UiUtilsPageHeaderComponent } from '../../../shared/components/ui-utils-page-header.component';

@Component({
  selector: 'app-shop-progress-test-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonFooter, IonToolbar, UIShopBoxComponent, UIBottomUtilsComponent, UiUtilsPageHeaderComponent],
  template: `
    <ion-content><div class="screen data-mock-page">
      <ui-utils-page-header group="data" title="Shop Progress Tester" description="Testa buildShopItemsByProgress modificando i parametri di richiesta e visualizzando lo shop risultante." />
      <section class="toolbar"><div><h2>Parametri shop</h2><p>Unlock calcolati: mastery {{ unlocks.mastery }}, variant {{ unlocks.variant }}, stats {{ unlocks.stats }}.</p></div><button type="button" class="primary-action" (click)="showJson = !showJson">{{ showJson ? 'Nascondi JSON' : 'Mostra JSON' }}</button></section>
      <section class="controls-panel">
        <label>Livello <input type="number" min="1" [(ngModel)]="level" (ngModelChange)="refresh()" /></label>
        <label>Eroi <input type="number" min="0" [(ngModel)]="heroCount" (ngModelChange)="refresh()" /></label>
        <label>Equip <input type="number" min="0" [(ngModel)]="equipCount" (ngModelChange)="refresh()" /></label>
        <label>Risorse <input type="number" min="0" [(ngModel)]="resourceCount" (ngModelChange)="refresh()" /></label>
        <label>Chest <input type="number" min="0" [(ngModel)]="boxCount" (ngModelChange)="refresh()" /></label>
      </section>
      <section class="preview-panel"><header><span>SHOP PREVIEW</span><h2>{{ result.length }} offerte</h2></header><div class="shop-grid">@for (item of result; track item.id) { <ui-shop-box [item]="item" [canPurchase]="true" /> }</div></section>
      @if (showJson) { <section class="json-panel compact"><header><span>JSON result</span><h2>Output</h2></header><textarea readonly [ngModel]="json"></textarea></section> }
    </div></ion-content><ion-footer><ion-toolbar><ui-bottom-utils /></ion-toolbar></ion-footer>
  `,
  styleUrls: ['./data-mock.page.scss'],
})
export class ShopProgressTestPage {
  level = 5; heroCount = 2; equipCount = 4; resourceCount = 4; boxCount = 2; showJson = false;
  result: ShopItem[] = []; json = ''; unlocks = getShopUnlocksByPlayerLevel(this.level);
  constructor() { this.refresh(); }
  refresh(): void {
    this.unlocks = getShopUnlocksByPlayerLevel(this.level);
    const params = { level: this.level, heroCount: this.heroCount, equipCount: this.equipCount, resourceCount: this.resourceCount, boxCount: this.boxCount };
    this.result = buildShopItemsByProgress(params);
    this.json = JSON.stringify({ method: 'buildShopItemsByProgress', unlocks: this.unlocks, params, data: this.result }, null, 2);
  }
}
