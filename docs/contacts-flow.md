# Alertaki — Fluxo de Contatos de Segurança

## Visão Geral

O sistema de contatos de segurança é **unidirecional**: se A convida B e B aceita, B é contato de segurança de A (A pode enviar alertas que B receberá). Isso **não** faz de A um contato de B automaticamente.

Não há limite de contatos de segurança.

---

## Fluxo de Convite

### Enviar Convite

```
┌────────────┐     ┌─────────────┐     ┌──────────┐     ┌──────────────┐
│ ContactsScr│────►│ Busca user  │────►│ Cria doc  │────►│Cloud Function│
│ Digita email│    │ por email   │     │ invites/  │     │onInviteCreated│
│ ou telefone │    │ ou telefone │     │ status:   │     │ → push para  │
│             │    │ no Firestore│     │ pending   │     │ destinatário │
└────────────┘    └─────────────┘     └──────────┘     └──────────────┘
```

### Passos detalhados:

1. Usuário navega para a tela de Contatos.
2. Toca em "Convidar contato".
3. Digita o **email** ou **telefone** do contato desejado.
4. O app busca no Firestore:
   ```typescript
   // Busca por email
   const snap = await firestore.collection('users')
     .where('email', '==', inputEmail)
     .limit(1)
     .get();

   // OU busca por telefone
   const snap = await firestore.collection('users')
     .where('phoneNumber', '==', inputPhone)
     .limit(1)
     .get();
   ```
5. Se **não encontrado**: Mensagem "Nenhum usuário encontrado com este email/telefone."
6. Se **encontrado**, validações:
   - Não é o próprio usuário.
   - Não é já um contato existente (`contacts/{uid}` existe?).
   - Não há convite pendente entre esses dois usuários.
   - O destinatário não bloqueou o remetente.
7. Cria o documento de convite:
   ```typescript
   await firestore.collection('invites').add({
     fromUid: currentUser.uid,
     fromEmail: currentUser.email,
     fromDisplayName: currentUser.displayName,
     fromPhotoURL: currentUser.photoURL,
     toUid: targetUser.uid,
     toEmail: targetUser.email,
     status: 'pending',
     createdAt: serverTimestamp(),
     updatedAt: serverTimestamp(),
   });
   ```
8. Feedback: "Convite enviado para [nome]!"

### Erros:
- "Nenhum usuário encontrado." — email/telefone não cadastrado.
- "Este usuário já é seu contato." — relação já existe.
- "Já existe um convite pendente para este usuário." — duplicata.
- "Você não pode convidar a si mesmo." — auto-convite.

---

## Receber e Responder Convites

### Tela de Convites (InvitesScreen)

```
┌──────────────────────────────┐
│  Convites Pendentes           │
│                              │
│  ┌──────────────────────────┐│
│  │ [Foto] João Silva        ││
│  │ joao@email.com           ││
│  │                          ││
│  │ [✓ Aceitar] [✗ Recusar] ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ [Foto] Maria Santos      ││
│  │ maria@email.com          ││
│  │                          ││
│  │ [✓ Aceitar] [✗ Recusar] ││
│  └──────────────────────────┘│
└──────────────────────────────┘
```

### Aceitar Convite

```
InvitesScreen ──► Tap "Aceitar" ──► Update invite status ──► Cloud Function
                                    status: 'accepted'       onInviteAccepted
                                                              │
                                                              ▼
                                                    ┌─────────────────┐
                                                    │ Cria 2 docs:    │
                                                    │ 1. contacts/    │
                                                    │    {toUid} em   │
                                                    │    users/{from} │
                                                    │                 │
                                                    │ 2. contactOf/   │
                                                    │    {fromUid} em │
                                                    │    users/{to}   │
                                                    └─────────────────┘
```

#### Cloud Function `onInviteAccepted`:

```
Trigger: onDocumentUpdated('invites/{inviteId}')
Condição: status mudou para 'accepted'

1. Buscar dados do destinatário (quem aceitou) em users/{toUid}
2. Buscar dados do remetente (quem convidou) em users/{fromUid}

3. Criar contato na lista do remetente:
   users/{fromUid}/contacts/{toUid} = {
     uid: toUid,
     displayName: toUser.displayName,
     email: toUser.email,
     photoURL: toUser.photoURL,
     addedAt: serverTimestamp(),
   }

4. Criar registro "contactOf" no destinatário:
   users/{toUid}/contactOf/{fromUid} = {
     ownerUid: fromUid,
     ownerDisplayName: fromUser.displayName,
     ownerEmail: fromUser.email,
     ownerPhotoURL: fromUser.photoURL,
     addedAt: serverTimestamp(),
   }
```

