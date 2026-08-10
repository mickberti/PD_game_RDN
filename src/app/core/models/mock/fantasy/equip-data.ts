import { GameUtilsService } from "../../../services/ui/formatting/game-utils.service";
import { BonusItem, BonusType, ComponentEffect, EquipItem, EquipType, masteryType, variantsType } from "../../game.models";
import { createEquipDurationProgress, createEquipExperienceProgress } from "../../../services/progression/level-progression.service";



export const equipTypesMock: EquipType[] = [
  { id: "weapon", title: "Armi", frameName: "equip-type-weapon" },
  { id: "shield", title: "Scudi", frameName: "equip-type-shield" },
  { id: "armor", title: "Armature", frameName: "equip-type-armor" },
  { id: "helmet", title: "Elmi", frameName: "equip-type-helmet" },
  { id: "ring", title: "Anelli", frameName: "equip-type-ring" },
  { id: "artifact", title: "Artefatti", frameName: "equip-type-staff" },
];

const equipTypeById = equipTypesMock.reduce(
  (acc, type) => {
    acc[type.id] = type;
    return acc;
  },
  {} as Record<EquipType['id'], EquipType>
);

export const defaultEquip: EquipItem = {
    itemType: 'equip',
    id: "none",
    name: "Nessuna Equipaggiamento",
    type: equipTypeById["weapon"],
    level: 0,
	mastery: 0,
    duration: createEquipDurationProgress(100),
	variant: 0,
	attack: 0,
	defense: 0,
	velocita: 0,
    effect: "Nessun effetto speciale",
    experience: createEquipExperienceProgress(1, 0),
    bonus: {type: 'none', title:'', value: 0, malus: false},
	frame: { name: "equip-default", effect: "none" },
  };
  
  export const equipItemsMock: EquipItem[] = [
    {
      id: "weapon-sword-bronze",
      itemType: 'equip',
      name: "Spada di Bronzo",
      type: equipTypeById["weapon"],
	  level: 1,
      mastery: 1,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 0,
	  velocita: 0,
      effect: "Nessun effetto speciale",
      experience: createEquipExperienceProgress(1, 1),
	  bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "weapon-sword-bronze", effect: "none" },
    },
    {
      id: "weapon-sword-steel-blue",
      itemType: 'equip',
      name: "Spada d'Acciaio Blu",
      type: equipTypeById["weapon"],
	  level: 1,
      mastery: 2,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 0,
	  velocita: 0,
      effect: "Affondo preciso",
      experience: createEquipExperienceProgress(1, 1),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "weapon-sword-steel-blue", effect: "none" },
    },
    {
      id: "weapon-sword-gold-red",
      itemType: 'equip',
      name: "Spada Reale Dorata",
      type: equipTypeById["weapon"],
	  level: 1,
      mastery: 3,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 0,
	  velocita: 0,
      effect: "Colpo critico",
      experience: createEquipExperienceProgress(1, 1),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "weapon-sword-gold-red", effect: "none" },
    },
    {
      id: "weapon-dagger-green",
      itemType: 'equip',
      name: "Pugnale Verde",
      type: equipTypeById["weapon"],
	  level: 1,
      mastery: 4,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 0,
	  velocita: 0,
      effect: "Attacco rapido",
      experience: createEquipExperienceProgress(1, 2),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "weapon-dagger-green", effect: "none" },
    },
    {
      id: "weapon-crystal-sword-blue",
      itemType: 'equip',
      name: "Spada di Cristallo",
      type: equipTypeById["weapon"],
	  level: 1,
      mastery: 5,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 0,
	  velocita: 0,
      effect: "Penetrazione magica",
      experience: createEquipExperienceProgress(1, 2),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "weapon-crystal-sword-blue", effect: "none" },
    },
    {
      id: "weapon-sword-purple",
      itemType: 'equip',
      name: "Lama Viola",
      type: equipTypeById["weapon"],
	  level: 1,
      mastery: 6,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 0,
	  velocita: 0,
      effect: "Danno oscuro",
      experience: createEquipExperienceProgress(1, 3),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "weapon-sword-purple", effect: "none" },
    },
    {
      id: "weapon-fire-sword",
      itemType: 'equip',
      name: "Spada del Fuoco",
      type: equipTypeById["weapon"],
	  level: 1,
      mastery: 7,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 0,
	  velocita: 0,
      effect: "Bruciatura",
      experience: createEquipExperienceProgress(1, 3),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "weapon-fire-sword", effect: "none" },
    },
    {
      id: "weapon-ice-sword",
      itemType: 'equip',
      name: "Spada del Gelo",
      type: equipTypeById["weapon"],
	  level: 1,
      mastery: 8,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 0,
	  velocita: 0,
      effect: "Rallentamento",
      experience: createEquipExperienceProgress(1, 4),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "weapon-ice-sword", effect: "none" },
    },
    {
      id: "weapon-nature-sword",
      itemType: 'equip',
      name: "Spada della Natura",
      type: equipTypeById["weapon"],
	  level: 1,
      mastery: 9,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 0,
	  velocita: 0,
      effect: "Rigenerazione",
      experience: createEquipExperienceProgress(1, 4),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "weapon-nature-sword", effect: "none" },
    },
    {
      id: "weapon-holy-spear",
      itemType: 'equip',
      name: "Lancia Sacra",
      type: equipTypeById["weapon"],
	  level: 1,
      mastery: 10,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 0,
	  velocita: 0,
      effect: "Luce sacra",
      experience: createEquipExperienceProgress(1, 5),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "weapon-holy-spear", effect: "none" },
    },
    {
      id: "shield-round-wood",
      itemType: 'equip',
      name: "Scudo Rotondo di Legno",
      type: equipTypeById["shield"],
	  level: 1,
      mastery: 1,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Assorbimento leggero",
      experience: createEquipExperienceProgress(1, 1),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "shield-round-wood", effect: "none" },
    },
    {
      id: "shield-lion-blue",
      itemType: 'equip',
      name: "Scudo del Leone Blu",
      type: equipTypeById["shield"],
	  level: 1,
	        mastery: 2,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Provocazione",
      experience: createEquipExperienceProgress(1, 1),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "shield-lion-blue", effect: "none" },
    },
    {
      id: "shield-sun-red",
      itemType: 'equip',
      name: "Scudo del Sole Rosso",
      type: equipTypeById["shield"],
	  level: 1,
	        mastery: 3,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Resistenza al fuoco",
      experience: createEquipExperienceProgress(1, 1),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "shield-sun-red", effect: "none" },
    },
    {
      id: "shield-stag-green",
      itemType: 'equip',
      name: "Scudo del Cervo Verde",
      type: equipTypeById["shield"],
	  level: 1,
	        mastery: 4,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Schivata",
      experience: createEquipExperienceProgress(1, 1),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "shield-stag-green", effect: "none" },
    },
    {
      id: "shield-eagle-blue",
      itemType: 'equip',
      name: "Scudo dell'Aquila",
      type: equipTypeById["shield"],
	  level: 1,
	        mastery: 5,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Riflessi",
      experience: createEquipExperienceProgress(1, 1),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "shield-eagle-blue", effect: "none" },
    },
    {
      id: "shield-skull-purple",
      itemType: 'equip',
      name: "Scudo del Teschio Viola",
      type: equipTypeById["shield"],
	  level: 1,
	        mastery: 6,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Danno oscuro",
      experience: createEquipExperienceProgress(1, 2),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "shield-skull-purple", effect: "none" },
    },
    {
      id: "shield-dragon-black",
      itemType: 'equip',
      name: "Scudo del Drago Nero",
      type: equipTypeById["shield"],
	  level: 1,
	        mastery: 7,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Barriera draconica",
      experience: createEquipExperienceProgress(1, 2),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "shield-dragon-black", effect: "none" },
    },
    {
      id: "shield-frost-blue",
      itemType: 'equip',
      name: "Scudo del Gelo",
      type: equipTypeById["shield"],
	  level: 1,
	        mastery: 8,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Resistenza al gelo",
      experience: createEquipExperienceProgress(1, 2),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "shield-frost-blue", effect: "none" },
    },
    {
      id: "shield-tree-green",
      itemType: 'equip',
      name: "Scudo dell'Albero",
      type: equipTypeById["shield"],
	  level: 1,
	        mastery: 9,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Cura passiva",
      experience: createEquipExperienceProgress(1, 3),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "shield-tree-green", effect: "none" },
    },
    {
      id: "shield-cross-light",
      itemType: 'equip',
      name: "Scudo della Croce Luminosa",
      type: equipTypeById["shield"],
	  level: 1,
	        mastery: 10,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Protezione sacra",
      experience: createEquipExperienceProgress(1, 3),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "shield-cross-light", effect: "none" },
    },
    {
      id: "armor-leather-brown",
      itemType: 'equip',
      name: "Armatura di Cuoio",
      type: equipTypeById["armor"],
	  level: 1,
	        mastery: 1,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 2,
	  velocita: 0,
      effect: "Mobilità",
      experience: createEquipExperienceProgress(1, 1),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "armor-leather-brown", effect: "none" },
    },
    {
      id: "armor-steel-blue",
      itemType: 'equip',
      name: "Armatura d'Acciaio Blu",
      type: equipTypeById["armor"],
	  level: 1,
	        mastery: 2,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 2,
	  velocita: 0,
      effect: "Affondo preciso",
      experience: createEquipExperienceProgress(1, 1),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "armor-steel-blue", effect: "none" },
    },
    {
      id: "armor-royal-red",
      itemType: 'equip',
      name: "Armatura Reale Rossa",
      type: equipTypeById["armor"],
	  level: 1,
	        mastery: 3,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 2,
	  velocita: 0,
      effect: "Autorità",
      experience: createEquipExperienceProgress(1, 1),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "armor-royal-red", effect: "none" },
    },
    {
      id: "armor-ranger-green",
      itemType: 'equip',
      name: "Armatura del Ranger",
      type: equipTypeById["armor"],
	  level: 1,
	        mastery: 4,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 2,
	  velocita: 0,
      effect: "Precisione",
      experience: createEquipExperienceProgress(1, 2),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "armor-ranger-green", effect: "none" },
    },
    {
      id: "armor-paladin-blue",
      itemType: 'equip',
      name: "Armatura del Paladino",
      type: equipTypeById["armor"],
	  level: 1,
	        mastery: 5,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 2,
	  velocita: 0,
      effect: "Scudo sacro",
      experience: createEquipExperienceProgress(1, 2),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "armor-paladin-blue", effect: "none" },
    },
    {
      id: "armor-necro-purple",
      itemType: 'equip',
      name: "Armatura Necromantica",
      type: equipTypeById["armor"],
	  level: 1,
	        mastery: 6,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 2,
	  velocita: 0,
      effect: "Danno oscuro",
      experience: createEquipExperienceProgress(1, 3),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "armor-necro-purple", effect: "none" },
    },
    {
      id: "armor-demon-black",
      itemType: 'equip',
      name: "Armatura Demoniaca",
      type: equipTypeById["armor"],
	  level: 1,
	        mastery: 7,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 2,
	  velocita: 0,
      effect: "Ira",
      experience: createEquipExperienceProgress(1, 3),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "armor-demon-black", effect: "none" },
    },
    {
      id: "armor-frost-blue",
      itemType: 'equip',
      name: "Armatura del Gelo",
      type: equipTypeById["armor"],
	  level: 1,
	        mastery: 8,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 2,
	  velocita: 0,
      effect: "Resistenza al gelo",
      experience: createEquipExperienceProgress(1, 4),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "armor-frost-blue", effect: "none" },
    },
    {
      id: "armor-druid-green",
      itemType: 'equip',
      name: "Armatura del Druido",
      type: equipTypeById["armor"],
	  level: 1,
	        mastery: 9,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 2,
	  velocita: 0,
      effect: "Crescita naturale",
      experience: createEquipExperienceProgress(1, 4),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "armor-druid-green", effect: "none" },
    },
    {
      id: "armor-holy-white",
      itemType: 'equip',
      name: "Armatura Sacra",
      type: equipTypeById["armor"],
	  level: 1,
	        mastery: 10,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 2,
	  velocita: 0,
      effect: "Luce sacra",
      experience: createEquipExperienceProgress(1, 5),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "armor-holy-white", effect: "none" },
    },
    {
      id: "ring-ruby-gold",
      itemType: 'equip',
      name: "Anello del Rubino",
      type: equipTypeById["ring"],
	  level: 1,
	        mastery: 1,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Colpo critico",
      experience: createEquipExperienceProgress(1, 8),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "ring-ruby-gold", effect: "none" },
    },
    {
      id: "ring-sapphire-silver",
      itemType: 'equip',
      name: "Anello dello Zaffiro",
      type: equipTypeById["ring"],
	  level: 1,
	        mastery: 2,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Focus",
      experience: createEquipExperienceProgress(1, 11),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "ring-sapphire-silver", effect: "none" },
    },
    {
      id: "ring-emerald-gold",
      itemType: 'equip',
      name: "Anello dello Smeraldo",
      type: equipTypeById["ring"],
	  level: 1,
	        mastery: 3,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Colpo critico",
      experience: createEquipExperienceProgress(1, 14),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "ring-emerald-gold", effect: "none" },
    },
    {
      id: "ring-amethyst-silver",
      itemType: 'equip',
      name: "Anello dell'Ametista",
      type: equipTypeById["ring"],
	  level: 1,
	        mastery: 4,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Arcano",
      experience: createEquipExperienceProgress(1, 17),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "ring-amethyst-silver", effect: "none" },
    },
    {
      id: "ring-aqua-gold",
      itemType: 'equip',
      name: "Anello Acquamarina",
      type: equipTypeById["ring"],
	  level: 1,
	        mastery: 5,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Colpo critico",
      experience: createEquipExperienceProgress(1, 20),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "ring-aqua-gold", effect: "none" },
    },
    {
      id: "ring-violet-shadow",
      itemType: 'equip',
      name: "Anello dell'Ombra Viola",
      type: equipTypeById["ring"],
	  level: 1,
	        mastery: 6,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Ombra",
      experience: createEquipExperienceProgress(1, 23),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "ring-violet-shadow", effect: "none" },
    },
    {
      id: "ring-fire-gold",
      itemType: 'equip',
      name: "Anello del Fuoco",
      type: equipTypeById["ring"],
	  level: 1,
	        mastery: 7,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Colpo critico",
      experience: createEquipExperienceProgress(1, 26),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "ring-fire-gold", effect: "none" },
    },
    {
      id: "ring-ice-silver",
      itemType: 'equip',
      name: "Anello del Gelo",
      type: equipTypeById["ring"],
	  level: 1,
	        mastery: 8,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Rallentamento",
      experience: createEquipExperienceProgress(1, 29),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "ring-ice-silver", effect: "none" },
    },
    {
      id: "ring-nature-gold",
      itemType: 'equip',
      name: "Anello della Natura",
      type: equipTypeById["ring"],
	  level: 1,
	        mastery: 9,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Colpo critico",
      experience: createEquipExperienceProgress(1, 32),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "ring-nature-gold", effect: "none" },
    },
    {
      id: "ring-light-gold",
      itemType: 'equip',
      name: "Anello della Luce",
      type: equipTypeById["ring"],
	  level: 1,
	        mastery: 10,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Colpo critico",
      experience: createEquipExperienceProgress(1, 35),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "ring-light-gold", effect: "none" },
    },
    {
      id: "helmet-bronze",
      itemType: 'equip',
      name: "Elmo di Bronzo",
      type: equipTypeById["helmet"],
	  level: 1,
	        mastery: 1,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Nessun effetto speciale",
      experience: createEquipExperienceProgress(1, 3),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "helmet-bronze", effect: "none" },
    },
    {
      id: "helmet-steel-plume-blue",
      itemType: 'equip',
      name: "Elmo d'Acciaio con Piuma Blu",
      type: equipTypeById["helmet"],
	  level: 1,
	        mastery: 2,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Affondo preciso",
      experience: createEquipExperienceProgress(1, 4),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "helmet-steel-plume-blue", effect: "none" },
    },
    {
      id: "helmet-gold-plume-red",
      itemType: 'equip',
      name: "Elmo Dorato con Piuma Rossa",
      type: equipTypeById["helmet"],
	  level: 1,
	        mastery: 3,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Colpo critico",
      experience: createEquipExperienceProgress(1, 5),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "helmet-gold-plume-red", effect: "none" },
    },
    {
      id: "helmet-hood-green",
      itemType: 'equip',
      name: "Cappuccio Verde",
      type: equipTypeById["helmet"],
	  level: 1,
	        mastery: 4,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Furtività",
      experience: createEquipExperienceProgress(1, 6),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "helmet-hood-green", effect: "none" },
    },
    {
      id: "helmet-royal-blue",
      itemType: 'equip',
      name: "Elmo Reale Blu",
      type: equipTypeById["helmet"],
	  level: 1,
	        mastery: 5,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Autorità",
      experience: createEquipExperienceProgress(1, 7),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "helmet-royal-blue", effect: "none" },
    },
    {
      id: "helmet-horned-purple",
      itemType: 'equip',
      name: "Elmo Cornuto Viola",
      type: equipTypeById["helmet"],
	  level: 1,
	        mastery: 6,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Danno oscuro",
      experience: createEquipExperienceProgress(1, 8),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "helmet-horned-purple", effect: "none" },
    },
    {
      id: "helmet-demon-red",
      itemType: 'equip',
      name: "Elmo Demoniaco Rosso",
      type: equipTypeById["helmet"],
	  level: 1,
	        mastery: 7,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Ira",
      experience: createEquipExperienceProgress(1, 9),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "helmet-demon-red", effect: "none" },
    },
    {
      id: "helmet-frost-blue",
      itemType: 'equip',
      name: "Elmo del Gelo",
      type: equipTypeById["helmet"],
	  level: 1,
	        mastery: 8,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Resistenza al gelo",
      experience: createEquipExperienceProgress(1, 10),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "helmet-frost-blue", effect: "none" },
    },
    {
      id: "helmet-nature-gold",
      itemType: 'equip',
      name: "Elmo della Natura",
      type: equipTypeById["helmet"],
	  level: 1,
	        mastery: 9,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Colpo critico",
      experience: createEquipExperienceProgress(1, 11),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "helmet-nature-gold", effect: "none" },
    },
    {
      id: "helmet-winged-light",
      itemType: 'equip',
      name: "Elmo Alato della Luce",
      type: equipTypeById["helmet"],
	  level: 1,
	        mastery: 10,
      duration: createEquipDurationProgress(100),
	  variant: 0,
	  attack: 0,
	  defense: 1,
	  velocita: 0,
      effect: "Purificazione",
      experience: createEquipExperienceProgress(1, 12),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "helmet-winged-light", effect: "none" },
    },
    {
      id: "item-red-potion",
      itemType: 'equip',
      name: "Pozione Rossa",
      type: equipTypeById["artifact"],
	  level: 1,
	        mastery: 1,
      duration: createEquipDurationProgress(45),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Uso consumabile",
      experience: createEquipExperienceProgress(1, 5),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "item-red-potion", effect: "none" },
    },
    {
      id: "item-blue-amulet",
      itemType: 'equip',
      name: "Amuleto Blu",
      type: equipTypeById["artifact"],
	  level: 1,
	        mastery: 2,
      duration: createEquipDurationProgress(60),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Protezione magica",
      experience: createEquipExperienceProgress(1, 7),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "item-blue-amulet", effect: "none" },
    },
    {
      id: "item-green-potion",
      itemType: 'equip',
      name: "Pozione Verde",
      type: equipTypeById["artifact"],
	  level: 1,
	        mastery: 3,
      duration: createEquipDurationProgress(75),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Uso consumabile",
      experience: createEquipExperienceProgress(1, 9),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "item-green-potion", effect: "none" },
    },
    {
      id: "item-magic-book",
      itemType: 'equip',
      name: "Libro Magico",
      type: equipTypeById["artifact"],
	  level: 1,
	        mastery: 4,
      duration: createEquipDurationProgress(90),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Sapienza",
      experience: createEquipExperienceProgress(1, 11),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "item-magic-book", effect: "none" },
    },
    {
      id: "item-golden-chalice",
      itemType: 'equip',
      name: "Calice Dorato",
      type: equipTypeById["artifact"],
	  level: 1,
	        mastery: 5,
      duration: createEquipDurationProgress(105),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Colpo critico",
      experience: createEquipExperienceProgress(1, 13),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "item-golden-chalice", effect: "none" },
    },
    {
      id: "item-orb-purple",
      itemType: 'equip',
      name: "Globo Viola",
      type: equipTypeById["artifact"],
	  level: 1,
	        mastery: 6,
      duration: createEquipDurationProgress(120),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Danno oscuro",
      experience: createEquipExperienceProgress(1, 15),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "item-orb-purple", effect: "none" },
    },
    {
      id: "item-fire-crystal",
      itemType: 'equip',
      name: "Cristallo di Fuoco",
      type: equipTypeById["artifact"],
	  level: 1,
	        mastery: 7,
      duration: createEquipDurationProgress(135),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Penetrazione magica",
      experience: createEquipExperienceProgress(1, 17),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "item-fire-crystal", effect: "none" },
    },
    {
      id: "item-hourglass",
      itemType: 'equip',
      name: "Clessidra",
      type: equipTypeById["artifact"],
	  level: 1,
	        mastery: 8,
      duration: createEquipDurationProgress(150),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Controllo tempo",
      experience: createEquipExperienceProgress(1, 19),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "item-hourglass", effect: "none" },
    },
    {
      id: "item-nature-orb",
      itemType: 'equip',
      name: "Globo della Natura",
      type: equipTypeById["artifact"],
	  level: 1,
	        mastery: 9,
      duration: createEquipDurationProgress(165),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Rigenerazione",
      experience: createEquipExperienceProgress(1, 21),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "item-nature-orb", effect: "none" },
    },
    {
      id: "item-compass",
      itemType: 'equip',
      name: "Bussola Antica",
      type: equipTypeById["artifact"],
	  level: 1,
	        mastery: 10,
      duration: createEquipDurationProgress(180),
	  variant: 0,
	  attack: 1,
	  defense: 1,
	  velocita: 0,
      effect: "Orientamento",
      experience: createEquipExperienceProgress(1, 23),
      bonus: {type: 'none', title:'', value: 0, malus: false},
      frame: { name: "item-compass", effect: "none" },
    },
  ];


