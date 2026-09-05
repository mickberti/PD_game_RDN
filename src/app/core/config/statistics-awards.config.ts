import { AwardItem, FrameItem, PriceItem } from '../models/game.models';
import { StatisticDefinition, StatisticType } from '../models/remote/progress.models';

const coinFrame: FrameItem = { name: 'coin_single', effect: 'none' };
const coinReward = (amount: number): PriceItem => ({ frame: coinFrame, type: 'coin', amount });
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
  levelsCompleted: { type: 'levelsCompleted', category: 'progression', title: 'Livelli completati', description: 'Completamenti totali, incluse le rigiocate.' },
  actionsUsed: { type: 'actionsUsed', category: 'gameplay', title: 'Azioni usate', description: 'Azioni consumabili usate con successo.' },
  gemsReset: { type: 'gemsReset', category: 'gameplay', title: 'Gemme azzerate', description: 'Gemme portate a zero con l azione dedicata.' },
  signsInverted: { type: 'signsInverted', category: 'gameplay', title: 'Segni invertiti', description: 'Inversioni di segno effettuate con un azione.' },
  impulsesSkipped: { type: 'impulsesSkipped', category: 'gameplay', title: 'Impulsi saltati', description: 'Flussi saltati con l azione Skip.' },
  corruptionsCleansed: { type: 'corruptionsCleansed', category: 'effects', title: 'Corruzioni annullate', description: 'Utilizzi dell azione che rimuove la corruzione.' },
  chainsBroken: { type: 'chainsBroken', category: 'effects', title: 'Catene spezzate', description: 'Utilizzi dell azione che rimuove le catene.' },
  timersCompleted: { type: 'timersCompleted', category: 'effects', title: 'Timer risolti', description: 'Timer completati prima della scadenza.' },
  mirrorsApplied: { type: 'mirrorsApplied', category: 'effects', title: 'Specchi attraversati', description: 'Operazioni trasformate da uno specchio.' },
  amplifiersApplied: { type: 'amplifiersApplied', category: 'effects', title: 'Amplificatori attivati', description: 'Operazioni amplificate dalle gemme.' },
  invertersApplied: { type: 'invertersApplied', category: 'effects', title: 'Inverter attivati', description: 'Operazioni invertite dagli effetti gemma o area.' },
  elementalBypasses: { type: 'elementalBypasses', category: 'effects', title: 'Barriere elementali superate', description: 'Muri di fuoco o ghiaccio attraversati con l elemento opposto.' },
};

/**
 * I primi tre premi accompagnano l'apprendimento del gioco; gli ultimi tre
 * sono obiettivi di lungo periodo. Ogni statistica resta quindi leggibile ma
 * offre sempre un prossimo traguardo significativo.
 */
const extendedTiers = (
  first: number,
  second: number,
  third: number,
  fourth: number,
  fifth: number,
  sixth: number,
): StatisticAwardTier[] => [
  { target: first, reward: coinReward(30) },
  { target: second, reward: coinReward(100) },
  { target: third, reward: coinReward(180) },
  { target: fourth, reward: coinReward(350) },
  { target: fifth, reward: coinReward(650) },
  { target: sixth, reward: coinReward(1_200) },
];

export const STATISTIC_AWARD_TIERS: Record<StatisticType, StatisticAwardTier[]> = {
  gamesPlayed: extendedTiers(10, 50, 150, 300, 600, 1_200),
  impulsesPlayed: extendedTiers(100, 500, 2_000, 5_000, 10_000, 25_000),
  rotationsPerformed: extendedTiers(50, 250, 1_000, 2_500, 5_000, 12_000),
  effectsResolved: extendedTiers(25, 150, 600, 1_500, 3_000, 7_500),
  wallsDestroyed: extendedTiers(10, 75, 300, 750, 1_500, 4_000),
  shieldsResolved: extendedTiers(10, 75, 300, 750, 1_500, 4_000),
  linksActivated: extendedTiers(25, 150, 600, 1_500, 3_000, 7_500),
  areasTriggered: extendedTiers(10, 75, 300, 750, 1_500, 4_000),
  specialOperatorsUsed: extendedTiers(10, 75, 300, 750, 1_500, 4_000),
  levelsCompleted: extendedTiers(5, 25, 75, 150, 300, 600),
  actionsUsed: extendedTiers(5, 25, 100, 250, 500, 1_200),
  gemsReset: extendedTiers(5, 25, 100, 250, 500, 1_200),
  signsInverted: extendedTiers(5, 25, 100, 250, 500, 1_200),
  impulsesSkipped: extendedTiers(5, 25, 100, 250, 500, 1_200),
  corruptionsCleansed: extendedTiers(3, 15, 60, 150, 300, 750),
  chainsBroken: extendedTiers(3, 15, 60, 150, 300, 750),
  timersCompleted: extendedTiers(5, 25, 100, 250, 500, 1_200),
  mirrorsApplied: extendedTiers(10, 75, 300, 750, 1_500, 4_000),
  amplifiersApplied: extendedTiers(10, 75, 300, 750, 1_500, 4_000),
  invertersApplied: extendedTiers(10, 75, 300, 750, 1_500, 4_000),
  elementalBypasses: extendedTiers(5, 25, 100, 250, 500, 1_200),
  highestLevelReached: [
    { target: 30, reward: coinReward(100) },
    { target: 60, reward: coinReward(300) },
    { target: 90, reward: coinReward(500) },
    { target: 120, reward: coinReward(500) },
    { target: 150, reward: coinReward(900) },
    { target: 180, reward: coinReward(1_500) },
  ],
};

export const generateStatisticAwards = (): AwardItem[] => Object.entries(STATISTIC_AWARD_TIERS).flatMap(([type, tiers]) => tiers.map((tier, index) => {
  const statisticType = type as StatisticType; const definition = STATISTIC_DEFINITIONS[statisticType];
  return { id: `${type}-${index + 1}`, type: 'reward', title: definition.title, subtitle: `${tier.target} ${definition.title.toLowerCase()}`, progress: { descr: definition.description, current: 0, total: tier.target }, frame: tier.reward.frame, statisticDefinition: definition, reward: tier.reward, state: 'locked' };
}));
