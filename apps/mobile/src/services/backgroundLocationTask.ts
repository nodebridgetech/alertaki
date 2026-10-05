import BackgroundFetch, { type HeadlessEvent } from 'react-native-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { locationService } from './locationService';
import { userService } from './userService';
import { shouldSendLocation, type SentLocation } from './locationThrottle';

async function sendLocationIfNeeded(): Promise<void> {
  const uid = auth().currentUser?.uid;
  if (!uid) return;
  if (!(await locationService.isBackgroundLocationGranted())) return;

  const lastSentKey = `@lastSentLocation:${uid}`;
  const { latitude: lat, longitude: lng } = await locationService.getCurrentPosition();
  const stored = await AsyncStorage.getItem(lastSentKey);
  const last: SentLocation | null = stored ? JSON.parse(stored) : null;
  const now = Date.now();
  if (!shouldSendLocation(last, { lat, lng }, now)) return;

  await userService.updateLocation(uid, lat, lng);
  await AsyncStorage.setItem(lastSentKey, JSON.stringify({ lat, lng, sentAt: now }));
}

export async function runBackgroundLocationTask({ taskId, timeout }: HeadlessEvent): Promise<void> {
  if (!timeout) {
    try {
      await sendLocationIfNeeded();
    } catch (error) {
      console.warn('Background location update failed:', error);
    }
  }
  BackgroundFetch.finish(taskId);
}