interface EquipVariantConfig {
  variant: variantsType;
  variantEffect: ComponentEffect;
  nameSuffix: string;
  minLevel: number;
  maxLevel: number;
  mastery: masteryType;
  variantMultiplier: number;
  bonusSuffix: string;
}

const equipVariantConfigs: EquipVariantConfig[] = [
  {
    variant: 1 as variantsType,
    variantEffect: 'none',
    nameSuffix: 'Base',
    minLevel: 1,
    maxLevel: 20,
    mastery: 1 as masteryType,
    variantMultiplier: 1,
    bonusSuffix: 'variante base',
  },
  {
    variant: 2 as variantsType,
    variantEffect: 'fx-uncommon',
    nameSuffix: 'Raffinato',
    minLevel: 21,
    maxLevel: 40,
    mastery: 3 as masteryType,
    variantMultiplier: 1.35,
    bonusSuffix: 'variante raffinata',
  },
  {
    variant: 3 as variantsType,
    variantEffect: 'fx-rare',
    nameSuffix: 'Raro',
    minLevel: 41,
    maxLevel: 60,
    mastery: 5 as masteryType,
    variantMultiplier: 2.25,
    bonusSuffix: 'variante rara',
  },
  {
    variant: 4 as variantsType,
    variantEffect: 'fx-mythic',
    nameSuffix: 'Epico',
    minLevel: 61,
    maxLevel: 80,
    mastery: 8 as masteryType,
    variantMultiplier: 3.75,
    bonusSuffix: 'variante epica',
  },
  {
    variant: 5 as variantsType,
    variantEffect: 'fx-legendary',
    nameSuffix: 'Leggendario',
    minLevel: 81,
    maxLevel: 100,
    mastery: 10 as masteryType,
    variantMultiplier: 5,
    bonusSuffix: 'variante leggendaria',
  },
];


