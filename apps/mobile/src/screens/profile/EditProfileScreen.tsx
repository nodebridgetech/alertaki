import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { launchImageLibrary } from 'react-native-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/authStore';
import { userService } from '../../services/userService';
import { storageService } from '../../services/storageService';
import { COLORS } from '../../config/constants';

type EditProfileScreenProps = {
  navigation: NativeStackNavigationProp<Record<string, undefined>>;
};

export function EditProfileScreen({ navigation }: EditProfileScreenProps): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [loading, setLoading] = useState(false);

  async function handleChangePhoto() {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 500,
        maxHeight: 500,
      });

      if (result.didCancel || !result.assets?.[0]?.uri) return;

      setLoading(true);
      const imageUri = result.assets[0].uri;
      const uid = auth().currentUser?.uid;
      if (!uid) return;

      const photoURL = await storageService.uploadProfilePhoto(uid, imageUri);
      await auth().currentUser?.updateProfile({ photoURL });
      await userService.updateProfile(uid, { photoURL });
      await refreshUser(uid);

      Alert.alert('Sucesso', 'Foto atualizada!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar a foto.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório.');
      return;
    }

    const uid = auth().currentUser?.uid;
    if (!uid) return;

    setLoading(true);
    try {
      // Update name
      if (name.trim() !== user?.displayName) {
        await auth().currentUser?.updateProfile({ displayName: name.trim() });
        await userService.updateProfile(uid, { displayName: name.trim() });
      }

      // Update email
      if (email.trim() !== user?.email && email.trim()) {
        try {
          await auth().currentUser?.verifyBeforeUpdateEmail(email.trim());
          Alert.alert(
            'Verificação Necessária',
            'Um email de verificação foi enviado para o novo endereço. Após verificar, o email será atualizado.',
          );
        } catch (error) {
          const err = error as { code?: string };
          if (err.code === 'auth/requires-recent-login') {
            Alert.alert('Atenção', 'Para alterar o email, faça login novamente.');
            return;
          }
          throw error;
        }
      }

      // Update phone
      const normalizedPhone = phone.trim() || null;
      if (normalizedPhone !== (user?.phoneNumber || null)) {
        await userService.updateProfile(uid, { phoneNumber: normalizedPhone });
      }

      await refreshUser(uid);
      Alert.alert('Sucesso', 'Perfil atualizado!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Erro', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.photoSection}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
          )}
          <TouchableOpacity onPress={handleChangePhoto} disabled={loading}>
            <Text style={styles.changePhotoText}>Trocar foto</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nome completo"
          placeholderTextColor={COLORS.secondaryText}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={COLORS.secondaryText}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Telefone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Telefone (opcional)"
          placeholderTextColor={COLORS.secondaryText}
          keyboardType="phone-pad"
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>Salvar</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 24,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
  changePhotoText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondaryText,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.primaryText,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
