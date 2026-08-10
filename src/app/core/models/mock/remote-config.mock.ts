import { RemoteConfigDocument } from '../remote/config.model';

/**
 * Configurazione usata quando l'app lavora con il provider dati mock.
 * Mantiene la stessa forma del documento remoto Firestore così GameStateService
 * può consumare remoteConfig senza conoscere la sorgente selezionata.
 */
export const MOCK_REMOTE_CONFIG = {
  maintenanceMode: false,
  minSupportedVersion: '0.0.1',
  latestVersion: '0.0.1-mock',
  news: [
    'Modalità mock attiva: dati locali disponibili senza servizi remoti.',
    'Usa le impostazioni per tornare al provider remote e ricaricare Firestore.'
  ]
} satisfies RemoteConfigDocument;
