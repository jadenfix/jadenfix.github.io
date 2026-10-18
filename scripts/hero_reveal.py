"""Ray-traced Schwarzschild black hole with a thin accretion disk, rendered to an
animated WebP for the profile header.

Units G = c = M = 1. Every photon moves in a plane through the hole, and in that
plane u = 1/r obeys u'' = 3u^2 - u. So one table of u(phi) per impact parameter b
covers every pixel: we look up where each ray crosses the disk plane (up to three
times, which gives the lensed images of the far side of the disk) and where it
ends up on the sky. Per pixel geometry is computed once; each frame only moves
textures, so the loop is cheap and seamless.

usage: blackhole.py OUT.webp [--preview]
"""
import math
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter, map_coordinates

OUT = sys.argv[1]
PREVIEW = "--preview" in sys.argv
STILL = "--still" in sys.argv

W, H = (800, 471) if PREVIEW else (1600, 943)  # same aspect as the ASCII grid: 124*0.52/38
SS = 1  # supersampling per axis
FRAMES = 4 if PREVIEW else (10 if STILL else 120)
FPS = 20

D = 60.0                     # camera distance
INC = math.radians(80.0)     # angle between camera and disk axis
R_IN, R_OUT = 6.0, 14.5      # ISCO to outer edge
BH_X = 0.5                 # where the hole sits across the frame
HALF_FOV_Y = math.radians(17.5)
SKY_DRIFT = math.radians(7)  # the sky turns this far per loop; the last 30% cross-fades back
rng = np.random.default_rng(7)

# ------------------------------------------------------------------ rays
w, h = W * SS, H * SS
f_px = (h / 2) / math.tan(HALF_FOV_Y)
cam = np.array([math.sin(INC), 0.0, math.cos(INC)]) * D
fwd = -cam / D
right = np.cross(fwd, [0, 0, 1.0]); right /= np.linalg.norm(right)
up = np.cross(right, fwd)
px = (np.arange(w) + 0.5 - BH_X * w) / f_px
py = -(np.arange(h) + 0.5 - 0.5 * h) / f_px
PX, PY = np.meshgrid(px, py)
d = fwd[None, None] + PX[..., None] * right + PY[..., None] * up
d /= np.linalg.norm(d, axis=-1, keepdims=True)

e1 = cam / D
cos_t = np.clip(d @ (-e1), -1, 1)
sin_t = np.sqrt(1 - cos_t ** 2)
b = D * sin_t / math.sqrt(1 - 2 / D)
n = np.cross(e1[None, None], d)
nn = np.linalg.norm(n, axis=-1, keepdims=True)
n = np.where(nn > 1e-9, n / np.maximum(nn, 1e-12), np.array([0, 1.0, 0]))
e2 = np.cross(n, e1[None, None])

# ------------------------------------------------------------------ geodesic table
B_MAX = float(b.max()) * 1.01
NB = 5000
bs = np.linspace(0.25, B_MAX, NB)
hstep = 0.0015
KEEP = 4
PHI_MAX = 4.2 * math.pi
u0 = 1 / D
u = np.full(NB, u0)
v = np.sqrt(np.maximum(1 / bs ** 2 - u0 ** 2 * (1 - 2 * u0), 0))
alive = np.ones(NB, bool)
phi_end = np.full(NB, PHI_MAX)
captured = np.zeros(NB, bool)
cols = [u.copy()]


def acc(u):
    return 3 * u * u - u


phi = 0.0
step = 0
while phi < PHI_MAX and alive.any():
    a = alive
    uu, vv = u[a], v[a]
    k1u, k1v = vv, acc(uu)
    k2u, k2v = vv + hstep / 2 * k1v, acc(uu + hstep / 2 * k1u)
    k3u, k3v = vv + hstep / 2 * k2v, acc(uu + hstep / 2 * k2u)
    k4u, k4v = vv + hstep * k3v, acc(uu + hstep * k3u)
    nu = uu + hstep / 6 * (k1u + 2 * k2u + 2 * k3u + k4u)
    nv = vv + hstep / 6 * (k1v + 2 * k2v + 2 * k3v + k4v)
    idx = np.flatnonzero(a)
    cap = nu >= 0.5
    esc = nu <= 0
    # exact-ish end angle by linear interpolation inside the step
    frac = np.where(esc, uu / np.maximum(uu - nu, 1e-12), 1.0)
    phi_end[idx[esc]] = phi + frac[esc] * hstep
    phi_end[idx[cap]] = phi + hstep
    captured[idx[cap]] = True
    u[idx] = np.where(esc, 0.0, np.minimum(nu, 0.5))
    v[idx] = nv
    alive[idx[cap | esc]] = False
    phi += hstep
    step += 1
    if step % KEEP == 0:
        cols.append(u.copy())
