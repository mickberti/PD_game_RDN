import { DailyLoginAwardService } from "./daily-login-award.service";
import { DEFAULT_GAME_PROGRESS } from "../../models/remote/progress.models";

describe("DailyLoginAwardService", () => {
  const service = new DailyLoginAwardService();
  const at = (day: string) => new Date(`${day}T12:00:00Z`);

  it("makes one daily award available per Rome calendar day", () => {
    const loggedIn = service.recordLogin(DEFAULT_GAME_PROGRESS, at("2026-09-10")).progress;
    expect(service.resolveAwards(loggedIn, at("2026-09-10")).find((award) => award.id === "daily-login")?.state).toBe("collect");
    const claimed = service.claim(loggedIn, service.resolveAwards(loggedIn, at("2026-09-10"))[0], at("2026-09-10"))!;
    expect(service.resolveAwards(claimed, at("2026-09-10")).find((award) => award.id === "daily-login")?.state).toBe("locked");
  });

  it("rewards every completed seven-day consecutive login cycle", () => {
    let progress = DEFAULT_GAME_PROGRESS;
    for (let day = 1; day <= 7; day += 1) progress = service.recordLogin(progress, at(`2026-09-${String(day).padStart(2, "0")}`)).progress;
    const streakAward = service.resolveAwards(progress, at("2026-09-07")).find((award) => award.id === "login-streak")!;
    expect(streakAward.state).toBe("collect");
    progress = service.claim(progress, streakAward, at("2026-09-07"))!;
    expect(service.resolveAwards(progress, at("2026-09-07")).find((award) => award.id === "login-streak")?.state).toBe("locked");
  });
});
