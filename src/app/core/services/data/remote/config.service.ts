import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { environment } from '../../../../../environments/environment';
import { LoggerService } from '../../infrastructure/logging/logger.service';
import { DEFAULT_REMOTE_CONFIG, RemoteConfigDocument } from '../../../models/remote/config.model';


@Injectable({ providedIn: 'root' })
export class RemoteConfigService {
  private readonly firestore = inject(Firestore);
  private readonly logger = inject(LoggerService);

  async loadPublicConfig(): Promise<RemoteConfigDocument> {
    try {
      this.logger.logDebug('[RemoteConfigService] Loading remote config from path:', environment.remoteConfigDocumentPath);

      const ref = doc(this.firestore, environment.remoteConfigDocumentPath);
      const snapshot = await getDoc(ref);

      this.logger.logDebug('[RemoteConfigService] Loading remote config OK :', snapshot);

      if (!snapshot.exists()) {
        this.logger.logWarning('[RemoteConfigService] Remote config document does not exist, using default config');
        return { ...DEFAULT_REMOTE_CONFIG, news: [...DEFAULT_REMOTE_CONFIG.news] };
      }

      const data = snapshot.data() as Partial<RemoteConfigDocument>;

      return {
        ...DEFAULT_REMOTE_CONFIG,
        ...data,
        news: data.news ? [...data.news] : [...DEFAULT_REMOTE_CONFIG.news]
      };
    } catch (error) {
      this.logger.logError('[RemoteConfigService] Remote config load failed, using default config', error);
      return { ...DEFAULT_REMOTE_CONFIG, news: [...DEFAULT_REMOTE_CONFIG.news] };
    }
  }
}
