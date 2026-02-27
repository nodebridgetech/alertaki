import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';
import { COLORS } from '../../config/constants';

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureCheck}>✓</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

export function PaywallScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { isPurchasing, availableProducts, error, purchase, loadProducts, restorePurchases } =
    useSubscriptionStore();
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function handlePurchase() {
    try {
      await purchase();
    } catch {
      Alert.alert('Erro', 'Não foi possível iniciar a compra.');
    }
  }

  async function handleRestore() {
    if (!user?.uid) return;
    setRestoring(true);
    try {
      await restorePurchases(user.uid);
    } catch {
      Alert.alert('Erro', 'Não foi possível restaurar compras.');
    } finally {
      setRestoring(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.signOut();
            useAuthStore.getState().reset();
          } catch {
            Alert.alert('Erro', 'Não foi possível sair.');
          }
        },
      },
    ]);
  }

  const priceText =
    availableProducts.length > 0
      ? availableProducts[0].localizedPrice || 'R$ 1,97'
      : 'R$ 1,97';

  return (
    <LinearGradient
      colors={['#FF4444', '#FF8800']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Image source={require('../../assets/bell.png')} style={styles.bellImage} />
        <Text style={styles.logo}>Alertaki</Text>
        <Text style={styles.title}>Assine para continuar</Text>
        <Text style={styles.subtitle}>
          Para usar o Alertaki, você precisa de uma assinatura ativa.
        </Text>

        <View style={styles.features}>
          <FeatureItem text="Alertas ilimitados de saúde e segurança" />
          <FeatureItem text="Notificações em tempo real para seus contatos" />
          <FeatureItem text="Localização automática via GPS" />
          <FeatureItem text="Ligação direta para serviços de emergência" />
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Assinatura mensal</Text>
          <Text style={styles.price}>{priceText}/mês</Text>
        </View>

        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={handlePurchase}
          disabled={isPurchasing}
        >
          {isPurchasing ? (
            <ActivityIndicator color={COLORS.accent} />
          ) : (
            <Text style={styles.purchaseButtonText}>Assinar agora</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={restoring}
        >
          <Text style={styles.restoreButtonText}>
            {restoring ? 'Restaurando...' : 'Restaurar compras'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair da conta</Text>
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  bellImage: {
    width: 80,
    height: 80,
    alignSelf: 'center',
  },
  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 8,
  },
  features: {
    marginTop: 32,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureCheck: {
    fontSize: 18,
    color: COLORS.white,
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 16,
    color: COLORS.white,
    flex: 1,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 4,
  },
  purchaseButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseButtonText: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: 'bold',
  },
  restoreButton: {
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  restoreButtonText: {
    color: COLORS.white,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  logoutButton: {
    padding: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  errorText: {
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 12,
  },
});
