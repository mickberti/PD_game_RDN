import { HeroPowerMultiplier, IconItem, PriceItem, PriceType, ResourceTypeId } from "../../../models/game.models";
import { MonsterType, PhaserBackgroundFrameVariants, PhaserGameplayEventType, PhaserMobileControlsVisualConfig, PhaserSceneSpriteSizingParams, PhaserTreasureConfig, PhaserTreasureVisualVariant } from "../../../models/phaser-game-state.model";
import { PHASER_SPRITE_SIZING_CONFIG } from './sprite-sizing.config';

/**
 * Configurazione centrale delle variabili numeriche e di bilanciamento del gioco.
 *
 * Le variabili sono divise per area funzionale in modo che pricing, crescita,
 * stato iniziale, potenza eroe e gameplay possano essere modificate senza cercare
 * numeri hardcoded nei servizi. Ogni gruppo indica anche dove viene consumato.
 */

/** Configura icona e arrotondamento di una valuta prezzo. */
export interface CurrencyPricingConfig {
  /** Frame mostrato dalle UI prezzo e wallet per questa valuta. Usato da PricingService.createPrice e dalle UI che leggono i PriceItem generati. */
  frame: PriceItem["frame"];
  /** Importo minimo consentito quando PricingService normalizza un prezzo. Evita prezzi a zero/negativi generati dalle formule. */
  minimumAmount: number;
}

/** Definisce le formule dei prezzi assegnati ai cataloghi generati da seed. */
export interface CatalogPricingConfig {
  /** Prezzo base degli eroi di catalogo generati. Usato in PricingService.createCatalogHeroPrice. */
  heroBaseAmount: number;
  /** Incremento del prezzo per indice eroe. Usato in PricingService.createCatalogHeroPrice. */
  heroLevelStep: number;
  /** Incremento del prezzo per indice eroe. Usato in PricingService.createCatalogHeroPrice. */
  heroMasteryStep: number;
  /** Incremento del prezzo per indice eroe. Usato in PricingService.createCatalogHeroPrice. */
  heroVariantStep: number;
  /** Valuta premium degli eroi . Usata in PricingService.createCatalogHeroPrice. */
  heroCurrency: PriceType;
  /** Prezzo base degli equip di catalogo generati associati agli eroi. Usato in PricingService.createCatalogEquipPrice. */
  equipBaseAmount: number;
  /** Incremento prezzo equip in funzione dello slot/indice equip. Usato in PricingService.createCatalogEquipPrice. */
  equipIndexStep: number;
  /** Incremento prezzo equip in funzione della variante generata. Usato in PricingService.createCatalogEquipPrice. */
  equipVariantStep: number;

  /** Valuta degli equip di catalogo generati. Usata in PricingService.createCatalogEquipPrice. */
  equipCurrency: PriceType;
}

/** Formula fallback per item shop privi di prezzo esplicito nel mock. */
export interface DefaultShopPricingFormulaConfig {
  /** Valuta degli item premium (eroi e box) senza prezzo esplicito. Usata in PricingService.createDefaultShopPrice. */
  premiumCurrency: PriceType;
  /** Valuta degli item standard (equip e risorse) senza prezzo esplicito. Usata in PricingService.createDefaultShopPrice. */
  standardCurrency: PriceType;
  /** Base prezzo fallback degli eroi. Formula: base + livello * levelStep. */
  heroBaseAmount: number;
  /** Incremento per livello del prezzo fallback eroe. */
  heroLevelStep: number;
  /** Incremento per Mastery del prezzo fallback eroe. */
  heroMasteryStep: number;
  /** Incremento per Mastery del prezzo fallback eroe. */
  heroVariantStep: number;
  /** Base prezzo fallback degli equip. Formula: base + livello * levelStep + XP corrente * experienceStep. */
  equipBaseAmount: number;
  /** Incremento per livello del prezzo fallback equip. */
  equipLevelStep: number;
  /** Incremento per livello del prezzo fallback equip. */
  equipMasteryStep: number;
  /** Incremento per variante del prezzo fallback equip. */
  equipVariantStep: number;
  /** Incremento per esperienza corrente del prezzo fallback equip. */
  equipExperienceStep: number;
  /** Base prezzo fallback delle box. Formula: base + livello * levelStep. */
  boxBaseAmount: number;
  /** Incremento per livello del prezzo fallback box. */
  boxLevelStep: number;
  /** Incremento per livello del prezzo fallback box. */
  boxMasteryStep: number;
  /** Base prezzo fallback delle risorse. Formula: base + livello * levelStep. */
  resourceBaseAmount: number;
  /** Incremento per livello del prezzo fallback risorsa. */
  resourceLevelStep: number;
  /** Incremento per livello del prezzo fallback risorsa. */
  resourceMasteryStep: number;
}

/** Contiene moltiplicatori economici globali di vendita, catalogo e shop. */
export interface PriceAttributionConfig {
  /** Mappa valuta -> frame/minimo. Usata da PricingService.createPrice. */
  currencies: Record<PriceType, CurrencyPricingConfig>;
  /** Percentuale del prezzo restituita quando un item inventario viene eliminato/venduto. Usata in PricingService.createRefundPrice e GameStateService. */
  deleteRefundMultiplier: number;
  /** Percentuale di riduzione del prezzo applicata quando si acquistano più unità dello stesso item. Usata in PricingService.createDefaultShopPrice. */
  shopPriceQuantityReduction: number;
  /** Percentuale del valore di un equip rotto richiesta in monete per ripararlo. Usata in PricingService.createEquipRepairPrice. */
  equipRepairValueMultiplier: number;
  /** Percentuale del valore attuale di un eroe richiesta in monete per curarlo completamente. Usata in PricingService.createHeroHealPrice. */
  heroHealValueMultiplier: number;
  /** Percentuale del valore attuale di un eroe richiesta in valuta speciale per recuperare la stanchezza. Usata in PricingService.createHeroFatigueRecoveryPrice. */
  heroFatigueRecoveryValueMultiplier: number;
  /** Valuta speciale richiesta per recuperare la stanchezza senza attendere il riposo. */
  heroFatigueRecoveryCurrency: PriceType;
  /** Formule per prezzi assegnati a eroi/equip di catalogo generati da seed. */
  catalogPricing: CatalogPricingConfig;
  /** Formula fallback per shop item senza PriceItem esplicito. */
  defaultShop: DefaultShopPricingFormulaConfig;
}

