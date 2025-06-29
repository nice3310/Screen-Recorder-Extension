async function openOrFocusPopup() {
  const wins = await chrome.windows.getAll({ populate: true });
  const popupWin = wins.find(
    w =>
      w.type === "popup" &&
      w.tabs.some(t => t.url && t.url.endsWith("popup.html"))
  );
  const popupSize = { width: 340, height: 280 };

  if (popupWin) {
    await chrome.windows.update(popupWin.id, { focused: true, ...popupSize });
  } else {
    await chrome.windows.create({
      url: "popup.html",
      type: "popup",
      ...popupSize
    });
    // Wait for the popup to finish loading
    await new Promise(r => setTimeout(r, 300));
  }
}

// Click the extension icon → Open/focus the popup
chrome.action.onClicked.addListener(openOrFocusPopup);

// Process keyboard shortcuts
chrome.commands.onCommand.addListener(async command => {
  switch (command) {
    case "open_popup":            // Ctrl+Shift+F
      await openOrFocusPopup();
      break;

    case "start_recording":       // Ctrl+Shift+S
      await openOrFocusPopup();
      chrome.runtime.sendMessage({ type: "startRecording" });
      break;

    case "stop_recording":        // Ctrl+Shift+E
      await openOrFocusPopup();
      chrome.runtime.sendMessage({ type: "stopRecording" });
      break;

    default:
      break;
  }
});
