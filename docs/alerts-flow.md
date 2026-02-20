# Alertaki — Fluxo de Alertas

## Tipos de Alerta

| Tipo       | Identificador | Destinatários             | Discagem Rápida | Mensagem Personalizada |
| ---------- | ------------- | ------------------------- | --------------- | ---------------------- |
| Saúde      | `health`      | Contatos + Próximos (5km) | SAMU (192)      | Não                    |
| Segurança  | `security`    | Contatos + Próximos (5km) | Polícia (190)   | Não                    |
| Emergência | `custom`      | Contatos selecionados     | Não             | Sim (até 500 chars)    |

---

## Fluxo de Envio — Alerta de Saúde

```
┌──────────┐    ┌───────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────┐
│ HomeScreen│───►│ Captura   │───►│ Escreve  │───►│Cloud Function│───►│ FCM Push │
│ Tap       │    │ GPS       │    │ Firestore│    │onAlertCreated│    │ Notifica │
│ "Saúde"   │    │ Location  │    │ alert doc│    │              │    │ todos    │
└──────────┘    └───────────┘    └──────────┘    └──────────────┘    └──────────┘
                                                                           │
                                                                           ▼
┌──────────────┐                                                   ┌──────────────┐
│ Auto-discagem│◄──────────────────────────────────────────────────│ Destinatários│
│ SAMU (192)   │                                                   │ recebem push │
└──────────────┘                                                   │ + overlay    │
                                                                   └──────────────┘
```

### Passos detalhados:

1. Usuário toca no botão "Saúde" na HomeScreen.
2. Confirmação rápida: "Enviar alerta de saúde?" → [Confirmar] [Cancelar].
3. O app solicita a posição GPS atual:
   ```typescript
   const position = await Geolocation.getCurrentPosition({
     enableHighAccuracy: true,
     timeout: 10000,
   });
   ```
4. Cria o documento no Firestore:
   ```typescript
   await firestore.collection('alerts').add({
     userId: currentUser.uid,
     userEmail: currentUser.email,
     type: 'health',
     lat: position.coords.latitude,
     lng: position.coords.longitude,
     radiusKm: 5,
     customMessage: null,
     createdAt: serverTimestamp(),
   });
   ```
5. Exibe feedback: "Alerta de saúde enviado!"
6. Abre a discagem automática para SAMU (192):
   ```typescript
   Linking.openURL('tel:192');
   ```

---

## Fluxo de Envio — Alerta de Segurança

Idêntico ao de Saúde, com as diferenças:

- `type: 'security'`
- Discagem automática para **Polícia (190)**: `Linking.openURL('tel:190')`

---

## Fluxo de Envio — Alerta de Emergência (Personalizado)

```
┌──────────┐    ┌────────────────┐    ┌───────────┐    ┌──────────┐    ┌──────────────┐
│ HomeScreen│───►│EmergencyScreen │───►│ Captura   │───►│ Escreve  │───►│Cloud Function│
│ Tap       │    │ • Seleciona    │    │ GPS       │    │ Firestore│    │onAlertCreated│
│"Emergência│    │   contatos     │    │ Location  │    │ alert doc│    │              │
│"          │    │ • Digita msg   │    │           │    │          │    │              │
│           │    │ • Confirma     │    │           │    │          │    │              │
└──────────┘    └────────────────┘    └───────────┘    └──────────┘    └──────────────┘
```

### Passos detalhados:

1. Usuário toca no botão "Emergência" na HomeScreen.
2. Navega para `EmergencyScreen`.
3. Tela exibe:
   - Lista de contatos de segurança com checkboxes.
   - Campo de texto para mensagem personalizada (limite: 500 caracteres).
   - Contador de caracteres.
   - Botão "Enviar Alerta".
4. Validação:
   - Pelo menos 1 contato selecionado.
   - Mensagem não pode ser vazia.
5. Captura GPS e cria o documento:
   ```typescript
   await firestore.collection('alerts').add({
     userId: currentUser.uid,
     userEmail: currentUser.email,
     type: 'custom',
     lat: position.coords.latitude,
     lng: position.coords.longitude,
     radiusKm: 0, // Não envia para próximos
     customMessage: messageText,
     selectedContacts: contactUids, // UIDs dos contatos selecionados
     createdAt: serverTimestamp(),
   });
   ```
6. Exibe feedback: "Alerta de emergência enviado!"
7. **Não há discagem automática.**

---

## Cloud Function: `onAlertCreated`

Trigger: `onDocumentCreated('alerts/{alertId}')`

### Lógica:

