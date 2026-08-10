import { inject, Injectable } from "@angular/core";
import { ChestItem, EquipItem, EquipRewardTypeId, HeroItem, MASTERY_TYPES, masteryType, OpenedRewardItem, ResourceItem, ResourceTypeId, RewardItem, RewardItemType, VARIANTS_TYPES, variantsType,  } from "../../../models/game.models";
import { LoggerService } from "../../infrastructure/logging/logger.service";

export type ChestOpeningChanceMap<T extends number> = Partial<Record<T, number>>;

export interface ChestOpeningContext {
	readonly inventoryEquip: () => EquipItem[];
	readonly inventoryHeroes: () => HeroItem[];
	readonly cloneHeroItem: (item: HeroItem) => HeroItem;
	readonly createInventoryCopyId: (baseId: string, existingIds: Set<string>) => string;
	readonly catalogResources: () => ResourceItem[];
	readonly catalogEquip: () => EquipItem[];
	readonly catalogHeroes: () => HeroItem[];
	readonly catalogChestes: () => ChestItem[];
}

@Injectable({ providedIn: "root" })
export class ChestOpeningService {
	private readonly logger = inject(LoggerService);
	/**
		 * Genera le ricompense di un box inventario senza applicare mutazioni allo stato.
		 * Itera la configurazione reward del box e crea le ricompense in base al tipo,
		 * lasciando consumo del box e accredito al servizio orchestratore.
		 */
	openInventoryChest(box: ChestItem, context: ChestOpeningContext): OpenedRewardItem[] {
		this.logger.logDebug('[ChestOpeningService] openInventoryChest', box, context);
		if ((box.stock ?? 0) <= 0) return [];

		const rewards = box.reward.reduce<OpenedRewardItem[]>((collected, reward, rewardIndex) => {
			const quantity = this.rollQuantity(reward.min, reward.max);
			if (quantity <= 0) return collected;

			return [
				...collected,
				...this.collectChestReward(box, reward, quantity, rewardIndex, context),
			];
		}, []);
		this.logger.logDebug('[ChestOpeningService] openInventoryChest', rewards);
		return rewards;
	}

	/**
	 * Genera le ricompense per una singola voce di configurazione del box.
	 * Instrada la raccolta verso risorse, equip o eroi in base al tipo reward e usa un
	 * fallback descrittivo del box quando il tipo non produce item specifici.
	 */
	private collectChestReward(
		box: ChestItem,
		reward: RewardItem,
		quantity: number,
		rewardIndex: number,
		context: ChestOpeningContext,
	): OpenedRewardItem[] {
		const type = reward.type;
		this.logger.logDebug('[ChestOpeningService] collectChestReward', box, reward, quantity, rewardIndex, context);
		if (type === "coins") {
			return [this.createOpenedReward(`${box.id}-coins-${rewardIndex}`, "Coins", "Valuta ottenuta", { name: "coin_single", effect: "none" }, quantity, type)];
		}

		if (type === "gems") {
			return [this.createOpenedReward(`${box.id}-gems-${rewardIndex}`, "Gem", "Valuta premium ottenuta", { name: "crystal_single", effect: "none" }, quantity, type)];
		}

		if (type === "stars") {
			return [this.createOpenedReward(`${box.id}-stars-${rewardIndex}`, "Stars", "Stelle ottenute", { name: "star_single", effect: "none" }, quantity, type)];
		}

		if (type === "hero") return this.collectHeroRewards(box, type, quantity, reward, context);

		if (type === "box") return this.collectChestItemRewards(type, quantity, reward, context);

		if (type === "equip" || type.startsWith("equip:")) {
			const equipType = type.startsWith("equip:") ? type.split(":")[1] as EquipRewardTypeId : undefined;
			return this.collectEquipRewards(type, quantity, reward, context, equipType);
		}

		const resourceType = type.startsWith("resource:") ? type.split(":")[1] as ResourceTypeId : undefined;
		return this.collectResourceReward(type, quantity, reward, context, resourceType);
	}

	/**
	 * Genera ricompense risorsa da un box.
	 * Seleziona risorse compatibili con il tipo reward e crea gli OpenedRewardItem
	 * da mostrare nella schermata di apertura.
	 */
	private collectResourceReward(type: RewardItemType, quantity: number, reward: RewardItem, context: ChestOpeningContext, resourceType?: ResourceTypeId): OpenedRewardItem[] {
		const resources = context.catalogResources();
		const typedResources = resources.filter((item) => resourceType ? item.type.id === resourceType : true);
		const sourcePool = typedResources.length ? typedResources : resources;
		const resourceLevels = [...new Set(sourcePool.map((item) => item.level))].sort((a, b) => a - b);
		const level = this.rollResourceLevel(reward, resourceLevels);
		const exactPool = sourcePool.filter((item) => item.level === level);
		const fallbackPool = sourcePool.filter((item) => item.level <= level);
		const item = this.pickRandom(exactPool.length ? exactPool : fallbackPool.length ? fallbackPool : sourcePool);
		if (!item) return [];

		return [this.createOpenedReward(item.id, item.name, item.type.title, item.frame, quantity, type, item)];
	}

