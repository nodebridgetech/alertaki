/**
 * @format
 */

import { AppRegistry } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from './src/App';
import { FullScreenAlert } from './src/components/FullScreenAlert';
import { name as appName } from './app.json';

const PENDING_NOTIFEE_KEY = '@pendingNotifeePress';

// SINGLE Notifee background event handler — must be registered outside component.
// Runs in a SEPARATE headless JS context on Android — module-level variables
// are NOT shared with the foreground JS, so we use AsyncStorage as a bridge.
// IMPORTANT: Only ONE onBackgroundEvent can be registered. Having multiple
// causes unpredictable behavior where only one fires.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (
    (type === EventType.PRESS || type === EventType.ACTION_PRESS) &&
    detail.notification?.data
  ) {
    // Save notification data to AsyncStorage so the foreground JS can read it
    // and navigate to the correct screen when the app opens
    await AsyncStorage.setItem(
      PENDING_NOTIFEE_KEY,
      JSON.stringify(detail.notification.data),
    );
    // Do NOT cancel notifications here — alert notifications are ongoing
    // and should only be dismissed by the user tapping "Dispensar"
  }
});

// Register full-screen alert component for Notifee's NotifeeFullScreenActivity.
// This renders inside a separate activity when the full-screen intent fires
// (device locked / screen off), independent of the main app lifecycle.
AppRegistry.registerComponent('full-screen-alert', () => FullScreenAlert);

AppRegistry.registerComponent(appName, () => App);
