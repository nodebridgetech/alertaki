# Alertaki — Discovery & Levantamento de Requisitos

## Visão Geral

O **Alertaki** é um aplicativo mobile (Android + iOS) que funciona como **botão do pânico/emergência**. O usuário pode disparar alertas de saúde, segurança ou emergência personalizada para seus contatos de segurança e/ou usuários próximos.

O app é **pago** (compra única na Play Store e App Store). Não há modelo freemium, assinatura ou in-app purchases.

**Idioma**: Português (pt-BR) apenas.
**Números de emergência**: Brasileiros (SAMU 192, Polícia 190).

---

## Referência

Projeto original: [alertaki-old](https://github.com/nodebridgetech/alertaki-old) (Flutter/Dart + Firebase).

O novo projeto será reconstruído em **React Native/TypeScript** com **Firebase** (Firestore, Cloud Functions, FCM, Auth, Storage), organizado como **monorepo**.

---

## Requisitos Funcionais

### RF01 — Autenticação

- Login via Google Sign-In.
- Login via email/senha (criação de conta manual).
- Apple Sign-In **é obrigatório** para aprovação na App Store (apps com login social devem oferecer Sign in with Apple). **Nota**: incluir mesmo que o usuário não tenha mencionado, pois é exigência da Apple.
- Ao fazer login, os dados do usuário são gravados/atualizados no Firestore.

### RF02 — Alerta de Saúde

- O usuário pressiona o botão "Saúde" na tela inicial.
- O app captura a localização GPS atual do usuário.
- O alerta é enviado para:
  - Todos os **contatos de segurança** do usuário.
  - Todos os **usuários próximos** em um raio de **5km**.
- Na tela de quem recebe o alerta (overlay full-screen):
  - Exibe a localização do remetente (endereço por reverse geocoding).
  - Botão de discagem rápida para o **SAMU (192)**.
  - Botão para abrir app de mapas (Google Maps, Waze, etc.) com o endereço.
- Após enviar o alerta, o app tenta abrir a discagem para 192 automaticamente.

### RF03 — Alerta de Segurança

- O usuário pressiona o botão "Segurança" na tela inicial.
- O app captura a localização GPS atual do usuário.
- O alerta é enviado para:
  - Todos os **contatos de segurança** do usuário.
  - Todos os **usuários próximos** em um raio de **5km**.
- Na tela de quem recebe o alerta (overlay full-screen):
  - Exibe a localização do remetente (endereço por reverse geocoding).
  - Botão de discagem rápida para a **Polícia (190)**.
  - Botão para abrir app de mapas com o endereço.
- Após enviar o alerta, o app tenta abrir a discagem para 190 automaticamente.

### RF04 — Alerta de Emergência (Personalizado)

- O usuário pressiona o botão "Emergência" na tela inicial.
- Abre uma **tela intermediária** onde o usuário:
  - Seleciona quais contatos de segurança receberão o alerta (checkboxes).
  - Digita uma mensagem personalizada (limite de **500 caracteres**).
  - Confirma o envio.
- O app captura a localização GPS atual do usuário.
- O alerta é enviado **apenas** para os contatos selecionados (NÃO para usuários próximos).
- Na tela de quem recebe o alerta (overlay full-screen):
  - Exibe a localização do remetente.
  - Exibe a mensagem personalizada.
  - Botão para abrir app de mapas com o endereço.
  - **Não há discagem rápida** neste tipo de alerta.

### RF05 — Contatos de Segurança

- O usuário pode convidar pessoas pelo **email** ou **telefone** para serem contatos de segurança.
- O convite só funciona se o destinatário **já tem conta** no Alertaki. Caso contrário, nenhum resultado é encontrado.
- O destinatário pode **aceitar** ou **recusar** o convite.
- O destinatário pode **bloquear** o remetente (sem que o remetente saiba que foi bloqueado).
- A relação é **unidirecional**: se A convida B e B aceita, B é contato de segurança de A. A NÃO é automaticamente contato de B.
- **Não há limite** de contatos de segurança.

### RF06 — Visualização de Contatos

- O usuário pode ver **seus contatos de segurança** (quem ele convidou e aceitou).
- O usuário pode ver **de quem ele é contato de segurança** (quem o convidou e ele aceitou).

### RF07 — Bloqueio/Desbloqueio

- Ao receber um alerta, o usuário pode bloquear o remetente.
- O bloqueado **não é notificado** do bloqueio.
- O usuário pode ver sua lista de bloqueados e desbloquear.
- Usuário bloqueado não pode enviar alertas para quem o bloqueou.

### RF08 — Perfil do Usuário

- O usuário pode visualizar e editar: nome, email, telefone, foto de perfil.
- A foto de perfil pode ser a do Google ou um upload personalizado.
- Fotos são armazenadas no **Firebase Storage**.
- Não há verificação de telefone (sem OTP).

### RF09 — Histórico de Alertas

- O usuário pode ver seu histórico de alertas em **duas abas**:
  - **Enviados**: alertas que ele disparou.
  - **Recebidos**: alertas que chegaram para ele.
- Os alertas são armazenados **indefinidamente**.
- Cada item do histórico mostra: tipo, data/hora, localização, e remetente/destinatários.

### RF10 — Exclusão de Conta (LGPD)

- O usuário pode solicitar a exclusão da sua conta.
- Ao excluir:
  - Alertas enviados por ele **permanecem** no histórico dos destinatários.
  - Ele é **removido** da lista de contatos de segurança de todos os outros usuários.
  - Os dados do perfil, tokens, convites e histórico pessoal são **deletados**.

### RF11 — Política de Privacidade

- O app deve ter uma política de privacidade acessível, em conformidade com a LGPD.
- Deve informar quais dados são coletados, como são usados e como solicitar exclusão.

---

## Requisitos Não-Funcionais

### RNF01 — Notificações

- Alertas são entregues via **push notification** (FCM).
- No Android: **full-screen intent** com sobreposição de tela, toque padrão do dispositivo e vibração contínua até o usuário interagir.
- No iOS: **critical alert** (requer entitlement da Apple) ou interruptive notification com som padrão.
- Notificações funcionam com o app em foreground, background e terminado.

### RNF02 — Localização em Background

- O app atualiza a localização do usuário no Firestore **a cada 1 hora** em background.
- Isso é necessário para a funcionalidade de alertas por proximidade (5km).
- Deve respeitar as restrições de cada plataforma (Android background location, iOS significant location changes).

### RNF03 — Sem Cooldown

- Não há cooldown entre alertas. O usuário pode enviar alertas consecutivos sem restrição.

### RNF04 — Alertas Não Canceláveis

- Uma vez enviado, o alerta **não pode ser cancelado**.

### RNF05 — Performance

- O envio de alertas deve ser o mais rápido possível (< 3 segundos para captura de GPS + escrita no Firestore).
- Push notifications devem ser entregues em tempo real (dependente da infraestrutura FCM).

### RNF06 — Internacionalização

- Apenas pt-BR no momento. Arquitetura preparada para i18n futuro.

### RNF07 — Plataformas

- Android (minSdk 23 / Android 6.0+).
- iOS (13.0+).

---

## Decisões Técnicas

| Aspecto            | Decisão                                      |
| ------------------ | -------------------------------------------- |
| Framework Mobile   | React Native + TypeScript                    |
| Backend            | Firebase Cloud Functions (TypeScript)        |
| Banco de Dados     | Cloud Firestore                              |
| Autenticação       | Firebase Auth (Google + Email/Senha + Apple) |
| Storage            | Firebase Storage (fotos de perfil)           |
| Push Notifications | Firebase Cloud Messaging (FCM)               |
| Geolocalização     | react-native-geolocation + background tasks  |
| State Management   | Zustand                                      |
| Navegação          | React Navigation                             |
| Monorepo           | Estrutura com apps/ + functions/ + packages/ |
| Testes             | Jest + React Native Testing Library          |

---

## Fora do Escopo (v1)

- Versão Web, Desktop, Windows, Linux, macOS.
- Suporte a múltiplos idiomas.
- Números de emergência de outros países.
- Validação de compra da loja (receipt validation).
- Chat entre usuários.
- Rastreamento em tempo real (live tracking).
- Integração com serviços de emergência oficiais.
- Modo offline completo.
