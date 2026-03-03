# Changelog - Alertaki

Todas as mudanças relevantes do projeto estão documentadas neste arquivo.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [1.2.2] - 2026-03-03 (versionCode 10)

### Alterado
- **Botão "Restaurar compras"**: renomeado para "Já sou assinante" (mais intuitivo para o usuário leigo)
- **Botão "+" em "Sou Contato De"**: cor alterada de vermelho para verde (fundo verde claro com "+" verde escuro)

---

## [1.2.1] - 2026-03-03 (versionCode 9)

### Adicionado
- **Botão "+" em "Sou Contato De"**: permite enviar convite rapidamente para quem te adicionou como contato (só aparece se a pessoa ainda não está em "Meus Contatos")
- **Navegação por toque na notificação**: tocar em notificação de convite abre a tela de Convites; tocar em alerta abre a tela de Alerta (funciona em foreground, background e cold start)

### Alterado
- **Som do alerta**: trocado de som de despertador (`TYPE_ALARM`) para toque de chamada (`TYPE_RINGTONE`), com volume forçado ao máximo via `AudioManager`
- **Volume restaurado**: ao dispensar o alerta, o volume anterior é restaurado automaticamente
- **Preferências padrão**: lanterna agora ativada por padrão (antes era desativada)

---

## [1.2.0] - 2026-03-01 (versionCode 8)

### Adicionado
- **Preferências de Alerta**: nova tela no perfil para configurar como o usuário quer ser notificado
  - **Toque (som)**: toca o alarme padrão do sistema mesmo com o celular no modo silencioso (usa `AudioAttributes.USAGE_ALARM`)
  - **Vibração**: vibração contínua ao receber um alerta
  - **Lanterna**: efeito strobe (pisca a lanterna repetidamente) ao receber um alerta
  - Validação: pelo menos uma opção deve estar ativada
- **Preferência de alertas de proximidade**: o usuário pode escolher se quer receber alertas de usuários próximos (desativado por padrão) ou apenas de contatos cadastrados
- **Módulo nativo AlertAudio** (Android/Kotlin): reproduz som de alarme do sistema ignorando modo silencioso/vibrar
- **Módulo nativo Torch** (Android/Kotlin): controla lanterna do dispositivo com efeito strobe
- **Serviço de preferências**: cache local via AsyncStorage + sincronização com Firestore
- **Dependência**: `@react-native-async-storage/async-storage@2.2.0`

### Alterado
- **Botão "Bloquear" no alerta**: agora para o alarme e fecha a tela automaticamente após bloquear o usuário (antes era necessário clicar "Dispensar" separadamente)
- **Raio de proximidade**: reduzido de 5km para 2km para alertas de usuários próximos
- **Cloud Function `onAlertCreated`**: agora verifica assinatura ativa do remetente e dos destinatários antes de enviar alertas
- **Cloud Function `onAlertCreated`**: filtra destinatários por proximidade com base na preferência `receiveProximityAlerts`
- **Canais de notificação**: novos canais `alert_channel_v2` (som controlado pelo app) e `alert_channel_silent` (sem som nem vibração)
- **`notificationService.ts`**: `dismissAlertNotification()` agora também para som e lanterna
- **`AlertOverlayScreen`**: respeita preferências do usuário para som/vibração/lanterna
- **`FullScreenAlert`**: respeita preferências do AsyncStorage (funciona mesmo com app fechado)
- **`App.tsx`**: handlers de notificação em foreground/background leem preferências antes de exibir alerta
- **`validateSubscription`**: lazy import de `googleapis` para evitar timeout no deploy do Firebase

### Segurança
- Apenas usuários com assinatura ativa podem enviar alertas (validação server-side)
- Apenas usuários com assinatura ativa recebem alertas (filtro server-side)

---

## [1.1.5] - 2026-02-28 (versionCode 7)

### Corrigido
- **Validação de assinatura do Google Play**: Cloud Function agora usa credenciais explícitas de service account em vez de ADC (Application Default Credentials)
- **Deploy de Cloud Functions**: `.firebaseignore` corrigido para não excluir a pasta `lib/` (código compilado)
- **`doRestorePurchases()`**: agora chama `validatePurchase()` no servidor para validar compras restauradas

### Adicionado
- Documentação completa do fluxo de assinatura em `docs/subscription-solution.md`

---

## [1.1.2] - 2026-02-27 (versionCode 4)

### Alterado
- Refatoração geral da estrutura de código para melhorar legibilidade e manutenibilidade
- Melhorias na organização dos módulos e componentes

---

## [1.0.0] - 2026-02-26 (versionCode 1)

### Adicionado
- **Tela inicial** com botões de alerta por categoria: Saúde, Segurança, Emergência
- **Sistema de alertas em tela cheia** usando Notifee com suporte a full-screen intent
- **Integração Firebase**: Authentication (Google Sign-In), Firestore, Cloud Functions, Cloud Messaging, Storage
- **Gerenciamento de contatos**: adicionar, remover e bloquear contatos
- **Sistema de convites**: enviar e aceitar convites de contato
- **Histórico de alertas**: visualizar alertas enviados e recebidos
- **Alertas de proximidade**: notificar usuários próximos (raio configurável) via geolocalização
- **Perfil do usuário**: edição de nome, foto, telefone
- **Política de privacidade**: tela com texto completo
- **Assinatura mensal**: integração com Google Play Billing via `react-native-iap`
  - Plano: `alertaki_monthly_sub` (R$ 1,97/mês)
  - PaywallScreen com fluxo de compra e restauração
- **Cloud Functions**:
  - `onAlertCreated`: processa alertas e envia FCM para contatos e usuários próximos
  - `validateSubscription`: valida assinatura com Google Play Developer API
  - `deleteUserAccount`: exclusão completa de conta e dados
- **Notificações push** via Firebase Cloud Messaging + Notifee
- **Geolocalização** com `react-native-geolocation-service`
- **Suporte a New Architecture** (React Native)
- **Build Windows**: passthrough script para Hermes compiler

---

## Estrutura de Versões

| Versão | versionCode | Data | Destaque |
|--------|-------------|------|----------|
| 1.2.2 | 10 | 2026-03-03 | UX: "Já sou assinante", botão verde no convite rápido |
| 1.2.1 | 9 | 2026-03-03 | Convite rápido, navegação por notificação, som de toque max volume |
| 1.2.0 | 8 | 2026-03-01 | Preferências de alerta, gate de assinatura, raio 2km |
| 1.1.5 | 7 | 2026-02-28 | Fix validação de assinatura Google Play |
| 1.1.2 | 4 | 2026-02-27 | Refatoração e melhorias de código |
| 1.0.0 | 1 | 2026-02-26 | Lançamento inicial |
