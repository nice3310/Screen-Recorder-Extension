
# 📸 Screen Recorder - Pixel Style

A retro-style screen recording Chrome Extension — complete with pixel UI, hotkeys, and multi-format export via FFmpeg.

![Extension Banner](images/banner.png)

---

## 🧩 Features

- Start / stop screen recording with a 3-second countdown
- Export in **MP4**, **AVI**, **MKV**, **MOV**
- Optionally record microphone audio
- **pixel-art UI** using NES.css
- Use hotkeys for quick control

---

---

## ⚡ Hotkeys

You can trigger the extension using global shortcuts:

| Action            | Shortcut           |
|-------------------|--------------------|
|  open setting     | `Ctrl + Shift + F` |
| Start Recording   | `Ctrl + Shift + S` |
| Stop Recording    | `Ctrl + Shift + E` |

Customize hotkeys at:  
[chrome://extensions/shortcuts](chrome://extensions/shortcuts)

---

## 🖥️ Installation

1. Clone or download this repository:

   ```bash
   git clone https://github.com/yourusername/screen-recorder-pixel.git
   ```

2. Open **Chrome** and go to:

   ```
   chrome://extensions/
   ```

3. Enable **Developer Mode** (top right)

4. Click **“Load unpacked”** and select the project folder

---

## 🚀 Usage

- Click the extension icon to open the popup
- Click **Start Recording**
- Wait for the 3-second countdown (popup will auto-hide)
- Your screen will be recorded
- Click **Stop Recording** to download the video

> ✅ By default, the extension exports in **MP4**  
> 🛠 You can change output format in the **Options** menu

---

## 🎛️ Options

Click the **Options** button from the popup, or visit:

You can configure:

- **Resolution**: 1080p / 720p / 480p
- **Audio**: Enable/disable sound/microphone recording
- **Formats**: Choose one or more from MP4, AVI, MKV, MOV
