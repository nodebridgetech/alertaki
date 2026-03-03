import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import type { AlertPreferences } from '@alertaki/shared';

const PREFS_KEY = 'alertPreferences';

const DEFAULT_PREFS: AlertPreferences = {
  sound: true,
  vibration: true,
  flashlight: true,
  receiveProximityAlerts: false,
};

async function getPreferences(): Promise<AlertPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    // Fall back to defaults
  }
  return DEFAULT_PREFS;
}

async function savePreferences(uid: string, prefs: AlertPreferences): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  await firestore().collection('users').doc(uid).update({ alertPreferences: prefs });
}

async function syncFromFirestore(uid: string): Promise<AlertPreferences> {
  const doc = await firestore().collection('users').doc(uid).get();
  const prefs = doc.data()?.alertPreferences as AlertPreferences | null;
  const resolved = prefs ? { ...DEFAULT_PREFS, ...prefs } : DEFAULT_PREFS;
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(resolved));
  return resolved;
}

export const preferencesService = {
  getPreferences,
  savePreferences,
  syncFromFirestore,
  DEFAULT_PREFS,
};
