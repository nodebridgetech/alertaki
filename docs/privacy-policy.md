# Alertaki — Política de Privacidade

**Última atualização**: 19 de fevereiro de 2026

---

## 1. Introdução

O **Alertaki** ("nós", "nosso") é um aplicativo de botão do pânico e emergência. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais, em conformidade com a **Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)**.

Ao utilizar o Alertaki, você concorda com as práticas descritas nesta política.

---

## 2. Dados que Coletamos

### 2.1 Dados fornecidos por você
- **Nome completo**: Para identificação no app.
- **Endereço de email**: Para autenticação e identificação.
- **Número de telefone** (opcional): Para ser encontrado por outros usuários.
- **Foto de perfil** (opcional): Para identificação visual.
- **Mensagens personalizadas em alertas de emergência**: Texto livre digitado pelo usuário.

### 2.2 Dados coletados automaticamente
- **Localização geográfica (GPS)**: Coletada no momento do envio de um alerta e periodicamente (a cada 1 hora) para permitir que usuários próximos recebam alertas de emergência.
- **Token de dispositivo (FCM)**: Identificador único do dispositivo para envio de notificações push.
- **Dados de autenticação**: Informações fornecidas pelo provedor de login (Google ou Apple), incluindo nome, email e foto.

### 2.3 Dados que NÃO coletamos
- Não acessamos sua lista de contatos do dispositivo.
- Não acessamos mensagens, fotos (exceto quando você escolhe uma foto de perfil) ou outros dados pessoais do dispositivo.
- Não utilizamos cookies ou rastreadores de terceiros.

---

## 3. Como Usamos seus Dados

| Dado | Finalidade | Base Legal (LGPD) |
|------|-----------|-------------------|
| Nome, email, foto | Identificação e perfil no app | Execução de contrato (Art. 7, V) |
| Telefone | Permitir que outros usuários o encontrem | Consentimento (Art. 7, I) |
| Localização (GPS) | Enviar alertas para usuários próximos; mostrar sua localização em alertas | Proteção da vida (Art. 7, VII) |
| Token FCM | Enviar notificações push de alertas | Execução de contrato (Art. 7, V) |
| Histórico de alertas | Registro para consulta do usuário | Execução de contrato (Art. 7, V) |

---

## 4. Compartilhamento de Dados

Seus dados são compartilhados **apenas** nas seguintes situações:

### 4.1 Com outros usuários do Alertaki
- Quando você envia um alerta, seus **contatos de segurança** e **usuários próximos** (em um raio de 5km) recebem: seu nome, sua localização no momento do alerta e, no caso de alerta de emergência, sua mensagem personalizada.
- Quando você convida alguém, o destinatário vê seu nome, email e foto.

### 4.2 Com prestadores de serviço
- **Google Firebase**: Infraestrutura de banco de dados, autenticação, armazenamento de arquivos e envio de notificações. Os dados são processados nos servidores do Google conforme seus [Termos de Serviço](https://firebase.google.com/terms).

### 4.3 Não vendemos seus dados
Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins comerciais ou publicitários.

---

## 5. Armazenamento e Segurança

- Seus dados são armazenados no **Google Cloud Firestore** e **Firebase Storage**, com criptografia em trânsito (TLS) e em repouso.
- Tokens de autenticação são gerenciados pelo **Firebase Authentication**.
- O acesso aos dados no banco de dados é controlado por **regras de segurança** (Firestore Security Rules) que garantem que cada usuário só pode acessar seus próprios dados.

---

## 6. Retenção de Dados

| Dado | Período de Retenção |
|------|-------------------|
| Dados do perfil | Até a exclusão da conta |
| Histórico de alertas enviados | Indefinidamente (anonimizado após exclusão da conta) |
| Histórico de alertas recebidos | Indefinidamente |
| Localização em background | Sobrescrita a cada atualização (apenas último registro) |
| Convites | Até aceitação/recusa ou exclusão da conta |

---

## 7. Seus Direitos (LGPD)

Conforme a LGPD, você tem os seguintes direitos:

1. **Confirmação e acesso**: Saber se tratamos seus dados e acessá-los.
2. **Correção**: Corrigir dados incompletos, inexatos ou desatualizados (via tela de edição de perfil).
3. **Anonimização, bloqueio ou eliminação**: Solicitar o tratamento de dados desnecessários ou excessivos.
4. **Portabilidade**: Solicitar seus dados em formato estruturado.
5. **Eliminação**: Solicitar a exclusão dos seus dados pessoais (via funcionalidade "Excluir Conta" no app).
6. **Informação sobre compartilhamento**: Saber com quais entidades seus dados são compartilhados.
7. **Revogação de consentimento**: Revogar o consentimento a qualquer momento.

### Como exercer seus direitos

- **Exclusão de conta**: Disponível diretamente no app em Perfil → Excluir Conta.
- **Edição de dados**: Disponível em Perfil → Editar Perfil.
- **Outras solicitações**: Entre em contato pelo email **privacidade@alertaki.com.br**.

---

## 8. Exclusão de Conta

Ao solicitar a exclusão da sua conta:
- Seus dados de perfil, tokens e convites são **permanentemente deletados**.
- Você é removido da lista de contatos de segurança de todos os outros usuários.
- Alertas enviados por você permanecem no histórico de outros usuários de forma **anonimizada** (nome substituído por "Usuário removido").
- Sua foto de perfil é deletada do armazenamento.

A exclusão é processada imediatamente e é **irreversível**.

---

## 9. Localização em Background

O Alertaki coleta sua localização em segundo plano (background) **a cada 1 hora** para permitir que você receba alertas de outros usuários próximos a você. Esta funcionalidade:

- Pode ser desativada nas configurações do dispositivo (revogando a permissão de localização).
- Consome uma quantidade mínima de bateria.
- Apenas registra a **última localização** (não mantém histórico de rotas).
- A localização é usada **exclusivamente** para determinar proximidade com alertas de emergência.

---

## 10. Menores de Idade

O Alertaki não é destinado a menores de 13 anos. Não coletamos intencionalmente dados de menores de 13 anos. Se você é pai ou responsável e acredita que seu filho nos forneceu dados pessoais, entre em contato conosco.

---

## 11. Alterações nesta Política

Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças significativas através do app. A data da última atualização estará sempre no topo deste documento.

---

## 12. Contato

Para dúvidas, solicitações ou reclamações relacionadas a esta Política de Privacidade ou ao tratamento dos seus dados:

- **Email**: privacidade@alertaki.com.br
- **Responsável pelo tratamento de dados (Encarregado/DPO)**: [Nome a definir]

---

## 13. Legislação Aplicável

Esta Política de Privacidade é regida pela legislação brasileira, em especial a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
