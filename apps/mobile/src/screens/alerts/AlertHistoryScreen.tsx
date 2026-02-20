import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { useAlertStore } from '../../stores/alertStore';
import type { Alert as AlertType } from '@alertaki/shared';
import { ReceivedAlertItem } from '../../services/alertService';
import { COLORS, ALERT_COLORS } from '../../config/constants';

const TYPE_LABELS: Record<string, string> = {
  health: '🏥 Saúde',
  security: '🛡️ Segurança',
  custom: '⚠️ Emergência',
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
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
  const user = useAuthStore((s) => s.user);
  const { sentAlerts, receivedAlerts, isLoading, loadSentAlerts, loadReceivedAlerts } =
    useAlertStore();

  useEffect(() => {
    if (user) {
      loadSentAlerts(user.uid);
      loadReceivedAlerts(user.uid);
    }
  }, [user, loadSentAlerts, loadReceivedAlerts]);

  function renderSentItem({ item }: { item: AlertType }) {
    return (
      <View style={styles.alertItem}>
        <View style={styles.alertHeader}>
          <Text style={styles.alertType}>{TYPE_LABELS[item.type] || item.type}</Text>
          <Text style={styles.alertDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={styles.alertAddress}>{item.address || 'Endereço indisponível'}</Text>
        {item.customMessage && (
          <Text style={styles.alertMessage} numberOfLines={2}>
            "{item.customMessage}"
          </Text>
        )}
      </View>
    );
  }

  function renderReceivedItem({ item }: { item: ReceivedAlertItem }) {
    return (
      <View style={styles.alertItem}>
        <View style={styles.alertHeader}>
          <Text style={styles.alertType}>{TYPE_LABELS[item.alert.type] || item.alert.type}</Text>
          <Text style={styles.alertDate}>{formatDate(item.receivedAt)}</Text>
        </View>
        <Text style={styles.senderName}>De: {item.alert.userName || 'Usuário'}</Text>
        <Text style={styles.alertAddress}>{item.alert.address || 'Endereço indisponível'}</Text>
        {item.alert.customMessage && (
          <Text style={styles.alertMessage} numberOfLines={2}>
            "{item.alert.customMessage}"
          </Text>
        )}
        <TouchableOpacity
          style={styles.mapLink}
          onPress={() =>
            Linking.openURL(
              `https://www.google.com/maps/dir/?api=1&destination=${item.alert.lat},${item.alert.lng}`,
            )
          }
        >
          <Text style={styles.mapLinkText}>Abrir no Mapa</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        />
      ) : (
        <FlatList
          data={receivedAlerts}
          renderItem={renderReceivedItem}
          keyExtractor={(item) => item.alert.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum alerta recebido.</Text>}
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
  alertItem: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  alertType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryText,
  },
  alertDate: {
    fontSize: 12,
    color: COLORS.secondaryText,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryText,
    marginBottom: 4,
  },
  alertAddress: {
    fontSize: 13,
    color: COLORS.secondaryText,
  },
  alertMessage: {
    fontSize: 13,
    color: COLORS.primaryText,
    fontStyle: 'italic',
    marginTop: 4,
  },
  mapLink: {
    marginTop: 8,
  },
  mapLinkText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.secondaryText,
    textAlign: 'center',
    marginTop: 40,
  },
});
