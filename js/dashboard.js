/**
 * dashboard.js - connects the page to the data layer (api.js / data.js).
 * Handles search, unit toggle, geolocation, spinner, errors and rendering.
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const form = $("search-form");
  const input = $("city-input");

  let unit = localStorage.getItem("unit") === "F" ? "F" : "C";
  let state = null;     // { current, daily } for the city on screen
  let lastKey = null;   // identifies the last successful request

  function setLoading(on) {
    $("spinner").hidden = !on;
    form.querySelector("button").disabled = on;
  }

  function showError(msg) {
    $("error").textContent = msg;
    $("error").hidden = !msg;
  }

  /** Fetch current weather + forecast. Skips the call if nothing changed. */
  async function load(key, getCurrent, getForecast) {
    if (state && key === lastKey) return;
    setLoading(true);
    showError("");
    try {
      const [current, forecast] = await Promise.all([getCurrent(), getForecast()]);
      state = { current, daily: WeatherData.toDailySummaries(WeatherData.toEntries(forecast)) };
      lastKey = key;
      localStorage.setItem("lastCity", current.name); // the Tables page reuses this
      input.value = current.name;
      render();
    } catch (e) {
      showError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const loadCity = (city) =>
    load("city:" + city.trim().toLowerCase(),
      () => WeatherAPI.getCurrentByCity(city),
      () => WeatherAPI.getForecastByCity(city));

  const loadCoords = (lat, lon) =>
    load(`geo:${lat.toFixed(2)},${lon.toFixed(2)}`,
      () => WeatherAPI.getCurrentByCoords(lat, lon),
      () => WeatherAPI.getForecastByCoords(lat, lon));

  function render() {
    const c = state.current;
    const w = c.weather[0];

    const widget = $("widget");
    widget.className = "widget " + WeatherData.backgroundClass(w.main, w.icon);
    widget.hidden = false;

    $("w-city").textContent = `${c.name}, ${c.sys.country}`;
    $("w-date").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    $("w-temp").textContent = WeatherData.formatTemp(c.main.temp, unit);
    $("w-desc").textContent = w.description;
    $("w-feels").textContent = WeatherData.formatTemp(c.main.feels_like, unit);
    $("w-humidity").textContent = c.main.humidity + "%";
    $("w-wind").textContent = c.wind.speed + " m/s";

    const icon = $("w-icon");
    icon.src = WeatherAPI.iconUrl(w.icon);
    icon.alt = w.description;
    icon.classList.remove("pop");
    void icon.offsetWidth; // restart the fade-in animation
    icon.classList.add("pop");

    renderForecast();
    Charts.render(state.daily, unit);
  }

  function renderForecast() {
    $("forecast").innerHTML = state.daily.map((d) => {
      const day = new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      return `<div class="day">
        <strong>${day}</strong>
        <img src="${WeatherAPI.iconUrl(d.icon)}" alt="${d.condition}">
        <div class="range">${WeatherData.formatTemp(d.max, unit)} / ${WeatherData.formatTemp(d.min, unit)}</div>
        <div class="cond">${d.condition}</div>
      </div>`;
    }).join("");
    $("forecast-section").hidden = false;
  }

  // ---- events ----
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    loadCity(input.value);
  });

  document.querySelectorAll(".units button").forEach((btn) => {
    btn.addEventListener("click", () => {
      unit = btn.dataset.unit;
      localStorage.setItem("unit", unit);
      syncUnitButtons();
      if (state) render(); // no new API call needed
    });
  });

  function syncUnitButtons() {
    document.querySelectorAll(".units button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.unit === unit)));
  }

  // ---- start: use the user's location, else last city, else London ----
  function init() {
    syncUnitButtons();
    const fallback = () => loadCity(localStorage.getItem("lastCity") || "London");
    if (!navigator.geolocation) return fallback();
    navigator.geolocation.getCurrentPosition(
      (pos) => loadCoords(pos.coords.latitude, pos.coords.longitude),
      fallback,
      { timeout: 8000 }
    );
  }
  init();
})();
