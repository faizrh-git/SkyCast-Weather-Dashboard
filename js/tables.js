/**
 * tables.js - forecast table page: filters (sort / filter / reduce) + pagination.
 * Shows 10 entries per page, as the assignment requires.
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const form = $("search-form");
  const input = $("city-input");

  let unit = localStorage.getItem("unit") === "F" ? "F" : "C";
  let entries = [];       // all 40 three-hourly forecast entries
  let filter = "all";
  let page = 1;

  function setLoading(on) {
    $("spinner").hidden = !on;
    form.querySelector("button").disabled = on;
  }
  function showError(msg) {
    $("error").textContent = msg;
    $("error").hidden = !msg;
  }

  /** Apply the selected filter using sort(), filter() or reduce(). */
  function getView() {
    switch (filter) {
      case "asc":     return WeatherData.sortAscending(entries);
      case "desc":    return WeatherData.sortDescending(entries);
      case "rain":    return WeatherData.rainOnly(entries);
      case "hottest": { const h = WeatherData.hottest(entries); return h ? [h] : []; }
      default:        return entries;
    }
  }

  function render() {
    const view = getView();
    const p = WeatherData.paginate(view, page, 10);
    page = p.page;

    $("table-body").innerHTML = p.items.map((e) => {
      const day = new Date(e.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      return `<tr>
        <td>${day}</td><td>${e.time}</td>
        <td>${WeatherData.formatTemp(e.temp, unit)}</td>
        <td><img src="${WeatherAPI.iconUrl(e.icon)}" alt="">${e.description}</td>
      </tr>`;
    }).join("");

    const empty = $("empty");
    empty.hidden = view.length > 0;
    empty.textContent = filter === "rain" ? "No rain expected in the next 5 days." : "No data to show.";

    renderPager(p.totalPages);
  }

  function renderPager(totalPages) {
    const pager = $("pager");
    if (totalPages <= 1) { pager.innerHTML = ""; return; }
    let html = `<button data-page="${page - 1}" ${page === 1 ? "disabled" : ""}>Previous</button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button data-page="${i}" ${i === page ? 'aria-current="page"' : ""}>${i}</button>`;
    }
    html += `<button data-page="${page + 1}" ${page === totalPages ? "disabled" : ""}>Next</button>`;
    pager.innerHTML = html;
  }

  async function loadCity(city) {
    setLoading(true);
    showError("");
    try {
      const forecast = await WeatherAPI.getForecastByCity(city);
      entries = WeatherData.toEntries(forecast);
      page = 1;
      localStorage.setItem("lastCity", forecast.city.name);
      input.value = forecast.city.name;
      $("page-title").textContent = `Temperature forecast for ${forecast.city.name}`;
      render();
    } catch (e) {
      showError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ---- events ----
  form.addEventListener("submit", (e) => { e.preventDefault(); loadCity(input.value); });

  document.querySelectorAll(".filters button").forEach((btn) =>
    btn.addEventListener("click", () => {
      filter = btn.dataset.filter;
      page = 1;
      document.querySelectorAll(".filters button").forEach((b) =>
        b.setAttribute("aria-pressed", String(b === btn)));
      render();
    }));

  $("pager").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;
    page = Number(btn.dataset.page);
    render();
  });

  document.querySelectorAll(".units button").forEach((btn) =>
    btn.addEventListener("click", () => {
      unit = btn.dataset.unit;
      localStorage.setItem("unit", unit);
      syncUnits();
      render();
    }));

  function syncUnits() {
    document.querySelectorAll(".units button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.unit === unit)));
  }

  syncUnits();
  loadCity(localStorage.getItem("lastCity") || "London");
})();
