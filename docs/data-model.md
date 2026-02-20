# Alertaki — Modelo de Dados (Firestore)

## Visão Geral das Collections

```
Firestore
├── users/{uid}
│   ├── contacts/{contactUid}       (subcollection)
│   ├── contactOf/{ownerUid}        (subcollection)
│   └── blockedUsers/{blockedUid}   (subcollection)
├── alerts/{alertId}
│   └── recipients/{recipientUid}   (subcollection)
├── invites/{inviteId}
└── (índices compostos definidos em firestore.indexes.json)
```

---

## Collection: `users`

Armazena os dados de perfil e tokens de cada usuário.

```typescript
interface User {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string | null;
  photoURL: string | null;        // URL da foto (Google ou Firebase Storage)

  // FCM tokens (múltiplos dispositivos)
  tokens: string[];
  tokenUpdatedAt: Timestamp;

  // Localização (atualizada a cada 1h em background)
  lastLocation: {
    lat: number;
    lng: number;
  } | null;
  locationUpdatedAt: Timestamp | null;

  // Metadados
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Subcollection: `users/{uid}/contacts/{contactUid}`

Contatos de segurança do usuário (quem ele convidou e aceitou).

```typescript
interface Contact {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  addedAt: Timestamp;
}
```

### Subcollection: `users/{uid}/contactOf/{ownerUid}`

Registro de quem adicionou este usuário como contato de segurança. Permite a visualização "de quem eu sou contato". Criado automaticamente pelo Cloud Function ao aceitar um convite.

```typescript
interface ContactOf {
  ownerUid: string;           // UID do dono da lista de contatos
  ownerDisplayName: string;
  ownerEmail: string;
  ownerPhotoURL: string | null;
  addedAt: Timestamp;
}
```

### Subcollection: `users/{uid}/blockedUsers/{blockedUid}`

Usuários bloqueados por este usuário.

```typescript
interface BlockedUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  blockedAt: Timestamp;
}
```

---

## Collection: `alerts`

Armazena cada alerta disparado.

```typescript
interface Alert {
  id: string;                     // auto-generated

  // Remetente
  userId: string;                 // UID de quem enviou
  userName: string;               // Nome (preenchido pela Cloud Function)
  userEmail: string;
  userPhotoURL: string | null;

  // Tipo
  type: 'health' | 'security' | 'custom';

  // Localização no momento do alerta
  lat: number;
  lng: number;
  address: string | null;         // Endereço (reverse geocoding, preenchido pela CF)

  // Dados específicos
  radiusKm: number;               // 5 (para health/security), 0 (para custom)
  customMessage: string | null;   // Apenas para type='custom'

  // Metadados
  createdAt: Timestamp;
}
```

### Subcollection: `alerts/{alertId}/recipients/{recipientUid}`

Registra quem recebeu cada alerta. Necessário para o histórico de "recebidos".

```typescript
interface AlertRecipient {
  uid: string;
  receivedAt: Timestamp;
  source: 'contact' | 'proximity';  // Como foi incluído
}
```

---

## Collection: `invites`

Armazena convites de contato de segurança.

```typescript
interface Invite {
  id: string;                     // auto-generated

  // Remetente
  fromUid: string;
  fromEmail: string;
  fromDisplayName: string;
  fromPhotoURL: string | null;

  // Destinatário
  toUid: string;
  toEmail: string;

  // Status
  status: 'pending' | 'accepted' | 'rejected';

  // Metadados
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Índices Compostos Necessários

```json
{
  "indexes": [
    {
      "collectionGroup": "alerts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "recipients",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "uid", "order": "ASCENDING" },
        { "fieldPath": "receivedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "invites",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "toUid", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "locationUpdatedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## Firestore Security Rules (Resumo)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: leitura do próprio perfil, escrita do próprio perfil
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;

      // Contacts: leitura própria, escrita via Cloud Function
      match /contacts/{contactId} {
        allow read: if request.auth.uid == uid;
        allow delete: if request.auth.uid == uid;
        allow create, update: if false; // apenas via Cloud Function
      }

      // ContactOf: leitura própria
      match /contactOf/{ownerId} {
        allow read: if request.auth.uid == uid;
        allow write: if false; // apenas via Cloud Function
      }

      // Blocked: leitura e escrita própria
      match /blockedUsers/{blockedId} {
        allow read, write: if request.auth.uid == uid;
      }
    }

    // Alerts: criação pelo autor, leitura por envolvidos
    match /alerts/{alertId} {
      allow create: if request.auth.uid == request.resource.data.userId;
      allow read: if request.auth != null;

      match /recipients/{recipientId} {
        allow read: if request.auth.uid == recipientId;
        allow write: if false; // apenas via Cloud Function
      }
    }

    // Invites: criação pelo remetente, leitura/update pelo destinatário
    match /invites/{inviteId} {
      allow create: if request.auth.uid == request.resource.data.fromUid;
      allow read: if request.auth.uid == resource.data.fromUid
                  || request.auth.uid == resource.data.toUid;
      allow update: if request.auth.uid == resource.data.toUid;
    }
  }
}
```

---

## Diagrama de Relacionamentos

```
┌──────────────────┐
│      users       │
│  /{uid}          │
├──────────────────┤
│ displayName      │
│ email            │       ┌───────────────────┐
│ tokens[]         │       │     invites        │
│ lastLocation     │◄──────│  /{inviteId}       │
│                  │       ├───────────────────┤
│  contacts/       │       │ fromUid ──► users  │
│    /{contactUid} │       │ toUid ──► users    │
│                  │       │ status             │
│  contactOf/      │       └───────────────────┘
│    /{ownerUid}   │
│                  │       ┌───────────────────┐
│  blockedUsers/   │       │     alerts         │
│    /{blockedUid} │       │  /{alertId}        │
│                  │       ├───────────────────┤
└──────────────────┘       │ userId ──► users   │
                           │ type               │
                           │ lat, lng           │
                           │                   │
                           │  recipients/       │
                           │    /{recipientUid} │
                           └───────────────────┘
```

---

## Notas sobre Consultas

### Histórico de alertas enviados
```typescript
// Query simples pelo userId
firestore.collection('alerts')
  .where('userId', '==', currentUid)
  .orderBy('createdAt', 'desc')
```

### Histórico de alertas recebidos
```typescript
// Collection group query na subcollection recipients
firestore.collectionGroup('recipients')
  .where('uid', '==', currentUid)
  .orderBy('receivedAt', 'desc')
```
Depois, para cada recipient, buscar o documento pai (alert) para exibir os detalhes.

### Usuários próximos (Cloud Function)
```typescript
// Buscar usuários com localização recente e calcular distância Haversine
firestore.collection('users')
  .where('locationUpdatedAt', '!=', null)
  .orderBy('locationUpdatedAt', 'desc')
  .limit(500)
// Filtrar por distância no código da Cloud Function
```

### De quem sou contato
```typescript
// Subcollection contactOf do usuário
firestore.collection('users').doc(currentUid)
  .collection('contactOf')
  .orderBy('addedAt', 'desc')
```
