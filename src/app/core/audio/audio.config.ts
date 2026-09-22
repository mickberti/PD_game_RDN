import { AudioCue, AudioCueConfig, AudioDesignSpec, AudioPackConfig, MusicCue } from "./audio.models";

type AudioFormat = "ogg" | "mp3" | "wav";
/** Lists compatible alternatives in preference order; the runtime falls back when a format is absent or unsupported. */
const asset = (path: string, formats: readonly AudioFormat[] = ["wav"]): readonly string[] => formats.map((format) => `assets/audio/${path}.${format}`);
const musicAsset = (path: string): readonly string[] => asset(path, ["ogg", "mp3", "wav"]);
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
  "ui.tap": {
    "key": "sfx-ui-tap",
    "sources": [
      "assets/audio/sfx/ui/tap.wav"
    ],
    "volume": 0.45,
    "cooldownMs": 30,
    "maxConcurrent": 2,
    "design": {
      "durationMs": [
        40,
        80
      ],
      "character": "Soft mechanical click with discreet digital tick.",
      "intensity": 1,
      "priority": 1
    }
  },
  "ui.confirm": {
    "key": "sfx-ui-confirm",
    "sources": [
      "assets/audio/sfx/ui/confirm.wav"
    ],
    "volume": 0.45,
    "cooldownMs": 50,
    "maxConcurrent": 2,
    "design": {
      "durationMs": [
        100,
        180
      ],
      "character": "Click with a micro tonal rise; positive, never celebratory.",
      "intensity": 1,
      "priority": 1
    }
  },
  "ui.cancel": {
    "key": "sfx-ui-cancel",
    "sources": [
      "assets/audio/sfx/ui/cancel.wav"
    ],
    "volume": 0.45,
    "cooldownMs": 50,
    "maxConcurrent": 2,
    "design": {
      "durationMs": [
        80,
        160
      ],
      "character": "Soft click and small downward tone.",
      "intensity": 1,
      "priority": 1
    }
  },
  "ui.open": {
    "key": "sfx-ui-open",
    "sources": [
      "assets/audio/sfx/ui/open.wav"
    ],
    "volume": 0.45,
    "cooldownMs": 50,
    "maxConcurrent": 2,
    "design": {
      "durationMs": [
        150,
        250
      ],
      "character": "Mechanical slide with soft energy shimmer.",
      "intensity": 1,
      "priority": 1
    }
  },
  "ui.close": {
    "key": "sfx-ui-close",
    "sources": [
      "assets/audio/sfx/ui/close.wav"
    ],
    "volume": 0.45,
    "cooldownMs": 50,
    "maxConcurrent": 2,
    "design": {
      "durationMs": [
        150,
        250
      ],
      "character": "Reverse opening: receding slide and shimmer.",
      "intensity": 1,
      "priority": 1
    }
  },
  "gear.rotate": {
    "key": "sfx-gear-rotate",
    "sources": [
      "assets/audio/sfx/gear/small-metal-hit-01.wav"
    ],
    "variants": [
      [
        "assets/audio/sfx/gear/small-metal-hit-01.wav"
      ],
      [
        "assets/audio/sfx/gear/small-metal-hit-05.wav"
      ],
      [
        "assets/audio/sfx/gear/small-metal-hit-11.wav"
      ]
    ],
    "volume": 0.5,
    "cooldownMs": 40,
    "maxConcurrent": 2,
    "pitchVariation": 0.15,
    "design": {
      "durationMs": [
        40,
        90
      ],
      "character": "Precise ratchet click: 70% refined mechanics, 30% synthetic energy.",
      "intensity": 1,
      "priority": 1
    }
  },
  "gear.snap": {
    "key": "sfx-gear-snap",
    "sources": [
      "assets/audio/sfx/gear/snap.wav"
    ],
    "volume": 0,
    "cooldownMs": 60,
    "maxConcurrent": 2,
    "design": {
      "durationMs": [
        120,
        220
      ],
      "character": "Metallic snap plus short resonance; confirms valid position.",
      "intensity": 2,
      "priority": 2
    }
  },
  "pulse.start": {
    "key": "sfx-pulse-start",
    "sources": [
      "assets/audio/sfx/pulse/start1.wav"
    ],
    "volume": 0.1,
    "cooldownMs": 50,
    "maxConcurrent": 1,
    "design": {
      "durationMs": [
        150,
        300
      ],
      "character": "Short mechanical release and controlled energy charge.",
      "intensity": 3,
      "priority": 3
    }
  },
  "pulse.travel": {
    "key": "sfx-pulse-travel",
    "sources": [
      "assets/audio/sfx/pulse/travel1.wav"
    ],
    "volume": 1,
    "trim": {
      "startMs": 0
    },
    "cooldownMs": 70,
    "maxConcurrent": 1,
    "design": {
      "durationMs": [
        80,
        180
      ],
      "character": "Low energy zip / electric shimmer, deliberately unobtrusive.",
      "intensity": 1,
      "priority": 1
    },
    "pitchVariation": 0.23
  },
  "gem.change": {
    "key": "sfx-gem-change",
    "sources": [
      "assets/audio/sfx/gem/sysenter_5.wav"
    ],
    "variants": [
      [
        "assets/audio/sfx/gem/sysenter_5.wav"
      ],
      [
        "assets/audio/sfx/gem/sysenter_6.wav"
      ],
      [
        "assets/audio/sfx/gem/sysenter_7.wav"
      ]
    ],
    "volume": 0.4,
    "cooldownMs": 20,
    "maxConcurrent": 4,
    "pitchVariation": 0.03,
    "design": {
      "durationMs": [
        100,
        220
      ],
      "character": "Crystal tick with soft energy pop; change, not success.",
      "intensity": 2,
      "priority": 2
    }
  },
  "gem.zero": {
    "key": "sfx-gem-zero",
    "sources": [
      "assets/audio/sfx/gem/sysenter_1.wav"
    ],
    "variants": [
      [
        "assets/audio/sfx/gem/sysenter_1.wav"
      ],
      [
        "assets/audio/sfx/gem/sysenter_2.wav"
      ]
    ],
    "volume": 0.4,
    "cooldownMs": 20,
    "maxConcurrent": 1,
    "pitchVariation": 0.03,
    "design": {
      "durationMs": [
        100,
        220
      ],
      "character": "Crystal tick with soft energy pop; zero arrival placeholder.",
      "intensity": 2,
      "priority": 2
    }
  },
  "gem.noChange": {
    "key": "sfx-gem-no-change",
    "sources": [
      "assets/audio/sfx/gem/no-change.wav"
    ],
    "volume": 0.55,
    "cooldownMs": 35,
    "maxConcurrent": 3,
    "pitchVariation": 0.08,
    "design": {
      "durationMs": [
        70,
        150
      ],
      "character": "Soft neutral contact: a zero-value flow arrived but did not alter the gem.",
      "intensity": 1,
      "priority": 2
    }
  },
  "gem.break": {
    "key": "sfx-gem-break",
    "sources": [
      "assets/audio/sfx/gem/lsprice__gb012.wav"
    ],
    "variants": [
      [
        "assets/audio/sfx/gem/lsprice__gb04.wav"
      ],
      [
        "assets/audio/sfx/gem/lsprice__gb09.wav"
      ],
      [
        "assets/audio/sfx/gem/lsprice__gb012.wav"
      ]
    ],
    "volume": 0.75,
    "cooldownMs": 50,
    "maxConcurrent": 1,
    "design": {
      "durationMs": [
        300,
        550
      ],
      "character": "Crystal impact, energy collapse and harmonic shimmer; never coin/slot-machine.",
      "intensity": 4,
      "priority": 4
    },
    "pitchVariation": 0.11
  },
  "link.travel": {
    "key": "sfx-link-travel",
    "sources": [
      "assets/audio/sfx/pulse/travel1.wav"
    ],
    "volume": 1,
    "trim": {
      "startMs": 0
    },
    "cooldownMs": 45,
    "maxConcurrent": 4,
    "design": {
      "durationMs": [
        80,
        180
      ],
      "character": "Shared low-level energy transfer layer for linked flows.",
      "intensity": 1,
      "priority": 1
    }
  },
  "link.hit": {
    "key": "sfx-link-hit",
    "sources": [
      "assets/audio/sfx/gem/change-01.wav"
    ],
    "variants": [
      [
        "assets/audio/sfx/gem/change-01.wav"
      ],
      [
        "assets/audio/sfx/gem/change-02.wav"
      ]
    ],
    "volume": 0.45,
    "cooldownMs": 40,
    "maxConcurrent": 2,
    "design": {
      "durationMs": [
        100,
        220
      ],
      "character": "Restrained arrival layer sharing the gem-change palette.",
      "intensity": 2,
      "priority": 2
    }
  },
  "effect.link.echo": {
    "key": "sfx-effect-link-echo",
    "sources": ["assets/audio/sfx/pulse/travel1.wav"],
    "volume": 0.42,
    "cooldownMs": 35,
    "maxConcurrent": 4,
    "pitchVariation": 0.12,
    "design": { "durationMs": [80, 180], "character": "Short bright echo confirmation when a link duplicates the incoming flow at its destination.", "intensity": 2, "priority": 3 }
  },
  "effect.link.amplify": {
    "key": "sfx-effect-link-amplify",
    "sources": ["assets/audio/sfx/effects/explode-boom-bubble-in-the-water.wav"],
    "volume": 0.48,
    "cooldownMs": 45,
    "maxConcurrent": 4,
    "pitchVariation": 0.14,
    "design": { "durationMs": [250, 500], "character": "Rising energy confirmation when a link amplifies the carried value.", "intensity": 3, "priority": 3 }
  },
  "effect.link.invert": {
    "key": "sfx-effect-link-invert",
    "sources": ["assets/audio/sfx/effects/sfx-sci-fi-user-interface-robot-sci-fi.wav"],
    "volume": 0.48,
    "trim": { "startMs": 930, "endMs": 2670 },
    "cooldownMs": 45,
    "maxConcurrent": 4,
    "pitchVariation": 0.14,
    "design": { "durationMs": [250, 450], "character": "Concise reverse tonal flip when a link inverts the carried value.", "intensity": 3, "priority": 3 }
  },
  "effect.link.chain": {
    "key": "sfx-effect-link-chain",
    "sources": ["assets/audio/sfx/effects/small-metal-hit-08.wav"],
    "volume": 0.58,
    "cooldownMs": 50,
    "maxConcurrent": 3,
    "pitchVariation": 0.1,
    "design": { "durationMs": [180, 380], "character": "Firm mechanical lock confirmation when a Chain link blocks its destination.", "intensity": 3, "priority": 3 }
  },
  "bonus.activate": {
    "key": "sfx-bonus-activate",
    "sources": [
      "assets/audio/sfx/gameplay/bonus-activate.wav"
    ],
    "volume": 0.75,
    "cooldownMs": 80,
    "maxConcurrent": 1,
    "design": {
      "durationMs": [
        350,
        700
      ],
      "character": "Energy charge with bright crystal resonance.",
      "intensity": 3,
      "priority": 4
    }
  },
  "effect.shield": {
    "key": "sfx-effect-shield",
    "sources": [
      "assets/audio/sfx/effects/impact-explosiom-sci-fi-explode-boom-effect-sfx.wav"
    ],
    "volume": 1,
    "trim": {
      "startMs": 1000,
      "endMs": 3000
    },
    "cooldownMs": 60,
    "maxConcurrent": 2,
    "design": {
      "durationMs": [
        300,
        600
      ],
      "character": "Low impact and glass/energy resonance; protection and absorption.",
      "intensity": 3,
      "priority": 3
    }
  },
  "effect.wall": {
    "key": "sfx-effect-wall",
    "sources": [
      "assets/audio/sfx/effects/small-metal-hit-08.wav"
    ],
    "volume": 0.9,
    "cooldownMs": 60,
    "maxConcurrent": 2,
    "design": {
      "durationMs": [
        250,
        500
      ],
      "character": "Stone/metal lock and low mechanical impact.",
      "intensity": 3,
      "priority": 3
    },
    "pitchVariation": 0.15
  },
  "effect.barrierBreak": {
    "key": "sfx-effect-barrier-break",
    "sources": [
      "assets/audio/sfx/gem/lsprice__gb012.wav"
    ],
    "variants": [
      [
        "assets/audio/sfx/gem/lsprice__gb04.wav"
      ],
      [
        "assets/audio/sfx/gem/lsprice__gb09.wav"
      ],
      [
        "assets/audio/sfx/gem/lsprice__gb012.wav"
      ]
    ],
    "volume": 0.75,
    "cooldownMs": 50,
    "maxConcurrent": 4,
    "design": {
      "durationMs": [
        300,
        700
      ],
      "character": "Decisive crystalline/metallic shatter for normal, ice, and fire barriers breaking into fragments.",
      "intensity": 4,
      "priority": 4
    },
    "pitchVariation": 0.1
  },
  "effect.fire": {
    "key": "sfx-effect-fire",
    "sources": [
      "assets/audio/sfx/effects/fireball-pass-by-crackle.wav"
    ],
    "volume": 0.75,
    "cooldownMs": 60,
    "maxConcurrent": 2,
    "design": {
      "durationMs": [
        250,
        500
      ],
      "character": "Temporary fire barrier cue using the wall asset.",
      "intensity": 3,
      "priority": 3
    }
  },
  "effect.mirror": {
    "key": "sfx-effect-mirror",
    "sources": [
      "assets/audio/sfx/effects/sfx-sci-fi-user-interface-robot-sci-fi.wav"
    ],
    "volume": 0.5,
    "trim": {
      "startMs": 7030,
      "endMs": 8010
    },
    "cooldownMs": 60,
    "maxConcurrent": 2,
    "design": {
      "durationMs": [
        300,
        500
      ],
      "character": "Reverse shimmer and crystal sweep.",
      "intensity": 3,
      "priority": 3
    },
    "pitchVariation": 0.19
  },
  "effect.amplifier": {
    "key": "sfx-effect-amplifier",
    "sources": [
      "assets/audio/sfx/effects/explode-boom-bubble-in-the-water.wav"
    ],
    "volume": 0.5,
    "cooldownMs": 60,
    "maxConcurrent": 2,
    "design": {
      "durationMs": [
        300,
        550
      ],
      "character": "Rising energy pulse; increased power without arcade excess.",
      "intensity": 3,
      "priority": 3
    },
    "pitchVariation": 0.19
  },
  "effect.inverter": {
    "key": "sfx-effect-inverter",
    "sources": [
      "assets/audio/sfx/effects/sfx-sci-fi-user-interface-robot-sci-fi.wav"
    ],
    "volume": 0.5,
    "trim": {
      "startMs": 930,
      "endMs": 2670
    },
    "cooldownMs": 0,
    "maxConcurrent": 10,
    "design": {
      "durationMs": [
        250,
        450
      ],
      "character": "Short tone and reverse tonal flip.",
      "intensity": 3,
      "priority": 3
    },
    "pitchVariation": 0.19
  },
  "effect.freeze": {
    "key": "sfx-effect-freeze",
    "sources": [
      "assets/audio/sfx/effects/iceball-impact-freeze-over-crack.wav"
    ],
    "volume": 0.8,
    "cooldownMs": 0,
    "maxConcurrent": 10,
    "design": {
      "durationMs": [
        350,
        650
      ],
      "character": "Technological crystal-ice snap, not fantasy ice magic.",
      "intensity": 3,
      "priority": 3
    }
  },
  "effect.area.bombs": {
    "key": "sfx-effect-area",
    "sources": [
      "assets/audio/sfx/effects/explode-boom-explosion-bomb.wav"
    ],
    "volume": 0.28,
    "trim": {
      "startMs": 3900,
      "endMs": 6000
    },
    "cooldownMs": 0,
    "maxConcurrent": 10,
    "design": {
      "durationMs": [
        350,
        700
      ],
      "character": "Temporary area-bomb cue; replace independently when dedicated assets are available.",
      "intensity": 4,
      "priority": 4
    }
  },
  "effect.iceResist": {
    "key": "sfx-effect-ice-resist",
    "sources": [
      "assets/audio/sfx/effects/impact-explosiom-sci-fi-explode-boom-effect-sfx.wav"
    ],
    "volume": 1,
    "trim": {
      "startMs": 1000,
      "endMs": 3000
    },
    "cooldownMs": 40,
    "maxConcurrent": 3,
    "design": {
      "durationMs": [
        180,
        360
      ],
      "character": "Ice wall resists an ice sphere.",
      "intensity": 3,
      "priority": 3
    }
  },
  "effect.fireResist": {
    "key": "sfx-effect-fire-resist",
    "sources": [
      "assets/audio/sfx/effects/impact-explosiom-sci-fi-explode-boom-effect-sfx.wav"
    ],
    "volume": 1,
    "trim": {
      "startMs": 1000,
      "endMs": 3000
    },
    "cooldownMs": 40,
    "maxConcurrent": 3,
    "design": {
      "durationMs": [
        180,
        360
      ],
      "character": "Fire wall resists a fire sphere.",
      "intensity": 3,
      "priority": 3
    }
  },
  "effect.iceMelt": {
    "key": "sfx-effect-ice-melt",
    "sources": [
      "assets/audio/sfx/effects/iceball-impact-freeze-over-crack.wav"
    ],
    "volume": 0.8,
    "cooldownMs": 40,
    "maxConcurrent": 3,
    "design": {
      "durationMs": [
        220,
        440
      ],
      "character": "Fire sphere melts an ice wall.",
      "intensity": 3,
      "priority": 3
    }
  },
  "effect.fireExtinguish": {
    "key": "sfx-effect-fire-extinguish",
    "sources": [
      "assets/audio/sfx/effects/fireball-pass-by-crackle.wav"
    ],
    "volume": 0.8,
    "cooldownMs": 40,
    "maxConcurrent": 3,
    "design": {
      "durationMs": [
        220,
        440
      ],
      "character": "Ice sphere extinguishes a fire wall.",
      "intensity": 3,
      "priority": 3
    }
  },
  "effect.timer": {
    "key": "sfx-effect-timer",
    "sources": [
      "assets/audio/sfx/effects/knufds__clock_03.wav"
    ],
    "volume": 0.75,
    "trim": {
      "startMs": 0,
      "endMs": 1500
    },
    "cooldownMs": 80,
    "maxConcurrent": 1,
    "design": {
      "durationMs": [
        0,
        1000
      ],
      "character": "Single clock-like pressure pulse; no continuous ticking.",
      "intensity": 2,
      "priority": 3
    }
  },
  "effect.corruption": {
    "key": "sfx-effect-corruption",
    "sources": [
      "assets/audio/sfx/effects/sinusglitches_7.wav"
    ],
    "volume": 0.75,
        "trim": {
      "startMs": 0,
      "endMs": 2500
    },
    "cooldownMs": 60,
    "maxConcurrent": 1,
    "design": {
      "durationMs": [
        400,
        800
      ],
      "character": "Controlled digital glitch and low energy growl; no horror.",
      "intensity": 3,
      "priority": 3
    }
  },
  "game.win": {
    "key": "sfx-game-win",
    "sources": [
      "assets/audio/sfx/gameplay/game-win.wav"
    ],
    "volume": 1,
    "cooldownMs": 500,
    "maxConcurrent": 1,
    "design": {
      "durationMs": [
        1200,
        2200
      ],
      "character": "Mechanical resolution, harmonic crystal chord and energy bloom; solution found, not jackpot.",
      "intensity": 5,
      "priority": 5
    }
  },
  "game.perfect": {
    "key": "sfx-game-perfect",
    "sources": [
      "assets/audio/sfx/gameplay/game-perfect.wav"
    ],
    "volume": 1,
    "cooldownMs": 500,
    "maxConcurrent": 1,
    "design": {
      "durationMs": [
        1500,
        2500
      ],
      "character": "Win identity with higher harmonic resolution and extra crystal shimmer.",
      "intensity": 5,
      "priority": 5
    }
  },
  "game.fail": {
    "key": "sfx-game-fail",
    "sources": [
      "assets/audio/sfx/gameplay/game-fail.wav"
    ],
    "volume": 0.75,
    "cooldownMs": 500,
    "maxConcurrent": 1,
    "design": {
      "durationMs": [
        700,
        1300
      ],
      "character": "Mechanical slowdown and low tonal fall; sober, no buzzer.",
      "intensity": 3,
      "priority": 5
    }
  },
  "time.warning": {
    "key": "sfx-time-warning",
    "sources": [
      "assets/audio/sfx/gameplay/time-warning.wav"
    ],
    "volume": 0.6,
    "cooldownMs": 1000,
    "maxConcurrent": 1,
    "design": {
      "durationMs": [
        200,
        400
      ],
      "character": "Low pulse with concise alert tone at final phase.",
      "intensity": 3,
      "priority": 3
    }
  },
  "time.critical": {
    "key": "sfx-time-critical",
    "sources": [
      "assets/audio/sfx/gameplay/time-critical.wav"
    ],
    "volume": 0.65,
    "cooldownMs": 1000,
    "maxConcurrent": 1,
    "design": {
      "durationMs": [
        200,
        400
      ],
      "character": "Discreet critical alert for selected final-second thresholds only.",
      "intensity": 4,
      "priority": 4
    }
  }
};


