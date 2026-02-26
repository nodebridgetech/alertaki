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

const BR_STATE_ABBR: Record<string, string> = {
  'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM',
  'Bahia': 'BA', 'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES',
  'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
  'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN', 'Rio Grande do Sul': 'RS', 'Rondônia': 'RO',
  'Roraima': 'RR', 'Santa Catarina': 'SC', 'São Paulo': 'SP',
  'Sergipe': 'SE', 'Tocantins': 'TO',
};

function formatNominatimAddress(data: Record<string, unknown>): string | null {
  const addr = data.address as Record<string, string> | undefined;
  if (!addr) return (data.display_name as string) || null;

  const road = addr.road || addr.pedestrian || addr.street || '';
  const number = addr.house_number || '';
  const suburb = addr.suburb || addr.neighbourhood || addr.quarter || '';
  const city = addr.city || addr.town || addr.village || addr.municipality || '';
  const state = addr.state || '';
  const postcode = addr.postcode || '';
  const stateAbbr = BR_STATE_ABBR[state] || state;

  const parts: string[] = [];
  if (road) parts.push(number ? `${road}, ${number}` : road);
  if (suburb) parts.push(suburb);
  const cityState = city && stateAbbr ? `${city} - ${stateAbbr}` : city || stateAbbr;
  if (cityState) parts.push(cityState);
  if (postcode) parts.push(postcode);

  if (parts.length === 0) return (data.display_name as string) || null;
  if (parts.length >= 2 && road && suburb) {
    return `${parts[0]} - ${parts.slice(1).join(', ')}`;
  }
  return parts.join(', ');
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  // Try Google Maps first (if API key is configured)
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (apiKey) {
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
    } catch {
      // Fall through to Nominatim
    }
  }

  // Fallback to Nominatim (OpenStreetMap)
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'Alertaki/1.0' } },
    );
    const data = (await response.json()) as Record<string, unknown>;
    return formatNominatimAddress(data);
  } catch {
    return null;
  }
}
