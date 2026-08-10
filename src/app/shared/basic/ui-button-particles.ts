import { UIButtonParticleConfig, UIButtonParticleItem, UIButtonParticleMode } from "../../core/models/game.models";

const UI_BUTTON_PARTICLE_CONFIGS: Record<Exclude<UIButtonParticleMode, 'none'>, UIButtonParticleConfig> = {
  part1: {
    count: 8,
    frameNames: ['coin_single'],
    minJump: 0.7,
    maxJump: 1.45,
  },
  part2: {
    count: 12,
    frameNames: ['coin_single', 'crystal_single', 'magic_dust_single'],
    minJump: 0.65,
    maxJump: 1.8,
    minSize: 0.55,
    maxSize: 1.35,
  },
  part3: {
    count: 14,
    frameNames: ['crystal_single', 'magic_dust_single'],
    minJump: 0.8,
    maxJump: 2,
    minSize: 0.6,
    maxSize: 1.5,
    originY: 45,
  },
};

export function createUIButtonParticles(mode: UIButtonParticleMode): UIButtonParticleItem[] {
  if (mode === 'none') {
    return [];
  }

  const config = UI_BUTTON_PARTICLE_CONFIGS[mode];
  const count = config.count ?? 10;
  const frameNames = config.frameNames?.length ? config.frameNames : ['coin_single', 'crystal_single', 'magic_dust_single'];
  const minJump = config.minJump ?? 0.55;
  const maxJump = config.maxJump ?? 1.6;
  const minSize = config.minSize ?? 0.7;
  const maxSize = config.maxSize ?? 1.25;
  const effectClass = resolveParticleEffect(config.effect ?? 'fx-juicy__particle');
  const originX = config.originX ?? 50;
  const originY = config.originY ?? 35;

  return Array.from({ length: count }, (_, index) => {
    const frameName = frameNames[index % frameNames.length] ?? '';

    return {
      id: createParticleId(index),
      jump: randomBetween(minJump, maxJump),
      direction: Math.random() > 0.5 ? '1' : '-1',
      spin: config.spin === false ? '0' : Math.random() > 0.35 ? '1' : '0',
      size: randomBetween(minSize, maxSize),
      frameName,
      effectClass,
      originX,
      originY,
    };
  });
}

function randomBetween(min: number, max: number): string {
  return (min + Math.random() * (max - min)).toFixed(2);
}

function resolveParticleEffect(effect: string): string {
  if (effect.startsWith('fx-')) {
    return effect;
  }

  if (effect === 'juicy__particle') {
    return 'fx-juicy__particle';
  }

  return `fx-${effect.split('__').join('_')}`;
}

function createParticleId(index: number): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `ui-button-particle-${Date.now()}-${index}`;
}
