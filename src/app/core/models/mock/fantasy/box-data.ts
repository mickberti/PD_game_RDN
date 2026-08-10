import { GameUtilsService } from "../../../services/ui/formatting/game-utils.service";
import { ChestItem, ChestType, ChestTypeId } from "../../game.models";

export const chestTypesMock: ChestType[] = [
  {
    id: "box1",
    title: "Scrigni Base",
    frame: { name: "chest-royal-blue", effect: "none" },
  },
  {
    id: "box2",
    title: "Scrigni Rari",
    frame: { name: "chest-crystal-purple", effect: "none" },
  },
];

export const boxTypeById: Record<ChestTypeId, ChestType> = chestTypesMock.reduce(
  (acc, type) => {
    acc[type.id] = type;
    return acc;
  },
  {} as Record<ChestTypeId, ChestType>,
);


const resourceLevelChancesByChestLevel: Record<number, Partial<Record<number, number>>> = {
  1: { 1: 85, 2: 15 },
  2: { 1: 55, 2: 35, 3: 10 },
  3: { 1: 35, 2: 30, 3: 25, 4: 10 },
  4: { 1: 20, 2: 25, 3: 30, 4: 20, 5: 5 },
  5: { 1: 10, 2: 20, 3: 30, 4: 25, 5: 15 },
};

// -------------------------------------
// Export finale: 5 varianti per ciascuno dei box
// Totale = 5 ChestItem
// -------------------------------------

