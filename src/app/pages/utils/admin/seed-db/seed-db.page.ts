import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCheckbox,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonText,
  IonTextarea,
  ToastController
} from '@ionic/angular/standalone';

import { FIRESTORE_SEED_TARGETS, FirestoreAdminService, FirestoreSeedPreview, FirestoreSeedResult, FirestoreSeedTarget } from '../../../../core/services/admin/firestore-admin.service';
import { LoggerService } from '../../../../core/services/infrastructure/logging/logger.service';
import { UiUtilsPageHeaderComponent } from '../../../../shared/components/ui-utils-page-header.component';

@Component({
  selector: 'app-seed-db',
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonCheckbox,
    IonContent,
    IonItem,
    IonLabel,
    IonList,
    IonText,
    IonTextarea,
    UiUtilsPageHeaderComponent
  ],
  template: `
  <ion-content>
    <div class="screen admin-screen">
      <ui-utils-page-header
        group="admin"
        title="Seed DB"
        description="Popola Firestore con il catalogo mock fantasy, lo shop, gli eventi e la configurazione pubblica."
      />

      <ion-card class="stat-card">
        <ion-card-header>
          <ion-card-title>Firestore Seed DB</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <p class="seed-copy">
            Questa operazione elimina prima tutti i dati esistenti per i tipi selezionati e poi inserisce i mock tra catalogo, shop, eventi e documento
            <strong>gameConfigs/public</strong>, così Firestore resta allineato esattamente al payload caricato. La pagina è raggiungibile solo tramite le route protette da AdminGuard.
          </p>

          <div class="seed-actions">
            <ion-button size="small" fill="outline" [disabled]="isSeeding()" (click)="selectAllTargets()">
              Seleziona tutto
            </ion-button>
            <ion-button size="small" fill="clear" [disabled]="isSeeding()" (click)="clearTargets()">
              Deseleziona tutto
            </ion-button>
          </div>

          <ion-list>
            <ng-container *ngFor="let option of seedOptions">
              <ion-item>
                <ion-checkbox
                  slot="start"
                  [disabled]="isSeeding()"
                  [checked]="isTargetSelected(option.target)"
                  (ionChange)="setTargetSelection(option.target, $event.detail.checked)"
                />
                <ion-label>
                  <h3>{{ option.label }}</h3>
                  <p>{{ option.description }}</p>
                </ion-label>
                <ion-button
                  slot="end"
                  size="small"
                  fill="outline"
                  [disabled]="isSeeding()"
                  (click)="togglePreview(option.target)"
                >
                  {{ isPreviewVisible(option.target) ? 'Nascondi' : 'Anteprima' }}
                </ion-button>
                <ion-button
                  slot="end"
                  size="small"
                  fill="outline"
                  [disabled]="isSeeding()"
                  (click)="copyPreview(option.target)"
                >
                  Copia
                </ion-button>
                <ion-button
                  slot="end"
                  size="small"
                  color="danger"
                  fill="outline"
                  [disabled]="isSeeding()"
                  (click)="deleteTarget(option.target)"
                >
                  Rimuovi
                </ion-button>
              </ion-item>

              <ion-item *ngIf="isPreviewVisible(option.target) && activePreview()">
                <ion-label position="stacked">
                  Anteprima {{ activePreview()?.path }} — {{ activePreview()?.count }} {{ activePreview()?.type === 'collection' ? 'documenti' : 'documento' }}
                </ion-label>
                <ion-textarea [value]="previewJson()" rows="12" readonly="true" autoGrow="true"></ion-textarea>
              </ion-item>
            </ng-container>
          </ion-list>

          <ion-button expand="block" [disabled]="isSeeding() || !hasSelectedTargets()" (click)="seedDatabase()">
            {{ isSeeding() ? 'Seed in corso...' : 'Aggiorna dati selezionati' }}
          </ion-button>

          <ion-text color="success" *ngIf="successMessage()">
            <p>{{ successMessage() }}</p>
          </ion-text>
          <ion-text color="danger" *ngIf="errorMessage()">
            <p>{{ errorMessage() }}</p>
          </ion-text>

          <ion-item *ngIf="seedResult()">
            <ion-label position="stacked">Risultato seed</ion-label>
            <ion-textarea [value]="resultJson()" rows="14" readonly="true" autoGrow="true"></ion-textarea>
          </ion-item>
        </ion-card-content>
      </ion-card>
    </div>
  </ion-content>
  `,
  styles: [`
    .admin-screen {
      min-height: 100%;
      padding: 20px;
      color: #f8fafc;
      width: 100%;
      background: radial-gradient(circle at top right, rgba(14,165,233,.22), transparent 32rem), linear-gradient(135deg, #0f172a, #1e1b4b 48%, #09090b);
    }

    .seed-copy {
      line-height: 1.5;
      margin: 0 0 16px;
    }

    .seed-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }

    ion-textarea {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 12px;
    }
  `]
})
export class SeedDbPage {
  private readonly admin = inject(FirestoreAdminService);
  private readonly logger = inject(LoggerService);
  private readonly toastController = inject(ToastController);