export const MUSIC_CONFIG: Readonly<Record<MusicCue, AudioCueConfig>> = {
  "menu.main": { key: "music-menu-main", sources: musicAsset("music/menu/gearithm_menu"), volume: .55, loop: true, design: design([60_000, 120_000], "Relaxed mechanical ambient: pad, metallic texture, subtle pulse and crystal accents.", 1, 1) },
  "game.adventure": { key: "music-game-adventure", sources: musicAsset("music/gameplay/gearithm"), volume: .55, loop: true, design: design([60_000, 120_000], "80–100 BPM, light rhythmic progression and discovery.", 2, 1) },
  "game.free": { key: "music-game-free", sources: musicAsset("music/gameplay/gearithm"), volume: .55, loop: true, design: design([60_000, 120_000], "70–95 BPM, less rhythm and more ambient space.", 1, 1) },
  "game.timeAttack": { key: "music-game-time-attack", sources: musicAsset("music/gameplay/gearithm"), volume: .55, loop: true, design: design([60_000, 120_000], "105–125 BPM controlled pulse, mechanical percussion and synthetic sequence.", 3, 2) },
  "game.ranked": { key: "music-game-ranked", sources: musicAsset("music/gameplay/gearithm"), volume: .55, loop: true, design: design([60_000, 120_000], "95–115 BPM competitive yet puzzle-focused; bass pulse and restrained percussion.", 3, 2) },
};

export const MODE_AUDIO_CONFIG = { FREE: { music: "game.free" }, ADVENTURE: { music: "game.adventure" }, TIME_ATTACK: { music: "game.timeAttack", dynamicIntensity: true }, RANKED: { music: "game.ranked" } } as const;
