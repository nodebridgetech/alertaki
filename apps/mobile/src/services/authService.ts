import auth, { FirebaseAuthTypes, GoogleAuthProvider, AppleAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { userService } from './userService';
import { notificationService } from './notificationService';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Este email já está cadastrado.',
  'auth/invalid-email': 'Email inválido.',
  'auth/weak-password': 'Senha muito fraca. Use no mínimo 6 caracteres.',
  'auth/user-not-found': 'Usuário não encontrado.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
  'auth/invalid-credential': 'Credenciais inválidas. Verifique email e senha.',
  'auth/requires-recent-login': 'Por favor, faça login novamente para continuar.',
  'auth/network-request-failed': 'Sem conexão com a internet.',
};

function getErrorMessage(error: FirebaseAuthTypes.NativeFirebaseAuthError): string {
  const mapped = AUTH_ERROR_MESSAGES[error.code];
  if (!mapped) {
    console.error(`[Auth] Unmapped Firebase error code: ${error.code}`, error.message);
  }
  return mapped || `Erro de autenticação (${error.code}). Tente novamente.`;
}

async function signInWithGoogle(): Promise<FirebaseAuthTypes.UserCredential> {
  // Phase 1: Authentication (errors here should block login)
  let userCredential: FirebaseAuthTypes.UserCredential;
  let googleName: string | null | undefined;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    const idToken = response.data?.idToken;
    if (!idToken) {
      throw new Error('Não foi possível obter o token do Google.');
    }
    googleName = response.data?.user?.name;
    const credential = GoogleAuthProvider.credential(idToken);
    userCredential = await auth().signInWithCredential(credential);
  } catch (error) {
    if ((error as FirebaseAuthTypes.NativeFirebaseAuthError).code) {
      throw new Error(getErrorMessage(error as FirebaseAuthTypes.NativeFirebaseAuthError));
    }
    throw error;
  }

  // Phase 2: Post-auth setup (errors here should NOT block login)
  try {
    await userService.upsertUser(
      userCredential.user,
      googleName || userCredential.user.displayName || undefined,
    );
  } catch (error) {
    console.warn('Post-login upsertUser failed:', error);
  }
  try {
    await notificationService.saveFcmToken(userCredential.user.uid);
  } catch (error) {
    console.warn('Post-login saveFcmToken failed:', error);
  }

  return userCredential;
}

async function signInWithApple(): Promise<FirebaseAuthTypes.UserCredential> {
  let userCredential: FirebaseAuthTypes.UserCredential;
  let displayNameOverride: string | undefined;
  try {
    const appleAuthResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    if (!appleAuthResponse.identityToken) {
      throw new Error('Não foi possível autenticar com a Apple.');
    }

    const { identityToken, nonce } = appleAuthResponse;
    const credential = AppleAuthProvider.credential(identityToken, nonce);
    userCredential = await auth().signInWithCredential(credential);

    // Apple only sends name on first authorization
    if (appleAuthResponse.fullName?.givenName) {
      displayNameOverride = [
        appleAuthResponse.fullName.givenName,
        appleAuthResponse.fullName.familyName,
      ]
        .filter(Boolean)
        .join(' ');
      try {
        await userCredential.user.updateProfile({ displayName: displayNameOverride });
      } catch (error) {
        console.warn('Apple updateProfile failed:', error);
      }
    }
  } catch (error) {
    if ((error as FirebaseAuthTypes.NativeFirebaseAuthError).code) {
      throw new Error(getErrorMessage(error as FirebaseAuthTypes.NativeFirebaseAuthError));
    }
    throw error;
  }

  try {
    await userService.upsertUser(userCredential.user, displayNameOverride);
  } catch (error) {
    console.warn('Post-login upsertUser failed:', error);
  }
  try {
    await notificationService.saveFcmToken(userCredential.user.uid);
  } catch (error) {
    console.warn('Post-login saveFcmToken failed:', error);
  }

  return userCredential;
}

async function signInWithEmail(
  email: string,
  password: string,
): Promise<FirebaseAuthTypes.UserCredential> {
  let userCredential: FirebaseAuthTypes.UserCredential;
  try {
    userCredential = await auth().signInWithEmailAndPassword(email, password);
  } catch (error) {
    if ((error as FirebaseAuthTypes.NativeFirebaseAuthError).code) {
      throw new Error(getErrorMessage(error as FirebaseAuthTypes.NativeFirebaseAuthError));
    }
    throw error;
  }

  try {
    await userService.upsertUser(userCredential.user);
  } catch (error) {
    console.warn('Post-login upsertUser failed:', error);
  }
  try {
    await notificationService.saveFcmToken(userCredential.user.uid);
  } catch (error) {
    console.warn('Post-login saveFcmToken failed:', error);
  }

  return userCredential;
}

async function registerWithEmail(
  name: string,
  email: string,
  password: string,
  phone?: string,
): Promise<FirebaseAuthTypes.UserCredential> {
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName: name });
    await userService.upsertUser(userCredential.user, name);
    if (phone) {
      await userService.updateProfile(userCredential.user.uid, { phoneNumber: phone });
    }
    await notificationService.saveFcmToken(userCredential.user.uid);
    return userCredential;
  } catch (error) {
    if ((error as FirebaseAuthTypes.NativeFirebaseAuthError).code) {
      throw new Error(getErrorMessage(error as FirebaseAuthTypes.NativeFirebaseAuthError));
    }
    throw error;
  }
}

async function sendPasswordResetEmail(email: string): Promise<void> {
  try {
    await auth().sendPasswordResetEmail(email);
  } catch (error) {
    if ((error as FirebaseAuthTypes.NativeFirebaseAuthError).code) {
      throw new Error(getErrorMessage(error as FirebaseAuthTypes.NativeFirebaseAuthError));
    }
    throw error;
  }
}

async function signOut(): Promise<void> {
  const uid = auth().currentUser?.uid;
  if (uid) {
    await notificationService.removeFcmToken(uid);
  }
  await auth().signOut();
  try {
    await GoogleSignin.signOut();
  } catch {
    // Google sign out may fail if not signed in with Google
  }
}

function onAuthStateChanged(callback: (user: FirebaseAuthTypes.User | null) => void): () => void {
  return auth().onAuthStateChanged(callback);
}

export const authService = {
  signInWithGoogle,
  signInWithApple,
  signInWithEmail,
  registerWithEmail,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  getErrorMessage,
};
