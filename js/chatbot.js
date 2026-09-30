/**
 * chatbot.js - chatbot logic (no DOM code here).
 *
 * Flow for every user message:
 *   1. If it mentions weather -> pull the city out of the text, fetch data
 *      from OpenWeather, store it in `lastWeather` and reply with it.
 *   2. Otherwise -> send it to the Gemini API (with recent chat history).
 *
 * Needs api.js (WeatherAPI, WeatherData) and config.js to be loaded first.
 */
(function () {
  const MAX_HISTORY = 11; // odd number so the slice always starts with a user turn

  const WEATHER_WORDS = /\b(weather|forecast|temperature)\b/i;

  const history = [];        // conversation sent to Gemini
  let lastWeather = null;    // result of the most recent weather lookup
  let defaultCity = null;    // set by the dashboard to the city currently shown

  /** Does this message ask about the weather? */
  function isWeatherQuery(text) {
    return WEATHER_WORDS.test(text);
  }

  /** Pulls "London" out of "What's the weather like in London today?" */
  function extractCity(text) {
    const m = text.match(
      /\b(?:in|for|at|of)\s+([a-zA-Z][a-zA-Z\s.'-]*?)(?:\s+(?:today|tonight|tomorrow|now|currently|please)\b|[?!,]|$)/i
    );
    // allow dots inside names ("St. Louis"), but drop a trailing one
    return m ? m[1].replace(/[.\s]+$/, "").trim() : null;
  }

  async function handleWeather(text) {
    const city = extractCity(text) || defaultCity;
    if (!city) {
      return { type: "weather", text: "Which city would you like the weather for? Try: \"weather in London\"." };
    }
    try {
      const d = await WeatherAPI.getCurrentByCity(city);
      lastWeather = {
        city: d.name,
        country: d.sys.country,
        temp: d.main.temp,
        feelsLike: d.main.feels_like,
        humidity: d.main.humidity,
        wind: d.wind.speed,
        description: d.weather[0].description
      };
      const w = lastWeather;
      return {
        type: "weather",
        text:
          `Weather in ${w.city}, ${w.country}: ${Math.round(w.temp)}°C ` +
          `(feels like ${Math.round(w.feelsLike)}°C), ${w.description}. ` +
          `Humidity ${w.humidity}%, wind ${w.wind} m/s.`
      };
    } catch (e) {
      return { type: "error", text: e.message };
    }
  }

  /** Gemini sometimes answers 503 (overloaded). Retry a couple of times before giving up. */
  async function fetchWithRetry(url, options, retries = 2) {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, options);
      if (res.status !== 503 || attempt >= retries) return res;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))); // wait 1s, then 2s
    }
  }

  async function askGemini(text) {
    const base = window.APP_CONFIG && window.APP_CONFIG.API_BASE;
    if (!base || base.includes("YOUR-")) {
      return { type: "error", text: "The chat service address is not set. Check js/config.js." };
    }

    history.push({ role: "user", parts: [{ text }] });

    let res;
    try {
      res = await fetchWithRetry(`${base.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: history.slice(-MAX_HISTORY) })
      });
    } catch (e) {
      history.pop();
      return { type: "error", text: "Network error. Please check your internet connection." };
    }

    if (!res.ok) {
      history.pop();
      const messages = {
        400: "The chat service rejected that message. Try rephrasing.",
        403: "The chat service is not available right now.",
        413: "That message is too long.",
        429: "Too many messages. Please wait a minute and try again.",
        503: "The assistant is very busy right now. Please try again in a moment."
      };
      return { type: "error", text: messages[res.status] || `Chat error (${res.status}). Try again later.` };
    }

    const data = await res.json();
    const parts = data.candidates && data.candidates[0] && data.candidates[0].content
      && data.candidates[0].content.parts;
    const reply = parts ? parts.map((p) => p.text || "").join("").trim() : "";

    if (!reply) {
      history.pop();
      return { type: "error", text: "The assistant did not return an answer. Try rephrasing." };
    }
    history.push({ role: "model", parts: [{ text: reply }] });
    return { type: "ai", text: reply };
  }

  /** Main entry point: returns { type: "weather" | "ai" | "error", text } */
  async function sendMessage(text) {
    const msg = (text || "").trim();
    if (!msg) return { type: "error", text: "Please type a message." };
    return isWeatherQuery(msg) ? handleWeather(msg) : askGemini(msg);
  }

  window.GeminiChat = {
    sendMessage,
    isWeatherQuery,
    extractCity,
    setDefaultCity: (c) => (defaultCity = c),
    getLastWeather: () => lastWeather
  };
})();
