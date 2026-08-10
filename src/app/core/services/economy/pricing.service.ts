import { ShopItem } from "../../models/shop.models";
import { Injectable } from "@angular/core";
import { ChestItem, EquipItem, HeroItem, PriceItem, PriceType, ResourceItem, ResourceTypeId, variantsType } from "../../models/game.models";
import { PRICE_ATTRIBUTION_CONFIG } from "../../config/game-progression.config";
export type { CurrencyPricingConfig, CatalogPricingConfig, PriceAttributionConfig } from "../../config/game-progression.config";

/**
 * Rappresenta i saldi monetari standard del giocatore.
 * Tenerli in una struttura esplicita consente al servizio prezzi di restare puro e
 * indipendente dai signal Angular usati dai servizi di stato gioco.
 */
export interface CurrencyBalances {
  coin: number;
  gem: number;
  dust: number;
}

/** Item a cui il PricingService può attribuire prezzi shop o catalogo. */
export type ShopPriceSourceItem = EquipItem | HeroItem | ResourceItem | ChestItem;

/**
 * Fattori economici usati dai prezzi di upgrade livello/statistica.
 * Sono separati dai fattori XP per rendere evidente quali campi bilanciano il costo
 * e quali invece appartengono alla progressione non monetaria.
 */
export interface UpgradePricingFactors {
  baseCoinCost: number;
  costGrowthFactor: number;
  baseResourceCost: number;
  resourceGrowthFactor: number;
}

/**
 * Costo risorsa richiesto da un upgrade milestone.
 * L'item è incluso per permettere alla UI di mostrare direttamente nome e icona.
 */
export interface LevelResourceCost {
  item: ResourceItem;
  amount: number;
}

/**
 * Costo completo di un upgrade.
 * Gli upgrade standard usano `coin`, mentre i milestone possono richiedere una risorsa
 * inventario; `targetLevel` e `isMilestone` aiutano UI e validazioni.
 */
export interface LevelUpgradeCost {
  targetLevel: number;
  isMilestone: boolean;
  coin?: PriceItem;
  resource?: LevelResourceCost;
}

/** Frame moneta condiviso dai costi generati per upgrade e catalogo. */
export const coinFrame: PriceItem["frame"] = PRICE_ATTRIBUTION_CONFIG.currencies.coin.frame;

const safeNumber = (value: number | undefined, fallback = 0): number => Number.isFinite(value) ? (value as number) : fallback;
const normalizeLevel = (level: number): number => Math.max(1, Math.floor(safeNumber(level, 1)));

const MILESTONE_LEVEL_STEP = 5;
const RESOURCE_RARITY_LEVEL_SPAN = 20;
const RESOURCE_AMOUNT_CARRYOVER_LEVELS = RESOURCE_RARITY_LEVEL_SPAN - MILESTONE_LEVEL_STEP;

const milestoneResourceAmountLevel = (targetLevel: number): number => {
  const normalizedTargetLevel = normalizeLevel(targetLevel);
  const resourceTierIndex = Math.max(0, Math.ceil(normalizedTargetLevel / RESOURCE_RARITY_LEVEL_SPAN) - 1);
  return Math.max(MILESTONE_LEVEL_STEP, normalizedTargetLevel - resourceTierIndex * RESOURCE_AMOUNT_CARRYOVER_LEVELS);
};

const milestoneResourceAmount = (factors: UpgradePricingFactors, targetLevel: number): number =>
  Math.max(1, Math.round(factors.baseResourceCost * Math.pow(factors.resourceGrowthFactor, milestoneResourceAmountLevel(targetLevel) - 1)));

@Injectable({ providedIn: "root" })
export class PricingService {
  /** Espone la configurazione attiva per UI/debug e per eventuali override futuri. */
  readonly config = PRICE_ATTRIBUTION_CONFIG;

  /**
   * Crea un PriceItem coerente con la configurazione della valuta indicata.
   * Normalizza l'importo a intero, applica il minimo configurato e aggancia il frame
   * corretto, evitando duplicazioni di icone e fallback nei chiamanti.
   */
  createPrice(type: PriceType, amount: number): PriceItem {
    const currency = this.config.currencies[type];
    return {
      frame: currency.frame,
      type,
      amount: Math.max(currency.minimumAmount, Math.round(safeNumber(amount, currency.minimumAmount))),
    };
  }

