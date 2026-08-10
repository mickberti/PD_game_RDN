import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonText,
  IonTextarea,
  IonToolbar,
  ToastController,
  IonSelect,
  IonSelectOption,
  IonContent
} from '@ionic/angular/standalone';


import { FirestoreAdminService } from '../../../../core/services/admin/firestore-admin.service';
import { LoggerService } from '../../../../core/services/infrastructure/logging/logger.service';
import { UiUtilsPageHeaderComponent } from "../../../../shared/components/ui-utils-page-header.component";

@Component({
  selector: 'app-admin',
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
    IonToolbar,
    IonButton,
    IonList,
    IonTextarea,
    IonText,
    IonSelect,
    IonSelectOption,
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
	  
    <ion-card class="stat-card">
      <ion-card-header>
        <ion-card-title>Firestore Admin</ion-card-title>
      </ion-card-header>

      <ion-card-content>
        <div class="collection-controls">
          <ion-item>
            <ion-label position="stacked">Collection name</ion-label>
            <ion-select [(ngModel)]="collectionName" (ngModelChange)="onCollectionChange()">
              <ion-select-option *ngFor="let option of collectionOptions" [value]="option">{{ option }}</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item *ngIf="supportsTypeFilter()">
            <ion-label position="stacked">Filtro type</ion-label>
            <ion-select [(ngModel)]="selectedTypeFilter">
              <ion-select-option [value]="allTypesFilterValue">Tutti</ion-select-option>
              <ion-select-option *ngFor="let type of availableTypeFilters()" [value]="type">{{ type }}</ion-select-option>
            </ion-select>
          </ion-item>
        </div>

        <ion-toolbar>
          <ion-button slot="start" (click)="loadCollection()">Load</ion-button>
        </ion-toolbar>

		<div class="scroll-container">
	        <ion-list>
	          <ion-item *ngFor="let doc of filteredDocuments()">
	            <ion-label>
	              <h3>{{ doc.id }}</h3>
	            </ion-label>
	            <ion-button fill="clear" (click)="edit(doc)">Edit</ion-button>
	            <ion-button fill="clear" color="danger" (click)="remove(doc.id)">Delete</ion-button>
	          </ion-item>
	        </ion-list>
		</div>
		
        <ion-item>
          <ion-label position="stacked">Document path</ion-label>
          <ion-input [(ngModel)]="docPath" placeholder="users/uid"></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">JSON Editor</ion-label>
          <ion-textarea [(ngModel)]="jsonEditor" autoGrow="true" rows="14"></ion-textarea>
        </ion-item>

        <ion-button expand="block" (click)="save()">Save</ion-button>

        <ion-text color="danger" *ngIf="errorMessage()">
          <p>{{ errorMessage() }}</p>
        </ion-text>
      </ion-card-content>
    </ion-card>
	</div>
	</ion-content>
  `,
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
export class CollectionEditorPage {
  private readonly admin = inject(FirestoreAdminService);
  private readonly logger = inject(LoggerService);
  private readonly toastController = inject(ToastController);

  readonly collectionOptions = [
    'users',
    'catalogHeroes',
    'catalogEquip',
    'catalogChestes',
    'catalogResources',
    'catalogAwards',
    'shopItems',
    'events',
    'gameConfigs',
    'adminLogs'
  ];

  collectionName = this.collectionOptions[0];
  documents = signal<any[]>([]);
  readonly allTypesFilterValue = '__all__';
  selectedTypeFilter = this.allTypesFilterValue;
  jsonEditor = '';
  docPath = '';
  readonly errorMessage = signal('');
  readonly availableTypeFilters = computed(() => {
    if (!this.supportsTypeFilter()) {
      return [];
    }

    return [...new Set(
      this.documents()
        .map((doc) => doc?.type)
        .filter((type): type is string => typeof type === 'string' && type.trim().length > 0)
    )].sort((a, b) => a.localeCompare(b));
  });

  supportsTypeFilter(): boolean {
    return this.collectionName === 'events' || this.collectionName === 'shopItems';
  }

  onCollectionChange(): void {
    this.selectedTypeFilter = this.allTypesFilterValue;
    this.documents.set([]);
    this.docPath = '';
    this.jsonEditor = '';
  }

  filteredDocuments(): any[] {
    const docs = this.documents();
    if (!this.supportsTypeFilter() || this.selectedTypeFilter === this.allTypesFilterValue) {
      return docs;
    }

    return docs.filter((doc) => doc?.type === this.selectedTypeFilter);
  }

  async loadCollection() {
    this.errorMessage.set('');

    if (!this.collectionName) {
      await this.presentToast('Seleziona una collection prima di caricare.', 'warning');
      return;
    }

    try {
      const docs = await this.admin.getCollection(this.collectionName);
      this.documents.set(docs);
      this.selectedTypeFilter = this.allTypesFilterValue;
      await this.presentToast(`Caricati ${docs.length} documenti da ${this.collectionName}.`, 'success');
    } catch (error) {
      this.logger.logError('Errore durante il caricamento della collection:', error);
      this.errorMessage.set('Errore durante il caricamento della collection.');
      await this.presentToast('Caricamento non riuscito.', 'danger');
    }
  }

  async edit(doc: any) {
    this.jsonEditor = JSON.stringify(doc, null, 2);
    this.docPath = `${this.collectionName}/${doc.id}`;
    await this.presentToast(`Documento ${doc.id} aperto in modifica.`, 'primary');
  }

  async save() {
    this.errorMessage.set('');

    try {
      const parsed = JSON.parse(this.jsonEditor);
      await this.admin.saveDocument(this.docPath, parsed);
      await this.presentToast('Documento salvato correttamente.', 'success');
    } catch (e) {
      this.logger.logError('JSON non valido:', e);
      this.errorMessage.set('JSON non valido.');
      await this.presentToast('Salvataggio non riuscito: JSON non valido.', 'danger');
    }
  }

  async remove(id: string) {
    try {
      await this.admin.deleteDocument(`${this.collectionName}/${id}`);
      await this.presentToast(`Documento ${id} eliminato.`, 'success');
      await this.loadCollection();
    } catch (error) {
      this.logger.logError("Errore durante l'eliminazione del documento:", error);
      await this.presentToast(`Eliminazione di ${id} non riuscita.`, 'danger');
    }
  }

  private async presentToast(message: string, color: 'success' | 'warning' | 'danger' | 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      color
    });

    await toast.present();
  }
}
