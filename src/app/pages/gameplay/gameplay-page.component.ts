import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonContent } from "@ionic/angular/standalone";
import { GameplaySessionService } from "../../core/services/gameplay/gameplay-session.service";
import { RdnPuzzleService } from "../../core/services/gameplay/rnd-puzzle.service";

/**
 * Angular shell; the engine remains the single source of truth for the board.
 */
@Component({
  selector: "app-gameplay",
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `<ion-content><main class="rnd-game" [attr.data-variant]="session.variant">
    <header class="rnd-hud"><button aria-label="Impostazioni">⚙</button><strong><small>LEVEL</small>{{ level().number }}</strong><div class="rnd-emblem">△</div><strong><small>ROTATIONS</small>{{ state().rotationSteps }}</strong><button aria-label="Riavvia" (click)="restart()">↻</button></header>
    <section class="rnd-board" aria-label="Tabellone RDN">
      <div class="rnd-outer-ring">@for (value of state().outerValues; track $index) { <div class="rnd-orbit outer" [style.transform]="orbit($index, state().outerValues.length, 46)"><span class="rnd-sphere" [style.transform]="outerSphereTransform($index, state().outerValues.length)" [class.rnd-zero]="value === 0">{{ format(value) }}</span></div> }</div>
      <div class="rnd-wheel" [class.is-dragging]="isDragging()" [style.transform]="wheelTransform()" (pointerdown)="dragStart($event)" (pointermove)="dragMove($event)" (pointerup)="dragEnd($event)" (pointercancel)="dragCancel($event)">
        <div class="rnd-wheel-teeth"></div>
        @for (value of innerValues(); track $index) { <div class="rnd-orbit inner" [style.transform]="orbit($index, innerValues().length, 34)"><span class="rnd-sphere inner-value">{{ format(value) }}</span></div> }
        <button class="rnd-impulse" type="button" [disabled]="state().won || isDragging()" (click)="impulse()">△<small>{{ activeCount() }} OPERAZIONI</small><b>IMPULSO</b></button>
      </div>
      <div class="rnd-previews" aria-live="polite">@for (preview of previews(); track preview.slot.outerIndex) { <span [attr.data-trend]="preview.trend">{{ preview.trend === 'zero' ? '✓' : preview.trend === 'closer' ? '↓' : preview.trend === 'farther' ? '↑' : '•' }} {{ format(preview.outerValue) }} + {{ format(preview.innerValue) }} → {{ format(preview.result) }}</span> }</div>
      <div class="rnd-controls"><button type="button" (click)="rotate('CCW')">↺ Ruota</button><button type="button" (click)="undo()">↶ Annulla</button><button type="button" (click)="rotate('CW')">Ruota ↻</button></div>
    </section>@if (state().won) { <p class="rnd-win">Meccanismo risolto.</p> }
  </main></ion-content>`,
  styles: [`.rnd-game{min-height:100%;padding:calc(8px + var(--safe-top,0px)) 10px 24px;background:radial-gradient(circle at 50% 45%,#263735,#111416 60%);color:#f7da85}.rnd-hud{height:76px;max-width:680px;margin:auto;display:grid;grid-template-columns:54px 1fr 72px 1fr 54px;align-items:center;text-align:center}.rnd-hud button,.rnd-controls button{min-height:44px;border:2px solid #8c6733;background:#211c14;color:#ffe8a8;border-radius:50%;font:inherit;font-size:24px}.rnd-hud strong{font:900 32px Georgia,serif;color:#ebc66e;text-shadow:0 2px #000}.rnd-hud small{display:block;font:700 10px Arial;letter-spacing:.12em}.rnd-emblem{width:66px;height:66px;display:grid;place-items:center;border:3px solid #52bb76;border-radius:50%;font-size:34px;color:#76ed98;box-shadow:0 0 18px #2a8955}.rnd-board{position:relative;width:min(100%,620px);aspect-ratio:1/1.35;margin:0 auto;overflow:hidden}.rnd-outer-ring,.rnd-wheel{position:absolute;left:50%;top:48%;width:min(88vw,510px);aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%)}.rnd-outer-ring{border:12px solid #624625;box-shadow:inset 0 0 0 7px #201a13}.rnd-wheel{touch-action:none;cursor:grab;border:18px solid #947044;background:repeating-radial-gradient(circle,#46361f 0 8%,#5c4426 8.5% 10%);transition:transform 180ms cubic-bezier(.2,.8,.2,1);z-index:2}.rnd-wheel.is-dragging{cursor:grabbing;transition:none}.rnd-wheel-teeth{position:absolute;inset:-28px;border:14px dashed #8d693d;border-radius:50%;opacity:.8}.rnd-orbit{position:absolute;inset:0}.rnd-sphere{position:absolute;left:50%;top:2%;display:grid;place-items:center;width:clamp(54px,13vw,82px);aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%);border:4px solid #907143;background:radial-gradient(circle at 35% 25%,#2ae6f7,#075878 65%);box-shadow:0 0 14px #38dff5;color:#fff;font:900 clamp(22px,6vw,38px) Arial;text-shadow:0 2px #003}.inner .rnd-sphere{top:15%}.inner-value{background:radial-gradient(circle at 35% 25%,#e645b6,#5c153f 65%)}.rnd-zero{filter:grayscale(1);opacity:.55}.rnd-impulse{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:grid;place-items:center;width:30%;aspect-ratio:1;border-radius:50%;border:5px solid #d8b45a;background:radial-gradient(circle,#40714a,#162c20);color:#fbe69c;font:900 32px Georgia;box-shadow:0 0 18px #3fd46c}.rnd-impulse small,.rnd-impulse b{font:700 9px Arial;letter-spacing:.06em}.rnd-previews{position:absolute;left:0;right:0;bottom:5px;display:flex;justify-content:center;flex-wrap:wrap;gap:5px;font:700 11px Arial}.rnd-previews span{padding:4px 6px;border:1px solid #765f36;background:#131815cc}.rnd-controls{position:absolute;bottom:34px;left:0;right:0;display:flex;justify-content:space-between}.rnd-controls button{border-radius:8px;font-size:13px;padding:0 10px}.rnd-win{text-align:center;font-weight:900;color:#b7ff9f}`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameplayPageComponent {
  readonly session = inject(GameplaySessionService).getActiveSession("adventure");
  private readonly puzzle = inject(RdnPuzzleService);
  readonly level = this.puzzle.level;
  readonly state = this.puzzle.state;
  readonly previews = this.puzzle.previews;
  readonly isDragging = signal(false);
  /** Offset visivo continuo durante il drag; lo stato dominio cambia solo allo snap. */
  readonly dragAngle = signal(0);
  private dragStartAngle = 0;
  constructor() { this.puzzle.load(this.session.variant); }
  rotate(direction: "CW" | "CCW"): void { this.puzzle.dispatch({ type: "ROTATE", direction, steps: 1 }); }
  impulse(): void { this.puzzle.dispatch({ type: "IMPULSE" }); }
  undo(): void { this.puzzle.dispatch({ type: "UNDO" }); }
  restart(): void { this.puzzle.dispatch({ type: "RESTART" }); }
  format(value: number | null): string { return value === null ? "—" : value > 0 ? `+${value}` : String(value); }
  orbit(index: number, total: number, _radius: number): string { return `rotate(${(index / total) * 360}deg)`; }
  outerSphereTransform(index: number, total: number): string { return `translate(-50%,-50%) rotate(${-index * 360 / total}deg)`; }
  wheelTransform(): string { return `translate(-50%,-50%) rotate(${this.state().rotationTurns * 360 / this.level().positions + this.dragAngle()}deg)`; }
  innerValues(): Array<number | null> { const level = this.level(); const state = this.state(); return Array.from({ length: level.positions }, (_, index) => level.variant === "persistent" ? level.innerValues[index] : level.queues[index][state.queueCursors[index]] ?? null); }
  activeCount(): number { return this.previews().filter((preview) => preview.active).length; }
  dragStart(event: PointerEvent): void { if ((event.target as HTMLElement).closest("button")) return; const rect = (event.currentTarget as HTMLElement).getBoundingClientRect(); this.dragStartAngle = Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2); this.dragAngle.set(0); this.isDragging.set(true); (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); }
  dragMove(event: PointerEvent): void { if (!this.isDragging()) return; const rect = (event.currentTarget as HTMLElement).getBoundingClientRect(); const angle = Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2); let delta = (angle - this.dragStartAngle) * 180 / Math.PI; if (delta > 180) delta -= 360; if (delta < -180) delta += 360; this.dragAngle.set(delta); }
  dragEnd(event: PointerEvent): void { if (!this.isDragging()) return; const stepAngle = 360 / this.level().positions; const steps = Math.round(this.dragAngle() / stepAngle); this.isDragging.set(false); if (steps) this.puzzle.dispatch({ type: "ROTATE", direction: steps > 0 ? "CW" : "CCW", steps: Math.abs(steps) }); this.dragAngle.set(0); (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId); }
  dragCancel(event: PointerEvent): void { this.isDragging.set(false); this.dragAngle.set(0); if ((event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId); }
}