const PRIMARY_BONUS_BY_EQUIP_TYPE: Record<EquipType['id'], BonusType> = {
  weapon: 'Attak',
  shield: 'Defence',
  armor: 'Defence',
  helmet: 'Defence',
  ring: 'velocita',
  artifact: 'velocita',
};

const SECONDARY_BONUS_TYPES: BonusType[] = ['Attak', 'Defence', 'velocita'];

const pseudoRandomIndex = (seed: string, size: number): number => {
  const hash = Array.from(seed).reduce((value, char) => ((value << 5) - value + char.charCodeAt(0)) | 0, 0);
  return Math.abs(hash) % size;
};

const createBonus = (type: BonusType, value: number): BonusItem => ({
  type,
  title: `+ ${type} | ${value}`,
  value,
  malus: false,
});

const createEquipBonuses = (item: EquipItem, variant: EquipVariantConfig, bonusValue: number): BonusItem[] => {
	//console.log('!!!!! ',variant, bonusValue);
  if (![4, 5].includes(Number(variant.variant)) || bonusValue <= 0) return [];

  const bonuses = [createBonus(PRIMARY_BONUS_BY_EQUIP_TYPE[item.type.id], bonusValue)];

  if (Number(variant.variant) === 5 && item.mastery > 7) {
    const secondaryType = SECONDARY_BONUS_TYPES[pseudoRandomIndex(`${item.id}-${variant.nameSuffix}-bonus`, SECONDARY_BONUS_TYPES.length)];
    bonuses.push(createBonus(secondaryType, Math.round(bonusValue * 0.7)));
  }
  //console.log('!!!!! bonus',bonuses);
  return bonuses;
};

