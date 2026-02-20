import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { COLORS } from '../../config/constants';

export function PrivacyPolicyScreen(): React.JSX.Element {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Política de Privacidade</Text>
      <Text style={styles.lastUpdated}>Última atualização: 19 de fevereiro de 2026</Text>

      <Section title="1. Introdução">
        O Alertaki é um aplicativo de botão do pânico e alertas de emergência. Esta política de
        privacidade está em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº
        13.709/2018).
      </Section>

      <Section title="2. Dados Coletados">
        <BulletList
          items={[
            'Nome completo, email e foto de perfil (fornecidos pelo usuário ou pela conta Google/Apple)',
            'Número de telefone (opcional)',
            'Localização GPS — no momento do alerta e periodicamente (a cada 1 hora) para o recurso de proximidade',
            'Token do dispositivo (FCM) — para envio de notificações push',
            'Mensagens personalizadas em alertas de emergência',
          ]}
        />
        {'\n'}Não coletamos: lista de contatos do dispositivo, mensagens, fotos (exceto foto de
        perfil escolhida), cookies ou rastreadores de terceiros.
      </Section>

      <Section title="3. Uso dos Dados">
        <BulletList
          items={[
            'Nome, email e foto — identificação do perfil',
            'Telefone — permitir que outros usuários encontrem você',
            'Localização GPS — enviar alertas para pessoas próximas e exibir localização nos alertas',
            'Token FCM — enviar notificações push',
            'Histórico de alertas — registro para consulta do usuário',
          ]}
        />
      </Section>

      <Section title="4. Compartilhamento de Dados">
        Seus dados são compartilhados com:{'\n\n'}- Outros usuários do Alertaki: contatos de
        segurança e usuários próximos (dentro de 5km) recebem seu nome, localização e mensagem
        personalizada{'\n'}- Provedores de serviço: Google Firebase (banco de dados, autenticação,
        armazenamento, notificações){'\n\n'}
        Nenhum dado é vendido ou alugado a terceiros.
      </Section>

      <Section title="5. Armazenamento e Segurança">
        Os dados são armazenados no Google Cloud Firestore e Firebase Storage, com criptografia em
        trânsito (TLS) e em repouso. O Firebase Auth gerencia os tokens de autenticação.
      </Section>

      <Section title="6. Retenção de Dados">
        <BulletList
          items={[
            'Dados do perfil — até a exclusão da conta',
            'Histórico de alertas enviados — indefinidamente (anonimizado após exclusão da conta)',
            'Histórico de alertas recebidos — indefinidamente',
            'Localização em segundo plano — apenas o último registro é mantido',
            'Convites — até aceitação/rejeição ou exclusão da conta',
          ]}
        />
      </Section>

      <Section title="7. Direitos do Usuário (LGPD)">
        Você tem direito a: confirmação e acesso aos dados, correção, anonimização, portabilidade,
        eliminação (via "Excluir Conta" no app), informação sobre compartilhamento e revogação de
        consentimento.{'\n\n'}
        Contato: privacidade@alertaki.com.br
      </Section>

      <Section title="8. Exclusão de Conta">
        Ao excluir sua conta: dados do perfil, tokens e convites são excluídos permanentemente. Você
        é removido das listas de contatos de outros usuários. Alertas enviados permanecem no
        histórico, anonimizados como "Usuário removido". A foto de perfil é excluída do
        armazenamento.
      </Section>

      <Section title="9. Localização em Segundo Plano">
        A localização é atualizada a cada 1 hora e pode ser desabilitada nas configurações do
        dispositivo. Apenas a última localização é armazenada (sem histórico de rotas). Usada
        exclusivamente para determinação de proximidade em alertas.
      </Section>

      <Section title="10. Restrição de Idade">
        O Alertaki não é destinado a menores de 13 anos. Não coletamos intencionalmente dados de
        menores.
      </Section>

      <Section title="11. Legislação Aplicável">
        Esta política é regida pela legislação brasileira — LGPD (Lei nº 13.709/2018).
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{children}</Text>
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item, index) => (
        <Text key={index} style={styles.bulletItem}>
          {'  • '}
          {item}
        </Text>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 12,
    color: COLORS.secondaryText,
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: COLORS.primaryText,
    lineHeight: 22,
  },
  bulletItem: {
    fontSize: 14,
    color: COLORS.primaryText,
    lineHeight: 22,
  },
});