/** Fattori di crescita XP, costo monete e costo risorse per livelli e statistiche. */
export interface LevelProgressionFactors {
  /** Esperienza base richiesta al livello 1. Usata dalle factory XP in LevelProgressionService. */
  baseExperience: number;
  /** Esponente della curva XP. Aumentarlo rende più ripida la progressione ad alto livello. */
  experienceExponent: number;
  /** Costo base in monete degli upgrade non milestone. Usato da PricingService.createLevelUpgradeCost. */
  baseCoinCost: number;
  /** Moltiplicatore esponenziale del costo monete per livello. */
  costGrowthFactor: number;
  /** Quantità base della risorsa richiesta ai milestone. */
  baseResourceCost: number;
  /** Moltiplicatore della quantità risorsa milestone per livello. */
  resourceGrowthFactor: number;
}

/** Variabili di creazione Progress per salute, mana, esperienza e durata. */
export interface ProgressionResourceConfig {
  /** Valore base salute eroe. Usato da createHeroHealProgress. */
  heroHealthLevelBase: number;
  /** Percentuale iniziale di salute corrente quando non viene passata una quantità. */
  heroHealthLevelInitialRatio: number;
  /** Valore base salute eroe. Usato da createHeroHealProgress. */
  heroHealthMasteryBase: number;
  /** Percentuale iniziale di salute corrente quando non viene passata una quantità. */
  heroHealthMasteryInitialRatio: number;
  /** Valore base salute eroe. Usato da createHeroHealProgress. */
  heroHealthVariantBase: number;
  /** Percentuale iniziale di salute corrente quando non viene passata una quantità. */
  heroHealthVariantInitialRatio: number;
  /** Valore base mana eroe. Usato da createHeroManaProgress. */
  heroManaLevelBase: number;
  /** Valore base stanchezza eroe. Usato da createHeroFatigueProgress. */
  heroFatigueLevelBase: number;
  /** Percentuale iniziale di mana corrente quando non viene passata una quantità. */
  heroManaLevelInitialRatio: number;
  /** Percentuale iniziale di stanchezza corrente quando non viene passata una quantità. */
  heroFatigueLevelInitialRatio: number;
  /** Valore base mana eroe. Usato da createHeroManaProgress. */
  heroManaMasteryBase: number;
  /** Valore base stanchezza eroe. Usato da createHeroFatigueProgress. */
  heroFatigueMasteryBase: number;
  /** Percentuale iniziale di mana corrente quando non viene passata una quantità. */
  heroManaMasteryInitialRatio: number;
  /** Percentuale iniziale di stanchezza corrente quando non viene passata una quantità. */
  heroFatigueMasteryInitialRatio: number;
  /** Valore base mana eroe. Usato da createHeroManaProgress. */
  heroManaVariantBase: number;
  /** Valore base stanchezza eroe. Usato da createHeroFatigueProgress. */
  heroFatigueVariantBase: number;
  /** Percentuale iniziale di mana corrente quando non viene passata una quantità. */
  heroManaVariantInitialRatio: number;
  /** Percentuale iniziale di stanchezza corrente quando non viene passata una quantità. */
  heroFatigueVariantInitialRatio: number;
  /** Crescita lineare per livello applicata a salute/mana. Usata da resourceTotalForLevel. */
  resourceGrowthPerLevel: number;
  /** Moltiplicatore applicato alla Costituzione per aumentare il totale salute eroe. */
  heroHealthConstitutionMultiplier: number;
  /** Moltiplicatore applicato all'Intelligenza per aumentare il totale mana eroe. */
  heroManaIntelligenceMultiplier: number;
  /** Moltiplicatore applicato al Carisma per aumentare il totale stanchezza eroe. */
  heroFatigueCharismaMultiplier: number;
  /** Moltiplicatore applicato alla Saggezza per aumentare il totale esperienza eroe. */
  heroExperienceWisdomMultiplier: number;
  /** Moltiplicatore applicato alla Forza per calcolare l'attacco eroe. */
  heroAttackStrengthMultiplier: number;
  /** Moltiplicatore applicato alla Costituzione per calcolare la difesa eroe. */
  heroDefenseConstitutionMultiplier: number;
  /** Moltiplicatore applicato alla Destrezza per calcolare la velocità eroe. */
  heroSpeedDexterityMultiplier: number;
  /** Moltiplicatore di attacco/difesa/durata quando un equip sale di livello. Usato da upgradeEquipLevel. */
  equipUpgradeStatMultiplier: number;
  /** Bonus additivo dato ad attacco e difesa quando un equip sale di livello. */
  equipUpgradeFlatBonus: number;
  /** Quantità durata consumata di default da useEquipDuration. */
  defaultEquipDurationUseAmount: number;
}

/** Stato iniziale e limiti dell'inventario giocatore. */
export interface PlayerProgressConfig {
  /** Monete iniziali del mock player. Usato dal signal coins in GameStateService. */
  initialCoins: number;
  /** Gemme iniziali del mock player. Usato dal signal gems in GameStateService. */
  initialGems: number;
  /** Polvere/stelle iniziali del mock player. Usato dal signal stars in GameStateService. */
  initialDust: number;
  /** Stock iniziale per eventuali riepiloghi risorse indicizzati per tipo. */
  initialResources: Record<ResourceTypeId, number>;
  /** Stage iniziale visualizzato nel profilo/hub dal servizio gameplay race. */
  initialStage: number;
  /** Score corrente iniziale. Usato dal servizio gameplay race e aggiornato a fine gara. */
  initialScore: number;
  /** Numero massimo di item per categoria inventario. Usato quando si aggiungono risorse/box/equip. */
  maxInventoryItemsPerCategory: number;
  /** Range casuale stock iniziale per risorse e box mock. Usato dalla factory inventario giocatore. */
  initialStackStockRange: { min: number; max: number };
  /** Numero di equip iniziali copiati dal mock nel player. */
  initialEquipCount: number;
  /** Numero di eroi iniziali copiati dal mock nel player. */
  initialHeroCount: number;

}