  readonly seedOptions: { target: FirestoreSeedTarget; label: string; description: string }[] = [
    { target: 'catalogHeroes', label: 'catalogHeroes', description: 'Eroi fantasy disponibili nel catalogo.' },
    { target: 'catalogEquip', label: 'catalogEquip', description: 'Equipaggiamenti e varianti del catalogo.' },
    { target: 'catalogChestes', label: 'catalogChestes', description: 'Chest apribili e relative configurazioni.' },
    { target: 'catalogResources', label: 'catalogResources', description: 'Risorse e valute disponibili.' },
    { target: 'catalogAwards', label: 'catalogAwards', description: 'Premi e ricompense del catalogo.' },
    { target: 'events', label: 'events', description: 'Eventi live mock.' },
    { target: 'gameConfigs/public', label: 'gameConfigs/public', description: 'Configurazione pubblica del gioco.' }
  ];

  readonly isSeeding = signal(false);
  readonly seedResult = signal<FirestoreSeedResult | null>(null);
  readonly activePreview = signal<FirestoreSeedPreview | null>(null);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly selectedTargets = signal<FirestoreSeedTarget[]>([...FIRESTORE_SEED_TARGETS]);

  resultJson(): string {
    return JSON.stringify(this.seedResult(), null, 2);
  }

  previewJson(): string {
    return JSON.stringify(this.activePreview(), null, 2);
  }

  hasSelectedTargets(): boolean {
    return this.selectedTargets().length > 0;
  }

  isTargetSelected(target: FirestoreSeedTarget): boolean {
    return this.selectedTargets().includes(target);
  }

  setTargetSelection(target: FirestoreSeedTarget, checked: boolean): void {
    const selected = new Set(this.selectedTargets());

    if (checked) {
      selected.add(target);
    } else {
      selected.delete(target);
    }

    this.selectedTargets.set(FIRESTORE_SEED_TARGETS.filter(seedTarget => selected.has(seedTarget)));
  }

  selectAllTargets(): void {
    this.selectedTargets.set([...FIRESTORE_SEED_TARGETS]);
  }

  clearTargets(): void {
    this.selectedTargets.set([]);
  }

  isPreviewVisible(target: FirestoreSeedTarget): boolean {
    return this.activePreview()?.target === target;
  }

  togglePreview(target: FirestoreSeedTarget): void {
    if (this.isPreviewVisible(target)) {
      this.activePreview.set(null);
      return;
    }

    this.activePreview.set(this.admin.getSeedPreview(target));
  }

  async copyPreview(target: FirestoreSeedTarget): Promise<void> {
    const preview = this.isPreviewVisible(target) && this.activePreview()
      ? this.activePreview()
      : this.admin.getSeedPreview(target);
    const previewContent = JSON.stringify(preview, null, 2);

    try {
      await this.writeClipboardText(previewContent);
      await this.presentToast(`Anteprima copiata per ${target}.`, 'success');
    } catch (error) {
      this.logger.logError('[SeedDbPage] Copy seed preview failed', error);
      await this.presentToast('Copia anteprima non riuscita.', 'danger');
    }
  }

  private async writeClipboardText(value: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  }

  async seedDatabase(): Promise<void> {
    this.successMessage.set('');
    this.errorMessage.set('');
    this.seedResult.set(null);
    this.isSeeding.set(true);

    try {
      const result = await this.admin.seedMockDatabase(this.selectedTargets());
      this.seedResult.set(result);
      this.successMessage.set(`Aggiornamento completato: ${result.totalDeletes} eliminazioni e ${result.totalWrites} scritture effettuate.`);
      await this.presentToast('Dati selezionati riallineati.', 'success');
    } catch (error) {
      this.logger.logError('[SeedDbPage] Seed DB failed', error);
      this.errorMessage.set('Seed DB non riuscito. Controlla permessi admin, regole Firestore e console.');
      await this.presentToast('Seed DB non riuscito.', 'danger');
    } finally {
      this.isSeeding.set(false);
    }
  }

  async deleteTarget(target: FirestoreSeedTarget): Promise<void> {
    this.successMessage.set('');
    this.errorMessage.set('');
    this.seedResult.set(null);
    this.isSeeding.set(true);

    try {
      const deletedCount = await this.admin.deleteSeedTarget(target);
      this.successMessage.set(`Rimozione completata per ${target}: ${deletedCount} documenti eliminati.`);
      await this.presentToast(`Dati rimossi per ${target}.`, 'success');
    } catch (error) {
      this.logger.logError('[SeedDbPage] Delete seed target failed', error);
      this.errorMessage.set(`Rimozione non riuscita per ${target}. Controlla permessi admin, regole Firestore e console.`);
      await this.presentToast('Rimozione non riuscita.', 'danger');
    } finally {
      this.isSeeding.set(false);
    }
  }

  private async presentToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 2000
    });

    await toast.present();
  }
}