const MASTERY_MULTIPLIERS: Record<number, number> = {
  1: 0.20,
  2: 0.35,
  3: 0.50,
  4: 0.70,
  5: 0.90,
  6: 1.10,
  7: 1.35,
  8: 1.60,
  9: 1.85,
  10: 2.20,
};

const EQUIP_TYPE_WEIGHTS: Record<EquipType['id'], { attack: number; defense: number; velocita: number }> = {
  weapon: { attack: 1.00, defense: 0.05, velocita: 0.15 },
  shield: { attack: 0.05, defense: 1.00, velocita: -0.10 },
  armor: { attack: 0.00, defense: 1.20, velocita: -0.20 },
  helmet: { attack: 0.05, defense: 0.55, velocita: 0.00 },
  ring: { attack: 0.40, defense: 0.40, velocita: 0.35 },
  artifact: { attack: 0.50, defense: 0.25, velocita: 0.25 },
};


const EQUIP_PROGRESSIVE_FLOORS = [
  { weaponAttack: 4, shieldDefense: 6, armorDefense: 7, helmetDefense: 3, ringAll: 2, artifactAll: 2 },
  { weaponAttack: 5, shieldDefense: 7, armorDefense: 8, helmetDefense: 4, ringAll: 3, artifactAll: 3 },
  { weaponAttack: 6, shieldDefense: 8, armorDefense: 9, helmetDefense: 5, ringAll: 3, artifactAll: 3 },
  { weaponAttack: 7, shieldDefense: 9, armorDefense: 10, helmetDefense: 6, ringAll: 4, artifactAll: 4 },
] as const;

