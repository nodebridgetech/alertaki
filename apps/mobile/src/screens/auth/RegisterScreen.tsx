import React, { useMemo, useState } from 'react';
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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/authStore';
import { COLORS } from '../../config/constants';
import { isValidEmail } from '../../utils/validation';

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<{
    Login: undefined;
    Register: undefined;
  }>;
};

function PasswordCriterion({ met, label }: { met: boolean; label: string }) {
  return (
    <View style={criterionStyles.row}>
      <Text style={[criterionStyles.icon, met && criterionStyles.iconMet]}>
        {met ? '\u2713' : '\u2022'}
      </Text>
      <Text style={[criterionStyles.label, met && criterionStyles.labelMet]}>{label}</Text>
    </View>
  );
}

const criterionStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  icon: { fontSize: 14, color: COLORS.secondaryText, width: 18 },
  iconMet: { color: COLORS.success, fontWeight: 'bold' },
  label: { fontSize: 13, color: COLORS.secondaryText },
  labelMet: { color: COLORS.success },
});

export function RegisterScreen({ navigation }: RegisterScreenProps): React.JSX.Element {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { registerWithEmail } = useAuthStore();

  const passwordCriteria = useMemo(() => ({
    minLength: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }), [password]);

  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const allCriteriaMet = Object.values(passwordCriteria).every(Boolean) && passwordsMatch;

  async function handleRegister() {
    if (!name.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Erro', 'Email é obrigatório.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Erro', 'Email inválido.');
      return;
    }
    if (!allCriteriaMet) {
      Alert.alert('Erro', 'A senha não atende todos os critérios de segurança.');
      return;
    }
    if (phone.trim() && !/^\+?\d{10,15}$/.test(phone.trim().replace(/[\s\-()]/g, ''))) {
      Alert.alert('Erro', 'Telefone inválido. Use formato: +5511999999999');
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(name.trim(), email.trim(), password, phone.trim() || undefined);
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
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Criar Conta</Text>
        <Text style={styles.subtitle}>Preencha seus dados para começar</Text>

        <TextInput
          style={styles.input}
          placeholder="Nome completo"
          placeholderTextColor={COLORS.secondaryText}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={COLORS.secondaryText}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Telefone (opcional)"
          placeholderTextColor={COLORS.secondaryText}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor={COLORS.secondaryText}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirmar senha"
          placeholderTextColor={COLORS.secondaryText}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <View style={styles.criteriaContainer}>
          <PasswordCriterion met={passwordCriteria.minLength} label="Mínimo 6 caracteres" />
          <PasswordCriterion met={passwordCriteria.uppercase} label="Letra maiúscula" />
          <PasswordCriterion met={passwordCriteria.lowercase} label="Letra minúscula" />
          <PasswordCriterion met={passwordCriteria.number} label="Número" />
          <PasswordCriterion met={passwordCriteria.symbol} label="Símbolo (!@#$...)" />
          <PasswordCriterion met={passwordsMatch} label="Senhas conferem" />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>Criar Conta</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.loginLink}>
          <Text style={styles.loginText}>
            Já tem conta? <Text style={styles.loginTextBold}>Faça login</Text>
          </Text>
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.secondaryText,
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 4,
  },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.primaryText,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  criteriaContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: COLORS.secondaryText,
  },
  loginTextBold: {
    color: COLORS.accent,
    fontWeight: 'bold',
  },
});
