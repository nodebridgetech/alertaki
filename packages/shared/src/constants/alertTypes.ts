import { AlertType } from '../types/alert';

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  health: 'Saúde',
  security: 'Segurança',
  custom: 'Emergência',
};

export const ALERT_RADIUS_KM: Record<AlertType, number> = {
  health: 5,
  security: 5,
  custom: 0,
};
