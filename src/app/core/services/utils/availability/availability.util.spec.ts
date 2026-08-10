import { getAvailabilityStatus, isAvailableNow } from './availability.util';
import { AvailabilityWindow } from '../../../models/remote/event.model';

describe('availability utilities', () => {
  const now = new Date('2026-06-17T12:00:00.000Z');

  it('marks a window as active when now is between startAt and endAt', () => {
    const availability: AvailabilityWindow = {
      startAt: '2026-06-17T00:00:00.000Z',
      endAt: '2026-06-18T00:00:00.000Z'
    };

    expect(isAvailableNow(availability, now)).toBeTrue();
    expect(getAvailabilityStatus(availability, now)).toBe('active');
  });

  it('marks a future window as upcoming', () => {
    const availability: AvailabilityWindow = {
      startAt: '2026-06-18T00:00:00.000Z',
      endAt: '2026-06-19T00:00:00.000Z'
    };

    expect(isAvailableNow(availability, now)).toBeFalse();
    expect(getAvailabilityStatus(availability, now)).toBe('upcoming');
  });

  it('marks an expired window as past', () => {
    const availability: AvailabilityWindow = {
      startAt: '2026-06-15T00:00:00.000Z',
      endAt: '2026-06-16T00:00:00.000Z'
    };

    expect(isAvailableNow(availability, now)).toBeFalse();
    expect(getAvailabilityStatus(availability, now)).toBe('past');
  });

  it('supports weekdays and ISO weeks of year', () => {
    const availability: AvailabilityWindow = {
      weekdays: [3],
      weeksOfYear: [25]
    };

    expect(isAvailableNow(availability, now)).toBeTrue();
    expect(isAvailableNow({ ...availability, weekdays: [4] }, now)).toBeFalse();
    expect(isAvailableNow({ ...availability, weeksOfYear: [26] }, now)).toBeFalse();
  });
});