export const chestItemsMock: ChestItem[] = [
	{
	   id: "box-wooden-blue",
	   itemType: 'chest',
	   name: "Scrigno Blu",
	   type: boxTypeById.box1,
	   level: 1,
		mastery: 1,
	   description: "Uno scrigno iniziale con risorse, monete e una piccola chance eroe.",
	   reward: [
	     { type: "resource:res1", min: 5, max: 10, resourceLevelChances: resourceLevelChancesByChestLevel[1] },
	     { type: "coins", min: 80, max: 160 },
	     { type: "equip", min: 0, max: 0.12, variantChances: { 0: 75, 1: 20, 2: 5 }, masteryChances: { 1: 60, 2: 25, 3: 15 } },
	   ],
	   frame: { name: "chest-royal-blue", effect: "none" },
	 },
	 {
	    id: "chest-gift-pink",
	    itemType: 'chest',
	    name: "Scrigno rosa",
	    type: boxTypeById.box1,
	    level: 1,
	 	mastery: 1,
	    description: "Uno scrigno iniziale con risorse, monete e una piccola chance eroe.",
	    reward: [
	      { type: "resource:res1", min: 5, max: 10, resourceLevelChances: resourceLevelChancesByChestLevel[1] },
	      { type: "coins", min: 80, max: 160 },
	      { type: "equip", min: 0, max: 0.12, variantChances: { 0: 75, 1: 20, 2: 5 }, masteryChances: { 1: 60, 2: 25, 3: 15 } },
	    ],
	    frame: { name: "chest-gift-pink", effect: "none" },
	  },
	 {
	   id: "box-nature-green",
	   itemType: 'chest',
	   name: "Scrigno Verde",
	   type: boxTypeById.box1,
	   level: 2,
		mastery: 2,
	   description: "Scrigno naturale con gemme risorsa e difese base.",
	   reward: [
	     { type: "resource:res2", min: 3, max: 8, resourceLevelChances: resourceLevelChancesByChestLevel[2] },
	     { type: "stars", min: 1, max: 3 },
	     { type: "equip", min: 0, max: 0.15, variantChances: { 0: 70, 1: 25, 2: 5 }, masteryChances: { 1: 55, 2: 30, 3: 15 } },
	  { type: "hero", min: 0, max: 0.06, variantChances: { 0: 80, 1: 18, 2: 2 }, masteryChances: { 1: 70, 2: 20, 3: 10 } },
	   ],
	   frame: { name: "chest-nature-green", effect: "none" },
	 },
	 {
	   id: "chest-frost-crystal",
	   itemType: 'chest',
	   name: "Scrigno cristallo",
	   type: boxTypeById.box1,
	   level: 2,
	 mastery: 2,
	   description: "Scrigno cristallo con gemme risorsa e difese base.",
	   reward: [
	     { type: "resource:res2", min: 3, max: 8, resourceLevelChances: resourceLevelChancesByChestLevel[2] },
	     { type: "stars", min: 1, max: 3 },
	     { type: "equip", min: 0, max: 0.15, variantChances: { 0: 70, 1: 25, 2: 5 }, masteryChances: { 1: 55, 2: 30, 3: 15 } },
	  { type: "hero", min: 0, max: 0.06, variantChances: { 0: 80, 1: 18, 2: 2 }, masteryChances: { 1: 70, 2: 20, 3: 10 } },
	   ],
	   frame: { name: "chest-frost-crystal", effect: "none" },
	 },
	 {
	   id: "box-crystal-purple",
	   itemType: 'chest',
	   name: "Scrigno Viola",
	   type: boxTypeById.box2,
	   level: 3,
		mastery: 3,
	   description: "Cristallo raro con valuta premium, risorse e equipaggiamento.",
	   reward: [
	     { type: "gems", min: 180, max: 500 },
	     { type: "resource", min: 20, max: 50, resourceLevelChances: resourceLevelChancesByChestLevel[3] },
	     { type: "equip", min: 0, max: 0.2, variantChances: { 0: 55, 1: 35, 2: 10 }, masteryChances: { 1: 35, 2: 30, 3: 20, 4: 10, 5: 5 } },
	     { type: "hero", min: 0, max: 0.12, variantChances: { 0: 60, 1: 30, 2: 10 }, masteryChances: { 1: 45, 2: 30, 3: 15, 4: 10 } },
	   ],
	   frame: { name: "chest-crystal-purple", effect: "none" },
	 }	,
	 {
	   id: "chest-wizard-purple",
	   itemType: 'chest',
	   name: "Scrigno magico",
	   type: boxTypeById.box2,
	   level: 3,
	 mastery: 3,
	   description: "Scrigno magico con valuta premium, risorse e equipaggiamento.",
	   reward: [
	     { type: "gems", min: 180, max: 500 },
	     { type: "resource", min: 20, max: 50, resourceLevelChances: resourceLevelChancesByChestLevel[3] },
		 { type: "resource", min: 20, max: 80, resourceLevelChances: resourceLevelChancesByChestLevel[3] },
		 { type: "resource", min: 20, max: 100, resourceLevelChances: resourceLevelChancesByChestLevel[3] },
	     { type: "equip", min: 0, max: 0.2, variantChances: { 0: 55, 1: 35, 2: 10 }, masteryChances: { 1: 35, 2: 30, 3: 20, 4: 10, 5: 5 } },
	   ],
	   frame: { name: "chest-wizard-purple", effect: "none" },
	 }	,
	 {
	   id: "chest-skull-dark",
	   itemType: 'chest',
	   name: "Scrigno teschio nero",
	   type: boxTypeById.box2,
	   level: 4,
	 mastery: 4,
	   description: "Scrigno di teschio nero con ricompense multiple e oggetti specifici.",
	   reward: [
	     { type: "coins", min: 220, max: 800 },
	     { type: "gems", min: 40, max: 70 },
	     { type: "equip:weapon", min: 0, max: 0.25 },
	     { type: "equip:helmet", min: 0, max: 0.25 },
	     { type: "hero", min: 0, max: 0.18, variantChances: { 0: 45, 1: 40, 2: 15 }, masteryChances: { 2: 35, 3: 30, 4: 20, 5: 15 } },
	   ],
	   frame: { name: "chest-skull-dark", effect: "none" },
	 },
	 {
	   id: "chest-red-gold",
	   itemType: 'chest',
	   name: "Scrigno oro rosso",
	   type: boxTypeById.box2,
	   level: 4,
	 mastery: 4,
	   description: "Scrigno di oro rosso con ricompense multiple e oggetti specifici.",
	   reward: [
	     { type: "coins", min: 220, max: 800 },
	     { type: "gems", min: 40, max: 70 },
	     { type: "equip:weapon", min: 0, max: 0.25 },
	     { type: "equip:helmet", min: 0, max: 0.25 },
	     { type: "hero", min: 0, max: 0.18, variantChances: { 0: 45, 1: 40, 2: 15 }, masteryChances: { 2: 35, 3: 30, 4: 20, 5: 15 } },
	   ],
	   frame: { name: "chest-red-gold", effect: "none" },
	 },
	  {
	    id: "box-dragon-fire",
	    itemType: 'chest',
	    name: "Scrigno Drago",
	    type: boxTypeById.box2,
	    level: 5,
		mastery: 5,
	    description: "Scrigno draconico con ricompense multiple e oggetti specifici.",
	    reward: [
	      { type: "coins", min: 220, max: 800 },
	      { type: "gems", min: 40, max: 70 },
	      { type: "equip:weapon", min: 0, max: 0.25 },
	      { type: "equip:helmet", min: 0, max: 0.25 },
	      { type: "hero", min: 0, max: 0.18, variantChances: { 0: 45, 1: 40, 2: 15 }, masteryChances: { 2: 35, 3: 30, 4: 20, 5: 15 } },
	    ],
	    frame: { name: "chest-dragon-fire", effect: "none" },
	  },
	 {
	   id: "box-angel-fire",
	   itemType: 'chest',
	   name: "Scrigno Angelo",
	   type: boxTypeById.box2,
	   level: 5,
		mastery: 5,
	   description: "Scrigno angelico con ricompense multiple e oggetti specifici.",
	   reward: [
	     { type: "coins", min: 220, max: 1000 },
	     { type: "gems", min: 40, max: 100 },
	     { type: "equip:weapon", min: 0, max: 0.3 },
	     { type: "equip:helmet", min: 0, max: 0.3 },
	     { type: "hero", min: 0, max: 0.25, variantChances: { 0: 45, 1: 40, 2: 15 }, masteryChances: { 2: 35, 3: 30, 4: 20, 5: 15 } },
	   ],
	   frame: { name: "chest-angel-gold", effect: "none" },
	 },
];

