import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import functions from '@react-native-firebase/functions';
import { useAuthStore } from '../../stores/authStore';
import { useContactStore } from '../../stores/contactStore';
import { useAlertStore } from '../../stores/alertStore';
import { authService } from '../../services/authService';
import { COLORS } from '../../config/constants';

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<Record<string, undefined>>;
};

export function ProfileScreen({ navigation }: ProfileScreenProps): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  const resetAuth = useAuthStore((s) => s.reset);
  const resetContacts = useContactStore((s) => s.reset);
  const resetAlerts = useAlertStore((s) => s.reset);
  const pendingInvites = useContactStore((s) => s.pendingInvites);

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
            try {
              const deleteAccount = functions().httpsCallable('deleteUserAccount');
              await deleteAccount({});
              await auth().signOut();
              resetAuth();
              resetContacts();
              resetAlerts();
            } catch (error) {
              Alert.alert('Erro', 'Erro ao excluir conta. Tente novamente.');
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {user?.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
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
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteButtonText}>Excluir Conta</Text>
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
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: 'bold',
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
