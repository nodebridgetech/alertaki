import { useEffect } from 'react';
import { Platform } from 'react-native';
import BackgroundFetch from 'react-native-background-fetch';
import { runBackgroundLocationTask } from '../services/backgroundLocationTask';

export function useBackgroundLocation(): void {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    BackgroundFetch.configure(
      {
        minimumFetchInterval: 60,
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
      },
      (taskId) => runBackgroundLocationTask({ taskId, timeout: false }),
      (taskId) => runBackgroundLocationTask({ taskId, timeout: true }),
    );
  }, []);
}
