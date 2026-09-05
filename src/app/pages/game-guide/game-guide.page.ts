import { ChangeDetectionStrategy, Component } from "@angular/core";
import {
  IonContent,
  IonFooter,
  IonHeader,
  IonToolbar,
} from "@ionic/angular/standalone";
import { EffectScope } from "../../core/game/phaser/effects/effects.models";
import {
  EffectTutorialDefinition,
  effectTutorialsForScope,
} from "../../core/game/phaser/effects/effect-tutorial.config";
import { UIBottomNavComponent } from "../../shared/components/ui-bottom-nav.component";
import { UIHeaderComponent } from "../../shared/components/ui-header.component";
import { UiSpriteComponent } from "../../shared/basic/ui-sprite.component";
import { RDN_ACTION_CATALOG } from "../../core/game/phaser/config/rdn-actions.config";

interface GuideMode {
  title: string;
  subtitle: string;
  description: string;
}

@Component({
  selector: "app-game-guide",
  standalone: true,
  imports: [
    IonContent,
    IonFooter,
    IonHeader,
    IonToolbar,
    UIHeaderComponent,
    UIBottomNavComponent,
    UiSpriteComponent,
  ],
  template: `
    <ion-header
      ><ion-toolbar
        ><ui-header
          title="Guida di gioco"
          backPath="/hub"></ui-header></ion-toolbar
    ></ion-header>
    <ion-content>
      <main class="guide">
        <section class="hero">
          <p class="eyebrow">RDN · GUIDA COMPLETA</p>
          <h1>Impara a dominare il flusso</h1>
          <p>
            Regole, effetti e modalità: questa guida si aggiorna con gli stessi
            simboli che trovi sulla plancia.
          </p>
          <nav aria-label="Sezioni della guida">
            <a href="#gioco">Gioco</a><a href="#gemme">Effetti gem</a
            ><a href="#azioni">Azioni</a><a href="#link">Effetti link</a
            ><a href="#area">Effetti area</a><a href="#modalita">Modalità</a>
          </nav>
        </section>

        <section id="gioco" class="guide-section">
          <p class="eyebrow">01 · GIOCO</p>
          <h2>Regole e obiettivo</h2>
          <div class="rule-grid">
            <article>
              <strong>1. Allinea</strong>
              <p>
                Ruota l’ingranaggio per mettere le operazioni davanti alle gemme
                dell’anello.
              </p>
            </article>
            <article>
              <strong>2. Leggi il flusso</strong>
              <p>
                Il flusso verde indica le gemme che saranno coinvolte. I link lo
                prolungano in una catena.
              </p>
            </article>
            <article>
              <strong>3. Lancia l’impulso</strong>
              <p>
                L’impulso centrale applica tutte le operazioni previste dal
                flusso attivo.
              </p>
            </article>
            <article>
              <strong>4. Porta tutto a zero</strong>
              <p>
                Il livello termina quando tutte le gemme esterne sono a zero. In
                Avventura e Time Attack gli impulsi determinano le stelle.
              </p>
            </article>
          </div>
          <div class="media-placeholder">
            Spazio riservato a immagine o video: rotazione, flusso attivo e
            impulso.
          </div>
        </section>

        <section id="gemme" class="guide-section">
          <p class="eyebrow">02 · EFFETTI GEM</p>
          <h2>Effetti applicati a una gemma</h2>
          <p class="section-lead">
            L’icona appare sulla gemma. Il tutorial compare automaticamente la
            prima volta che un tipo di effetto viene introdotto.
          </p>
          <div class="effect-grid">
            @for (effect of gemEffects; track effect.id) {
              <article class="effect-card" [style.--icon-color]="effect.color">
                <ui-sprite
                  class="effect-icon"
                  [atlasSource]="tutorialAtlas(effect)"
                  [frame]="{ name: effect.iconFrame, effect: 'none' }"
                  [allowUpscale]="true"
                  [showScale]="false" />
                <div>
                  <h3>{{ effect.title }}</h3>
                  <p>{{ effect.summary }}</p>
                  <p><b>Cosa fa:</b> {{ effect.behavior }}</p>
                  <p><b>Come gestirlo:</b> {{ effect.strategy }}</p>
                </div>
              </article>
            }
          </div>
        </section>

        <section id="azioni" class="guide-section">
          <p class="eyebrow">03 · AZIONI UTENTE</p>
          <h2>Strumenti speciali</h2>
          <p class="section-lead">
            Le azioni in basso hanno cariche limitate e sono disponibili solo
            quando possono agire sul flusso attivo.
          </p>
          <div class="action-grid">
            @for (action of actions; track action.id) {
              <article>
                <ui-sprite
                  class="action-icon"
                  [atlasSource]="actionAtlas(action.icon)"
                  [frame]="{ name: action.icon, effect: 'none' }"
                  [allowUpscale]="true"
                  [showScale]="false" />
                <div>
                  <h3>{{ action.label }}</h3>
                  <p>{{ action.description }}</p>
                </div>
              </article>
            }
          </div>
        </section>

        <section id="link" class="guide-section">
          <p class="eyebrow">04 · EFFETTI LINK</p>
          <h2>Collegamenti e catene di flusso</h2>
          <p class="section-lead">
            Quando un link è incluso nel flusso verde, ne diventa la
            continuazione: l’operazione raggiunge anche le gemme successive
            della catena.
          </p>
          <div class="effect-grid">
            @for (effect of linkEffects; track effect.id) {
              <article class="effect-card" [style.--icon-color]="effect.color">
                <ui-sprite
                  class="effect-icon"
                  [atlasSource]="tutorialAtlas(effect)"
                  [frame]="{ name: effect.iconFrame, effect: 'none' }"
                  [allowUpscale]="true"
                  [showScale]="false" />
                <div>
                  <h3>{{ effect.title }}</h3>
                  <p>{{ effect.summary }}</p>
                  <p><b>Cosa fa:</b> {{ effect.behavior }}</p>
                  <p><b>Come gestirlo:</b> {{ effect.strategy }}</p>
                </div>
              </article>
            }
          </div>
          <div class="media-placeholder">
            Spazio riservato a immagine o video: esempio di flusso verde che
            attraversa una catena di link.
          </div>
        </section>

        <section id="area" class="guide-section">
          <p class="eyebrow">05 · EFFETTI AREA</p>
          <h2>Effetti che coinvolgono più gemme</h2>
          <div class="effect-grid">
            @for (effect of areaEffects; track effect.id) {
              <article class="effect-card" [style.--icon-color]="effect.color">
                <ui-sprite
                  class="effect-icon"
                  [atlasSource]="tutorialAtlas(effect)"
                  [frame]="{ name: effect.iconFrame, effect: 'none' }"
                  [allowUpscale]="true"
                  [showScale]="false" />
                <div>
                  <h3>{{ effect.title }}</h3>
                  <p>{{ effect.summary }}</p>
                  <p><b>Cosa fa:</b> {{ effect.behavior }}</p>
                  <p><b>Come gestirlo:</b> {{ effect.strategy }}</p>
                </div>
              </article>
            }
          </div>
        </section>

        <section id="modalita" class="guide-section">
          <p class="eyebrow">06 · MODALITÀ GIOCO</p>
          <h2>Scegli la sfida</h2>
          <div class="mode-grid">
            @for (mode of modes; track mode.title) {
              <article>
                <span>{{ mode.subtitle }}</span>
                <h3>{{ mode.title }}</h3>
                <p>{{ mode.description }}</p>
              </article>
            }
          </div>
          <div class="media-placeholder">
            Spazio riservato a immagini e video esplicativi delle quattro
            modalità.
          </div>
        </section>
      </main>
    </ion-content>
    <ion-footer
      ><ion-toolbar><ui-bottom-nav /></ion-toolbar
    ></ion-footer>
  `,
  styles: [
    `
      .guide {
        max-width: 980px;
        margin: auto;
        padding: 18px 16px 42px;
        color: #f1ead9;
      }
      .hero,
      .guide-section {
        background: linear-gradient(145deg, #17251f, #101915);
        border: 1px solid #71572e;
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 18px;
      }
      .hero {
        background: radial-gradient(circle at top right, #326744, #142017 62%);
      }
      h1,
      h2,
      h3,
      p {
        margin-top: 0;
      }
      .hero h1 {
        font-size: clamp(28px, 6vw, 44px);
        margin-bottom: 10px;
      }
      .hero p {
        line-height: 1.55;
        color: #ddd4bd;
      }
      .eyebrow {
        font-size: 12px;
        letter-spacing: 0.14em;
        color: #f1cc6c;
        font-weight: 700;
      }
      .hero nav {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 20px;
      }
      .hero a {
        color: #d9f5c9;
        text-decoration: none;
        border: 1px solid #57865e;
        border-radius: 999px;
        padding: 8px 12px;
        font-size: 13px;
      }
      .guide-section h2 {
        font-size: 26px;
        color: #fff0b6;
      }
      .section-lead {
        line-height: 1.5;
        color: #d8d0ba;
      }
      .rule-grid,
      .mode-grid,
      .effect-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .rule-grid article,
      .mode-grid article,
      .effect-card,
      .action-grid article {
        background: #0d1612;
        border: 1px solid #314a38;
        border-radius: 12px;
        padding: 14px;
      }
      .rule-grid strong {
        color: #aaf1b2;
      }
      .rule-grid p,
      .mode-grid p {
        margin: 8px 0 0;
        line-height: 1.45;
        color: #d6cfba;
      }
      .mode-grid span {
        font-size: 11px;
        letter-spacing: 0.1em;
        color: #f1cc6c;
      }
      .mode-grid h3 {
        font-size: 19px;
        margin: 7px 0;
      }
      .effect-card,
      .action-grid article {
        display: flex;
        gap: 12px;
      }
      .effect-card h3 {
        margin-bottom: 7px;
        color: var(--icon-color);
        font-size: 18px;
      }
      .effect-card p,
      .action-grid p {
        margin-bottom: 7px;
        line-height: 1.4;
        color: #d8d0ba;
        font-size: 13px;
      }
      .effect-card b {
        color: #f3e7c8;
      }
      .effect-icon,
      .action-icon {
        flex: 0 0 42px;
        width: 42px;
        height: 42px;
      }
      .effect-icon {
        border-radius: 50%;
        border: 1px solid var(--icon-color);
        box-shadow: 0 0 14px var(--icon-color);
      }
      .action-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .action-grid h3 {
        margin: 2px 0 7px;
        color: #f1cc6c;
        font-size: 18px;
      }
      .media-placeholder {
        margin-top: 16px;
        min-height: 94px;
        display: grid;
        place-items: center;
        text-align: center;
        border: 1px dashed #778b6f;
        border-radius: 12px;
        color: #adb9a5;
        background: #0d161299;
        padding: 14px;
        font-size: 13px;
      }
      @media (max-width: 620px) {
        .guide {
          padding: 12px;
        }
        .hero,
        .guide-section {
          padding: 18px;
        }
        .rule-grid,
        .mode-grid,
        .effect-grid,
        .action-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameGuidePage {
  readonly gemEffects = effectTutorialsForScope(EffectScope.GEM);
  readonly linkEffects = effectTutorialsForScope(EffectScope.LINK);
  readonly areaEffects = effectTutorialsForScope(EffectScope.AREA);
  tutorialAtlas(effect: EffectTutorialDefinition): "effects" | "effect-actions" | undefined {
    return effect.iconTexture === "rdn-effect-actions" ? "effect-actions" : effect.iconTexture === "rdn-effects" ? "effects" : undefined;
  }
  actionAtlas(icon: string): "effects" | "effect-actions" { return icon === "effect-mirror-sign" ? "effects" : "effect-actions"; }
  readonly actions = Object.values(RDN_ACTION_CATALOG);
  readonly modes: readonly GuideMode[] = [
    {
      title: "Avventura",
      subtitle: "PROGRESSIONE",
      description:
        "Affronta livelli preparati, sblocca il successivo e punta a tre stelle usando meno impulsi possibile.",
    },
    {
      title: "Time Attack",
      subtitle: "VELOCITÀ",
      description:
        "Completa le configurazioni prima dello scadere del conto alla rovescia, senza perdere precisione nella rotazione.",
    },
    {
      title: "Free",
      subtitle: "PARTITA PERSONALIZZATA",
      description:
        "Scegli difficoltà e numero di gemme; puoi decidere se includere gli effetti nella partita.",
    },
    {
      title: "Effect Playground",
      subtitle: "LABORATORIO",
      description:
        "Modalità di prova dedicata agli effetti: osserva icone, flussi e risultati in scenari controllati.",
    },
  ];
}