/** Pesi usati nel calcolo Combat Power dell'eroe. */
export interface HeroPowerConfig {
  /** Totale di riferimento per normalizzare ogni statistica eroe. Usato da calculateStatPower. */
  defaultStatTotal: number;
  /** Peso di ogni punto attacco equip nel power. Usato da calculateEquipPower. */
  equipAttackWeight: number;
  /** Peso di ogni punto difesa equip nel power. Usato da calculateEquipPower. */
  equipDefenseWeight: number;
  /** Peso del livello equip nel power. Usato da calculateEquipPower. */
  equipLevelWeight: number;
  /** Contributo massimo dell'esperienza equip normalizzata. Usato da calculateEquipPower. */
  equipExperienceWeight: number;
  /** Contributo massimo della durata equip normalizzata. Usato da calculateEquipPower. */
  equipDurationWeight: number;
  /** Peso del livello eroe nel power totale. Usato da calculateHeroTotalPower. */
  heroLevelWeight: number;
  /** Peso del totale statistiche eroe normalizzate. Usato da calculateHeroTotalPower. */
  heroStatsWeight: number;
  /** Contributo massimo di salute/mana/esperienza normalizzate. Usato da calculateHeroTotalPower. */
  heroResourceWeight: number;
  /** Moltiplicatori base assegnati agli eroi mock. Usati nei dati hero-data e da calculateMultipliers. */
  defaultMultipliers: HeroPowerMultiplier[];
}

/** Configurazione dei power-up acquistabili dal player mock. */
export interface PlayerPowerUpConfig {
  /** Identificativo funzionale del power-up. Usato dalle UI e dalla logica inventory/shop. */
  id: string;
  /** Titolo mostrato nella card power-up. */
  title: string;
  /** Descrizione mostrata nella card power-up. */
  subtitle: string;
  /** Icona mostrata nella card power-up. */
  icon: IconItem;
  /** Prezzo del power-up. Usato dalle UI shop/power-up e dai controlli di acquisto. */
  price: PriceItem;
  /** Stato iniziale del power-up nel mock. */
  state: "received" | "collect" | "locked";
  /** Tipo item usato dalle card generiche. */
  type: "hero";
  /** Quantità disponibile nel mock. */
  stock: number;
}


/** Regole centralizzate per accumulo e recupero della stanchezza dell'eroe. */
export interface HeroFatigueGameplayConfig {
  /** Stanchezza aggiunta a fine partita, indipendentemente dall'esito. */
  matchCompletionAmount: number;
  /** Stanchezza aggiunta a ogni attacco normale eseguito. */
  normalAttackAmount: number;
  /** Stanchezza aggiunta a ogni attacco speciale eseguito. */
  specialAttackAmount: number;
  /** Stanchezza recuperata automaticamente per ogni periodo di riposo completato. */
  restRecoveryAmount: number;
  /** Durata in millisecondi di un periodo di riposo. */
  restPeriodMs: number;
  /** Durata base del riposo completo quando l'eroe va in recupero. */
  fullRestBaseMs: number;
  /** Percentuale aggiunta alla durata base per ogni livello eroe. */
  fullRestLevelPercentPerLevel: number;
  /** Percentuale sottratta alla durata base per ogni punto Forza. */
  fullRestStrengthPercentPerPoint: number;
  /** Moltiplicatore minimo finale applicabile alla durata base. */
  fullRestMinimumBaseMultiplier: number;
}

/** Regole centralizzate per la cura attiva dell'eroe in Phaser. */
export interface HeroHealGameplayConfig {
  /** Numero minimo di cure disponibili per partita. */
  minimumUsesPerRun: number;
  /** Numero di cure aggiunte per ogni punto Saggezza. */
  usesPerWisdomPoint: number;
  /** Livelli richiesti per ottenere una cura addizionale. */
  bonusUseEveryLevels: number;
  /** Numero di cure bonus assegnate a ogni soglia livelli completata. */
  bonusUsesPerLevelStep: number;
  /** Cooldown in millisecondi tra due cure consecutive. */
  cooldownMs: number;
  /** Moltiplicatore della salute massima usato nella formula di cura. */
  maxHealthRatio: number;
  /** Moltiplicatore della Saggezza usato nella formula di cura. */
  wisdomMultiplier: number;
  /** Valore base piatto della cura per evitare heal troppo bassi. */
  flatAmount: number;
  /** Percentuale del costo mana dello speciale usata per il costo della cura. */
  manaCostFromSpecialRatio: number;
  /** Costo mana minimo della cura. */
  minimumManaCost: number;
}

/** Variabili base della scena Phaser e della generazione dungeon. */
export interface PhaserSceneConfig {
  /** Numero di sezioni/camere generate nella mappa. Usato da GameScene.defaultParams. */
  sections: number;
  /** Larghezza, in tile, di ciascuna sezione della mappa. */
  sectionWidth: number;
  /** Altezza, in tile, dell'area di gioco e di ciascuna sezione della mappa. */
  sectionHeight: number;
  /** Numero di assi movimento consentiti: 4 o 8. Usato da GameScene.defaultParams. */
  movementAxes: 4 | 8;
  /** Dimensione tile in pixel. Usato da tilemap, collisioni e spawn. */
  tileSize: number;
  /** Velocità base player in pixel/secondo. Usata da movimento eroe. */
  playerSpeed: number;
  /** Velocità base nemici prima del moltiplicatore mostro. Usata da updateEnemies. */
  enemySpeed: number;
  /** Vite/HP iniziali fallback quando non c'è un profilo eroe. */
  initialLives: number;
  /** Tesori generati per sezione dungeon. Usato da spawnGameplayElements. */
  treasuresPerSection: number;
  /** Trappole generate per sezione dungeon. Usato da spawnGameplayElements. */
  trapsPerSection: number;
  /** Nemici generati per sezione dungeon. Usato da spawnGameplayElements. */
  enemiesPerSection: number;
  /** Cooldown invulnerabilità/danno ricevuto in millisecondi. Usato dai collider danno. */
  damageCooldown: number;
  /** Livello iniziale dei mostri quando non viene passato un parametro. */
  monsterLevel: number;
  /** Tipi mostro attivi di default. Usato da GameScene.defaultParams e spawn nemici. */
  monsterTypes: MonsterType[];
  /** Ripetizione attacco base tenuto premuto. Usato dal combat tuning Phaser. */
  attackRepeatAfterMs: number;
  /** Ripetizione speciale tenuta premuta. Usato dal combat tuning Phaser. */
  specialRepeatAfterMs: number;
  /** Ampiezza arco difensivo dell'eroe. Usata da GameScene default combat tuning. */
  defenseArcWidth: number;
  /** Dimensioni visuali configurabili di tile, props, trappole ed eroe. */
  spriteSizing: PhaserSceneSpriteSizingParams;
  /** Varianti pesate dei frame ambientali di floor e wall. */
  backgroundFrameVariants: PhaserBackgroundFrameVariants;
  /** Configurazione di tipologie, frequenze e valore dei tesori trovabili in mappa. */
  treasureConfig: PhaserTreasureConfig;
  /** Abilita il debug console dettagliato per gli eventi runtime della scena Phaser. */
  debugGameplayEvents: boolean;
  /** Mappa evento gameplay -> effetto juice da applicare al contenitore Angular del gioco. */
  gameplayEventJuice: Partial<Record<PhaserGameplayEventType, string | null>>;
  /** Configurazione visuale del controller touch Phaser. */
  mobileControlsVisual: PhaserMobileControlsVisualConfig;
  /** Se true mostra le percentuali del profilo evento nel widget HUD della modalita' arcade/adventure. */
  showEventModeProbabilitiesInHud: boolean;
}

