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
  IonText,
  IonTextarea,
  IonToolbar
} from '@ionic/angular/standalone';
import { FirestoreAdminService } from '../../../../core/services/admin/firestore-admin.service';
import { UiUtilsPageHeaderComponent } from "../../../../shared/components/ui-utils-page-header.component";


@Component({
  selector: 'app-document-viewer',
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
    IonToolbar,
    IonButton,
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
        <ion-card-title>Document Viewer</ion-card-title>
      </ion-card-header>

      <ion-card-content>
        <ion-item>
          <ion-label position="stacked">Document path</ion-label>
          <ion-input [(ngModel)]="documentPath" placeholder="users/uid oppure gameConfigs/public"></ion-input>
        </ion-item>

        <ion-toolbar>
          <ion-button slot="start" fill="outline" (click)="load()">Carica</ion-button>
          <ion-button slot="start" (click)="save()">Salva</ion-button>
          <ion-button slot="end" color="danger" fill="outline" (click)="remove()">Elimina</ion-button>
        </ion-toolbar>

        <ion-item>
          <ion-label position="stacked">JSON</ion-label>
          <ion-textarea [(ngModel)]="jsonEditor" autoGrow="true" rows="18"></ion-textarea>
        </ion-item>

        <ion-text color="success" *ngIf="successMessage()"><p>{{ successMessage() }}</p></ion-text>
        <ion-text color="danger" *ngIf="errorMessage()"><p>{{ errorMessage() }}</p></ion-text>
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
export class DocumentEditorPage {
  private readonly adminService = inject(FirestoreAdminService);

  documentPath = '';
  jsonEditor = '';

  readonly successMessage = signal<string>('');
  readonly errorMessage = signal<string>('');

  async load(): Promise<void> {
    this.clearMessages();

    if (!this.isEvenSegmentPath(this.documentPath)) {
      this.errorMessage.set('Il path deve puntare a un documento Firestore valido.');
      return;
    }

    const data = await this.adminService.getDocument(this.documentPath);
    this.jsonEditor = JSON.stringify(data ?? {}, null, 2);
  }

  async save(): Promise<void> {
    this.clearMessages();

    if (!this.isEvenSegmentPath(this.documentPath)) {
      this.errorMessage.set('Il path deve avere un numero pari di segmenti.');
      return;
    }

    try {
      const parsed = JSON.parse(this.jsonEditor);
      await this.adminService.replaceDocument(this.documentPath, parsed);
      this.successMessage.set('Documento salvato correttamente.');
    } catch {
      this.errorMessage.set('JSON non valido.');
    }
  }

  async remove(): Promise<void> {
    this.clearMessages();

    if (!this.isEvenSegmentPath(this.documentPath)) {
      this.errorMessage.set('Il path deve puntare a un documento valido.');
      return;
    }

    await this.adminService.deleteDocument(this.documentPath);
    this.jsonEditor = '';
    this.successMessage.set('Documento eliminato.');
  }

  private isEvenSegmentPath(path: string): boolean {
    const segments = path.split('/').filter(Boolean);
    return segments.length > 0 && segments.length % 2 === 0;
  }

  private clearMessages(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
  }
}