// -------------------------------------
 // Risorse raggruppate per tipoo
 // -------------------------------------
 
 export const chestItemsByTypeMock = chestItemsMock.reduce<
   Record<ChestTypeId, ChestItem[]>
 >(
   (acc, item) => {
     acc[item.type.id] ??= [];
     acc[item.type.id].push(item);
     return acc;
   },
   {} as Record<ChestTypeId, ChestItem[]>
 );
 
 // -------------------------------------
 // Risorse raggruppate per livello
 // -------------------------------------

 export const getChestItemsByLevel = (
   level: number,
   chests: ChestItem[] = chestItemsMock
 ): ChestItem[] => {
   return chests
     .filter((item) => item.level <= level)
     .sort((a, b) => {
       if (a.level !== b.level) {
         return a.level - b.level;
       }

       return a.name.localeCompare(b.name);
     });
 };
 
 // -------------------------------------
 // Risorse filtrate per livello e tipo
 // -------------------------------------
 
 export const getChestItemsByLevelAndType = (
   level: number,
   typeId?: ChestTypeId,
   chests: ChestItem[] = chestItemsMock
 ): ChestItem[] => {
   return chests
     .filter(( item) => {
       const matchLevel = item.level <= level;
       const matchType = typeId ? item.type.id === typeId : true;

       return matchLevel && matchType;
     })
     .sort((a, b) => {
       if (a.type.id !== b.type.id) {
         return a.type.id.localeCompare(b.type.id);
       }

       if (a.level !== b.level) {
         return a.level - b.level;
       }

       return a.name.localeCompare(b.name);
     });
 };
 
 
 // -------------------------------------
 // Risorse recuperate casualmente
 // -------------------------------------

 export const getRandomChestItems = (
   count: number,
   chests: ChestItem[] = chestItemsMock
 ): ChestItem[] => {
   return GameUtilsService.getRandomItemsFromList<ChestItem>(chests, count);
 };
 
 /*
 ESEMPI
 const randomChests = getRandomChestItems(3);

 const availableChests = getChestItemsByLevel(3);
 const randomAvailableChests = getRandomChestItems(2, availableChests);

 const onlyDust = getChestItemsByLevelAndType(5, 'res1');
 const randomDust = getRandomChestItems(2, onlyDust);
 */
