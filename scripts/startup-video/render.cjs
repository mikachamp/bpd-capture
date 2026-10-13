// Usage: see README.md. Writes out/frames/f0000.png … at 60 fps for 4.5 s.
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const FPS = 60;
const SECONDS = 4.5;
const framesDir = path.join(__dirname, 'out', 'frames');
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 540, height: 960, show: false, webPreferences: { backgroundThrottling: false } });
  await win.loadFile(path.join(__dirname, 'index.html'));
  for (let i = 0; i < FPS * SECONDS; i++) {
    const dataUrl = await win.webContents.executeJavaScript(`renderAt(${i / FPS})`);
    fs.writeFileSync(path.join(framesDir, `f${String(i).padStart(4, '0')}.png`), Buffer.from(dataUrl.split(',')[1], 'base64'));
  }
  app.quit();
});
