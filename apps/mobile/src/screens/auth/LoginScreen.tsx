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
  Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';
import { COLORS } from '../../config/constants';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<{
    Login: undefined;
    Register: undefined;
  }>;
};

export function LoginScreen({ navigation }: LoginScreenProps): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { signInWithGoogle, signInWithApple, signInWithEmail } = useAuthStore();

  async function handleEmailLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erro', 'Preencha email e senha.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (error) {
      Alert.alert('Erro', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      Alert.alert('Erro', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleLogin() {
    setLoading(true);
    try {
      await signInWithApple();
    } catch (error) {
      Alert.alert('Erro', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPassword() {
    setForgotEmail(email);
    setShowForgotModal(true);
  }

  async function handleSendResetEmail() {
    if (!forgotEmail.trim()) {
      Alert.alert('Erro', 'Digite seu email.');
      return;
    }
    setForgotLoading(true);
    try {
      await authService.sendPasswordResetEmail(forgotEmail.trim());
      setShowForgotModal(false);
      setForgotEmail('');
      Alert.alert('Sucesso', 'Email de recuperação enviado. Verifique sua caixa de entrada.');
    } catch (error) {
      Alert.alert('Erro', (error as Error).message);
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>Alertaki</Text>
        <Text style={styles.subtitle}>Seu botão de emergência</Text>

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
          placeholder="Senha"
          placeholderTextColor={COLORS.secondaryText}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.forgotPassword}>Esqueci minha senha</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.emailButton]}
          onPress={handleEmailLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <Text style={styles.socialButtonText}>Entrar com Google</Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.button, styles.appleButton]}
            onPress={handleAppleLogin}
            disabled={loading}
          >
            <Text style={[styles.socialButtonText, styles.appleButtonText]}>Entrar com Apple</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={styles.registerLink}
        >
          <Text style={styles.registerText}>
            Não tem conta? <Text style={styles.registerTextBold}>Cadastre-se</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showForgotModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recuperar Senha</Text>
            <Text style={styles.modalSubtitle}>
              Digite seu email para receber o link de recuperação
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Email"
              placeholderTextColor={COLORS.secondaryText}
              value={forgotEmail}
              onChangeText={setForgotEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowForgotModal(false);
                  setForgotEmail('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSendButton,
                  !forgotEmail.trim() && styles.modalSendButtonDisabled,
                ]}
                onPress={handleSendResetEmail}
                disabled={forgotLoading || !forgotEmail.trim()}
              >
                <Text style={styles.modalSendText}>
                  {forgotLoading ? 'Enviando...' : 'Enviar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.accent,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.secondaryText,
    textAlign: 'center',
    marginBottom: 40,
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
  forgotPassword: {
    color: COLORS.accent,
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 20,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  emailButton: {
    backgroundColor: COLORS.accent,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.secondaryText,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryText,
  },
  appleButtonText: {
    color: COLORS.white,
  },
  registerLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: COLORS.secondaryText,
  },
  registerTextBold: {
    color: COLORS.accent,
    fontWeight: 'bold',
  },
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
