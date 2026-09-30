// Copy this file to config.js and paste your own keys.
// config.js is git-ignored so your keys are not pushed by accident.
window.APP_CONFIG = {
  OPENWEATHER_API_KEY: "YOUR_OPENWEATHER_KEY",
  GEMINI_API_KEY: "YOUR_GEMINI_KEY",
  // Model name can change over time. "gemini-flash-latest" always points to
  // the newest Flash model. If it errors, run GeminiChat.listModels() in the
  // browser console and pick a name from the list.
  GEMINI_MODEL: "gemini-flash-latest"
};
