import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { GPS_TIMEOUT } from '../config/constants';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    return status === 'granted';
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Permissão de Localização',
      message: 'O Alertaki precisa da sua localização para enviar alertas de emergência.',
      buttonPositive: 'Permitir',
      buttonNegative: 'Negar',
    },
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

async function requestBackgroundPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('always');
    return status === 'granted';
  }

  if (Platform.OS === 'android' && Platform.Version >= 29) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      {
        title: 'Localização em Segundo Plano',
        message:
          'O Alertaki precisa acessar sua localização em segundo plano para que pessoas próximas possam receber seus alertas.',
        buttonPositive: 'Permitir',
        buttonNegative: 'Negar',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  return true;
}

function getCurrentPosition(): Promise<LocationCoords> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      async (error) => {
        // Tentar fallback para última localização conhecida do Firestore
        if (error.code === 2 || error.code === 3) {
          try {
            const fallback = await getLastKnownLocation();
            if (fallback) {
              resolve(fallback);
              return;
            }
          } catch {
            // Fallback falhou, continua com o erro original
          }
        }

        switch (error.code) {
          case 1:
            reject(
              new Error('Permissão de localização negada. Ative nas configurações do dispositivo.'),
            );
            break;
          case 2:
            reject(new Error('GPS desabilitado. Ative a localização nas configurações.'));
            break;
          case 3:
            reject(new Error('Não foi possível obter sua localização. Tente novamente.'));
            break;
          default:
            reject(new Error('Erro ao obter localização.'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: GPS_TIMEOUT,
        maximumAge: 10000,
      },
    );
  });
}

async function getLastKnownLocation(): Promise<LocationCoords | null> {
  const uid = auth().currentUser?.uid;
  if (!uid) return null;

  const doc = await firestore().collection('users').doc(uid).get();
  const data = doc.data();
  if (data?.lastLocation) {
    return {
      latitude: data.lastLocation.lat,
      longitude: data.lastLocation.lng,
    };
  }
  return null;
}

function showLocationSettingsAlert(): void {
  Alert.alert(
    'Localização Desabilitada',
    'Ative a localização nas configurações do dispositivo para enviar alertas.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Configurações',
        onPress: () => {
          if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:').catch(() => {});
          } else if (typeof Linking.sendIntent === 'function') {
            Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => {
              Linking.openSettings().catch(() => {});
            });
          } else {
            Linking.openSettings().catch(() => {});
          }
        },
      },
    ],
  );
}

export const locationService = {
  requestPermission,
  requestBackgroundPermission,
  getCurrentPosition,
  getLastKnownLocation,
  showLocationSettingsAlert,
};