### Recusar Convite

1. Usuário toca em "Recusar".
2. Atualiza o convite: `status: 'rejected'`, `updatedAt: serverTimestamp()`.
3. O remetente **não é notificado** da recusa.
4. O convite desaparece da lista do destinatário.

---

## Visualização de Contatos

### Aba "Meus Contatos" (MyContactsTab)

Lista os contatos de segurança do usuário (quem ele convidou e aceitou).

```typescript
// Real-time listener
firestore.collection('users').doc(currentUid)
  .collection('contacts')
  .orderBy('addedAt', 'desc')
  .onSnapshot(...)
```

Cada item exibe:
- Foto, nome, email do contato.
- Botão para **remover** o contato.

### Aba "Sou Contato De" (ContactOfTab)

Lista quem adicionou este usuário como contato de segurança.

```typescript
// Real-time listener
firestore.collection('users').doc(currentUid)
  .collection('contactOf')
  .orderBy('addedAt', 'desc')
  .onSnapshot(...)
```

Cada item exibe:
- Foto, nome, email do "dono".
- Informativo (sem ação de remoção — o dono é quem gerencia).

---

## Remover Contato

1. Usuário toca em "Remover" em um contato.
2. Confirmação: "Remover [nome] dos seus contatos de segurança?"
3. Deleta o documento:
   ```typescript
   // Remove da lista de contatos do usuário
   await firestore.collection('users').doc(currentUid)
     .collection('contacts').doc(contactUid).delete();

   // Remove o registro contactOf do ex-contato
   await firestore.collection('users').doc(contactUid)
     .collection('contactOf').doc(currentUid).delete();
   ```
4. O contato removido **não é notificado**.

---

## Bloqueio de Usuários

### Bloquear (a partir do AlertOverlay)

1. Ao receber um alerta, o usuário pode tocar em "Bloquear Usuário".
2. Confirmação: "Bloquear [nome]? Você não receberá mais alertas desta pessoa."
3. Cria o documento de bloqueio:
   ```typescript
   await firestore.collection('users').doc(currentUid)
     .collection('blockedUsers').doc(blockedUid).set({
       uid: blockedUid,
       displayName: blockedUser.displayName,
       email: blockedUser.email,
       photoURL: blockedUser.photoURL,
       blockedAt: serverTimestamp(),
     });
   ```
4. O bloqueado **NÃO é notificado**.
5. Efeitos do bloqueio:
   - Alertas do bloqueado **não são entregues** (verificado na Cloud Function).
   - Convites do bloqueado **são ignorados** (verificado no envio).

### Desbloquear (a partir da lista de bloqueados)

1. Usuário navega para "Bloqueados" (acessível pelo perfil ou contatos).
2. Lista todos os bloqueados.
3. Toca em "Desbloquear" em um usuário.
4. Confirmação: "Desbloquear [nome]?"
5. Deleta o documento:
   ```typescript
   await firestore.collection('users').doc(currentUid)
     .collection('blockedUsers').doc(blockedUid).delete();
   ```

---

## Diagrama de Estados do Convite

```
                    ┌─────────┐
        Enviar ────►│ PENDING │
                    └────┬────┘
                         │
              ┌──────────┴──────────┐
              │                     │
        Aceitar                  Recusar
              │                     │
              ▼                     ▼
        ┌──────────┐         ┌──────────┐
        │ ACCEPTED │         │ REJECTED │
        └──────────┘         └──────────┘
              │
              ▼
     Cria relação de contato
     (contacts/ + contactOf/)
```

---

## Badge de Convites Pendentes

Na HomeScreen, o ícone de navegação para Convites exibe um badge (bolinha vermelha) quando há convites pendentes:

```typescript
// Real-time listener para count de pendentes
firestore.collection('invites')
  .where('toUid', '==', currentUid)
  .where('status', '==', 'pending')
  .onSnapshot((snap) => {
    setPendingCount(snap.size);
  });
```
