# Alertaki — Perfil e Gerenciamento de Conta

## Dados do Perfil

### Campos editáveis

| Campo    | Tipo   | Obrigatório | Validação                        |
| -------- | ------ | ----------- | -------------------------------- |
| Nome     | string | Sim         | Não vazio, 2-100 caracteres      |
| Email    | string | Sim         | Formato válido de email          |
| Telefone | string | Não         | Formato brasileiro (com máscara) |
| Foto     | image  | Não         | JPG/PNG, max 5MB                 |

### Origem dos dados

- **Login Google**: Nome, email e foto vêm do Google. Todos editáveis após login.
- **Login Apple**: Nome e email vêm da Apple (apenas na primeira vez). Editáveis após login.
- **Login Email/Senha**: Nome vem do registro. Email é o mesmo usado para login.

---

## Fluxo de Edição de Perfil

```
ProfileScreen ──► EditProfileScreen ──► Salvar ──► Firestore + Firebase Auth
```

### Editar Nome

1. Usuário altera o campo "Nome".
2. Ao salvar:

   ```typescript
   // Atualiza no Firebase Auth
   await auth().currentUser.updateProfile({ displayName: newName });

   // Atualiza no Firestore
   await firestore().collection('users').doc(uid).update({
     displayName: newName,
     updatedAt: serverTimestamp(),
   });
   ```

### Editar Email

1. Usuário altera o campo "Email".
2. Ao salvar:

   ```typescript
   // Atualiza no Firebase Auth (pode pedir re-autenticação)
   await auth().currentUser.updateEmail(newEmail);

   // Atualiza no Firestore
   await firestore().collection('users').doc(uid).update({
     email: newEmail,
     updatedAt: serverTimestamp(),
   });
   ```

3. **Nota**: Alterar email no Firebase Auth pode exigir re-autenticação recente. Tratar o erro `auth/requires-recent-login`.

### Editar Telefone

1. Usuário altera o campo "Telefone".
2. Ao salvar, atualiza apenas no Firestore (sem verificação OTP):
   ```typescript
   await firestore().collection('users').doc(uid).update({
     phoneNumber: newPhone,
     updatedAt: serverTimestamp(),
   });
   ```

### Editar Foto

1. Usuário toca em "Trocar foto".
2. Abre opções: "Tirar foto" ou "Escolher da galeria".
3. Usa `react-native-image-picker`.
4. Upload para Firebase Storage:

   ```typescript
   const reference = storage().ref(`profile_photos/${uid}.jpg`);
   await reference.putFile(imageUri);
   const photoURL = await reference.getDownloadURL();

   // Atualiza no Firebase Auth
   await auth().currentUser.updateProfile({ photoURL });

   // Atualiza no Firestore
   await firestore().collection('users').doc(uid).update({
     photoURL,
     updatedAt: serverTimestamp(),
   });
   ```

5. Imagem é redimensionada/comprimida antes do upload (max 500x500px, qualidade 80%).

---

## Firebase Storage Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profile_photos/{userId}.jpg {
      // Qualquer usuário autenticado pode ler (para ver fotos de contatos)
      allow read: if request.auth != null;

      // Apenas o próprio usuário pode fazer upload
      allow write: if request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024  // max 5MB
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

---

## Exclusão de Conta (LGPD)

### Fluxo do Usuário

1. Navega para Perfil → "Excluir Conta".
2. Dialog de confirmação: "Tem certeza que deseja excluir sua conta? Esta ação é irreversível. Seus dados serão removidos permanentemente."
3. Pode exigir re-autenticação (digitar senha ou refazer login social).
4. Ao confirmar, chama a Cloud Function `deleteUserAccount`.

### O que acontece na exclusão

```
┌──────────────────────────────────────────────────────────────────┐
│                    Cloud Function: deleteUserAccount              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. PRESERVAR alertas enviados (para histórico de outros)        │
│     → Anonimizar dados sensíveis nos alertas:                    │
│       userName: "Usuário removido"                               │
│       userEmail: null                                            │
│       userPhotoURL: null                                         │
│                                                                  │
│  2. REMOVER de listas de contatos de outros                      │
│     → Buscar todos os docs onde este user aparece em contacts/   │
│     → Deletar cada doc contacts/{thisUid}                        │
│     → Buscar e deletar todos contactOf/{thisUid} em outros users │
│                                                                  │
│  3. REMOVER subcollections do user                               │
│     → Deletar users/{uid}/contacts/* (todos)                     │
│     → Deletar users/{uid}/contactOf/* (todos)                    │
│     → Deletar users/{uid}/blockedUsers/* (todos)                 │
│                                                                  │
│  4. REMOVER recipients que referenciam este user                 │
│     → Deletar docs em alerts/*/recipients/{thisUid}              │
│                                                                  │
│  5. REMOVER convites do user                                     │
│     → Deletar invites onde fromUid == uid OU toUid == uid        │
│                                                                  │
│  6. REMOVER foto de perfil do Storage                            │
│     → Deletar profile_photos/{uid}.jpg                           │
│                                                                  │
│  7. REMOVER documento do user                                    │
│     → Deletar users/{uid}                                        │
│                                                                  │
│  8. REMOVER conta do Firebase Auth                               │
│     → admin.auth().deleteUser(uid)                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Implementação no Cliente

```typescript
// ProfileScreen
async function deleteAccount() {
  // 1. Dialog de confirmação
  const confirmed = await showConfirmDialog(
    'Excluir Conta',
    'Tem certeza? Esta ação é irreversível.',
  );

  if (!confirmed) return;

  // 2. Re-autenticação (se necessário)
  try {
    // Para login email/senha: pedir senha novamente
    // Para login Google: refazer o signIn
    await reauthenticateUser();
  } catch {
    showError('Não foi possível verificar sua identidade. Tente novamente.');
    return;
  }

  // 3. Chamar Cloud Function (ou Callable Function)
  try {
    const deleteAccount = functions().httpsCallable('deleteUserAccount');
    await deleteAccount({ uid: auth().currentUser.uid });

    // 4. Sign out local
    await auth().signOut();

    // 5. Navegar para LoginScreen
    navigationRef.reset({ routes: [{ name: 'Login' }] });
  } catch (error) {
    showError('Erro ao excluir conta. Tente novamente.');
  }
}
```

---

## Logout

```typescript
async function logout() {
  const uid = auth().currentUser?.uid;

  // 1. Remover FCM token
  if (uid) {
    const token = await messaging().getToken();
    await firestore()
      .collection('users')
      .doc(uid)
      .update({
        tokens: firestore.FieldValue.arrayRemove(token),
      });
  }

  // 2. Sign out do Firebase
  await auth().signOut();

  // 3. Sign out do Google (se aplicável)
  await GoogleSignin.signOut();

  // 4. Limpar stores locais
  useAuthStore.getState().reset();
  useAlertStore.getState().reset();
  useContactStore.getState().reset();

  // 5. Navegação é automática via auth state listener
}
```
