# Alertaki — Cloud Functions (Backend)

## Visão Geral

O backend do Alertaki é composto por **Firebase Cloud Functions v2** escritas em TypeScript. As functions são acionadas por triggers do Firestore (document create/update) e por chamadas HTTPS (callable functions).

---

## Lista de Cloud Functions

| Function               | Trigger                                   | Propósito                                       |
| ---------------------- | ----------------------------------------- | ----------------------------------------------- |
| `onAlertCreated`       | `onDocumentCreated('alerts/{alertId}')`   | Processar alerta: notificar contatos e próximos |
| `onInviteCreated`      | `onDocumentCreated('invites/{inviteId}')` | Notificar destinatário do convite               |
| `onInviteAccepted`     | `onDocumentUpdated('invites/{inviteId}')` | Criar relação de contato bidirecional           |
| `deleteUserAccount`    | `onCall` (HTTPS Callable)                 | Deletar conta e limpar dados (LGPD)             |
| `cleanupExpiredTokens` | `onSchedule('every 24 hours')`            | Limpar tokens FCM expirados (opcional)          |

---

## Function 1: `onAlertCreated`

**Trigger**: Quando um novo documento é criado em `alerts/{alertId}`.

### Fluxo Completo

```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export const onAlertCreated = onDocumentCreated('alerts/{alertId}', async (event) => {
  const alertId = event.params.alertId;
  const alertData = event.data?.data();
  if (!alertData) return;

  const db = getFirestore();
  const messaging = getMessaging();

  // 1. Buscar dados do remetente
  const senderDoc = await db.collection('users').doc(alertData.userId).get();
  const sender = senderDoc.data();

  // 2. Atualizar alerta com dados do remetente
  await event.data.ref.update({
    userName: sender?.displayName || 'Usuário',
    userPhotoURL: sender?.photoURL || null,
  });

  // 3. Determinar destinatários
  let recipientUids: Set<string> = new Set();

  if (alertData.type === 'custom') {
    // Alerta personalizado: apenas contatos selecionados
    for (const uid of alertData.selectedContacts || []) {
      recipientUids.add(uid);
    }
  } else {
    // Saúde/Segurança: contatos + próximos

    // 3a. Buscar contatos de segurança
    const contactsSnap = await db
      .collection('users')
      .doc(alertData.userId)
      .collection('contacts')
      .get();

    contactsSnap.forEach((doc) => recipientUids.add(doc.id));

    // 3b. Buscar usuários próximos (raio de 5km)
    const nearbyUsers = await findNearbyUsers(
      db,
      alertData.lat,
      alertData.lng,
      alertData.radiusKm || 5,
    );

    nearbyUsers.forEach((uid) => recipientUids.add(uid));
  }

  // Remover o próprio remetente
  recipientUids.delete(alertData.userId);

  if (recipientUids.size === 0) return;

  // 4. Verificar bloqueios e coletar tokens
  const validRecipients: string[] = [];
  const allTokens: string[] = [];
  const tokenToUid: Map<string, string> = new Map();

  for (const uid of recipientUids) {
    // Verificar se o destinatário bloqueou o remetente
    const blockedDoc = await db
      .collection('users')
      .doc(uid)
      .collection('blockedUsers')
      .doc(alertData.userId)
      .get();

    if (blockedDoc.exists) continue; // Bloqueado, pular

    validRecipients.push(uid);

    // Buscar tokens do destinatário
    const userDoc = await db.collection('users').doc(uid).get();
    const tokens = userDoc.data()?.tokens || [];
    tokens.forEach((token: string) => {
      allTokens.push(token);
      tokenToUid.set(token, uid);
    });
  }

  // 5. Criar registros de recipients
  const batch = db.batch();
  for (const uid of validRecipients) {
    const recipientRef = db.collection('alerts').doc(alertId).collection('recipients').doc(uid);

    batch.set(recipientRef, {
      uid,
      receivedAt: FieldValue.serverTimestamp(),
      source: contactsSnap?.docs.some((d) => d.id === uid) ? 'contact' : 'proximity',
    });
  }
  await batch.commit();

  // 6. Resolver endereço (reverse geocoding)
  const address = await reverseGeocode(alertData.lat, alertData.lng);
  await event.data.ref.update({ address });

  // 7. Construir e enviar notificação
  const title = getAlertTitle(alertData.type);
  const body = getAlertBody(alertData.type, sender?.displayName, alertData.customMessage);

  // Enviar em chunks de 100
  const chunks = chunkArray(allTokens, 100);
  const invalidTokens: string[] = [];

  for (const chunk of chunks) {
    const response = await messaging.sendEachForMulticast({
      tokens: chunk,
      notification: { title, body },
      data: {
        alertId,
        type: alertData.type,
        userId: alertData.userId,
        userName: sender?.displayName || 'Usuário',
        userPhotoURL: sender?.photoURL || '',
        lat: String(alertData.lat),
        lng: String(alertData.lng),
        address: address || 'Endereço indisponível',
        customMessage: alertData.customMessage || '',
        fullscreen: '1',
      },
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'alert_channel',
          visibility: 'public' as const,
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            'interruption-level': 'critical',
            'content-available': 1,
          },
        },
      },
    });

    // Identificar tokens inválidos
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
        invalidTokens.push(chunk[idx]);
      }
    });
  }

  // 8. Limpar tokens inválidos
  for (const token of invalidTokens) {
    const uid = tokenToUid.get(token);
    if (uid) {
      await db
        .collection('users')
        .doc(uid)
        .update({
          tokens: FieldValue.arrayRemove(token),
        });
    }
  }
});
```

