import { AudioCue, AudioCueConfig, AudioDesignSpec, AudioPackConfig, MusicCue } from "./audio.models";

/** First test-audio delivery is WAV. Future release assets can switch this one mapping to OGG/MP3. */
const asset = (path: string): readonly string[] => [`assets/audio/${path}.wav`];
const design = (durationMs: AudioDesignSpec["durationMs"], character: string, intensity: AudioDesignSpec["intensity"], priority: AudioDesignSpec["priority"]): AudioDesignSpec => ({ durationMs, character, intensity, priority });
const sfx = (key: string, path: string, options: Omit<AudioCueConfig, "key" | "sources">): AudioCueConfig => ({ key, sources: asset(`sfx/${path}`), ...options });
const variants = (...paths: string[]): readonly (readonly string[])[] => paths.map((path) => asset(`sfx/${path}`));

export const AUDIO_SETTINGS = { music: { defaultVolume: .55, crossfadeMs: 500 }, sfx: { defaultVolume: .85 }, ducking: { enabled: true, targetVolume: .25, fadeMs: 100 } } as const;

/** Asset roots are the only pack-specific concern; cue semantics and mixer rules stay shared. */
export const AUDIO_PACKS: readonly AudioPackConfig[] = [
  { id: "classic", label: "Dark Classic", assetRoot: "assets/audio/packs/dark-classic", description: "Set Classic attuale incluso nell'app." },
  { id: "arcane-crystal", label: "Arcane Crystal", assetRoot: "assets/audio/packs/arcane-crystal", description: "Nuovo set Mechanical + Arcane + Crystal." },
  { id: "tribal-deluxe", label: "Tribal Deluxe", assetRoot: "assets/audio/packs/tribal-deluxe", description: "Set tribale completo con musica e effetti dedicati." },
];

/** Runtime catalog and asset-production brief. Paths follow Sound Design Specification §43. */
export const SFX_CONFIG: Readonly<Record<AudioCue, AudioCueConfig>> = {
  "ui.tap": sfx("sfx-ui-tap", "ui/tap", { volume: .45, cooldownMs: 30, maxConcurrent: 2, design: design([40, 80], "Soft mechanical click with discreet digital tick.", 1, 1) }),
  "ui.confirm": sfx("sfx-ui-confirm", "ui/confirm", { volume: .45, cooldownMs: 50, maxConcurrent: 2, design: design([100, 180], "Click with a micro tonal rise; positive, never celebratory.", 1, 1) }),
  "ui.cancel": sfx("sfx-ui-cancel", "ui/cancel", { volume: .45, cooldownMs: 50, maxConcurrent: 2, design: design([80, 160], "Soft click and small downward tone.", 1, 1) }),
  "ui.open": sfx("sfx-ui-open", "ui/open", { volume: .45, cooldownMs: 50, maxConcurrent: 2, design: design([150, 250], "Mechanical slide with soft energy shimmer.", 1, 1) }),
  "ui.close": sfx("sfx-ui-close", "ui/close", { volume: .45, cooldownMs: 50, maxConcurrent: 2, design: design([150, 250], "Reverse opening: receding slide and shimmer.", 1, 1) }),
  "gear.rotate": sfx("sfx-gear-rotate", "gear/rotate-01", { variants: variants("gear/rotate-01", "gear/rotate-02", "gear/rotate-03"), volume: .40, cooldownMs: 40, maxConcurrent: 2, pitchVariation: .03, design: design([40, 90], "Precise ratchet click: 70% refined mechanics, 30% synthetic energy.", 1, 1) }),
  "gear.snap": sfx("sfx-gear-snap", "gear/snap", { volume: .55, cooldownMs: 60, maxConcurrent: 2, design: design([120, 220], "Metallic snap plus short resonance; confirms valid position.", 2, 2) }),
  "pulse.start": sfx("sfx-pulse-start", "pulse/start", { volume: .70, cooldownMs: 50, maxConcurrent: 1, design: design([150, 300], "Short mechanical release and controlled energy charge.", 3, 3) }),
  "pulse.travel": sfx("sfx-pulse-travel", "pulse/travel", { volume: .35, cooldownMs: 70, maxConcurrent: 2, design: design([80, 180], "Low energy zip / electric shimmer, deliberately unobtrusive.", 1, 1) }),
  "gem.change": sfx("sfx-gem-change", "gem/change-01", { variants: variants("gem/change-01", "gem/change-02", "gem/change-03"), volume: .60, cooldownMs: 20, maxConcurrent: 4, pitchVariation: .03, design: design([100, 220], "Crystal tick with soft energy pop; change, not success.", 2, 2) }),
  "gem.zero": sfx("sfx-gem-zero", "gem/zero", { volume: .85, cooldownMs: 50, maxConcurrent: 2, design: design([300, 550], "Crystal impact, energy collapse and harmonic shimmer; never coin/slot-machine.", 4, 4) }),
  "link.travel": sfx("sfx-link-travel", "pulse/travel", { volume: .35, cooldownMs: 45, maxConcurrent: 2, design: design([80, 180], "Shared low-level energy transfer layer for linked flows.", 1, 1) }),
  "link.hit": sfx("sfx-link-hit", "gem/change-01", { volume: .45, cooldownMs: 40, maxConcurrent: 2, design: design([100, 220], "Restrained arrival layer sharing the gem-change palette.", 2, 2) }),
  "bonus.activate": sfx("sfx-bonus-activate", "gameplay/bonus-activate", { volume: .75, cooldownMs: 80, maxConcurrent: 1, design: design([350, 700], "Energy charge with bright crystal resonance.", 3, 4) }),
  "effect.shield": sfx("sfx-effect-shield", "effects/shield", { volume: .75, cooldownMs: 60, maxConcurrent: 2, design: design([300, 600], "Low impact and glass/energy resonance; protection and absorption.", 3, 3) }),
  "effect.wall": sfx("sfx-effect-wall", "effects/wall", { volume: .75, cooldownMs: 60, maxConcurrent: 2, design: design([250, 500], "Stone/metal lock and low mechanical impact.", 3, 3) }),
  "effect.mirror": sfx("sfx-effect-mirror", "effects/mirror", { volume: .75, cooldownMs: 60, maxConcurrent: 2, design: design([300, 500], "Reverse shimmer and crystal sweep.", 3, 3) }),
  "effect.amplifier": sfx("sfx-effect-amplifier", "effects/amplifier", { volume: .75, cooldownMs: 60, maxConcurrent: 2, design: design([300, 550], "Rising energy pulse; increased power without arcade excess.", 3, 3) }),
  "effect.inverter": sfx("sfx-effect-inverter", "effects/inverter", { volume: .75, cooldownMs: 60, maxConcurrent: 2, design: design([250, 450], "Short tone and reverse tonal flip.", 3, 3) }),
  "effect.freeze": sfx("sfx-effect-freeze", "effects/freeze", { volume: .75, cooldownMs: 60, maxConcurrent: 2, design: design([350, 650], "Technological crystal-ice snap, not fantasy ice magic.", 3, 3) }),
  "effect.timer": sfx("sfx-effect-timer", "effects/timer", { volume: .75, cooldownMs: 80, maxConcurrent: 1, design: design([150, 300], "Single clock-like pressure pulse; no continuous ticking.", 2, 3) }),
  "effect.corruption": sfx("sfx-effect-corruption", "effects/corruption", { volume: .75, cooldownMs: 60, maxConcurrent: 2, design: design([400, 800], "Controlled digital glitch and low energy growl; no horror.", 3, 3) }),
  "game.win": sfx("sfx-game-win", "gameplay/game-win", { volume: 1, cooldownMs: 500, maxConcurrent: 1, design: design([1200, 2200], "Mechanical resolution, harmonic crystal chord and energy bloom; solution found, not jackpot.", 5, 5) }),
  "game.perfect": sfx("sfx-game-perfect", "gameplay/game-perfect", { volume: 1, cooldownMs: 500, maxConcurrent: 1, design: design([1500, 2500], "Win identity with higher harmonic resolution and extra crystal shimmer.", 5, 5) }),
  "game.fail": sfx("sfx-game-fail", "gameplay/game-fail", { volume: .75, cooldownMs: 500, maxConcurrent: 1, design: design([700, 1300], "Mechanical slowdown and low tonal fall; sober, no buzzer.", 3, 5) }),
  "time.warning": sfx("sfx-time-warning", "gameplay/time-warning", { volume: .60, cooldownMs: 1000, maxConcurrent: 1, design: design([200, 400], "Low pulse with concise alert tone at final phase.", 3, 3) }),
  "time.critical": sfx("sfx-time-critical", "gameplay/time-critical", { volume: .65, cooldownMs: 1000, maxConcurrent: 1, design: design([200, 400], "Discreet critical alert for selected final-second thresholds only.", 4, 4) }),
};

