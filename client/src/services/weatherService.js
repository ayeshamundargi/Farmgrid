/**
 * Agricultural Weather Service for FarmGrid
 * Provides real-time micro-climate indicators, 5-day forecasts, and actionable
 * agricultural advisories (spraying, harvesting, machinery trafficability, irrigation).
 * Powered by Open-Meteo Agro-Meteorology API (Free, high-resolution, no API keys needed).
 */

const CACHE_PREFIX = 'farmgrid_weather_';
const CACHE_TTL_MS = 25 * 60 * 1000; // 25 minutes cache

// WMO Weather Code Mappings to Agricultural descriptions and visual icons
export const WMO_WEATHER_CODES = {
  0: { label: 'Clear Sky', icon: '☀️', condition: 'Sunny' },
  1: { label: 'Mainly Clear', icon: '🌤️', condition: 'Clear' },
  2: { label: 'Partly Cloudy', icon: '⛅', condition: 'Partly Cloudy' },
  3: { label: 'Overcast', icon: '☁️', condition: 'Cloudy' },
  45: { label: 'Foggy', icon: '🌫️', condition: 'Fog' },
  48: { label: 'Depositing Rime Fog', icon: '🌫️', condition: 'Rime Fog' },
  51: { label: 'Light Drizzle', icon: '🌦️', condition: 'Drizzle' },
  53: { label: 'Moderate Drizzle', icon: '🌦️', condition: 'Drizzle' },
  55: { label: 'Dense Drizzle', icon: '🌧️', condition: 'Heavy Drizzle' },
  61: { label: 'Slight Rain', icon: '🌧️', condition: 'Light Rain' },
  63: { label: 'Moderate Rain', icon: '🌧️', condition: 'Moderate Rain' },
  65: { label: 'Heavy Rain', icon: '🌧️', condition: 'Heavy Rain' },
  71: { label: 'Slight Snowfall', icon: '🌨️', condition: 'Snow' },
  73: { label: 'Moderate Snowfall', icon: '🌨️', condition: 'Snow' },
  75: { label: 'Heavy Snowfall', icon: '❄️', condition: 'Heavy Snow' },
  77: { label: 'Snow Grains', icon: '❄️', condition: 'Snow Grains' },
  80: { label: 'Slight Rain Showers', icon: '🌦️', condition: 'Showers' },
  81: { label: 'Moderate Rain Showers', icon: '🌧️', condition: 'Heavy Showers' },
  82: { label: 'Violent Rain Showers', icon: '⛈️', condition: 'Violent Showers' },
  85: { label: 'Slight Snow Showers', icon: '🌨️', condition: 'Snow Showers' },
  86: { label: 'Heavy Snow Showers', icon: '❄️', condition: 'Heavy Snow Showers' },
  95: { label: 'Thunderstorm', icon: '⛈️', condition: 'Thunderstorm' },
  96: { label: 'Thunderstorm with Slight Hail', icon: '⛈️', condition: 'Thunder & Hail' },
  99: { label: 'Thunderstorm with Heavy Hail', icon: '⛈️', condition: 'Severe Storm' }
};

export function getWeatherCondition(code) {
  return WMO_WEATHER_CODES[code] || { label: 'Variable Weather', icon: '⛅', condition: 'Fair' };
}

/**
 * Computes agricultural suitability advisories based on meteorological metrics
 */
