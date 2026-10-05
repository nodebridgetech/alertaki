import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldSendLocation } from '../src/services/locationThrottle.ts';

const KM_PER_LAT_DEGREE = 111.32;
const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 4, 12);
const HOME = { lat: -23.5505, lng: -46.6333 };

function movedNorth(km: number) {
  return { lat: HOME.lat + km / KM_PER_LAT_DEGREE, lng: HOME.lng };
}

test('envia quando nunca enviou antes', () => {
  assert.equal(shouldSendLocation(null, HOME, NOW), true);
});

test('envia quando andou 600 m desde o último envio', () => {
  const last = { ...HOME, sentAt: NOW - HOUR };
  assert.equal(shouldSendLocation(last, movedNorth(0.6), NOW), true);
});

test('não envia quando andou só 100 m há 1 hora', () => {
  const last = { ...HOME, sentAt: NOW - HOUR };
  assert.equal(shouldSendLocation(last, movedNorth(0.1), NOW), false);
});

test('envia quando está parado mas o último envio tem 6 horas', () => {
  const last = { ...HOME, sentAt: NOW - 6 * HOUR };
  assert.equal(shouldSendLocation(last, HOME, NOW), true);
});

test('não envia quando está parado e o último envio tem 5h59', () => {
  const last = { ...HOME, sentAt: NOW - 6 * HOUR + 60 * 1000 };
  assert.equal(shouldSendLocation(last, HOME, NOW), false);
});
