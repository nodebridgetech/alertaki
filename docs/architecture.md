# Alertaki — Arquitetura e Estrutura do Projeto

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE (Mobile)                       │
│              React Native + TypeScript                    │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐              │
│  │  Screens  │  │  Stores  │  │ Services  │              │
│  │  (React   │  │ (Zustand)│  │ (Firebase │              │
│  │   Nav)    │  │          │  │  SDK)     │              │
│  └──────────┘  └──────────┘  └───────────┘              │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   FIREBASE SERVICES                       │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐ │
│  │ Firestore │  │   Auth   │  │    FCM    │  │Storage │ │
│  │ Database  │  │  Google  │  │   Push    │  │ Fotos  │ │
│  │          │  │  Email   │  │Notifications│ │        │ │
│  │          │  │  Apple   │  │           │  │        │ │
│  └──────────┘  └──────────┘  └───────────┘  └────────┘ │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              Cloud Functions (TypeScript)              │ │
│  │  - onAlertCreated: notifica contatos + próximos       │ │
│  │  - onInviteCreated: notifica destinatário             │ │
│  │  - onInviteAccepted: cria relação de contato          │ │
│  │  - onAccountDeleted: limpa dados do usuário           │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Estrutura do Monorepo

```
alertaki/
├── apps/
│   └── mobile/                    # React Native App
│       ├── src/
│       │   ├── screens/           # Telas do app
│       │   │   ├── auth/          # Login, Register
│       │   │   ├── home/          # Tela inicial (3 botões)
│       │   │   ├── alerts/        # Histórico, overlay
│       │   │   ├── contacts/      # Contatos, convites, bloqueios
│       │   │   ├── emergency/     # Tela intermediária emergência
│       │   │   └── profile/       # Perfil, configurações
│       │   ├── components/        # Componentes reutilizáveis
│       │   ├── services/          # Firebase services (auth, firestore, fcm, storage)
│       │   ├── stores/            # Zustand stores
│       │   ├── hooks/             # Custom hooks
│       │   ├── navigation/        # React Navigation config
│       │   ├── utils/             # Helpers (geocoding, maps, phone)
│       │   ├── types/             # TypeScript types/interfaces
│       │   └── config/            # Constantes, Firebase config
│       ├── android/               # Android native
│       ├── ios/                   # iOS native
│       ├── app.json
│       ├── babel.config.js
│       ├── metro.config.js
│       ├── tsconfig.json
│       └── package.json
│
├── functions/                     # Firebase Cloud Functions
│   ├── src/
│   │   ├── alerts/                # Funções de alertas
│   │   │   └── onAlertCreated.ts
│   │   ├── invites/               # Funções de convites
│   │   │   ├── onInviteCreated.ts
│   │   │   └── onInviteAccepted.ts
│   │   ├── users/                 # Funções de usuários
│   │   │   └── onAccountDeleted.ts
│   │   ├── utils/                 # Helpers (haversine, tokens)
│   │   └── index.ts               # Export de todas as functions
│   ├── tsconfig.json
│   └── package.json
│
├── packages/
│   └── shared/                    # Tipos e constantes compartilhados
│       ├── src/
│       │   ├── types/             # Interfaces compartilhadas
│       │   │   ├── user.ts
│       │   │   ├── alert.ts
│       │   │   ├── invite.ts
│       │   │   └── contact.ts
│       │   ├── constants/         # Constantes compartilhadas
│       │   │   ├── alertTypes.ts
│       │   │   └── emergencyNumbers.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── docs/                          # Documentação
│   ├── discovery.md
│   ├── architecture.md
│   ├── data-model.md
│   ├── auth-flow.md
│   ├── alerts-flow.md
│   ├── contacts-flow.md
│   ├── notifications.md
│   ├── screens.md
│   ├── profile-account.md
│   ├── privacy-policy.md
│   ├── cloud-functions.md
│   └── implementation-prompt.md
│
├── firebase.json                  # Config do Firebase
├── .firebaserc                    # Projeto Firebase
├── firestore.rules                # Regras de segurança Firestore
├── firestore.indexes.json         # Índices compostos
├── storage.rules                  # Regras do Firebase Storage
├── package.json                   # Root (workspaces)
├── tsconfig.base.json             # TypeScript base config
└── README.md
```

---

## Stack Tecnológica

### Mobile (React Native)

