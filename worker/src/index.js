/**
 * Skycast proxy (Cloudflare Worker).
 * Holds the OpenWeather and Gemini API keys so the website never sees them.
 *   GET  /api/weather   ?q=city | ?lat=&lon=   -> OpenWeather current weather
 *   GET  /api/forecast  ?q=city | ?lat=&lon=   -> OpenWeather 5-day forecast
 *   POST /api/chat      { contents: [...] }    -> Gemini
 * Secrets (set with `wrangler secret put`): OPENWEATHER_API_KEY, GEMINI_API_KEY
 */
const OWM = "https://api.openweathermap.org/data/2.5";
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";
const SYSTEM_PROMPT =
  "You are a friendly assistant inside a weather dashboard app. " +
  "Answer general questions clearly and briefly (under 120 words unless asked for more).";
const MAX_BODY_CHARS = 20000;

const isCoord = (v, max) => v !== null && v !== "" && Number.isFinite(Number(v)) && Math.abs(Number(v)) <= max;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    const origin = request.headers.get("Origin") || "";
    const originOk = allowed.includes(origin);

    const cors = {
      "Access-Control-Allow-Origin": originOk ? origin : allowed[0] || "",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
    const pass = (res) =>
      new Response(res.body, { status: res.status, headers: { ...cors, "Content-Type": "application/json" } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (url.pathname === "/") return new Response("Skycast proxy is running.", { headers: { "Content-Type": "text/plain" } });

    // Only the Skycast website may use the proxy
    if (!originOk) return json({ message: "Origin not allowed" }, 403);

    // Per-visitor rate limit
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const { success } = await env.LIMITER.limit({ key: ip });
    if (!success) return json({ message: "Too many requests" }, 429);

    // ---- weather / forecast ----
    if (request.method === "GET" && (url.pathname === "/api/weather" || url.pathname === "/api/forecast")) {
      const params = new URLSearchParams({ units: "metric", appid: env.OPENWEATHER_API_KEY });
      const q = url.searchParams.get("q");
      const lat = url.searchParams.get("lat");
      const lon = url.searchParams.get("lon");
      if (q) {
        if (q.length > 100) return json({ message: "City name too long" }, 400);
        params.set("q", q);
      } else if (isCoord(lat, 90) && isCoord(lon, 180)) {
        params.set("lat", lat);
        params.set("lon", lon);
      } else {
        return json({ message: "Provide q or lat and lon" }, 400);
      }
      const endpoint = url.pathname === "/api/forecast" ? "forecast" : "weather";
      const res = await fetch(`${OWM}/${endpoint}?${params}`, {
        cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": 600, "300-599": -1 } } // cache good answers 10 min
      });
      return pass(res);
    }

    // ---- chatbot ----
    if (request.method === "POST" && url.pathname === "/api/chat") {
      const raw = await request.text();
      if (raw.length > MAX_BODY_CHARS) return json({ message: "Message too long" }, 413);
      let body;
      try { body = JSON.parse(raw); } catch { return json({ message: "Invalid JSON" }, 400); }
      if (!Array.isArray(body.contents) || body.contents.length === 0 || body.contents.length > 20) {
        return json({ message: "Invalid conversation" }, 400);
      }
      // Rebuild the conversation so only plain text turns get through
      const contents = body.contents.map((c) => ({
        role: c && c.role === "model" ? "model" : "user",
        parts: [{ text: String((c && c.parts && c.parts[0] && c.parts[0].text) || "").slice(0, 2000) }]
      }));
      const res = await fetch(`${GEMINI}/${env.GEMINI_MODEL || "gemini-flash-latest"}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { maxOutputTokens: 1500 }
        })
      });
      return pass(res);
    }

    return json({ message: "Not found" }, 404);
  }
};
