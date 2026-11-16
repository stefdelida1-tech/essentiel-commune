/**
 * src/services/weather.js
 * Service de récupération météo via l'API Open-Meteo (sans clé, open-source)
 */

// Table de correspondance des codes météo WMO
export const WMO_WEATHER_CODES = {
  0: { label: 'Ciel dégagé', icon: '☀️' },
  1: { label: 'Principalement dégagé', icon: '🌤️' },
  2: { label: 'Partiellement nuageux', icon: '⛅' },
  3: { label: 'Couvert', icon: '☁️' },
  45: { label: 'Brouillard', icon: '🌫️' },
  48: { label: 'Brouillard givrant', icon: '🌫️' },
  51: { label: 'Bruine légère', icon: '🌦️' },
  53: { label: 'Bruine modérée', icon: '🌦️' },
  55: { label: 'Bruine dense', icon: '🌧️' },
  61: { label: 'Pluie faible', icon: '🌧️' },
  63: { label: 'Pluie modérée', icon: '🌧️' },
  65: { label: 'Pluie forte', icon: '🌧️' },
  71: { label: 'Chute de neige légère', icon: '🌨️' },
  73: { label: 'Chute de neige modérée', icon: '❄️' },
  75: { label: 'Chute de neige forte', icon: '❄️' },
  80: { label: 'Averses faibles', icon: '🌦️' },
  81: { label: 'Averses modérées', icon: '🌧️' },
  82: { label: 'Averses violentes', icon: '⛈️' },
  95: { label: 'Orage modéré', icon: '⛈️' },
  96: { label: 'Orage avec grêle légère', icon: '⛈️' },
  99: { label: 'Orage violent avec grêle', icon: '🌩️' }
};

export function interpretWeatherCode(code) {
  return WMO_WEATHER_CODES[code] || { label: 'Conditions variables', icon: '🌤️' };
}

export async function fetchWeather(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('Coordonnées géographiques invalides pour la météo');
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FParis`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Erreur API Météo: ${res.status}`);
    }

    const data = await res.json();
    const current = data.current_weather;
    const daily = data.daily;

    const weatherInfo = interpretWeatherCode(current.weathercode);

    return {
      success: true,
      temperature: Math.round(current.temperature),
      windspeed: Math.round(current.windspeed),
      icon: weatherInfo.icon,
      label: weatherInfo.label,
      tempMax: daily?.temperature_2m_max?.[0] !== undefined ? Math.round(daily.temperature_2m_max[0]) : null,
      tempMin: daily?.temperature_2m_min?.[0] !== undefined ? Math.round(daily.temperature_2m_min[0]) : null
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Délai d\'attente dépassé' : err.message,
      temperature: null,
      icon: '⛅',
      label: 'Météo indisponible'
    };
  }
}

/**
 * Qualité de l'air (indice US AQI + PM2.5) via Open-Meteo Air Quality.
 * @returns {Promise<{success: boolean, usAqi: number|null, pm25: number|null}>}
 */
export async function fetchAirQuality(lat, lng) {
  const fallback = { success: false, usAqi: null, pm25: null };
  if (typeof lat !== 'number' || typeof lng !== 'number') return fallback;

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=us_aqi,pm2_5&timezone=Europe%2FParis`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return fallback;

    const data = await res.json();
    return {
      success: true,
      usAqi: data.current?.us_aqi ?? null,
      pm25: data.current?.pm2_5 ?? null
    };
  } catch {
    clearTimeout(timeoutId);
    return fallback;
  }
}

/** Interprétation qualitative de l'indice US AQI. */
export function interpretAqi(aqi) {
  if (typeof aqi !== 'number') return null;
  if (aqi <= 50) return 'Bon';
  if (aqi <= 100) return 'Modéré';
  if (aqi <= 150) return 'Sensible (groupes à risque)';
  if (aqi <= 200) return 'Mauvais';
  if (aqi <= 300) return 'Très mauvais';
  return 'Dangereux';
}
