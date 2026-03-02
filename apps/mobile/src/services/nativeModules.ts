import { NativeModules, Platform } from 'react-native';

const AlertAudio = Platform.OS === 'android' ? NativeModules.AlertAudio : null;
const Torch = Platform.OS === 'android' ? NativeModules.Torch : null;

export function startAlertSound(): void {
  AlertAudio?.startAlertSound();
}

export function stopAlertSound(): void {
  AlertAudio?.stopAlertSound();
}

export function startStrobe(): void {
  Torch?.startStrobe();
}

export function stopStrobe(): void {
  Torch?.stopStrobe();
}
