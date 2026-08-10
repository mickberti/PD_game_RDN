import { Injectable, computed, signal } from "@angular/core";

export type AppLanguage = "en" | "es" | "fr" | "it";

const LANGUAGE_STORAGE_KEY = "app-language";
const SUPPORTED_LANGUAGES: AppLanguage[] = ["en", "es", "fr", "it"];

const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  en: {
    language: "Language",
    effects: "Effects",
    music: "Music",
    sfx: "SFX",
    gameService: "Game Service",
    theme: "Theme",
    socialNetworks: "Social Networks",
    gameInfo: "Game Info",
    community: "Community",
    aboutUs: "About Us",
    support: "Support",
    resetProgress: "Reset progress",
    resettingProgress: "Resetting...",
  },
  es: {
    language: "Idioma",
    effects: "Efectos",
    music: "Música",
    sfx: "SFX",
    gameService: "Servicio del juego",
    theme: "Tema",
    socialNetworks: "Redes sociales",
    gameInfo: "Información",
    community: "Comunidad",
    aboutUs: "Sobre nosotros",
    support: "Soporte",
    resetProgress: "Restablecer progreso",
    resettingProgress: "Restableciendo...",
  },
  fr: {
    language: "Langue",
    effects: "Effets",
    music: "Musique",
    sfx: "SFX",
    gameService: "Service de jeu",
    theme: "Thème",
    socialNetworks: "Réseaux sociaux",
    gameInfo: "Infos jeu",
    community: "Communauté",
    aboutUs: "À propos",
    support: "Support",
    resetProgress: "Réinitialiser la progression",
    resettingProgress: "Réinitialisation...",
  },
  it: {
    language: "Lingua",
    effects: "Effetti",
    music: "Musica",
    sfx: "SFX",
    gameService: "Servizio di gioco",
    theme: "Tema",
    socialNetworks: "Social network",
    gameInfo: "Info gioco",
    community: "Community",
    aboutUs: "Chi siamo",
    support: "Supporto",
    resetProgress: "Reset progressi",
    resettingProgress: "Reset in corso...",
  },
};

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  it: "Italiano",
};

@Injectable({ providedIn: "root" })
export class LanguageService {
  readonly activeLanguage = signal<AppLanguage>("en");
  readonly activeLanguageLabel = computed(() => LANGUAGE_LABELS[this.activeLanguage()]);

  constructor() {
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const initialLanguage = this.isLanguage(storedLanguage) ? storedLanguage : "en";
    this.setLanguage(initialLanguage);
  }

  /**
   * Imposta la lingua attiva dell'applicazione.
   * Aggiorna il signal usato dalla UI, sincronizza l'attributo `lang` del documento
   * e salva la preferenza in localStorage per ripristinarla ai prossimi avvii.
   */
  setLanguage(language: AppLanguage): void {
    this.activeLanguage.set(language);
    document.documentElement.lang = language;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }

  /**
   * Passa alla lingua successiva tra quelle supportate.
   * Usa l'ordine di SUPPORTED_LANGUAGES e delega a `shiftLanguage` la gestione
   * circolare dell'indice e il salvataggio della nuova lingua.
   */
  nextLanguage(): void {
    this.shiftLanguage(1);
  }

  /**
   * Passa alla lingua precedente tra quelle supportate.
   * Usa lo stesso meccanismo circolare di `nextLanguage`, ma con direzione negativa
   * per tornare all'opzione precedente e persisterla.
   */
  previousLanguage(): void {
    this.shiftLanguage(-1);
  }

  /**
   * Traduce una chiave testuale usando la lingua attiva.
   * Cerca la chiave nel dizionario corrente e, se non esiste una traduzione,
   * restituisce la chiave originale come fallback leggibile.
   */
  t(key: string): string {
    return TRANSLATIONS[this.activeLanguage()][key] ?? key;
  }

  /**
   * Sposta la lingua attiva avanti o indietro nella lista supportata.
   * Calcola il nuovo indice con modulo per restare sempre nel range valido e poi
   * richiama `setLanguage` per applicare tutti gli effetti collaterali centralizzati.
   */
  private shiftLanguage(direction: -1 | 1): void {
    const currentIndex = SUPPORTED_LANGUAGES.indexOf(this.activeLanguage());
    const nextIndex = (currentIndex + direction + SUPPORTED_LANGUAGES.length) % SUPPORTED_LANGUAGES.length;
    this.setLanguage(SUPPORTED_LANGUAGES[nextIndex]);
  }

  /**
   * Verifica se una stringa letta dallo storage corrisponde a una lingua supportata.
   * Funziona da type guard TypeScript, quindi permette al costruttore di usare il
   * valore come AppLanguage solo quando appartiene all'elenco ammesso.
   */
  private isLanguage(value: string | null): value is AppLanguage {
    return value === "en" || value === "es" || value === "fr" || value === "it";
  }
}
