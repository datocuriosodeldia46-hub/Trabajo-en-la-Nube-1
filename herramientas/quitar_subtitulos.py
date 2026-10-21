"""Remove burned-in captions from a video.

1. Mask: near-white pixels in the caption band that sit next to the dark outline/shadow
   (letters), dilated to cover the outline.
2. Fill from neighbouring frames: what the text covers in one frame is usually visible in
   another because the camera moves. Neighbours are aligned to the frame with optical flow (DIS);
   the flow under the text is interpolated from around it so the static letters don't drag it.
3. Whatever no neighbour shows is filled with spatial inpainting (Telea), with feathered edges.

    python3 quitar_subtitulos.py in.mp4 out.mp4 [--y0 930 --y1 1060] [--debug dir]
"""
import argparse, subprocess, sys, os
import numpy as np, cv2

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--y0', type=int, default=930); ap.add_argument('--y1', type=int, default=1060)
ap.add_argument('--reach', type=int, default=14, help='neighbour frames searched on each side')
ap.add_argument('--debug', default=None); ap.add_argument('--only', default=None, help='a,b frame range for tests')
ap.add_argument('--frames', default=None, help='comma list: only write debug images for these frames')
a = ap.parse_args()

def probe(path):
    out = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'csv=p=0', path]).decode().strip()
    w, h, r = out.split(',')
    n, d = r.split('/')
    return int(w), int(h), float(n) / float(d)

W, H, FPS = probe(a.src)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', a.src, '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], stdout=subprocess.PIPE, check=True).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
N = len(frames)
print(f'{N} frames {W}x{H} @ {FPS}', flush=True)
Y0, Y1 = a.y0, a.y1

