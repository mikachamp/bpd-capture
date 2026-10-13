"""Extract the BPD logo mark (no text) from BPT Logo.pdf as JSON: exact paths + RGB gradient LUTs."""
import json, sys
import pymupdf

PDF = r"C:\Users\mikaw\Documents\3D Printing\Jobs\2026\BluePrint_Digital\BPT Logo.pdf"
OUT = sys.argv[1]
doc = pymupdf.open(PDF)
page = doc[0]


def subpaths(items):
    """Split PyMuPDF path items into closed loops of ['M'|'L'|'C', points...] in page coords (y down)."""
    loops, cur, last = [], None, None
    for it in items:
        kind = it[0]
        if kind == "re":
            r = it[1]
            loops.append([["M", r.x0, r.y0], ["L", r.x1, r.y0], ["L", r.x1, r.y1], ["L", r.x0, r.y1]])
            last = None
            continue
        if kind == "qu":
            q = it[1]
            loops.append([["M", q.ul.x, q.ul.y], ["L", q.ur.x, q.ur.y], ["L", q.lr.x, q.lr.y], ["L", q.ll.x, q.ll.y]])
            last = None
            continue
        start = it[1]
        if last is None or abs(start.x - last.x) > 0.01 or abs(start.y - last.y) > 0.01:
            cur = [["M", start.x, start.y]]
            loops.append(cur)
        if kind == "l":
            cur.append(["L", it[2].x, it[2].y]); last = it[2]
        elif kind == "c":
            cur.append(["C", it[2].x, it[2].y, it[3].x, it[3].y, it[4].x, it[4].y]); last = it[4]
    return [[[round(v, 3) if isinstance(v, float) else v for v in cmd] for cmd in loop] for loop in loops]


drawings = page.get_drawings(extended=True)
clips = [d for d in drawings if d.get("type") == "clip"]
fills = [d for d in drawings if d.get("type") == "f"]
print("clips:", len(clips), "fills:", len(fills))
for c in clips:
    print("  clip rect", [round(v, 1) for v in c["scissor"]], "items", len(c["items"]))

# The icon's flat dark parts are the fills left of the divider bar (x < 900): 3 pencil bars + graphite tip.
pencil = [subpaths(d["items"]) for d in fills if d["rect"].x1 < 900]
# The two gradient clips are the big ones left of the divider.
grad_clips = [c for c in clips if c["scissor"].x1 < 900 and c["scissor"].width > 400]
print("pencil parts:", len(pencil), "gradient clips:", len(grad_clips))


def to_rgb(cmyk):
    """Convert one CMYK colour to sRGB with MuPDF's colour engine (the same one that renders the PDF)."""
    pix = pymupdf.Pixmap(pymupdf.csCMYK, pymupdf.IRect(0, 0, 1, 1), False)
    pix.set_pixel(0, 0, tuple(int(round(v * 255)) for v in cmyk))
    rgb = pymupdf.Pixmap(pymupdf.csRGB, pix)
    return list(rgb.pixel(0, 0))


def stitched(bounds, segs, t):
    """Evaluate a PDF Type 3 (stitching) function of Type 2 exponential segments."""
    edges = [0.0] + bounds + [1.0]
    for i, (c0, c1, n) in enumerate(segs):
        a, b = edges[i], edges[i + 1]
        if t <= b or i == len(segs) - 1:
            u = 0.0 if b == a else min(max((t - a) / (b - a), 0.0), 1.0)
            return [x0 + (u ** n) * (x1 - x0) for x0, x1 in zip(c0, c1)]


# Gradient definitions, verbatim from the PDF's shading functions (xref 17 & 18).
blue = dict(bounds=[0.517964, 0.948889], segs=[
    ([.886719, .527344, .0351562, 0], [.886719, .527344, .0351562, 0], 1),
    ([.886719, .527344, .0351562, 0], [.707031, .191406, 0, 0], 1.5613),
    ([.707031, .191406, 0, 0], [.707031, .191406, 0, 0], 1)])
body = dict(bounds=[0, 0.293828, 0.604823, 0.943174], segs=[
    ([.796875, .109375, .523437, .00390625], [.917969, .921875, .0429687, .00390625], 1),
    ([.917969, .921875, .0429687, .00390625], [.390625, .921875, .03125, 0], 1.09852),
    ([.390625, .921875, .03125, 0], [.0390625, .992187, .0390625, 0], 1.36909),
    ([.0390625, .992187, .0390625, 0], [.0195312, .300781, .777344, 0], 1.46572),
    ([.0195312, .300781, .777344, 0], [.0195312, .300781, .777344, 0], 1.29548)])

N = 48
lut = lambda g: [to_rgb(stitched(g["bounds"], g["segs"], i / (N - 1))) for i in range(N)]

# Gradient axes, from the shadings' cm matrices, converted to page coords (y down = 1080 - y).
H = page.rect.height
data = {
    "viewBox": [0, 0, page.rect.width, H],
    "blueLayer": subpaths(grad_clips[0]["items"]),
    "colourLayer": subpaths(grad_clips[1]["items"]),
    "pencil": pencil,
    "pencilColor": [round(v * 255) for v in fills[-1]["fill"]],
    # Sh0: horizontal, x from 318.987 to 318.987 + 526.179
    "blueGradient": {"p0": [318.9872, H - 560.4185], "d": [526.1786, 0], "lut": lut(blue)},
    # Sh1: from (456.061, 241.761) along (170.966, 526.178) in PDF space
    "colourGradient": {"p0": [456.0610, H - 241.7607], "d": [170.9657, -526.1785], "lut": lut(body)},
}
json.dump(data, open(OUT + "/logo_mark.json", "w"))
print("blue stops", data["blueGradient"]["lut"][0], data["blueGradient"]["lut"][-1])
print("colour stops", [data["colourGradient"]["lut"][i] for i in (0, 14, 29, 45, 47)])
print("loops: blue", len(data["blueLayer"]), "colour", len(data["colourLayer"]), "pencil", [len(p) for p in pencil])
