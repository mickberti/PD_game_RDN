import { Injectable } from "@angular/core";

import { AwardItem, PriceItem } from "../../models/game.models";
import { DailyLoginProgress, GameProgress } from "../../models/remote/progress.models";

const LOGIN_TIME_ZONE = "Europe/Rome";
const DAILY_LOGIN_REWARD: PriceItem = { frame: { name: "coin_single", effect: "none" }, type: "coin", amount: 30 };
const STREAK_LOGIN_REWARD: PriceItem = { frame: { name: "coin_single", effect: "none" }, type: "coin", amount: 300 };

const calendarDay = (date: Date): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: LOGIN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const dayDistance = (from: string, to: string): number => {
  const fromTime = Date.parse(`${from}T00:00:00Z`);
  const toTime = Date.parse(`${to}T00:00:00Z`);
  return Number.isFinite(fromTime) && Number.isFinite(toTime) ? Math.round((toTime - fromTime) / 86_400_000) : 0;
};

const addReward = (progress: GameProgress, reward: PriceItem): GameProgress => ({
  ...progress,
  coins: progress.coins + (reward.type === "coin" ? reward.amount : 0),
  gems: progress.gems + (reward.type === "gem" ? reward.amount : 0),
  dust: progress.dust + (reward.type === "dust" ? reward.amount : 0),
});

/** Keeps daily entry rewards independent from catalogue statistic milestones. */
@Injectable({ providedIn: "root" })
export class DailyLoginAwardService {
  recordLogin(progress: GameProgress, now: Date): { progress: GameProgress; recorded: boolean } {
    const today = calendarDay(now);
    const current = progress.dailyLogin;
    if (current.lastLoginDay === today) return { progress, recorded: false };

    const continuesStreak = !!current.lastLoginDay && dayDistance(current.lastLoginDay, today) === 1;
    const streak = continuesStreak ? current.streak + 1 : 1;
    const dailyLogin: DailyLoginProgress = {
      ...current,
      lastLoginDay: today,
      streak,
      // A broken streak starts a new seven-day reward cycle.
      lastStreakRewardCycle: continuesStreak ? current.lastStreakRewardCycle : 0,
    };
    return { progress: { ...progress, dailyLogin, lastUpdatedAt: now.toISOString() }, recorded: true };
  }

  resolveAwards(progress: GameProgress, now: Date): AwardItem[] {
    const today = calendarDay(now);
    const login = progress.dailyLogin;
    const streakCycle = Math.floor(login.streak / 7);
    const dailyCollectable = login.lastLoginDay === today && login.lastDailyRewardDay !== today;
    const streakCollectable = streakCycle > 0 && streakCycle > login.lastStreakRewardCycle;

    return [
      {
        id: "daily-login",
        source: "daily-login",
        type: "reward",
        title: "Accesso giornaliero",
        subtitle: dailyCollectable ? "Premio di oggi disponibile" : "Torna domani per il prossimo premio",
        frame: DAILY_LOGIN_REWARD.frame,
        progress: { descr: "Accedi ogni giorno per ricevere il premio.", current: dailyCollectable ? 1 : 0, total: 1 },
        reward: DAILY_LOGIN_REWARD,
        state: dailyCollectable ? "collect" : "locked",
      },
      {
        id: "login-streak",
        source: "login-streak",
        type: "reward",
        title: "Streak di 7 giorni",
        subtitle: streakCollectable ? "Bonus streak disponibile" : `${login.streak % 7}/7 accessi consecutivi`,
        frame: STREAK_LOGIN_REWARD.frame,
        progress: { descr: "Accedi per sette giorni consecutivi.", current: Math.min(login.streak % 7 || (login.streak > 0 ? 7 : 0), 7), total: 7 },
        reward: STREAK_LOGIN_REWARD,
        state: streakCollectable ? "collect" : "locked",
      },
    ];
  }

  claim(progress: GameProgress, award: AwardItem, now: Date): GameProgress | null {
    const today = calendarDay(now);
    const login = progress.dailyLogin;
    const reward = award.source === "daily-login" ? DAILY_LOGIN_REWARD : award.source === "login-streak" ? STREAK_LOGIN_REWARD : null;
    if (!reward) return null;

    if (award.source === "daily-login") {
      if (login.lastLoginDay !== today || login.lastDailyRewardDay === today) return null;
      return {
        ...addReward(progress, reward),
        dailyLogin: { ...login, lastDailyRewardDay: today },
        lastUpdatedAt: now.toISOString(),
      };
    }

    const cycle = Math.floor(login.streak / 7);
    if (cycle < 1 || cycle <= login.lastStreakRewardCycle) return null;
    return {
      ...addReward(progress, reward),
      dailyLogin: { ...login, lastStreakRewardCycle: cycle },
      lastUpdatedAt: now.toISOString(),
    };
  }
}
