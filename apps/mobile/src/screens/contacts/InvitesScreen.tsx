import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useContactStore } from '../../stores/contactStore';
import { Avatar } from '../../components/Avatar';
import type { Invite } from '@alertaki/shared';
import { COLORS } from '../../config/constants';

export function InvitesScreen(): React.JSX.Element {
  const { pendingInvites, acceptInvite, rejectInvite } = useContactStore();
  const [processingId, setProcessingId] = useState<string | null>(null);

  function handleAccept(invite: Invite & { id: string }) {
    Alert.alert(
      'Aceitar Convite',
      `Aceitar ${invite.fromDisplayName || invite.fromEmail} como seu contato de segurança?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceitar',
          onPress: async () => {
            setProcessingId(invite.id);
            try {
              await acceptInvite(invite.id);
            } catch (error) {
              Alert.alert('Erro', (error as Error).message);
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  }

  function handleReject(invite: Invite & { id: string }) {
    Alert.alert(
      'Recusar Convite',
      `Recusar convite de ${invite.fromDisplayName || invite.fromEmail}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recusar',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(invite.id);
            try {
              await rejectInvite(invite.id);
            } catch (error) {
              Alert.alert('Erro', (error as Error).message);
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  }

  function renderInvite({ item }: { item: Invite & { id: string } }) {
    const isProcessing = processingId === item.id;
    return (
      <View style={[styles.inviteItem, isProcessing && styles.inviteItemProcessing]}>
        <View style={styles.avatarWrapper}>
          <Avatar photoURL={item.fromPhotoURL} name={item.fromDisplayName} size={44} />
        </View>
        <View style={styles.inviteInfo}>
          <Text style={styles.inviteName}>{item.fromDisplayName}</Text>
          <Text style={styles.inviteEmail}>{item.fromEmail}</Text>
          <Text style={styles.inviteText}>quer ser seu contato de segurança</Text>
        </View>
        {isProcessing ? (
          <ActivityIndicator size="small" color={COLORS.accent} />
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAccept(item)}
              disabled={!!processingId}
            >
              <Text style={styles.acceptText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleReject(item)}
              disabled={!!processingId}
            >
              <Text style={styles.rejectText}>✗</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Convites Pendentes</Text>
      <FlatList
        data={pendingInvites}
        renderItem={renderInvite}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum convite pendente.</Text>}
      />
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
  list: {
    padding: 20,
    paddingTop: 8,
  },
  inviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inviteItemProcessing: {
    opacity: 0.6,
  },
  avatarWrapper: {
    marginRight: 12,
  },
  inviteInfo: {
    flex: 1,
  },
  inviteName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryText,
  },
  inviteEmail: {
    fontSize: 13,
    color: COLORS.secondaryText,
  },
  inviteText: {
    fontSize: 12,
    color: COLORS.secondaryText,
    marginTop: 2,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.secondaryText,
    textAlign: 'center',
    marginTop: 40,
  },
});
