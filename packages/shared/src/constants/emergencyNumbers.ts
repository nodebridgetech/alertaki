export const EMERGENCY_NUMBERS = {
  SAMU: '192',
  POLICE: '190',
} as const;

export type EmergencyService = keyof typeof EMERGENCY_NUMBERS;
