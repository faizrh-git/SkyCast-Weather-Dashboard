# Skycast - Weather Dashboard with Chatbot

A responsive weather dashboard built with HTML, CSS, and vanilla
JavaScript. It was developed for **SE-3003 Web Engineering, Assignment
02**, and has also been deployed as a live website so visitors can use
it without downloading or running the project locally.

**Live website:**
https://faizrh-git.github.io/SkyCast-Weather-Dashboard/\
**Cloudflare Worker (API proxy):**
https://skycast-proxy.skycastweather.workers.dev

## Features

-   **Current weather** for any city: temperature, humidity, wind speed,
    description, and icon
-   **Weather-responsive background** for conditions such as clear
    skies, clouds, rain, thunderstorms, snow, mist, and night
-   **5-day forecast** displayed in a grid
-   **Chart.js visualizations:** vertical bar chart and doughnut chart
    with delay animations, plus a temperature line chart with a drop
    animation
-   **Forecast tables:** 10 entries per page with pagination
-   **Forecast filters:** sort temperatures in ascending or descending
    order, filter rainy entries, and find the highest temperature
-   **Chatbot:** weather-related questions use live OpenWeather data;
    other questions are sent to Gemini
-   **Additional features:** Celsius/Fahrenheit toggle, geolocation,
    loading indicator, user-friendly error messages, and API response
    caching

## Tech stack

-   HTML, CSS, and vanilla JavaScript
-   OpenWeather API (weather and forecast data)
-   Gemini API (general chatbot responses)
-   Chart.js 4 (charts and animations)
-   Cloudflare Workers (backend API proxy)
-   GitHub Pages (frontend hosting)

## How the live site works

The frontend is hosted on GitHub Pages. The Cloudflare Worker is a
separate backend endpoint used by the website when it needs to make API
requests.

The frontend's `js/config.js` contains the public address of the Worker:

``` js
window.APP_CONFIG = {
  API_BASE: "https://skycast-proxy.skycastweather.workers.dev"
};
```

When the website needs data from an API, it sends the request to the
Worker. The Worker then communicates with the external API and returns
the response to the frontend. The Worker URL is a public address; it is
not an API key.

The Worker can keep API credentials out of the frontend, provided the
Worker code reads the keys from its server-side environment secrets and
the frontend does not contain copies of them. The root Worker URL may
display a simple "Skycast proxy is running" message; that is a
health/status response, not the weather dashboard. Open the **Live
website** link above to use the dashboard.

## Run locally

To run the frontend on your own machine:

1.  Clone or download this repository.

2.  Ensure `js/config.js` exists and points to a running, accessible
    Skycast Worker. For the deployed Worker, use:

    ``` js
    window.APP_CONFIG = {
      API_BASE: "https://skycast-proxy.skycastweather.workers.dev"
    };
    ```

3.  Start a local web server from the project folder. For example:

    -   **VS Code:** use the Live Server extension and open `index.html`
        with Live Server.
    -   **Python:** run `python -m http.server 5500`, then visit
        `http://localhost:5500`.

    A local server is recommended because browser features such as
    geolocation may not work when opening the HTML file directly.

The local frontend can use the deployed Worker, so you do not need to
run the Worker locally just to use the live proxy. If you want to run
your own Worker, configure its required API credentials as Worker
secrets and update `API_BASE` to its URL. Do not put private API keys in
frontend files.

## Project structure

``` text
index.html             dashboard page
tables.html            forecast table page
css/style.css          all styles
js/api.js              OpenWeather requests, error handling, caching
js/data.js             data helpers: daily summaries, filters, pagination, backgrounds
js/charts.js           Chart.js charts and animations
js/dashboard.js        dashboard logic
js/tables.js           tables page logic
js/chatbot.js          chatbot logic (weather detection + Gemini)
js/chat-ui.js           chat window
js/config.js           public Cloudflare Worker URL
js/config.example.js   configuration template
```

## How the chatbot works

When a message is recognized as weather-related (for example, one
containing "weather," "forecast," or "temperature"), the chatbot
extracts the city, requests current weather data through the configured
API route, and uses the result in its response. Other messages are
handled by Gemini, along with recent chat history.

## Deployment

### Frontend (GitHub Pages)

The frontend is published through GitHub Pages. The live site is
available at:

https://faizrh-git.github.io/SkyCast-Weather-Dashboard/

The deployed frontend needs `js/config.js` to be present at the path
referenced by `index.html`. If that file is excluded by `.gitignore`, it
will not be included in a normal Git commit and GitHub Pages may return
a 404 for it. The current configuration contains only the public Worker
URL, not API credentials.

### Backend (Cloudflare Worker)

The API proxy is deployed separately as a Cloudflare Worker:

https://skycast-proxy.skycastweather.workers.dev

The frontend uses this address as `API_BASE`. API credentials should be
stored in the Worker's environment secrets rather than committed to the
repository or exposed in browser code.

## Notes

-   The website and the proxy are separate deployments: the GitHub Pages
    URL serves the dashboard, while the Cloudflare URL serves the proxy.
-   The Worker's root response ("Skycast proxy is running") only
    indicates that the Worker responds at its root route; it is not the
    dashboard UI.
-   Never commit private API keys. Keep them in the appropriate
    server-side secrets configuration.
