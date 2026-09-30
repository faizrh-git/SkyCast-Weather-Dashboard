/**
 * chat-ui.js - floating chat window. Injects its own HTML, so pages only
 * need to load chatbot.js + this file. All logic lives in GeminiChat.
 */
(function () {
  const root = document.createElement("div");
  root.innerHTML = `
    <button class="chat-fab" id="chat-fab" aria-label="Open chat assistant" aria-expanded="false">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>
    </button>
    <section class="chat-panel" id="chat-panel" hidden aria-label="Chat assistant">
      <header><strong>Weather assistant</strong><button type="button" id="chat-close" aria-label="Close chat">✕</button></header>
      <div class="chat-log" id="chat-log" aria-live="polite"></div>
      <form id="chat-form" autocomplete="off">
        <input id="chat-input" aria-label="Message" placeholder="Ask about weather or anything">
        <button type="submit">Send</button>
      </form>
    </section>`;
  document.body.appendChild(root);

  const fab = document.getElementById("chat-fab");
  const panel = document.getElementById("chat-panel");
  const log = document.getElementById("chat-log");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  let greeted = false;

  function addMsg(cls, text) {
    const div = document.createElement("div");
    div.className = "msg " + cls;
    div.textContent = text; // textContent: model output can never inject HTML
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function setOpen(open) {
    panel.hidden = !open;
    fab.setAttribute("aria-expanded", String(open));
    if (open) {
      if (!greeted) {
        greeted = true;
        addMsg("bot", "Hi! Ask me about the weather in any city, or ask me anything else.");
      }
      input.focus();
    } else {
      fab.focus();
    }
  }

  fab.addEventListener("click", () => setOpen(panel.hidden));
  document.getElementById("chat-close").addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) setOpen(false); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    addMsg("user", text);

    const pending = addMsg("bot pending", "Thinking…");
    form.querySelector("button").disabled = true;

    // "How's the weather?" with no city falls back to the city shown on the dashboard
    GeminiChat.setDefaultCity(localStorage.getItem("lastCity"));
    const reply = await GeminiChat.sendMessage(text);

    pending.className = "msg " + (reply.type === "error" ? "error" : "bot");
    pending.textContent = reply.text;
    form.querySelector("button").disabled = false;
    log.scrollTop = log.scrollHeight;
    input.focus();
  });
})();
