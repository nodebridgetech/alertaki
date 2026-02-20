# Alertaki — Fluxo de Autenticação

## Métodos de Autenticação

O Alertaki suporta três métodos de login:

1. **Google Sign-In** — Login social via conta Google.
2. **Email/Senha** — Criação de conta manual com email e senha.
3. **Apple Sign-In** — Login social via Apple ID (obrigatório para aprovação na App Store).

---

## Fluxo 1: Google Sign-In

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  LoginScreen │────►│ Google Sign  │────►│ Firebase Auth │────►│ Firestore│
│  Tap botão   │     │ In SDK       │     │ signIn()     │     │ upsert   │
│  "Google"    │     │ (modal)      │     │              │     │ user doc │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────┘
```

### Passos detalhados:

1. Usuário toca em "Entrar com Google".
2. O SDK do Google Sign-In abre o modal de seleção de conta.
3. Usuário seleciona ou faz login na conta Google.
4. O SDK retorna um `idToken` e `accessToken`.
5. Cria-se um `GoogleAuthProvider.credential(idToken, accessToken)`.
6. Chama `firebase.auth().signInWithCredential(credential)`.
7. Firebase Auth retorna o `UserCredential`.
8. O app verifica se o documento do usuário existe no Firestore:
   - **Se não existe**: Cria o documento em `users/{uid}` com os dados do Google (nome, email, foto).
   - **Se existe**: Atualiza `updatedAt` e dados que podem ter mudado (foto, nome).
9. Salva o FCM token no array `tokens` do usuário.
10. Navega para a `HomeScreen`.

---

## Fluxo 2: Email/Senha — Registro

```
┌──────────────┐     ┌──────────────┐     ┌──────────┐
│ RegisterScreen│────►│ Firebase Auth │────►│ Firestore│
│ Nome, Email,  │     │ createUser() │     │ create   │
│ Senha         │     │              │     │ user doc │
└──────────────┘     └──────────────┘     └──────────┘
```

### Passos detalhados:

1. Usuário navega para a tela de registro.
2. Preenche: Nome, Email, Senha, Confirmar Senha.
3. Validação local:
   - Nome não vazio.
   - Email válido.
   - Senha com no mínimo 6 caracteres.
   - Senha e confirmação iguais.
4. Chama `firebase.auth().createUserWithEmailAndPassword(email, password)`.
5. Atualiza o `displayName` no Firebase Auth: `user.updateProfile({ displayName })`.
6. Cria o documento em `users/{uid}` com os dados preenchidos.
7. Salva o FCM token.
8. Navega para a `HomeScreen`.

### Tratamento de erros:

- `auth/email-already-in-use` — "Este email já está cadastrado."
- `auth/invalid-email` — "Email inválido."
- `auth/weak-password` — "Senha muito fraca. Use no mínimo 6 caracteres."

---

## Fluxo 3: Email/Senha — Login

```
┌─────────────┐     ┌──────────────┐     ┌──────────┐
│  LoginScreen │────►│ Firebase Auth │────►│ Firestore│
│  Email, Senha│     │ signIn()     │     │ update   │
│              │     │              │     │ user doc │
└─────────────┘     └──────────────┘     └──────────┘
```

### Passos detalhados:

1. Usuário preenche Email e Senha.
2. Chama `firebase.auth().signInWithEmailAndPassword(email, password)`.
3. Se bem-sucedido, atualiza `updatedAt` no Firestore.
4. Salva/atualiza o FCM token.
5. Navega para a `HomeScreen`.

### Tratamento de erros:

- `auth/user-not-found` — "Usuário não encontrado."
- `auth/wrong-password` — "Senha incorreta."
- `auth/too-many-requests` — "Muitas tentativas. Tente novamente mais tarde."

---

## Fluxo 4: Apple Sign-In

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  LoginScreen │────►│ Apple Sign   │────►│ Firebase Auth │────►│ Firestore│
│  Tap botão   │     │ In SDK       │     │ signIn()     │     │ upsert   │
│  "Apple"     │     │ (modal)      │     │              │     │ user doc │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────┘
```

### Passos detalhados:

1. Usuário toca em "Entrar com Apple" (disponível apenas no iOS).
2. O SDK do Apple Authentication apresenta o modal nativo.
3. Usuário autoriza com Face ID/Touch ID/senha.
4. O SDK retorna `identityToken` e `nonce`.
5. Cria-se um `AppleAuthProvider.credential(identityToken, nonce)`.
6. Chama `firebase.auth().signInWithCredential(credential)`.
7. O fluxo de upsert no Firestore é o mesmo do Google.

**Nota**: Na primeira autorização, a Apple envia o nome e email. Nas subsequentes, pode não enviar. O app deve armazenar essas informações na primeira vez.

---

## Auth State Management

### Zustand Store: `useAuthStore`

```typescript
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  deleteAccount: () => Promise<void>;
}
```

### Auth Gate (Root Navigation)

```typescript
// O componente root observa o estado de autenticação
firebase.auth().onAuthStateChanged((firebaseUser) => {
  if (firebaseUser) {
    // Busca dados do Firestore e popula o store
    // Navega para MainStack
  } else {
    // Limpa o store
    // Navega para AuthStack
  }
});
```

---

## Logout

1. Remove o FCM token atual do array `tokens` do usuário no Firestore.
2. Chama `firebase.auth().signOut()`.
3. Limpa todos os stores Zustand.
4. Navega para o `AuthStack`.

---

## Recuperação de Senha

Para usuários com email/senha:

1. Na tela de login, link "Esqueci minha senha".
2. Usuário digita o email.
3. Chama `firebase.auth().sendPasswordResetEmail(email)`.
4. Exibe mensagem: "Email de recuperação enviado. Verifique sua caixa de entrada."

---

## Diagrama de Telas

```
                    ┌─────────────────┐
                    │   SplashScreen   │
                    │  (verificando    │
                    │   auth state)    │
                    └────────┬────────┘
                             │
                   ┌─────────┴──────────┐
                   │                    │
            Não autenticado        Autenticado
                   │                    │
                   ▼                    ▼
          ┌─────────────┐      ┌─────────────┐
          │ LoginScreen  │      │ HomeScreen   │
          │              │      │              │
          │ • Google     │      │              │
          │ • Apple (iOS)│      │              │
          │ • Email/Senha│      │              │
          │ • Link p/    │      │              │
          │   Registro   │      │              │
          │ • Esqueci    │      │              │
          │   senha      │      │              │
          └──────┬───────┘      └──────────────┘
                 │
                 ▼
          ┌──────────────┐
          │RegisterScreen │
          │               │
          │ • Nome        │
          │ • Email       │
          │ • Senha       │
          │ • Confirmar   │
          └───────────────┘
```
