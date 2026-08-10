import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonFooter, IonToolbar } from '@ionic/angular/standalone';
import { ChestItem, ChestTypeId, OpenedRewardItem } from '../../../core/models/game.models';
import { chestItemsMock, chestTypesMock, getChestItemsByLevel, getChestItemsByLevelAndType, getRandomChestItems } from '../../../core/models/mock/fantasy/box-data';
import { equipItemsMock } from '../../../core/models/mock/fantasy/equip-data';
import { mockHeroItems } from '../../../core/models/mock/fantasy/hero-data';
import { resourceItemsMock } from '../../../core/models/mock/fantasy/resource-data';
import { ChestOpeningService } from '../../../core/services/inventory/rewards/box-opening.service';
import { UIInventoryBoxComponent } from '../../../shared/components/box/ui-inventory-box.component';
import { UIBottomUtilsComponent } from '../../../shared/components/ui-bottom-utils.component';
import { UiUtilsPageHeaderComponent } from '../../../shared/components/ui-utils-page-header.component';
import { UiSpriteComponent } from '../../../shared/basic/ui-sprite.component';

@Component({
  selector: 'app-chest-items-test-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonFooter, IonToolbar, UIInventoryBoxComponent, UIBottomUtilsComponent, UiUtilsPageHeaderComponent, UiSpriteComponent],
  template: `
    <ion-content>
      <div class="screen data-mock-page">
        <ui-utils-page-header group="data" title="Chest Item Tester" description="Testa i metodi chestItem con parametri editabili, anteprima grafica degli scrigni e JSON risultante su richiesta." />

        <section class="toolbar">
          <div><h2>Parametri chestItem</h2><p>Modifica livello, tipo, metodo e numero di elementi casuali.</p></div>
          <button type="button" class="primary-action" (click)="showJson = !showJson">{{ showJson ? 'Nascondi JSON' : 'Mostra JSON' }}</button>
        </section>

        <section class="controls-panel">
          <label>Metodo
            <select [(ngModel)]="method" (ngModelChange)="refresh()">
              <option value="all">Catalogo completo</option>
              <option value="level">getChestItemsByLevel</option>
              <option value="levelType">getChestItemsByLevelAndType</option>
              <option value="random">getRandomChestItems</option>
            </select>
          </label>
          <label>Livello <input type="number" min="1" [(ngModel)]="level" (ngModelChange)="refresh()" /></label>
          <label>Tipo
            <select [(ngModel)]="typeId" (ngModelChange)="refresh()">
              <option value="all">Tutti</option>
              @for (type of chestTypesMock; track type.id) { <option [value]="type.id">{{ type.title }}</option> }
            </select>
          </label>
          <label>Random count <input type="number" min="1" [(ngModel)]="count" (ngModelChange)="refresh()" /></label>
        </section>

        <section class="preview-panel">
          <header><span>PREVIEW</span><h2>{{ result.length }} chest item</h2></header>
          <div class="card-grid">
            @for (item of result; track item.id) {
              <article class="preview-card">
                <ui-inventory-box [item]="item" [cliccable]="true" cardFrame="card-parchment-small" (pressed)="openChest(item)" />
                <div>
                <strong>{{ item.name }}</strong>
				<small>{{ item.type.title }} · Lv {{ item.level }} · mastery {{ item.mastery }}</small>
				@for (reward of item.reward; track reward.type) {
					<div style="border: 1px solid rgba(125, 211, 252, 0.24);">
					<small >{{reward.type}}</small>
					<small >{{reward.min}} - {{reward.max}}</small>
					<small >variant {{reward.variantChances | json}}</small>
					<small >mastery{{reward.masteryChances | json}}</small>
					</div>
				}
				</div>
              </article>
            }
          </div>
        </section>

        <section class="preview-panel">
          <header><span>OPENED</span><h2>{{ openedChestName || 'Apri un box' }}</h2></header>
          @if (openedRewards.length) {
            <div class="card-grid">
              @for (reward of openedRewards; track reward.id) {
                <article class="preview-card">
                  <ui-sprite [frame]="reward.frame" fit="contain" anchor="center" />
                  <strong>{{ reward.title }}</strong>
                  <small>{{ reward.subtitle }} · x{{ reward.quantity }}</small>
                </article>
              }
            </div>
          } @else {
            <p>Seleziona uno scrigno e premi Apri per vedere gli oggetti ottenuti.</p>
          }
        </section>

        @if (showJson) { <section class="json-panel compact"><header><span>JSON result</span><h2>Output</h2></header><textarea readonly [ngModel]="json"></textarea></section> }
      </div>
    </ion-content>
    <ion-footer><ion-toolbar><ui-bottom-utils /></ion-toolbar></ion-footer>
  `,
  styleUrls: ['./data-mock.page.scss'],
})
export class ChestItemsTestPage {
  private readonly chestOpening = inject(ChestOpeningService);
  readonly chestTypesMock = chestTypesMock;
  method: 'all' | 'level' | 'levelType' | 'random' = 'level';
  level = 5;
  typeId: ChestTypeId | 'all' = 'all';
  count = 3;
  showJson = false;
  result: ChestItem[] = [];
  openedRewards: OpenedRewardItem[] = [];
  openedChestName = '';
  json = '';

  constructor() { this.refresh(); }

  refresh(): void {
    const typeId = this.typeId === 'all' ? undefined : this.typeId;
    if (this.method === 'all') this.result = chestItemsMock;
    if (this.method === 'level') this.result = getChestItemsByLevel(this.level);
    if (this.method === 'levelType') this.result = getChestItemsByLevelAndType(this.level, typeId);
    if (this.method === 'random') this.result = getRandomChestItems(this.count, typeId ? getChestItemsByLevelAndType(this.level, typeId) : getChestItemsByLevel(this.level));
    this.openedRewards = [];
    this.openedChestName = '';
    this.updateJson();
  }

  openChest(chest: ChestItem): void {
    const stockChest = { ...chest, stock: chest.stock ?? 1 };
    this.openedRewards = this.chestOpening.openInventoryChest(stockChest, {
      inventoryEquip: () => [],
      inventoryHeroes: () => [],
      cloneHeroItem: (item) => ({ ...item }),
      createInventoryCopyId: (baseId) => `${baseId}-preview-${crypto.getRandomValues(new Uint32Array(1))[0]}`,
      catalogResources: () => resourceItemsMock,
      catalogEquip: () => equipItemsMock,
      catalogHeroes: () => mockHeroItems,
      catalogChestes: () => chestItemsMock,
    });
    this.openedChestName = chest.name;
    this.updateJson();
  }

  private updateJson(): void {
    this.json = JSON.stringify({
      method: this.method,
      params: { level: this.level, typeId: this.typeId, count: this.count },
      data: this.result,
      opened: this.openedChestName ? { chest: this.openedChestName, rewards: this.openedRewards } : null,
    }, null, 2);
  }
}
