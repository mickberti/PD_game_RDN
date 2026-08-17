import { CommonModule } from "@angular/common";
import { Component, computed, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { IonContent, IonFooter, IonToolbar } from "@ionic/angular/standalone";
import { PuzzleOperator } from "../../../core/game/rnd/puzzle.types";
import { getRdnSolutionTable } from "../../../core/game/rnd/levels.config";
import { UIBottomUtilsComponent } from "../../../shared/components/ui-bottom-utils.component";
import { UiUtilsPageHeaderComponent } from "../../../shared/components/ui-utils-page-header.component";

type SolutionVariant = "adventure" | "time-attack";

@Component({
  selector: "app-rnd-solution-table",
  standalone: true,
  imports: [CommonModule, IonContent, IonFooter, IonToolbar, UIBottomUtilsComponent, UiUtilsPageHeaderComponent],
  template: `
    <ion-content>
      <div class="screen solution-page">
        <ui-utils-page-header group="game" [title]="title()" [description]="description()" />

        <section class="summary">
          <strong>{{ rows().length }} livelli</strong>
          <span>·</span>
          <strong [class.invalid]="!allVerified()">{{ allVerified() ? 'Tutte le soluzioni verificate' : 'Verifica fallita' }}</strong>
          <span>·</span>
          <span>Apri un livello per vedere valori, operatori e rotazioni ottimali.</span>
        </section>

        @for (row of rows(); track row.level) {
          <details class="level-card">
            <summary>
              <span>Livello {{ row.level }}</span>
              <span>{{ row.slots.length }} castoni · {{ row.moves.length }} impulsi</span>
              <b [class.invalid]="!row.verified">{{ row.verified ? '✓ verificato' : '✕ non valido' }}</b>
            </summary>
            <div class="card-content">
              <section class="provided"><h2>Operatori disponibili nel gear</h2><p>{{ operators(row.providedOperators) }}</p></section>
              <section>
                <h2>Valori esterni e sequenza per castone</h2>
                <ol class="slots">
                  @for (slot of row.slots; track $index) {
                    <li><b>C{{ $index + 1 }}</b><span>{{ slot.startValue }} → {{ operators(slot.operators) }} → 0</span></li>
                  }
                </ol>
              </section>
              <section>
                <h2>Sequenza globale</h2>
                <ol class="moves">
                  @for (move of row.moves; track $index) {
                    <li>#{{ $index + 1 }} · C{{ move.outerIndex + 1 }} · rotazione {{ move.rotation }} · {{ operator(move.operator) }}</li>
                  }
                </ol>
              </section>
            </div>
          </details>
        }
      </div>
    </ion-content>
    <ion-footer><ion-toolbar><ui-bottom-utils /></ion-toolbar></ion-footer>
  `,
  styles: [`
    .solution-page { padding-bottom: 96px; }
    .summary { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 16px 0; padding: 14px; border: 1px solid rgba(103, 232, 249, .35); border-radius: 14px; color: #dff9ff; background: rgba(8, 35, 46, .72); }
    .level-card { margin: 10px 0; overflow: hidden; border: 1px solid rgba(255, 255, 255, .18); border-radius: 14px; color: #ecfeff; background: rgba(15, 23, 42, .9); }
    summary { display: grid; grid-template-columns: minmax(110px, 1fr) minmax(130px, 1fr) auto; gap: 12px; padding: 15px; cursor: pointer; font-weight: 700; }
    summary b { color: #7cf0ae; } .invalid { color: #fb7185 !important; }
    .card-content { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; padding: 0 16px 16px; border-top: 1px solid rgba(255, 255, 255, .12); }
    h2 { margin: 16px 0 8px; color: #f8d77c; font-size: 15px; }
    .slots, .moves { display: grid; gap: 6px; margin: 0; padding-left: 22px; }
    .slots li { display: flex; gap: 10px; } .slots b { min-width: 28px; color: #7dd3fc; }
    .provided p { margin: 0; color: #a7f3d0; font-weight: 800; letter-spacing: .04em; }
    .moves { max-height: 260px; overflow: auto; color: #cbd5e1; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    @media (max-width: 500px) { summary { grid-template-columns: 1fr auto; } summary b { grid-column: 1 / -1; } }
  `],
})
export class RdnSolutionTablePage {
  private readonly route = inject(ActivatedRoute);
  readonly variant = (this.route.snapshot.data["variant"] === "time-attack" ? "time-attack" : "adventure") as SolutionVariant;
  readonly rows = computed(() => getRdnSolutionTable(this.variant));
  readonly allVerified = computed(() => this.rows().every((row) => row.verified));
  readonly title = computed(() => this.variant === "adventure" ? "Soluzioni RDN · Avventura" : "Soluzioni RDN · Time Attack");
  readonly description = computed(() => "Catalogo dei 100 livelli, con sequenze per castone, rotazioni richieste e controllo di risolvibilità.");

  operator(value: PuzzleOperator): string { return value === "divide2" ? "÷2" : value > 0 ? `+${value}` : String(value); }
  operators(values: readonly PuzzleOperator[]): string { return values.map((value) => this.operator(value)).join(" · "); }
}
