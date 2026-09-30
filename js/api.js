/**
 * api.js - OpenWeather data layer.
 * Handles requests, error mapping and caching (avoids repeated calls
 * for unchanged input, as the assignment requires).
 * Data is always fetched in metric (Celsius); Fahrenheit is converted
 * on the client so the unit toggle needs no extra API call.
 */
(function () {
  const BASE = "https://api.openweathermap.org/data/2.5";
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  const cache = new Map();

  class WeatherError extends Error {
    constructor(message, code) {
      super(message);
      this.name = "WeatherError";
      this.code = code;
    }
  }

  function getKey() {
    const key = window.APP_CONFIG && window.APP_CONFIG.OPENWEATHER_API_KEY;
    if (!key || key.startsWith("YOUR_")) {
      throw new WeatherError("OpenWeather API key is missing. Check js/config.js.", "NO_KEY");
    }
    return key;
  }

  async function request(endpoint, params) {
    const query = new URLSearchParams({ ...params, appid: getKey(), units: "metric" });
    const url = `${BASE}/${endpoint}?${query}`;

    const hit = cache.get(url);
    if (hit && Date.now() - hit.time < CACHE_TTL_MS) return hit.data;

    let res;
    try {
      res = await fetch(url);
    } catch (e) {
      throw new WeatherError("Network error. Please check your internet connection.", "NETWORK");
    }

    if (!res.ok) {
      if (res.status === 404) throw new WeatherError("City not found. Please check the spelling.", "NOT_FOUND");
      if (res.status === 401) throw new WeatherError("Invalid API key.", "BAD_KEY");
      if (res.status === 429) throw new WeatherError("API limit reached. Please wait a minute and try again.", "RATE_LIMIT");
      throw new WeatherError(`Weather service error (${res.status}). Try again later.`, "SERVER");
    }

    const data = await res.json();
    cache.set(url, { data, time: Date.now() });
    return data;
  }

  function cleanCity(city) {
    const c = (city || "").trim();
    if (!c) throw new WeatherError("Please enter a city name.", "EMPTY");
    return c;
  }

  window.WeatherAPI = {
    WeatherError,
    getCurrentByCity: (city) => request("weather", { q: cleanCity(city) }),
    getCurrentByCoords: (lat, lon) => request("weather", { lat, lon }),
    getForecastByCity: (city) => request("forecast", { q: cleanCity(city) }),
    getForecastByCoords: (lat, lon) => request("forecast", { lat, lon }),
    iconUrl: (icon) => `https://openweathermap.org/img/wn/${icon}@2x.png`
  };
})();
