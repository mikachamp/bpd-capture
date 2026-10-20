"""
Summarises a test-data folder (loop.py results, floor_flow.py runs, desktop loops)
into summary.json and a Markdown table on stdout.

  python scripts/device-test/summarize.py builds/test-data/2026-10-21
"""
import glob
import json
import os
import statistics as st
import sys

NAMES = {
    'com.blueprintdigital.bpdcapture': 'Real app 1.4.2',
    'com.blueprintdigital.bpdcapture.next': 'Next (Ink & ember)',
    'com.blueprintdigital.bpdcapture.floor': 'Floor (Floor Mode)',
}


def med(values):
    values = [v for v in values if v is not None]
    return round(st.median(values)) if values else None


def mean(values, digits=1):
    values = [v for v in values if v is not None]
    return round(st.mean(values), digits) if values else None


def main(folder):
    sys.stdout.reconfigure(encoding="utf-8")
    summary = {'android': {}, 'flows': [], 'desktop': {}}
    path = os.path.join(folder, 'results.json')
    rows = json.load(open(path)) if os.path.exists(path) else []
    for pkg in dict.fromkeys(r['package'] for r in rows):
        rs = [r for r in rows if r['package'] == pkg]
        summary['android'][pkg] = {
            'name': NAMES.get(pkg, pkg),
            'rounds': len(rs),
            'apkMb': round((rs[0].get('apkBytes') or 0) / 1048576, 1),
            'coldStartMedianMs': med([v for r in rs for v in r['coldStartMs']]),
            'coldStartFirstMedianMs': med([r['coldStartMs'][0] for r in rs]),
            'warmStartMedianMs': med([v for r in rs for v in r['warmStartMs']]),
            'memIdleMb': mean([r['memIdleKb'] / 1024 for r in rs if r['memIdleKb']]),
            'memAfterMonkeyMb': mean([r['memAfterMonkeyKb'] / 1024 for r in rs if r['memAfterMonkeyKb']]),
            'monkeyEvents': sum(r['monkey']['events'] for r in rs),
            'crashes': sum(1 for r in rs if r['monkey']['crash'] or r['crashLog']),
            'anrs': sum(1 for r in rs if r['monkey']['anr']),
            'jankyPct': mean([r['frames']['jankyPct'] for r in rs]),
            'p90FrameMs': med([r['frames']['p90ms'] for r in rs]),
            'p99FrameMs': med([r['frames']['p99ms'] for r in rs]),
            'framesRendered': sum(int(r['frames']['frames'] or 0) for r in rs),
        }
    for flow in sorted(glob.glob(os.path.join(folder, 'flow*.json'))):
        steps = json.load(open(flow))
        summary['flows'].append({'file': os.path.basename(flow), 'passed': sum(s['ok'] for s in steps), 'steps': len(steps),
                                 'failed': [s['step'] for s in steps if not s['ok']], 'seconds': round(sum(s['seconds'] for s in steps), 1)})
    dl = os.path.join(folder, 'desktop-ui-loop.json')
    if os.path.exists(dl):
        d = json.load(open(dl))
        summary['desktop']['uiRounds'] = len(d)
        summary['desktop']['tabMedianMs'] = med([v for r in d for v in r['tabs'].values()])
        summary['desktop']['jobOpenMedianMs'] = med([j['openMs'] for r in d for j in r['jobs']])
        summary['desktop']['heapMb'] = [d[0]['heapStartMb'], d[-1]['heapEndMb']]
        summary['desktop']['errors'] = sum(len(r['errors']) for r in d)
    ds = os.path.join(folder, 'desktop-startup.json')
    if os.path.exists(ds):
        d = json.load(open(ds))
        summary['desktop']['startRuns'] = len(d)
        summary['desktop']['startMedianMs'] = med([r['readyMs'] for r in d])
        summary['desktop']['memoryMb'] = mean([r['memoryMb'] for r in d], 0)
    json.dump(summary, open(os.path.join(folder, 'summary.json'), 'w'), indent=1)

    print('| Build | Rounds | APK MB | Cold start (median) | Warm start | Memory idle → after monkey | Janky frames | p90 frame | Monkey events | Crashes | ANRs |')
    print('|---|---|---|---|---|---|---|---|---|---|---|')
    for a in summary['android'].values():
        print(f"| {a['name']} | {a['rounds']} | {a['apkMb']} | {a['coldStartMedianMs']} ms | {a['warmStartMedianMs']} ms | {a['memIdleMb']} → {a['memAfterMonkeyMb']} MB | {a['jankyPct']}% | {a['p90FrameMs']} ms | {a['monkeyEvents']} | {a['crashes']} | {a['anrs']} |")
    for f in summary['flows']:
        print(f"\nWalk-through {f['file']}: {f['passed']}/{f['steps']} passed in {f['seconds']} s" + (f"; failed: {', '.join(f['failed'])}" if f['failed'] else ''))
    if summary['desktop']:
        print('\nDesktop:', json.dumps(summary['desktop']))


if __name__ == '__main__':
    main(sys.argv[1])