const capEquipVelocita = (item: EquipItem): number => {
  if (item.type.id === 'armor') {
    return Math.max(item.velocita, -12);
  }

  if (item.type.id === 'shield') {
    return Math.max(item.velocita, -8);
  }

  return item.velocita;
};

const applyEquipProgressionFloor = (variants: EquipItem[]): EquipItem[] => {
  return variants.reduce<EquipItem[]>((acc, item, index) => {
    const cappedItem = {
      ...item,
      velocita: capEquipVelocita(item),
    };

    if (index === 0) {
      acc.push(cappedItem);
      return acc;
    }

    const previous = acc[index - 1];
    const floor = EQUIP_PROGRESSIVE_FLOORS[index - 1];

    switch (item.type.id) {
      case 'weapon':
        acc.push({
          ...cappedItem,
          attack: Math.max(cappedItem.attack, previous.attack + floor.weaponAttack),
        });
        break;

      case 'shield':
        acc.push({
          ...cappedItem,
          defense: Math.max(cappedItem.defense, previous.defense + floor.shieldDefense),
        });
        break;

      case 'armor':
        acc.push({
          ...cappedItem,
          defense: Math.max(cappedItem.defense, previous.defense + floor.armorDefense),
          velocita: capEquipVelocita(cappedItem),
        });
        break;

      case 'helmet':
        acc.push({
          ...cappedItem,
          defense: Math.max(cappedItem.defense, previous.defense + floor.helmetDefense),
        });
        break;

      case 'ring':
        acc.push({
          ...cappedItem,
          attack: Math.max(cappedItem.attack, previous.attack + floor.ringAll),
          defense: Math.max(cappedItem.defense, previous.defense + floor.ringAll),
          velocita: Math.max(cappedItem.velocita, previous.velocita + floor.ringAll),
        });
        break;

      case 'artifact':
        acc.push({
          ...cappedItem,
          attack: Math.max(cappedItem.attack, previous.attack + floor.artifactAll),
          defense: Math.max(cappedItem.defense, previous.defense + floor.artifactAll),
          velocita: Math.max(cappedItem.velocita, previous.velocita + floor.artifactAll),
        });
        break;

      default:
        acc.push(cappedItem);
        break;
    }

    return acc;
  }, []);
};

