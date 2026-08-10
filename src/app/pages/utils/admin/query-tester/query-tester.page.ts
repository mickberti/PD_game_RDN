import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonText,
  IonTextarea,
  ToastController
} from '@ionic/angular/standalone';
import { FirebaseWhereFilterOp, FirestoreAdminService } from '../../../../core/services/admin/firestore-admin.service';
import { UiUtilsPageHeaderComponent } from "../../../../shared/components/ui-utils-page-header.component";



@Component({
  selector: 'app-query-tester',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonButton,
    IonList,
    IonText,
	IonContent,
    UiUtilsPageHeaderComponent
],
  template: `
  <ion-content>
    <div class="screen admin-screen">
      <ui-utils-page-header
        group="admin"
        title="Frame Order"
        description="Seleziona un atlas eroe, riordina i frame con drag and drop e scorri la preview seguendo l'ordine scelto."
      />
    <ion-card>
      <ion-card-header>
        <ion-card-title>Firestore Query Tester</ion-card-title>
      </ion-card-header>

      <ion-card-content>
        <ion-item>
          <ion-label position="stacked">Collection</ion-label>
          <ion-input [(ngModel)]="collectionName" placeholder="users"></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Filtro where (JSON)</ion-label>
          <ion-textarea
            [(ngModel)]="whereFilters"
            rows="3"
            autoGrow="true"
            placeholder='[{"field":"role","op":"==","value":"admin"}]'
          ></ion-textarea>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Order by (JSON opzionale)</ion-label>
          <ion-textarea
            [(ngModel)]="orderBy"
            rows="2"
            autoGrow="true"
            placeholder='{"field":"createdAt","direction":"desc"}'
          ></ion-textarea>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Limit (opzionale)</ion-label>
          <ion-input type="number" [(ngModel)]="limitValue" placeholder="20"></ion-input>
        </ion-item>

        <ion-button expand="block" (click)="runQuery()">Esegui query</ion-button>

        <ion-text color="danger" *ngIf="errorMessage()">
          <p>{{ errorMessage() }}</p>
        </ion-text>

        <ion-list *ngIf="results().length">
          <ion-item>
            <ion-label>
              <h3>Risultati: {{ results().length }}</h3>
            </ion-label>
          </ion-item>
        </ion-list>

        <ion-item *ngIf="results().length">
          <ion-label position="stacked">Output JSON</ion-label>
          <ion-textarea [value]="resultsJson()" rows="16" readonly="true" autoGrow="true"></ion-textarea>
        </ion-item>
      </ion-card-content>
    </ion-card>
	</div>
	</ion-content>
  `	,
	  styles: [`
	  .collection-controls {
	    display: grid;
	    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	    gap: 8px;
	    align-items: end;
	  }

	  .scroll-container {
	    max-height: 300px;
	    overflow-y: auto;
	  }
	  .admin-screen{
	      min-height:100%;
	      padding:20px;
	      color:#f8fafc;
	      width:100%;
	      background:radial-gradient(circle at top right,rgba(14,165,233,.22),transparent 32rem),linear-gradient(135deg,#0f172a,#1e1b4b 48%,#09090b)
	  }
	  `]
})
export class QueryTesterPage {
  private readonly adminService = inject(FirestoreAdminService);
  private readonly toastController = inject(ToastController);

  collectionName = '';
  whereFilters = '';
  orderBy = '';
  limitValue: number | null = null;

  readonly errorMessage = signal('');
  readonly results = signal<any[]>([]);

  resultsJson(): string {
    return JSON.stringify(this.results(), null, 2);
  }

  async runQuery(): Promise<void> {
    this.errorMessage.set('');

    if (!this.collectionName.trim()) {
      this.errorMessage.set('Inserisci il nome della collection.');
      return;
    }

    try {
      const where = this.parseWhereFilters(this.whereFilters);
      const order = this.parseOrderBy(this.orderBy);
      const docs = await this.adminService.runCollectionQuery(this.collectionName.trim(), {
        where,
        orderBy: order,
        limit: this.limitValue && this.limitValue > 0 ? this.limitValue : undefined
      });

      this.results.set(docs);
      await this.presentToast(`Query completata: ${docs.length} documenti trovati.`, 'success');
    } catch (error) {
      this.errorMessage.set('Query non valida o non eseguibile. Controlla i filtri JSON.');
      await this.presentToast('Errore durante l\'esecuzione della query.', 'danger');
    }
  }

  private parseWhereFilters(raw: string): Array<{ field: string; op: FirebaseWhereFilterOp; value: unknown }> {
    if (!raw.trim()) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Where filter must be an array.');
    }

    return parsed;
  }

  private parseOrderBy(raw: string): { field: string; direction?: 'asc' | 'desc' } | undefined {
    if (!raw.trim()) {
      return undefined;
    }

    return JSON.parse(raw);
  }

  private async presentToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 1800
    });

    await toast.present();
  }
}
