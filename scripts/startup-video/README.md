# Startup animation video

Re-renders `assets/bpd-startup-animation.mp4` from `src/components/startupLogoDraw.ts`, so the
video always matches the in-app splash. Run from the project root (Git Bash). Uses the desktop
project's esbuild + Electron and a static ffmpeg (`npm i ffmpeg-static` anywhere outside the repo).

```sh
D=../BPD_Capture_Desktop/node_modules/.bin
$D/esbuild scripts/startup-video/entry.ts --bundle --format=iife --outfile=scripts/startup-video/out/bundle.js
env -u ELECTRON_RUN_AS_NODE $D/electron scripts/startup-video/render.cjs
ffmpeg -y -framerate 60 -i scripts/startup-video/out/frames/f%04d.png \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart assets/bpd-startup-animation.mp4
```

`out/` is git-ignored. Note: the app saves the video to the gallery only once per install
(`startup_video_saved` setting in `services/brandVideo.ts`) — change that key if a new video
should be pushed to phones that already have the old one.