const getRawPower = (id: string, level: number, mastery: number, variant: EquipVariantConfig): number => {
  return Math.max(
    0,
    Math.round(
      level + (mastery * MASTERY_MULTIPLIERS[mastery]) + (mastery * variant.variantMultiplier)
    )
  );
};

const createDurationProgress = (item: EquipItem, level: number, mastery: number, variant: EquipVariantConfig) => {
  const baseDuration = Math.max(0, item.duration.total || item.duration.current || 0);
  const total = Math.round(baseDuration + level * 3 + Number(variant.variant) * 20 + mastery * 2);

  return {
    descr: 'Durata',
    current: total,
    total,
  };
};

const createExperienceProgress = (level: number, mastery: number, variant: EquipVariantConfig) => {
  const total = Math.round(80 + Math.pow(level, 1.35) * 20 + Number(variant.variant) * 250 + mastery * 40);

  return {
    descr: 'Esperienza equip',
    current: 0,
    total,
  };
};

const createEquipVariant = (
  item: EquipItem,
  variant: EquipVariantConfig
): EquipItem => {
  const level = 1;
  const mastery = item.mastery;
  const rawPower = getRawPower(item.id, level, mastery, variant);
  const weights = EQUIP_TYPE_WEIGHTS[item.type.id];
  const attack = Math.max(0, Math.round(rawPower * weights.attack));
  const defense = Math.max(0, Math.round(rawPower * weights.defense));
  const velocita = Math.round(rawPower * weights.velocita);
  const bonusValue = Math.round(rawPower * 0.25 * Math.max(0, variant.variant-3));
  const bonuses = createEquipBonuses(item, variant, bonusValue);
  const primaryBonus = bonuses[0] ?? createBonus('none', 0);
  const experience= createExperienceProgress(1, 1, variant);

  return {
    ...item,

    id: `${item.id}-${variant.nameSuffix}`,

    name:
      Number(variant.variant) === 1
        ? item.name
        : `${item.name} ${variant.nameSuffix}`,

    level,
    mastery,
    variant: variant.variant,
    duration: createDurationProgress(item, level, mastery, variant),
    attack,
    defense,
    velocita,
    experience,

    effect:
      Number(variant.variant) === 1
        ? item.effect
        : `${item.effect} - ${variant.nameSuffix}`,

    bonus: primaryBonus,
    bonuses,

    price: undefined,
    frame: { name: item.frame.name, effect: variant.variantEffect },
  };
};

