import { GameEvent, resolveEventAvailability } from '../../../models/remote/event.model';
import { isAvailableNow } from './availability.util';

export function getActiveGameEvents(events: GameEvent[], now: Date): GameEvent[] {
  return events
    .filter(event => event.enabled && isAvailableNow(resolveEventAvailability(event), now))
    .sort((a, b) => b.priority - a.priority);
}
