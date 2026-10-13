// Writes out/logo-opaque.png (black background) and out/logo-transparent.png, 1024px.
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const SIZE = 1024;
const FINAL_T = 4.4; // after the animation has settled face-on
const outDir = path.join(__dirname, 'out');

// Closing the last window would quit Electron before the second render.
app.on('window-all-closed', () => {});

app.whenReady().then(async () => {
  for (const [name, alpha] of [['logo-opaque', 0], ['logo-transparent', 1]]) {
    const win = new BrowserWindow({ width: 512, height: 512, show: false, transparent: true });
    await win.loadFile(path.join(__dirname, 'index.html'), { search: `size=${SIZE}&alpha=${alpha}` });
    const dataUrl = await win.webContents.executeJavaScript(`renderAt(${FINAL_T})`);
    fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(dataUrl.split(',')[1], 'base64'));
    win.destroy();
  }
  app.quit();
});
