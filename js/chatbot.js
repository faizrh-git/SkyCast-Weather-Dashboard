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
  const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
  const SYSTEM_PROMPT =
    "You are a friendly assistant inside a weather dashboard app. " +
    "Answer general questions clearly and briefly (under 120 words unless asked for more).";
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
    const cfg = window.APP_CONFIG || {};
    if (!cfg.GEMINI_API_KEY || cfg.GEMINI_API_KEY.startsWith("YOUR_")) {
      return { type: "error", text: "Gemini API key is missing. Check js/config.js." };
    }
    const model = cfg.GEMINI_MODEL || "gemini-flash-latest";

    history.push({ role: "user", parts: [{ text }] });

    let res;
    try {
      res = await fetchWithRetry(`${GEMINI_BASE}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.GEMINI_API_KEY },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: history.slice(-MAX_HISTORY)
        })
      });
    } catch (e) {
      history.pop();
      return { type: "error", text: "Network error. Please check your internet connection." };
    }

    if (!res.ok) {
      history.pop();
      const messages = {
        400: "Gemini rejected the request (check your API key and model name in config.js).",
        403: "Gemini API key is not allowed to do this. Check the key.",
        404: "Gemini model not found. Update GEMINI_MODEL in config.js.",
        429: "Gemini rate limit reached. Please wait a minute and try again.",
        503: "Gemini is very busy right now. Please try again in a moment."
      };
      return { type: "error", text: messages[res.status] || `Gemini error (${res.status}). Try again later.` };
    }

    const data = await res.json();
    const parts = data.candidates && data.candidates[0] && data.candidates[0].content
      && data.candidates[0].content.parts;
    const reply = parts ? parts.map((p) => p.text || "").join("").trim() : "";

    if (!reply) {
      history.pop();
      return { type: "error", text: "Gemini did not return an answer. Try rephrasing." };
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

  /** Debug helper: lists model names your key can use. */
  async function listModels() {
    const res = await fetch(`${GEMINI_BASE}/models`, {
      headers: { "x-goog-api-key": window.APP_CONFIG.GEMINI_API_KEY }
    });
    const data = await res.json();
    const names = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => m.name.replace("models/", ""));
    console.log(names);
    return names;
  }

  window.GeminiChat = {
    sendMessage,
    isWeatherQuery,
    extractCity,
    listModels,
    setDefaultCity: (c) => (defaultCity = c),
    getLastWeather: () => lastWeather
  };
})();