/** Profilo di bilanciamento di ogni mostro della scena Phaser. */
export interface MonsterGameplayConfig {
  /** Nome leggibile del mostro in UI/debug. */
  label: string;
  /** HP base al livello 1. Usato da GameScene quando crea i nemici. */
  baseHp: number;
  /** HP aggiunti per livello mostro. */
  hpPerLevel: number;
  /** Mana base del mostro. */
  baseMana: number;
  /** Mana aggiunto per livello mostro. */
  manaPerLevel: number;
  /** Danno base da contatto/attacco. */
  damage: number;
  /** Moltiplicatore sulla velocità nemico globale. */
  speedMultiplier: number;
  /** Distanza entro cui il mostro insegue il player. */
  chaseRadius: number;
  /** Punteggio assegnato quando il mostro viene sconfitto. */
  score: number;
  /** Tinta sprite fallback Phaser. */
  tint: number;
  /** Portata attacco base del mostro. */
  weaponRange: number;
  /** Cooldown attacco base del mostro in millisecondi. */
  weaponCooldown: number;
  /** Portata attacco speciale del mostro. */
  specialRange: number;
  /** Cooldown attacco speciale del mostro in millisecondi. */
  specialCooldown: number;
  /** Costo mana attacco speciale del mostro. */
  specialManaCost: number;
  /** Moltiplicatore danno attacco base. */
  weaponDamageMultiplier: number;
  /** Moltiplicatore danno attacco speciale. */
  specialDamageMultiplier: number;
  /** Portata difesa/scudo. */
  defenseRange: number;
  /** Ampiezza arco difesa/scudo. */
  defenseArcWidth: number;
  /** Abilita o disabilita la logica scudo per il mostro. */
  canShield: boolean;
  /** Probabilità di attivare lo scudo. */
  shieldChance: number;
  /** Percentuale efficacia scudo. */
  shieldEfficiency: number;
  /** Probabilità di scegliere l'attacco speciale. */
  specialChance: number;
}

export const PRICE_ATTRIBUTION_CONFIG: PriceAttributionConfig = {
  currencies: {
    coin: { frame: { name: "coin_single", effect: "none" }, minimumAmount: 1 },
    gem: { frame: { name: "crystal_single", effect: "none" }, minimumAmount: 1 },
    dust: { frame: { name: "magic_dust_single", effect: "none" }, minimumAmount: 1 },
  },
  deleteRefundMultiplier: 0.5,
  shopPriceQuantityReduction: 0.75,
  equipRepairValueMultiplier: 0.25,
  heroHealValueMultiplier: 0.05,
  heroFatigueRecoveryValueMultiplier: 0.08,
  heroFatigueRecoveryCurrency: "dust",
  catalogPricing: {
    heroBaseAmount: 800,
	heroLevelStep: 80,
    heroMasteryStep: 220,
	heroVariantStep: 1250,
	heroCurrency: "dust",
    equipBaseAmount: 550,
    equipIndexStep: 620,
    equipVariantStep: 1850,
    equipCurrency: "gem",
  },
  defaultShop: {
    premiumCurrency: "gem",
    standardCurrency: "coin",
    heroBaseAmount: 800,
    heroLevelStep: 80,
	heroMasteryStep: 220,
	heroVariantStep: 1250,
    equipBaseAmount: 550,
    equipLevelStep: 85,
	equipMasteryStep: 620,
	equipVariantStep: 1850,
    equipExperienceStep: 3,
    boxBaseAmount: 400,
    boxLevelStep: 0,
	boxMasteryStep: 1100,
    resourceBaseAmount: 150,
    resourceLevelStep: 350,
	resourceMasteryStep: 650,
  },
};

export const HERO_LEVEL_FACTORS: LevelProgressionFactors = {
  baseExperience: 100,
  experienceExponent: 1.42,
  baseCoinCost: 140,
  costGrowthFactor: 1.18,
  baseResourceCost: 8,
  resourceGrowthFactor: 1.22,
};

export const EQUIP_LEVEL_FACTORS: LevelProgressionFactors = {
  baseExperience: 80,
  experienceExponent: 1.38,
  baseCoinCost: 95,
  costGrowthFactor: 1.16,
  baseResourceCost: 8,
  resourceGrowthFactor: 1.2,
};

export const HERO_STAT_FACTORS: LevelProgressionFactors = {
  baseExperience: 0,
  experienceExponent: 1,
  baseCoinCost: 70,
  costGrowthFactor: 1.12,
  baseResourceCost: 4,
  resourceGrowthFactor: 1.16,
};

