"""
Repeated device test loops for the BPD Capture Android builds (real, Next, Floor).

Each round, per installed package:
  - 3 cold starts and 3 warm starts (`am start -W`, time to first frame)
  - memory after the app settles (dumpsys meminfo, total PSS)
  - a monkey run (random taps/swipes inside the app only) with a fixed seed,
    counting crashes and ANRs
  - frame stats over the monkey run (dumpsys gfxinfo: janky frames, 90th/99th pct)
  - a screenshot
Results go to <out>/results.json (one record per package per round) plus PNGs.

Usage (from the project root):
  python scripts/device-test/loop.py --rounds 5 --out builds/test-data/2026-10-21 \
      com.blueprintdigital.bpdcapture com.blueprintdigital.bpdcapture.next com.blueprintdigital.bpdcapture.floor
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time

ADB = os.environ.get('ADB', r'C:\Users\mikaw\Android\Sdk\platform-tools\adb.exe')
PERMISSIONS = [
    'android.permission.CAMERA',
    'android.permission.RECORD_AUDIO',
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_MEDIA_VIDEO',
    'android.permission.POST_NOTIFICATIONS',
]


def adb(*args, timeout=600, binary=False):
    out = subprocess.run([ADB, *args], capture_output=True, timeout=timeout)
    return out.stdout if binary else out.stdout.decode('utf-8', 'replace')


def launcher(pkg):
    lines = adb('shell', 'cmd', 'package', 'resolve-activity', '--brief', pkg).strip().splitlines()
    return lines[-1].strip() if lines and '/' in lines[-1] else f'{pkg}/.MainActivity'


def start(component, cold):
    pkg = component.split('/')[0]
    if cold:
        adb('shell', 'am', 'force-stop', pkg)
        time.sleep(1.0)
    else:
        adb('shell', 'input', 'keyevent', 'KEYCODE_HOME')
        time.sleep(1.5)
    text = adb('shell', 'am', 'start', '-W', '-n', component)
    total = re.search(r'TotalTime:\s*(\d+)', text)
    return int(total.group(1)) if total else None


def meminfo_kb(pkg):
    text = adb('shell', 'dumpsys', 'meminfo', pkg)
    m = re.search(r'TOTAL PSS:\s*(\d+)', text) or re.search(r'^\s*TOTAL\s+(\d+)', text, re.M)
    return int(m.group(1)) if m else None


def gfx(pkg):
    text = adb('shell', 'dumpsys', 'gfxinfo', pkg)
    def num(pattern):
        m = re.search(pattern, text)
        return float(m.group(1)) if m else None
    return {
        'frames': num(r'Total frames rendered:\s*(\d+)'),
        'jankyPct': num(r'Janky frames:\s*\d+\s*\(([\d.]+)%\)'),
        'p90ms': num(r'90th percentile:\s*(\d+)ms'),
        'p99ms': num(r'99th percentile:\s*(\d+)ms'),
    }


def monkey(pkg, seed, events):
    text = adb('shell', 'monkey', '-p', pkg, '-s', str(seed), '--throttle', '120',
               '--pct-syskeys', '0', '--pct-anyevent', '0', '--ignore-security-exceptions',
               '-v', str(events), timeout=1800)
    injected = re.search(r'Events injected:\s*(\d+)', text)
    return {
        'events': int(injected.group(1)) if injected else 0,
        'crash': '// CRASH' in text,
        'anr': '// NOT RESPONDING' in text or 'ANR in' in text,
        'aborted': 'Monkey aborted' in text,
        'tail': text.strip().splitlines()[-3:],
    }


def screenshot(path):
    data = adb('exec-out', 'screencap', '-p', binary=True)
    with open(path, 'wb') as f:
        f.write(data)


def apk_info(pkg):
    text = adb('shell', 'dumpsys', 'package', pkg)
    version = re.search(r'versionName=(\S+)', text)
    path = adb('shell', 'pm', 'path', pkg).strip().replace('package:', '')
    size = adb('shell', 'stat', '-c', '%s', path).strip() if path else ''
    return {'versionName': version.group(1) if version else None, 'apkBytes': int(size) if size.isdigit() else None}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('packages', nargs='+')
    ap.add_argument('--rounds', type=int, default=3)
    ap.add_argument('--monkey-events', type=int, default=1500)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    results_path = os.path.join(args.out, 'results.json')
    results = json.load(open(results_path)) if os.path.exists(results_path) else []

    for pkg in args.packages:
        for perm in PERMISSIONS:
            adb('shell', 'pm', 'grant', pkg, perm)
    info = {pkg: apk_info(pkg) for pkg in args.packages}

    for rnd in range(1, args.rounds + 1):
        for pkg in args.packages:
            component = launcher(pkg)
            adb('logcat', '-b', 'crash', '-c')
            colds = [start(component, cold=True) for _ in range(3)]
            time.sleep(7)  # startup animation
            warms = [start(component, cold=False) for _ in range(3)]
            time.sleep(3)
            mem_idle = meminfo_kb(pkg)
            adb('shell', 'dumpsys', 'gfxinfo', pkg, 'reset')
            m = monkey(pkg, seed=1000 + rnd, events=args.monkey_events)
            frames = gfx(pkg)
            mem_after = meminfo_kb(pkg)
            crashes = adb('logcat', '-b', 'crash', '-d').strip()
            # back to the app's first screen for the picture
            start(component, cold=True)
            time.sleep(8)
            shot = os.path.join(args.out, f'{pkg.split(".")[-1]}-round{rnd}.png')
            screenshot(shot)
            rec = {
                'package': pkg, 'round': rnd, 'time': time.strftime('%Y-%m-%dT%H:%M:%S'),
                **info[pkg],
                'coldStartMs': colds, 'warmStartMs': warms,
                'memIdleKb': mem_idle, 'memAfterMonkeyKb': mem_after,
                'monkey': m, 'frames': frames,
                'crashLog': crashes[-4000:] if crashes else '',
                'screenshot': os.path.basename(shot),
            }
            results.append(rec)
            json.dump(results, open(results_path, 'w'), indent=1)
            print(json.dumps({k: rec[k] for k in ('package', 'round', 'coldStartMs', 'warmStartMs', 'memIdleKb', 'memAfterMonkeyKb')}),
                  'crash' if m['crash'] else 'ok', 'anr' if m['anr'] else '', flush=True)
    print('done', results_path)


if __name__ == '__main__':
    sys.exit(main())
