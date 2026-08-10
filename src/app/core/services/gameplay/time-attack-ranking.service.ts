import { Injectable, inject } from "@angular/core";
import {
  Firestore,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "@angular/fire/firestore";
import { PricingService } from "../economy/pricing.service";
import { GameStateService } from "../state/game-state.service";
import { HeroItem, ScoreItem } from "../../models/game.models";
import { GameResult } from "../../models/phaser-game-state.model";

export interface TimeAttackRankingEntry {
  id: string;
  playerName: string;
  heroId: string;
  heroName: string;
  heroLevel: number;
  heroTotalValue: number;
  timeMs: number;
  timeAttackLevel: number;
  createdAt?: unknown;
}

@Injectable({ providedIn: "root" })
export class TimeAttackRankingService {
  private readonly firestore = inject(Firestore);
  private readonly gameState = inject(GameStateService);
  private readonly pricing = inject(PricingService);
  private readonly collectionName = "rankings_time_attack";

  async submitResult(result: GameResult, hero: HeroItem | null | undefined): Promise<void> {
    if (result.status !== "win" || result.modeId !== "time-attack" || !hero) {
      return;
    }

    const elapsedMs = Math.max(0, Math.floor(result.elapsedMs ?? 0));
    if (elapsedMs <= 0) {
      return;
    }

    const userId = this.gameState.user()?.uid ?? "guest";
    const entryId = `${userId}_${result.matchLevel ?? 1}_${Date.now()}`;
    const heroTotalValue = this.pricing.createDefaultShopPrice(hero).amount;

    const payload: Omit<TimeAttackRankingEntry, "createdAt"> & { createdAt: ReturnType<typeof serverTimestamp> } = {
      id: entryId,
      playerName: this.gameState.displayName(),
      heroId: hero.id,
      heroName: hero.title,
      heroLevel: hero.level,
      heroTotalValue,
      timeMs: elapsedMs,
      timeAttackLevel: Math.max(1, Math.floor(result.matchLevel ?? 1)),
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(this.firestore, this.collectionName, entryId), payload, { merge: false });
  }

  async loadTopEntries(maxEntries = 50): Promise<TimeAttackRankingEntry[]> {
    const rankingQuery = query(
      collection(this.firestore, this.collectionName),
      orderBy("timeMs", "asc"),
      limit(Math.max(1, Math.floor(maxEntries))),
    );
    const snapshot = await getDocs(rankingQuery);
    return snapshot.docs.map((item) => {
      const data = item.data() as Record<string, unknown>;
      return {
        id: item.id,
        playerName: String(data["playerName"] ?? "Giocatore"),
        heroId: String(data["heroId"] ?? ""),
        heroName: String(data["heroName"] ?? "Eroe"),
        heroLevel: Number(data["heroLevel"] ?? 1),
        heroTotalValue: Number(data["heroTotalValue"] ?? 0),
        timeMs: Number(data["timeMs"] ?? 0),
        timeAttackLevel: Number(data["timeAttackLevel"] ?? 1),
        createdAt: data["createdAt"],
      };
    });
  }

  toScoreItems(entries: TimeAttackRankingEntry[]): ScoreItem[] {
    return entries.map((entry, index) => ({
      rank: index + 1,
      icon: { effect: "none", type: "trophy", size: "sm" },
      title: `${entry.playerName} · ${entry.heroName} Lv.${entry.heroLevel}`,
      subtitle: `Tempo ${this.formatTime(entry.timeMs)} · TA Lv.${entry.timeAttackLevel} · Valore ${this.formatValue(entry.heroTotalValue)}`,
      color: index === 0 ? "yellow" : index === 1 ? "cyan" : index === 2 ? "green" : "blue",
    }));
  }

  formatTime(value: number): string {
    const totalMs = Math.max(0, Math.floor(value));
    const totalSeconds = Math.floor(totalMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((totalMs % 1000) / 10);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
  }

  private formatValue(value: number): string {
    return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(Math.max(0, Math.floor(value)));
  }
}
