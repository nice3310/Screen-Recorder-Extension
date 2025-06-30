/* ------------------------------------------------------------------
 *  popup.html → script.js  (完整版本)
 *  - Pixel Screen Recorder -
 * ------------------------------------------------------------------ */

/* ---------- DOM ---------- */
const startBtn   = document.getElementById("startBtn");
const stopBtn    = document.getElementById("stopBtn");
const optionsBtn = document.getElementById("optionsBtn");

/* ---------- 全域狀態 ---------- */
let mediaRecorder;
let recordedChunks = [];
let stream;          // 畫面
let micStream;       // 麥克風
let resolution;
let recordAudio;     // 系統音
let micAudio;        // 麥克風音
let formats;

/* 錄影時間 */
let startTime   = 0;      // Date.now() 起點
let durationTimer = null; // setInterval id

/* ---------- 讀取使用者設定 ---------- */
async function loadOptions() {
  return new Promise(resolve => {
    chrome.storage.sync.get(
      ["resolution", "audio", "micAudio", "formats"],
      data => {
        resolution  = data.resolution || "1080p";
        recordAudio = data.audio     || false;
        micAudio    = data.micAudio  || false;
        formats     = Array.isArray(data.formats) && data.formats.length
                        ? data.formats
                        : ["mp4"];
        resolve();
      }
    );
  });
}

/* ---------- 重設 ---------- */
async function resetState() {
  if (mediaRecorder) mediaRecorder.stop();
  stream?.getTracks().forEach(t => t.stop());
  micStream?.getTracks().forEach(t => t.stop());

  recordedChunks = [];
  mediaRecorder  = null;
  stream         = null;
  micStream      = null;

  /* 停止計時器 */
  clearInterval(durationTimer);
  startTime = 0;

  startBtn.disabled = false;
  stopBtn.disabled  = true;

  await loadOptions();
}

/* ---------- 初始化 ---------- */
loadOptions().then(resetState);

/* ---------- 接收背景訊息 ---------- */
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === "optionsUpdated") loadOptions();
  if (msg.type === "startRecording") startRecording();
  if (msg.type === "stopRecording")  stopRecording();
});

/* ---------- 廣播給 background → cat.js ---------- */
function broadcast(kind, payload = {}) {
  /* kind: "show" | "hide" | "duration" */
  if (kind === "show")
    chrome.runtime.sendMessage({ type: "broadcastShowCat" });
  else if (kind === "hide")
    chrome.runtime.sendMessage({ type: "broadcastHideCat" });
  else if (kind === "duration")
    chrome.runtime.sendMessage({ type: "broadcastDuration", seconds: payload.seconds });
}

/* ---------- 最小化 popup ---------- */
function minimizePopup() {
  chrome.windows.getCurrent(win => {
    if (win?.type === "popup") chrome.windows.update(win.id, { state: "minimized" });
  });
}

/* ---------- 3‒2‒1 倒數 ---------- */
function showCountdown(cb) {
  const box = document.createElement("div");
  Object.assign(box.style, {
    position: "fixed",
    top: "50%", left: "50%",
    transform: "translate(-50%, -50%)",
    width: "150px", height: "150px",
    fontSize: "72px", lineHeight: "150px",
    textAlign: "center", color: "#fff",
    background: "rgba(0,0,0,0.7)",
    borderRadius: "50%", zIndex: 10000,
    boxShadow: "0 0 20px rgba(0,0,0,0.5)",
    animation: "zoom 1s infinite"
  });
  document.body.appendChild(box);

  let n = 3;
  box.textContent = n;

  const id = setInterval(() => {
    n--;
    if (n === 1) minimizePopup();
    if (n === 0) {
      clearInterval(id);
      box.style.animation = "fade 0.5s";
      setTimeout(() => { document.body.removeChild(box); cb(); }, 500);
    } else {
      box.textContent = n;
    }
  }, 1000);

  const style = document.createElement("style");
  style.textContent = `
    @keyframes fade { from{opacity:1} to{opacity:0} }
    @keyframes zoom { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-50%,-50%) scale(1.5)} }`;
  document.head.appendChild(style);
}

/* ---------- FFmpeg ---------- */
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({
  corePath: chrome.runtime.getURL("lib/ffmpeg-core.js"),
  log: true,
  mainName: "main"
});
async function runFFmpeg(inName, outName, cmdStr, file) {
  if (ffmpeg.isLoaded()) await ffmpeg.exit();
  await ffmpeg.load();

  const args = cmdStr.split(" ");
  if (args.shift() !== "ffmpeg") return;

  ffmpeg.FS("writeFile", inName, await fetchFile(file));
  await ffmpeg.run(...args);
  const data = ffmpeg.FS("readFile", outName);
  triggerDownload(new Blob([data.buffer]), outName);
}

/* ---------- UI 事件 ---------- */
startBtn.addEventListener("click", startRecording);
stopBtn .addEventListener("click", stopRecording);
optionsBtn.addEventListener("click", () => {
  chrome.windows.create({ url: "options.html", type: "popup", width: 400, height: 600 });
});

/* ---------- 開始錄影 ---------- */
async function startRecording() {
  try {
    await resetState();

    /* 放大 popup 方便列出權限提示 */
    const pop = await new Promise(r => chrome.windows.getCurrent(r));
    await chrome.windows.update(pop.id, { width: 800, height: 660 });

    /* 取得螢幕流 */
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        mediaSource: "screen",
        width:  resolution === "1080p" ? 1920 :
                resolution === "720p"  ? 1280 : 640
      },
      audio: recordAudio
    });

    /* 麥克風流 */
    if (micAudio) {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getAudioTracks().forEach(t => stream.addTrack(t));
    }

    /* 建立 MediaRecorder */
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => e.data.size && recordedChunks.push(e.data);

    /* 錄影結束後處理下載 */
    mediaRecorder.onstop = async () => {
      clearInterval(durationTimer);               // 停止秒計
      broadcast("hide");                          // 隱藏貓貓

      const webmBlob = new Blob(recordedChunks, { type: "video/webm" });

      /* 命名 */
      const now = new Date();
      const pad = v => String(v).padStart(2, "0");
      const base = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const inName = `${base}.webm`;

      if (!formats?.length) formats = ["mp4"];
      for (const fmt of formats) {
        const outName = `${base}.${fmt}`;
        const cmd = `ffmpeg -i ${inName} -c:v copy -c:a aac ${outName}`;
        await runFFmpeg(inName, outName, cmd, webmBlob);
      }

      await resetState();
    };

    /* 縮回 popup 尺寸 */
    await chrome.windows.update(pop.id, { width: 340, height: 280 });

    /* 倒數開始 → 真正 start */
    showCountdown(() => {
      mediaRecorder.start();

      /* >>> 開始秒計 & 廣播 <<< */
      startTime = Date.now();
      durationTimer = setInterval(() => {
        const secs = Math.floor((Date.now() - startTime) / 1000);
        broadcast("duration", { seconds: secs }); // push 給 cat.js
      }, 1000);

      broadcast("show");              // 顯示貓貓
      startBtn.disabled = true;
      stopBtn.disabled  = false;
    });

  } catch (err) {
    console.error("startRecording error:", err);
    await resetState();
  }
}

/* ---------- 停止錄影 ---------- */
function stopRecording() {
  if (mediaRecorder?.state !== "inactive") mediaRecorder.stop();
}

/* ---------- 下載 ---------- */
function triggerDownload(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}
