import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { isOnline } from '../utils/network';

const CHECK_INTERVAL = 15000; // 15 seconds

export function useNetworkStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    function startChecking() {
      isOnline().then(setOnline);
      interval = setInterval(() => {
        isOnline().then(setOnline);
      }, CHECK_INTERVAL);
    }

    function stopChecking() {
      clearInterval(interval);
    }

    startChecking();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        isOnline().then(setOnline);
        startChecking();
      } else {
        stopChecking();
      }
    });

    return () => {
      stopChecking();
      subscription.remove();
    };
  }, []);

  return online;
}