export function generateAgriAdvisories(current, dailyToday = {}) {
  const rain = current?.precipitation ?? 0;
  const windSpeed = current?.wind_speed_10m ?? 0;
  const rainProb = dailyToday?.precipitation_probability_max ?? 0;
  const maxRainToday = dailyToday?.precipitation_sum ?? rain;

  const advisories = {
    // 1. Machine Trafficability & Tillage (Tractors, Tillers, Harvesters)
    trafficability: {
      status: 'GOOD', // GOOD, CAUTION, HAZARD
      label: 'Machinery Field Trafficability',
      color: 'emerald',
      message: 'Dry field conditions. Safe for heavy machinery and tractors.'
    },
    // 2. Crop Spraying (Pesticides, Fungicides, Drone Spraying)
    spraying: {
      status: 'OPTIMAL', // OPTIMAL, CAUTION, UNFAVORABLE
      label: 'Chemical & Drone Spraying',
      color: 'emerald',
      message: 'Optimal wind speed (< 15 km/h) with no rain wash-off risk.'
    },
    // 3. Harvesting Operations (Combine Harvesters, Threshers)
    harvesting: {
      status: 'PRIME', // PRIME, MONITOR, DELAY
      label: 'Harvesting & Threshing',
      color: 'emerald',
      message: 'Prime dry conditions for harvesting standing crops.'
    },
    // 4. Irrigation Management (Pumps, Drip, Sprinklers)
    irrigation: {
      status: 'STANDARD', // STANDARD, REDUCE, PAUSE
      label: 'Irrigation Scheduling',
      color: 'blue',
      message: 'Standard irrigation recommended based on soil transpiration.'
    }
  };

  // Evaluate Trafficability
  if (maxRainToday > 10 || rain > 3) {
    advisories.trafficability = {
      status: 'HAZARD',
      label: 'Machinery Field Trafficability',
      color: 'rose',
      message: 'Heavy rain detected. High risk of heavy tractors sinking and soil compaction.'
    };
  } else if (maxRainToday > 2 || rain > 0.5) {
    advisories.trafficability = {
      status: 'CAUTION',
      label: 'Machinery Field Trafficability',
      color: 'amber',
      message: 'Moist field topsoil. Monitor tractor tire slippage in low-lying parcels.'
    };
  }

  // Evaluate Spraying (Wind & Rain)
  if (rain > 0.2 || rainProb > 50) {
    advisories.spraying = {
      status: 'UNFAVORABLE',
      label: 'Chemical & Drone Spraying',
      color: 'rose',
      message: 'Rain expected. High risk of pesticide wash-off; avoid chemical application.'
    };
  } else if (windSpeed > 20) {
    advisories.spraying = {
      status: 'UNFAVORABLE',
      label: 'Chemical & Drone Spraying',
      color: 'rose',
      message: `High wind speed (${windSpeed} km/h). Severe spray drift risk for drones & boom sprayers.`
    };
  } else if (windSpeed > 14) {
    advisories.spraying = {
      status: 'CAUTION',
      label: 'Chemical & Drone Spraying',
      color: 'amber',
      message: `Moderate breeze (${windSpeed} km/h). Use low-drift nozzles; calibrate drone altitude.`
    };
  }

  // Evaluate Harvesting
  if (rainProb > 45 || maxRainToday > 3) {
    advisories.harvesting = {
      status: 'DELAY',
      label: 'Harvesting & Threshing',
      color: 'rose',
      message: `Rain probability ${rainProb}%. Delay combine harvesting to prevent wet grain spoilage.`
    };
  } else if (rainProb > 25) {
    advisories.harvesting = {
      status: 'MONITOR',
      label: 'Harvesting & Threshing',
      color: 'amber',
      message: 'Moderate rain chance. Prioritize rapid field harvesting before afternoon clouds build.'
    };
  }

  // Evaluate Irrigation
  if (maxRainToday > 5 || rainProb > 60) {
    advisories.irrigation = {
      status: 'PAUSE',
      label: 'Irrigation Scheduling',
      color: 'emerald',
      message: 'Natural precipitation will replenish root zone. Pause scheduled pump cycles.'
    };
  }

  return advisories;
}

/**
 * Fetches agricultural weather for given latitude and longitude.
 * Results are cached in memory and localStorage for resilience.
 */
export async function fetchAgriWeather(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Invalid coordinates for weather query');
  }

  // Round coordinates to 2 decimals for optimal caching
  const roundedLat = parseFloat(lat.toFixed(2));
  const roundedLng = parseFloat(lng.toFixed(2));
  const cacheKey = `${CACHE_PREFIX}${roundedLat}_${roundedLng}`;

  // Check cache
  try {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather service returned HTTP ${res.status}`);
  }

  const raw = await res.json();
  const current = raw.current || {};
  const dailyRaw = raw.daily || {};

  const currentCondition = getWeatherCondition(current.weather_code);

  // Parse 5-day daily forecast
  const dailyForecast = (dailyRaw.time || []).slice(0, 5).map((timeStr, idx) => {
    const code = dailyRaw.weather_code?.[idx] ?? 0;
    const cond = getWeatherCondition(code);
    const dateObj = new Date(timeStr);
    const dayName = idx === 0 ? 'Today' : dateObj.toLocaleDateString(undefined, { weekday: 'short' });
    const formattedDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    return {
      date: timeStr,
      dayName,
      formattedDate,
      weatherCode: code,
      condition: cond.condition,
      icon: cond.icon,
      maxTemp: Math.round(dailyRaw.temperature_2m_max?.[idx] ?? 0),
      minTemp: Math.round(dailyRaw.temperature_2m_min?.[idx] ?? 0),
      precipitationSum: dailyRaw.precipitation_sum?.[idx] ?? 0,
      precipitationProbability: dailyRaw.precipitation_probability_max?.[idx] ?? 0
    };
  });

  const dailyToday = dailyForecast[0] || {};
  const advisories = generateAgriAdvisories(current, dailyToday);

  const formattedData = {
    latitude: roundedLat,
    longitude: roundedLng,
    timezone: raw.timezone,
    current: {
      temperature: Math.round(current.temperature_2m ?? 0),
      apparentTemperature: Math.round(current.apparent_temperature ?? 0),
      humidity: current.relative_humidity_2m ?? 0,
      precipitation: current.precipitation ?? 0,
      windSpeed: Math.round(current.wind_speed_10m ?? 0),
      weatherCode: current.weather_code,
      condition: currentCondition.condition,
      label: currentCondition.label,
      icon: currentCondition.icon,
      time: current.time
    },
    daily: dailyForecast,
    advisories,
    fetchedAt: new Date().toISOString()
  };

  // Save to cache
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ timestamp: Date.now(), data: formattedData })
    );
  } catch (e) {
    // Ignore localStorage write quota errors
  }

  return formattedData;
}
