# Alertaki — Especificação de Telas

## Mapa de Navegação

```
App Entry
│
├── SplashScreen (verificando auth)
│
├── AuthStack (não autenticado)
│   ├── LoginScreen
│   └── RegisterScreen
│
└── MainStack (autenticado)
    ├── HomeScreen ← Tab principal
    │   └── EmergencyScreen (modal)
    │
    ├── AlertHistoryScreen ← Tab
    │   ├── SentAlertsTab
    │   └── ReceivedAlertsTab
    │
    ├── ContactsScreen ← Tab
    │   ├── MyContactsTab
    │   └── ContactOfTab
    │
    ├── ProfileScreen ← Tab
    │
    ├── InvitesScreen (push navigation)
    ├── BlockedUsersScreen (push navigation)
    ├── EditProfileScreen (push navigation)
    │
    └── AlertOverlayScreen (modal fullscreen, via notificação)
```

---

## Bottom Tab Navigation

| Tab | Ícone | Label | Tela |
|-----|-------|-------|------|
| 1 | 🏠 Home | Início | HomeScreen |
| 2 | 📋 History | Histórico | AlertHistoryScreen |
| 3 | 👥 Contacts | Contatos | ContactsScreen |
| 4 | 👤 Profile | Perfil | ProfileScreen |

---

## Tela 1: SplashScreen

**Propósito**: Verificar estado de autenticação ao abrir o app.

```
┌──────────────────────────┐
│                          │
│                          │
│                          │
│        [Logo Alertaki]   │
│                          │
│        Carregando...     │
│                          │
│                          │
│                          │
└──────────────────────────┘
```

- Exibe logo e indicador de loading.
- Verifica `firebase.auth().onAuthStateChanged`.
- Redireciona para AuthStack ou MainStack.

---

## Tela 2: LoginScreen

**Propósito**: Login do usuário.

```
┌──────────────────────────┐
│                          │
│        [Logo Alertaki]   │
│                          │
│  ┌──────────────────────┐│
│  │ Email                ││
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │ Senha                ││
│  └──────────────────────┘│
│                          │
│  Esqueci minha senha     │
│                          │
│  ┌──────────────────────┐│
│  │      Entrar           ││
│  └──────────────────────┘│
│                          │
│  ─── ou ────             │
│                          │
│  ┌──────────────────────┐│
│  │  G  Entrar com Google ││
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │  🍎 Entrar com Apple  ││  ← apenas iOS
│  └──────────────────────┘│
│                          │
│  Não tem conta? Cadastre-│
│  se                      │
└──────────────────────────┘
```

**Elementos**:
- Logo do Alertaki no topo.
- Campos de email e senha.
- Link "Esqueci minha senha" → abre dialog para enviar email de reset.
- Botão "Entrar" (email/senha).
- Divisor "ou".
- Botão "Entrar com Google" (ícone do Google).
- Botão "Entrar com Apple" (apenas no iOS, ícone da Apple).
- Link "Não tem conta? Cadastre-se" → navega para RegisterScreen.

---

## Tela 3: RegisterScreen

**Propósito**: Criar conta com email e senha.

```
┌──────────────────────────┐
│  ← Voltar                │
│                          │
│  Criar Conta             │
│                          │
│  ┌──────────────────────┐│
│  │ Nome completo        ││
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │ Email                ││
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │ Telefone (opcional)  ││
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │ Senha                ││
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │ Confirmar senha      ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │     Criar Conta       ││
│  └──────────────────────┘│
└──────────────────────────┘
```

**Validações**:
- Nome: obrigatório.
- Email: obrigatório, formato válido.
- Telefone: opcional.
- Senha: mínimo 6 caracteres.
- Confirmar senha: deve ser igual.

---

## Tela 4: HomeScreen

**Propósito**: Tela principal com os 3 botões de alerta.

```
┌──────────────────────────┐
│  Alertaki        🔔 (badge) │
│                          │
│                          │
│  ┌──────────────────────┐│
│  │                      ││
│  │    🏥 Saúde          ││
│  │                      ││
│  │ Alertar contatos e   ││
│  │ pessoas próximas     ││
│  └──────────────────────┘│
│        (gradiente vermelho)│
│                          │
│  ┌──────────────────────┐│
│  │                      ││
│  │    🛡️ Segurança      ││
│  │                      ││
│  │ Alertar contatos e   ││
│  │ pessoas próximas     ││
│  └──────────────────────┘│
│        (gradiente azul)   │
│                          │
│  ┌──────────────────────┐│
│  │                      ││
│  │    ⚠️ Emergência     ││
│  │                      ││
│  │ Alertar contatos     ││
│  │ selecionados         ││
│  └──────────────────────┘│
│        (gradiente roxo)   │
│                          │
│ [🏠] [📋] [👥] [👤]       │
└──────────────────────────┘
```

