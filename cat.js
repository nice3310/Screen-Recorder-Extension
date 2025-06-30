const CAT_ID = "pixel-cat-btn";
const CAT_GIF = chrome.runtime.getURL("assets/cat.gif");
let shown = false;
let latestSeconds = 0;           // 接收的錄影秒數
let tooltip;                     // 顯示時間的浮動框

/* ---------- 建立貓咪 ---------- */
function createCat() {
  if (shown) return;

  const img = document.createElement("img");
  img.id = CAT_ID;
  img.src = CAT_GIF;
  Object.assign(img.style, {
    position: "fixed",
    bottom: "20px",
    right:  "20px",
    width:  "64px",
    zIndex: "2147483647",
    cursor: "default"
  });

  img.addEventListener("mouseenter", showTooltip);
  img.addEventListener("mouseleave", hideTooltip);

  document.body.appendChild(img);
  shown = true;
}

/* ---------- 移除貓咪 & tooltip ---------- */
function removeCat() {
  document.getElementById(CAT_ID)?.remove();
  tooltip?.remove();
  shown = false;
}

/* ---------- tooltip ---------- */
function format(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor(sec / 60) % 60).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
function showTooltip() {
  if (!tooltip) {
    tooltip = document.createElement("div");
    Object.assign(tooltip.style, {
      position: "fixed",
      bottom: "90px",
      right:  "20px",
      padding: "4px 8px",
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#fff",
      background: "rgba(0,0,0,0.8)",
      borderRadius: "4px",
      zIndex: "2147483647"
    });
    document.body.appendChild(tooltip);
  }
  tooltip.textContent = format(latestSeconds);
  tooltip.style.display = "block";
}
function hideTooltip() {
  tooltip && (tooltip.style.display = "none");
}

/* ---------- 接收訊息 ---------- */
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === "showCat")          createCat();
  if (msg.type === "hideCat")          removeCat();
  if (msg.type === "updateDuration") {
    latestSeconds = msg.seconds;
    if (tooltip && tooltip.style.display === "block") {
      tooltip.textContent = format(latestSeconds);
    }
  }
});
