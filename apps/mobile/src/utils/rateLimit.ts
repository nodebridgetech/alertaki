const ALERT_COOLDOWN_MS = 30000; // 30 seconds

let lastAlertTimestamp = 0;

export function canSendAlert(): boolean {
  const now = Date.now();
  return now - lastAlertTimestamp >= ALERT_COOLDOWN_MS;
}

export function markAlertSent(): void {
  lastAlertTimestamp = Date.now();
}

export function getRemainingCooldown(): number {
  const elapsed = Date.now() - lastAlertTimestamp;
  const remaining = ALERT_COOLDOWN_MS - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}
