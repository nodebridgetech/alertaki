import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  Share,
  Vibration,
  BackHandler,
} from 'react-native';
import notifee from '@notifee/react-native';
import { Avatar } from './Avatar';

const EMERGENCY_NUMBERS = { SAMU: '192', POLICE: '190' } as const;

const COLORS = {
  white: '#FFFFFF',
  primaryText: '#212121',
  secondaryText: '#757575',
  accent: '#FF4444',
  backgroundSecondary: '#F5F5F5',
  error: '#F44336',
};

const ALERT_COLORS: Record<string, { primary: string }> = {
  health: { primary: '#FF4444' },
  security: { primary: '#4444FF' },
  custom: { primary: '#8800FF' },
};

const VIBRATION_PATTERN = [1, 1000, 500, 1000, 500, 1000];

interface FullScreenAlertProps {
  notification?: {
    id?: string;
    data?: Record<string, string>;
  };
}

/**
 * Standalone full-screen alert rendered inside NotifeeFullScreenActivity.
 * Runs in a separate React Native instance — no navigation or stores available.
 */
export function FullScreenAlert({ notification }: FullScreenAlertProps): React.JSX.Element {
  const data = notification?.data || {};
  const alertType = data.type || '';
  const userName = data.userName || 'Usuário';
  const userPhotoURL = data.userPhotoURL || '';
  const address = data.address || 'Endereço indisponível';
  const lat = data.lat || '';
  const lng = data.lng || '';
  const customMessage = data.customMessage || '';

  useEffect(() => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(VIBRATION_PATTERN, true);
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleDismiss();
      return true;
    });

    return () => {
      Vibration.cancel();
      backHandler.remove();
    };
  }, []);

  const titleMap: Record<string, string> = {
    health: 'ALERTA DE SAÚDE',
    security: 'ALERTA DE SEGURANÇA',
    custom: 'ALERTA DE EMERGÊNCIA',
  };

  const accentColor = ALERT_COLORS[alertType]?.primary || COLORS.accent;

  async function handleDismiss() {
    Vibration.cancel();
    await notifee.cancelAllNotifications();
  }

  function shareAddress() {
    const displayAddress = address || `${lat}, ${lng}`;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Share.share({
      message: `${userName} enviou um alerta!\n${displayAddress}\n${mapsUrl}`,
    });
  }

  function openMaps() {
    const urls = Platform.select({
      ios: [
        `waze://?ll=${lat},${lng}&navigate=yes`,
        `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
        `maps://?daddr=${lat},${lng}`,
      ],
      android: [
        `waze://?ll=${lat},${lng}&navigate=yes`,
        `google.navigation:q=${lat},${lng}`,
      ],
      default: [],
    });

    async function tryOpen(urlList: string[]) {
      for (const url of urlList) {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return;
        }
      }
      await Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      );
    }

    tryOpen(urls);
  }

  return (
    <View style={[styles.container, { backgroundColor: accentColor }]}>
      <Text style={styles.title}>{titleMap[alertType] || 'ALERTA'}</Text>

      <View style={styles.card}>
        <View style={styles.userInfo}>
          <Avatar photoURL={userPhotoURL} name={userName} size={64} />
          <Text style={styles.userName}>{userName}</Text>
        </View>

        <TouchableOpacity onPress={shareAddress}>
          <Text style={styles.address}>{address}</Text>
          <Text style={styles.shareHint}>Toque para compartilhar</Text>
        </TouchableOpacity>

        {alertType === 'custom' && customMessage ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>"{customMessage}"</Text>
          </View>
        ) : null}

        {alertType === 'health' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: ALERT_COLORS.health.primary }]}
            onPress={() => Linking.openURL(`tel:${EMERGENCY_NUMBERS.SAMU}`)}
          >
            <Text style={styles.actionButtonText}>
              Ligar SAMU ({EMERGENCY_NUMBERS.SAMU})
            </Text>
          </TouchableOpacity>
        )}

        {alertType === 'security' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: ALERT_COLORS.security.primary }]}
            onPress={() => Linking.openURL(`tel:${EMERGENCY_NUMBERS.POLICE}`)}
          >
            <Text style={styles.actionButtonText}>
              Ligar Polícia ({EMERGENCY_NUMBERS.POLICE})
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.mapButton} onPress={openMaps}>
          <Text style={styles.mapButtonText}>Abrir no Mapa</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
          <Text style={styles.dismissButtonText}>Dispensar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryText,
  },
  address: {
    fontSize: 14,
    color: COLORS.secondaryText,
    textAlign: 'center',
  },
  shareHint: {
    fontSize: 11,
    color: COLORS.accent,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  messageBox: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  messageText: {
    fontSize: 16,
    color: COLORS.primaryText,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  actionButton: {
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  mapButton: {
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    marginBottom: 10,
  },
  mapButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  dismissButton: {
    padding: 14,
    width: '100%',
    alignItems: 'center',
  },
  dismissButtonText: {
    color: COLORS.secondaryText,
    fontSize: 16,
  },
});
