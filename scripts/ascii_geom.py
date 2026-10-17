"""Per-character geodesic geometry for the site's ASCII black hole.

For each character cell we trace one light ray backwards from the camera through
Schwarzschild spacetime (u'' = 3u^2 - u, u = 1/r, G = c = M = 1) and record:
whether it falls in, up to three crossings of the thin disk (radius, azimuth,
redshift factor g) and, if it escapes, where it lands on the sky. The browser
only animates textures on top of this, so it stays cheap and runs forever.

Output: a little-endian Uint16 grid, 12 channels per cell, plus a JSON header.
usage: ascii_geom.py OUT_DIR [--print]
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy.ndimage import map_coordinates

COLS, ROWS = 124, 38
CELL_ASPECT = 0.52           # character width / line height
D = 60.0
INC = math.radians(80.0)
R_IN, R_OUT = 6.0, 14.5
HALF_FOV_Y = math.radians(17.5)

# ------------------------------------------------------------------ rays per cell
f = (ROWS / 2) / math.tan(HALF_FOV_Y)          # in line-height units
cam = np.array([math.sin(INC), 0.0, math.cos(INC)]) * D
fwd = -cam / D
right = np.cross(fwd, [0, 0, 1.0]); right /= np.linalg.norm(right)
up = np.cross(right, fwd)
cx = (np.arange(COLS) + 0.5 - COLS / 2) * CELL_ASPECT / f
cy = -(np.arange(ROWS) + 0.5 - ROWS / 2) / f
PX, PY = np.meshgrid(cx, cy)
d = fwd + PX[..., None] * right + PY[..., None] * up
d /= np.linalg.norm(d, axis=-1, keepdims=True)

e1 = cam / D
cos_t = np.clip(d @ (-e1), -1, 1)
b = D * np.sqrt(1 - cos_t ** 2) / math.sqrt(1 - 2 / D)
n = np.cross(e1[None, None], d)
nn = np.linalg.norm(n, axis=-1, keepdims=True)
n = np.where(nn > 1e-9, n / np.maximum(nn, 1e-12), np.array([0, 1.0, 0]))
e2 = np.cross(n, e1[None, None])

# ------------------------------------------------------------------ geodesic table in b
NB, h, KEEP, PHI_MAX = 4000, 0.0015, 4, 4.2 * math.pi
bs = np.linspace(0.25, float(b.max()) * 1.01, NB)
u = np.full(NB, 1 / D)
v = np.sqrt(np.maximum(1 / bs ** 2 - (1 / D) ** 2 * (1 - 2 / D), 0))
alive = np.ones(NB, bool)
phi_end = np.full(NB, PHI_MAX)
captured = np.zeros(NB, bool)
cols = [u.copy()]
acc = lambda x: 3 * x * x - x
phi, step = 0.0, 0
while phi < PHI_MAX and alive.any():
    idx = np.flatnonzero(alive)
    uu, vv = u[idx], v[idx]
    k1u, k1v = vv, acc(uu)
    k2u, k2v = vv + h / 2 * k1v, acc(uu + h / 2 * k1u)
    k3u, k3v = vv + h / 2 * k2v, acc(uu + h / 2 * k2u)
    k4u, k4v = vv + h * k3v, acc(uu + h * k3u)
    nu = uu + h / 6 * (k1u + 2 * k2u + 2 * k3u + k4u)
    nv = vv + h / 6 * (k1v + 2 * k2v + 2 * k3v + k4v)
    cap, esc = nu >= 0.5, nu <= 0
    frac = np.where(esc, uu / np.maximum(uu - nu, 1e-12), 1.0)
    phi_end[idx[esc]] = phi + frac[esc] * h
    phi_end[idx[cap]] = phi + h
    captured[idx[cap]] = True
    u[idx] = np.where(esc, 0.0, np.minimum(nu, 0.5))
    v[idx] = nv
    alive[idx[cap | esc]] = False
    phi += h
    step += 1
    if step % KEEP == 0:
        cols.append(u.copy())
table = np.stack(cols, 1)
dphi = h * KEEP

bi = np.clip((b - bs[0]) / (bs[1] - bs[0]), 0, NB - 1.001)
i0 = np.floor(bi).astype(int); tt = bi - i0
pend = phi_end[i0] * (1 - tt) + phi_end[i0 + 1] * tt
pcap = (captured[i0] * (1 - tt) + captured[i0 + 1] * tt) > 0.5


def u_at(ph):
    j = np.clip(ph / dphi, 0, table.shape[1] - 1.001)
    return map_coordinates(table, [bi.ravel(), j.ravel()], order=1, mode="nearest").reshape(bi.shape)


phi_d = np.mod(np.arctan2(-e1[2] * np.ones_like(b), e2[..., 2]), math.pi)
phi_d = np.where(phi_d < 1e-6, math.pi, phi_d)
chan = []
for k in range(3):
    pk = phi_d + k * math.pi
    uk = u_at(pk)
    rk = np.where(uk > 1e-6, 1 / np.maximum(uk, 1e-6), 1e9)
    on = (pk < pend) & (rk >= R_IN) & (rk <= R_OUT)
    pos = rk[..., None] * (e1 * np.cos(pk)[..., None] + e2 * np.sin(pk)[..., None])
    psi = np.mod(np.arctan2(pos[..., 1], pos[..., 0]), 2 * math.pi)
    g = np.sqrt(np.clip(1 - 3 / rk, 1e-4, 1)) / (1 - rk ** -1.5 * (-b * n[..., 2]))
    chan += [np.where(on, (rk - R_IN) / (R_OUT - R_IN), 0), np.where(on, psi / (2 * math.pi), 0), np.where(on, np.clip(g / 2, 0, 1), 0), on.astype(float)]

dinf = e1 * np.cos(pend)[..., None] + e2 * np.sin(pend)[..., None]
lat = np.arcsin(np.clip(dinf[..., 2], -1, 1))
lon = np.mod(np.arctan2(dinf[..., 1], dinf[..., 0]), 2 * math.pi)
chan += [np.where(pcap, 0, lon / (2 * math.pi)), np.where(pcap, 0, (lat + math.pi / 2) / math.pi), pcap.astype(float)]

grid = np.stack(chan, -1)  # ROWS, COLS, 15
q = np.round(np.clip(grid, 0, 1) * 65535).astype("<u2")
out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
(out / "hole.bin").write_bytes(q.tobytes())
(out / "hole.json").write_text(json.dumps({
    "cols": COLS, "rows": ROWS, "channels": q.shape[-1], "cellAspect": CELL_ASPECT,
    "rIn": R_IN, "rOut": R_OUT, "layout": "per hit k=0..2: r01, psi01, g/2, on; then lon01, lat01, captured",
}))
print("cells", COLS * ROWS, "bytes", q.nbytes)

if "--print" in sys.argv:
    ramp = " .:-=+*#%@"
    rows = []
    for y in range(ROWS):
        line = ""
        for x in range(COLS):
            val = 0.0
            for k in range(3):
                if grid[y, x, 4 * k + 3] > 0.5:
                    r = R_IN + grid[y, x, 4 * k] * (R_OUT - R_IN)
                    val += (r / R_IN) ** -2 * (2 * grid[y, x, 4 * k + 2]) ** 3
                    break
            line += ramp[min(len(ramp) - 1, int(val * 7))] if val else ("" if False else " ")
        rows.append(line)
    print("\n".join(rows))
