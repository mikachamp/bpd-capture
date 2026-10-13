# App icons

Every BPD Capture icon is rendered from the startup animation's final frame
(`src/components/startupLogoDraw.ts`), so the icons, the in-app logo and the splash always match.
Run from the project root (Git Bash), with a static ffmpeg on hand (`npm i ffmpeg-static` outside the repo).

```sh
D=../BPD_Capture_Desktop/node_modules/.bin
$D/esbuild scripts/app-icon/entry.ts --bundle --format=iife --outfile=scripts/app-icon/out/bundle.js
env -u ELECTRON_RUN_AS_NODE $D/electron scripts/app-icon/render.cjs   # out/logo-opaque.png, out/logo-transparent.png
```

Then, with `O=scripts/app-icon/out` and `C=crop=680:680:172:184` (the mark's square at 1024px):

| File | ffmpeg | Mark size |
|---|---|---|
| `assets/icon.png`, `assets/splash-icon.png` | `-i $O/logo-opaque.png -vf "$C,pad=972:972:146:146:black,scale=1024:1024"` | ~70% |
| `assets/android-icon-foreground.png` | `-i $O/logo-opaque.png -vf "$C,pad=1512:1512:416:416:black,scale=1024:1024"` | ~45% (Android shows only the middle 2/3 and masks it to a circle; 58% was clipped) |
| `assets/android-icon-background.png` | `-f lavfi -i color=c=black:s=1024x1024 -frames:v 1` | — |
| `assets/android-icon-monochrome.png` | from the foreground: `format=rgba,geq=r=255:g=255:b=255:a='if(gt(max(max(r(X,Y),g(X,Y)),b(X,Y)),60),255,0)'` | white silhouette, pencil cut out |
| `assets/favicon.png` | `-i assets/icon.png -vf scale=64:64` | — |
| `assets/bpd-logo-mark.png` (in-app logo) | `-i $O/logo-transparent.png -vf "$C,scale=512:512"` | tight crop, transparent |
| Desktop `build/icon.ico` | `-i assets/icon.png -vf scale=256:256` | — |

Copy `assets/bpd-logo-mark.png` to `BPD_Capture_Desktop/src/renderer/src/assets/` too.
`app.json` → `android.adaptiveIcon.backgroundColor` stays `#000000`. Icons only change on
phones after a new APK build (`expo prebuild` regenerates the mipmaps).
