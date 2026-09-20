import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from "@angular/core";
import { IonContent, IonFooter, IonHeader, IonToolbar } from "@ionic/angular/standalone";
import { UIHeaderComponent } from "../../../shared/components/ui-header.component";
import { UiUtilsPageHeaderComponent } from "../../../shared/components/ui-utils-page-header.component";
import { UIBottomUtilsComponent } from "../../../shared/components/ui-bottom-utils.component";
import { AudioService } from "../../../core/audio/audio.service";
import { AUDIO_SETTINGS, MUSIC_CONFIG, SFX_CONFIG } from "../../../core/audio/audio.config";
import { AudioCue, AudioCueConfig, MusicCue } from "../../../core/audio/audio.models";

type Category = "ALL" | "UI" | "GEAR" | "PULSE" | "GEM" | "EFFECTS" | "GAME" | "TIME";
const CATEGORIES: readonly Category[] = ["ALL", "UI", "GEAR", "PULSE", "GEM", "EFFECTS", "GAME", "TIME"];

@Component({
  selector: "app-audio-debug", standalone: true,
  imports: [IonHeader, IonToolbar, IonContent, IonFooter, UIHeaderComponent, UiUtilsPageHeaderComponent, UIBottomUtilsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`:host{color:#f7e9c7}.page{max-width:1080px;margin:auto;padding:14px}.box{margin-bottom:14px;padding:13px;border:1px solid #80662f;border-radius:10px;background:#091b20}h2{margin:0 0 9px;color:#ffdf72;font-size:1rem}.row,.buttons{display:flex;align-items:center;flex-wrap:wrap;gap:7px}.row{margin:7px 0}.row input[type=range]{flex:1}.cue{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.9fr);gap:14px;padding:13px 0;border-top:1px solid #ffffff20}.meta{color:#bfcec6;font-size:.78rem;line-height:1.4}button,input,select{min-height:34px;color:#fff3be;background:#173129;border:1px solid #c99e48;border-radius:6px;padding:5px 8px}.ok{color:#3fd876}.bad{color:#ff7c7c}.tuning{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:9px;border:1px solid #ffffff24;border-radius:7px;background:#102922}.tuning h3{grid-column:1/-1;margin:0;color:#ffdf72;font-size:.78rem}.tuning label{display:grid;gap:3px;color:#bfcec6;font-size:.72rem}.tuning input{min-width:0;width:100%;box-sizing:border-box;min-height:29px}.tuning input[type=range]{padding:0}.hint{color:#bfcec6;font-size:.78rem}.export{margin-top:10px}@media(max-width:700px){.cue{grid-template-columns:1fr}}.log{max-height:240px;overflow:auto;font:12px monospace;white-space:pre-wrap}`],
  template: `
    <ion-header><ion-toolbar><ui-header title="Audio Debug" backPath="/settings" /></ion-toolbar></ion-header>
    <ion-content><main class="page">
      <ui-utils-page-header group="game" title="Audio Debug" description="Test e tuning degli asset audio." />
      <section class="box"><h2>MASTER</h2>
        <div class="row">Master <input type="range" min="0" max="100" [value]="percent(audio.masterVolume())" (input)="audio.setMasterVolume(toNumber($any($event.target).value)/100)"> {{percent(audio.masterVolume())}}%</div>
        <div class="row">Music <input type="range" min="0" max="100" [value]="percent(audio.musicVolume())" (input)="audio.setMusicVolume(toNumber($any($event.target).value)/100)"> {{percent(audio.musicVolume())}}%</div>
        <div class="row">SFX <input type="range" min="0" max="100" [value]="percent(audio.sfxVolume())" (input)="audio.setSfxVolume(toNumber($any($event.target).value)/100)"> {{percent(audio.sfxVolume())}}%</div>
        <div class="row">Pack <select [value]="audio.activeAudioPack()" (change)="audio.setAudioPack($any($event.target).value)">@for (pack of audio.audioPacks; track pack.id) {<option [value]="pack.id">{{pack.label}}</option>}</select></div>
        <div class="buttons"><button (click)="audio.toggleMasterMute()">MUTE MASTER</button><button (click)="audio.toggleMusicMute()">MUTE MUSIC</button><button (click)="audio.toggleSfxMute()">MUTE SFX</button><button (click)="audio.resetSettings()">RESET SETTINGS</button></div>
      </section>
      <section class="box"><h2>MUSIC · {{audio.currentMusicCue() ?? 'none'}}</h2><div class="buttons">@for (entry of musicEntries; track entry[0]) {<button (click)="audio.playMusic(entry[0])">PLAY {{entry[0]}}</button>}<button (click)="audio.stopMusic()">STOP</button><button (click)="audio.duckMusic()">DUCK</button><button (click)="audio.restoreMusic()">RESTORE</button></div><small>Duck: {{AUDIO_SETTINGS.ducking.targetVolume}} / {{AUDIO_SETTINGS.ducking.fadeMs}}ms</small></section>
      <section class="box"><h2>SFX CATALOG · LIVE CALIBRATION</h2>
        <p class="hint">I controlli a destra modificano immediatamente la riproduzione: volume, cooldown, limite simultaneo, variazione di pitch e trim. L'export contiene il catalogo completo già calibrato.</p>
        <input placeholder="Search cue" [value]="query()" (input)="query.set($any($event.target).value)">
        <div class="buttons">@for (category of categories; track category) {<button (click)="selectedCategory.set(category)">{{category}}</button>}</div>
        <div class="buttons export"><button (click)="downloadCatalog()">DOWNLOAD SFX CATALOG CALIBRATO</button><button (click)="audio.resetSfxRuntimeTunings()">RESET CALIBRAZIONE</button></div>
        @for (entry of filteredSfx(); track entry[0]) {
          @let config = sfxConfig(entry[0]);
          <article class="cue">
            <div><div class="row"><strong>{{entry[0]}}</strong><span [class.ok]="status(entry[0]) === 'LOADED'" [class.bad]="status(entry[0]) !== 'LOADED'">{{status(entry[0])}}</span></div>
              <div class="meta">{{config.design.character}}<br>{{config.design.durationMs[0]}}–{{config.design.durationMs[1]}}ms · vol {{config.volume ?? 1}} · cooldown {{config.cooldownMs ?? 0}}ms · max {{config.maxConcurrent ?? '∞'}} · variants {{config.variants?.length ?? 1}}<br>{{audio.resolveActivePackSource(config.sources[0])}}</div>
              <div class="buttons"><button (click)="audio.playSfx(entry[0])">PLAY</button><button (click)="rapid(entry[0])">RAPID ×10</button><small>{{stats(entry[0])}}</small></div>
            </div>
            <div class="tuning"><h3>PARAMETRI RUNTIME</h3>
              <label>Volume · {{percent(config.volume ?? 1)}}%<input type="range" min="0" max="100" [value]="percent(config.volume ?? 1)" (input)="setVolume(entry[0], $any($event.target).value)"></label>
              <label>Pitch variation · {{percent(config.pitchVariation ?? 0)}}%<input type="range" min="0" max="50" [value]="percent(config.pitchVariation ?? 0)" (input)="setPitchVariation(entry[0], $any($event.target).value)"></label>
              <label>Cooldown (ms)<input type="number" min="0" step="1" [value]="config.cooldownMs ?? 0" (input)="setCooldown(entry[0], $any($event.target).value)"></label>
              <label>Max simultanei<input type="number" min="1" step="1" [value]="config.maxConcurrent ?? ''" (input)="setMaxConcurrent(entry[0], $any($event.target).value)"></label>
              <label>Trim start (ms)<input type="number" min="0" step="1" [value]="config.trim?.startMs ?? ''" (input)="setTrim(entry[0], $any($event.target).value, config.trim?.endMs)"></label>
              <label>Trim end (ms)<input type="number" min="0" step="1" [value]="config.trim?.endMs ?? ''" (input)="setTrim(entry[0], config.trim?.startMs, $any($event.target).value)"></label>
            </div>
          </article>
        }
      </section>
      <section class="box"><h2>ADVANCED TESTS</h2><div class="buttons"><button (click)="core(false)">TEST CORE GAMEPLAY AUDIO</button><button (click)="core(true)">TEST PERFECT</button><button (click)="stress()">STRESS TEST</button><button (click)="countdown()">LAST 10 SECONDS</button><button (click)="audio.stopAllSfx()">STOP SFX</button><button (click)="audio.stopAllAudio()">STOP ALL</button></div><div class="buttons"><button (click)="audio.setTimeAttackIntensity('NORMAL')">TIME NORMAL</button><button (click)="time('WARNING')">TIME WARNING</button><button (click)="time('CRITICAL')">TIME CRITICAL</button><button (click)="audio.handleAppBackground()">BACKGROUND</button><button (click)="audio.handleAppForeground()">FOREGROUND</button></div></section>
      <section class="box"><h2>DEBUG STATE</h2><div>Current music: {{audio.currentMusicCue() ?? 'none'}} · Active: {{activeSounds() || 'none'}} · Asset problems: {{problems()}}</div><div class="buttons"><button (click)="audio.clearDebugStats()">RESET STATS / CLEAR LOG</button></div><pre class="log">@for (event of audio.debugEvents(); track event.timestamp + event.message) { {{event.kind}} {{event.message}} }</pre></section>
      <section class="box"><h2>AUDIO QUALITY CHECKLIST</h2><small>□ gear.rotate non fastidioso · □ gear.snap distinguibile · □ pulse.start immediato · □ gem.zero più importante · □ game.win non è una slot machine · □ musica non copre il gameplay · □ eventi rapidi non saturano il mix</small></section>
    </main></ion-content>
    <ion-footer><ion-toolbar><ui-bottom-utils /></ion-toolbar></ion-footer>
  `,
})
export class AudioDebugPage {
  readonly audio = inject(AudioService); readonly destroyRef = inject(DestroyRef); readonly AUDIO_SETTINGS = AUDIO_SETTINGS; readonly categories = CATEGORIES;
  readonly query = signal(""); readonly selectedCategory = signal<Category>("ALL");
  readonly sfxEntries = Object.entries(SFX_CONFIG) as [AudioCue, AudioCueConfig][];
  readonly musicEntries = Object.entries(MUSIC_CONFIG) as [MusicCue, typeof MUSIC_CONFIG[MusicCue]][];
  readonly filteredSfx = computed(() => this.sfxEntries.filter(([cue]) => (this.selectedCategory() === "ALL" || this.category(cue) === this.selectedCategory()) && cue.includes(this.query().toLowerCase())));
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor() { this.audio.audioDebugEnabled.set(true); this.destroyRef.onDestroy(() => this.timers.forEach(clearTimeout)); }
  percent(value: number): number { return Math.round(value * 100); }
  toNumber(value: string): number { return Number(value); }
  sfxConfig(cue: AudioCue): AudioCueConfig { return this.audio.sfxConfig(cue); }
  status(cue: AudioCue): string { return this.audio.assetStatuses()[cue] ?? "NOT_LOADED"; }
  stats(cue: AudioCue): string { const item = this.audio.debugCounters()[cue]; return item ? `requested ${item.requested} · played ${item.played} · skipped ${item.skippedCooldown + item.skippedConcurrency}` : "not tested"; }
  setVolume(cue: AudioCue, value: string): void { this.audio.setSfxRuntimeTuning(cue, { volume: Number(value) / 100 }); }
  setPitchVariation(cue: AudioCue, value: string): void { this.audio.setSfxRuntimeTuning(cue, { pitchVariation: Number(value) / 100 }); }
  setCooldown(cue: AudioCue, value: string): void { this.audio.setSfxRuntimeTuning(cue, { cooldownMs: this.nonNegative(value) ?? 0 }); }
  setMaxConcurrent(cue: AudioCue, value: string): void { const number = this.nonNegative(value); if (number !== undefined) this.audio.setSfxRuntimeTuning(cue, { maxConcurrent: number }); }
  setTrim(cue: AudioCue, start: string | number | undefined, end: string | number | undefined): void { const startMs = this.nonNegative(start); const endMs = this.nonNegative(end); this.audio.setSfxRuntimeTuning(cue, { trim: startMs === undefined && endMs === undefined ? undefined : { startMs, endMs } }); }
  downloadCatalog(): void { const source = `import { AudioCue, AudioCueConfig } from "./audio.models";\n\nexport const SFX_CONFIG: Readonly<Record<AudioCue, AudioCueConfig>> = ${JSON.stringify(this.audio.calibratedSfxCatalog(), null, 2)};\n`; const url = URL.createObjectURL(new Blob([source], { type: "text/typescript;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "sfx-catalog-calibrated.ts"; link.click(); URL.revokeObjectURL(url); }
  rapid(cue: AudioCue): void { for (let index = 0; index < 10; index++) this.later(() => this.audio.playSfx(cue), index * 90); }
  core(perfect: boolean): void { const steps: readonly [number, AudioCue][] = perfect ? [[0,"gear.snap"],[300,"pulse.start"],[600,"gem.change"],[900,"gem.zero"],[1700,"gem.break"],[2250,"game.perfect"]] : [[0,"gear.rotate"],[120,"gear.rotate"],[240,"gear.rotate"],[400,"gear.snap"],[700,"pulse.start"],[950,"pulse.travel"],[1150,"gem.change"],[1450,"pulse.travel"],[1700,"gem.zero"],[2500,"gem.break"],[3100,"game.win"]]; steps.forEach(([delay, cue]) => this.later(() => this.audio.playSfx(cue), delay)); }
  stress(): void { for (let index = 0; index < 20; index++) this.later(() => this.audio.playSfx("gear.rotate"), index * 25); for (let index = 0; index < 10; index++) this.later(() => this.audio.playSfx("gem.change"), index * 45); }
  countdown(): void { [10,5,3,2,1].forEach((second) => this.later(() => this.audio.playSfx(second === 10 ? "time.warning" : "time.critical"), (10 - second) * 1000)); }
  time(state: "WARNING" | "CRITICAL"): void { this.audio.setTimeAttackIntensity(state); this.audio.playSfx(state === "WARNING" ? "time.warning" : "time.critical"); }
  activeSounds(): string { return Object.entries(this.audio.activeSounds()).map(([cue, count]) => `${cue}:${count}`).join(", "); }
  problems(): number { return Object.values(this.audio.assetStatuses()).filter((value) => value === "MISSING" || value === "ERROR").length; }
  private nonNegative(value: string | number | undefined): number | undefined { if (value === "" || value === undefined) return undefined; const number = Number(value); return Number.isFinite(number) ? Math.max(0, number) : undefined; }
  private category(cue: AudioCue): Category { if (cue.startsWith("ui.")) return "UI"; if (cue.startsWith("gear.")) return "GEAR"; if (cue.startsWith("pulse.")) return "PULSE"; if (cue.startsWith("gem.")) return "GEM"; if (cue.startsWith("effect.")) return "EFFECTS"; if (cue.startsWith("time.")) return "TIME"; return "GAME"; }
  private later(callback: () => void, delay: number): void { const timer = setTimeout(() => { this.timers.delete(timer); callback(); }, delay); this.timers.add(timer); }
}
