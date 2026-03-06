import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform, Alert, Share, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EMERGENCY_NUMBERS } from '@alertaki/shared';
import { Avatar } from '../../components/Avatar';
import { useAuthStore } from '../../stores/authStore';
import { contactService } from '../../services/contactService';
import { notificationService } from '../../services/notificationService';
import { preferencesService } from '../../services/preferencesService';
import { startAlertSound, stopAlertSound, startStrobe, stopStrobe } from '../../services/nativeModules';
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
  const alertData = route.params?.alertData;
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();

  if (!alertData) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Dados do alerta indisponíveis</Text>
        <TouchableOpacity style={styles.dismissButton} onPress={() => navigation.goBack()}>
          <Text style={styles.dismissButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  useEffect(() => {
    preferencesService.getPreferences().then((prefs) => {
      if (prefs.vibration) {
        notificationService.startContinuousVibration();
      }
      if (prefs.sound) {
        startAlertSound();
      }
      if (prefs.flashlight) {
        startStrobe();
      }
    });

    // No cleanup here — sound/vibration/strobe continue if user leaves screen
    // They are only stopped when user taps "Dispensar" via dismissAlertNotification()
    return () => {};
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

  function shareAddress() {
    const address = alertData.address || `${alertData.lat}, ${alertData.lng}`;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${alertData.lat},${alertData.lng}`;
    Share.share({
      message: `${alertData.userName} enviou um alerta!\n${address}\n${mapsUrl}`,
    });
  }

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
              Alert.alert(
                'Sucesso',
                'Usuário bloqueado. Você não receberá mais alertas desta pessoa.',
                [{
                  text: 'OK',
                  onPress: async () => {
                    await notificationService.dismissAlertNotification();
                    navigation.goBack();
                  },
                }],
              );
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

  const hasCoords = !!(alertData.lat && alertData.lng && parseFloat(alertData.lat) !== 0);
  const showMap = hasCoords && (alertData.type === 'health' || alertData.type === 'security');
  const MAPS_API_KEY = 'AIzaSyDicxkwzBkGneJLnl5LF4dB7VDaimmjxFk';
  const staticMapUrl = showMap
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${alertData.lat},${alertData.lng}&zoom=15&size=600x300&scale=2&markers=color:red%7C${alertData.lat},${alertData.lng}&key=${MAPS_API_KEY}`
    : null;

  return (
    <View style={[styles.container, { backgroundColor: accentColor, paddingTop: insets.top }]}>
      <Text style={styles.title}>{titleMap[alertData.type] || 'ALERTA'}</Text>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.userInfo}>
            <Avatar photoURL={alertData.userPhotoURL} name={alertData.userName} size={64} />
            <Text style={styles.userName}>{alertData.userName}</Text>
          </View>

          <TouchableOpacity onPress={shareAddress} accessibilityLabel="Compartilhar endereço" accessibilityRole="button">
            <Text style={styles.address}>{alertData.address || 'Endereço indisponível'}</Text>
            <Text style={styles.shareHint}>Toque para compartilhar</Text>
          </TouchableOpacity>

          {showMap && staticMapUrl && (
            <TouchableOpacity onPress={openMaps} activeOpacity={0.9} style={styles.mapPreviewContainer}>
              <Image
                source={{ uri: staticMapUrl }}
                style={styles.mapPreview}
                resizeMode="cover"
              />
              <Text style={styles.mapPreviewHint}>Toque para navegar</Text>
            </TouchableOpacity>
          )}

          {alertData.type === 'custom' && alertData.customMessage ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageLabel}>Mensagem:</Text>
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

          <TouchableOpacity style={styles.mapButton} onPress={openMaps} accessibilityLabel="Abrir localização no mapa" accessibilityRole="button">
            <Text style={styles.mapButtonText}>Abrir no Mapa</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.blockButton} onPress={handleBlock} accessibilityLabel={`Bloquear ${alertData.userName}`} accessibilityRole="button">
            <Text style={styles.blockButtonText}>Bloquear Usuário</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss} accessibilityLabel="Dispensar alerta" accessibilityRole="button">
            <Text style={styles.dismissButtonText}>Dispensar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 48,
    marginBottom: 16,
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
  mapPreviewContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapPreview: {
    width: '100%',
    height: 150,
  },
  mapPreviewHint: {
    fontSize: 11,
    color: COLORS.accent,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  messageBox: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 16,
  },
  messageLabel: {
    fontSize: 13,
    color: COLORS.secondaryText,
    marginBottom: 8,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 22,
    color: COLORS.primaryText,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 30,
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
