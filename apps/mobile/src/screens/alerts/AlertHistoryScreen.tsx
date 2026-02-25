import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useAlertStore } from '../../stores/alertStore';
import type { Alert as AlertType } from '@alertaki/shared';
import { ReceivedAlertItem } from '../../services/alertService';
import LinearGradient from 'react-native-linear-gradient';
import { ALERT_COLORS, COLORS } from '../../config/constants';

const ALERT_TYPE_CONFIG: Record<string, { label: string; color: string; gradient: readonly string[]; icon: string }> = {
  health: { label: 'Alerta de Saúde', color: ALERT_COLORS.health.primary, gradient: ALERT_COLORS.health.gradient, icon: '❤️' },
  security: { label: 'Alerta de Segurança', color: ALERT_COLORS.security.primary, gradient: ALERT_COLORS.security.gradient, icon: '🛡️' },
  custom: { label: 'Alerta de Emergência', color: ALERT_COLORS.custom.primary, gradient: ALERT_COLORS.custom.gradient, icon: '🚨' },
};

function formatDate(timestamp: { seconds: number } | null): string {
  if (!timestamp) return '';
  const date = new Date(timestamp.seconds * 1000);
  return (
    date.toLocaleDateString('pt-BR') +
    ' ' +
    date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

export function AlertHistoryScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
  const user = useAuthStore((s) => s.user);
  const {
    sentAlerts,
    receivedAlerts,
    isLoading,
    isLoadingMore,
    sentHasMore,
    receivedHasMore,
    loadSentAlerts,
    loadMoreSentAlerts,
    loadReceivedAlerts,
    loadMoreReceivedAlerts,
  } = useAlertStore();

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadSentAlerts(user.uid);
        loadReceivedAlerts(user.uid);
      }
    }, [user, loadSentAlerts, loadReceivedAlerts]),
  );

  const renderSentItem = useCallback(({ item }: { item: AlertType }) => {
    const config = ALERT_TYPE_CONFIG[item.type] || { label: item.type, color: '#999', gradient: ['#999', '#666'], icon: '?' };
    return (
      <View style={[styles.card, { borderLeftColor: config.color }]}>
        <View style={styles.cardContent}>
          <LinearGradient
            colors={config.gradient as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <Text style={styles.iconText}>{config.icon}</Text>
          </LinearGradient>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{config.label}</Text>
            <Text style={styles.cardDetail}>
              Usuário: {item.userName || 'Desconhecido'}
            </Text>
            <Text style={styles.cardDetail}>
              Email: {item.userEmail || 'Indisponível'}
            </Text>
            <Text style={styles.cardDetail}>
              Local: {item.address || 'Endereço indisponível'}
            </Text>
            <Text style={styles.cardDetail}>
              Data/Hora: {formatDate(item.createdAt)}
            </Text>
            {item.customMessage && (
              <Text style={styles.cardMessage} numberOfLines={2}>
                Mensagem: "{item.customMessage}"
              </Text>
            )}
            {item.lat != null && item.lng != null && (
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`,
                  )
                }
              >
                <Text style={styles.mapLinkText}>👉 Toque para abrir no mapa</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }, []);

  const renderReceivedItem = useCallback(({ item }: { item: ReceivedAlertItem }) => {
    const config = ALERT_TYPE_CONFIG[item.alert.type] || { label: item.alert.type, color: '#999', gradient: ['#999', '#666'], icon: '?' };
    return (
      <View style={[styles.card, { borderLeftColor: config.color }]}>
        <View style={styles.cardContent}>
          <LinearGradient
            colors={config.gradient as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <Text style={styles.iconText}>{config.icon}</Text>
          </LinearGradient>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{config.label}</Text>
            <Text style={styles.cardDetail}>
              Usuário: {item.alert.userName || 'Desconhecido'}
            </Text>
            <Text style={styles.cardDetail}>
              Email: {item.alert.userEmail || 'Indisponível'}
            </Text>
            <Text style={styles.cardDetail}>
              Local: {item.alert.address || 'Endereço indisponível'}
            </Text>
            <Text style={styles.cardDetail}>
              Data/Hora: {formatDate(item.receivedAt)}
            </Text>
            {item.alert.customMessage && (
              <Text style={styles.cardMessage} numberOfLines={2}>
                Mensagem: "{item.alert.customMessage}"
              </Text>
            )}
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/dir/?api=1&destination=${item.alert.lat},${item.alert.lng}`,
                )
              }
            >
              <Text style={styles.mapLinkText}>👉 Toque para abrir no mapa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Histórico</Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Enviados
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Recebidos
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={styles.loader} />
      ) : activeTab === 'sent' ? (
        <FlatList
          data={sentAlerts}
          renderItem={renderSentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum alerta enviado.</Text>}
          onEndReached={() => user && sentHasMore && loadMoreSentAlerts(user.uid)}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator size="small" color={COLORS.accent} style={styles.footerLoader} />
            ) : null
          }
        />
      ) : (
        <FlatList
          data={receivedAlerts}
          renderItem={renderReceivedItem}
          keyExtractor={(item) => item.alert.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum alerta recebido.</Text>}
          onEndReached={() => user && receivedHasMore && loadMoreReceivedAlerts(user.uid)}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator size="small" color={COLORS.accent} style={styles.footerLoader} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    padding: 20,
    paddingBottom: 8,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
  },
  activeTab: {
    borderBottomColor: COLORS.accent,
  },
  tabText: {
    fontSize: 16,
    color: COLORS.secondaryText,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.accent,
  },
  loader: {
    marginTop: 40,
  },
  list: {
    padding: 20,
    paddingTop: 8,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.accent,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 22,
    color: COLORS.white,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 6,
  },
  cardDetail: {
    fontSize: 13,
    color: COLORS.primaryText,
    lineHeight: 20,
  },
  cardMessage: {
    fontSize: 13,
    color: COLORS.primaryText,
    fontStyle: 'italic',
    marginTop: 2,
  },
  mapLinkText: {
    color: COLORS.secondaryText,
    fontSize: 13,
    marginTop: 6,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.secondaryText,
    textAlign: 'center',
    marginTop: 40,
  },
  footerLoader: {
    paddingVertical: 16,
  },
});
