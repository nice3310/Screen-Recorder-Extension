const startBtn   = document.getElementById("startBtn");
const stopBtn    = document.getElementById("stopBtn");
const optionsBtn = document.getElementById("optionsBtn");

let mediaRecorder;
let recordedChunks = [];
let stream;      
let micStream;   
let resolution;
let recordAudio; 
let micAudio;    
let formats;

/* ---------- load user setting ---------- */
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

/* ---------- reset ---------- */
async function resetState() {
  if (mediaRecorder) mediaRecorder.stop();
  if (stream)     stream.getTracks().forEach(t => t.stop());
  if (micStream) micStream.getTracks().forEach(t => t.stop());

  recordedChunks = [];
  mediaRecorder  = null;
  stream         = null;
  micStream      = null;

  startBtn.disabled = false;
  stopBtn.disabled  = true;

  await loadOptions();
}

/* ---------- initialization ---------- */
loadOptions().then(resetState);

/* ---------- receive message ---------- */
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === "optionsUpdated") {
    loadOptions();
  } else if (msg.type === "startRecording") {
    startRecording();
  } else if (msg.type === "stopRecording") {
    stopRecording();
  }
});

/* ---------- minimize popup ---------- */
function minimizePopup() {
  chrome.windows.getCurrent(win => {
    if (win && win.type === "popup") {
      chrome.windows.update(win.id, { state: "minimized" });
    }
  });
}

/* ---------- animation ---------- */
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
    animation: "zoomInOut 1s infinite"
  });
  document.body.appendChild(box);

  let n = 3;
  box.textContent = n;

  const id = setInterval(() => {
    n -= 1;
    if (n === 1) minimizePopup();
    if (n === 0) {
      clearInterval(id);
      box.style.animation = "fade-out .5s";
      setTimeout(() => {
        document.body.removeChild(box);
        cb();
      }, 500);
    } else {
      box.textContent = n;
    }
  }, 1000);

  const style = document.createElement("style");
  style.textContent = `
    @keyframes fade-out { from { opacity:1 } to { opacity:0 } }
    @keyframes zoomInOut {
      0%,100%{ transform:translate(-50%,-50%) scale(1); }
      50%    { transform:translate(-50%,-50%) scale(1.5); }
    }`;
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
  chrome.windows.create({
    url: "options.html", type: "popup", width: 400, height: 600
  });
});

/* ---------- start recording ---------- */
async function startRecording() {
  try {
    await resetState();

    const curWin = await new Promise(r => chrome.windows.getCurrent(r));
    await chrome.windows.update(curWin.id, { width: 800, height: 660 });

    // screen stream
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        mediaSource: "screen",
        width:  resolution === "1080p" ? 1920 :
                resolution === "720p"  ? 1280 : 640
      },
      audio: recordAudio
    });

    // mic setup
    if (micAudio) {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getAudioTracks().forEach(t => stream.addTrack(t));
    }

    // start recording
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => e.data.size && recordedChunks.push(e.data);

    /* ---------- end process ---------- */
    mediaRecorder.onstop = async () => {
      const webmBlob = new Blob(recordedChunks, { type: "video/webm" });

      const now = new Date();
      const pad = n => String(n).padStart(2, "0");
      const base =
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-` +
        `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

      const inName = `${base}.webm`;

      if (!formats || formats.length === 0) formats = ["mp4"];

      for (const fmt of formats) {
        const outName = `${base}.${fmt}`;
        const cmd = `ffmpeg -i ${inName} -c:v copy -c:a aac ${outName}`;
        await runFFmpeg(inName, outName, cmd, webmBlob);
      }
      await resetState();
    };

    await chrome.windows.update(curWin.id, { width: 340, height: 280 });
    showCountdown(() => {
      mediaRecorder.start();
      startBtn.disabled = true;
      stopBtn.disabled  = false;
    });
  } catch (err) {
    console.error("startRecording error:", err);
    await resetState();
  }
}

/* ---------- stop recording ---------- */
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
}

/* ---------- download ---------- */
function triggerDownload(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}
