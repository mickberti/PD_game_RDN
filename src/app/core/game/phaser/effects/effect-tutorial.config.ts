import { AreaEffectType, EffectConfig, EffectScope, GemEffectType, LinkEffectType } from "./effects.models";

/** Copy shared by the contextual tutorial and the game guide. */
export interface EffectTutorialDefinition {
  readonly id: string;
  readonly scope: EffectScope;
  readonly type: string;
  readonly title: string;
  readonly iconFrame: string;
  readonly color: string;
  readonly summary: string;
  readonly behavior: string;
  readonly strategy: string;
}

const gem = (type: GemEffectType, title: string, iconFrame: string, color: string, summary: string, behavior: string, strategy: string): EffectTutorialDefinition => ({ id: `GEM:${type}`, scope: EffectScope.GEM, type, title, iconFrame, color, summary, behavior, strategy });
const link = (type: LinkEffectType, title: string, iconFrame: string, color: string, summary: string, behavior: string, strategy: string): EffectTutorialDefinition => ({ id: `LINK:${type}`, scope: EffectScope.LINK, type, title, iconFrame, color, summary, behavior, strategy });

export const EFFECT_TUTORIALS: readonly EffectTutorialDefinition[] = [
  gem(GemEffectType.SHIELD, "Scudo", "effect-shield", "#72dfff", "Una protezione sulla gemma.", "Assorbe una parte del valore del flusso in arrivo.", "Usa un valore abbastanza grande da superare lo scudo, poi calcola il resto."),
  gem(GemEffectType.WALL, "Muro", "effect-wall", "#bca477", "Un ostacolo che blocca il flusso.", "Ogni impatto consuma resistenza e non modifica subito il numero.", "Colpisci il muro fino a romperlo; solo dopo l’operazione raggiunge la gemma."),
  gem(GemEffectType.MIRROR, "Specchio", "effect-mirror-sign", "#dba0ff", "Uno specchio per il segno.", "Inverte il segno del valore ricevuto.", "Prepara un’operazione dal segno opposto a quello che vuoi ottenere."),
  gem(GemEffectType.AMPLIFIER, "Amplificatore", "effect-amplifier", "#ffcd62", "Una gemma che aumenta l’operazione.", "Moltiplica il valore in arrivo.", "Preferisci operazioni piccole e verifica il risultato dopo il moltiplicatore."),
  gem(GemEffectType.INVERTER, "Invertitore", "effect-inverter", "#c890ff", "Un invertitore locale.", "Dopo l’operazione cambia il segno del valore della gemma.", "Pianifica prima il valore intermedio, poi il segno finale."),
  gem(GemEffectType.ICE, "Ghiaccio", "effect-ice", "#8cecff", "Una barriera gelata.", "Blocca gli impatti finché il gelo non viene consumato.", "Scongelala con gli impatti e applica il valore solo quando la barriera è esaurita."),
  gem(GemEffectType.TIMER, "Timer", "effect-timer", "#ffcf75", "Una scadenza locale alla gemma.", "Perde un tentativo solo quando applichi un impulso diretto a questa gemma; se arriva a zero il timer si completa.", "Portala a zero entro i tentativi indicati: se l'ultimo impulso diretto non la risolve, il livello termina."),
  gem(GemEffectType.CORRUPTION, "Corruzione", "effect-corruption", "#b35cff", "Un effetto che peggiora nel tempo.", "Aumenta periodicamente il valore assoluto della gemma.", "Portala a zero rapidamente per fermare la corruzione."),
  link(LinkEffectType.ECHO, "Eco", "effect-echo-link", "#7edbff", "Un collegamento che prolunga il flusso.", "Trasmette lo stesso valore alla gemma collegata.", "Considera entrambe le gemme: ogni impulso tocca tutta la catena verde."),
  link(LinkEffectType.AMPLIFY, "Link amplificatore", "effect-double-link", "#ffcd62", "Un collegamento che potenzia il valore.", "Trasmette alla gemma collegata il valore moltiplicato.", "Usa numeri piccoli e controlla sempre il risultato sul secondo bersaglio."),
  link(LinkEffectType.INVERT, "Link invertitore", "effect-mirror-link", "#c890ff", "Un collegamento che cambia segno.", "Trasmette il valore invertendone il segno.", "Imposta l’operazione in modo che il valore invertito sia quello utile in arrivo."),
  { id: "AREA:BOMB", scope: EffectScope.AREA, type: AreaEffectType.BOMB, title: "Bomba ad area", iconFrame: "effect-area-bomb", color: "#ff9378", summary: "Un’esplosione che coinvolge le gemme vicine.", behavior: "Quando la gemma sorgente arriva a zero, applica l’effetto alle gemme entro il raggio indicato.", strategy: "Attivala quando la riduzione sui vicini è vantaggiosa, evitando di allontanarli dallo zero." },
  { id: "AREA:ICE", scope: EffectScope.AREA, type: AreaEffectType.ICE, title: "Ghiaccio ad area", iconFrame: "effect-ice", color: "#8cecff", summary: "Diffonde il gelo sulle gemme nel raggio.", behavior: "Quando la gemma sorgente arriva a zero, i bersagli bloccano il prossimo impulso per ogni punto di forza.", strategy: "Attivalo quando puoi rimandare in sicurezza le operazioni sulle gemme vicine." },
  { id: "AREA:INVERTER", scope: EffectScope.AREA, type: AreaEffectType.INVERTER, title: "Invertitore ad area", iconFrame: "effect-inverter", color: "#c890ff", summary: "Inverte i segni delle gemme nel raggio.", behavior: "Quando la gemma sorgente arriva a zero, cambia subito il segno di ogni valore coinvolto.", strategy: "Usalo per trasformare contemporaneamente più valori nel segno utile." },
];

export function getEffectTutorial(effect: EffectConfig): EffectTutorialDefinition | null {
  return EFFECT_TUTORIALS.find((item) => item.scope === effect.scope && item.type === effect.type) ?? null;
}

export function effectTutorialsForScope(scope: EffectScope): readonly EffectTutorialDefinition[] {
  return EFFECT_TUTORIALS.filter((item) => item.scope === scope);
}
