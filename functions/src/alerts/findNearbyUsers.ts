import { distanceBetween, geohashQueryBounds } from 'geofire-common';

// O raio é definido aqui, não pelo app: versões antigas e clientes adulterados não conseguem ampliá-lo.
const PROXIMITY_RADIUS_KM = 2;

export async function findNearbyUsers(
  db: FirebaseFirestore.Firestore,
  lat: number,
  lng: number,
): Promise<string[]> {
  const center: [number, number] = [lat, lng];
  const bounds = geohashQueryBounds(center, PROXIMITY_RADIUS_KM * 1000);

  const snapshots = await Promise.all(
    bounds.map(([start, end]) =>
      db
        .collection('users')
        .orderBy('lastLocation.geohash')
        .startAt(start)
        .endAt(end)
        .get(),
    ),
  );

  const nearbyUids = new Set<string>();
  for (const snapshot of snapshots) {
    for (const doc of snapshot.docs) {
      const { lat: userLat, lng: userLng } = doc.data().lastLocation;
      if (distanceBetween([userLat, userLng], center) <= PROXIMITY_RADIUS_KM) {
        nearbyUids.add(doc.id);
      }
    }
  }
  return [...nearbyUids];
}
