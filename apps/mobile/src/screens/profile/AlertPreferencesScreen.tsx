import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { preferencesService } from '../../services/preferencesService';
import type { AlertPreferences } from '@alertaki/shared';
import { COLORS } from '../../config/constants';

export function AlertPreferencesScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [prefs, setPrefs] = useState<AlertPreferences>(preferencesService.DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    preferencesService.getPreferences().then((p) => {
      setPrefs(p);
      setLoading(false);
    });
  }, []);

  async function handleToggle(key: keyof AlertPreferences, value: boolean) {
    if (!user) return;

    const updated = { ...prefs, [key]: value };

    // Validate: at least one of sound/vibration/flashlight must be enabled
    if (key !== 'receiveProximityAlerts') {
      const anyAlertEnabled = updated.sound || updated.vibration || updated.flashlight;
      if (!anyAlertEnabled) {
        Alert.alert(
          'Atenção',
          'Pelo menos uma forma de notificação deve estar ativada (toque, vibração ou lanterna).',
        );
        return;
      }
    }

    setPrefs(updated);
    setSaving(true);
    try {
      await preferencesService.savePreferences(user.uid, updated);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as preferências.');
      setPrefs(prefs); // revert
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.subtitle}>
        Escolha como você quer ser notificado quando alguém enviar um alerta.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipo de notificação</Text>

        <View style={styles.row}>
          <View style={styles.labelBlock}>
            <Text style={styles.label}>Toque (som)</Text>
            <Text style={styles.hint}>Toca mesmo no modo silencioso</Text>
          </View>
          <Switch
            value={prefs.sound}
            onValueChange={(v) => handleToggle('sound', v)}
            disabled={saving}
            trackColor={{ true: COLORS.accent }}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.labelBlock}>
            <Text style={styles.label}>Vibração</Text>
            <Text style={styles.hint}>Vibra ao receber um alerta</Text>
          </View>
          <Switch
            value={prefs.vibration}
            onValueChange={(v) => handleToggle('vibration', v)}
            disabled={saving}
            trackColor={{ true: COLORS.accent }}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.labelBlock}>
            <Text style={styles.label}>Lanterna</Text>
            <Text style={styles.hint}>Pisca a lanterna ao receber um alerta</Text>
          </View>
          <Switch
            value={prefs.flashlight}
            onValueChange={(v) => handleToggle('flashlight', v)}
            disabled={saving}
            trackColor={{ true: COLORS.accent }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alertas de proximidade</Text>

        <View style={styles.row}>
          <View style={styles.labelBlock}>
            <Text style={styles.label}>Receber alertas próximos</Text>
            <Text style={styles.hint}>
              Receber alertas de usuários num raio de 2km, além dos seus contatos cadastrados
            </Text>
          </View>
          <Switch
            value={prefs.receiveProximityAlerts}
            onValueChange={(v) => handleToggle('receiveProximityAlerts', v)}
            disabled={saving}
            trackColor={{ true: COLORS.accent }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.secondaryText,
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  labelBlock: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    color: COLORS.primaryText,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    color: COLORS.secondaryText,
    marginTop: 2,
  },
});
