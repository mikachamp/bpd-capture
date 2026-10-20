"""Small adb + uiautomator helpers for scripted walk-throughs (see floor_flow.py)."""
import os
import re
import subprocess
import time
import xml.etree.ElementTree as ET

ADB = os.environ.get('ADB', r'C:\Users\mikaw\Android\Sdk\platform-tools\adb.exe')


def adb(*args, timeout=120, binary=False):
    out = subprocess.run([ADB, *args], capture_output=True, timeout=timeout)
    return out.stdout if binary else out.stdout.decode('utf-8', 'replace')


def nodes():
    """Every on-screen node as (text, content-desc, (cx, cy))."""
    for _ in range(3):
        adb('shell', 'uiautomator', 'dump', '/sdcard/ui.xml')
        raw = adb('shell', 'cat', '/sdcard/ui.xml')
        if raw.strip().startswith('<?xml'):
            break
        time.sleep(1)
    try:
        root = ET.fromstring(raw[raw.index('<?xml'):] if '<?xml' in raw else raw)
    except Exception:
        return []
    found = []
    for n in root.iter('node'):
        b = re.findall(r'\d+', n.get('bounds', ''))
        if len(b) != 4:
            continue
        x1, y1, x2, y2 = map(int, b)
        found.append((n.get('text', ''), n.get('content-desc', ''), ((x1 + x2) // 2, (y1 + y2) // 2)))
    return found


def find(label, exact=False):
    want = label.lower()
    for text, desc, center in nodes():
        for value in (text, desc):
            v = value.lower()
            if v and ((v == want) if exact else (want in v)):
                return center
    return None


def tap_xy(x, y, wait=1.2):
    adb('shell', 'input', 'tap', str(x), str(y))
    time.sleep(wait)


def tap(label, exact=False, wait=1.2, required=True):
    center = find(label, exact)
    if center is None:
        if required:
            raise AssertionError(f'not on screen: {label!r}')
        return False
    tap_xy(*center, wait=wait)
    return True


def visible(label, exact=False):
    return find(label, exact) is not None


def type_text(text):
    adb('shell', 'input', 'text', text.replace(' ', '%s'))
    time.sleep(0.6)


def key(name, wait=0.8):
    adb('shell', 'input', 'keyevent', name)
    time.sleep(wait)


def swipe_up(times=1):
    for _ in range(times):
        adb('shell', 'input', 'swipe', '540', '1800', '540', '700', '350')
        time.sleep(0.8)


def shot(path):
    with open(path, 'wb') as f:
        f.write(adb('exec-out', 'screencap', '-p', binary=True))
