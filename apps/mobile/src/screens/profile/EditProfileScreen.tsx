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
  PermissionsAndroid,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { launchImageLibrary } from 'react-native-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { UserAddress } from '@alertaki/shared';
import { useAuthStore } from '../../stores/authStore';
import { userService } from '../../services/userService';
import { storageService } from '../../services/storageService';
import { Avatar } from '../../components/Avatar';
import { COLORS, PROFILE_PHOTO_MAX_SIZE } from '../../config/constants';

// --- Mask helpers ---

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function unmask(value: string): string {
  return value.replace(/\D/g, '');
}

function initPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }
  return maskPhone(digits);
}

type EditProfileScreenProps = {
  navigation: NativeStackNavigationProp<Record<string, undefined>>;
};

export function EditProfileScreen({ navigation }: EditProfileScreenProps): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(initPhone(user?.phoneNumber));
  const [cpf, setCpf] = useState(user?.cpf ? maskCPF(user.cpf) : '');
  const [cep, setCep] = useState(user?.address?.cep ? maskCEP(user.address.cep) : '');
  const [street, setStreet] = useState(user?.address?.street || '');
  const [addressNumber, setAddressNumber] = useState(user?.address?.number || '');
  const [complement, setComplement] = useState(user?.address?.complement || '');
  const [neighborhood, setNeighborhood] = useState(user?.address?.neighborhood || '');
  const [city, setCity] = useState(user?.address?.city || '');
  const [addressState, setAddressState] = useState(user?.address?.state || '');
  const [loading, setLoading] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);

  function handlePhoneChange(value: string) {
    setPhone(maskPhone(value));
  }

  function handleCpfChange(value: string) {
    setCpf(maskCPF(value));
  }

  function handleCepChange(value: string) {
    const masked = maskCEP(value);
    setCep(masked);
    const raw = unmask(masked);
    if (raw.length === 8) {
      fetchAddress(raw);
    }
  }

  async function fetchAddress(rawCep: string) {
    setFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await response.json();
      if (data.erro) {
        Alert.alert('CEP não encontrado', 'Verifique o CEP informado.');
        return;
      }
      setStreet(data.logradouro || '');
      setNeighborhood(data.bairro || '');
      setCity(data.localidade || '');
      setAddressState(data.uf || '');
    } catch {
      Alert.alert('Erro', 'Não foi possível buscar o endereço.');
    } finally {
      setFetchingCep(false);
    }
  }

  async function handleChangePhoto() {
    try {
      if (Platform.OS === 'android') {
        const sdkInt = Platform.Version;
        if (typeof sdkInt === 'number' && sdkInt < 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
              title: 'Permissão de Fotos',
              message: 'Alertaki precisa acessar suas fotos para alterar a foto de perfil.',
              buttonPositive: 'Permitir',
              buttonNegative: 'Cancelar',
            },
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Permissão Negada', 'Não foi possível acessar a galeria de fotos.');
            return;
          }
        }
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 500,
        maxHeight: 500,
      });

      if (result.didCancel || !result.assets?.[0]?.uri) return;

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > PROFILE_PHOTO_MAX_SIZE) {
        Alert.alert('Erro', 'A foto deve ter no máximo 5MB.');
        return;
      }

      setLoading(true);
      const imageUri = asset.uri!;
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

    const rawPhone = unmask(phone);
    if (rawPhone && (rawPhone.length < 10 || rawPhone.length > 11)) {
      Alert.alert('Erro', 'Telefone inválido.');
      return;
    }

    const rawCpf = unmask(cpf);
    if (rawCpf && rawCpf.length !== 11) {
      Alert.alert('Erro', 'CPF inválido. Deve conter 11 dígitos.');
      return;
    }

    const uid = auth().currentUser?.uid;
    if (!uid) return;

    setLoading(true);
    try {
      if (name.trim() !== user?.displayName) {
        await auth().currentUser?.updateProfile({ displayName: name.trim() });
        await userService.updateProfile(uid, { displayName: name.trim() });
      }

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

      const phoneToSave = rawPhone || null;
      const cpfToSave = rawCpf || null;
      const rawCep = unmask(cep);
      const addressToSave: UserAddress | null = rawCep
        ? {
            cep: rawCep,
            street: street.trim(),
            number: addressNumber.trim(),
            complement: complement.trim(),
            neighborhood: neighborhood.trim(),
            city: city.trim(),
            state: addressState.trim(),
          }
        : null;

      await userService.updateProfile(uid, {
        phoneNumber: phoneToSave,
        cpf: cpfToSave,
        address: addressToSave,
      });

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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.photoSection}>
          <View style={styles.avatarContainer}>
            <Avatar photoURL={user?.photoURL} name={name} size={80} />
          </View>
          <TouchableOpacity onPress={handleChangePhoto} disabled={loading}>
            <Text style={styles.changePhotoText}>Trocar foto</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Dados Pessoais</Text>

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
          onChangeText={handlePhoneChange}
          placeholder="(00) 00000-0000"
          placeholderTextColor={COLORS.secondaryText}
          keyboardType="phone-pad"
          maxLength={15}
        />

        <Text style={styles.label}>CPF</Text>
        <TextInput
          style={styles.input}
          value={cpf}
          onChangeText={handleCpfChange}
          placeholder="000.000.000-00"
          placeholderTextColor={COLORS.secondaryText}
          keyboardType="number-pad"
          maxLength={14}
        />

        <Text style={styles.sectionTitle}>Endereço</Text>

        <Text style={styles.label}>CEP</Text>
        <View style={styles.cepRow}>
          <TextInput
            style={[styles.input, styles.cepInput]}
            value={cep}
            onChangeText={handleCepChange}
            placeholder="00000-000"
            placeholderTextColor={COLORS.secondaryText}
            keyboardType="number-pad"
            maxLength={9}
          />
          {fetchingCep && <ActivityIndicator size="small" color={COLORS.accent} style={styles.cepLoader} />}
        </View>

        <Text style={styles.label}>Rua</Text>
        <TextInput
          style={styles.input}
          value={street}
          onChangeText={setStreet}
          placeholder="Rua / Avenida"
          placeholderTextColor={COLORS.secondaryText}
        />

        <View style={styles.row}>
          <View style={styles.fieldSmall}>
            <Text style={styles.label}>Número</Text>
            <TextInput
              style={styles.input}
              value={addressNumber}
              onChangeText={setAddressNumber}
              placeholder="Nº"
              placeholderTextColor={COLORS.secondaryText}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.fieldLarge}>
            <Text style={styles.label}>Complemento</Text>
            <TextInput
              style={styles.input}
              value={complement}
              onChangeText={setComplement}
              placeholder="Apto, Bloco..."
              placeholderTextColor={COLORS.secondaryText}
            />
          </View>
        </View>

        <Text style={styles.label}>Bairro</Text>
        <TextInput
          style={styles.input}
          value={neighborhood}
          onChangeText={setNeighborhood}
          placeholder="Bairro"
          placeholderTextColor={COLORS.secondaryText}
        />

        <View style={styles.row}>
          <View style={styles.fieldLarge}>
            <Text style={styles.label}>Cidade</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Cidade"
              placeholderTextColor={COLORS.secondaryText}
            />
          </View>
          <View style={styles.fieldSmall}>
            <Text style={styles.label}>UF</Text>
            <TextInput
              style={styles.input}
              value={addressState}
              onChangeText={setAddressState}
              placeholder="UF"
              placeholderTextColor={COLORS.secondaryText}
              maxLength={2}
              autoCapitalize="characters"
            />
          </View>
        </View>

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
    paddingBottom: 120,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 8,
  },
  changePhotoText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginTop: 20,
    marginBottom: 4,
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
  cepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cepInput: {
    flex: 1,
  },
  cepLoader: {
    marginLeft: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldSmall: {
    flex: 1,
  },
  fieldLarge: {
    flex: 2,
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
