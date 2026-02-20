import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { useContactStore } from '../../stores/contactStore';
import type { BlockedUser } from '@alertaki/shared';
import { COLORS } from '../../config/constants';

export function BlockedUsersScreen(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  const { blockedUsers, unblockUser } = useContactStore();

  function handleUnblock(blocked: BlockedUser) {
    if (!user) return;
    Alert.alert('Desbloquear Usuário', `Desbloquear ${blocked.displayName}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desbloquear',
        onPress: async () => {
          try {
            await unblockUser(user.uid, blocked.uid);
          } catch (error) {
            Alert.alert('Erro', (error as Error).message);
          }
        },
      },
    ]);
  }

  function renderBlockedUser({ item }: { item: BlockedUser }) {
    return (
      <View style={styles.item}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.displayName?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.displayName}</Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
        <TouchableOpacity style={styles.unblockButton} onPress={() => handleUnblock(item)}>
          <Text style={styles.unblockText}>Desbloquear</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Usuários Bloqueados</Text>
      <FlatList
        data={blockedUsers}
        renderItem={renderBlockedUser}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum usuário bloqueado.</Text>}
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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondaryText,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryText,
  },
  email: {
    fontSize: 13,
    color: COLORS.secondaryText,
    marginTop: 2,
  },
  unblockButton: {
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.success,
  },
  unblockText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.secondaryText,
    textAlign: 'center',
    marginTop: 40,
  },
});
