import { ChestItem, FrameItem } from "../models/game.models";
import { boxTypeById } from "../models/mock/fantasy/box-data";

export interface WelcomeStoryStep {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  frame: FrameItem;
}

export const WELCOME_STORY_STEPS: WelcomeStoryStep[] = [
	  {
	    id: "born-from-mud",
	    eyebrow: "Capitolo 1",
	    title: "Nato dal fango",
	    text: "In un villaggio dimenticato viveva un giovane povero, senza titolo e senza casata. Guardava i cavalieri passare con armature lucenti e sognava di diventare il più grande di tutti. Non aveva oro. Non aveva una spada. Aveva solo volontà.",
	    frame: {name:"story-section-01", effect:'none'}
	  },
	  {
	    id: "first-battle",
	    eyebrow: "Capitolo 2",
	    title: "La prima battaglia",
	    text: "Quando il villaggio fu assalito da bestie oscure, il giovane raccolse una vecchia lama arrugginita e combatté. Cadde, sanguinò, ebbe paura. Ma non fuggì. All’alba, le creature erano sconfitte e il villaggio salvo.",
	    frame: {name:"story-section-02", effect:'none'}
	  },
	  {
	    id: "hero-road",
	    eyebrow: "Capitolo 3",
	    title: "La strada dell’eroe",
	    text: "Lasciò la sua casa e iniziò un lungo viaggio. Affrontò goblin, banditi, troll e mostri delle rovine. A ogni vittoria guadagnava qualcosa: un elmo, uno scudo, una corazza, una lama migliore. Pezzo dopo pezzo, il ragazzo povero diventava un vero guerriero.",
	    frame: {name:"story-section-03", effect:'none'}
	  },
	  {
	    id: "monster-trial",
	    eyebrow: "Capitolo 4",
	    title: "La prova del mostro",
	    text: "Sulla Montagna Spezzata affrontò un gigante corazzato che nessun cavaliere era riuscito a battere. La sua arma si spezzò. La sua armatura cedette. Ma lui si rialzò ancora. Con l’ultimo colpo abbatté il mostro e conquistò una spada leggendaria.",
	    frame: {name:"story-section-04", effect:'none'}
	  },
	  {
	    id: "legend",
	    eyebrow: "Capitolo 5",
	    title: "La leggenda",
	    text: "Giunto alla capitale, sfidò i migliori cavalieri del regno. Erano nobili, addestrati e ricchi. Lui era solo un eroe senza nome. Eppure vinse. Da quel giorno, nessuno ricordò da dove venisse. Ricordarono solo ciò che aveva dimostrato: un cavaliere non nasce grande. Lo diventa.",
	    frame: {name:"story-section-05", effect:'none'}
	  },
];

export const WELCOME_BONUS_BOX: ChestItem = {
  itemType: 'chest',
  id: "welcome-bonus-box",
  name: "Pacchetto Benvenuto",
  type: boxTypeById.box2,
  level: 1,
  mastery: 1,
  description: "Bonus configurabile di primo accesso con eroe, box e valute.",
  reward: [
    { type: "hero", min: 1, max: 1, variantChances: { 1: 100 }, masteryChances: { 1: 100 } },
	{ type: "equip", min: 1, max: 1, variantChances: { 1: 100 }, masteryChances: { 1: 100 } },
    { type: "box", min: 5, max: 5, masteryChances: { 1: 100 } },
    { type: "box", min: 2, max: 2, masteryChances: { 2: 100 } },
    { type: "coins", min: 2000, max: 2000 },
    { type: "gems", min: 50, max: 50 },
  ],
  frame: { name: "chest-angel-gold", effect: "fx-new" },
  stock: 1,
};
