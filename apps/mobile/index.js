/**
 * @format
 */

import { AppRegistry } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import App from './src/App';
import { FullScreenAlert } from './src/components/FullScreenAlert';
import { name as appName } from './app.json';

// Notifee background event handler — must be registered outside component.
// Handles notification taps and full-screen intent interactions when app is
// in background or terminated.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification } = detail;
  if (
    (type === EventType.PRESS || type === EventType.ACTION_PRESS) &&
    notification
  ) {
    // Cancel notifications and let the app handle navigation when it opens
    await notifee.cancelAllNotifications();
  }
});

// Register full-screen alert component for Notifee's NotifeeFullScreenActivity.
// This renders inside a separate activity when the full-screen intent fires
// (device locked / screen off), independent of the main app lifecycle.
AppRegistry.registerComponent('full-screen-alert', () => FullScreenAlert);

AppRegistry.registerComponent(appName, () => App);