	/**
	 * Genera ricompense equipaggiamento da un box.
	 * Estrae casualmente item dal catalogo mock, assegna id copia univoci e
	 * costruisce le righe reward per la UI.
	 */
	private collectEquipRewards(type: RewardItemType, quantity: number, reward: RewardItem, context: ChestOpeningContext, equipType?: EquipRewardTypeId): OpenedRewardItem[] {
		const existingIds = new Set(context.inventoryEquip().map((current) => current.id));

		return Array.from({ length: quantity }, (_, index) => {
			const variant = this.rollVariant(reward);
			const mastery = this.rollMastery(reward);
			const equipCatalog = context.catalogEquip();
			const pool = equipCatalog.filter((item) =>
				(equipType ? item.type.id === equipType : item.id !== "none") &&
				item.variant <= variant &&
				item.mastery <= mastery,
			);
			const item = this.pickRandom(pool.length ? pool : equipCatalog.filter((current) => equipType ? current.type.id === equipType : current.id !== "none"));
			if (!item) return null;

			const copy = { ...item, id: context.createInventoryCopyId(item.id, existingIds) };
			existingIds.add(copy.id);
			return this.createOpenedReward(`${copy.id}-${index}`, item.name, item.type.title, item.frame, 1, type, copy);
		}).filter((item): item is OpenedRewardItem => item !== null);
	}
	
	private collectChestItemRewards(type: RewardItemType, quantity: number, reward: RewardItem, context: ChestOpeningContext): OpenedRewardItem[] {
		const boxesCatalog = context.catalogChestes();
		return Array.from({ length: quantity }, (_, index) => {
			const mastery = this.rollMastery(reward);
			const pool = boxesCatalog.filter((box) => box.mastery === mastery);
			const item = this.pickRandom(pool.length ? pool : boxesCatalog);
			if (!item) return null;
			return this.createOpenedReward(`${item.id}-${index}`, item.name, item.type.title, item.frame, 1, type, { ...item });
		}).filter((item): item is OpenedRewardItem => item !== null);
	}

	/**
	 * Genera ricompense eroe da un box.
	 * Seleziona eroi casuali dal catalogo corrente, li clona per evitare mutazioni condivise,
	 * restituisce il riepilogo visuale delle ricompense.
	 */
	private collectHeroRewards(box: ChestItem, type: RewardItemType, quantity: number, reward: RewardItem, context: ChestOpeningContext): OpenedRewardItem[] {
		const ownedIds = new Set(context.inventoryHeroes().map((item) => item.id));

		return Array.from({ length: quantity }, (_, index) => {
			const variant = this.rollVariant(reward);
			const mastery = this.rollMastery(reward);
			const heroesCatalog = context.catalogHeroes();
			const exactPool = heroesCatalog.filter((hero) => !ownedIds.has(hero.id) && hero.variant === variant && hero.mastery === mastery && hero.level === box.level);
			const pool = heroesCatalog.filter((hero) => !ownedIds.has(hero.id) && hero.variant <= variant && hero.mastery <= mastery);
			const item = this.pickRandom(exactPool.length ? exactPool : pool.length ? pool : heroesCatalog.filter((hero) => !ownedIds.has(hero.id)));
			if (!item) return null;

			ownedIds.add(item.id);
			const copy = context.cloneHeroItem(item);
			return this.createOpenedReward(`${item.id}-${index}`, item.title, "Eroe sbloccato", item.frame, 1, type, copy);
		}).filter((item): item is OpenedRewardItem => item !== null);
	}

	private rollQuantity(min: number, max: number): number {
		const safeMin = Math.max(0, Math.min(min, max));
		const safeMax = Math.max(safeMin, max);

		if (safeMax <= 1 && safeMin === 0) {
			return this.randomFloat() < safeMax ? 1 : 0;
		}

		const minInt = Math.ceil(safeMin);
		const maxInt = Math.floor(safeMax);
		if (maxInt < minInt) {
			return this.randomFloat() < safeMax - Math.floor(safeMax) ? Math.ceil(safeMax) : Math.floor(safeMax);
		}

		return this.randomInt(minInt, maxInt);
	}

	private rollVariant(reward: RewardItem): variantsType {
		return this.pickWeighted(reward.variantChances, VARIANTS_TYPES, 0);
	}

	private rollMastery(reward: RewardItem): masteryType {
		return this.pickWeighted(reward.masteryChances, MASTERY_TYPES, 1);
	}

	private rollResourceLevel(reward: RewardItem, levels: readonly number[]): number {
		return this.pickWeighted(reward.resourceLevelChances, levels, levels[0] ?? 1);
	}

	private pickWeighted<T extends number>(chances: Partial<Record<T, number>> | undefined, values: readonly T[], fallback: T): T {
		if (!chances) return fallback;
		const weighted = values.map((value) => ({ value, weight: Math.max(0, chances[value] ?? 0) })).filter(({ weight }) => weight > 0);
		const total = weighted.reduce((sum, item) => sum + item.weight, 0);
		if (total <= 0) return fallback;
		let roll = this.randomFloat() * total;
		for (const item of weighted) {
			roll -= item.weight;
			if (roll <= 0) return item.value;
		}
		return weighted[weighted.length - 1]?.value ?? fallback;
	}

	private createOpenedReward(id: string, title: string, subtitle: string, frame: OpenedRewardItem["frame"], quantity: number, rewardType: RewardItemType, item?: OpenedRewardItem["item"]): OpenedRewardItem {
		return { id, title, subtitle, frame, quantity, rewardType, item };
	}

	private pickRandom<T>(items: T[]): T | null {
		if (!items.length) return null;
		return items[this.randomInt(0, items.length - 1)];
	}

	private randomInt(min: number, max: number): number {
		return crypto.getRandomValues(new Uint32Array(1))[0] % (max - min + 1) + min;
	}

	private randomFloat(): number {
		return crypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff;
	}
}