### Funções auxiliares

```typescript
// Título por tipo de alerta
function getAlertTitle(type: string): string {
  switch (type) {
    case 'health':
      return '🏥 Alerta de Saúde!';
    case 'security':
      return '🛡️ Alerta de Segurança!';
    case 'custom':
      return '⚠️ Alerta de Emergência!';
    default:
      return '🚨 Alerta!';
  }
}

// Body por tipo de alerta
function getAlertBody(type: string, name?: string, message?: string): string {
  const userName = name || 'Alguém';
  switch (type) {
    case 'health':
      return `${userName} precisa de ajuda médica! Toque para ver a localização.`;
    case 'security':
      return `${userName} está em perigo! Toque para ver a localização.`;
    case 'custom':
      return message
        ? `${userName}: ${message.substring(0, 100)}`
        : `${userName} enviou um alerta de emergência!`;
    default:
      return `${userName} enviou um alerta!`;
  }
}

// Buscar usuários próximos usando Haversine
async function findNearbyUsers(
  db: FirebaseFirestore.Firestore,
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<string[]> {
  const snapshot = await db
    .collection('users')
    .where('locationUpdatedAt', '!=', null)
    .orderBy('locationUpdatedAt', 'desc')
    .limit(500)
    .get();

  const nearbyUids: string[] = [];

  snapshot.forEach((doc) => {
    const userData = doc.data();
    if (userData.lastLocation) {
      const distance = haversineDistance(
        lat,
        lng,
        userData.lastLocation.lat,
        userData.lastLocation.lng,
      );
      if (distance <= radiusKm) {
        nearbyUids.push(doc.id);
      }
    }
  });

  return nearbyUids;
}

// Fórmula de Haversine (distância entre dois pontos em km)
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Reverse geocoding (usar Google Geocoding API ou alternativa)
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=pt-BR`,
    );
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    return null;
  } catch {
    return null;
  }
}

// Utilidade para dividir array em chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

---

## Function 2: `onInviteCreated`

**Trigger**: Quando um novo documento é criado em `invites/{inviteId}`.

```typescript
export const onInviteCreated = onDocumentCreated('invites/{inviteId}', async (event) => {
  const invite = event.data?.data();
  if (!invite) return;

  const db = getFirestore();
  const messaging = getMessaging();

  // Buscar tokens do destinatário
  const toUserDoc = await db.collection('users').doc(invite.toUid).get();
  const tokens = toUserDoc.data()?.tokens || [];

  if (tokens.length === 0) return;

  // Enviar push notification
  await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: 'Novo convite de segurança',
      body: `${invite.fromDisplayName || invite.fromEmail} quer adicioná-lo como contato de segurança`,
    },
    data: {
      screen: 'invites',
      inviteId: event.params.inviteId,
      fromUid: invite.fromUid,
      fromEmail: invite.fromEmail,
    },
    android: {
      notification: {
        channelId: 'invite_channel',
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          'interruption-level': 'time-sensitive',
        },
      },
    },
  });
});
```

---

## Function 3: `onInviteAccepted`

**Trigger**: Quando um documento em `invites/{inviteId}` é atualizado.

```typescript
export const onInviteAccepted = onDocumentUpdated('invites/{inviteId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;

  // Só processar quando status muda para 'accepted'
  if (before.status === 'accepted' || after.status !== 'accepted') return;

  const db = getFirestore();

  // Buscar dados dos dois usuários
  const [fromUserDoc, toUserDoc] = await Promise.all([
    db.collection('users').doc(after.fromUid).get(),
    db.collection('users').doc(after.toUid).get(),
  ]);

  const fromUser = fromUserDoc.data();
  const toUser = toUserDoc.data();

  if (!fromUser || !toUser) return;

  const batch = db.batch();

  // 1. Adicionar o destinatário como contato do remetente
  // (quem aceitou vira contato de quem convidou)
  const contactRef = db
    .collection('users')
    .doc(after.fromUid)
    .collection('contacts')
    .doc(after.toUid);

  batch.set(contactRef, {
    uid: after.toUid,
    displayName: toUser.displayName,
    email: toUser.email,
    photoURL: toUser.photoURL || null,
    addedAt: FieldValue.serverTimestamp(),
  });

  // 2. Registrar no destinatário que ele é contato do remetente
  const contactOfRef = db
    .collection('users')
    .doc(after.toUid)
    .collection('contactOf')
    .doc(after.fromUid);

  batch.set(contactOfRef, {
    ownerUid: after.fromUid,
    ownerDisplayName: fromUser.displayName,
    ownerEmail: fromUser.email,
    ownerPhotoURL: fromUser.photoURL || null,
    addedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
});
```

