import { Injectable, signal } from "@angular/core";
import { App } from "@capacitor/app";
import { AUDIO_PACKS, AUDIO_SETTINGS, MUSIC_CONFIG, SFX_CONFIG } from "./audio.config";
import { AudioAssetStatus, AudioCue, AudioCueConfig, AudioDebugCounters, AudioDebugEvent, AudioPackConfig, AudioSettings, MusicCue } from "./audio.models";

const STORAGE_KEY = "gearithm.audio.settings.v1";
const defaults: AudioSettings = { masterVolume: 1, musicVolume: AUDIO_SETTINGS.music.defaultVolume, sfxVolume: AUDIO_SETTINGS.sfx.defaultVolume, masterMuted: false, musicMuted: false, sfxMuted: false, audioPack: "classic" };
const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

/** Semantic audio facade. It deliberately owns HTML audio so Angular never depends on a Phaser Scene. */
@Injectable({ providedIn: "root" })
export class AudioService {
  readonly masterVolume = signal(defaults.masterVolume);
  readonly musicVolume = signal(defaults.musicVolume);
  readonly sfxVolume = signal(defaults.sfxVolume);
  readonly masterMuted = signal(defaults.masterMuted);
  readonly musicMuted = signal(defaults.musicMuted);
  readonly sfxMuted = signal(defaults.sfxMuted);
  readonly activeAudioPack = signal(defaults.audioPack);
  readonly audioPacks: readonly AudioPackConfig[] = AUDIO_PACKS;
  readonly audioDebugEnabled = signal(false);
  readonly currentMusicCue = signal<MusicCue | null>(null);
  readonly debugCounters = signal<Readonly<Record<string, AudioDebugCounters>>>({});
  readonly debugEvents = signal<readonly AudioDebugEvent[]>([]);
  readonly assetStatuses = signal<Readonly<Record<string, AudioAssetStatus>>>({});
  private readonly lastPlayed = new Map<AudioCue, number>();
  private readonly activeSfx = new Map<AudioCue, Set<HTMLAudioElement>>();
  private currentMusic?: { cue: MusicCue; element: HTMLAudioElement };
  private musicWasPlayingBeforeBackground = false;
  private musicAwaitingUserGesture = false;
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.restore();
    document.addEventListener("visibilitychange", () => document.hidden ? this.onBackground() : this.onForeground());
    // Web audio/HTMLMedia playback is blocked until a gesture in many browsers and WebViews.
    document.addEventListener("pointerdown", () => this.resumePendingMusicFromGesture(), { passive: true });
    document.addEventListener("keydown", () => this.resumePendingMusicFromGesture());
    void App.addListener("appStateChange", ({ isActive }) => isActive ? this.onForeground() : this.onBackground()).catch(() => undefined);
  }

  playUi(cue: "tap" | "confirm" | "cancel" | "open" | "close"): void { this.playSfx(`ui.${cue}`); }
  playSfx(cue: AudioCue): void {
    const config = SFX_CONFIG[cue]; const now = performance.now();
    this.count(cue, "requested");
    if ((config.cooldownMs ?? 0) > now - (this.lastPlayed.get(cue) ?? -Infinity)) { this.count(cue, "skippedCooldown"); return this.debug(`SKIP ${cue} cooldown`, "SKIP"); }
    const active = this.activeSfx.get(cue) ?? new Set<HTMLAudioElement>();
    if (active.size >= (config.maxConcurrent ?? Infinity)) { this.count(cue, "skippedConcurrency"); return this.debug(`SKIP ${cue} maxConcurrent`, "SKIP"); }
    this.lastPlayed.set(cue, now);
    const element = this.createAudio(config, cue); active.add(element); this.activeSfx.set(cue, active);
    element.onended = () => { active.delete(element); element.src = ""; };
    void element.play().then(() => { this.count(cue, "played"); this.setAssetStatus(cue, "LOADED"); }).catch(() => { active.delete(element); this.count(cue, "failedPlayback"); this.setAssetStatus(cue, "ERROR"); this.warn(`Unable to play ${cue}`); }); this.debug(`PLAY ${cue}`, "PLAY");
  }
  playMusic(cue: MusicCue, crossfadeMs = AUDIO_SETTINGS.music.crossfadeMs): void {
    if (this.currentMusic?.cue === cue) { if (this.currentMusic.element.paused) this.tryPlayMusic(this.currentMusic.element, cue); return; }
    const next = this.createAudio(MUSIC_CONFIG[cue], cue); next.loop = true; next.volume = 0;
    const previous = this.currentMusic; this.currentMusic = { cue, element: next };
    this.currentMusicCue.set(cue);
    this.tryPlayMusic(next, cue); this.fade(next, this.finalMusicVolume(MUSIC_CONFIG[cue]), crossfadeMs);
    if (previous) { this.fade(previous.element, 0, crossfadeMs, () => { previous.element.pause(); previous.element.src = ""; }); }
    this.debug(`PLAY MUSIC ${cue}`, "MUSIC");
  }
  stopMusic(): void { if (!this.currentMusic) return; this.currentMusic.element.pause(); this.currentMusic.element.src = ""; this.currentMusic = undefined; this.currentMusicCue.set(null); }
  pauseMusic(): void { if (this.currentMusic && !this.currentMusic.element.paused) this.currentMusic.element.pause(); }
  resumeMusic(): void { if (this.currentMusic) this.tryPlayMusic(this.currentMusic.element, this.currentMusic.cue); }
  setMasterVolume(value: number): void { this.masterVolume.set(clamp(value)); this.persist(); this.refreshVolumes(); }
  setMusicVolume(value: number): void { this.musicVolume.set(clamp(value)); this.persist(); this.refreshVolumes(); }
  setSfxVolume(value: number): void { this.sfxVolume.set(clamp(value)); this.persist(); this.refreshVolumes(); }
  setMasterMuted(value: boolean): void { this.masterMuted.set(value); this.persist(); this.refreshVolumes(); }
  setMusicMuted(value: boolean): void { this.musicMuted.set(value); this.persist(); this.refreshVolumes(); }
  setSfxMuted(value: boolean): void { this.sfxMuted.set(value); this.persist(); this.refreshVolumes(); }
  toggleMasterMute(): void { this.setMasterMuted(!this.masterMuted()); }
  toggleMusicMute(): void { this.setMusicMuted(!this.musicMuted()); }
  toggleSfxMute(): void { this.setSfxMuted(!this.sfxMuted()); }
  duckMusic(target: number = AUDIO_SETTINGS.ducking.targetVolume, fadeMs: number = AUDIO_SETTINGS.ducking.fadeMs): void { if (this.currentMusic) this.fade(this.currentMusic.element, clamp(target), fadeMs); }
  restoreMusic(fadeMs = AUDIO_SETTINGS.ducking.fadeMs): void { if (this.currentMusic) this.fade(this.currentMusic.element, this.finalMusicVolume(MUSIC_CONFIG[this.currentMusic.cue]), fadeMs); }
  setTimeAttackIntensity(state: "NORMAL" | "WARNING" | "CRITICAL"): void { if (this.currentMusic?.cue === "game.timeAttack") this.currentMusic.element.playbackRate = state === "CRITICAL" ? 1.05 : state === "WARNING" ? 1.02 : 1; }
  resetSettings(): void { const music = this.currentMusic?.cue; const packChanged = this.activeAudioPack() !== defaults.audioPack; this.masterVolume.set(defaults.masterVolume); this.musicVolume.set(defaults.musicVolume); this.sfxVolume.set(defaults.sfxVolume); this.masterMuted.set(false); this.musicMuted.set(false); this.sfxMuted.set(false); this.activeAudioPack.set(defaults.audioPack); this.persist(); this.refreshVolumes(); if (packChanged && music) { this.stopMusic(); this.playMusic(music); } }
  setAudioPack(packId: string): void { if (!AUDIO_PACKS.some((pack) => pack.id === packId) || packId === this.activeAudioPack()) return; const music = this.currentMusic?.cue; this.activeAudioPack.set(packId); this.assetStatuses.set({}); this.persist(); if (music) { this.stopMusic(); this.playMusic(music); } }
  stopAllSfx(): void { for (const elements of this.activeSfx.values()) for (const element of elements) { element.pause(); element.src = ""; } this.activeSfx.clear(); }
  stopAllAudio(): void { this.stopAllSfx(); this.stopMusic(); }
  handleAppBackground(): void { this.onBackground(); }
  handleAppForeground(): void { this.onForeground(); }
  clearDebugStats(): void { this.debugCounters.set({}); this.debugEvents.set([]); }
  activeSounds(): Readonly<Record<string, number>> { return Object.fromEntries([...this.activeSfx].map(([cue, values]) => [cue, values.size])); }
  private createAudio(config: AudioCueConfig, statusKey: string): HTMLAudioElement { const element = new Audio(); const configuredSources = config.variants?.[Math.floor(Math.random() * config.variants.length)] ?? config.sources; const sources = configuredSources.map((source) => this.resolvePackSource(source)); element.preload = "auto"; element.src = sources[0]; element.volume = this.finalSfxVolume(config); element.playbackRate = config.pitchVariation ? 1 + (Math.random() * 2 - 1) * config.pitchVariation : 1; element.onerror = () => { this.setAssetStatus(statusKey, "MISSING"); this.warn(`Missing or undecodable audio asset: ${sources.join(", ")}`); }; return element; }
  private resolvePackSource(source: string): string { const pack = AUDIO_PACKS.find((item) => item.id === this.activeAudioPack()) ?? AUDIO_PACKS[0]; return source.replace(/^assets\/audio(?=\/)/, pack.assetRoot); }
  private finalSfxVolume(config: AudioCueConfig): number { return this.masterMuted() || this.sfxMuted() ? 0 : clamp(this.masterVolume() * this.sfxVolume() * (config.volume ?? 1)); }
  private finalMusicVolume(config: AudioCueConfig): number { return this.masterMuted() || this.musicMuted() ? 0 : clamp(this.masterVolume() * this.musicVolume() * (config.volume ?? 1)); }
  private refreshVolumes(): void { if (this.currentMusic) this.currentMusic.element.volume = this.finalMusicVolume(MUSIC_CONFIG[this.currentMusic.cue]); for (const [cue, elements] of this.activeSfx) for (const element of elements) element.volume = this.finalSfxVolume(SFX_CONFIG[cue]); }
  private fade(element: HTMLAudioElement, target: number, duration: number, done?: () => void): void { const start = element.volume; const started = performance.now(); const frame = () => { const p = Math.min(1, (performance.now() - started) / Math.max(1, duration)); element.volume = start + (target - start) * p; if (p < 1) requestAnimationFrame(frame); else done?.(); }; requestAnimationFrame(frame); }
  private onBackground(): void {
    // Both Capacitor and document.visibilitychange can signal the same suspension.
    // Preserve the initial state until foreground is reached; a duplicate event sees
    // the element already paused and must not cancel its pending resume.
    this.musicWasPlayingBeforeBackground ||= !!this.currentMusic && !this.currentMusic.element.paused;
    this.pauseMusic();
    for (const elements of this.activeSfx.values()) for (const element of elements) element.pause();
  }
  private onForeground(): void { if (this.musicWasPlayingBeforeBackground) this.resumeMusic(); this.musicWasPlayingBeforeBackground = false; }
  private tryPlayMusic(element: HTMLAudioElement, cue: MusicCue): void { void element.play().then(() => { this.musicAwaitingUserGesture = false; this.setAssetStatus(cue, "LOADED"); }).catch(() => { this.musicAwaitingUserGesture = true; this.warn(`Music ${cue} awaits a user gesture or could not start`); }); }
  private resumePendingMusicFromGesture(): void { if (!this.musicAwaitingUserGesture || !this.currentMusic) return; this.tryPlayMusic(this.currentMusic.element, this.currentMusic.cue); }
  private restore(): void { try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<AudioSettings>; this.masterVolume.set(clamp(parsed.masterVolume ?? defaults.masterVolume)); this.musicVolume.set(clamp(parsed.musicVolume ?? defaults.musicVolume)); this.sfxVolume.set(clamp(parsed.sfxVolume ?? defaults.sfxVolume)); this.masterMuted.set(parsed.masterMuted ?? false); this.musicMuted.set(parsed.musicMuted ?? false); this.sfxMuted.set(parsed.sfxMuted ?? false); this.activeAudioPack.set(AUDIO_PACKS.some((pack) => pack.id === parsed.audioPack) ? parsed.audioPack! : defaults.audioPack); } catch { /* Defaults are safe when local storage is unavailable/corrupt. */ } }
  private persist(): void { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ masterVolume: this.masterVolume(), musicVolume: this.musicVolume(), sfxVolume: this.sfxVolume(), masterMuted: this.masterMuted(), musicMuted: this.musicMuted(), sfxMuted: this.sfxMuted(), audioPack: this.activeAudioPack() } satisfies AudioSettings)); } catch { /* Persistence must never affect the game. */ } }
  private count(cue: string, field: keyof AudioDebugCounters): void { this.debugCounters.update((all) => { const current: AudioDebugCounters = all[cue] ?? { requested: 0, played: 0, skippedCooldown: 0, skippedConcurrency: 0, failedPlayback: 0 }; return { ...all, [cue]: { ...current, [field]: current[field] + 1 } }; }); }
  private setAssetStatus(cue: string, status: AudioAssetStatus): void { this.assetStatuses.update((all) => ({ ...all, [cue]: status })); }
  private debug(message: string, kind: AudioDebugEvent["kind"] = "PLAY"): void { this.debugEvents.update((events) => [...events.slice(-49), { timestamp: Date.now(), kind, message }]); if (this.audioDebugEnabled()) console.debug(`[AUDIO] ${message}`); }
  private warn(message: string): void { this.debugEvents.update((events) => [...events.slice(-49), { timestamp: Date.now(), kind: "ERROR", message }]); if (this.audioDebugEnabled()) console.warn(`[AUDIO] ${message}`); }
}
