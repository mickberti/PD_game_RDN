export const HERO_FRAME_ACTION_IDS = ['idle', 'run', 'attack', 'shield', 'special', 'hit'] as const;

export type HeroFrameAction = typeof HERO_FRAME_ACTION_IDS[number];
export type HeroAnimationAction = HeroFrameAction;

export interface HeroActionOption {
  id: HeroFrameAction;
  label: string;
  prefix: string;
  start: number;
  end: number;
  frameRate: number;
  duration: number;
  delay: number;
  repeat: number;
  repeatDelay: number;
  zeroPad?: number;
  suffix?: string;
}

export type HeroActionAnimationMap = Record<HeroFrameAction, HeroActionOption>;

/** Sequenze e velocita' dei frame: la scena le usa senza aggiungere logica di gioco. */
export const HERO_ACTIONS: HeroActionOption[] = [
  { id: 'idle', label: 'Idle / fermo', prefix: 'standing', start: 1, end: 6, frameRate: 5, duration: 0, delay: 0, repeat: -1, repeatDelay: 0 },
  { id: 'run', label: 'Corsa', prefix: 'run', start: 1, end: 6, frameRate: 5, duration: 0, delay: 0, repeat: -1, repeatDelay: 0 },
  { id: 'attack', label: 'Attacco', prefix: 'attack', start: 1, end: 6, frameRate: 5, duration: 0, delay: 0, repeat: 0, repeatDelay: 0 },
  { id: 'shield', label: 'Parata', prefix: 'shield', start: 1, end: 6, frameRate: 5, duration: 0, delay: 0, repeat: -1, repeatDelay: 0 },
  { id: 'special', label: 'Speciale', prefix: 'special', start: 1, end: 6, frameRate: 5, duration: 0, delay: 0, repeat: 0, repeatDelay: 0 },
  { id: 'hit', label: 'Colpito', prefix: 'hit', start: 1, end: 6, frameRate: 5, duration: 0, delay: 0, repeat: 0, repeatDelay: 0 }
];

export function createHeroActionAnimationMap(actions: readonly HeroActionOption[] = HERO_ACTIONS): HeroActionAnimationMap {
  return actions.reduce((map, action) => {
    map[action.id] = { ...action };
    return map;
  }, {} as HeroActionAnimationMap);
}