table = np.stack(cols, axis=1).astype(np.float32)  # (NB, NPHI)
dphi = hstep * KEEP
NPHI = table.shape[1]

bi = np.clip((b - bs[0]) / (bs[1] - bs[0]), 0, NB - 1.001)


def lookup(arr1d):
    i = np.floor(bi).astype(int)
    t = bi - i
    return arr1d[i] * (1 - t) + arr1d[i + 1] * t


pix_phi_end = lookup(phi_end)
pix_captured = lookup(captured.astype(np.float32)) > 0.5


def u_at(phis):
    j = np.clip(phis / dphi, 0, NPHI - 1.001)
    return map_coordinates(table, [bi.ravel(), j.ravel()], order=1, mode="nearest").reshape(bi.shape)


# ------------------------------------------------------------------ disk crossings
phi_a = np.arctan2(-e1[2] * np.ones_like(b), e2[..., 2])
phi_d = np.mod(phi_a, math.pi)
phi_d = np.where(phi_d < 1e-6, math.pi, phi_d)
hits = []
for k in range(3):
    pk = phi_d + k * math.pi
    ok = pk < pix_phi_end
    uk = u_at(pk)
    rk = np.where(uk > 1e-6, 1 / np.maximum(uk, 1e-6), 1e9)
    on = ok & (rk >= R_IN) & (rk <= R_OUT)
    pos = rk[..., None] * (e1[None, None] * np.cos(pk)[..., None] + e2 * np.sin(pk)[..., None])
    psi = np.arctan2(pos[..., 1], pos[..., 0])
    om = rk ** -1.5
    lz = -b * n[..., 2]                       # photon angular momentum about the disk axis
    g = np.sqrt(np.clip(1 - 3 / rk, 1e-4, 1)) / (1 - om * lz)
    hits.append((on, rk, psi, g))

# ------------------------------------------------------------------ sky directions
end = pix_phi_end
dir_inf = e1[None, None] * np.cos(end)[..., None] + e2 * np.sin(end)[..., None]
lat = np.arcsin(np.clip(dir_inf[..., 2], -1, 1))
lon = np.arctan2(dir_inf[..., 1], dir_inf[..., 0])
sky_mask = ~pix_captured

# ------------------------------------------------------------------ textures
TW, TH = 4096, 2048    # full sky, equirectangular
sky = np.zeros((TH, TW, 3), np.float32)
ns = 9000
sx = rng.uniform(0, TW, ns); sy = np.arccos(rng.uniform(-1, 1, ns)) / math.pi * (TH - 1)
mag = rng.pareto(1.9, ns) * 0.16 + 0.02
temp = rng.uniform(0, 1, ns)
col = np.stack([0.80 + 0.30 * (1 - temp), 0.86 + 0.06 * temp, 0.92 + 0.25 * temp], 1)
for x, y, m, c in zip(sx, sy, mag, col):
    xi, yi = int(x), int(y)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            wgt = math.exp(-((xi + dx - x) ** 2 + (yi + dy - y) ** 2) / 0.3)
            sky[(yi + dy) % TH, (xi + dx) % TW] += c * m * wgt
yy = np.linspace(-math.pi / 2, math.pi / 2, TH)[:, None]
xx = np.linspace(0, 2 * math.pi, TW, endpoint=False)[None, :]
noise = np.zeros((TH, TW), np.float32)
for m in range(1, 7):
    for _ in range(3):
        noise += (rng.uniform(0.3, 1) / m) * np.cos(m * xx + rng.uniform(0, 6.3)) * np.cos(rng.uniform(1, 8) * yy + rng.uniform(0, 6.3))
neb = np.clip(noise - 0.4, 0, None) ** 2
sky += neb[..., None] * np.array([0.0012, 0.0022, 0.0050], np.float32)    # faint blue dust
# a few distant galaxies, tiny tilted smudges
for _ in range(14):
    gx, gy = rng.uniform(0, TW), rng.uniform(TH * 0.3, TH * 0.7)
    a_, b_, th = rng.uniform(3, 9), rng.uniform(1, 3), rng.uniform(0, math.pi)
    x0, x1, y0, y1 = int(gx - 12), int(gx + 12), int(gy - 12), int(gy + 12)
    YY, XX = np.mgrid[y0:y1, x0:x1]
    u_ = (XX - gx) * math.cos(th) + (YY - gy) * math.sin(th)
    v_ = -(XX - gx) * math.sin(th) + (YY - gy) * math.cos(th)
    blob = np.exp(-(u_ / a_) ** 2 - (v_ / b_) ** 2) * rng.uniform(0.04, 0.12)
    sky[YY % TH, XX % TW] += blob[..., None] * np.array([1.0, 0.92, 0.85], np.float32)

