"""
Scripted walk-through of BPD Capture Floor on a device/emulator, as a workshop
user would do it. Each step records pass/fail and a screenshot.

  python scripts/device-test/floor_flow.py --out builds/test-data/<run> [--fresh]

--fresh clears the app's data first (demo jobs are seeded on first start).
"""
import argparse
import json
import os
import sys
import time
import traceback

sys.path.insert(0, os.path.dirname(__file__))
import ui  # noqa: E402

PKG = 'com.blueprintdigital.bpdcapture.floor'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--fresh', action='store_true')
    ap.add_argument('--tag', default='')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    steps = []

    def step(name, fn):
        started = time.time()
        try:
            fn()
            ok, err = True, None
        except Exception as e:  # record and carry on
            ok, err = False, f'{e}\n{traceback.format_exc(limit=2)}'
        png = f'flow{args.tag}-{len(steps) + 1:02d}-{name.lower().replace(" ", "-")[:40]}.png'
        ui.shot(os.path.join(args.out, png))
        steps.append({'step': name, 'ok': ok, 'seconds': round(time.time() - started, 1), 'error': err, 'screenshot': png})
        print(('PASS ' if ok else 'FAIL ') + name, '' if ok else err.splitlines()[0], flush=True)

    if args.fresh:
        ui.adb('shell', 'pm', 'clear', PKG)
    for perm in ('CAMERA', 'RECORD_AUDIO', 'READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'POST_NOTIFICATIONS'):
        ui.adb('shell', 'pm', 'grant', PKG, f'android.permission.{perm}')

    def launch():
        ui.adb('shell', 'am', 'force-stop', PKG)
        ui.adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1')
        time.sleep(9)
        # first start may ask to save the startup video to the gallery
        for label in ('Allow', 'ALLOW'):
            ui.tap(label, exact=True, required=False)
        assert ui.visible('My bench'), 'Floor job list did not appear'
    step('Launch to job list', launch)

    def team():
        ui.tap('Settings', exact=True, wait=2)
        assert ui.visible('Workshop team')
        for name in ('Operator A', 'Operator B'):
            ui.tap('Add a name')
            ui.type_text(name)
            ui.tap('Add name', wait=1)
        ui.key('KEYCODE_BACK')
        assert ui.visible('Operator A'), 'name not added'
        ui.tap('Operator A', exact=True)  # first match: the name chip; the "used by" chip comes second
        center = [n for n in ui.nodes() if n[0] == 'Operator A']
        if len(center) > 1:
            ui.tap_xy(*center[-1][2])
        ui.tap('Fabricating', exact=True)
    step('Settings: add team, choose user and bench', team)

    def bench():
        ui.tap('Jobs', exact=True, wait=2)
        assert ui.visible("Operator A's jobs") or ui.visible('Jobs'), 'title'
        assert ui.visible('At fabricating'), 'bench section missing'
    step('Job list shows my bench first', bench)

    def open_job():
        target = ui.find('Production · Fabricating') or ui.find('Production ·')
        assert target, 'no production job on screen'
        ui.tap_xy(*target, wait=2.5)
        assert ui.visible('Take photo'), 'order screen did not open'
    step('Open a production job', open_job)

    def add_item():
        ui.swipe_up(1)
        ui.tap('Add item', exact=True, wait=1.5)
        ui.tap('e.g. Plinth body')
        ui.type_text('Test plinth body')
        for _ in range(4):
            ui.tap('More', exact=True, wait=0.4)
        ui.key('KEYCODE_BACK')
        ui.tap('Add item', exact=True, wait=2)
        # the sheet's button is the last "Add item" on screen
        if ui.visible('Add work ticket item'):
            hits = [n for n in ui.nodes() if n[0] == 'Add item']
            ui.tap_xy(*hits[-1][2], wait=2)
        assert ui.visible('Test plinth body'), 'item not added'
    step('Add a work ticket item (qty 5)', add_item)

    def count():
        for _ in range(3):
            ui.tap('One more Test plinth body', wait=0.6)
        nodes = ui.nodes()
        assert any(t == '3' for t, _, _ in nodes), 'count did not reach 3'
    step('Count 3 pieces with +', count)

    def sign_off():
        ui.swipe_up(-1) if False else None
        for _ in range(3):
            ui.adb('shell', 'input', 'swipe', '540', '700', '540', '1900', '300')
            time.sleep(0.5)
        target = ui.find('Fabricating done') or ui.find(' done')
        assert target, 'done button missing'
        ui.tap_xy(*target, wait=1.5)
        assert ui.visible('Signed off by'), 'sign-off sheet did not open'
        ui.tap('Sign off', exact=True, wait=2.5)
        assert ui.visible('Finishing'), 'did not move on to Finishing'
    step('Sign off Fabricating (prefilled user)', sign_off)

    def hold():
        ui.swipe_up(6)
        ui.tap('Put on hold', exact=True, wait=1.5)
        ui.tap('Waiting for parts', exact=True, wait=2)
        for _ in range(8):
            ui.adb('shell', 'input', 'swipe', '540', '700', '540', '1900', '250')
            time.sleep(0.3)
        assert ui.visible('ON HOLD'), 'hold banner missing'
    step('Put on hold: waiting for parts', hold)

    def resume():
        ui.tap('Resume', exact=True, wait=1.5)
        assert not ui.visible('ON HOLD'), 'still on hold'
    step('Resume from hold', resume)

    def night():
        ui.key('KEYCODE_BACK', wait=2)
        ui.tap('Show completed', required=False)
        target = ui.find('Installed ·') or ui.find('Installed')
        for _ in range(4):
            if target:
                break
            ui.swipe_up(1)
            target = ui.find('Installed')
        assert target, 'no installed job'
        ui.tap_xy(*target, wait=2.5)
        assert ui.visible('Take photo'), 'order did not open'
    step('Open an Installed job (Night Shift auto)', night)

    def capture():
        ui.key('KEYCODE_BACK', wait=2)
        ui.tap('Capture photos for a job', wait=2)
        rows = [n for n in ui.nodes() if 'CE-' in n[0] or 'Production' in n[0]]
        assert rows, 'job picker empty'
        ui.tap_xy(*rows[0][2], wait=4)
        ui.tap('Take photo', exact=True, wait=4)
        assert ui.visible('saved'), 'no shot saved'
    step('Capture: pick job, take a photo', capture)

    def done():
        ui.tap('saved', wait=2.5)
        assert ui.visible('My bench') or ui.visible('Take photo'), 'did not return'
    step('Close camera', done)

    path = os.path.join(args.out, f'flow{args.tag}.json')
    json.dump(steps, open(path, 'w'), indent=1)
    passed = sum(s['ok'] for s in steps)
    print(f'{passed}/{len(steps)} steps passed -> {path}')


if __name__ == '__main__':
    main()