  /**
   * Crea il prezzo shop predefinito di qualunque item vendibile.
   * Se l'item ha già un prezzo, applica solo il moltiplicatore mantenendone valuta e frame;
   * altrimenti genera sempre un prezzo fallback in base a tipo e livello dell'oggetto.
   */
  createDefaultShopPrice(item: ShopPriceSourceItem, quantity = 1): PriceItem {
	const formula = this.config.defaultShop;
	const quantityReduction = quantity * this.config.shopPriceQuantityReduction;
    if (item.price) {
      const normalizedPrice = this.createPrice(item.price.type, item.price.amount + item.price.amount * quantityReduction);
      return {
        ...normalizedPrice,
        frame: item.price.frame,
      };
    }
    
    const isPremiumPrice = this.isHeroShopItem(item) || this.isChestShopItem(item);
    const type: PriceType = isPremiumPrice ? formula.premiumCurrency : formula.standardCurrency;

    const baseAmount = this.isHeroShopItem(item)
      ? formula.heroBaseAmount + item.level * formula.heroLevelStep + item.mastery * formula.heroMasteryStep + item.variant * formula.heroVariantStep
      : this.isEquipShopItem(item)
        ? formula.equipBaseAmount + item.level * formula.equipLevelStep + item.mastery * formula.equipMasteryStep + item.variant * formula.equipVariantStep
        : this.isChestShopItem(item)
          ? formula.boxBaseAmount + item.level * formula.boxLevelStep + item.mastery * formula.boxMasteryStep
          : formula.resourceBaseAmount + item.level * formula.resourceLevelStep + item.mastery * formula.resourceMasteryStep;

    return this.createPrice(type, baseAmount + baseAmount * quantityReduction);
  }

  private isHeroShopItem(item: ShopPriceSourceItem): item is HeroItem {
    return item.itemType === "hero";
  }

  private isEquipShopItem(item: ShopPriceSourceItem): item is EquipItem {
    return item.itemType === "equip";
  }

  private isChestShopItem(item: ShopPriceSourceItem): item is ChestItem {
    return item.itemType === "chest";
  }

  /**
   * Verifica se un prezzo è sostenibile con i saldi ricevuti.
   * Un prezzo assente o nullo viene considerato gratuito; importi negativi/non validi
   * non superano la validazione per evitare accrediti accidentali durante un acquisto.
   */
  canAfford(price: PriceItem | undefined | null, balances: CurrencyBalances): boolean {
    if (!price) return true;
    if (!Number.isFinite(price.amount) || price.amount < 0) return false;
    return balances[price.type] >= price.amount;
  }

  /**
   * Restituisce nuovi saldi dopo aver scalato il prezzo indicato.
   * Non muta l'oggetto ricevuto e ritorna `null` quando il prezzo non è pagabile, così
   * il chiamante può aggiornare i signal solo se l'operazione economica è valida.
   */
  debit(price: PriceItem | undefined | null, balances: CurrencyBalances): CurrencyBalances | null {
    if (!price) return balances;
    if (!this.canAfford(price, balances)) return null;
    return {
      ...balances,
      [price.type]: balances[price.type] - price.amount,
    };
  }

  /**
   * Restituisce nuovi saldi dopo aver accreditato il prezzo/ricavo indicato.
   * Importi assenti o non positivi lasciano invariato il wallet, rendendo sicuri reward
   * opzionali e vendite di item senza prezzo.
   */
  credit(price: PriceItem | undefined | null, balances: CurrencyBalances): CurrencyBalances {
    if (!price || !Number.isFinite(price.amount) || price.amount <= 0) return balances;
    return {
      ...balances,
      [price.type]: balances[price.type] + price.amount,
    };
  }

  /**
   * Calcola il prezzo di vendita/rimborso a partire dal prezzo di acquisto.
   * Il moltiplicatore è configurabile e viene arrotondato per difetto per evitare di
   * generare valuta extra con cicli compra-vendi.
   */
  createRefundPrice(item: ShopPriceSourceItem, multiplier = this.config.deleteRefundMultiplier): PriceItem | null {
    if (!item) return null;
	const price = item.price ? this.createPrice(item.price.type, item.price.amount) : this.createDefaultShopPrice(item);
    return {
      ...price,
      amount: Math.max(0, Math.floor(price.amount * multiplier)),
    };
  }

