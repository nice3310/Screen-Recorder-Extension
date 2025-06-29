document.addEventListener("DOMContentLoaded", () => {
  const form        = document.getElementById("optionsForm");
  const mp4Checkbox = document.querySelector('input[name="formats"][value="mp4"]');
  const formatCheckboxes = () => document.querySelectorAll('input[name="formats"]');

  /* ---------- load setting ---------- */
  chrome.storage.sync.get(
    ["resolution", "audio", "micAudio", "formats"],
    data => {
      document.getElementById("resolution").value = data.resolution || "1080p";
      document.getElementById("audio").checked     = data.audio     || false;
      document.getElementById("micAudio").checked  = data.micAudio  || false;

      /* empty checkbox */
      formatCheckboxes().forEach(cb => (cb.checked = false));
      if (Array.isArray(data.formats) && data.formats.length) {
        data.formats.forEach(fmt => {
          const cb = document.querySelector(`input[name="formats"][value="${fmt}"]`);
          if (cb) cb.checked = true;
        });
      } else {
        mp4Checkbox.checked = true; // default to MP4
      }
    }
  );

  /* ---------- storage setting ---------- */
  form.addEventListener("submit", e => {
    e.preventDefault();

    const resolution = document.getElementById("resolution").value;
    const audio      = document.getElementById("audio").checked;
    const micAudio   = document.getElementById("micAudio").checked;
    let   formats    = Array.from(
      document.querySelectorAll('input[name="formats"]:checked')
    ).map(el => el.value);

    if (formats.length === 0) {
      formats = ["mp4"];
      mp4Checkbox.checked = true;
    }

    chrome.storage.sync.set(
      { resolution, audio, micAudio, formats },
      () => {
        chrome.runtime.sendMessage({ type: "optionsUpdated" });
        window.close();
      }
    );
  });
});