export const PROGRESSION_RESOURCE_CONFIG: ProgressionResourceConfig = {
  heroHealthLevelBase: 20,
  heroHealthLevelInitialRatio: 1,
  heroHealthMasteryBase: 20,
  heroHealthMasteryInitialRatio: 1,
  heroHealthVariantBase: 20,
  heroHealthVariantInitialRatio: 1,
  heroManaMasteryBase: 10,
  heroManaMasteryInitialRatio: 1,
  heroManaLevelBase: 10,
  heroManaLevelInitialRatio: 1,
  heroManaVariantBase: 10,
  heroManaVariantInitialRatio: 1,
  heroFatigueMasteryBase: 12,
  heroFatigueMasteryInitialRatio: 0,
  heroFatigueLevelBase: 12,
  heroFatigueLevelInitialRatio: 0,
  heroFatigueVariantBase: 12,
  heroFatigueVariantInitialRatio: 0,
  resourceGrowthPerLevel: 0.18,
  heroHealthConstitutionMultiplier: 2,
  heroManaIntelligenceMultiplier: 1.5,
  heroFatigueCharismaMultiplier: 2,
  heroExperienceWisdomMultiplier: 10,
  heroAttackStrengthMultiplier: 1.2,
  heroDefenseConstitutionMultiplier: 1.1,
  heroSpeedDexterityMultiplier: 1,
  equipUpgradeStatMultiplier: 1.08,
  equipUpgradeFlatBonus: 1,
  defaultEquipDurationUseAmount: 1,
};

export const PLAYER_STATE_CONFIG: PlayerProgressConfig = {
  initialCoins: 56090,
  initialGems: 4200,
  initialDust: 50,
  initialResources: { res1: 0, res2: 0 },
  initialStage: 1350,
  initialScore: 507,
  maxInventoryItemsPerCategory: 20,
  initialStackStockRange: { min: 0, max: 5 },
  initialEquipCount: 8,
  initialHeroCount: 10,
};

export const HERO_POWER_CONFIG: HeroPowerConfig = {
  defaultStatTotal: 100,
  equipAttackWeight: 2.4,
  equipDefenseWeight: 2,
  equipLevelWeight: 3,
  equipExperienceWeight: 25,
  equipDurationWeight: 12,
  heroLevelWeight: 45,
  heroStatsWeight: 6,
  heroResourceWeight: 30,
  defaultMultipliers: [
    {
      id: "base-combat-rating",
      title: "Moltiplicatore base potenza",
      value: 1,
    },
  ],
};


export const HERO_FATIGUE_GAMEPLAY_CONFIG: HeroFatigueGameplayConfig = {
  matchCompletionAmount: 6,
  normalAttackAmount: 1,
  specialAttackAmount: 3,
  restRecoveryAmount: 12,
  restPeriodMs: 60 * 60 * 1000,
  fullRestBaseMs: 2 * 60 * 60 * 1000,
  fullRestLevelPercentPerLevel: 0.01,
  fullRestStrengthPercentPerPoint: 0.005,
  fullRestMinimumBaseMultiplier: 0.35,
};

export const HERO_HEAL_GAMEPLAY_CONFIG: HeroHealGameplayConfig = {
  minimumUsesPerRun: 1,
  usesPerWisdomPoint: 0.1,
  bonusUseEveryLevels: 30,
  bonusUsesPerLevelStep: 1,
  cooldownMs: 9000,
  maxHealthRatio: 0.12,
  wisdomMultiplier: 1.8,
  flatAmount: 8,
  manaCostFromSpecialRatio: 0.55,
  minimumManaCost: 8,
};

const treasureVariants = (variants: PhaserTreasureVisualVariant[]): PhaserTreasureVisualVariant[] => variants;
const mobileControlsVisual: PhaserMobileControlsVisualConfig = {
  attack: {
    frameAtlasKey: "atlas-game-action-set1",
    frameName: "action-attack",
    label: "ATTACCO",
    radius: 25,
    frameScale: 0.4,
    tint: 0xffffff
  },
  special: {
    frameAtlasKey: "atlas-game-action-set1",
    frameName: "action-tornado",
    label: "SPECIALE",
    radius: 20,
    frameScale: 0.35,
    tint: 0xffffff
  },
  shield: {
    frameAtlasKey: "atlas-game-action-set1",
    frameName: "action-defense",
    label: "DIFESA",
    radius: 20,
    frameScale: 0.35,
    tint: 0xffffff
  },
  heal: {
    frameAtlasKey: "atlas-game-action-set1",
    frameName: "action-heal",
    label: "CURA",
    radius: 16,
    frameScale: 0.30,
    tint: 0xffffff
  },
  joystick: {
    radius: 58,
    knobRadius: 24,
    baseFillAlpha: 0.2,
    knobFillAlpha: 0.42,
    ringStrokeAlpha: 0.72
  }
};

