export const ALERT_COLORS = {
  health: {
    gradient: ['#FF4444', '#FF8800'],
    primary: '#FF4444',
  },
  security: {
    gradient: ['#4444FF', '#8800FF'],
    primary: '#4444FF',
  },
  custom: {
    gradient: ['#8800FF', '#FF4444'],
    primary: '#8800FF',
  },
} as const;

export const COLORS = {
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  primaryText: '#212121',
  secondaryText: '#757575',
  accent: '#FF4444',
  white: '#FFFFFF',
  border: '#E0E0E0',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
} as const;

export const CUSTOM_MESSAGE_MAX_LENGTH = 500;
export const PROFILE_PHOTO_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const GPS_TIMEOUT = 10000;
export const LOCATION_UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour
