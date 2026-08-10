import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Progress } from '../../../models/game.models';
import { GameResult, PhaserGameplayRuntimeEvent, PhaserSceneState } from '../../../models/phaser-game-state.model';

@Injectable({ providedIn: 'root' })
export class PhaserGameEventsService {
  readonly score$ = new BehaviorSubject<number>(0);
  readonly elapsedMs$ = new BehaviorSubject<number>(0);
  readonly lives$ = new BehaviorSubject<number>(3);
  readonly mana$ = new BehaviorSubject<number>(0);
  readonly fatigue$ = new BehaviorSubject<number>(0);
  readonly experience$ = new BehaviorSubject<Progress>({ descr: 'XP', current: 0, total: 1 });
  readonly combo$ = new BehaviorSubject<number>(0);
  readonly treasures$ = new BehaviorSubject<number>(0);
  readonly state$ = new BehaviorSubject<PhaserSceneState>('boot');
  readonly gameplayEvent$ = new Subject<PhaserGameplayRuntimeEvent>();
  readonly restart$ = new Subject<void>();
  readonly result$ = new BehaviorSubject<GameResult | null>(null);

  /**
   * Pubblica il punteggio corrente della scena Phaser.
   * Invia il nuovo valore sul BehaviorSubject `score$`, così HUD e pagine Angular\
   * ricevono immediatamente l'ultimo score anche se si sottoscrivono dopo l'aggiornamento.
   */
  setScore(value: number): void {
    this.score$.next(value);
  }

  setElapsedMs(value: number): void {
    this.elapsedMs$.next(Math.max(0, Math.floor(value)));
  }

  /**
   * Pubblica il numero di vite o HP correnti della partita Phaser.
   * Aggiorna `lives$` mantenendo il valore più recente disponibile per componenti HUD,
   * risultati e logiche Angular che osservano lo stato runtime del gioco.
   */
  setLives(value: number): void {
    this.lives$.next(value);
  }

  setMana(value: number): void {
    this.mana$.next(value);
  }

  setFatigue(value: number): void {
    this.fatigue$.next(value);
  }

  setExperience(value: Progress): void {
    this.experience$.next(value);
  }

  setCombo(value: number): void {
    this.combo$.next(value);
  }

  setTreasures(value: number): void {
    this.treasures$.next(value);
  }

  emitGameplayEvent(event: PhaserGameplayRuntimeEvent): void {
    this.gameplayEvent$.next(event);
  }

  /**
   * Pubblica lo stato corrente del ciclo partita Phaser.
   * Aggiorna `state$` con valori come boot, playing, won o gameover per sincronizzare
   * la scena con la UI Angular e con le pagine di esito.
   */
  setState(value: PhaserSceneState): void {
    this.state$.next(value);
  }

  /**
   * Pubblica o azzera il risultato finale della partita.
   * Scrive un GameResult completo quando la scena termina e usa `null` per ripulire
   * il risultato prima di una nuova run o dopo un reset.
   */
  setResult(value: GameResult | null): void {
    this.result$.next(value);
  }

  /**
   * Riavvia il flusso evento della partita Phaser.
   * Ripristina score, vite e risultato ai valori iniziali, poi emette su `restart$`
   * per notificare alla scena che deve ricominciare una nuova partita.
   */
  restart(): void {
    this.score$.next(0);
    this.elapsedMs$.next(0);
    this.lives$.next(3);
    this.mana$.next(0);
    this.fatigue$.next(0);
    this.experience$.next({ descr: 'XP', current: 0, total: 1 });
    this.combo$.next(0);
    this.treasures$.next(0);
    this.result$.next(null);
    this.restart$.next();
  }
}
