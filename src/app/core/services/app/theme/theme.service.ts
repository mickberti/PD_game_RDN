import { computed, inject, Injectable, signal } from "@angular/core";
import { MockDataService } from "../../data/mock/mock-data.service";
import { BottomNavItem, ModeItem, ScoreItem } from "../../../models/game.models";

export type GameTheme = "fantasy_bg" |"fantasy" | "sketch" | "race";

const THEME_STORAGE_KEY = "game-theme";
const THEME_CLASSES: Record<GameTheme, string> = {
	fantasy_bg: "theme-fantasy-bg",
  fantasy: "theme-fantasy",
  sketch: "theme-sketch",
  race: "theme-race",
};

@Injectable({ providedIn: "root" })
export class ThemeService {
  readonly activeTheme = signal<GameTheme>("fantasy_bg");
  
  readonly theme = inject(MockDataService);

  readonly modes = computed<ModeItem[]>(() => {
    this.activeTheme();
    return this.theme.modes;
  });
  readonly bottomNav = computed<BottomNavItem[]>(() => {
    this.activeTheme();
    return this.theme.bottomNav;
  });
  readonly bottomUtils = computed<BottomNavItem[]>(() => {
    this.activeTheme();
    return this.theme.bottomUtils;
  });
  readonly scores = computed<ScoreItem[]>(() => {
    this.activeTheme();
    return this.theme.scores;
  });

  constructor() {
	/*
	const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
	const initialTheme = this.isTheme(storedTheme) ? storedTheme : "fantasy_bg";
	this.setTheme(initialTheme);
	*/
  }

  initTheme(){
	const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
	const initialTheme = this.isTheme(storedTheme) ? storedTheme : "fantasy_bg";
	this.setTheme(initialTheme);
  }
  /**
   * Applica il tema grafico selezionato all'applicazione.
   * Aggiorna il signal, rimuove dal body tutte le classi tema precedenti, aggiunge
   * la classe del nuovo tema, salva la preferenza e sincronizza i mock tematici.
   */
  setTheme(theme: GameTheme): void {
    this.activeTheme.set(theme);
    Object.values(THEME_CLASSES).forEach((themeClass) => {
      document.body.classList.remove(themeClass);
    });
    document.body.classList.add(THEME_CLASSES[theme]);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    this.theme.setTheme(theme);
  }


  /**
   * Controlla se il valore letto dallo storage è un tema supportato.
   * Agisce come type guard per evitare di applicare classi CSS non previste e per
   * consentire al costruttore di scegliere un fallback sicuro.
   */
  private isTheme(theme: string | null): theme is GameTheme {
    return theme === "fantasy_bg" || theme === "fantasy" || theme === "sketch" || theme === "race";
  }
}
