import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonContent, IonFooter, IonToolbar } from '@ionic/angular/standalone';
import { EQUIP_LEVEL_FACTORS, HERO_LEVEL_FACTORS, HERO_STAT_FACTORS } from '../../../core/config/game-progression.config';
import { PriceItem, ResourceItem, ResourceTypeId } from '../../../core/models/game.models';
import { resourceItemsMock, resourceTypesMock } from '../../../core/models/mock/fantasy/resource-data';
import { UiSpriteComponent } from '../../../shared/basic/ui-sprite.component';
import { UIBottomUtilsComponent } from '../../../shared/components/ui-bottom-utils.component';
import { UiUtilsPageHeaderComponent } from '../../../shared/components/ui-utils-page-header.component';

interface ResourceUsageSummary {
  id: ResourceTypeId;
  title: string;
  shortName: string;
  description: string;
  systemUse: string;
  milestoneUse: string;
  spentBy: string;
  items: ResourceItem[];
}

interface MilestoneCostRow {
  targetLevel: number;
  milestoneStep: number;
  heroCost: UpgradeCostPreview;
  heroStatCost: UpgradeCostPreview;
  equipCost: UpgradeCostPreview;
}

type UpgradeCostPreview =
  | { kind: 'coin'; coin: PriceItem }
  | { kind: 'resource'; item: ResourceItem; amount: number };

const orderedResourcesByType = (typeId: ResourceTypeId): ResourceItem[] => resourceItemsMock
  .filter((item) => item.type.id === typeId)
  .sort((a, b) => a.level - b.level);

const milestoneResourceForLevel = (typeId: ResourceTypeId, targetLevel: number): ResourceItem => {
  const orderedResources = orderedResourcesByType(typeId);
  const rarityIndex = Math.min(orderedResources.length - 1, Math.max(0, Math.ceil(targetLevel / 20) - 1));
  return orderedResources[rarityIndex] ?? orderedResources[0];
};

const MILESTONE_LEVEL_STEP = 5;
const RESOURCE_RARITY_LEVEL_SPAN = 20;
const RESOURCE_AMOUNT_CARRYOVER_LEVELS = RESOURCE_RARITY_LEVEL_SPAN - MILESTONE_LEVEL_STEP;

const milestoneAmountLevel = (targetLevel: number): number => {
  const resourceTierIndex = Math.max(0, Math.ceil(targetLevel / RESOURCE_RARITY_LEVEL_SPAN) - 1);
  return Math.max(MILESTONE_LEVEL_STEP, targetLevel - resourceTierIndex * RESOURCE_AMOUNT_CARRYOVER_LEVELS);
};

const roundedAmount = (baseCost: number, growthFactor: number, targetLevel: number): number =>
  Math.max(1, Math.round(baseCost * Math.pow(growthFactor, targetLevel - 1)));

const roundedMilestoneAmount = (baseCost: number, growthFactor: number, targetLevel: number): number =>
  roundedAmount(baseCost, growthFactor, milestoneAmountLevel(targetLevel));

const coinCost = (baseCoinCost: number, costGrowthFactor: number, targetLevel: number): UpgradeCostPreview => ({
  kind: 'coin',
  coin: { frame: { name: 'coin_single', effect: 'none' }, type: 'coin', amount: roundedAmount(baseCoinCost, costGrowthFactor, targetLevel) },
});

const upgradeCostPreview = (
  baseCoinCost: number,
  costGrowthFactor: number,
  baseResourceCost: number,
  resourceGrowthFactor: number,
  resourceType: ResourceTypeId,
  targetLevel: number,
): UpgradeCostPreview => targetLevel % 5 === 0
  ? { kind: 'resource', item: milestoneResourceForLevel(resourceType, targetLevel), amount: roundedMilestoneAmount(baseResourceCost, resourceGrowthFactor, targetLevel) }
  : coinCost(baseCoinCost, costGrowthFactor, targetLevel);


@Component({
  selector: 'resource-cost',
  standalone: true,
  imports: [UiSpriteComponent],
  template: `
    <div class="cost">
      <ui-sprite [frame]="item.frame" />
      <div><strong>{{ amount }}× {{ item.name }}</strong><small>Lv {{ item.level }} · {{ item.type.title }}</small></div>
    </div>
  `,
  styles: [`
    .cost { display: flex; align-items: center; gap: 10px; color: #f8fafc; }
    ui-sprite { width: 38px; flex: 0 0 38px; }
    small { display: block; margin-top: 3px; color: #cbd5e1; }
  `],
})
export class ResourceCostComponent {
  @Input({ required: true }) item!: ResourceItem;
  @Input({ required: true }) amount!: number;
}

