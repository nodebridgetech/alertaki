const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { geohashForLocation } = require('geofire-common');
const { findNearbyUsers } = require('../lib/alerts/findNearbyUsers');

const PROJECT_ID = 'demo-alertaki';
const KM_PER_LAT_DEGREE = 111.32;
const ALERT = { lat: -23.5505, lng: -46.6333 };

initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

function northOfAlert(km) {
  return { lat: ALERT.lat + km / KM_PER_LAT_DEGREE, lng: ALERT.lng };
}

function userAt(uid, { lat, lng }, updatedAt = new Date()) {
  return db.collection('users').doc(uid).set({
    lastLocation: { lat, lng, geohash: geohashForLocation([lat, lng]) },
    locationUpdatedAt: updatedAt,
  });
}

beforeEach(async () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  await fetch(
    `http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
});

test('encontra quem está a 1 km do alerta', async () => {
  await userAt('perto', northOfAlert(1));

  const uids = await findNearbyUsers(db, ALERT.lat, ALERT.lng);

  assert.deepEqual(uids, ['perto']);
});

test('ignora quem está a 3 km do alerta', async () => {
  await userAt('longe', northOfAlert(3));

  const uids = await findNearbyUsers(db, ALERT.lat, ALERT.lng);

  assert.deepEqual(uids, []);
});

test('o raio é de 2 km: 1,9 km entra e 2,1 km fica de fora', async () => {
  await userAt('dentro', northOfAlert(1.9));
  await userAt('fora', northOfAlert(2.1));

  const uids = await findNearbyUsers(db, ALERT.lat, ALERT.lng);

  assert.deepEqual(uids, ['dentro']);
});

test('encontra quem está perto mesmo com 600 pessoas longe atualizando a localização depois', async () => {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  await userAt('perto-parado', northOfAlert(1), sixHoursAgo);

  const batch = db.batch();
  for (let i = 0; i < 600; i++) {
    const { lat, lng } = northOfAlert(50 + i * 0.1);
    batch.set(db.collection('users').doc(`longe-${i}`), {
      lastLocation: { lat, lng, geohash: geohashForLocation([lat, lng]) },
      locationUpdatedAt: new Date(),
    });
  }
  await batch.commit();

  const uids = await findNearbyUsers(db, ALERT.lat, ALERT.lng);

  assert.deepEqual(uids, ['perto-parado']);
});

test('usuário que nunca enviou localização não quebra a busca', async () => {
  await db.collection('users').doc('sem-localizacao').set({ displayName: 'Ana' });
  await userAt('perto', northOfAlert(1));

  const uids = await findNearbyUsers(db, ALERT.lat, ALERT.lng);

  assert.deepEqual(uids, ['perto']);
});