```
1. Ler o documento do alerta criado
2. Buscar dados do remetente em users/{userId}
   - Atualizar o alerta com userName e userPhotoURL
3. Determinar destinatários:

   SE type == 'custom':
     - Usar apenas os UIDs em selectedContacts

   SE type == 'health' OU 'security':
     a. Buscar todos os contatos de segurança do remetente
        → users/{userId}/contacts (todos os docs)
     b. Buscar usuários próximos:
        → users onde locationUpdatedAt != null
        → Ordenar por locationUpdatedAt desc, limit 500
        → Filtrar por distância Haversine <= radiusKm
     c. Merge dos dois conjuntos (sem duplicatas)
     d. Remover o próprio remetente

4. Para cada destinatário, verificar bloqueio:
   → Checar se users/{recipientUid}/blockedUsers/{senderUid} existe
   → Se bloqueado, pular

5. Criar subcollection recipients:
   → Para cada destinatário válido, criar alerts/{alertId}/recipients/{uid}

6. Coletar FCM tokens de todos os destinatários válidos

7. Resolver endereço (reverse geocoding) a partir de lat/lng
   → Usar Google Geocoding API ou similar
   → Atualizar o alerta com o campo address

8. Construir payload de notificação:
   {
     notification: {
       title: getTitleByType(type),    // "Alerta de Saúde!", "Alerta de Segurança!", "Alerta de Emergência!"
       body: getBodyByType(type, userName, customMessage),
     },
     data: {
       alertId,
       type,
       userId,
       userName,
       userPhotoURL,
       lat, lng,
       address,
       customMessage (se custom),
       fullscreen: '1',
     },
     android: {
       priority: 'high',
       notification: {
         channelId: 'alert_channel',
         visibility: 'public',
         sound: 'default',
       },
     },
     apns: {
       payload: {
         aps: {
           sound: 'default',
           'interruption-level': 'critical',
         },
       },
     },
   }

9. Enviar via fcm.sendEachForMulticast() em chunks de 100 tokens

10. Limpar tokens inválidos dos documentos de usuários
```

---

## Fluxo de Recebimento — Cliente

### Cenário 1: App em Foreground

```
FCM message ──► onMessage listener ──► Exibe AlertOverlayScreen
                                       + Cria notificação local fullscreen
                                       + Vibração contínua
```

### Cenário 2: App em Background

```
FCM message ──► Background handler ──► Notificação na bandeja
                                       + Notificação fullscreen (Android)
                                       + Som padrão + vibração contínua

Usuário toca ──► onNotificationOpenedApp ──► AlertOverlayScreen
```

### Cenário 3: App Terminado

```
FCM message ──► Notificação na bandeja (via FCM)
               + Notificação fullscreen (Android)
               + Som padrão + vibração contínua

Usuário toca ──► getInitialNotification ──► AlertOverlayScreen
```

---

## AlertOverlayScreen — Detalhes

A tela de overlay recebida é diferente para cada tipo de alerta:

### Alerta de Saúde (recebido)

```
┌──────────────────────────┐
│     🏥 ALERTA DE SAÚDE    │
│                          │
│  [Foto] Nome do Usuário  │
│                          │
│  📍 Rua X, Bairro Y,    │
│     Cidade - Estado      │
│                          │
│  ┌──────────────────────┐│
│  │  📞 Ligar SAMU (192) ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │  🗺️ Abrir no Mapa    ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │  🚫 Bloquear Usuário ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │     Dispensar         ││
│  └──────────────────────┘│
└──────────────────────────┘
```

### Alerta de Segurança (recebido)

- Mesmo layout, mas com "Ligar Polícia (190)" e ícone de escudo.

### Alerta de Emergência (recebido)

```
┌──────────────────────────┐
│   ⚠️ ALERTA DE EMERGÊNCIA │
│                          │
│  [Foto] Nome do Usuário  │
│                          │
│  📍 Rua X, Bairro Y,    │
│     Cidade - Estado      │
│                          │
│  💬 "Mensagem              │
│   personalizada aqui"    │
│                          │
│  ┌──────────────────────┐│
│  │  🗺️ Abrir no Mapa    ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │  🚫 Bloquear Usuário ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │     Dispensar         ││
│  └──────────────────────┘│
└──────────────────────────┘
```

---

## Abertura de Mapa

Ao tocar em "Abrir no Mapa", tentar na seguinte ordem:

1. **Waze** (deep link): `waze://?ll={lat},{lng}&navigate=yes`
2. **Google Maps** (deep link): `google.navigation:q={lat},{lng}`
3. **Apple Maps** (iOS): `maps://?daddr={lat},{lng}`
4. **Fallback** (browser): `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`

---

## Confirmação de Envio de Alerta

Para evitar alertas acidentais (já que não há cooldown nem cancelamento):

- **Saúde/Segurança**: Dialog de confirmação antes de enviar.
  - "Tem certeza que deseja enviar um alerta de saúde? Seus contatos e pessoas próximas serão notificados."
  - [Confirmar] [Cancelar]

- **Emergência**: A própria tela intermediária com seleção de contatos serve como confirmação.

---

## Estados de Error Handling

| Erro                       | Tratamento                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| GPS desabilitado           | Mostrar dialog pedindo para ativar. Link para configurações.                                                           |
| GPS sem permissão          | Solicitar permissão. Se negada, mostrar instruções.                                                                    |
| Timeout de GPS (>10s)      | Mostrar erro: "Não foi possível obter sua localização."                                                                |
| Sem internet               | Mostrar erro: "Sem conexão. O alerta será enviado quando a conexão for restabelecida." (Firestore offline persistence) |
| Sem contatos (para custom) | Botão de envio desabilitado. Mensagem: "Adicione contatos de segurança primeiro."                                      |
