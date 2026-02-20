import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/authStore';
import { useContactStore } from '../../stores/contactStore';
import { alertService } from '../../services/alertService';
import { locationService } from '../../services/locationService';
import { COLORS, CUSTOM_MESSAGE_MAX_LENGTH } from '../../config/constants';
import type { Contact } from '@alertaki/shared';

type EmergencyScreenProps = {
  navigation: NativeStackNavigationProp<Record<string, undefined>>;
};

export function EmergencyScreen({ navigation }: EmergencyScreenProps): React.JSX.Element {
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const user = useAuthStore((s) => s.user);
  const contacts = useContactStore((s) => s.contacts);

  function toggleContact(uid: string) {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  }

  async function handleSend() {
    if (!user) return;

    if (selectedContacts.size === 0) {
      Alert.alert('Erro', 'Selecione pelo menos um contato.');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Erro', 'Digite uma mensagem.');
      return;
    }

    setSending(true);
    try {
      const permission = await locationService.requestPermission();
      if (!permission) {
        locationService.showLocationSettingsAlert();
        return;
      }

      const coords = await locationService.getCurrentPosition();

      await alertService.createAlert({
        userId: user.uid,
        userEmail: user.email,
        type: 'custom',
        lat: coords.latitude,
        lng: coords.longitude,
        customMessage: message.trim(),
        selectedContacts: Array.from(selectedContacts),
      });

      Alert.alert('Sucesso', 'Alerta de emergência enviado!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Erro', (error as Error).message);
    } finally {
      setSending(false);
    }
  }

  function renderContact({ item }: { item: Contact }) {
    const isSelected = selectedContacts.has(item.uid);
    return (
      <TouchableOpacity
        style={[styles.contactItem, isSelected && styles.contactItemSelected]}
        onPress={() => toggleContact(item.uid)}
      >
        <View style={styles.checkbox}>{isSelected && <Text style={styles.checkmark}>✓</Text>}</View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.displayName}</Text>
          <Text style={styles.contactEmail}>{item.email}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (contacts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Você não tem contatos de segurança.</Text>
        <TouchableOpacity
          style={styles.addContactButton}
          onPress={() => navigation.navigate('Contacts')}
        >
          <Text style={styles.addContactButtonText}>Adicionar Contatos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Alerta de Emergência</Text>

      <Text style={styles.sectionLabel}>Selecione os contatos:</Text>
      <FlatList
        data={contacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.uid}
        scrollEnabled={false}
        style={styles.contactList}
      />

      <Text style={styles.sectionLabel}>Mensagem:</Text>
      <TextInput
        style={styles.messageInput}
        placeholder="Digite sua mensagem de emergência..."
        placeholderTextColor={COLORS.secondaryText}
        multiline
        maxLength={CUSTOM_MESSAGE_MAX_LENGTH}
        value={message}
        onChangeText={setMessage}
        textAlignVertical="top"
      />
      <Text style={styles.charCounter}>
        {message.length}/{CUSTOM_MESSAGE_MAX_LENGTH} caracteres
      </Text>

      <TouchableOpacity
        style={[
          styles.sendButton,
          (selectedContacts.size === 0 || !message.trim()) && styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={sending || selectedContacts.size === 0 || !message.trim()}
      >
        {sending ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.sendButtonText}>Enviar Alerta</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryText,
    marginBottom: 8,
    marginTop: 16,
  },
  contactList: {
    maxHeight: 300,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundSecondary,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactItemSelected: {
    borderColor: COLORS.accent,
    backgroundColor: '#FFF0F0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: 'bold',
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
    fontSize: 14,
    color: COLORS.secondaryText,
    marginTop: 2,
  },
  messageInput: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.primaryText,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  charCounter: {
    fontSize: 12,
    color: COLORS.secondaryText,
    textAlign: 'right',
    marginTop: 4,
  },
  sendButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  sendButtonText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.secondaryText,
    textAlign: 'center',
    marginBottom: 16,
  },
  addContactButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 14,
    paddingHorizontal: 24,
  },
  addContactButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