  /**
   * Attribuisce il prezzo a una variante eroe generata per il catalogo.
   * La formula resta condivisa tra seed mock, popolamento remoto e fallback runtime.
   */
  createCatalogHeroPrice(heroLevel: number, heroMaestry: number, heroVariant: number): PriceItem | undefined {
    const catalogPricing = this.config.catalogPricing;
    return this.createPrice(catalogPricing.heroCurrency, catalogPricing.heroBaseAmount + heroLevel* catalogPricing.heroLevelStep + heroMaestry * catalogPricing.heroMasteryStep + heroVariant * catalogPricing.heroVariantStep);
  }

  /**
   * Attribuisce il prezzo a un equip generato per il catalogo.
   * La formula usa step modificabili nella configurazione centrale e resta condivisa
   * tra seed mock, popolamento remoto e fallback runtime.
   */
  createCatalogEquipPrice(equipIndex: number): PriceItem | undefined {
    const catalogPricing = this.config.catalogPricing;
    return this.createPrice(
      catalogPricing.equipCurrency,
      catalogPricing.equipBaseAmount + equipIndex * catalogPricing.equipIndexStep + catalogPricing.equipVariantStep,
    );
  }

  /**
   * Crea il costo di upgrade standard o milestone per il livello corrente.
   * Ogni cinque livelli richiede la risorsa risolta dal chiamante; negli altri casi
   * genera un prezzo in monete scalato esponenzialmente dai fattori economici.
   */
  createLevelUpgradeCost(
    currentLevel: number,
    factors: UpgradePricingFactors,
    milestoneResourceType: ResourceTypeId,
    resolveMilestoneResource: (typeId: ResourceTypeId, targetLevel: number) => ResourceItem,
  ): LevelUpgradeCost {
    const targetLevel = normalizeLevel(currentLevel) + 1;
    const isMilestone = targetLevel % 5 === 0;

    if (isMilestone) {
      return {
        targetLevel,
        isMilestone,
        resource: {
          item: resolveMilestoneResource(milestoneResourceType, targetLevel),
          amount: milestoneResourceAmount(factors, targetLevel),
        },
      };
    }

    return {
      targetLevel,
      isMilestone,
      coin: this.createPrice("coin", factors.baseCoinCost * Math.pow(factors.costGrowthFactor, targetLevel - 1)),
    };
  }


  /**
   * Calcola il costo in monete per riparare un equipaggiamento rotto.
   * Il costo è una percentuale configurabile del valore dell'oggetto, normalizzato
   * sempre in valuta coin anche quando il prezzo catalogo originale usa altre valute.
   */
  createEquipRepairPrice(equip: EquipItem): PriceItem {
    const value = this.createDefaultShopPrice(equip).amount;
    return this.createPrice("coin", value * this.config.equipRepairValueMultiplier);
  }

  /**
   * Calcola il costo in monete per curare completamente un eroe.
   * Il costo deriva da una percentuale configurabile del valore attuale dell'eroe,
   * sempre normalizzato in coin per mantenere leggibile l'azione di cura.
   */
  createHeroHealPrice(hero: HeroItem): PriceItem {
    const value = this.createDefaultShopPrice(hero).amount;
    return this.createPrice("coin", value * this.config.heroHealValueMultiplier);
  }

  /**
   * Calcola il pagamento speciale richiesto per recuperare completamente la stanchezza dell'eroe.
   * È separato dalla cura HP: la stanchezza non viene mai rimossa da createHeroHealPrice/healHero.
   */
  createHeroFatigueRecoveryPrice(hero: HeroItem): PriceItem {
    const value = this.createDefaultShopPrice(hero).amount;
    return this.createPrice(
      this.config.heroFatigueRecoveryCurrency,
      value * this.config.heroFatigueRecoveryValueMultiplier,
    );
  }

  /**
   * Verifica se un costo di upgrade è pagabile combinando wallet e stock risorsa.
   * Il callback `resourceStock` mantiene il servizio indipendente dalla struttura esatta
   * dell'inventario del giocatore.
   */
  canAffordLevelUpgradeCost(cost: LevelUpgradeCost, balances: CurrencyBalances, resourceStock: (resourceId: string) => number): boolean {
    if (cost.coin) return this.canAfford(cost.coin, balances);
    if (cost.resource) return resourceStock(cost.resource.item.id) >= cost.resource.amount;
    return true;
  }
}
