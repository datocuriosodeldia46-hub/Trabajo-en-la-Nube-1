import * as THREE from 'three';
import {Easing} from 'remotion';

export const FPS = 30;
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
// Avance suavizado entre los segundos a y b
export const tramo = (s: number, a: number, b: number) => Easing.inOut(Easing.cubic)(clamp01((s - a) / (b - a)));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export type Estado = {x: number; z: number; h: number; lean: number; dir: number; dist: number; v: number};
export type Mando = {v: number; lean: number; dir: number; directo?: number};

// Integra la trayectoria: la inclinación hace girar (física real) y el manubrio aporta un giro directo
export const simular = (dur: number, f: (t: number) => Mando, x0 = 0, z0 = 0, h0 = 0, distEje = 1.4): Estado[] => {
  const n = Math.ceil(dur * FPS) + 2;
  const out: Estado[] = [];
  let x = x0, z = z0, h = h0, d = 0;
  const dt = 1 / FPS;
  for (let i = 0; i < n; i++) {
    const c = f(i * dt);
    out.push({x, z, h, lean: c.lean, dir: c.dir, dist: d, v: c.v});
    const yaw = (-9.8 * Math.tan(c.lean)) / Math.max(c.v, 1) + ((c.v * Math.tan(c.dir)) / distEje) * (c.directo ?? 0.15);
    h += yaw * dt;
    x += Math.sin(h) * c.v * dt;
    z += Math.cos(h) * c.v * dt;
    d += c.v * dt;
  }
  return out;
};

// Remuestrea un camino cada `paso` metros y lo prolonga en línea recta
export const remuestrear = (pts: {x: number; z: number}[], paso = 1, extra = 40) => {
  const out: {x: number; z: number}[] = [pts[0]];
  let acum = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    acum += Math.hypot(b.x - a.x, b.z - a.z);
    if (acum >= paso) { out.push(b); acum = 0; }
  }
  const u = out[out.length - 1], p = out[out.length - 2] ?? out[0];
  const L = Math.hypot(u.x - p.x, u.z - p.z) || 1;
  for (let k = 1; k <= extra; k++) out.push({x: u.x + ((u.x - p.x) / L) * k * paso, z: u.z + ((u.z - p.z) / L) * k * paso});
  return out;
};

// Cinta plana sobre el suelo a lo largo del camino (asfalto, bordes, línea central)
export const cinta = (pts: {x: number; z: number}[], desplaz: number, ancho: number, y = 0.01, discontinua = 0) => {
  const pos: number[] = [], idx: number[] = [];
  const izq = (i: number) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b.x - a.x, tz = b.z - a.z, L = Math.hypot(tx, tz) || 1;
    return {nx: tz / L, nz: -tx / L};
  };
  for (let i = 0; i < pts.length; i++) {
    const {nx, nz} = izq(i), p = pts[i];
    for (const s of [-1, 1]) {
      const o = desplaz + (s * ancho) / 2;
      pos.push(p.x - nx * o, y, p.z - nz * o);
    }
    if (i > 0 && (!discontinua || Math.floor(i / discontinua) % 2 === 0)) {
      const a = (i - 1) * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

export const estadoEn = (sim: Estado[], t: number) => sim[Math.min(sim.length - 1, Math.max(0, Math.round(t * FPS)))];
// Punto en coordenadas de mundo a partir de coordenadas locales de la moto (x lateral, y, z adelante)
// (incluye la inclinación: rotación alrededor del eje longitudinal, apoyada en el suelo)
export const local = (e: Estado, lx: number, ly: number, lz: number): [number, number, number] => {
  const ax = lx * Math.cos(e.lean) - ly * Math.sin(e.lean), ay = lx * Math.sin(e.lean) + ly * Math.cos(e.lean);
  return [e.x + ax * Math.cos(e.h) + lz * Math.sin(e.h), ay, e.z - ax * Math.sin(e.h) + lz * Math.cos(e.h)];
};
