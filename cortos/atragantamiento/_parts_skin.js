function rod(a, b, r, mat, parent, seg = 12, r2 = r) {
  const d = V3().subVectors(b, a), L = d.length();
  const m = mesh(new THREE.CylinderGeometry(r2, r, L, seg), mat, parent);
  m.position.addVectors(a, b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
  return m;
}
// smooth keyed profile: kf([[v, value], ...])(v)
const kf = (keys) => (v) => {
  if (v <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (v <= keys[i][0]) { const u = (v - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]); return lerp(keys[i - 1][1], keys[i][1], u * u * (3 - 2 * u)); }
  return keys[keys.length - 1][1];
};
// a normal map from a height field drawn on a canvas (white = raised)
function normalTex(w, h, draw, strength = 2, repeat = [1, 1]) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'); draw(c, w, h);
  const src = c.getImageData(0, 0, w, h).data, out = c.createImageData(w, h), H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), o = (y * w + x) * 4;
    out.data[o] = (-dx / l * 0.5 + 0.5) * 255; out.data[o + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[o + 3] = 255;
  }
  c.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8; return t;
}

// ───────────────────────────── procedural skin ─────────────────────────────
// Limbs, torso and the vest are tubes lofted along a filleted path through the joints and rebuilt every
// frame: bones stay straight and only bend near the joint, so elbows and knees fold like cloth over a body.
function filletPath(pts, rc) {
  const out = [pts[0].clone()];
  for (let i = 1; i < pts.length - 1; i++) {
    const A = pts[i - 1], J = pts[i], B = pts[i + 1], r = Math.min(rc, A.distanceTo(J) * 0.45, J.distanceTo(B) * 0.45);
    const p0 = J.clone().addScaledVector(V3().subVectors(A, J).normalize(), r), p2 = J.clone().addScaledVector(V3().subVectors(B, J).normalize(), r);
    out.push(p0);
    for (let k = 1; k < 10; k++) { const u = k / 10; out.push(V3().addScaledVector(p0, (1 - u) * (1 - u)).addScaledVector(J, 2 * u * (1 - u)).addScaledVector(p2, u * u)); }
    out.push(p2);
  }
  out.push(pts[pts.length - 1].clone());
  const L = [0]; for (let i = 1; i < out.length; i++) L.push(L[i - 1] + out[i].distanceTo(out[i - 1]));
  const total = L[L.length - 1];
  return {
    total, at(v, P, T) {
      const s = clamp(v) * total; let i = 1; while (i < L.length - 1 && L[i] < s) i++;
      const u = (s - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]); P.lerpVectors(out[i - 1], out[i], u);
      // tangent averaged over a short window so the rings don't step at polyline vertices
      const a = Math.max(0, i - 2), b = Math.min(out.length - 1, i + 1); T.subVectors(out[b], out[a]).normalize();
    },
  };
}
class Loft {
  constructor(rings, seg, mat, parent) {
    this.R = rings; this.S = seg;
    const n = rings * (seg + 1), uv = new Float32Array(n * 2), idx = [];
    this.pos = new Float32Array(n * 3); this.nor = new Float32Array(n * 3);
    for (let i = 0; i < rings; i++) for (let j = 0; j <= seg; j++) { const k = i * (seg + 1) + j; uv[2 * k] = j / seg; uv[2 * k + 1] = i / (rings - 1); }
    for (let i = 0; i < rings - 1; i++) for (let j = 0; j < seg; j++) { const a = i * (seg + 1) + j, b = a + seg + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    this.geo = g; this.mesh = mesh(g, mat, parent); this.mesh.frustumCulled = false;
  }
  // path: filletPath; ref(v) → a direction ⟂-ish to the tube (the cross-section "n" axis);
  // prof(v) → { n, b: half-sizes, on, ob: centre offsets, p: superellipse power }; bump(v, a) → radial scale
  build(path, ref, prof, bump) {
    const S = this.S, P = V3(), T = V3(), N = V3(), B = V3(), r = V3(), pos = this.pos;
    for (let i = 0; i < this.R; i++) {
      const v = i / (this.R - 1); path.at(v, P, T);
      r.copy(ref(v)); N.copy(r).addScaledVector(T, -T.dot(r)).normalize(); B.crossVectors(T, N);
      const q = prof(v), e = 2 / (q.p ?? 2), on = q.on ?? 0, ob = q.ob ?? 0;
      for (let j = 0; j <= S; j++) {
        const a = (j % S) / S * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), k = bump ? 1 + bump(v, a) : 1;
        const cx = Math.sign(c) * Math.pow(Math.abs(c), e) * q.n * k + on, sx = Math.sign(s) * Math.pow(Math.abs(s), e) * q.b * k + ob;
        const o = 3 * (i * (S + 1) + j);
        pos[o] = P.x + N.x * cx + B.x * sx; pos[o + 1] = P.y + N.y * cx + B.y * sx; pos[o + 2] = P.z + N.z * cx + B.z * sx;
      }
    }
    // normals: central differences around (wrapping the seam) and along the tube
    const nor = this.nor, R = this.R, W = S + 1, at = (i, j) => 3 * (i * W + j);
    for (let i = 0; i < R; i++) for (let j = 0; j <= S; j++) {
      const jj = j === S ? 0 : j, jp = at(i, (jj + 1) % S), jm = at(i, (jj + S - 1) % S), ip = at(Math.min(i + 1, R - 1), jj), im = at(Math.max(i - 1, 0), jj);
      const ux = pos[jp] - pos[jm], uy = pos[jp + 1] - pos[jm + 1], uz = pos[jp + 2] - pos[jm + 2];
      const vx = pos[ip] - pos[im], vy = pos[ip + 1] - pos[im + 1], vz = pos[ip + 2] - pos[im + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
      const o = at(i, j); nor[o] = nx / l; nor[o + 1] = ny / l; nor[o + 2] = nz / l;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.normal.needsUpdate = true;
  }
}
// analytic two-bone IK: root A, target T, bone lengths, pole direction → [elbow, wrist]
function ik2(A, T, l1, l2, pole) {
  const d = V3().subVectors(T, A), dist = clamp(d.length(), Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.999); d.normalize();
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const p = pole.clone().addScaledVector(d, -pole.dot(d)).normalize();
  return [A.clone().addScaledVector(d, a).addScaledVector(p, h), A.clone().addScaledVector(d, dist)];
}


const _m4 = new THREE.Matrix4(), _x = V3(), _y = V3(), _z = V3();
function setBasis(obj, pos, Y, Z) {   // place a matrixAutoUpdate=false group with the given Y and Z axes
  _z.copy(Z).normalize(); _y.copy(Y); _y.addScaledVector(_z, -_y.dot(_z)).normalize(); _x.crossVectors(_y, _z);
  obj.matrix.makeBasis(_x, _y, _z).setPosition(pos); obj.matrixWorldNeedsUpdate = true;
}

const glowMat = (hex, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }); m.userData.base = m.color.clone(); return m; };
const setGlow = (m, k) => m.color.copy(m.userData.base).multiplyScalar(k);
function buildArrow(len = 0.13, r = 0.014) {   // chunky hologram arrow along +y
  const g = new THREE.Group(), m = glowMat(0x34ff7a, 1.2);
  mesh(new THREE.CylinderGeometry(r, r, len * 0.62, 10), m, g, [0, len * 0.31, 0], [0, 0, 0], false);
  mesh(new THREE.ConeGeometry(r * 2.4, len * 0.38, 14), m, g, [0, len * 0.81, 0], [0, 0, 0], false);
  g.userData.m = m; return g;
}

const nz = (t, k) => Math.sin(t * 1.7 + k) * 0.5 + Math.sin(t * 3.1 + k * 2.3) * 0.3 + Math.sin(t * 5.3 + k * 0.7) * 0.2;
const shake = (t, amp, f = 1) => V3(nz(t * f, 1), nz(t * f, 2), nz(t * f, 3)).multiplyScalar(amp);
const hit = (t, t0, amp) => t < t0 ? 0 : amp * Math.exp(-(t - t0) * 5) * Math.sin((t - t0) * 60);