def text_mask(t):
    """Captions are white and sit still while the picture moves under them."""
    f = frames[t]
    band = f[Y0:Y1].astype(np.int16)
    mn, mx = band.min(axis=2), band.max(axis=2)
    white = (mn > 185) & (mx - mn < 45)
    still = np.zeros(white.shape, bool)
    for s_ in (t - 1, t + 1):
        if 0 <= s_ < N: still |= np.abs(frames[s_][Y0:Y1].astype(np.int16) - band).max(axis=2) < 10
    n, lab, st, _ = cv2.connectedComponentsWithStats((white & still).astype(np.uint8), connectivity=8)
    comps = [i for i in range(1, n) if 6 <= st[i][3] <= 60 and st[i][4] >= 8 and st[i][2] <= 0.5 * W]
    if not comps: return np.zeros((H, W), bool)
    cy = np.median([st[i][1] + st[i][3] / 2 for i in comps])
    comps = [i for i in comps if abs(st[i][1] + st[i][3] / 2 - cy) < 22]
    if sum(st[i][4] for i in comps) < 60: return np.zeros((H, W), bool)
    x0 = min(st[i][0] for i in comps); x1 = max(st[i][0] + st[i][2] for i in comps)
    y0 = min(st[i][1] for i in comps); y1 = max(st[i][1] + st[i][3] for i in comps)
    if abs((x0 + x1) / 2 - W / 2) > 0.12 * W: return np.zeros((H, W), bool)     # captions are centred
    # inside the caption's box every white-ish pixel is treated as letter, then grown over outline and shadow
    bx0, bx1, by0, by1 = max(0, x0 - 6), min(W, x1 + 6), max(0, y0 - 6), min(Y1 - Y0, y1 + 6)
    m = np.zeros(white.shape, bool)
    m[by0:by1, bx0:bx1] = (mn[by0:by1, bx0:bx1] > 165) & (mx - mn)[by0:by1, bx0:bx1] < 60
    full = np.zeros((H, W), np.uint8); full[Y0:Y1] = m
    full = cv2.dilate(full, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
    full = np.maximum(full, np.roll(np.roll(full, 3, 0), 2, 1))
    return full > 0

raw_masks = [text_mask(i) for i in range(N)]
# captions pop in with a little bounce, so a frame's mask also takes its neighbours' (±3 frames):
# a source frame is never trusted where any nearby frame had text
masks = []
for i in range(N):
    u = np.zeros((H, W), bool)
    for j in range(max(0, i - 3), min(N, i + 4)): u |= raw_masks[j]
    masks.append(cv2.dilate(u.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0 if u.any() else u)
cov = np.array([m.sum() for m in masks])
print(f'frames with text: {(cov > 0).sum()}/{N}', flush=True)

dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
CY0, CY1 = max(0, Y0 - 260), min(H, Y1 + 260)        # flow is computed in a band around the captions
gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)

def pre(f, m):
    g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
    return cv2.inpaint(g, m.astype(np.uint8), 3, cv2.INPAINT_TELEA) if m.any() else g

def flow_to(t, s, mt, ms):
    a_ = pre(frames[t], mt | ms)[CY0:CY1]; b_ = pre(frames[s], mt | ms)[CY0:CY1]
    fl = dis.calc(a_, b_, None)
    hole = (mt | ms)[CY0:CY1].astype(np.uint8)
    if hole.any():
        big = cv2.dilate(hole, np.ones((9, 9), np.uint8))
        for c in range(2): fl[..., c] = cv2.inpaint(fl[..., c], big, 5, cv2.INPAINT_TELEA)
    full = np.zeros((H, W, 2), np.float32); full[CY0:CY1] = fl
    return full

lo, hi = (0, N) if not a.only else map(int, a.only.split(','))
out = []
pick = [int(x) for x in a.frames.split(',')] if a.frames else None
for t in (pick or range(lo, hi)):
    f = frames[t].copy(); m = masks[t]
    if not m.any(): out.append(f); continue
    todo = m.copy(); acc = np.zeros(f.shape, np.float32); wsum = np.zeros((H, W), np.float32)
    # candidate neighbours, each aligned with optical flow and scored on a ring around the text:
    # a neighbour whose warp doesn't match the visible surroundings is not trusted inside the hole
    ring = (cv2.dilate(m.astype(np.uint8), np.ones((25, 25), np.uint8)) > 0) & ~m
    cands = []
    for d in (1, 2, 4, 7, 11, 16, 22):
        for s in (t - d, t + d):
            if not (0 <= s < N): continue
            fl = flow_to(t, s, m, masks[s])
            mx_, my_ = gx + fl[..., 0], gy + fl[..., 1]
            warped = cv2.remap(frames[s], mx_, my_, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            src_mask = cv2.remap(masks[s].astype(np.uint8), mx_, my_, cv2.INTER_NEAREST, borderValue=1) > 0
            inb = (mx_ >= 0) & (mx_ <= W - 1) & (my_ >= 0) & (my_ <= H - 1)
            err = np.abs(warped[ring].astype(np.float32) - f[ring].astype(np.float32)).mean() if ring.any() else 0
            cands.append((err, s, warped, m & ~src_mask & inb))
    cands.sort(key=lambda c: c[0])
    best = cands[0][0] if cands else 0
    for err, s, warped, ok in cands:
        if err > min(9.0, max(4.0, best * 1.35)): break
        ok = ok & todo
        acc[ok] += warped[ok]; wsum[ok] += 1
        todo &= ~ok
        if not todo.any(): break
    filled = f.astype(np.float32)
    got = wsum > 0
    filled[got] = acc[got] / wsum[got, None]
    res = filled.astype(np.uint8)
    if todo.any(): res = cv2.inpaint(res, todo.astype(np.uint8), 5, cv2.INPAINT_TELEA)
    # gradient-domain blend: the patch keeps its texture but meets the frame's own colours at the edge
    mm = cv2.dilate(m.astype(np.uint8), np.ones((5, 5), np.uint8)) * 255
    ys, xs = np.nonzero(mm)
    if len(xs) and xs.min() > 1 and ys.min() > 1 and xs.max() < W - 2 and ys.max() < H - 2:
        c = (int((xs.min() + xs.max()) // 2), int((ys.min() + ys.max()) // 2))
        try: res = cv2.seamlessClone(res, f, mm, c, cv2.NORMAL_CLONE)
        except cv2.error: pass
    # feather the seam
    soft = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 2.0)[..., None]
    soft = np.clip(soft * 1.6, 0, 1)
    f = (res.astype(np.float32) * soft + f.astype(np.float32) * (1 - soft)).astype(np.uint8)
    out.append(f)
    if a.debug and (pick or t % 50 == 0):
        os.makedirs(a.debug, exist_ok=True)
        cv2.imwrite(f'{a.debug}/t{t:04d}.png', np.vstack([frames[t][Y0 - 120:Y1 + 120], np.where(m[Y0 - 120:Y1 + 120, :, None], 255, frames[t][Y0 - 120:Y1 + 120]).astype(np.uint8), f[Y0 - 120:Y1 + 120]]))
    if t % 100 == 0: print(f'frame {t}/{N}  from neighbours {got.sum()} px, spatial {todo.sum()} px', flush=True)

if pick: sys.exit(0)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-ss', str(lo / FPS), '-t', str(len(out) / FPS), '-i', a.src, '-map', '0:v', '-map', '1:a?', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15',
                        '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', a.dst], stdin=subprocess.PIPE)
for f in out: enc.stdin.write(f.tobytes())
enc.stdin.close(); enc.wait()
print('wrote', a.dst)
