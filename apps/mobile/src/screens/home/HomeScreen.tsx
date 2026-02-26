import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EMERGENCY_NUMBERS } from '@alertaki/shared';
import { useAuthStore } from '../../stores/authStore';
import { useContactStore } from '../../stores/contactStore';
import { alertService } from '../../services/alertService';
import { locationService } from '../../services/locationService';
import { Avatar } from '../../components/Avatar';
import { ALERT_COLORS, COLORS } from '../../config/constants';
import { isOnline } from '../../utils/network';
import { canSendAlert, markAlertSent, getRemainingCooldown } from '../../utils/rateLimit';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<Record<string, undefined>>;
};

export function HomeScreen({ navigation }: HomeScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [sending, setSending] = useState(false);
  const user = useAuthStore((s) => s.user);
  const contacts = useContactStore((s) => s.contacts);
  const pendingInvites = useContactStore((s) => s.pendingInvites);

  async function sendAlert(type: 'health' | 'security') {
    if (!user) return;

    if (!canSendAlert()) {
      Alert.alert('Aguarde', `Você poderá enviar outro alerta em ${getRemainingCooldown()} segundos.`);
      return;
    }

    const typeLabel = type === 'health' ? 'saúde' : 'segurança';
    const emergencyNumber = type === 'health' ? EMERGENCY_NUMBERS.SAMU : EMERGENCY_NUMBERS.POLICE;

    Alert.alert(
      `Alerta de ${typeLabel}`,
      `Tem certeza que deseja enviar um alerta de ${typeLabel}? Seus contatos e pessoas próximas serão notificados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            setSending(true);
            let step = 'init';
            try {
              step = 'isOnline';
              const online = await isOnline();
              if (!online) {
                Alert.alert(
                  'Sem Conexão',
                  'Você está sem internet. Verifique sua conexão e tente novamente.',
                );
                return;
              }

              step = 'requestPermission';
              const permission = await locationService.requestPermission();
              if (!permission) {
                locationService.showLocationSettingsAlert();
                return;
              }

              step = 'getCurrentPosition';
              const coords = await locationService.getCurrentPosition();

              step = 'createAlert';
              await alertService.createAlert({
                userId: user.uid,
                userName: user.displayName,
                userEmail: user.email,
                userPhotoURL: user.photoURL,
                type,
                lat: coords.latitude,
                lng: coords.longitude,
              });

              markAlertSent();

              Alert.alert('Sucesso', `Alerta de ${typeLabel} enviado!`, [
                {
                  text: 'OK',
                  onPress: () => {
                    Linking.openURL(`tel:${emergencyNumber}`).catch(() => {});
                  },
                },
              ]);
            } catch (error) {
              const err = error as Error;
              console.error(`sendAlert error at [${step}]:`, err.message, err.stack);
              Alert.alert(
                'Erro',
                `[${step}] ${err.message || String(error)}\n\n${err.stack?.split('\n').slice(0, 5).join('\n') || 'sem stack'}`,
              );
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <Avatar photoURL={user?.photoURL} name={user?.displayName} size={40} />
          <View style={styles.headerInfo}>
            <Text style={styles.greeting}>{getGreeting()}, {user?.displayName?.split(' ')[0] || 'Usuário'}!</Text>
            <Text style={styles.contactCount}>
              {contacts.length} {contacts.length === 1 ? 'contato' : 'contatos'} protegidos
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => navigation.navigate('Invites')}
          accessibilityLabel={`Convites pendentes${pendingInvites.length > 0 ? `, ${pendingInvites.length} novos` : ''}`}
          accessibilityRole="button"
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {pendingInvites.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingInvites.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {sending && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.loadingText}>Enviando alerta...</Text>
        </View>
      )}

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          onPress={() => sendAlert('health')}
          disabled={sending}
          accessibilityLabel="Alerta de saúde. Alertar contatos e pessoas próximas"
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={ALERT_COLORS.health.gradient as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.alertButton}
          >
            <Text style={styles.alertButtonTitle}>Saúde</Text>
            <Text style={styles.alertButtonSubtitle}>Alertar contatos e pessoas próximas</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => sendAlert('security')}
          disabled={sending}
          accessibilityLabel="Alerta de segurança. Alertar contatos e pessoas próximas"
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={ALERT_COLORS.security.gradient as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.alertButton}
          >
            <Text style={styles.alertButtonTitle}>Segurança</Text>
            <Text style={styles.alertButtonSubtitle}>Alertar contatos e pessoas próximas</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Emergency')}
          disabled={sending}
          accessibilityLabel="Alerta de emergência. Alertar contatos selecionados"
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={ALERT_COLORS.custom.gradient as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.alertButton}
          >
            <Text style={styles.alertButtonTitle}>Emergência</Text>
            <Text style={styles.alertButtonSubtitle}>Alertar contatos selecionados</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryText,
  },
  contactCount: {
    fontSize: 13,
    color: COLORS.secondaryText,
    marginTop: 2,
  },
  bellButton: {
    padding: 8,
    position: 'relative',
  },
  bellIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  buttonsContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  alertButton: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  alertButtonTitle: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: 'bold',
  },
  alertButtonSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 18,
    marginTop: 12,
  },
});