**Comportamento dos botões**:
- **Saúde**: Dialog de confirmação → captura GPS → cria alerta → discagem 192.
- **Segurança**: Dialog de confirmação → captura GPS → cria alerta → discagem 190.
- **Emergência**: Navega para EmergencyScreen.

**Ícone de notificação (🔔)**: Badge vermelho quando há convites pendentes.

---

## Tela 5: EmergencyScreen

**Propósito**: Seleção de contatos e mensagem para alerta de emergência.

```
┌──────────────────────────┐
│  ← Voltar                │
│                          │
│  Alerta de Emergência    │
│                          │
│  Selecione os contatos:  │
│  ┌──────────────────────┐│
│  │ ☑ João Silva         ││
│  │ ☑ Maria Santos       ││
│  │ ☐ Pedro Oliveira     ││
│  │ ☑ Ana Costa          ││
│  └──────────────────────┘│
│                          │
│  Mensagem:               │
│  ┌──────────────────────┐│
│  │ Preciso de ajuda,    ││
│  │ estou preso no       ││
│  │ elevador...          ││
│  │                      ││
│  └──────────────────────┘│
│  142/500 caracteres      │
│                          │
│  ┌──────────────────────┐│
│  │   Enviar Alerta 🚨   ││
│  └──────────────────────┘│
│   (botão vermelho grande) │
└──────────────────────────┘
```

**Validações**:
- Pelo menos 1 contato selecionado.
- Mensagem obrigatória (não vazia).
- Máximo 500 caracteres.
- Se o usuário não tem contatos, exibe mensagem e link para adicionar.

---

## Tela 6: AlertHistoryScreen

**Propósito**: Histórico de alertas enviados e recebidos.

```
┌──────────────────────────┐
│  Histórico de Alertas    │
│                          │
│  [Enviados] [Recebidos]  │
│  ─────────  ───────────  │
│                          │
│  === Aba Enviados ===    │
│  ┌──────────────────────┐│
│  │ 🏥 Saúde             ││
│  │ 19/02/2026 14:30     ││
│  │ Rua X, Bairro Y      ││
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │ 🛡️ Segurança         ││
│  │ 18/02/2026 09:15     ││
│  │ Av. Z, Centro        ││
│  └──────────────────────┘│
│                          │
│  === Aba Recebidos ===   │
│  ┌──────────────────────┐│
│  │ 🏥 Saúde             ││
│  │ João Silva            ││
│  │ 17/02/2026 20:45     ││
│  │ Rua W, Bairro K      ││
│  │     [Abrir no Mapa]  ││
│  └──────────────────────┘│
│                          │
│ [🏠] [📋] [👥] [👤]       │
└──────────────────────────┘
```

**Aba Enviados**: Mostra tipo, data/hora, localização.
**Aba Recebidos**: Mostra tipo, remetente, data/hora, localização, botão de mapa.

---

## Tela 7: ContactsScreen

**Propósito**: Gerenciar contatos de segurança.

```
┌──────────────────────────┐
│  Contatos                │
│                          │
│  [Meus Contatos] [Sou   │
│                   Contato│
│                   De]    │
│  ─────────────  ─────────│
│                          │
│  ┌──────────────────────┐│
│  │ + Convidar Contato   ││
│  └──────────────────────┘│
│                          │
│  === Meus Contatos ===   │
│  ┌──────────────────────┐│
│  │ [Foto] João Silva    ││
│  │ joao@email.com       ││
│  │              [Remover]││
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │ [Foto] Maria Santos  ││
│  │ maria@email.com      ││
│  │              [Remover]││
│  └──────────────────────┘│
│                          │
│  === Sou Contato De ===  │
│  ┌──────────────────────┐│
│  │ [Foto] Pedro Oliveira││
│  │ pedro@email.com      ││
│  └──────────────────────┘│
│                          │
│ [🏠] [📋] [👥] [👤]       │
└──────────────────────────┘
```