# disk: many thin rings, each with its own random azimuthal pattern and an
# integer number of turns per loop (inner rings spin faster), so it loops.
NR = 90
ring_r = np.sort(rng.uniform(R_IN + 0.15, R_OUT - 0.2, NR))
ring_w = rng.uniform(0.05, 0.45, NR)
ring_a = rng.uniform(0.35, 1.0, NR)
ring_turns = np.maximum(1, np.round(2.0 * (R_IN / ring_r) ** 1.5)).astype(int)
ring_harm = []
for i in range(NR):
    ms = rng.choice(np.arange(1, 22), 5, replace=False)
    ring_harm.append([(int(m), rng.uniform(0.2, 1) / math.sqrt(m), rng.uniform(0, 6.3)) for m in ms])


_rr = np.linspace(R_IN, R_OUT, 2000)
BASE_MAX = float((_rr ** -2.2 * np.clip(1 - np.sqrt(R_IN / _rr), 0, None) ** 0.6).max())


def disk_emission(rk, psi, t):
    """Rest-frame brightness at radius rk and angle psi at loop phase t in [0,1)."""
    base = rk ** -2.2 * np.clip(1 - np.sqrt(R_IN / rk), 0, None) ** 0.6 / BASE_MAX
    tex = np.full(rk.shape, 0.25, np.float32)
    for i in range(NR):
        wgt = np.exp(-((rk - ring_r[i]) / ring_w[i]) ** 2)
        sel = wgt > 0.02
        if not sel.any():
            continue
        ang = psi[sel] - 2 * math.pi * ring_turns[i] * t
        pat = np.zeros(ang.shape, np.float32)
        for m, amp, ph in ring_harm[i]:
            pat += amp * np.cos(m * ang + ph)
        tex[sel] += ring_a[i] * wgt[sel] * (0.5 + 0.5 * np.tanh(1.8 * pat))
    edge = np.clip((R_OUT - rk) / 2.5, 0, 1) * np.clip((rk - R_IN) / 0.35, 0, 1)
    return base * tex * edge


def colour(temp):
    """Warm blackbody-ish ramp from deep red to blue-white."""
    stops = np.array([0.0, 0.35, 0.6, 0.85, 1.1, 1.6, 2.4])
    rgb = np.array([[0.25, 0.02, 0.00], [0.75, 0.12, 0.02], [1.0, 0.38, 0.08],
                    [1.0, 0.62, 0.30], [1.0, 0.86, 0.68], [0.98, 0.96, 0.95], [0.80, 0.88, 1.0]])
    out = np.empty(temp.shape + (3,), np.float32)
    for c in range(3):
        out[..., c] = np.interp(temp, stops, rgb[:, c])
    return out


T_r = lambda r: (r / R_IN) ** -0.75 * np.clip(1 - np.sqrt(R_IN / r), 1e-3, None) ** 0.25
T_norm = 1 / T_r(np.linspace(R_IN, R_OUT, 500)).max()


# static per-hit data: only the ring texture phase changes from frame to frame
HIT = []
for on, rk, psi, g in hits:
    idx = np.flatnonzero(on.ravel())
    if idx.size == 0:
        continue
    r_, p_, g_ = rk.ravel()[idx], psi.ravel()[idx], g.ravel()[idx]
    base = r_ ** -2.2 * np.clip(1 - np.sqrt(R_IN / r_), 0, None) ** 0.6 / BASE_MAX
    edge = np.clip((R_OUT - r_) / 2.5, 0, 1) * np.clip((r_ - R_IN) / 0.35, 0, 1)
    rings = []
    for i in range(NR):
        wgt = np.exp(-((r_ - ring_r[i]) / ring_w[i]) ** 2)
        sel = np.flatnonzero(wgt > 0.02)
        if sel.size:
            rings.append((i, sel, (ring_a[i] * wgt[sel]).astype(np.float32), p_[sel].astype(np.float32)))
    tcol = colour(g_ * T_r(r_) * T_norm * 1.15)
    HIT.append((idx, base * edge, g_ ** 2.7 * 1.15, tcol, rings))

LA = ((math.pi / 2 - lat) / math.pi * (TH - 1)).ravel()
LON = lon.ravel()
SKYM = sky_mask.ravel()