@Component({
  selector: 'upgrade-cost-preview',
  standalone: true,
  imports: [UiSpriteComponent, ResourceCostComponent],
  template: `
    @if (cost.kind === 'coin') {
      <div class="cost">
        <ui-sprite [frame]="cost.coin.frame" />
        <div><strong>{{ cost.coin.amount }} coin</strong><small>Upgrade standard</small></div>
      </div>
    } @else {
      <resource-cost [item]="cost.item" [amount]="cost.amount" />
    }
  `,
  styles: [`
    .cost { display: flex; align-items: center; gap: 10px; color: #f8fafc; }
    ui-sprite { width: 38px; flex: 0 0 38px; }
    small { display: block; margin-top: 3px; color: #cbd5e1; }
  `],
})
export class UpgradeCostPreviewComponent {
  @Input({ required: true }) cost!: UpgradeCostPreview;
}

@Component({
  selector: 'app-resourse-milestone-page',
  standalone: true,
  imports: [CommonModule, IonContent, IonFooter, IonToolbar, UiSpriteComponent, UIBottomUtilsComponent, UiUtilsPageHeaderComponent, UpgradeCostPreviewComponent],
  template: `
    <ion-content>
      <div class="screen resource-milestone-page">
        <ui-utils-page-header
          group="data"
          title="Resource Milestone"
          description="Vista di bilanciamento per capire quali risorse esistono nel sistema, a cosa servono e come vengono scalate quando pagano gli upgrade milestone di eroi ed equipaggiamento."
        />

        <section class="hero-panel">
          <div>
            <span>Economia risorse</span>
            <h2>Due famiglie, due ruoli di progressione</h2>
            <p>
              Il sistema usa le risorse come materiali consumabili inventariati. Gli upgrade normali continuano a usare monete,
              mentre ogni livello target multiplo di 5 diventa una milestone e scala un costo in risorsa invece che in coin.
            </p>
          </div>
          <div class="formula-card">
            <strong>Formula milestone</strong>
            <code>amount = round(baseResourceCost × resourceGrowthFactor^(targetLevel - 1))</code>
            <small>Le monete pagano i livelli standard; ai multipli di 5 entra la risorsa, con la stessa rarità per blocchi da 20 livelli: 1-20, 21-40, 41-60, 61-80, 81-100.</small>
          </div>
        </section>

        <section class="resource-grid">
          @for (resource of resourceSummaries; track resource.id) {
            <article class="resource-card">
              <header>
                <ui-sprite [frame]="resource.items[0].frame" />
                <div>
                  <span>{{ resource.id }}</span>
                  <h3>{{ resource.title }}</h3>
                </div>
              </header>
              <p>{{ resource.description }}</p>
              <dl>
                <div><dt>Uso nel sistema</dt><dd>{{ resource.systemUse }}</dd></div>
                <div><dt>Uso milestone</dt><dd>{{ resource.milestoneUse }}</dd></div>
                <div><dt>Viene scalata da</dt><dd>{{ resource.spentBy }}</dd></div>
              </dl>
              <div class="resource-items">
                @for (item of resource.items; track item.id) {
                  <div class="resource-chip">
                    <ui-sprite [frame]="item.frame" />
                    <span>{{ item.name }}</span>
                    <small>Lv {{ item.level }} · mastery {{ item.mastery }}</small>
                  </div>
                }
              </div>
            </article>
          }
        </section>

        <section class="milestone-panel">
          <header>
            <div>
              <span>Scala costi</span>
              <h2>Pagamenti upgrade ai livelli milestone</h2>
              <p>
                La tabella mostra tutti i livelli: i livelli standard sono in coin, mentre ogni quinto livello è pagato con risorse.
                La rarità della risorsa resta stabile per 20 livelli e poi passa alla risorsa successiva della stessa famiglia.
              </p>
            </div>
          </header>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Target level</th>
                  <th>Eroe</th>
                  <th>Stat eroe</th>
                  <th>Equipaggiamento</th>
                </tr>
              </thead>
              <tbody>
                @for (row of milestoneRows; track row.targetLevel) {
                  <tr>
                    <td><strong>Lv {{ row.targetLevel }}</strong><small>{{ row.targetLevel % 5 === 0 ? 'Milestone ' + row.milestoneStep : 'Standard coin' }}</small></td>
                    <td><upgrade-cost-preview [cost]="row.heroCost" /></td>
                    <td><upgrade-cost-preview [cost]="row.heroStatCost" /></td>
                    <td><upgrade-cost-preview [cost]="row.equipCost" /></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ui-bottom-utils />
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    :host { color: #f8fafc; font-family: system-ui, sans-serif; }
    .resource-milestone-page { width: 100%; padding: clamp(16px, 3vw, 28px); }
    .hero-panel, .resource-card, .milestone-panel { border: 1px solid rgba(255,255,255,.14); border-radius: 22px; background: rgba(15,23,42,.78); }
    .hero-panel { display: grid; grid-template-columns: 1fr minmax(280px,420px); gap: 18px; margin-bottom: 18px; padding: 20px; }
    h2, h3, p { margin: 0; } p, small, dd { color: #cbd5e1; line-height: 1.45; }
    span { color: #facc15; font-size: 11px; font-weight: 950; letter-spacing: .12em; text-transform: uppercase; }
    .formula-card { display: grid; gap: 8px; border: 1px solid rgba(250,204,21,.35); border-radius: 18px; padding: 16px; background: rgba(250,204,21,.1); }
    code { white-space: normal; color: #e0f2fe; font-size: 12px; }
    .resource-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; margin-bottom: 18px; }
    .resource-card, .milestone-panel { padding: 18px; } .resource-card header { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
    .resource-card header ui-sprite { width: 54px; } dl { display: grid; gap: 10px; margin: 14px 0; } dt { color: #e0f2fe; font-weight: 900; } dd { margin: 3px 0 0; }
    .resource-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px,1fr)); gap: 10px; }
    .resource-chip { display: grid; justify-items: center; gap: 5px; border: 1px solid rgba(125,211,252,.24); border-radius: 14px; padding: 10px; text-align: center; background: rgba(2,6,23,.36); }
    .resource-chip ui-sprite { width: 42px; } .milestone-panel header { margin-bottom: 14px; } .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 820px; } th, td { border-bottom: 1px solid rgba(125,211,252,.18); padding: 12px; text-align: left; vertical-align: middle; }
    th { color: #facc15; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; } td:first-child { color: #f8fafc; } td:first-child small { display: block; margin-top: 3px; }
    @media (max-width: 920px) { .hero-panel, .resource-grid { grid-template-columns: 1fr; } }
  `],
})
export class ResourseMilestonePage {
  readonly resourceSummaries: ResourceUsageSummary[] = resourceTypesMock.map((type) => ({
    id: type.id,
    title: type.title,
    shortName: type.id === 'res1' ? 'Polveri' : 'Gemme',
    description: type.description,
    systemUse: type.id === 'res1'
      ? 'Materiale di crescita ricorrente: viene raccolto, mostrato in inventario, distribuito da chest/reward e usato per potenziare eroi e statistiche eroe.'
      : 'Materiale raro: viene raccolto come catalizzatore premium, compare in inventario/shop/reward e supporta upgrade più selettivi.',
    milestoneUse: type.id === 'res1'
      ? 'Risorsa milestone di heroUpgradeCost e heroStatUpgradeCost: ai multipli di 5 usa la stessa rarità per 20 livelli, poi passa alla successiva.'
      : 'Risorsa milestone di equipUpgradeCost: ai multipli di 5 usa la stessa rarità per 20 livelli, poi passa alla successiva.',
    spentBy: type.id === 'res1' ? 'HeroProgressService quando conferma upgrade eroe/stat.' : 'HeroProgressService quando conferma upgrade equip.',
    items: resourceItemsMock.filter((item) => item.type.id === type.id).sort((a, b) => a.level - b.level),
  }));

  readonly milestoneRows: MilestoneCostRow[] = Array.from({ length: 99 }, (_, index) => index + 2).map((targetLevel) => ({
    targetLevel,
    milestoneStep: targetLevel / 5,
    heroCost: upgradeCostPreview(HERO_LEVEL_FACTORS.baseCoinCost, HERO_LEVEL_FACTORS.costGrowthFactor, HERO_LEVEL_FACTORS.baseResourceCost, HERO_LEVEL_FACTORS.resourceGrowthFactor, 'res1', targetLevel),
    heroStatCost: upgradeCostPreview(HERO_STAT_FACTORS.baseCoinCost, HERO_STAT_FACTORS.costGrowthFactor, HERO_STAT_FACTORS.baseResourceCost, HERO_STAT_FACTORS.resourceGrowthFactor, 'res1', targetLevel),
    equipCost: upgradeCostPreview(EQUIP_LEVEL_FACTORS.baseCoinCost, EQUIP_LEVEL_FACTORS.costGrowthFactor, EQUIP_LEVEL_FACTORS.baseResourceCost, EQUIP_LEVEL_FACTORS.resourceGrowthFactor, 'res2', targetLevel),
  }));
}
