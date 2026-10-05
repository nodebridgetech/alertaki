import { distanceBetween } from 'geofire-common';

const MIN_DISTANCE_KM = 0.5;
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export interface SentLocation {
  lat: number;
  lng: number;
  sentAt: number;
}

export function shouldSendLocation(
  last: SentLocation | null,
  current: { lat: number; lng: number },
  now: number,
): boolean {
  if (!last) return true;
  if (now - last.sentAt >= MAX_AGE_MS) return true;
  return distanceBetween([last.lat, last.lng], [current.lat, current.lng]) > MIN_DISTANCE_KM;
}
