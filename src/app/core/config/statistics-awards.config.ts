import { AwardItem, FrameItem, PriceItem } from '../models/game.models';
import { StatisticDefinition, StatisticType } from '../models/remote/progress.models';

const coinFrame: FrameItem = { name: 'coin_single', effect: 'none' };
const gemFrame: FrameItem = { name: 'crystal_single', effect: 'none' };
const coinReward = (amount: number): PriceItem => ({ frame: coinFrame, type: 'coin', amount });
const gemReward = (amount: number): PriceItem => ({ frame: gemFrame, type: 'gem', amount });
export interface StatisticAwardTier { target: number; reward: PriceItem; }

/** The only award statistics: all are measured directly by the RDN puzzle runtime. */
export const STATISTIC_DEFINITIONS: Record<StatisticType, StatisticDefinition> = {
  gamesPlayed: { type: 'gamesPlayed', category: 'gameplay', title: 'Partite giocate', description: 'Tentativi avviati in qualsiasi modalità RDN.' },
  impulsesPlayed: { type: 'impulsesPlayed', category: 'gameplay', title: 'Impulsi giocati', description: 'Impulsi effettivamente eseguiti sul tabellone.' },
  rotationsPerformed: { type: 'rotationsPerformed', category: 'gameplay', title: 'Rotazioni effettuate', description: 'Scatti di rotazione dell’ingranaggio.' },
  effectsResolved: { type: 'effectsResolved', category: 'effects', title: 'Effetti risolti', description: 'Effetti che hanno completato o trasformato un flusso.' },
  wallsDestroyed: { type: 'wallsDestroyed', category: 'effects', title: 'Muri distrutti', description: 'Muri pietra, ghiaccio o fuoco rimossi nel gioco o con un’azione.' },
  shieldsResolved: { type: 'shieldsResolved', category: 'effects', title: 'Scudi esauriti', description: 'Scudi consumabili completamente rimossi.' },
  linksActivated: { type: 'linksActivated', category: 'effects', title: 'Link attivati', description: 'Propagazioni riuscite attraverso un link.' },
  areasTriggered: { type: 'areasTriggered', category: 'effects', title: 'Aree attivate', description: 'Effetti area innescati dalla risoluzione di una gemma.' },
  specialOperatorsUsed: { type: 'specialOperatorsUsed', category: 'effects', title: 'Speciali usati', description: 'Operatori speciali dell’ingranaggio effettivamente consumati.' },
  highestLevelReached: { type: 'highestLevelReached', category: 'progression', title: 'Livello raggiunto', description: 'Massimo livello completato: premi ogni 30 livelli.' },
};

const standardTiers = (first: number, second: number, third: number): StatisticAwardTier[] => [{ target: first, reward: coinReward(30) }, { target: second, reward: coinReward(100) }, { target: third, reward: gemReward(10) }];
export const STATISTIC_AWARD_TIERS: Record<StatisticType, StatisticAwardTier[]> = {
  gamesPlayed: standardTiers(10, 50, 150), impulsesPlayed: standardTiers(100, 500, 2000), rotationsPerformed: standardTiers(50, 250, 1000),
  effectsResolved: standardTiers(25, 150, 600), wallsDestroyed: standardTiers(10, 75, 300), shieldsResolved: standardTiers(10, 75, 300),
  linksActivated: standardTiers(25, 150, 600), areasTriggered: standardTiers(10, 75, 300), specialOperatorsUsed: standardTiers(10, 75, 300),
  highestLevelReached: [{ target: 30, reward: coinReward(100) }, { target: 60, reward: coinReward(300) }, { target: 90, reward: gemReward(25) }],
};

export const generateStatisticAwards = (): AwardItem[] => Object.entries(STATISTIC_AWARD_TIERS).flatMap(([type, tiers]) => tiers.map((tier, index) => {
  const statisticType = type as StatisticType; const definition = STATISTIC_DEFINITIONS[statisticType];
  return { id: `${type}-${index + 1}`, type: 'reward', title: definition.title, subtitle: `${tier.target} ${definition.title.toLowerCase()}`, progress: { descr: definition.description, current: 0, total: tier.target }, frame: tier.reward.frame, statisticDefinition: definition, reward: tier.reward, state: 'locked' };
}));