| Biblioteca                                     | Propósito                                   |
| ---------------------------------------------- | ------------------------------------------- |
| `react-native` (0.76+)                         | Framework mobile                            |
| `typescript` (5.x)                             | Tipagem estática                            |
| `@react-navigation/native`                     | Navegação entre telas                       |
| `@react-navigation/bottom-tabs`                | Tabs (histórico enviados/recebidos)         |
| `@react-navigation/native-stack`               | Stack navigation                            |
| `zustand`                                      | State management                            |
| `@react-native-firebase/app`                   | Firebase core                               |
| `@react-native-firebase/auth`                  | Autenticação                                |
| `@react-native-firebase/firestore`             | Banco de dados                              |
| `@react-native-firebase/messaging`             | Push notifications                          |
| `@react-native-firebase/storage`               | Upload de fotos                             |
| `@react-native-google-signin/google-signin`    | Google Sign-In                              |
| `@invertase/react-native-apple-authentication` | Apple Sign-In                               |
| `react-native-geolocation-service`             | GPS                                         |
| `react-native-background-fetch`                | Background location updates                 |
| `react-native-permissions`                     | Permissões                                  |
| `react-native-image-picker`                    | Seleção/captura de foto                     |
| `react-native-maps`                            | Exibição de mapa (se necessário)            |
| `notifee`                                      | Notificações locais avançadas (full-screen) |
| `react-native-url-launcher` ou `Linking`       | Abrir maps/telefone                         |

### Backend (Cloud Functions)

| Biblioteca                | Propósito                        |
| ------------------------- | -------------------------------- |
| `firebase-functions` (v6) | Cloud Functions framework        |
| `firebase-admin`          | Admin SDK (Firestore, FCM, Auth) |
| `typescript`              | Tipagem                          |

### Ferramentas de Build

| Ferramenta                      | Propósito             |
| ------------------------------- | --------------------- |
| `yarn` ou `npm` workspaces      | Monorepo management   |
| `jest`                          | Testes unitários      |
| `@testing-library/react-native` | Testes de componentes |
| `eslint` + `prettier`           | Linting e formatação  |
| `husky` + `lint-staged`         | Git hooks             |

---

## Padrões Arquiteturais

### Services Layer

Cada serviço Firebase é encapsulado em uma classe/módulo:

- `AuthService` — login, logout, registro, estado de autenticação
- `AlertService` — criar e consultar alertas
- `ContactService` — convites, aceitar/recusar, bloquear/desbloquear
- `NotificationService` — configuração FCM, handlers de notificação
- `LocationService` — GPS, background updates, reverse geocoding
- `StorageService` — upload/download de fotos
- `UserService` — CRUD do perfil

### Stores (Zustand)

- `useAuthStore` — estado de autenticação, dados do usuário logado
- `useAlertStore` — alertas enviados/recebidos, loading states
- `useContactStore` — contatos, convites pendentes, bloqueados
- `useLocationStore` — localização atual, permissões

### Navegação

```
Root (Auth Gate)
├── AuthStack (não autenticado)
│   ├── LoginScreen
│   └── RegisterScreen
│
└── MainStack (autenticado)
    ├── HomeScreen (3 botões de alerta)
    ├── EmergencyScreen (seleção de contatos + mensagem)
    ├── AlertOverlayScreen (tela cheia do alerta recebido)
    ├── AlertHistoryScreen (abas: enviados / recebidos)
    ├── ContactsScreen
    │   ├── MyContactsTab (meus contatos)
    │   └── ContactOfTab (de quem sou contato)
    ├── InvitesScreen (convites pendentes)
    ├── BlockedUsersScreen
    └── ProfileScreen (dados + edição + deletar conta)
```

---

## Comunicação em Tempo Real

O Firestore provê **listeners em tempo real** (onSnapshot) para:

- Lista de convites pendentes (badge no app bar).
- Lista de contatos de segurança.
- Histórico de alertas recebidos.

Alertas são entregues primariamente via **push notification** (FCM), não via Firestore listeners, para garantir entrega mesmo com o app fechado.

---

## Considerações de Segurança

1. **Firestore Security Rules**: Cada documento só pode ser lido/escrito pelo usuário autorizado.
2. **Cloud Functions**: Lógica sensível (envio de notificações, criação de relações) roda no servidor.
3. **Dados de localização**: Armazenados com acesso restrito.
4. **Bloqueios**: Verificados no Cloud Function antes de enviar notificações.
5. **Firebase Storage**: Rules limitam upload à pasta do próprio usuário.
