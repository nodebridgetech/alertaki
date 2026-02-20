# Alertaki — Prompt de Implementação

## Como Usar Este Prompt

Este documento é o prompt principal para iniciar a implementação do projeto Alertaki com o Claude (Opus). O projeto já possui toda a documentação de requisitos, arquitetura e especificações no diretório `docs/`.

### Estratégia de Contexto

Para cada sessão de implementação, forneça ao Claude:

1. **Este prompt** (obrigatório em toda sessão).
2. **O documento específico** do que será implementado naquela sessão.
3. **O data-model.md** (obrigatório, pois é referência para todo o projeto).

Não carregue todos os documentos de uma vez. Use a tabela abaixo para saber qual doc enviar em cada fase.

---

## Tabela de Fases e Documentos

| Fase | O que implementar                                                   | Documentos necessários                            |
| ---- | ------------------------------------------------------------------- | ------------------------------------------------- |
| 1    | Setup do monorepo + Firebase                                        | `architecture.md`                                 |
| 2    | Autenticação (Google + Email + Apple)                               | `auth-flow.md` + `data-model.md`                  |
| 3    | Tela Home + Envio de Alertas (Saúde/Segurança)                      | `alerts-flow.md` + `screens.md` + `data-model.md` |
| 4    | Tela de Emergência (alerta personalizado)                           | `alerts-flow.md` + `screens.md` + `data-model.md` |
| 5    | Cloud Functions (onAlertCreated, onInviteCreated, onInviteAccepted) | `cloud-functions.md` + `data-model.md`            |
| 6    | Notificações + Overlay de alerta recebido                           | `notifications.md` + `alerts-flow.md`             |
| 7    | Contatos de segurança (convite, aceitar, recusar)                   | `contacts-flow.md` + `data-model.md`              |
| 8    | Bloqueio/Desbloqueio                                                | `contacts-flow.md` + `data-model.md`              |
| 9    | Histórico de alertas (enviados/recebidos)                           | `alerts-flow.md` + `screens.md` + `data-model.md` |
| 10   | Perfil + Edição + Upload de foto                                    | `profile-account.md` + `screens.md`               |
| 11   | Exclusão de conta (LGPD)                                            | `profile-account.md` + `cloud-functions.md`       |
| 12   | Localização em background                                           | `notifications.md` + `data-model.md`              |
| 13   | Política de privacidade (tela)                                      | `privacy-policy.md`                               |
| 14   | Testes + Polishing                                                  | Todos                                             |

---

## Prompt Base (Copie e use no início de cada sessão)

```
Você é um engenheiro sênior de React Native e Firebase. Estamos construindo o **Alertaki**, um app mobile (Android + iOS) de botão do pânico/emergência.

## Contexto do Projeto

O Alertaki permite que usuários enviem 3 tipos de alerta de emergência:
1. **Saúde** → notifica contatos de segurança + usuários próximos (5km), discagem rápida SAMU (192)
2. **Segurança** → notifica contatos de segurança + usuários próximos (5km), discagem rápida Polícia (190)
3. **Emergência** → notifica apenas contatos selecionados com mensagem personalizada

Os alertas são recebidos como push notifications com sobreposição de tela cheia (estilo despertador), vibração contínua e som padrão do dispositivo.

## Stack Tecnológica
- **Mobile**: React Native (0.76+) + TypeScript
- **Backend**: Firebase Cloud Functions v2 (TypeScript)
- **Banco de Dados**: Cloud Firestore
- **Auth**: Firebase Auth (Google + Email/Senha + Apple Sign-In)
- **Storage**: Firebase Storage (fotos de perfil)
- **Push**: Firebase Cloud Messaging (FCM) + Notifee
- **State Management**: Zustand
- **Navegação**: React Navigation
- **Monorepo**: apps/mobile/ + functions/ + packages/shared/

## Regras de Implementação

1. **Idioma do código**: Código, variáveis e comentários em **inglês**. UI strings em **português (pt-BR)**.
2. **TypeScript strict**: Sem `any`. Types explícitos em todas as interfaces.
3. **Componentes funcionais**: Apenas functional components com hooks.
4. **Separação de responsabilidades**: Services para Firebase, Stores para estado, Hooks para lógica reutilizável.
5. **Error handling**: Todos os try/catch com mensagens amigáveis em pt-BR para o usuário.
6. **Simplicidade**: Design minimalista. Sem over-engineering. Sem libraries desnecessárias.
7. **Segurança**: Firestore rules restritivas. Validação no Cloud Function antes de enviar notificações.
8. **Sem mocks/stubs**: Implemente a funcionalidade real, não placeholders.

## Estrutura do Projeto

```

alertaki/
├── apps/mobile/src/
│ ├── screens/ # Telas organizadas por feature
│ ├── components/ # Componentes reutilizáveis
│ ├── services/ # Firebase services
│ ├── stores/ # Zustand stores
│ ├── hooks/ # Custom hooks
│ ├── navigation/ # React Navigation config
│ ├── utils/ # Helpers
│ ├── types/ # TypeScript interfaces
│ └── config/ # Constantes, Firebase config
├── functions/src/ # Cloud Functions
├── packages/shared/src/ # Types e constantes compartilhados
└── docs/ # Documentação

