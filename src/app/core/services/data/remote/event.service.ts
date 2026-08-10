import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { LoggerService } from '../../infrastructure/logging/logger.service';
import { TimeService } from '../../utils/time.service';
import { GameEvent } from '../../../models/remote/event.model';
import { getActiveGameEvents } from '../../utils/availability/game-event-availability.util';



@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly firestore = inject(Firestore);
  private readonly logger = inject(LoggerService);
  private readonly timeService = inject(TimeService);

  // 🔥 cache
  private eventsCache: GameEvent[] | null = null;
  private eventsPromise: Promise<GameEvent[]> | null = null;

  async getActiveEvents(forceRefresh = false): Promise<GameEvent[]> {
    await this.timeService.sync(forceRefresh);

    if (this.eventsCache && !forceRefresh) {
		this.logger.logDebug('[EventService]: Return cached events');
      return this.eventsCache;
    }

    // 🔥 se già in caricamento, riusa la promise
    if (this.eventsPromise && !forceRefresh) {
		this.logger.logDebug('[EventService]: Await ongoing events load');
      return this.eventsPromise;
    }

    this.logger.logDebug('[EventService]: Load events from Firestore');

    this.eventsPromise = (async () => {
      try {
        const ref = collection(this.firestore, 'events');
        const snap = await getDocs(ref);

        const now = this.timeService.nowDate();
        const events = getActiveGameEvents(
          snap.docs.map(d => ({ id: d.id, ...d.data() } as GameEvent)),
          now
        );

        this.logger.logDebug('[EventService]: Events load OK', events);

        this.eventsCache = events;
        return events;
      } finally {
        // Evita promise cache "bloccata" in caso di errore.
        this.eventsPromise = null;
      }
    })();

    return this.eventsPromise;
  }

  // 🔄 opzionale: reset cache manuale
  clearCache() {
    this.eventsCache = null;
  }
}
