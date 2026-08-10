import { AvailabilityStatus, AvailabilityWindow } from "../../../models/remote/event.model";

export function isAvailableNow(window: AvailabilityWindow | undefined, now: Date = new Date()): boolean {
  if (!window) {
    return true;
  }

  const start = parseDate(window.startAt);
  if (start && now < start) {
    return false;
  }

  const end = parseDate(window.endAt);
  if (end && now > end) {
    return false;
  }

  const weekdays = sanitizeValues(window.weekdays, 0, 6);
  if (weekdays.length > 0 && !weekdays.includes(now.getDay())) {
    return false;
  }

  const weeksOfYear = sanitizeValues(window.weeksOfYear, 1, 53);
  if (weeksOfYear.length > 0) {
    const weekNumber = getIsoWeekNumber(now);
    if (!weeksOfYear.includes(weekNumber)) {
      return false;
    }
  }

  return true;
}

export function getAvailabilityStatus(window: AvailabilityWindow | undefined, now: Date = new Date()): AvailabilityStatus {
  if (!window) {
    return 'active';
  }

  const start = parseDate(window.startAt);
  if (start && now < start) {
    return 'upcoming';
  }

  const end = parseDate(window.endAt);
  if (end && now > end) {
    return 'past';
  }

  return isAvailableNow(window, now) ? 'active' : 'upcoming';
}

function parseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sanitizeValues(values: number[] | undefined, min: number, max: number): number[] {
  if (!values || values.length === 0) {
    return [];
  }

  const filtered = values
    .filter((value) => Number.isInteger(value) && value >= min && value <= max);

  return [...new Set(filtered)];
}

function getIsoWeekNumber(date: Date): number {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return Math.ceil((((copy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
