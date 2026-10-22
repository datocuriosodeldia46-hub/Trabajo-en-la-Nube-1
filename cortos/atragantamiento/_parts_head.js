<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Te estás ahogando</title>
<style>
  html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }
  canvas { position: absolute; inset: 0; margin: auto; height: 100vh; width: 56.25vh; max-width: 100vw; max-height: 177.78vw; }
</style>
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
} }
</script>
</head>
<body>
<canvas id="c" width="1080" height="1920"></canvas>
<script type="module">
// "Te estás ahogando": a ~43 s vertical short. Every frame is a pure function of time: renderAt(t).
// A family dinner, a piece of meat in the wrong pipe, the throat and lungs in X-ray, and the manoeuvre that saves you.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const Q = new URLSearchParams(location.search);
const SC = +(Q.get('scale') ?? 1);   // 0.5 for quick previews
const W = Math.round(1080 * SC), HGT = Math.round(1920 * SC), FPS = 30;
let SUB = +(Q.get('sub') ?? 1);
const SHUTTER = 0.5;

// ───────────────────────────── utilities ─────────────────────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * u * (u * (u * 6 - 15) + 10); };
const win = (t, a, b, c, d) => ss(a, b, t) * (1 - ss(c, d, t));
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const std = (color, rough = 0.6, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const hdr = (hex, k) => { const c = new THREE.Color(hex); return new THREE.MeshBasicMaterial({ color: new THREE.Color(c.r * k, c.g * k, c.b * k) }); };
const rbox = (w, h, d, r = 0.05, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
function mesh(geo, mat, parent, pos = [0, 0, 0], rot = [0, 0, 0], shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot);
  m.castShadow = shadow; m.receiveShadow = true; if (parent) parent.add(m); return m;
}
function spline(keys) {   // monotone cubic in time per dimension
  const n = keys.length, T = keys.map(k => k[0]), V = keys.map(k => k.slice(1)), D = V[0].length;
  const M = V.map((v, i) => v.map((_, d) => {
    if (i === 0 || i === n - 1) return 0;
    const a = (V[i][d] - V[i - 1][d]) / (T[i] - T[i - 1]), b = (V[i + 1][d] - V[i][d]) / (T[i + 1] - T[i]);
    if (a * b <= 0) return 0;
    return 3 * (T[i + 1] - T[i - 1]) / ((2 * T[i + 1] - T[i] - T[i - 1]) / a + (T[i + 1] + T[i] - 2 * T[i - 1]) / b);
  }));
  return (t) => {
    if (t <= T[0]) return V[0].slice(); if (t >= T[n - 1]) return V[n - 1].slice();
    let i = 0; while (t > T[i + 1]) i++;
    const h = T[i + 1] - T[i], u = (t - T[i]) / h, u2 = u * u, u3 = u2 * u;
    const a = 2 * u3 - 3 * u2 + 1, b = u3 - 2 * u2 + u, c = -2 * u3 + 3 * u2, e = u3 - u2;
    return V[i].map((_, d) => a * V[i][d] + b * h * M[i][d] + c * V[i + 1][d] + e * h * M[i + 1][d]);
  };
}
function canvasTex(w, h, draw, srgb = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// ───────────────────────────── renderer ─────────────────────────────
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, HGT, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / HGT, 0.01, 200);

// ───────────────────────────── the X-ray look ─────────────────────────────
// A Fresnel hologram: bright green rims, faint fill, additive — the signature of the genre.
const XRAY = [];
function xrayMat(strength = 1, color = [0.35, 1.0, 0.62]) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uK: { value: 0 }, uS: { value: strength }, uC: { value: new THREE.Vector3(...color) } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uK, uS; uniform vec3 uC; varying vec3 vN; varying vec3 vV;
      void main(){ float f=1.0-abs(dot(normalize(vN),normalize(vV))); float rim=pow(f,2.2);
        vec3 c=uC*(0.10+1.6*rim)*uS + vec3(0.8,1.0,0.9)*pow(f,7.0)*0.9*uS; gl_FragColor=vec4(c*uK,1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  XRAY.push(m); return m;
}
// Each part keeps its normal look and an X-ray twin that fades in while the "solid" fades out.
const DUAL = [];
function dual(mesh_, strength = 1) {
  const x = new THREE.Mesh(mesh_.geometry, xrayMat(strength)); x.castShadow = false; x.renderOrder = 20;
  mesh_.add(x); DUAL.push({ solid: mesh_, x });
  return mesh_;
}

