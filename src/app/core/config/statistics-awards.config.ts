import { AwardItem, FrameItem, PriceItem } from '../models/game.models';
import { StatisticDefinition, StatisticType } from '../models/remote/progress.models';

const coinFrame: FrameItem = { name: 'coin_single', effect: 'none' };
const gemFrame: FrameItem = { name: 'crystal_single', effect: 'none' };
const dustFrame: FrameItem = { name: 'magic_dust_single', effect: 'none' };

export interface StatisticAwardTier {
  target: number;
  reward: PriceItem;
}

export const STATISTIC_DEFINITIONS: Record<StatisticType, StatisticDefinition> = {
  enemiesKilled: {
    type: 'enemiesKilled',
    category: 'combat',
    title: 'Nemici uccisi',
    description: 'Numero totale di nemici sconfitti.',
  },
  bossKilled: {
    type: 'bossKilled',
    category: 'combat',
    title: 'Boss sconfitti',
    description: 'Numero totale di boss eliminati.',
  },
  attacksPerformed: {
    type: 'attacksPerformed',
    category: 'combat',
    title: 'Attacchi effettuati',
    description: 'Numero totale di attacchi eseguiti.',
  },
  specialsPerformed: {
    type: 'specialsPerformed',
    category: 'combat',
    title: 'Speciali usate',
    description: 'Numero totale di abilità speciali utilizzate.',
  },
  criticalHits: {
    type: 'criticalHits',
    category: 'combat',
    title: 'Colpi critici',
    description: 'Numero totale di colpi critici messi a segno.',
  },
  damageDealt: {
    type: 'damageDealt',
    category: 'combat',
    title: 'Danni inflitti',
    description: 'Totale dei danni inflitti ai nemici.',
  },
  damageReceived: {
    type: 'damageReceived',
    category: 'combat',
    title: 'Danni subiti',
    description: 'Totale dei danni ricevuti durante il gioco.',
  },
  blocksPerformed: {
    type: 'blocksPerformed',
    category: 'combat',
    title: 'Parate effettuate',
    description: 'Numero totale di parate eseguite.',
  },
  coinsEarned: {
    type: 'coinsEarned',
    category: 'economy',
    title: 'Monete guadagnate',
    description: 'Totale delle monete ottenute durante il gioco.',
  },
  coinsSpent: {
    type: 'coinsSpent',
    category: 'economy',
    title: 'Monete spese',
    description: 'Totale delle monete spese.',
  },
  resourcesCollected: {
    type: 'resourcesCollected',
    category: 'economy',
    title: 'Risorse raccolte',
    description: 'Numero totale di risorse raccolte.',
  },
  itemsPurchased: {
    type: 'itemsPurchased',
    category: 'economy',
    title: 'Oggetti acquistati',
    description: 'Numero totale di oggetti acquistati.',
  },
  itemsSold: {
    type: 'itemsSold',
    category: 'economy',
    title: 'Oggetti venduti',
    description: 'Numero totale di oggetti venduti.',
  },
  heroLevelsGained: {
    type: 'heroLevelsGained',
    category: 'progression',
    title: 'Livelli eroe ottenuti',
    description: 'Numero totale di livelli ottenuti dagli eroi.',
  },
  equipmentUpgrades: {
    type: 'equipmentUpgrades',
    category: 'progression',
    title: 'Equip potenziati',
    description: 'Numero totale di potenziamenti effettuati sugli equipaggiamenti.',
  },
  masteryPointsEarned: {
    type: 'masteryPointsEarned',
    category: 'progression',
    title: 'Punti maestria ottenuti',
    description: 'Numero totale di punti maestria ottenuti.',
  },
  heroesUnlocked: {
    type: 'heroesUnlocked',
    category: 'progression',
    title: 'Eroi sbloccati',
    description: 'Numero totale di eroi sbloccati.',
  },
  equipmentUnlocked: {
    type: 'equipmentUnlocked',
    category: 'progression',
    title: 'Equip sbloccati',
    description: 'Numero totale di equipaggiamenti sbloccati.',
  },
  battlesWon: {
    type: 'battlesWon',
    category: 'activity',
    title: 'Battaglie vinte',
    description: 'Numero totale di battaglie vinte.',
  },
  questsCompleted: {
    type: 'questsCompleted',
    category: 'activity',
    title: 'Missioni completate',
    description: 'Numero totale di missioni completate.',
  },
};