export const MUSIC_CONFIG: Readonly<Record<MusicCue, AudioCueConfig>> = {
  "menu.main": { key: "music-menu-main", sources: asset("music/menu/menu-main"), volume: .55, loop: true, design: design([60_000, 120_000], "Relaxed mechanical ambient: pad, metallic texture, subtle pulse and crystal accents.", 1, 1) },
  "menu.shop": { key: "music-menu-shop", sources: asset("music/menu/menu-main"), volume: .55, loop: true, design: design([60_000, 120_000], "Uses menu-main until a dedicated shop composition exists.", 1, 1) },
  "game.adventure": { key: "music-game-adventure", sources: asset("music/gameplay/adventure"), volume: .55, loop: true, design: design([60_000, 120_000], "80–100 BPM, light rhythmic progression and discovery.", 2, 1) },
  "game.free": { key: "music-game-free", sources: asset("music/gameplay/free"), volume: .55, loop: true, design: design([60_000, 120_000], "70–95 BPM, less rhythm and more ambient space.", 1, 1) },
  "game.timeAttack": { key: "music-game-time-attack", sources: asset("music/gameplay/time-attack"), volume: .55, loop: true, design: design([60_000, 120_000], "105–125 BPM controlled pulse, mechanical percussion and synthetic sequence.", 3, 2) },
  "game.ranked": { key: "music-game-ranked", sources: asset("music/gameplay/ranked"), volume: .55, loop: true, design: design([60_000, 120_000], "95–115 BPM competitive yet puzzle-focused; bass pulse and restrained percussion.", 3, 2) },
};

export const MODE_AUDIO_CONFIG = { FREE: { music: "game.free" }, ADVENTURE: { music: "game.adventure" }, TIME_ATTACK: { music: "game.timeAttack", dynamicIntensity: true }, RANKED: { music: "game.ranked" } } as const;
