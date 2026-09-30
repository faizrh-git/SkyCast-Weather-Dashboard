/**
 * charts.js - the three Chart.js charts.
 *   Bar (vertical)  -> "delay" animation
 *   Doughnut        -> "delay" animation
 *   Line            -> "drop" animation
 * Both animations follow the official Chart.js animation samples.
 */
(function () {
  Chart.defaults.font.family = '"Outfit", system-ui, sans-serif';

  const COLORS = {
    Clear: "#f5b942", Clouds: "#8d99ae", Rain: "#3a7bfd", Drizzle: "#6fa8dc",
    Thunderstorm: "#6c4fd1", Snow: "#bcd7ee", Mist: "#adb5bd"
  };
  const charts = {};

  function draw(id, config) {
    if (charts[id]) charts[id].destroy(); // redraw cleanly when city/unit changes
    charts[id] = new Chart(document.getElementById(id), config);
  }

  function render(daily, unit) {
    const labels = daily.map((d) =>
      new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric" }));
    const temp = (c) => Math.round(WeatherData.convertTemp(c, unit) * 10) / 10;
    const base = { responsive: true, maintainAspectRatio: false };
    const yAxis = { y: { title: { display: true, text: "°" + unit } } };

    // 1. Vertical bar chart - delay animation
    let barDelayed = false;
    draw("bar-chart", {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "High", data: daily.map((d) => temp(d.max)), backgroundColor: "#3a7bfd", borderRadius: 6 },
          { label: "Low", data: daily.map((d) => temp(d.min)), backgroundColor: "#9ec1ff", borderRadius: 6 }
        ]
      },
      options: {
        ...base,
        scales: yAxis,
        animation: {
          onComplete: () => { barDelayed = true; },
          delay: (ctx) => (ctx.type === "data" && ctx.mode === "default" && !barDelayed)
            ? ctx.dataIndex * 300 + ctx.datasetIndex * 100 : 0
        }
      }
    });

    // 2. Doughnut chart - % of each weather condition over the 5 days, delay animation
    const pct = WeatherData.conditionPercentages(daily);
    const names = Object.keys(pct);
    let donutDelayed = false;
    draw("doughnut-chart", {
      type: "doughnut",
      data: {
        labels: names,
        datasets: [{ data: names.map((n) => pct[n]), backgroundColor: names.map((n) => COLORS[n] || "#9aa5b8") }]
      },
      options: {
        ...base,
        plugins: {
          legend: { position: "bottom" },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.parsed}%` } }
        },
        animation: {
          onComplete: () => { donutDelayed = true; },
          delay: (ctx) => (ctx.type === "data" && ctx.mode === "default" && !donutDelayed)
            ? ctx.dataIndex * 300 : 0
        }
      }
    });

    // 3. Line chart - average temperature trend, drop animation
    draw("line-chart", {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Average temperature", data: daily.map((d) => temp(d.avg)),
          borderColor: "#3a7bfd", backgroundColor: "rgba(58,123,253,.15)",
          fill: true, tension: 0.35, pointRadius: 5, pointBackgroundColor: "#3a7bfd"
        }]
      },
      options: {
        ...base,
        scales: yAxis,
        animations: {
          y: {
            easing: "easeInOutElastic",
            from: (ctx) => {
              if (ctx.type === "data" && ctx.mode === "default" && !ctx.dropped) {
                ctx.dropped = true;
                return 0;
              }
            }
          }
        }
      }
    });
  }

  window.Charts = { render };
})();