def ease_s(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def render(t):
    img = np.zeros((h * w, 3), np.float32)
    trans = np.ones(h * w, np.float32)
    for idx, be, gboost, tcol, rings in HIT:
        tex = np.full(idx.size, 0.25, np.float32)
        for i, sel, aw, ps in rings:
            ang = ps - np.float32(2 * math.pi * ring_turns[i] * t)
            pat = np.zeros(sel.size, np.float32)
            for m, amp, ph in ring_harm[i]:
                pat += np.float32(amp) * np.cos(m * ang + np.float32(ph))
            tex[sel] += aw * (0.5 + 0.5 * np.tanh(1.8 * pat))
        em = be * tex
        img[idx] += (trans[idx] * em * gboost)[:, None] * tcol
        trans[idx] *= 1 - np.clip(em * 1.4, 0, 0.97)
    fade = ease_s((t - 0.7) / 0.3)
    for shift, wt in ((SKY_DRIFT * t, 1 - fade), (SKY_DRIFT * (t - 1), fade)):
        if wt <= 0:
            continue
        lo = np.mod(LON + shift, 2 * math.pi) / (2 * math.pi) * TW
        for c in range(3):
            sc = map_coordinates(sky[..., c], [LA, lo], order=1, mode="wrap")
            img[:, c] += np.where(SKYM, sc, 0) * trans * wt
    img = img.reshape(h, w, 3)
    if SS > 1:
        img = img.reshape(H, SS, W, SS, 3).mean(axis=(1, 3))
    bright = np.clip(img - 0.6, 0, None)
    glow = sum(gaussian_filter(bright, sigma=(s_, s_, 0)) * k for s_, k in ((2, 0.35), (8, 0.25), (24, 0.15)))
    img = 1 - np.exp(-(img + glow) * 1.1)
    return np.clip(img, 0, 1) ** (1 / 2.2)


# ------------------------------------------------------------------ type
FONT_DIR = "/System/Library/Fonts/"


def font(name, size, index=0):
    try:
        return ImageFont.truetype(FONT_DIR + name, size, index=index)
    except OSError:
        return ImageFont.load_default()


def tracked(dr, xy, txt, fnt, fill, track):
    x, y = xy
    for ch in txt:
        dr.text((x, y), ch, font=fnt, fill=fill)
        x += dr.textlength(ch, font=fnt) + track


def overlay():
    s = W / 1280
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(layer)
    name = font("HelveticaNeue.ttc", int(40 * s), index=7)      # Light
    line = font("HelveticaNeue.ttc", int(16 * s), index=7)
    mono = font("Menlo.ttc", int(10 * s))
    x0, y0 = int(84 * s), int(H / 2 - 40 * s)
    tracked(dr, (x0, y0), "JADEN FIX", name, (236, 238, 242, 255), 11 * s)
    dr.line([(x0 + 2, y0 + int(64 * s)), (x0 + int(28 * s), y0 + int(64 * s))], fill=(255, 170, 110, 200), width=max(1, int(s)))
    dr.text((x0 + 1, y0 + int(80 * s)), "Agents, RL, and the systems they run on.", font=line, fill=(170, 176, 186, 255))
    tracked(dr, (x0 + 1, y0 + int(108 * s)), "AFTERQUERY  ·  SAN FRANCISCO", mono, (98, 106, 118, 255), 2.2 * s)
    tracked(dr, (W - int(84 * s) - int(250 * s), H - int(34 * s)), "SCHWARZSCHILD  ·  RAY-TRACED", mono, (62, 68, 78, 255), 2.2 * s)
    return layer


def shade_left(img):
    """Darken the text side a touch so the type always reads."""
    x = np.linspace(0, 1, W)[None, :, None]
    return img * (0.7 + 0.3 * np.clip((x - 0.05) / 0.4, 0, 1))


text = overlay()


def make_frame(fi):
    im = render(fi / FRAMES)
    return Image.fromarray((im * 255 + 0.5).astype(np.uint8), "RGB")


if __name__ == "__main__":
    import multiprocessing as mp
    with mp.get_context("fork").Pool(min(3, FRAMES)) as pool:
        frames = []
        for k, fr in enumerate(pool.imap(make_frame, range(FRAMES))):
            frames.append(fr)
            if k % 25 == 0:
                print(f"frame {k}/{FRAMES}", flush=True)

    if OUT.endswith(".png"):
        frames[0].save(OUT)
    else:
        frames[0].save(OUT, save_all=True, append_images=frames[1:], duration=int(1000 / FPS), loop=0,
                       quality=72, method=6)
    print("done", OUT)
