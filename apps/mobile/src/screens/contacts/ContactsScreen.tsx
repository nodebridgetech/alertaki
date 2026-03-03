import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/authStore';
import { useContactStore } from '../../stores/contactStore';
import { Avatar } from '../../components/Avatar';
import type { Contact, ContactOf } from '@alertaki/shared';
import { COLORS } from '../../config/constants';
import { isValidEmailOrPhone } from '../../utils/validation';

type ContactsScreenProps = {
  navigation: NativeStackNavigationProp<Record<string, undefined>>;
};

export function ContactsScreen({ navigation }: ContactsScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'mine' | 'contactOf'>('mine');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const user = useAuthStore((s) => s.user);
  const { contacts, contactOf, sendInvite, removeContact } = useContactStore();

  async function handleSendInvite() {
    if (!inviteInput.trim()) return;

    if (!isValidEmailOrPhone(inviteInput)) {
      Alert.alert('Erro', 'Digite um email ou telefone válido.');
      return;
    }

    setInviteLoading(true);
    try {
      await sendInvite(inviteInput.trim());
      Alert.alert('Sucesso', 'Convite enviado!');
      setShowInviteModal(false);
      setInviteInput('');
    } catch (error) {
      Alert.alert('Erro', (error as Error).message);
    } finally {
      setInviteLoading(false);
    }
  }

  function handleRemoveContact(contact: Contact) {
    if (!user) return;
    Alert.alert(
      'Remover Contato',
      `Remover ${contact.displayName} dos seus contatos de segurança?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeContact(user.uid, contact.uid);
              Alert.alert('Sucesso', 'Contato removido.');
            } catch (error) {
              Alert.alert('Erro', (error as Error).message);
            }
          },
        },
      ],
    );
  }

  function renderMyContact({ item }: { item: Contact }) {
    const name = item.displayName || item.email?.split('@')[0] || 'Usuário';
    return (
      <View style={styles.contactItem}>
        <View style={styles.avatarWrapper}>
          <Avatar photoURL={item.photoURL} name={name} size={44} />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{name}</Text>
          <Text style={styles.contactEmail}>{item.email}</Text>
        </View>
        <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveContact(item)}>
          <Text style={styles.removeButtonText}>Remover</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleQuickInvite(contactOfItem: ContactOf) {
    try {
      await sendInvite(contactOfItem.ownerEmail);
      Alert.alert('Sucesso', 'Convite enviado!');
    } catch (error) {
      Alert.alert('Erro', (error as Error).message);
    }
  }

  function renderContactOf({ item }: { item: ContactOf }) {
    const name = item.ownerDisplayName || item.ownerEmail?.split('@')[0] || 'Usuário';
    const alreadyMyContact = contacts.some((c) => c.uid === item.ownerUid);
    return (
      <View style={styles.contactItem}>
        <View style={styles.avatarWrapper}>
          <Avatar photoURL={item.ownerPhotoURL} name={name} size={44} />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{name}</Text>
          <Text style={styles.contactEmail}>{item.ownerEmail}</Text>
        </View>
        {!alreadyMyContact && (
          <TouchableOpacity style={styles.addButton} onPress={() => handleQuickInvite(item)}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Contatos</Text>

      <TouchableOpacity style={styles.inviteButton} onPress={() => setShowInviteModal(true)}>
        <Text style={styles.inviteButtonText}>+ Convidar Contato</Text>
      </TouchableOpacity>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mine' && styles.activeTab]}
          onPress={() => setActiveTab('mine')}
        >
          <Text style={[styles.tabText, activeTab === 'mine' && styles.activeTabText]}>
            Meus Contatos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'contactOf' && styles.activeTab]}
          onPress={() => setActiveTab('contactOf')}
        >
          <Text style={[styles.tabText, activeTab === 'contactOf' && styles.activeTabText]}>
            Sou Contato De
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'mine' ? (
        <FlatList
          data={contacts}
          renderItem={renderMyContact}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum contato de segurança.{'\n'}Convide alguém!</Text>
          }
        />
      ) : (
        <FlatList
          data={contactOf}
          renderItem={renderContactOf}
          keyExtractor={(item) => item.ownerUid}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Ninguém adicionou você como contato ainda.</Text>
          }
        />
      )}

      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Convidar Contato</Text>
            <Text style={styles.modalSubtitle}>Digite o email ou telefone do contato</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Email ou telefone"
              placeholderTextColor={COLORS.secondaryText}
              value={inviteInput}
              onChangeText={setInviteInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowInviteModal(false);
                  setInviteInput('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSendButton,
                  !inviteInput.trim() && styles.modalSendButtonDisabled,
                ]}
                onPress={handleSendInvite}
                disabled={inviteLoading || !inviteInput.trim()}
              >
                <Text style={styles.modalSendText}>{inviteLoading ? 'Enviando...' : 'Enviar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  inviteButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  inviteButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
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
    fontSize: 14,
    color: COLORS.secondaryText,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.accent,
  },
  list: {
    padding: 20,
    paddingTop: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarWrapper: {
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryText,
  },
  contactEmail: {
    fontSize: 13,
    color: COLORS.secondaryText,
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  removeButtonText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '600',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.secondaryText,
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 24,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.secondaryText,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.primaryText,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.secondaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  modalSendButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  modalSendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  modalSendText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