export const PHASER_SCENE_CONFIG: PhaserSceneConfig = {
  sections: 4,
  sectionWidth: 8,
  sectionHeight: 7,
  movementAxes: 4,
  tileSize: 48,
  playerSpeed: 180,
  enemySpeed: 80,
  initialLives: 3,
  treasuresPerSection: 1,
  trapsPerSection: 2,
  enemiesPerSection: 1,
  damageCooldown: 850,
  monsterLevel: 1,
  monsterTypes: ["goblin", "slime", "bat", "skeletor"],
  attackRepeatAfterMs: 700,
  specialRepeatAfterMs: 1100,
  defenseArcWidth: 52,
  spriteSizing: PHASER_SPRITE_SIZING_CONFIG,
  backgroundFrameVariants: {
    floor: [
      {
        weight: 60,
        frames: [
          "floor-tile-r01-c01", "floor-tile-r01-c02", "floor-tile-r01-c03", "floor-tile-r01-c04", "floor-tile-r01-c05", "floor-tile-r01-c06", "floor-tile-r01-c07",
          "floor-tile-r02-c01", "floor-tile-r02-c02", "floor-tile-r02-c03", "floor-tile-r02-c04"
        ]
      },
      {
        weight: 30,
        frames: [
          "floor-tile-r02-c05", "floor-tile-r02-c06", "floor-tile-r02-c07",
          "floor-tile-r03-c01", "floor-tile-r03-c02", "floor-tile-r03-c03", "floor-tile-r03-c04", "floor-tile-r03-c05"
        ]
      },
      {
        weight: 10,
        frames: [
          "floor-tile-r03-c06", "floor-tile-r03-c07",
          "floor-tile-r04-c01", "floor-tile-r04-c02", "floor-tile-r04-c03", "floor-tile-r04-c04", "floor-tile-r04-c05", "floor-tile-r04-c06", "floor-tile-r04-c07"
        ]
      }
    ],
    wall: {
      top: [
        { weight: 60, frames: ["wall-top-01", "wall-top-02", "wall-top-03"] },
        { weight: 30, frames: ["wall-top-04", "wall-top-05", "wall-top-06"] },
        { weight: 10, frames: ["wall-arch-gate"] }
      ],
      bot: [
        { weight: 60, frames: ["wall-mid-01", "wall-mid-02"] },
        { weight: 30, frames: ["wall-mid-03"] },
        { weight: 10, frames: ["wall-mid-04"] }
      ],
      side: [
        { weight: 60, frames: ["wall-pillar-01", "wall-pillar-02", "wall-pillar-03"] },
        { weight: 30, frames: ["wall-pillar-04", "wall-pillar-05"] },
        { weight: 10, frames: ["wall-pillar-06"] }
      ]
    },
    props: [
      { weight: 50, frames: ["prop-barrel-01", "prop-barrel-02", "prop-pot-small-01", "prop-skull-01", "prop-crystal-shrine-purple-01", "prop-stone-well-01", "nature-bush-01", "nature-plant-01", "nature-plant-02"] },
      { weight: 35, frames: ["prop-pot-tall-01", "prop-crate-01", "prop-crate-small-01", "light-brazier-tripod-01", "light-brazier-bowl-01", "prop-bookshelf-01", "nature-mushrooms-01"] },
      { weight: 15, frames: ["prop-sack-01", "prop-stone-rubble-altar-01", "nature-web-01", "tile-rubble-01"] }
    ],
    staticTrap: [
      { weight: 50, frames: ["trap-spikes-01", "trap-spikes-02"] },
      { weight: 35, frames: ["trap-spikes-03", "trap-spikes-04"] },
      { weight: 15, frames: ["trap-spikes-05"] }
    ],
    dynamicTrap: [
      { weight: 45, frames: ["trap-spikes-09", "trap-spikes-11"] },
      { weight: 35, frames: ["trap-spikes-12", "trap-spikes-13"] },
      { weight: 20, frames: ["light-purple-flame-stand-01"] }
    ]
  },
  treasureConfig: {
    types: {
      coin: {
        roomCountWeights: { zero: 80, one: 15, two: 5 },
        roomValueMin: 8,
        roomValueMax: 28,
        maxItemsPerMap: 8,
        frame: { atlasKey: "treasure-res-icons-set1", frame: "coin_single", fallbackTextureKey: "treasure-coin" },
        render: { width: 30, height: 30, originX: 0.5, originY: 0.68 },
        reward: { kind: "coins" },
        variants: treasureVariants([
          {
            weight: 65,
            frame: { atlasKey: "treasure-res-icons-set1", frame: "coin_single", fallbackTextureKey: "treasure-coin" },
            render: { width: 30, height: 30, originX: 0.5, originY: 0.68 },
            roomValueMin: 6,
            roomValueMax: 16,
            reward: { kind: "coins" }
          },
          {
            weight: 35,
            frame: { atlasKey: "treasure-res-icons-set1", frame: "coin_triple", fallbackTextureKey: "treasure-coin" },
            render: { width: 34, height: 30, originX: 0.5, originY: 0.68 },
            roomValueMin: 14,
            roomValueMax: 36,
            reward: { kind: "coins" }
          }
        ])
      },
      gem: {
        roomCountWeights: { zero: 80, one: 15, two: 5 },
        roomValueMin: 1,
        roomValueMax: 4,
        maxItemsPerMap: 4,
        frame: { atlasKey: "treasure-res-icons-set1", frame: "crystal_single", fallbackTextureKey: "treasure-gem" },
        render: { width: 30, height: 30, originX: 0.5, originY: 0.68 },
        reward: { kind: "gems" },
        variants: treasureVariants([
          {
            weight: 55,
            frame: { atlasKey: "treasure-res-icons-set1", frame: "crystal_single", fallbackTextureKey: "treasure-gem" },
            render: { width: 30, height: 30, originX: 0.5, originY: 0.68 },
            roomValueMin: 1,
            roomValueMax: 2,
            reward: { kind: "gems" }
          },
          {
            weight: 20,
            frame: { atlasKey: "treasure-res-icons-set1", frame: "crystal_triple", fallbackTextureKey: "treasure-gem" },
            render: { width: 28, height: 30, originX: 0.5, originY: 0.68 },
            roomValueMin: 2,
            roomValueMax: 4,
            reward: { kind: "gems" }
          },
          {
            weight: 15,
            frame: { atlasKey: "treasure-res-icons-set2", frame: "resource-gem-purple-octagon", fallbackTextureKey: "treasure-gem" },
            render: { width: 28, height: 30, originX: 0.5, originY: 0.68 },
            roomValueMin: 3,
            roomValueMax: 5,
            reward: { kind: "gems" }
          },
          {
            weight: 10,
            frame: { atlasKey: "treasure-res-icons-set2", frame: "resource-gem-gold-octagon", fallbackTextureKey: "treasure-gem" },
            render: { width: 28, height: 30, originX: 0.5, originY: 0.68 },
            roomValueMin: 4,
            roomValueMax: 7,
            reward: { kind: "gems" }
          }
        ])
      },
      chest: {
        roomCountWeights: { zero: 95.98, one: 4, two: 0.02 },
        roomValueMin: 1,
        roomValueMax: 1,
        maxItemsPerMap: 1,
        frame: { atlasKey: "treasure-chest-set1", frame: "chest-royal-blue", fallbackTextureKey: "treasure-chest" },
        render: { width: 36, height: 36, originX: 0.5, originY: 0.68 },
        reward: { kind: "box", chestTypeId: "box1" },
        variants: treasureVariants([
          {
            weight: 28,
            frame: { atlasKey: "treasure-chest-set1", frame: "chest-royal-blue", fallbackTextureKey: "treasure-chest" },
            render: { width: 36, height: 36, originX: 0.5, originY: 0.68 },
            roomValueMin: 1,
            roomValueMax: 1,
            reward: { kind: "box", catalogItemId: "box-wooden-blue", chestTypeId: "box1" },
            slotMachine: { panelFrame: "slot-king_panel_set3" }
          },
          {
            weight: 18,
            frame: { atlasKey: "treasure-chest-set1", frame: "chest-crystal-purple", fallbackTextureKey: "treasure-chest" },
            render: { width: 36, height: 36, originX: 0.5, originY: 0.68 },
            roomValueMin: 1,
            roomValueMax: 1,
            reward: { kind: "box", catalogItemId: "box-crystal-purple", chestTypeId: "box2" },
            slotMachine: { panelFrame: "slot_cristal_panel_set3" }
          },
          {
            weight: 16,
            frame: { atlasKey: "treasure-chest-set1", frame: "chest-angel-gold", fallbackTextureKey: "treasure-chest" },
            render: { width: 36, height: 36, originX: 0.5, originY: 0.68 },
            roomValueMin: 1,
            roomValueMax: 1,
            reward: { kind: "box", chestTypeId: "box2" }
          },
          {
            weight: 12,
            frame: { atlasKey: "treasure-chest-set1", frame: "chest-nature-green", fallbackTextureKey: "treasure-chest" },
            render: { width: 36, height: 36, originX: 0.5, originY: 0.68 },
            roomValueMin: 1,
            roomValueMax: 1,
            reward: { kind: "box", catalogItemId: "box-nature-green", chestTypeId: "box1" },
            slotMachine: { panelFrame: "slot_nature_panel_set3" }
          },
          {
            weight: 10,
            frame: { atlasKey: "treasure-chest-set1", frame: "chest-skull-dark", fallbackTextureKey: "treasure-chest" },
            render: { width: 36, height: 36, originX: 0.5, originY: 0.68 },
            roomValueMin: 1,
            roomValueMax: 1,
            reward: { kind: "box", catalogItemId: "chest-skull-dark", chestTypeId: "box2" },
            slotMachine: { panelFrame: "slot_death_panel_set3" }
          },
          {
            weight: 7,
            frame: { atlasKey: "treasure-chest-set1", frame: "chest-frost-crystal", fallbackTextureKey: "treasure-chest" },
            render: { width: 36, height: 36, originX: 0.5, originY: 0.68 },
            roomValueMin: 1,
            roomValueMax: 1,
            reward: { kind: "box", catalogItemId: "chest-frost-crystal", chestTypeId: "box1" },
            slotMachine: { panelFrame: "slot_gem_panel_set3" }
          },
          {
            weight: 4,
            frame: { atlasKey: "treasure-chest-set1", frame: "chest-red-gold", fallbackTextureKey: "treasure-chest" },
            render: { width: 36, height: 36, originX: 0.5, originY: 0.68 },
            roomValueMin: 1,
            roomValueMax: 1,
            reward: { kind: "box", catalogItemId: "chest-red-gold", chestTypeId: "box2" }
          },
          {
            weight: 3,
            frame: { atlasKey: "treasure-chest-set1", frame: "chest-wizard-purple", fallbackTextureKey: "treasure-chest" },
            render: { width: 36, height: 36, originX: 0.5, originY: 0.68 },
            roomValueMin: 1,
            roomValueMax: 1,
            reward: { kind: "box", catalogItemId: "chest-wizard-purple", chestTypeId: "box2" }
          },
          {
            weight: 1,
            frame: { atlasKey: "treasure-chest-set1", frame: "chest-gift-pink", fallbackTextureKey: "treasure-chest" },
            render: { width: 36, height: 36, originX: 0.5, originY: 0.68 },
            roomValueMin: 1,
            roomValueMax: 1,
            reward: { kind: "box", catalogItemId: "chest-gift-pink", chestTypeId: "box1" }
          },
          {
            weight: 1,
            frame: { atlasKey: "treasure-chest-set1", frame: "chest-dragon-fire", fallbackTextureKey: "treasure-chest" },
            render: { width: 36, height: 36, originX: 0.5, originY: 0.68 },
            roomValueMin: 2,
            roomValueMax: 2,
            reward: { kind: "box", catalogItemId: "box-dragon-fire", chestTypeId: "box2" },
            slotMachine: { panelFrame: "slot_boss_panel_set3" }
          }
        ])
      },
      resource: {
        roomCountWeights: { zero: 80, one: 15, two: 5 },
        roomValueMin: 2,
        roomValueMax: 7,
        maxItemsPerMap: 5,
        frame: { atlasKey: "treasure-res-icons-set2", frame: "resource-dust-red", fallbackTextureKey: "treasure-resource" },
        render: { width: 32, height: 32, originX: 0.5, originY: 0.68 },
        reward: { kind: "resource", resourceTypeId: "res1" },
        variants: treasureVariants([
          {
            weight: 28,
            frame: { atlasKey: "treasure-res-icons-set2", frame: "resource-dust-red", fallbackTextureKey: "treasure-resource" },
            render: { width: 32, height: 32, originX: 0.5, originY: 0.68 },
            roomValueMin: 2,
            roomValueMax: 4,
            reward: { kind: "resource", resourceTypeId: "res1", catalogItemId: "resource-dust-red" }
          },
          {
            weight: 18,
            frame: { atlasKey: "treasure-res-icons-set2", frame: "resource-dust-blue", fallbackTextureKey: "treasure-resource" },
            render: { width: 32, height: 32, originX: 0.5, originY: 0.68 },
            roomValueMin: 3,
            roomValueMax: 5,
            reward: { kind: "resource", resourceTypeId: "res1", catalogItemId: "resource-dust-blue" }
          },
          {
            weight: 18,
            frame: { atlasKey: "treasure-res-icons-set2", frame: "resource-dust-green", fallbackTextureKey: "treasure-resource" },
            render: { width: 32, height: 32, originX: 0.5, originY: 0.68 },
            roomValueMin: 4,
            roomValueMax: 6,
            reward: { kind: "resource", resourceTypeId: "res1", catalogItemId: "resource-dust-green" }
          },
          {
            weight: 12,
            frame: { atlasKey: "treasure-res-icons-set2", frame: "resource-dust-purple", fallbackTextureKey: "treasure-resource" },
            render: { width: 32, height: 32, originX: 0.5, originY: 0.68 },
            roomValueMin: 5,
            roomValueMax: 7,
            reward: { kind: "resource", resourceTypeId: "res1", catalogItemId: "resource-dust-purple" }
          },
          {
            weight: 6,
            frame: { atlasKey: "treasure-res-icons-set2", frame: "resource-dust-gold", fallbackTextureKey: "treasure-resource" },
            render: { width: 32, height: 32, originX: 0.5, originY: 0.68 },
            roomValueMin: 6,
            roomValueMax: 9,
            reward: { kind: "resource", resourceTypeId: "res1", catalogItemId: "resource-dust-gold" }
          },
          {
            weight: 8,
            frame: { atlasKey: "treasure-res-icons-set2", frame: "resource-flame-blue", fallbackTextureKey: "treasure-resource" },
            render: { width: 30, height: 30, originX: 0.5, originY: 0.68 },
            roomValueMin: 3,
            roomValueMax: 5,
            reward: { kind: "dust" }
          },
          {
            weight: 6,
            frame: { atlasKey: "treasure-res-icons-set2", frame: "resource-shard-gold", fallbackTextureKey: "treasure-resource" },
            render: { width: 26, height: 30, originX: 0.5, originY: 0.68 },
            roomValueMin: 2,
            roomValueMax: 4,
            reward: { kind: "resource", resourceTypeId: "res2", catalogItemId: "resource-gem-gold-octagon" }
          },
          {
            weight: 4,
            frame: { atlasKey: "treasure-res-icons-set1", frame: "magic_dust_single", fallbackTextureKey: "treasure-resource" },
            render: { width: 32, height: 32, originX: 0.5, originY: 0.68 },
            roomValueMin: 2,
            roomValueMax: 4,
            reward: { kind: "dust" }
          }
        ])
      }
    }
  },
  debugGameplayEvents: true,
  gameplayEventJuice: {
    "monster-hit": "fx-juicy_shake_1",
    "hero-damaged": "fx-juicy_shake_1_blod",
    "hero-healed": "fx-juicy_hover_shadow_heal",
    "hero-low-health": "fx-juicy_hover_shadow_blod",
    "treasure-collected": "fx-juicy_hover_shadow_gold",
    "trap-hit": "fx-juicy_shake_1_blod",
    "hero-blocked": "fx-juicy_hover",
  },
  mobileControlsVisual,
  showEventModeProbabilitiesInHud: true,
};

