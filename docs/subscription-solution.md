# Assinatura Google Play Billing - Relatório Completo

## Status: RESOLVIDO

---

## Problema Original
Após o usuário assinar o plano mensal (R$ 1,97/mês), o app permanecia na PaywallScreen
e não liberava acesso às funcionalidades (MainStack). O botão "Restaurar compras"
também não funcionava.

---

## Causa Raiz (foram 2 problemas combinados)

### Problema 1: Cloud Function usava credenciais erradas
A Cloud Function `validateSubscription` usava Application Default Credentials (ADC),
que no Cloud Functions resolve para `807554654482-compute@developer.gserviceaccount.com`.
Essa service account NÃO tinha permissão na Google Play Developer API.

**Solução**: Criar um arquivo de chave JSON para `alertaki@appspot.gserviceaccount.com`
(que JÁ tinha permissões no Play Console) e carregar explicitamente no código.

- Arquivo: `functions/alertaki-907d7aca1a5f.json`
- Gerado em: Google Cloud Console > IAM > Service Accounts > alertaki@appspot > Keys > Create Key > JSON
- Protegido: `.gitignore` tem `alertaki-*.json` (não vai pro git)

### Problema 2: `.firebaseignore` excluía `lib/` do deploy
Quando criamos o `.firebaseignore` para garantir que o arquivo de chave fosse
incluído no deploy (já que `.gitignore` o excluía), incluímos `lib/` na lista
de exclusão por engano.

O `firebase.json` NÃO tem predeploy hooks (`"predeploy": []`), então o Firebase
NÃO compila TypeScript no servidor. Ele depende do `lib/` pré-compilado localmente.

**Resultado**: O código atualizado (com carregamento de chave) NUNCA foi deployado.
O servidor continuava rodando a versão antiga que usava ADC = "insufficient permissions".

**Solução**: Remover `lib/` do `.firebaseignore`.

---

## Fluxo Completo da Assinatura (como funciona agora)

```
1. Usuário clica "Assinar agora" na PaywallScreen
2. billingService.purchaseSubscription() abre dialog do Google Play
3. Usuário completa o pagamento na Play Store
4. Purchase listener em App.tsx recebe a compra
5. billingService.validatePurchase(token, productId) é chamado
6. Cloud Function validateSubscription recebe a requisição
7. Carrega chave do service account (alertaki-907d7aca1a5f.json)
8. Autentica com Google Play Developer API usando a chave
9. Chama purchases.subscriptionsv2.get para validar o token
10. Atualiza Firestore: users/{uid}.subscription.isActive = true
11. Retorna { isValid: true } para o app
12. App.tsx: setSubscribed(true)
13. Firestore listener também atualiza estado em real-time
14. RootNavigator detecta isSubscribed=true → mostra MainStack
```

### Fluxo de Restaurar Compras
```
1. Usuário clica "Restaurar compras" na PaywallScreen
2. billingService.restorePurchases() chamado
3. getAvailablePurchases() busca compras anteriores no dispositivo
4. Para cada compra encontrada, chama validatePurchase() no servidor
5. Cloud Function valida e atualiza Firestore
6. Se alguma é válida: isSubscribed = true → MainStack
```

---

## Arquivos do Sistema de Assinatura

### Mobile (apps/mobile/)
| Arquivo | Função |
|---------|--------|
| `src/services/billingService.ts` | Wrapper react-native-iap (init, purchase, restore, validate) |
| `src/stores/subscriptionStore.ts` | Zustand store (isSubscribed, isChecking, purchase, restore) |
| `src/screens/subscription/PaywallScreen.tsx` | Tela de paywall (assinar, restaurar, sair) |
| `src/navigation/RootNavigator.tsx` | Gate: !isSubscribed → PaywallScreen |
| `src/App.tsx` | Inicialização IAP, purchase listeners, Firestore listener |

### Cloud Functions (functions/)
| Arquivo | Função |
|---------|--------|
| `src/subscriptions/validateSubscription.ts` | Valida compra com Google Play API |
| `src/index.ts` | Exporta validateSubscription |
| `alertaki-907d7aca1a5f.json` | Chave do service account (NÃO vai pro git) |
| `.firebaseignore` | Controla o que é excluído do deploy |
| `.gitignore` | Exclui `alertaki-*.json` do git |

### Tipos Compartilhados (packages/shared/)
| Arquivo | Função |
|---------|--------|
| `src/types/user.ts` | Interface UserSubscription + campo subscription no User |
| `src/index.ts` | Exporta UserSubscription |

---

## Configurações Necessárias

### Google Play Console
1. **Produto de assinatura**: `alertaki_monthly_sub` (R$ 1,97/mês)
   - Monetize > Products > Subscriptions
2. **Permissões do service account**: `alertaki@appspot.gserviceaccount.com`
   - Settings > Users & Permissions
   - Permissões: "Ver dados financeiros" + "Gerenciar pedidos e assinaturas"
3. **Firebase vinculado**: Settings > Serviços vinculados

### Google Cloud Console
1. **API ativada**: Google Play Android Developer API
2. **Chave do service account**: alertaki@appspot.gserviceaccount.com > Keys > JSON

### Firebase
1. **Cloud Function deployada**: `validateSubscription`
2. **Firestore**: Campo `users/{uid}.subscription` com estrutura UserSubscription

---

## Regras Importantes para Deploys Futuros

1. **Sempre compilar antes de deployar**: `cd functions && node_modules/.bin/tsc`
2. **O `.firebaseignore` NÃO deve excluir `lib/`** (código compilado precisa ser deployado)
3. **O `.firebaseignore` NÃO deve excluir `alertaki-907d7aca1a5f.json`** (chave do SA)
4. **O `.gitignore` DEVE excluir `alertaki-*.json`** (chave não vai pro git)
5. **Não há predeploy hooks** - o build local é obrigatório antes de `firebase deploy`

### Conteúdo correto do `.firebaseignore`:
```
node_modules/
src/
.env
.env.local
```

### Conteúdo correto do `.gitignore` (functions):
```
lib/
node_modules/
.env
.env.local
alertaki-*.json
```

---

## Histórico de Erros e Soluções

| Erro | Causa | Solução |
|------|-------|---------|
| "Google Play API has not been used in project" | API não ativada | Ativar no Google Cloud Console |
| "insufficient permissions" (Compute SA) | Cloud Function usa ADC = compute SA sem permissão | Usar chave explícita do service account |
| "insufficient permissions" (após key file) | `.firebaseignore` excluía `lib/`, código novo não deployava | Remover `lib/` do `.firebaseignore` |
| "O item não foi encontrado" (billing) | App sideloaded (adb) com versionCode não publicado | Instalar via Play Store (internal testing) |
| Restore não funcionava | `doRestorePurchases()` não chamava `validatePurchase()` | Corrigido para validar cada compra no servidor |
| App travado na PaywallScreen | Combinação dos erros acima | Todas as correções aplicadas |

---

## Comando de Deploy Completo
```bash
cd functions
node_modules/.bin/tsc
cd ..
npx firebase deploy --only functions:validateSubscription
```

Ou para todas as functions:
```bash
cd functions
node_modules/.bin/tsc
cd ..
npx firebase deploy --only functions
```
