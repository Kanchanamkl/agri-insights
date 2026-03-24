/**
 * weatherService.ts
 *
 * Fetches real-world weather data for a Sri Lankan district from the
 * Open-Meteo API (https://open-meteo.com).
 *
 * Why Open-Meteo?
 *  - Completely free, no API key required — ideal for a research prototype
 *  - Sub-1 km resolution for Sri Lanka via ERA5-Land reanalysis
 *  - Returns temperature, humidity, and precipitation in one request
 *
 * Aggregation strategy
 *  - temperature : 7-day mean of daily temperature_2m_mean  → rounded to 1 dp
 *  - humidity    : 7-day mean of daily relative_humidity_2m_mean → rounded integer
 *  - rainfall    : 7-day SUM  of daily precipitation_sum    → rounded integer
 *
 *  Using a 7-day window gives seasonal context that is more meaningful for
 *  crop recommendation than a single-day snapshot.
 *
 * Caching
 *  Results are cached in sessionStorage keyed by district name.
 *  The cache TTL is 30 minutes — enough to survive Back/Next navigation without
 *  burning extra API calls, but fresh enough for a farm visit session.
 */

export interface WeatherResult {
    temperature: number;  // °C  — 7-day mean, clamped to 15–40
    humidity: number;     // %   — 7-day mean, clamped to 0–100
    rainfall: number;     // mm  — 7-day sum,  clamped to 0–500
    fetchedAt: string;    // ISO timestamp
  }
  
  interface OpenMeteoResponse {
    daily: {
      time: string[];
      temperature_2m_mean: number[];
      relative_humidity_2m_mean: number[];
      precipitation_sum: number[];
    };
  }
  
  // ─── Constants ────────────────────────────────────────────────────────────────
  
  const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
  const TIMEZONE = 'Asia/Colombo';
  const PAST_DAYS = 7;
  const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
  
  // ─── Helpers ──────────────────────────────────────────────────────────────────
  
  function mean(values: number[]): number {
    const valid = values.filter((v) => v != null && !isNaN(v));
    if (valid.length === 0) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  }
  
  function sum(values: number[]): number {
    return values
      .filter((v) => v != null && !isNaN(v))
      .reduce((a, b) => a + b, 0);
  }
  
  function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
  
  // ─── Session cache ─────────────────────────────────────────────────────────────
  
  interface CacheEntry {
    result: WeatherResult;
    cachedAt: number; // Date.now()
  }
  
  function getCached(district: string): WeatherResult | null {
    try {
      const raw = sessionStorage.getItem(`weather_${district}`);
      if (!raw) return null;
      const entry: CacheEntry = JSON.parse(raw);
      if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
        sessionStorage.removeItem(`weather_${district}`);
        return null;
      }
      return entry.result;
    } catch {
      return null;
    }
  }
  
  function setCache(district: string, result: WeatherResult): void {
    try {
      const entry: CacheEntry = { result, cachedAt: Date.now() };
      sessionStorage.setItem(`weather_${district}`, JSON.stringify(entry));
    } catch {
      // sessionStorage full or unavailable — silently skip caching
    }
  }
  
  // ─── Main fetch function ───────────────────────────────────────────────────────
  
  /**
   * Fetch 7-day aggregated weather for a given lat/lng coordinate.
   *
   * @param lat       - Latitude  (district centroid)
   * @param lng       - Longitude (district centroid)
   * @param district  - District name — used as the cache key
   * @returns         WeatherResult with temperature, humidity, rainfall
   * @throws          Error with a user-friendly message on network or parse failure
   */
  export async function fetchWeatherForDistrict(
    lat: number,
    lng: number,
    district: string
  ): Promise<WeatherResult> {
    // 1. Check session cache first
    const cached = getCached(district);
    if (cached) return cached;
  
    // 2. Build the Open-Meteo request URL
    const params = new URLSearchParams({
      latitude:  String(lat),
      longitude: String(lng),
      daily: [
        'temperature_2m_mean',
        'relative_humidity_2m_mean',
        'precipitation_sum',
      ].join(','),
      timezone:  TIMEZONE,
      past_days: String(PAST_DAYS),
      // Limit forecast window to today only — we only want historical past_days
      forecast_days: '1',
    });
  
    const url = `${BASE_URL}?${params.toString()}`;
  
    // 3. Fetch
    let response: Response;
    try {
      response = await fetch(url);
    } catch (networkError) {
      throw new Error(
        'Could not reach the weather service. Please check your internet connection.'
      );
    }
  
    if (!response.ok) {
      throw new Error(
        `Weather API returned an error (HTTP ${response.status}). Please try again.`
      );
    }
  
    // 4. Parse
    let data: OpenMeteoResponse;
    try {
      data = await response.json();
    } catch {
      throw new Error('Received an unexpected response from the weather service.');
    }
  
    const { temperature_2m_mean, relative_humidity_2m_mean, precipitation_sum } =
      data.daily ?? {};
  
    if (!temperature_2m_mean || !relative_humidity_2m_mean || !precipitation_sum) {
      throw new Error(
        'Weather data is incomplete for this location. Please enter values manually.'
      );
    }
  
    // 5. Aggregate
    const rawTemp     = mean(temperature_2m_mean);
    const rawHumidity = mean(relative_humidity_2m_mean);
    const rawRainfall = sum(precipitation_sum);
  
    const result: WeatherResult = {
      temperature: clamp(Math.round(rawTemp * 10) / 10, 15, 40),
      humidity:    clamp(Math.round(rawHumidity),         0, 100),
      rainfall:    clamp(Math.round(rawRainfall),          0, 500),
      fetchedAt:   new Date().toISOString(),
    };
  
    // 6. Cache and return
    setCache(district, result);
    return result;
  }
  
  /**
   * Clear the cached weather entry for a specific district.
   * Call this when the user explicitly hits "Refresh".
   */
  export function clearWeatherCache(district: string): void {
    try {
      sessionStorage.removeItem(`weather_${district}`);
    } catch {
      // ignore
    }
  }