export const MONSTER_GAMEPLAY_CONFIG: Record<MonsterType, MonsterGameplayConfig> = {
  goblin: {
    label: "Goblin",
    baseHp: 24,
    hpPerLevel: 6,
    damage: 1,
    speedMultiplier: 1.05,
    chaseRadius: 210,
    score: 25,
    tint: 0x7ddc3a,
    baseMana: 22,
    manaPerLevel: 3,
    weaponRange: 46,
    weaponCooldown: 980,
    specialRange: 92,
    specialCooldown: 2600,
    specialManaCost: 14,
    weaponDamageMultiplier: 1.05,
    specialDamageMultiplier: 1.65,
    defenseRange: 66,
    defenseArcWidth: 56,
    canShield: true,
    shieldChance: 0.22,
    shieldEfficiency: 0.42,
    specialChance: 0.25,
  },
  slime: {
    label: "Melma",
    baseHp: 36,
    hpPerLevel: 8,
    damage: 1,
    speedMultiplier: 0.72,
    chaseRadius: 160,
    score: 30,
    tint: 0x22c55e,
    baseMana: 12,
    manaPerLevel: 2,
    weaponRange: 40,
    weaponCooldown: 1150,
    specialRange: 76,
    specialCooldown: 3100,
    specialManaCost: 12,
    weaponDamageMultiplier: 0.92,
    specialDamageMultiplier: 1.35,
    defenseRange: 54,
    defenseArcWidth: 48,
    canShield: false,
    shieldChance: 0,
    shieldEfficiency: 0,
    specialChance: 0.16,
  },
  bat: {
    label: "Pipistrello",
    baseHp: 18,
    hpPerLevel: 5,
    damage: 1,
    speedMultiplier: 1.38,
    chaseRadius: 260,
    score: 35,
    tint: 0x8b5cf6,
    baseMana: 28,
    manaPerLevel: 4,
    weaponRange: 42,
    weaponCooldown: 780,
    specialRange: 110,
    specialCooldown: 2200,
    specialManaCost: 16,
    weaponDamageMultiplier: 0.86,
    specialDamageMultiplier: 1.55,
    defenseRange: 58,
    defenseArcWidth: 50,
    canShield: false,
    shieldChance: 0,
    shieldEfficiency: 0,
    specialChance: 0.34,
  },
  skeletor: {
    label: "Skeletor",
    baseHp: 70,
    hpPerLevel: 14,
    damage: 2,
    speedMultiplier: 0.56,
    chaseRadius: 150,
    score: 70,
    tint: 0x94a3b8,
    baseMana: 18,
    manaPerLevel: 3,
    weaponRange: 54,
    weaponCooldown: 1350,
    specialRange: 86,
    specialCooldown: 3600,
    specialManaCost: 18,
    weaponDamageMultiplier: 1.38,
    specialDamageMultiplier: 1.9,
    defenseRange: 74,
    defenseArcWidth: 66,
    canShield: true,
    shieldChance: 0.42,
    shieldEfficiency: 0.68,
    specialChance: 0.18,
  },
};

export const PLAYER_POWER_UPS_CONFIG: PlayerPowerUpConfig[] = [
  {
    id: "speed",
    title: "Super Speed",
    subtitle: "Aumenta la velocità per 10 secondi.",
    icon: { effect: "none", type: "attack", size: "md" },
    price: { frame: { name: "coin_single", effect: "none" }, type: "coin", amount: 300 },
    state: "collect",
    type: "hero",
    stock: 3,
  },
  {
    id: "fuel",
    title: "Fuel Boost",
    subtitle: "Consumo ridotto per la gara.",
    icon: { effect: "none", type: "defense", size: "md" },
    price: { frame: { name: "coin_single", effect: "none" }, type: "coin", amount: 250 },
    state: "collect",
    type: "hero",
    stock: 5,
  },
  {
    id: "shield",
    title: "Gear Shield",
    subtitle: "Protezione da impatti e ostacoli.",
    icon: { effect: "none", type: "potion", size: "md" },
    price: { frame: { name: "coin_single", effect: "none" }, type: "coin", amount: 200 },
    state: "collect",
    type: "hero",
    stock: 2,
  },
];
