/**
 * data.js - pure functions that transform API responses.
 * No DOM access here, so everything is easy to test in the console.
 */
(function () {
  /** Convert Celsius to the chosen unit ("C" or "F"). */
  function convertTemp(celsius, unit) {
    return unit === "F" ? celsius * 9 / 5 + 32 : celsius;
  }

  function formatTemp(celsius, unit) {
    return `${Math.round(convertTemp(celsius, unit))}°${unit}`;
  }

  /** Flatten the 3-hourly forecast list into simple entries (up to 40). */
  function toEntries(forecast) {
    return forecast.list.map((item) => ({
      dt: item.dt,
      date: new Date((item.dt + forecast.city.timezone) * 1000).toISOString().slice(0, 10),
      time: new Date((item.dt + forecast.city.timezone) * 1000).toISOString().slice(11, 16),
      temp: item.main.temp,
      condition: item.weather[0].main,
      description: item.weather[0].description,
      icon: item.weather[0].icon,
      rain: item.weather[0].main === "Rain" || item.weather[0].main === "Drizzle" || item.weather[0].main === "Thunderstorm"
    }));
  }

  /** Group entries by day -> one summary per day (max 5 days). */
  function toDailySummaries(entries) {
    const byDay = {};
    entries.forEach((e) => (byDay[e.date] = byDay[e.date] || []).push(e));

    return Object.keys(byDay).slice(0, 5).map((date) => {
      const items = byDay[date];
      const temps = items.map((i) => i.temp);
      // Most frequent condition of the day
      const counts = items.reduce((acc, i) => {
        acc[i.condition] = (acc[i.condition] || 0) + 1;
        return acc;
      }, {});
      const condition = Object.keys(counts).reduce((a, b) => (counts[a] >= counts[b] ? a : b));
      const icon = items.find((i) => i.condition === condition).icon;
      return {
        date,
        min: Math.min(...temps),
        max: Math.max(...temps),
        avg: temps.reduce((s, t) => s + t, 0) / temps.length,
        condition,
        icon
      };
    });
  }

  /** For the doughnut chart: { Clear: 40, Clouds: 60 } (percentages). */
  function conditionPercentages(daily) {
    const counts = daily.reduce((acc, d) => {
      acc[d.condition] = (acc[d.condition] || 0) + 1;
      return acc;
    }, {});
    const result = {};
    Object.keys(counts).forEach((k) => (result[k] = Math.round((counts[k] / daily.length) * 100)));
    return result;
  }

  // ---- Step 4 filters (sort / filter / reduce as required) ----
  const sortAscending = (entries) => [...entries].sort((a, b) => a.temp - b.temp);
  const sortDescending = (entries) => [...entries].sort((a, b) => b.temp - a.temp);
  const rainOnly = (entries) => entries.filter((e) => e.rain);
  const hottest = (entries) =>
    entries.length ? entries.reduce((max, e) => (e.temp > max.temp ? e : max)) : null;

  /** Pagination for the table page: 10 entries per page. */
  function paginate(items, page, perPage = 10) {
    const totalPages = Math.max(1, Math.ceil(items.length / perPage));
    const current = Math.min(Math.max(1, page), totalPages);
    const start = (current - 1) * perPage;
    return { items: items.slice(start, start + perPage), page: current, totalPages };
  }

  /** Maps OpenWeather condition -> CSS class used for the widget background. */
  function backgroundClass(main, icon) {
    const night = icon && icon.endsWith("n");
    const map = {
      Clear: night ? "bg-clear-night" : "bg-clear",
      Clouds: "bg-clouds",
      Rain: "bg-rain",
      Drizzle: "bg-rain",
      Thunderstorm: "bg-thunder",
      Snow: "bg-snow",
      Mist: "bg-mist", Fog: "bg-mist", Haze: "bg-mist", Smoke: "bg-mist",
      Dust: "bg-mist", Sand: "bg-mist", Ash: "bg-mist", Squall: "bg-mist", Tornado: "bg-mist"
    };
    return map[main] || "bg-clear";
  }

  window.WeatherData = {
    convertTemp, formatTemp, toEntries, toDailySummaries, conditionPercentages,
    sortAscending, sortDescending, rainOnly, hottest, paginate, backgroundClass
  };
})();