```

## Documentação de Referência

O diretório `docs/` contém toda a especificação do projeto:
- `discovery.md` — Requisitos completos
- `architecture.md` — Arquitetura e estrutura
- `data-model.md` — Schema do Firestore (SEMPRE consulte este)
- `auth-flow.md` — Fluxos de autenticação
- `alerts-flow.md` — Fluxos de envio/recebimento de alertas
- `contacts-flow.md` — Sistema de contatos de segurança
- `notifications.md` — Push notifications e overlay
- `screens.md` — Especificação visual das telas
- `profile-account.md` — Perfil e exclusão de conta
- `cloud-functions.md` — Especificação do backend
- `privacy-policy.md` — Política de privacidade

Consulte os documentos relevantes para a tarefa atual. O `data-model.md` é referência obrigatória para qualquer implementação que envolva Firestore.

---

**TAREFA DA SESSÃO**: [Descreva aqui o que será implementado nesta sessão, referenciando a fase da tabela acima]
```

---

## Prompts Específicos por Fase

### Fase 1 — Setup do Monorepo

```
TAREFA DA SESSÃO: Fase 1 — Setup do monorepo e configuração inicial do Firebase.

Leia o arquivo docs/architecture.md para a estrutura completa.

Faça:
1. Inicialize o monorepo com a estrutura definida em architecture.md
2. Crie o projeto React Native em apps/mobile/ com TypeScript
3. Configure o Firebase (firebase.json, .firebaserc)
4. Configure o projeto Cloud Functions em functions/
5. Crie o package shared em packages/shared/ com os types base
6. Configure ESLint, Prettier e tsconfig base
7. Configure os scripts de build no package.json root
8. Crie o firestore.rules e storage.rules conforme data-model.md

NÃO instale dependências que não serão usadas nesta fase.
```

### Fase 2 — Autenticação

```
TAREFA DA SESSÃO: Fase 2 — Implementar autenticação completa.

Leia os arquivos docs/auth-flow.md e docs/data-model.md.

Faça:
1. Configure @react-native-firebase/auth
2. Configure @react-native-google-signin/google-signin
3. Configure @invertase/react-native-apple-authentication
4. Implemente o AuthService (services/authService.ts)
5. Implemente o useAuthStore (stores/authStore.ts)
6. Crie as telas: SplashScreen, LoginScreen, RegisterScreen
7. Configure a navegação: AuthStack vs MainStack baseado no auth state
8. Implemente o upsert de usuário no Firestore ao fazer login
9. Implemente o fluxo de recuperação de senha
10. Trate todos os erros de autenticação com mensagens em pt-BR
```

### Fase 3 — Home + Alertas de Saúde/Segurança

```
TAREFA DA SESSÃO: Fase 3 — Implementar HomeScreen e envio de alertas de saúde e segurança.

Leia docs/alerts-flow.md, docs/screens.md e docs/data-model.md.

Faça:
1. Crie a HomeScreen com os 3 botões de alerta (layout conforme screens.md)
2. Configure react-native-geolocation-service
3. Implemente o AlertService (services/alertService.ts)
4. Implemente o fluxo de envio de alerta de saúde (GPS → Firestore → discagem 192)
5. Implemente o fluxo de envio de alerta de segurança (GPS → Firestore → discagem 190)
6. Adicione dialog de confirmação antes do envio
7. Configure a Bottom Tab Navigation (Home, Histórico, Contatos, Perfil)
8. Trate erros de GPS (desabilitado, sem permissão, timeout)
```

### Fase 5 — Cloud Functions

```
TAREFA DA SESSÃO: Fase 5 — Implementar Cloud Functions do backend.

Leia docs/cloud-functions.md e docs/data-model.md.

Faça:
1. Implemente onAlertCreated: buscar contatos, buscar próximos (Haversine), verificar bloqueios, criar recipients, reverse geocoding, enviar FCM
2. Implemente onInviteCreated: notificar destinatário
3. Implemente onInviteAccepted: criar relação contacts + contactOf
4. Configure os índices compostos do Firestore (firestore.indexes.json)
5. Configure variáveis de ambiente (Google Maps API Key)
6. Teste localmente com Firebase Emulator

Use TypeScript strict. Sem any. Error handling em todas as functions.
```

---

## Notas Importantes para o Claude

1. **Leia os docs**: Antes de implementar qualquer coisa, leia os documentos relevantes no diretório `docs/`. Eles contêm todas as decisões já tomadas.

2. **Não invente requisitos**: Implemente exatamente o que está documentado. Se algo não estiver claro, pergunte.

3. **Data model é lei**: O schema do Firestore em `data-model.md` é a fonte de verdade. Siga-o exatamente.

4. **Uma fase por vez**: Não tente implementar tudo de uma vez. Siga as fases na ordem.

5. **Teste em device real**: Push notifications, GPS e full-screen intent só funcionam corretamente em dispositivos físicos.

6. **Apple Sign-In é obrigatório**: Mesmo que o usuário não tenha pedido explicitamente, é exigência da Apple para apps com login social. Já está documentado.

7. **Performance da Cloud Function `onAlertCreated`**: É a function mais crítica. Considere configurar `minInstances: 1` para evitar cold start em alertas de emergência.
