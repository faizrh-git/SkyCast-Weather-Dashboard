# Skycast - Weather Dashboard with Chatbot

A responsive weather dashboard built with HTML, CSS and vanilla JavaScript.
Course: SE-3003 Web Engineering, Assignment 02.

**Live demo:** _paste your GitHub Pages URL here_

## Features
- **Current weather** for any city: temperature, humidity, wind speed, description and icon
- **Widget background changes** with the weather (clear, clouds, rain, thunderstorm, snow, mist, night)
- **5-day forecast** grid
- **Charts (Chart.js):** vertical bar chart (delay animation), doughnut chart of weather conditions (delay animation), line chart of temperature trend (drop animation)
- **Tables page:** forecast table with 10 entries per page and pagination
- **Filters:** temperature low to high and high to low (`sort()`), rain only (`filter()`), highest temperature (`reduce()`)
- **Chatbot:** weather questions are answered with live OpenWeather data; everything else goes to the Gemini API
- **Extras:** °C/°F toggle, geolocation on start, loading spinner, friendly error messages (city not found, API limit, network), API response caching

## Tech
HTML, CSS, JavaScript (Fetch API), OpenWeather API (free plan), Gemini API, Chart.js 4.

## Run locally
1. Get a free key from [OpenWeather](https://home.openweathermap.org/users/sign_up) and one from [Google AI Studio](https://aistudio.google.com/).
2. Copy `js/config.example.js` to `js/config.js` and paste your keys.
3. Serve the folder with a local server (browser features such as geolocation need `http://localhost`):
   - VS Code: install **Live Server**, right-click `index.html`, choose **Open with Live Server**, or
   - Terminal: `python -m http.server 5500`, then open `http://localhost:5500`.

## Project structure
```
index.html        dashboard page
tables.html       forecast table page
css/style.css     all styles
js/api.js         OpenWeather requests, error handling, caching
js/data.js        data helpers: daily summaries, filters, pagination, backgrounds
js/charts.js      Chart.js charts and animations
js/dashboard.js   dashboard logic
js/tables.js      tables page logic
js/chatbot.js     chatbot logic (weather detection + Gemini)
js/chat-ui.js     chat window
js/config.example.js   template for API keys (real keys go in js/config.js, not committed)
```

## How the chatbot works
If a message contains "weather", "forecast" or "temperature", the city is extracted from the text, fetched from OpenWeather and stored. All other messages are sent to Gemini together with recent chat history.

## Deployment (GitHub Pages)
The repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds `js/config.js` from repository secrets `OPENWEATHER_API_KEY` and `GEMINI_API_KEY`, then publishes the site. Set **Settings > Pages > Source** to **GitHub Actions**.

## Notes
Keys used in browser code are visible to visitors of a client-side site. Restrict the Gemini key to the site's URL in Google's console and regenerate keys after grading.
