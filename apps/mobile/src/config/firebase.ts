import firebase from '@react-native-firebase/app';

// Firebase is auto-initialized via google-services.json (Android)
// and GoogleService-Info.plist (iOS).
// This file exports the app instance for convenience.

export const firebaseApp = firebase.app();