**Botão "Convidar Contato"**: Abre dialog com campo de email ou telefone.

---

## Tela 8: InvitesScreen

**Propósito**: Ver e responder convites pendentes.

```
┌──────────────────────────┐
│  ← Voltar                │
│                          │
│  Convites Pendentes      │
│                          │
│  ┌──────────────────────┐│
│  │ [Foto] João Silva    ││
│  │ joao@email.com       ││
│  │ quer ser seu contato ││
│  │ de segurança         ││
│  │                      ││
│  │ [✓ Aceitar] [✗ Recusar]│
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │ [Foto] Maria Santos  ││
│  │ maria@email.com      ││
│  │ quer ser seu contato ││
│  │ de segurança         ││
│  │                      ││
│  │ [✓ Aceitar] [✗ Recusar]│
│  └──────────────────────┘│
│                          │
│  (Lista vazia: "Nenhum  │
│   convite pendente")     │
└──────────────────────────┘
```

Acessível via ícone de notificação na HomeScreen ou via push notification.

---

## Tela 9: ProfileScreen

**Propósito**: Visualizar perfil e acessar configurações.

```
┌──────────────────────────┐
│  Perfil                  │
│                          │
│        [Foto Grande]     │
│        João Silva        │
│        joao@email.com    │
│        (11) 99999-9999   │
│                          │
│  ┌──────────────────────┐│
│  │  ✏️ Editar Perfil     ││
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │  🔔 Convites Pendentes││
│  │                (3)   ││
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │  🚫 Usuários Bloqueados│
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │  📜 Política de       ││
│  │     Privacidade       ││
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │  🗑️ Excluir Conta    ││
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │  🚪 Sair              ││
│  └──────────────────────┘│
│                          │
│ [🏠] [📋] [👥] [👤]       │
└──────────────────────────┘
```

---

## Tela 10: EditProfileScreen

**Propósito**: Editar dados do perfil.

```
┌──────────────────────────┐
│  ← Voltar                │
│                          │
│  Editar Perfil           │
│                          │
│     [Foto]               │
│     Trocar foto          │
│                          │
│  ┌──────────────────────┐│
│  │ Nome: João Silva     ││
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │ Email: joao@email.com││
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │ Tel: (11) 99999-9999 ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │      Salvar           ││
│  └──────────────────────┘│
└──────────────────────────┘
```

**Trocar foto**: Abre picker (galeria ou câmera) → upload para Firebase Storage.

---

## Tela 11: BlockedUsersScreen

**Propósito**: Gerenciar usuários bloqueados.

```
┌──────────────────────────┐
│  ← Voltar                │
│                          │
│  Usuários Bloqueados     │
│                          │
│  ┌──────────────────────┐│
│  │ [Foto] Carlos Mendes ││
│  │ carlos@email.com     ││
│  │           [Desbloquear]│
│  └──────────────────────┘│
│                          │
│  (Lista vazia: "Nenhum  │
│   usuário bloqueado")    │
└──────────────────────────┘
```

---

## Tela 12: AlertOverlayScreen

**Propósito**: Exibição fullscreen de alerta recebido. Aparece sobre qualquer tela.

Detalhado em [alerts-flow.md](alerts-flow.md).

---

## Tema e Design

### Cores Principais
- **Saúde**: Gradiente vermelho-laranja (`#FF4444` → `#FF8800`)
- **Segurança**: Gradiente azul-roxo (`#4444FF` → `#8800FF`)
- **Emergência**: Gradiente roxo-vermelho (`#8800FF` → `#FF4444`)
- **Fundo**: Branco (`#FFFFFF`) ou cinza claro (`#F5F5F5`)
- **Texto primário**: Preto/cinza escuro (`#212121`)
- **Texto secundário**: Cinza (`#757575`)
- **Accent**: Vermelho de emergência (`#FF4444`)

### Princípios de Design
- **Simplicidade**: Mínimo de elementos por tela.
- **Botões grandes**: Os 3 botões de alerta devem ser grandes e fáceis de pressionar em emergência.
- **Contraste alto**: Textos legíveis, botões com cores fortes.
- **Feedback imediato**: Loading states em todas as ações.
- **Acessibilidade**: Tamanhos de fonte mínimos de 16sp, áreas de toque mínimas de 48dp.