---

## Function 4: `deleteUserAccount`

**Trigger**: HTTPS Callable (chamada pelo cliente).

```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

export const deleteUserAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const db = getFirestore();
  const auth = getAuth();
  const storage = getStorage();

  try {
    // 1. Anonimizar alertas enviados
    const alertsSnap = await db.collection('alerts').where('userId', '==', uid).get();

    const alertBatch = db.batch();
    alertsSnap.forEach((doc) => {
      alertBatch.update(doc.ref, {
        userName: 'Usuário removido',
        userEmail: null,
        userPhotoURL: null,
      });
    });
    await alertBatch.commit();

    // 2. Remover de listas de contatos de outros usuários
    // Buscar onde este user é contato de alguém
    const contactOfSnap = await db.collection('users').doc(uid).collection('contactOf').get();

    for (const doc of contactOfSnap.docs) {
      const ownerUid = doc.data().ownerUid;
      // Remover dos contatos do owner
      await db.collection('users').doc(ownerUid).collection('contacts').doc(uid).delete();
    }

    // Buscar onde este user tem outros como contatos
    const contactsSnap = await db.collection('users').doc(uid).collection('contacts').get();

    for (const doc of contactsSnap.docs) {
      const contactUid = doc.id;
      // Remover o contactOf no outro usuário
      await db.collection('users').doc(contactUid).collection('contactOf').doc(uid).delete();
    }

    // 3. Deletar subcollections do user
    await deleteSubcollection(db, `users/${uid}/contacts`);
    await deleteSubcollection(db, `users/${uid}/contactOf`);
    await deleteSubcollection(db, `users/${uid}/blockedUsers`);

    // 4. Deletar recipients deste user
    const recipientsSnap = await db.collectionGroup('recipients').where('uid', '==', uid).get();

    const recipientBatch = db.batch();
    recipientsSnap.forEach((doc) => {
      recipientBatch.delete(doc.ref);
    });
    await recipientBatch.commit();

    // 5. Deletar convites
    const invitesFromSnap = await db.collection('invites').where('fromUid', '==', uid).get();
    const invitesToSnap = await db.collection('invites').where('toUid', '==', uid).get();

    const inviteBatch = db.batch();
    invitesFromSnap.forEach((doc) => inviteBatch.delete(doc.ref));
    invitesToSnap.forEach((doc) => inviteBatch.delete(doc.ref));
    await inviteBatch.commit();

    // 6. Deletar foto do Storage
    try {
      await storage.bucket().file(`profile_photos/${uid}.jpg`).delete();
    } catch {
      // Foto pode não existir, ignorar
    }

    // 7. Deletar documento do user
    await db.collection('users').doc(uid).delete();

    // 8. Deletar conta do Firebase Auth
    await auth.deleteUser(uid);

    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar conta:', error);
    throw new HttpsError('internal', 'Erro ao deletar conta.');
  }
});

// Helper para deletar subcollections
async function deleteSubcollection(db: FirebaseFirestore.Firestore, path: string) {
  const snap = await db.collection(path).get();
  const batch = db.batch();
  snap.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
```

---

## Configuração do Projeto

### `functions/package.json`

```json
{
  "name": "alertaki-functions",
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "deploy": "firebase deploy --only functions"
  },
  "engines": {
    "node": "22"
  },
  "dependencies": {
    "firebase-admin": "^12.6.0",
    "firebase-functions": "^6.0.1"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^22.0.0"
  }
}
```

### `functions/tsconfig.json`

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2022"
  },
  "compileOnSave": true,
  "include": ["src"]
}
```

---

## Variáveis de Ambiente

```
GOOGLE_MAPS_API_KEY=<chave para reverse geocoding>
```

Configurar via:

```bash
firebase functions:config:set google.maps_api_key="YOUR_KEY"
```

Ou usar `.env` com Cloud Functions v2:

```bash
# functions/.env
GOOGLE_MAPS_API_KEY=your_key_here
```

---

## Considerações de Performance

1. **Batch writes**: Usar batch operations para escritas múltiplas (recipients, cleanup).
2. **Limit 500**: A query de usuários próximos limita a 500 para evitar leitura excessiva.
3. **Chunks de 100**: FCM multicast aceita no máximo 500 tokens, mas dividimos em 100 para resiliência.
4. **Async/Await**: Usar `Promise.all` onde possível para paralelizar leituras.
5. **Cold start**: Cloud Functions v2 tem cold start. Para alertas críticos, considerar configurar `minInstances: 1` no `onAlertCreated`.
