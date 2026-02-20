import { useEffect } from 'react';
import BackgroundFetch from 'react-native-background-fetch';
import { locationService } from '../services/locationService';
import { userService } from '../services/userService';
import auth from '@react-native-firebase/auth';

export function useBackgroundLocation(): void {
  useEffect(() => {
    async function initBackgroundFetch() {
      const hasPermission = await locationService.requestBackgroundPermission();
      if (!hasPermission) return;

      await BackgroundFetch.configure(
        {
          minimumFetchInterval: 60, // minutes
          stopOnTerminate: false,
          startOnBoot: true,
          enableHeadless: true,
        },
        async (taskId) => {
          try {
            const uid = auth().currentUser?.uid;
            if (uid) {
              const coords = await locationService.getCurrentPosition();
              await userService.updateLocation(uid, coords.latitude, coords.longitude);
            }
          } catch {
            // Background location update failed silently
          }
          BackgroundFetch.finish(taskId);
        },
        async (taskId) => {
          // Task timeout handler
          BackgroundFetch.finish(taskId);
        },
      );
    }

    initBackgroundFetch();
  }, []);
}
