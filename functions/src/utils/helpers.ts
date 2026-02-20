export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function getAlertTitle(type: string): string {
  switch (type) {
    case 'health':
      return '🏥 Alerta de Saúde!';
    case 'security':
      return '🛡️ Alerta de Segurança!';
    case 'custom':
      return '⚠️ Alerta de Emergência!';
    default:
      return '🚨 Alerta!';
  }
}

export function getAlertBody(type: string, name?: string, message?: string): string {
  const userName = name || 'Alguém';
  switch (type) {
    case 'health':
      return `${userName} precisa de ajuda médica! Toque para ver a localização.`;
    case 'security':
      return `${userName} está em perigo! Toque para ver a localização.`;
    case 'custom':
      return message
        ? `${userName}: ${message.substring(0, 100)}`
        : `${userName} enviou um alerta de emergência!`;
    default:
      return `${userName} enviou um alerta!`;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=pt-BR`,
    );
    const data = (await response.json()) as {
      results?: { formatted_address: string }[];
    };
    if (data.results && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    return null;
  } catch {
    return null;
  }
}
