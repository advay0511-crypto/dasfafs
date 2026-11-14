import { TtlCache, fetchWithTimeout } from '../lib/cache';

export interface LiveWeatherReading {
  tempC: number;
  humidityPct: number;
  windKmh: number;
  precipMm: number;
  weatherCode: number;
  conditionLabel: string;
  observedAt: string;
  isDay: boolean;
}

const weatherCache = new TtlCache<LiveWeatherReading>(10 * 60 * 1000);

function describeWmoCode(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 57) return 'Light drizzle';
  if (code >= 61 && code <= 63) return 'Light rain';
  if (code >= 65 && code <= 67) return 'Heavy rain';
  if (code >= 71 && code <= 77) return 'Snowfall';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Partly cloudy';
}

interface OpenMeteoResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    is_day?: number;
  };
}

export async function fetchLiveFarmWeather(
  lat: number,
  lon: number
): Promise<LiveWeatherReading> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = weatherCache.get(key);
  if (cached) return cached;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day&timezone=auto`;

  const resp = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 8000);
  if (!resp.ok) {
    throw new Error(`Weather service returned HTTP ${resp.status}`);
  }

  const json = (await resp.json()) as OpenMeteoResponse;
  const cur = json.current;
  if (!cur || typeof cur.temperature_2m !== 'number') {
    throw new Error('Weather service returned incomplete data');
  }

  const code = cur.weather_code ?? 2;
  const reading: LiveWeatherReading = {
    tempC: Math.round(cur.temperature_2m),
    humidityPct: Math.round(cur.relative_humidity_2m ?? 60),
    windKmh: Math.round(cur.wind_speed_10m ?? 10),
    precipMm: Number((cur.precipitation ?? 0).toFixed(1)),
    weatherCode: code,
    conditionLabel: describeWmoCode(code),
    observedAt: cur.time ?? new Date().toISOString(),
    isDay: cur.is_day === 1,
  };

  weatherCache.set(key, reading);
  return reading;
}
