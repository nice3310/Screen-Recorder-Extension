/* ---------- 開 / 聚焦 popup ---------- */
async function openOrFocusPopup() {
  const wins = await chrome.windows.getAll({ populate: true });
  const popup = wins.find(w =>
    w.type === "popup" && w.tabs.some(t => t.url?.endsWith("popup.html"))
  );
  const size = { width: 340, height: 280 };

  if (popup) {
    await chrome.windows.update(popup.id, { focused: true, ...size });
  } else {
    await chrome.windows.create({ url: "popup.html", type: "popup", ...size });
    await new Promise(r => setTimeout(r, 300));
  }
}

/* ---------- browser-action ---------- */
chrome.action.onClicked.addListener(openOrFocusPopup);

/* ---------- 快捷鍵 ---------- */
chrome.commands.onCommand.addListener(async cmd => {
  if (cmd === "open_popup")          openOrFocusPopup();
  if (cmd === "start_recording") {   openOrFocusPopup(); chrome.runtime.sendMessage({ type: "startRecording" }); }
  if (cmd === "stop_recording")  {   openOrFocusPopup(); chrome.runtime.sendMessage({ type: "stopRecording" }); }
});

/* ---------- helper：確保 cat.js 注入並送訊息 ---------- */
async function ensureCat(tabId) {
  try { await chrome.scripting.executeScript({ target: { tabId }, files: ["cat.js"] }); }
  catch {}
}
function sendCat(tabId, msg) {
  chrome.tabs.sendMessage(tabId, msg, async () => {
    if (chrome.runtime.lastError) { await ensureCat(tabId); chrome.tabs.sendMessage(tabId, msg, () => {}); }
  });
}

/* ---------- 中央訊息樞紐 ---------- */
chrome.runtime.onMessage.addListener((msg) => {
  /* popup 廣播 show / hide / duration */
  if (msg.type === "broadcastShowCat" ||
      msg.type === "broadcastHideCat" ||
      msg.type === "broadcastDuration") {

    const catMsg =
      msg.type === "broadcastShowCat" ? { type: "showCat" } :
      msg.type === "broadcastHideCat" ? { type: "hideCat" } :
      { type: "updateDuration", seconds: msg.seconds };

    chrome.tabs.query(
      { url: ["http://*/*", "https://*/*", "file://*/*"] },
      tabs => tabs.forEach(tab => sendCat(tab.id, catMsg))
    );
  }
});
