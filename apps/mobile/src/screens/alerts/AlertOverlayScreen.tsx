import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform, Alert } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EMERGENCY_NUMBERS } from '@alertaki/shared';
import { useAuthStore } from '../../stores/authStore';
import { contactService } from '../../services/contactService';
import { notificationService } from '../../services/notificationService';
import { COLORS, ALERT_COLORS } from '../../config/constants';

type AlertData = {
  alertId: string;
  type: string;
  userId: string;
  userName: string;
  userPhotoURL: string;
  lat: string;
  lng: string;
  address: string;
  customMessage: string;
};

type AlertOverlayScreenProps = {
  route: RouteProp<{ AlertOverlay: { alertData: AlertData } }, 'AlertOverlay'>;
  navigation: NativeStackNavigationProp<Record<string, undefined>>;
};

export function AlertOverlayScreen({
  route,
  navigation,
}: AlertOverlayScreenProps): React.JSX.Element {
  const { alertData } = route.params;
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    notificationService.startContinuousVibration();
    return () => {
      notificationService.stopVibration();
    };
  }, []);

  const titleMap: Record<string, string> = {
    health: 'ALERTA DE SAÚDE',
    security: 'ALERTA DE SEGURANÇA',
    custom: 'ALERTA DE EMERGÊNCIA',
  };

  const colorMap: Record<string, string> = {
    health: ALERT_COLORS.health.primary,
    security: ALERT_COLORS.security.primary,
    custom: ALERT_COLORS.custom.primary,
  };

  function openMaps() {
    const lat = alertData.lat;
    const lng = alertData.lng;

    const urls = Platform.select({
      ios: [
        `waze://?ll=${lat},${lng}&navigate=yes`,
        `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
        `maps://?daddr=${lat},${lng}`,
      ],
      android: [`waze://?ll=${lat},${lng}&navigate=yes`, `google.navigation:q=${lat},${lng}`],
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
      // Fallback to browser
      await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    }

    tryOpen(urls);
  }

  function handleBlock() {
    if (!user) return;

    Alert.alert(
      'Bloquear Usuário',
      `Deseja bloquear ${alertData.userName}? Você não receberá mais alertas desta pessoa.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            try {
              await contactService.blockUser(user.uid, {
                uid: alertData.userId,
                displayName: alertData.userName,
                email: '',
                photoURL: alertData.userPhotoURL || null,
              });
              Alert.alert('Sucesso', 'Usuário bloqueado.');
            } catch (error) {
              Alert.alert('Erro', (error as Error).message);
            }
          },
        },
      ],
    );
  }

  async function handleDismiss() {
    await notificationService.dismissAlertNotification();
    navigation.goBack();
  }

  const accentColor = colorMap[alertData.type] || COLORS.accent;

  return (
    <View style={[styles.container, { backgroundColor: accentColor }]}>
      <Text style={styles.title}>{titleMap[alertData.type] || 'ALERTA'}</Text>

      <View style={styles.card}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {alertData.userName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.userName}>{alertData.userName}</Text>
        </View>

        <Text style={styles.address}>{alertData.address || 'Endereço indisponível'}</Text>

        {alertData.type === 'custom' && alertData.customMessage ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>"{alertData.customMessage}"</Text>
          </View>
        ) : null}

        {alertData.type === 'health' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: ALERT_COLORS.health.primary }]}
            onPress={() => Linking.openURL(`tel:${EMERGENCY_NUMBERS.SAMU}`)}
          >
            <Text style={styles.actionButtonText}>Ligar SAMU ({EMERGENCY_NUMBERS.SAMU})</Text>
          </TouchableOpacity>
        )}

        {alertData.type === 'security' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: ALERT_COLORS.security.primary }]}
            onPress={() => Linking.openURL(`tel:${EMERGENCY_NUMBERS.POLICE}`)}
          >
            <Text style={styles.actionButtonText}>Ligar Polícia ({EMERGENCY_NUMBERS.POLICE})</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.mapButton} onPress={openMaps}>
          <Text style={styles.mapButtonText}>Abrir no Mapa</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.blockButton} onPress={handleBlock}>
          <Text style={styles.blockButtonText}>Bloquear Usuário</Text>
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
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: 'bold',
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
  blockButton: {
    borderRadius: 12,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
    marginBottom: 10,
  },
  blockButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
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