const coinReward = (amount: number): PriceItem => ({ frame: coinFrame, type: 'coin', amount });
const gemReward = (amount: number): PriceItem => ({ frame: gemFrame, type: 'gem', amount });
const dustReward = (amount: number): PriceItem => ({ frame: dustFrame, type: 'dust', amount });

export const STATISTIC_AWARD_TIERS: Record<StatisticType, StatisticAwardTier[]> = {
  enemiesKilled: [{ target: 100, reward: coinReward(100) }, { target: 500, reward: coinReward(500) }, { target: 1000, reward: gemReward(25) }],
  bossKilled: [{ target: 3, reward: coinReward(150) }, { target: 10, reward: gemReward(20) }, { target: 25, reward: gemReward(50) }],
  attacksPerformed: [{ target: 100, reward: coinReward(75) }, { target: 500, reward: coinReward(250) }, { target: 1000, reward: coinReward(750) }],
  specialsPerformed: [{ target: 25, reward: coinReward(100) }, { target: 100, reward: dustReward(50) }, { target: 250, reward: gemReward(30) }],
  criticalHits: [{ target: 20, reward: coinReward(120) }, { target: 100, reward: dustReward(75) }, { target: 250, reward: gemReward(35) }],
  damageDealt: [{ target: 1000, reward: coinReward(150) }, { target: 5000, reward: dustReward(100) }, { target: 10000, reward: gemReward(40) }],
  damageReceived: [{ target: 500, reward: coinReward(100) }, { target: 2500, reward: dustReward(80) }, { target: 5000, reward: gemReward(25) }],
  blocksPerformed: [{ target: 10, reward: coinReward(80) }, { target: 50, reward: dustReward(50) }, { target: 100, reward: gemReward(20) }],
  coinsEarned: [{ target: 500, reward: coinReward(100) }, { target: 2500, reward: dustReward(75) }, { target: 10000, reward: gemReward(50) }],
  coinsSpent: [{ target: 250, reward: coinReward(75) }, { target: 1000, reward: dustReward(75) }, { target: 5000, reward: gemReward(40) }],
  resourcesCollected: [{ target: 10, reward: coinReward(100) }, { target: 50, reward: dustReward(100) }, { target: 150, reward: gemReward(30) }],
  itemsPurchased: [{ target: 1, reward: coinReward(50) }, { target: 5, reward: dustReward(50) }, { target: 20, reward: gemReward(30) }],
  itemsSold: [{ target: 1, reward: coinReward(50) }, { target: 5, reward: dustReward(50) }, { target: 20, reward: gemReward(30) }],
  heroLevelsGained: [{ target: 1, reward: coinReward(100) }, { target: 5, reward: dustReward(100) }, { target: 15, reward: gemReward(40) }],
  equipmentUpgrades: [{ target: 5, reward: coinReward(150) }, { target: 20, reward: dustReward(150) }, { target: 50, reward: gemReward(60) }],
  masteryPointsEarned: [{ target: 3, reward: coinReward(100) }, { target: 10, reward: dustReward(100) }, { target: 25, reward: gemReward(45) }],
  heroesUnlocked: [{ target: 1, reward: coinReward(150) }, { target: 3, reward: gemReward(25) }, { target: 5, reward: gemReward(60) }],
  equipmentUnlocked: [{ target: 3, reward: coinReward(100) }, { target: 10, reward: dustReward(100) }, { target: 25, reward: gemReward(45) }],
  battlesWon: [{ target: 10, reward: coinReward(150) }, { target: 50, reward: dustReward(200) }, { target: 100, reward: gemReward(75) }],
  questsCompleted: [{ target: 3, reward: coinReward(120) }, { target: 10, reward: dustReward(120) }, { target: 25, reward: gemReward(50) }],
};

export const generateStatisticAwards = (): AwardItem[] => {
  const awards: AwardItem[] = [];

  for (const [type, tiers] of Object.entries(STATISTIC_AWARD_TIERS) as [StatisticType, StatisticAwardTier[]][]) {
    const definition = STATISTIC_DEFINITIONS[type];

    tiers.forEach((tier: StatisticAwardTier, index: number) => {
      awards.push({
        id: `${type}-${index + 1}`,
        type: 'reward',
        title: definition.title,
        subtitle: `${tier.target} ${definition.title.toLowerCase()}`,
        progress: {
          descr: definition.description,
          current: 0,
          total: tier.target,
        },
        frame: tier.reward.frame,
        statisticDefinition: definition,
        reward: tier.reward,
        state: 'locked',
      });
    });
  }

  return awards;
};