// -------------------------------------
// Export finale: 5 varianti per 10 mastery per ciascuno dei 6 equipaggiamenti
// Totale = 300 EquipItem
// -------------------------------------

export const equipItemsVariantMock: EquipItem[] = equipItemsMock.reduce<EquipItem[]>(
  (acc, item) => {
    const variants = applyEquipProgressionFloor(
      equipVariantConfigs.map((variant) =>
        createEquipVariant(item, variant)
      )
    );

    acc.push(...variants);

    return acc;
  },
  []
);

// -------------------------------------
// Risorse raggruppate per experience e level
// -------------------------------------

export const getEquipItemsByLevelAndMasteryAndType = (
  level: number,
  mastery: masteryType,
  variant: variantsType,
  typeId?: EquipType["id"]
): EquipItem[] => {
  return equipItemsVariantMock
    .filter((item) => {
      const matchLevel = item.level <= level;
	  const matchVariant = item.variant <= variant;
	  const matchMastery = item.mastery <= mastery;
      const matchType = typeId ? item.type.id === typeId : true;

      return matchLevel && matchVariant && matchMastery && matchType;
    })
    .sort((a, b) => {
      if (a.type.id !== b.type.id) {
        return a.type.id.localeCompare(b.type.id);
      }

      if (a.level !== b.level) {
        return a.level - b.level;
      }

	  if (a.variant !== b.variant) {
	    return a.variant - b.variant;
	  }

	  if (a.mastery !== b.mastery) {
	    return a.mastery - b.mastery;
	  }

      return a.name.localeCompare(b.name);
    });
};

// -------------------------------------
// Risorse recuperate casualmente
// -------------------------------------

export const getRandomEquipItems = (
  count: number,
  equipItems: EquipItem[] = equipItemsVariantMock
): EquipItem[] => {
  return GameUtilsService.getRandomItemsFromList<EquipItem>(equipItems, count);
};

// -------------------------------------
// Risorse raggruppate per tipoo
// -------------------------------------

export const equipItemsByTypeMock = equipItemsVariantMock.reduce(
  (acc, item) => {
    acc[item.type.id] ??= [];
    acc[item.type.id].push(item);
    return acc;
  },
  {} as Record<EquipType["id"], EquipItem[]>
);


