import { Injectable, signal } from "@angular/core";
import { App } from "@capacitor/app";
import { AUDIO_PACKS, AUDIO_SETTINGS, MUSIC_CONFIG, SFX_CONFIG } from "./audio.config";
import { AudioAssetStatus, AudioCue, AudioCueConfig, AudioDebugCounters, AudioDebugEvent, AudioPackConfig, AudioSettings, MusicCue, SfxRuntimeTuning } from "./audio.models";

const STORAGE_KEY = "gearithm.audio.settings.v1";
const defaults: AudioSettings = { masterVolume: 1, musicVolume: AUDIO_SETTINGS.music.defaultVolume, sfxVolume: AUDIO_SETTINGS.sfx.defaultVolume, masterMuted: false, musicMuted: false, sfxMuted: false, audioPack: "classic" };
const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
type ActiveSfx = { stop(): void; setVolume(value: number): void };

/** Owns playback independently from Phaser. Music uses HTMLMedia; decoded Web Audio buffers provide low-latency SFX. */
@Injectable({ providedIn: "root" })
export class AudioService {
  readonly masterVolume = signal(defaults.masterVolume); readonly musicVolume = signal(defaults.musicVolume); readonly sfxVolume = signal(defaults.sfxVolume);
  readonly masterMuted = signal(defaults.masterMuted); readonly musicMuted = signal(defaults.musicMuted); readonly sfxMuted = signal(defaults.sfxMuted);
  readonly activeAudioPack = signal(defaults.audioPack); readonly audioPacks: readonly AudioPackConfig[] = AUDIO_PACKS; readonly audioDebugEnabled = signal(false);
  readonly currentMusicCue = signal<MusicCue | null>(null); readonly debugCounters = signal<Readonly<Record<string, AudioDebugCounters>>>({}); readonly debugEvents = signal<readonly AudioDebugEvent[]>([]); readonly assetStatuses = signal<Readonly<Record<string, AudioAssetStatus>>>({});
  /** Non-persistent calibration overlay used by the audio-debug mixer. */
  readonly sfxRuntimeTunings = signal<Readonly<Partial<Record<AudioCue, SfxRuntimeTuning>>>>({});
  private readonly lastPlayed = new Map<AudioCue, number>();
  private readonly activeSfx = new Map<AudioCue, Set<ActiveSfx>>();
  private readonly sfxBuffers = new Map<string, AudioBuffer>();
  private readonly sfxBufferLoads = new Map<string, Promise<AudioBuffer | undefined>>();
  private currentMusic?: { cue: MusicCue; element: HTMLAudioElement };
  private sfxContext?: AudioContext;
  private preloadGeneration = 0;
  private musicWasPlayingBeforeBackground = false;
  private musicAwaitingUserGesture = false;
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.restore();
    void this.preloadActivePack();
    document.addEventListener("visibilitychange", () => document.hidden ? this.onBackground() : this.onForeground());
    document.addEventListener("pointerdown", () => this.resumeAudioFromGesture(), { passive: true });
    document.addEventListener("keydown", () => this.resumeAudioFromGesture());
    void App.addListener("appStateChange", ({ isActive }) => isActive ? this.onForeground() : this.onBackground()).catch(() => undefined);
  }

  playUi(cue: "tap" | "confirm" | "cancel" | "open" | "close"): void { this.playSfx(`ui.${cue}`); }
  playSfx(cue: AudioCue): void {
    const config = this.sfxConfig(cue); const now = performance.now(); this.count(cue, "requested");
    if ((config.cooldownMs ?? 0) > now - (this.lastPlayed.get(cue) ?? -Infinity)) { this.count(cue, "skippedCooldown"); this.debug(`SKIP ${cue} cooldown`, "SKIP"); return; }
    const active = this.activeSfx.get(cue) ?? new Set<ActiveSfx>();
    if (active.size >= (config.maxConcurrent ?? Infinity)) { this.count(cue, "skippedConcurrency"); this.debug(`SKIP ${cue} maxConcurrent`, "SKIP"); return; }
    this.lastPlayed.set(cue, now);
    const sources = this.pickSources(config);
    const buffer = sources.map((source) => ({ source, buffer: this.sfxBuffers.get(source) })).find((item) => item.buffer);
    if (buffer?.buffer && this.getSfxContext()) { this.playBufferedSfx(cue, config, buffer.buffer, active); return; }
    this.playHtmlSfx(cue, config, sources, active);
  }
  playMusic(cue: MusicCue, crossfadeMs = AUDIO_SETTINGS.music.crossfadeMs): void {
    if (this.currentMusic?.cue === cue) { if (this.currentMusic.element.paused) this.tryPlayMusic(this.currentMusic.element, cue); return; }
    const next = this.createMusicAudio(MUSIC_CONFIG[cue], cue); next.loop = true; next.volume = 0;
    const previous = this.currentMusic; this.currentMusic = { cue, element: next }; this.currentMusicCue.set(cue);
    this.tryPlayMusic(next, cue); this.fade(next, this.finalMusicVolume(MUSIC_CONFIG[cue]), crossfadeMs);
    if (previous) this.fade(previous.element, 0, crossfadeMs, () => this.disposeMusicElement(previous.element));
    this.debug(`PLAY MUSIC ${cue}`, "MUSIC");
  }
  stopMusic(): void { if (!this.currentMusic) return; this.disposeMusicElement(this.currentMusic.element); this.currentMusic = undefined; this.currentMusicCue.set(null); }
  pauseMusic(): void { if (this.currentMusic && !this.currentMusic.element.paused) this.currentMusic.element.pause(); }
  resumeMusic(): void { if (this.currentMusic) this.tryPlayMusic(this.currentMusic.element, this.currentMusic.cue); }
  setMasterVolume(value: number): void { this.masterVolume.set(clamp(value)); this.persist(); this.refreshVolumes(); }
  setMusicVolume(value: number): void { this.musicVolume.set(clamp(value)); this.persist(); this.refreshVolumes(); }
  setSfxVolume(value: number): void { this.sfxVolume.set(clamp(value)); this.persist(); this.refreshVolumes(); }
  setMasterMuted(value: boolean): void { this.masterMuted.set(value); this.persist(); this.refreshVolumes(); }
  setMusicMuted(value: boolean): void { this.musicMuted.set(value); this.persist(); this.refreshVolumes(); }
  setSfxMuted(value: boolean): void { this.sfxMuted.set(value); this.persist(); this.refreshVolumes(); }
  toggleMasterMute(): void { this.setMasterMuted(!this.masterMuted()); } toggleMusicMute(): void { this.setMusicMuted(!this.musicMuted()); } toggleSfxMute(): void { this.setSfxMuted(!this.sfxMuted()); }
  duckMusic(target: number = AUDIO_SETTINGS.ducking.targetVolume, fadeMs: number = AUDIO_SETTINGS.ducking.fadeMs): void { if (this.currentMusic) this.fade(this.currentMusic.element, clamp(target), fadeMs); }
  restoreMusic(fadeMs = AUDIO_SETTINGS.ducking.fadeMs): void { if (this.currentMusic) this.fade(this.currentMusic.element, this.finalMusicVolume(MUSIC_CONFIG[this.currentMusic.cue]), fadeMs); }
  setTimeAttackIntensity(state: "NORMAL" | "WARNING" | "CRITICAL"): void { if (this.currentMusic?.cue === "game.timeAttack") this.currentMusic.element.playbackRate = state === "CRITICAL" ? 1.05 : state === "WARNING" ? 1.02 : 1; }
  resetSettings(): void { const music = this.currentMusic?.cue; const packChanged = this.activeAudioPack() !== defaults.audioPack; this.masterVolume.set(defaults.masterVolume); this.musicVolume.set(defaults.musicVolume); this.sfxVolume.set(defaults.sfxVolume); this.masterMuted.set(false); this.musicMuted.set(false); this.sfxMuted.set(false); this.activeAudioPack.set(defaults.audioPack); this.persist(); this.refreshVolumes(); if (packChanged) { this.resetSfxPack(); if (music) { this.stopMusic(); this.playMusic(music); } } }
  setAudioPack(packId: string): void { if (!AUDIO_PACKS.some((pack) => pack.id === packId) || packId === this.activeAudioPack()) return; const music = this.currentMusic?.cue; this.activeAudioPack.set(packId); this.persist(); this.resetSfxPack(); if (music) { this.stopMusic(); this.playMusic(music); } }
  stopAllSfx(): void { for (const elements of this.activeSfx.values()) for (const element of elements) element.stop(); this.activeSfx.clear(); }
  stopAllAudio(): void { this.stopAllSfx(); this.stopMusic(); }
  handleAppBackground(): void { this.onBackground(); } handleAppForeground(): void { this.onForeground(); }
  clearDebugStats(): void { this.debugCounters.set({}); this.debugEvents.set([]); }
  activeSounds(): Readonly<Record<string, number>> { return Object.fromEntries([...this.activeSfx].map(([cue, values]) => [cue, values.size])); }
  resolveActivePackSource(source: string): string { const pack = AUDIO_PACKS.find((item) => item.id === this.activeAudioPack()) ?? AUDIO_PACKS[0]; return source.replace(/^assets\/audio(?=\/)/, pack.assetRoot); }
  sfxConfig(cue: AudioCue): AudioCueConfig { return { ...SFX_CONFIG[cue], ...this.sfxRuntimeTunings()[cue] }; }
  setSfxRuntimeTuning(cue: AudioCue, tuning: SfxRuntimeTuning): void {
    const normalized: SfxRuntimeTuning = {};
    if ("volume" in tuning && tuning.volume !== undefined) normalized.volume = clamp(tuning.volume);
    if ("cooldownMs" in tuning && tuning.cooldownMs !== undefined) normalized.cooldownMs = Math.max(0, tuning.cooldownMs);
    if ("maxConcurrent" in tuning && tuning.maxConcurrent !== undefined) normalized.maxConcurrent = Math.max(1, Math.floor(tuning.maxConcurrent));
    if ("pitchVariation" in tuning && tuning.pitchVariation !== undefined) normalized.pitchVariation = Math.max(0, tuning.pitchVariation);
    if ("trim" in tuning) normalized.trim = tuning.trim && { startMs: tuning.trim.startMs === undefined ? undefined : Math.max(0, tuning.trim.startMs), endMs: tuning.trim.endMs === undefined ? undefined : Math.max(0, tuning.trim.endMs) };
    this.sfxRuntimeTunings.update((all) => ({ ...all, [cue]: { ...all[cue], ...normalized } }));
    this.refreshVolumes();
  }
  resetSfxRuntimeTunings(): void { this.sfxRuntimeTunings.set({}); this.refreshVolumes(); }
  calibratedSfxCatalog(): Readonly<Record<AudioCue, AudioCueConfig>> { return Object.fromEntries((Object.keys(SFX_CONFIG) as AudioCue[]).map((cue) => [cue, this.sfxConfig(cue)])) as Readonly<Record<AudioCue, AudioCueConfig>>; }

  private resetSfxPack(): void { this.stopAllSfx(); this.sfxBuffers.clear(); this.sfxBufferLoads.clear(); this.assetStatuses.set({}); void this.preloadActivePack(); }
  private async preloadActivePack(): Promise<void> {
    const generation = ++this.preloadGeneration; const packId = this.activeAudioPack();
    const entries = (Object.keys(SFX_CONFIG) as AudioCue[]).map((cue) => [cue, this.sfxConfig(cue)] as [AudioCue, AudioCueConfig]);
    entries.forEach(([cue]) => this.setAssetStatus(cue, "LOADING"));
    if (!this.getSfxContext()) return;
    await Promise.all(entries.map(async ([cue, config]) => {
      const groups = config.variants ?? [config.sources];
      const buffers = await Promise.all(groups.map((sources) => this.loadFirstDecodableBuffer(sources.map((source) => this.resolveActivePackSource(source)))));
      if (generation !== this.preloadGeneration || packId !== this.activeAudioPack()) return;
      if (buffers.some(Boolean)) this.setAssetStatus(cue, "LOADED");
      else { this.setAssetStatus(cue, "MISSING"); this.warn(`Unable to preload audio cue: ${cue}`); }
    }));
  }
  private playBufferedSfx(cue: AudioCue, config: AudioCueConfig, buffer: AudioBuffer, active: Set<ActiveSfx>): void {
    const context = this.getSfxContext(); if (!context) return;
    const source = context.createBufferSource(); const gain = context.createGain(); source.buffer = buffer;
    source.playbackRate.value = config.pitchVariation ? 1 + (Math.random() * 2 - 1) * config.pitchVariation : 1;
    gain.gain.value = this.finalSfxVolume(config); source.connect(gain).connect(context.destination);
    const entry: ActiveSfx = { stop: () => { try { source.stop(); } catch { /* The source may already be ended. */ } }, setVolume: (value) => { gain.gain.value = value; } };
    active.add(entry); this.activeSfx.set(cue, active);
    source.onended = () => { active.delete(entry); if (!active.size) this.activeSfx.delete(cue); };
    try {
      const trim = this.trimWindow(config, buffer.duration);
      if (trim.durationSeconds === undefined) source.start(0, trim.startSeconds);
      else source.start(0, trim.startSeconds, trim.durationSeconds);
      this.count(cue, "played"); this.setAssetStatus(cue, "LOADED"); this.debug(`PLAY ${cue}`, "PLAY");
    } catch { active.delete(entry); this.count(cue, "failedPlayback"); this.setAssetStatus(cue, "ERROR"); this.warn(`Unable to play ${cue}`); }
  }
  private playHtmlSfx(cue: AudioCue, config: AudioCueConfig, sources: readonly string[], active: Set<ActiveSfx>): void {
    const element = new Audio(); let stopTimer: ReturnType<typeof setTimeout> | undefined; element.preload = "auto"; element.volume = this.finalSfxVolume(config); element.playbackRate = config.pitchVariation ? 1 + (Math.random() * 2 - 1) * config.pitchVariation : 1;
    const finish = () => { if (stopTimer !== undefined) clearTimeout(stopTimer); active.delete(entry); if (!active.size) this.activeSfx.delete(cue); this.disposeSfxElement(element); };
    const entry: ActiveSfx = { stop: finish, setVolume: (value) => { element.volume = value; } };
    active.add(entry); this.activeSfx.set(cue, active);
    element.onended = finish;
    element.onerror = () => { this.count(cue, "failedPlayback"); this.setAssetStatus(cue, "MISSING"); this.warn(`Missing or undecodable audio asset: ${sources.join(", ")}`); finish(); };
    element.onloadedmetadata = () => { const trim = this.trimWindow(config, element.duration); element.currentTime = trim.startSeconds; void element.play().then(() => { this.count(cue, "played"); this.setAssetStatus(cue, "LOADED"); this.debug(`PLAY ${cue}`, "PLAY"); if (trim.durationSeconds !== undefined) stopTimer = setTimeout(finish, trim.durationSeconds * 1000 / element.playbackRate); }).catch(() => { element.onerror?.(new Event("error")); }); };
    for (const source of sources) { const candidate = document.createElement("source"); candidate.src = source; candidate.type = this.mimeType(source); element.append(candidate); }
    element.load();
  }
  private pickSources(config: AudioCueConfig): readonly string[] { const sources = config.variants?.[Math.floor(Math.random() * config.variants.length)] ?? config.sources; return sources.map((source) => this.resolveActivePackSource(source)); }
  private async loadFirstDecodableBuffer(sources: readonly string[]): Promise<AudioBuffer | undefined> { for (const source of sources) { const buffer = await this.loadBuffer(source); if (buffer) return buffer; } return undefined; }
  private loadBuffer(source: string): Promise<AudioBuffer | undefined> { const cached = this.sfxBuffers.get(source); if (cached) return Promise.resolve(cached); const existing = this.sfxBufferLoads.get(source); if (existing) return existing; const context = this.getSfxContext(); if (!context) return Promise.resolve(undefined); const load = fetch(source).then(async (response) => { if (!response.ok) return undefined; const buffer = await context.decodeAudioData((await response.arrayBuffer()).slice(0)); this.sfxBuffers.set(source, buffer); return buffer; }).catch(() => undefined); this.sfxBufferLoads.set(source, load); return load; }
  private getSfxContext(): AudioContext | undefined { if (this.sfxContext) return this.sfxContext; if (!globalThis.AudioContext) return undefined; this.sfxContext = new AudioContext(); return this.sfxContext; }
  private resumeAudioFromGesture(): void { this.resumePendingMusicFromGesture(); const context = this.getSfxContext(); if (context?.state === "suspended") void context.resume(); }
  private createMusicAudio(config: AudioCueConfig, statusKey: string): HTMLAudioElement { const element = new Audio(); const sources = config.sources.map((source) => this.resolveActivePackSource(source)); element.preload = "auto"; for (const source of sources) { const candidate = document.createElement("source"); candidate.src = source; candidate.type = this.mimeType(source); element.append(candidate); } element.load(); element.volume = this.finalMusicVolume(config); element.onerror = () => { this.setAssetStatus(statusKey, "MISSING"); this.warn(`Missing or undecodable music asset: ${sources.join(", ")}`); }; return element; }
  private disposeSfxElement(element: HTMLAudioElement): void { element.onended = null; element.onerror = null; element.onloadedmetadata = null; element.pause(); element.replaceChildren(); element.removeAttribute("src"); element.load(); }
  private disposeMusicElement(element: HTMLAudioElement): void { element.onerror = null; element.pause(); element.replaceChildren(); element.removeAttribute("src"); element.load(); }
  private mimeType(source: string): string { return source.endsWith(".ogg") ? "audio/ogg" : source.endsWith(".mp3") ? "audio/mpeg" : "audio/wav"; }
  private trimWindow(config: AudioCueConfig, totalSeconds: number): { startSeconds: number; durationSeconds?: number } { const startSeconds = Math.min(Math.max(0, (config.trim?.startMs ?? 0) / 1000), totalSeconds); if (config.trim?.endMs === undefined) return { startSeconds }; const endSeconds = Math.min(Math.max(startSeconds, config.trim.endMs / 1000), totalSeconds); return { startSeconds, durationSeconds: Math.max(0, endSeconds - startSeconds) }; }
  private finalSfxVolume(config: AudioCueConfig): number { return this.masterMuted() || this.sfxMuted() ? 0 : clamp(this.masterVolume() * this.sfxVolume() * (config.volume ?? 1)); }
  private finalMusicVolume(config: AudioCueConfig): number { return this.masterMuted() || this.musicMuted() ? 0 : clamp(this.masterVolume() * this.musicVolume() * (config.volume ?? 1)); }
  private refreshVolumes(): void { if (this.currentMusic) this.currentMusic.element.volume = this.finalMusicVolume(MUSIC_CONFIG[this.currentMusic.cue]); for (const [cue, elements] of this.activeSfx) for (const element of elements) element.setVolume(this.finalSfxVolume(this.sfxConfig(cue))); }
  private fade(element: HTMLAudioElement, target: number, duration: number, done?: () => void): void { const start = element.volume; const started = performance.now(); const frame = () => { const p = Math.min(1, (performance.now() - started) / Math.max(1, duration)); element.volume = start + (target - start) * p; if (p < 1) requestAnimationFrame(frame); else done?.(); }; requestAnimationFrame(frame); }
  private onBackground(): void { this.musicWasPlayingBeforeBackground ||= !!this.currentMusic && !this.currentMusic.element.paused; this.pauseMusic(); this.stopAllSfx(); }
  private onForeground(): void { if (this.musicWasPlayingBeforeBackground) this.resumeMusic(); this.musicWasPlayingBeforeBackground = false; }
  private tryPlayMusic(element: HTMLAudioElement, cue: MusicCue): void { void element.play().then(() => { this.musicAwaitingUserGesture = false; this.setAssetStatus(cue, "LOADED"); }).catch(() => { this.musicAwaitingUserGesture = true; this.warn(`Music ${cue} awaits a user gesture or could not start`); }); }
  private resumePendingMusicFromGesture(): void { if (!this.musicAwaitingUserGesture || !this.currentMusic) return; this.tryPlayMusic(this.currentMusic.element, this.currentMusic.cue); }
  private restore(): void { try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<AudioSettings>; this.masterVolume.set(clamp(parsed.masterVolume ?? defaults.masterVolume)); this.musicVolume.set(clamp(parsed.musicVolume ?? defaults.musicVolume)); this.sfxVolume.set(clamp(parsed.sfxVolume ?? defaults.sfxVolume)); this.masterMuted.set(parsed.masterMuted ?? false); this.musicMuted.set(parsed.musicMuted ?? false); this.sfxMuted.set(parsed.sfxMuted ?? false); this.activeAudioPack.set(AUDIO_PACKS.some((pack) => pack.id === parsed.audioPack) ? parsed.audioPack! : defaults.audioPack); } catch { /* Defaults are safe when storage is unavailable. */ } }
  private persist(): void { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ masterVolume: this.masterVolume(), musicVolume: this.musicVolume(), sfxVolume: this.sfxVolume(), masterMuted: this.masterMuted(), musicMuted: this.musicMuted(), sfxMuted: this.sfxMuted(), audioPack: this.activeAudioPack() } satisfies AudioSettings)); } catch { /* Persistence must never affect gameplay. */ } }
  private count(cue: string, field: keyof AudioDebugCounters): void { this.debugCounters.update((all) => { const current: AudioDebugCounters = all[cue] ?? { requested: 0, played: 0, skippedCooldown: 0, skippedConcurrency: 0, failedPlayback: 0 }; return { ...all, [cue]: { ...current, [field]: current[field] + 1 } }; }); }
  private setAssetStatus(cue: string, status: AudioAssetStatus): void { this.assetStatuses.update((all) => ({ ...all, [cue]: status })); }
  private debug(message: string, kind: AudioDebugEvent["kind"] = "PLAY"): void { this.debugEvents.update((events) => [...events.slice(-49), { timestamp: Date.now(), kind, message }]); if (this.audioDebugEnabled()) console.debug(`[AUDIO] ${message}`); }
  private warn(message: string): void { this.debugEvents.update((events) => [...events.slice(-49), { timestamp: Date.now(), kind: "ERROR", message }]); if (this.audioDebugEnabled()) console.warn(`[AUDIO] ${message}`); }
}
