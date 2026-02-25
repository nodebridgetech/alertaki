import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import functions from '@react-native-firebase/functions';
import { useAuthStore } from '../../stores/authStore';
import { useContactStore } from '../../stores/contactStore';
import { useAlertStore } from '../../stores/alertStore';
import { authService } from '../../services/authService';
import { Avatar } from '../../components/Avatar';
import { COLORS } from '../../config/constants';

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<Record<string, undefined>>;
};

export function ProfileScreen({ navigation }: ProfileScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const resetAuth = useAuthStore((s) => s.reset);
  const resetContacts = useContactStore((s) => s.reset);
  const resetAlerts = useAlertStore((s) => s.reset);
  const pendingInvites = useContactStore((s) => s.pendingInvites);
  const [deleting, setDeleting] = useState(false);

  async function handleLogout() {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.signOut();
            resetAuth();
            resetContacts();
            resetAlerts();
          } catch (error) {
            Alert.alert('Erro', (error as Error).message);
          }
        },
      },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Excluir Conta',
      'Tem certeza? Esta ação é irreversível. Todos os seus dados serão excluídos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const deleteAccount = functions().httpsCallable('deleteUserAccount');
              await deleteAccount({});
              await auth().signOut();
              resetAuth();
              resetContacts();
              resetAlerts();
              Alert.alert('Conta excluída', 'Sua conta foi excluída com sucesso.');
            } catch (error) {
              Alert.alert('Erro', 'Erro ao excluir conta. Tente novamente.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Avatar photoURL={user?.photoURL} name={user?.displayName} size={80} />
        </View>
        <Text style={styles.name}>{user?.displayName || 'Usuário'}</Text>
        <Text style={styles.email}>{user?.email || ''}</Text>
        {user?.phoneNumber && <Text style={styles.phone}>{user.phoneNumber}</Text>}
      </View>

      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.menuItemText}>Editar Perfil</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Invites')}>
          <Text style={styles.menuItemText}>Convites Pendentes</Text>
          <View style={styles.menuItemRight}>
            {pendingInvites.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingInvites.length}</Text>
              </View>
            )}
            <Text style={styles.menuItemArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('BlockedUsers')}
        >
          <Text style={styles.menuItemText}>Usuários Bloqueados</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        >
          <Text style={styles.menuItemText}>Política de Privacidade</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dangerZone}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} disabled={deleting}>
          {deleting ? (
            <ActivityIndicator color={COLORS.error} />
          ) : (
            <Text style={styles.deleteButtonText}>Excluir Conta</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primaryText,
  },
  email: {
    fontSize: 14,
    color: COLORS.secondaryText,
    marginTop: 4,
  },
  phone: {
    fontSize: 14,
    color: COLORS.secondaryText,
    marginTop: 2,
  },
  menu: {
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItemText: {
    fontSize: 16,
    color: COLORS.primaryText,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemArrow: {
    fontSize: 20,
    color: COLORS.secondaryText,
  },
  badge: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  dangerZone: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  deleteButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
    marginBottom: 10,
  },
  deleteButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: COLORS.primaryText,
  },
  logoutButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
