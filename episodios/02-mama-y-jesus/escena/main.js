// Ep02 · "Lucía y Jesús" — personajes y mundo al estilo Sad Monarch (Three.js, determinista).
//   window.vista(nombre, t) → encuadres de la hoja de personajes
//   window.cuadro(t)        → cuadro del episodio en el segundo t (timeline.json)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const qs = new URLSearchParams(location.search);
const W = +(qs.get('w') || 1080), H = +(qs.get('h') || 1920);
const S = W / 1080;
const FUENTE = '"Pixelify", monospace';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const en = (o, x, y, z) => { o.position.set(x, y, z); return o; };

function mat(color, o = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: o.rough ?? 0.7, metalness: 0, flatShading: o.flat ?? false,
    emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1,
    transparent: o.transparent ?? false, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide,
  });
}
function malla(geo, m, sombra = true) { const x = new THREE.Mesh(geo, m); x.castShadow = sombra; x.receiveShadow = true; return x; }
const esfera = (r, color, o = {}) => malla(new THREE.SphereGeometry(r, o.seg ?? 32, o.seg2 ?? 24), o.material || mat(color, o), o.sombra ?? true);
const capsula = (r, l, color, o = {}) => malla(new THREE.CapsuleGeometry(r, l, 8, 16), o.material || mat(color, o));

// ───────────── renderer ─────────────
const glCanvas = document.createElement('canvas');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const salida = document.getElementById('salida'); salida.width = W; salida.height = H;
const ctx = salida.getContext('2d');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#f9d85a');
scene.fog = new THREE.Fog('#f6c55a', 18, 60);
const camera = new THREE.PerspectiveCamera(32, W / H, 0.05, 200);

// ───────────── luz de atardecer (Sad Monarch: cálida, suave, brillante) ─────────────
scene.add(new THREE.HemisphereLight('#fff1c4', '#6f9a3a', 1.35));
const sol = new THREE.DirectionalLight('#ffd9a0', 2.1);
sol.position.set(4, 7, 6); sol.target.position.set(0, 0.6, 0);
sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -4, right: 4, top: 4, bottom: -2, near: 1, far: 30 });
sol.shadow.bias = -0.0006;
scene.add(sol, sol.target);
const contra = new THREE.DirectionalLight('#ff9a5c', 0.9); contra.position.set(-2, 3, -8); scene.add(contra);

// ───────────── mundo ─────────────
function mundo() {
  const g = new THREE.Group();
  const cielo = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; void main(){
      vec3 alto=vec3(0.98,0.86,0.36), bajo=vec3(0.99,0.66,0.33);
      gl_FragColor=vec4(mix(bajo,alto,smoothstep(0.25,0.75,vUv.y)),1.); }`,
    depthWrite: false, fog: false,
  });
  const fondo = new THREE.Mesh(new THREE.PlaneGeometry(160, 60), cielo); en(fondo, 0, 12, -45); g.add(fondo);
  const fondo2 = fondo.clone(); fondo2.position.set(0, 12, 45); fondo2.rotation.y = Math.PI; g.add(fondo2);
  // Sol como disco plano (firma de Sad Monarch)
  const disco = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64), new THREE.MeshBasicMaterial({ color: '#f26b3a', fog: false }));
  en(disco, 1.5, 3.2, -40); g.add(disco);
  const disco2 = disco.clone(); disco2.position.set(-1.2, 3.4, 40); disco2.rotation.y = Math.PI; g.add(disco2);
  // Colinas suaves
  const colina = (x, z, r, h, c) => { const m = malla(new THREE.SphereGeometry(r, 48, 24), mat(c, { rough: 0.95 })); m.scale.set(1, h / r, 1); en(m, x, 0, z); g.add(m); };
  colina(0, 0, 14, 0.9, '#8cc63f');
  colina(-14, -18, 16, 3.5, '#7cb342');
  colina(16, -22, 18, 4.5, '#6fa83b');
  colina(-2, -30, 20, 5.5, '#5f9a35');
  // Pasto de cubos (instanciado) sobre la colina principal
  const n = 5200;
  const cubos = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), mat('#ffffff', { rough: 0.9 }), n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const verdes = ['#a6d94a', '#93c93f', '#b7e05a', '#86bd3a', '#9fd044'];
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(rnd()) * 9, a = rnd() * Math.PI * 2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.9 + 0.5;
    const y = 0.9 * Math.sqrt(Math.max(0, 1 - (x * x + (z) * (z)) / 196)) - 0.02;
    e.set(rnd() * 0.8, rnd() * 3, rnd() * 0.8); q.setFromEuler(e);
    const k = 0.7 + rnd() * 0.9;
    m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(k, k * (0.8 + rnd() * 0.8), k));
    cubos.setMatrixAt(i, m4); cubos.setColorAt(i, c.set(verdes[i % 5]));
  }
  cubos.receiveShadow = true; g.add(cubos);
  // Árbol solitario
  const arbol = new THREE.Group();
  const tronco = malla(new THREE.CylinderGeometry(0.12, 0.18, 2.4, 8), mat('#6b4a2e', { flat: true })); tronco.position.y = 1.2; arbol.add(tronco);
  for (const [x, y, z, r] of [[0, 2.7, 0, 1.0], [-0.6, 2.4, 0.2, 0.7], [0.65, 2.45, -0.1, 0.72], [0.1, 3.2, 0, 0.7]]) {
    const h = malla(new THREE.IcosahedronGeometry(r, 1), mat('#3f7a2e', { flat: true })); en(h, x, y, z); arbol.add(h);
  }
  en(arbol, -3.4, 0.4, -4.5); g.add(arbol);
  return g;
}
scene.add(mundo());

// ───────────── cara fotográfica con mandíbula animada (recurso de Sad Monarch) ─────────────
function materialCara(textura, boca, cx) {
  return new THREE.ShaderMaterial({
    uniforms: { mapa: { value: textura }, abrir: { value: 0 }, luz: { value: 1.0 } },
    transparent: true,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; vec3 p=position; p.z -= 1.1*p.x*p.x; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: `uniform sampler2D mapa; uniform float abrir; uniform float luz; varying vec2 vUv;
      const float BOCA=${boca.toFixed(3)}; const float CX=${cx.toFixed(3)};
      void main(){
        vec2 uv=vUv;
        float peso=smoothstep(0.24,0.36,uv.x)*(1.-smoothstep(0.62,0.74,uv.x));
        float d=abrir*peso; vec4 c;
        if(uv.y<BOCA){
          c=texture2D(mapa, vec2(uv.x, uv.y+d));
          float dentro=1.-smoothstep(0.07,0.12,abs(uv.x-CX));
          float hueco=step(BOCA-d, uv.y)*dentro;
          vec3 bocaColor=mix(vec3(0.12,0.03,0.03), vec3(0.3,0.09,0.08), smoothstep(BOCA-d,BOCA,uv.y));
          c.rgb=mix(c.rgb, bocaColor, hueco*smoothstep(0.0,0.003,d));
        } else { c=texture2D(mapa, uv); }
        c.rgb*=luz; gl_FragColor=c;
        #include <colorspace_fragment>
      }`,
  });
}

// ───────────── bebé Mateo ─────────────
class Bebe {
  constructor() {
    this.g = new THREE.Group();
    const cobija = mat('#a9d6f5', { rough: 0.6 });
    const bulto = esfera(0.15, '', { material: cobija }); bulto.scale.set(1.45, 0.82, 0.85); this.g.add(bulto);
    const capucha = esfera(0.105, '', { material: cobija }); capucha.position.set(0.17, 0.035, -0.03); this.g.add(capucha);
    const pliegue = malla(new THREE.TorusGeometry(0.075, 0.018, 10, 24), mat('#c6e4f8')); pliegue.position.set(0.15, 0.05, 0.09); pliegue.rotation.y = 0.35; pliegue.scale.setScalar(1.3); this.g.add(pliegue);
    // carita dormida, construida mirando a +z
    this.cara = new THREE.Group(); this.cara.position.set(0.15, 0.05, 0.1); this.cara.rotation.y = 0.3; this.cara.scale.setScalar(1.25); this.g.add(this.cara);
    const cabeza = esfera(0.072, '#f6d6c0'); cabeza.scale.set(1, 0.95, 0.9); this.cara.add(cabeza);
    const oscuro = mat('#5a3a2e');
    this.ojos = [-1, 1].map((l) => {
      const o = malla(new THREE.TorusGeometry(0.013, 0.0032, 6, 14, Math.PI), oscuro, false);
      o.position.set(0.026 * l, 0.012, 0.062); o.rotation.z = Math.PI; this.cara.add(o); return o;   // ∪ = ojito cerrado
    });
    for (const l of [-1, 1]) { const m = malla(new THREE.CircleGeometry(0.014, 16), mat('#f5a0a4', { transparent: true, opacity: 0.55 }), false); m.position.set(0.042 * l, -0.012, 0.057); m.rotation.y = 0.5 * l; this.cara.add(m); }
    const boca = malla(new THREE.TorusGeometry(0.009, 0.0026, 6, 12, Math.PI), mat('#b5646a'), false);
    boca.position.set(0, -0.026, 0.065); boca.rotation.z = Math.PI; this.cara.add(boca);
    const nariz = esfera(0.008, '#f3c9b1', { sombra: false }); nariz.position.set(0, -0.006, 0.07); this.cara.add(nariz);
    const rizo = malla(new THREE.TorusGeometry(0.014, 0.004, 6, 12, Math.PI * 1.5), mat('#6b4a3a'), false); rizo.position.set(0, 0.068, 0.02); rizo.rotation.x = -0.6; this.cara.add(rizo);
  }
  pose(t) { this.g.scale.setScalar(1 + Math.sin(t * 2.6) * 0.012); this.cara.rotation.z = Math.sin(t * 0.9) * 0.08; }
}

// ───────────── cara pixel art de Lucía (se redibuja cada cuadro: parpadeo, boca, lágrimas) ─────────────
class CaraPixel {
  constructor(N = 96) {
    this.N = N;
    this.c = document.createElement('canvas'); this.c.width = this.c.height = N;
    this.g = this.c.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.magFilter = THREE.NearestFilter; this.tex.minFilter = THREE.NearestFilter; this.tex.generateMipmaps = false;
  }
  p(x, y, color) { this.g.fillStyle = color; this.g.fillRect(Math.round(x), Math.round(y), 1, 1); }
  elipse(cx, cy, rx, ry, color, filtro) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d <= 1 && (!filtro || filtro(x, y, d))) this.p(x, y, typeof color === 'function' ? color(x, y, d) : color);
      }
  }
  linea(x0, y0, x1, y1, color, grosor = 1) {
    const pasos = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
    for (let i = 0; i <= pasos; i++) {
      const x = lerp(x0, x1, i / pasos), y = lerp(y0, y1, i / pasos);
      for (let k = 0; k < grosor; k++) this.p(x, y + k, color);
    }
  }
  ojo(cx, cy, lado, cierre, llorar, t) {
    const rx = 11, ry = 12;
    if (cierre > 0.93) {                               // ojo cerrado: curva ∪ con pestañas
      for (let x = -rx; x <= rx; x++) {
        const y = cy + 3 + Math.round(3 * (1 - (x / rx) ** 2));
        this.p(cx + x, y, '#2a1712'); this.p(cx + x, y + 1, '#2a1712');
      }
      this.linea(cx + rx * lado, cy + 4, cx + (rx + 3) * lado, cy + 2, '#2a1712', 2);
      return;
    }
    const ix = cx + lado * 1, iy = cy + 2;
    const tapa = (x) => cy - ry + 2 * ry * cierre + (x - cx) * lado * 0.24;    // párpado caído hacia afuera (tristeza)
    this.elipse(cx, cy, rx, ry, (x, y) => {
      if (y < tapa(x)) return y > tapa(x) - 3 ? '#b9819b' : '#d7a2b7';        // párpado malva (como Felix)
      const di = ((x - ix) / 8) ** 2 + ((y - iy) / 9) ** 2;
      if (di <= 1) {
        const dp = ((x - ix) / 4) ** 2 + ((y - iy) / 5) ** 2;
        if (dp <= 1) return '#0e0806';
        if (di > 0.78) return '#24140c';
        return y < iy - 2 ? '#3a2416' : y < iy + 3 ? '#6a4226' : '#a2703e';
      }
      return y > cy + ry - 3 ? '#e8e4dc' : '#fdfcf8';
    });
    // contorno inferior suave y línea de pestañas gruesa sobre el párpado
    this.elipse(cx, cy, rx + 0.6, ry + 0.6, '#7a4c3e', (x, y, d) => d > 0.84 && y > tapa(x) + 1 && y > cy);
    for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
      const y = tapa(x);
      if (((x - cx) / (rx + 1)) ** 2 < 1) { this.p(x, y, '#241410'); this.p(x, y + 1, '#241410'); }
    }
    const ex = cx + (rx + 1) * lado, ey = tapa(ex);
    this.linea(ex, ey, ex + 3 * lado, ey - 2, '#241410', 2);               // rabito de pestaña (esquina exterior)
    this.linea(ex - 3 * lado, ey - 1, ex + 1 * lado, ey - 4, '#241410', 1);
    // brillos
    const b1y = iy - 4, b2y = iy + 3;
    if (b1y > tapa(ix - 3) + 1) this.elipse(ix - 3, b1y, 1.6, 1.6, '#ffffff');
    if (b2y > tapa(ix + 3)) this.elipse(ix + 3, b2y, 0.9, 0.9, '#ffffff');
    // ojos llorosos: agua en la línea inferior
    if (llorar > 0.25) {
      this.elipse(cx, cy, rx, ry, (x) => ((x + Math.floor(t * 6)) % 5 === 0 ? '#ffffff' : '#bfe7ff'), (x, y, d) => d > 0.62 && y > cy + ry * 0.55);
    }
  }
  dibujar({ cierre = 0.45, apertura = 0, llorar = 0, t = 0 }) {
    const g = this.g, N = this.N;
    g.clearRect(0, 0, N, N);
    // rubor con tramado (pixel art)
    g.globalAlpha = 0.8;
    for (const cx of [20, 76]) this.elipse(cx, 67, 8, 4.2, '#f39aa1', (x, y, d) => d < 0.35 || (x + y) % 2 === 0);
    g.globalAlpha = 1;
    for (const [x, y] of [[39, 63], [42, 65], [54, 65], [57, 63], [36, 65], [60, 65]]) this.p(x, y, '#d69a7e');   // pecas
    // cejas tristes: el extremo interior sube
    const sube = Math.round(llorar * 2);
    this.linea(20, 36, 39, 31 - sube, '#3a2320', 2);
    this.linea(76, 36, 57, 31 - sube, '#3a2320', 2);
    this.linea(22, 35, 37, 31 - sube, '#5a3a30', 1);
    this.linea(74, 35, 59, 31 - sube, '#5a3a30', 1);
    this.ojo(30, 51, -1, cierre, llorar, t);
    this.ojo(66, 51, 1, cierre, llorar, t);
    // nariz
    this.p(46, 66, '#c98a70'); this.p(50, 66, '#c98a70'); this.p(47, 65, '#e0a88d'); this.p(48, 65, '#e0a88d'); this.p(49, 65, '#e0a88d'); this.p(48, 62, '#fde8da');
    // boca
    const cx = 48, cy = 77;
    if (apertura < 0.15) {
      for (let x = -7; x <= 7; x++) {
        const y = cy - Math.round(2.2 * (1 - (x / 7) ** 2));    // puchero: comisuras hacia abajo
        this.p(cx + x, y, '#7d2f3a'); this.p(cx + x, y + 1, '#c7646d');
      }
    } else {
      const rx = 5 + apertura * 2.2, ry = 1.6 + apertura * 4.6;
      this.elipse(cx, cy, rx + 1, ry + 1, '#8e3b45', (x, y) => y >= cy - ry * 0.6 - 1);
      this.elipse(cx, cy, rx, ry, (x, y) => (y > cy + ry * 0.45 ? '#c25560' : '#3d0f14'), (x, y) => y >= cy - ry * 0.6);
      if (apertura > 0.5) for (let x = -3; x <= 3; x++) this.p(cx + x, Math.ceil(cy - ry * 0.6), '#f4efe8');
    }
    // lágrimas que corren por las mejillas
    if (llorar > 0.05) {
      g.globalAlpha = clamp(llorar * 1.2);
      for (const [x0, lado, fase] of [[21, -1, 0], [75, 1, 11]]) {
        const largo = Math.min(30, 8 + ((t * 20 + fase) % 36));
        for (let k = 0; k < largo; k++) {
          const x = x0 + lado * Math.round(k * 0.12), y = 60 + k;
          this.p(x, y, '#9fd6ff'); this.p(x + 1, y, k % 3 ? '#9fd6ff' : '#e6f7ff');
        }
        const gy = 60 + ((t * 26 + fase * 2) % 30), gx = x0 + lado * Math.round((gy - 60) * 0.12);
        this.elipse(gx + 0.5, gy, 1.8, 2.4, '#8fcffb'); this.p(gx, gy - 1, '#ffffff');
      }
      g.globalAlpha = 1;
    }
    this.tex.needsUpdate = true;
  }
}

// ───────────── Lucía (proxy tierno, estilo Felix) ─────────────
class Lucia {
  constructor(variante = 'bebe') {
    this.variante = variante;
    this.g = new THREE.Group();
    const piel = mat('#f6d2b8', { rough: 0.6 }), vestido = mat('#9d87cf', { rough: 0.75 }), pelo = mat('#3a2320', { rough: 0.55 });
    const parpado = mat('#eab3bf', { rough: 0.55 });
    // piernas y zapatos
    for (const x of [-0.075, 0.075]) {
      const p = capsula(0.05, 0.12, '', { material: piel }); p.position.set(x, 0.12, 0); this.g.add(p);
      const z = malla(new RoundedBoxGeometry(0.1, 0.06, 0.15, 3, 0.025), mat('#6b4b8a')); z.position.set(x, 0.03, 0.025); this.g.add(z);
    }
    // vestido (torno)
    const perfil = [[0.001, 0.17], [0.3, 0.19], [0.28, 0.32], [0.22, 0.55], [0.19, 0.75], [0.17, 0.88], [0.12, 0.95], [0.001, 0.97]].map(([r, y]) => new THREE.Vector2(r, y));
    this.cuerpo = new THREE.Group(); this.g.add(this.cuerpo);
    const traje = malla(new THREE.LatheGeometry(perfil, 40), vestido); this.cuerpo.add(traje);
    if (variante === 'embarazada') { const panza = esfera(0.19, '', { material: vestido }); panza.position.set(0, 0.52, 0.13); panza.scale.set(1, 1.05, 0.95); this.cuerpo.add(panza); }
    const cuello = malla(new THREE.TorusGeometry(0.075, 0.022, 10, 24), mat('#f6f0e6')); cuello.position.y = 0.94; cuello.rotation.x = Math.PI / 2; this.cuerpo.add(cuello);
    const cuelloPiel = capsula(0.045, 0.05, '', { material: piel }); cuelloPiel.position.y = 0.99; this.cuerpo.add(cuelloPiel);
    // brazos: hombro → codo → mano
    this.brazos = [-1, 1].map((l) => {
      const hombro = new THREE.Group(); hombro.position.set(0.17 * l, 0.87, 0);
      const sup = capsula(0.048, 0.14, '', { material: vestido }); sup.position.y = -0.1; hombro.add(sup);
      const codo = new THREE.Group(); codo.position.y = -0.2; hombro.add(codo);
      const ant = capsula(0.04, 0.13, '', { material: piel }); ant.position.y = -0.09; codo.add(ant);
      const mano = esfera(0.045, '', { material: piel }); mano.position.y = -0.2; codo.add(mano);
      hombro.userData = { codo, lado: l }; this.cuerpo.add(hombro); return hombro;
    });
    // cabeza
    this.cabeza = new THREE.Group(); this.cabeza.position.y = 1.2; this.cuerpo.add(this.cabeza);
    const craneo = esfera(0.25, '', { material: piel }); craneo.scale.set(1, 0.96, 0.95); this.cabeza.add(craneo);
    for (const l of [-1, 1]) { const o = esfera(0.045, '', { material: piel }); o.position.set(0.245 * l, -0.01, -0.01); this.cabeza.add(o); }
    // pelo: casquete, flequillo, mechones y chongo despeinado (mamá cansada)
    const casco = malla(new THREE.SphereGeometry(0.265, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.56), pelo); casco.position.set(0, 0.035, -0.04); casco.rotation.x = -0.16; this.cabeza.add(casco);
    const nuca = esfera(0.255, '', { material: pelo }); nuca.position.set(0, 0.0, -0.06); nuca.scale.set(1.02, 1, 0.9); this.cabeza.add(nuca);
    for (const [x, y, z, sx, rz] of [[-0.14, 0.215, 0.11, 1.2, 0.6], [0.03, 0.245, 0.11, 1.4, -0.1], [0.16, 0.205, 0.1, 1.1, -0.7]]) {
      const f = esfera(0.075, '', { material: pelo }); f.position.set(x, y, z); f.scale.set(sx, 0.55, 0.7); f.rotation.z = rz; this.cabeza.add(f);
    }
    for (const l of [-1, 1]) { const m = capsula(0.04, 0.14, '', { material: pelo }); m.position.set(0.215 * l, -0.06, 0.03); m.scale.set(1, 1, 0.6); m.rotation.z = 0.12 * l; this.cabeza.add(m); }
    const chongo = esfera(0.105, '', { material: pelo }); chongo.position.set(0.03, 0.29, -0.07); this.cabeza.add(chongo);
    const liga = malla(new THREE.TorusGeometry(0.07, 0.016, 8, 20), mat('#f08fb0')); liga.position.set(0.03, 0.235, -0.07); liga.rotation.x = Math.PI / 2 - 0.3; this.cabeza.add(liga);
    // cara pixel art pegada a la curva de la cabeza
    this.caraPixel = new CaraPixel(96);
    const R = 0.2535, geo = new THREE.PlaneGeometry(0.44, 0.44, 32, 32), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, Math.sqrt(Math.max(0, R * R - x * x - y * y))); }
    geo.computeVertexNormals();
    const caraMat = new THREE.MeshStandardMaterial({ map: this.caraPixel.tex, transparent: true, depthWrite: false, roughness: 0.6, alphaTest: 0.01 });
    const cara = new THREE.Mesh(geo, caraMat); cara.renderOrder = 3;
    const soporte = new THREE.Group(); soporte.scale.set(1, 0.96, 0.95); soporte.position.y = -0.005; soporte.add(cara); this.cabeza.add(soporte);
    const nariz = esfera(0.011, '', { material: piel, sombra: false }); nariz.position.set(0, -0.058, 0.233); this.cabeza.add(nariz);
    if (variante === 'bebe') { this.bebe = new Bebe(); this.bebe.g.position.set(0.02, 0.66, 0.2); this.bebe.g.rotation.set(0, -0.1, 0.32); this.cuerpo.add(this.bebe.g); }
  }
  pose({ t = 0, llorar = 0, hablar = 0, girar = 0, cabeceo = 0, sollozo = 0, secarse = 0 }) {
    const respiro = Math.sin(t * 1.8);
    const hipo = llorar * Math.max(0, Math.sin(t * 7.5)) * 0.5;                 // sollozos
    this.cuerpo.position.y = respiro * 0.004 + hipo * 0.006;
    this.cuerpo.scale.set(1, 1 + respiro * 0.01, 1);
    this.cabeza.rotation.set(cabeceo + 0.1 * llorar + hablar * Math.sin(t * 8) * 0.05, girar + Math.sin(t * 0.6) * 0.04, Math.sin(t * 0.8) * 0.05 + hablar * Math.sin(t * 4) * 0.04);
    // cara: párpados caídos por la tristeza, parpadeo, boca con la voz, sollozos y lágrimas
    const parpadeo = ((t + 0.7) % 3.3) < 0.12;
    this.caraPixel.dibujar({ cierre: parpadeo ? 1 : 0.4 + llorar * 0.14, apertura: clamp(hablar + hipo * 0.35), llorar, t });
    // brazos
    const [bi, bd] = this.brazos;
    if (this.variante === 'bebe') {
      // arrullo: los dos brazos sostienen al bebé y lo mecen
      const mece = Math.sin(t * 1.6) * 0.06;
      bi.rotation.set(-0.75, 0.35, -0.2); bi.userData.codo.rotation.set(-1.45, 0, 0.5);
      bd.rotation.set(-0.55, -0.2, 0.3 - secarse * 0.2); bd.userData.codo.rotation.set(-0.95 - secarse * 0.8, 0, -0.75);
      this.bebe.g.rotation.z = 0.32 + mece; this.bebe.pose(t);
      if (secarse) { bd.rotation.x = lerp(-0.55, -2.3, secarse); bd.userData.codo.rotation.x = lerp(-0.95, -2.0, secarse); }
    } else {
      // embarazada: mano sobre la panza; la otra se seca las lágrimas
      bi.rotation.set(-0.55, 0.2, -0.15); bi.userData.codo.rotation.set(-1.1, 0, 0.9);
      bd.rotation.set(lerp(-0.2, -2.25, secarse), 0, lerp(0.15, 0.25, secarse)); bd.userData.codo.rotation.set(lerp(-0.3, -2.1, secarse), 0, 0);
    }
  }
}

// ───────────── Jesús (cara fotográfica sobre cuerpo simple) ─────────────
class Jesus {
  constructor(texCara) {
    this.g = new THREE.Group();
    const tunica = mat('#f1ece0', { rough: 0.8 }), piel = mat('#b8795a', { rough: 0.6 }), pelo = mat('#2d201a', { rough: 0.6, flat: true });
    for (const x of [-0.08, 0.08]) { const s = malla(new RoundedBoxGeometry(0.1, 0.05, 0.19, 3, 0.02), mat('#7a5634')); s.position.set(x, 0.025, 0.08); this.g.add(s); const pie = esfera(0.045, '', { material: piel }); pie.position.set(x, 0.05, 0.1); pie.scale.set(1, 0.6, 1.4); this.g.add(pie); }
    const perfil = [[0.001, 0.04], [0.28, 0.05], [0.27, 0.3], [0.22, 0.8], [0.2, 1.2], [0.19, 1.32], [0.14, 1.4], [0.06, 1.44], [0.001, 1.45]].map(([r, y]) => new THREE.Vector2(r, y));
    this.cuerpo = new THREE.Group(); this.g.add(this.cuerpo);
    this.cuerpo.add(malla(new THREE.LatheGeometry(perfil, 40), tunica));
    const cinto = malla(new THREE.TorusGeometry(0.205, 0.018, 8, 32), mat('#d9c9a8')); cinto.rotation.x = Math.PI / 2; cinto.position.y = 0.86; this.cuerpo.add(cinto);
    const cuello = capsula(0.06, 0.07, '', { material: piel }); cuello.position.y = 1.48; this.cuerpo.add(cuello);
    this.brazos = [-1, 1].map((l) => {
      const hombro = new THREE.Group(); hombro.position.set(0.2 * l, 1.33, 0);
      const manga = malla(new THREE.CylinderGeometry(0.06, 0.1, 0.34, 16), tunica); manga.position.y = -0.17; hombro.add(manga);
      const codo = new THREE.Group(); codo.position.y = -0.32; hombro.add(codo);
      const manga2 = malla(new THREE.CylinderGeometry(0.075, 0.1, 0.28, 16), tunica); manga2.position.y = -0.13; codo.add(manga2);
      const mano = esfera(0.052, '', { material: piel }); mano.position.y = -0.3; mano.scale.set(0.9, 1.2, 0.7); codo.add(mano);
      hombro.userData = { codo, lado: l }; this.cuerpo.add(hombro); return hombro;
    });
    this.cabeza = new THREE.Group(); this.cabeza.position.y = 1.52; this.cuerpo.add(this.cabeza);
    const craneo = malla(new THREE.IcosahedronGeometry(0.2, 1), pelo); craneo.scale.set(1.05, 1.18, 1.0); craneo.position.set(0, 0.16, -0.04); this.cabeza.add(craneo);
    const melena = malla(new THREE.IcosahedronGeometry(0.2, 1), pelo); melena.scale.set(1.15, 1.2, 0.6); melena.position.set(0, -0.02, -0.12); this.cabeza.add(melena);
    for (const l of [-1, 1]) { const m = malla(new THREE.IcosahedronGeometry(0.09, 0), pelo); m.scale.set(0.8, 1.9, 0.9); m.position.set(0.17 * l, -0.05, -0.02); this.cabeza.add(m); }
    const mandibula = esfera(0.14, '', { material: mat('#7a4a32', { rough: 0.8 }) }); mandibula.position.set(0, 0.03, 0.03); mandibula.scale.set(1, 1.05, 0.8); this.cabeza.add(mandibula);
    this.cara = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.418, 20, 20), materialCara(texCara, 1 - 0.734, 0.481));
    this.cara.position.set(0, 0.13, 0.18); this.cara.renderOrder = 2; this.cabeza.add(this.cara);
  }
  pose({ t = 0, hablar = 0, girar = 0, cabeceo = 0, gesto = 'reposo', abrazar = 0, senalar = 0 }) {
    this.cuerpo.rotation.z = Math.sin(t * 0.7) * 0.012;
    this.cabeza.rotation.set(cabeceo + hablar * Math.sin(t * 6) * 0.03, girar, Math.sin(t * 0.5) * 0.025);
    const [bi, bd] = this.brazos;
    if (gesto === 'espalda') {        // manos atrás, como en la apertura de Sad Monarch
      bi.rotation.set(0.45, 0, -0.18); bi.userData.codo.rotation.set(0.3, 0, 1.2);
      bd.rotation.set(0.45, 0, 0.18); bd.userData.codo.rotation.set(0.3, 0, -1.2);
    } else {
      bi.rotation.set(-0.1 - hablar * 0.3 * (0.5 + 0.5 * Math.sin(t * 3)) * (1 - abrazar) - abrazar * 0.25, 0, -0.1 - abrazar * 0.75); bi.userData.codo.rotation.set(-0.3 - hablar * 0.5 * (1 - abrazar) - abrazar * 0.05, 0, abrazar * 0.45);
      bd.rotation.set(lerp(-0.1, -2.7, senalar), 0, lerp(0.1, 0.2, senalar)); bd.userData.codo.rotation.set(lerp(-0.25, -0.2, senalar), 0, 0);
    }
    this.cara.material.uniforms.abrir.value = hablar * 0.045;
  }
}

// ───────────── subtítulos estilo Sad Monarch (pixel, blanco con contorno negro) ─────────────
function texto(txt, x, y, tam, color = '#ffffff') {
  ctx.font = `${tam}px ${FUENTE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = tam * 0.22; ctx.strokeStyle = '#000';
  ctx.strokeText(txt, x, y); ctx.fillStyle = color; ctx.fillText(txt, x, y);
}

// ───────────── montaje ─────────────
let lucia, luciaE, jesus;
const POS = { lucia: [-0.42, 0.88, 0.6], jesus: [0.45, 0.9, 0.35] };

const VISTAS = {
  // [posición cámara, mira a, fov]
  lucia_frente: [[-0.42, 1.72, 3.7], [-0.42, 1.62, 0.6], 34],
  lucia_34: [[-1.9, 1.75, 3.3], [-0.42, 1.62, 0.6], 34],
  lucia_perfil: [[1.9, 1.55, 0.7], [-0.42, 1.45, 0.6], 34],
  lucia_llanto: [[-0.42, 2.1, 2.05], [-0.42, 2.02, 0.6], 30],
  bebe: [[-0.2, 1.72, 1.75], [-0.33, 1.58, 0.8], 30],
  embarazada_frente: [[2.4, 1.72, 3.7], [2.4, 1.62, 0.6], 34],
  jesus_frente: [[0.45, 1.95, 3.9], [0.45, 1.8, 0.35], 34],
  jesus_primer_plano: [[0.45, 2.58, 1.6], [0.45, 2.55, 0.35], 30],
  dos_espaldas: [[0.1, 1.9, -3.4], [0.0, 1.5, 3.0], 40],
  dos_frente: [[0.0, 1.75, 4.8], [0.0, 1.45, 0.4], 38],
};
function ubicar(vista) {
  const [p, m, f] = VISTAS[vista];
  camera.position.set(...p); camera.lookAt(...m); camera.fov = f; camera.updateProjectionMatrix();
}
function animar(t, estado) {
  lucia.pose({ t, ...estado.lucia });
  luciaE.pose({ t, llorar: 0.6, secarse: 0.5 + 0.5 * Math.sin(t * 1.2) });
  jesus.pose({ t, ...estado.jesus });
}
window.vista = (nombre, t = 1.0) => {
  luciaE.g.visible = true;
  const espalda = nombre === 'dos_espaldas';
  // para la hoja: Lucía mira al frente, llorando; Jesús en reposo (o de espaldas con manos atrás)
  lucia.g.rotation.y = espalda ? 0.25 : 0; jesus.g.rotation.y = espalda ? -0.25 : -0.15;
  animar(t, { lucia: { llorar: nombre === 'lucia_frente' ? 0.2 : 0.9, hablar: 0 }, jesus: { gesto: espalda ? 'espalda' : 'reposo' } });
  ubicar(nombre); renderer.render(scene, camera);
  ctx.drawImage(glCanvas, 0, 0);
};
// ───────────── episodio: todo sale de timeline.json (voces, tiempos y envolventes) ─────────────
let TL = null, M = {}, LIN = {};
const serie = (claves, t) => {              // interpolación lineal de claves [[t, v], ...]
  if (t <= claves[0][0]) return claves[0][1];
  for (let i = 1; i < claves.length; i++) {
    const [t1, v1] = claves[i];
    if (t <= t1) { const [t0, v0] = claves[i - 1]; return lerp(v0, v1, smooth(t0, t1, t)); }
  }
  return claves[claves.length - 1][1];
};
function habla(quien, t) {                  // envolvente de la voz activa de ese personaje (boca)
  for (const l of TL.lineas) {
    if (l.who !== quien || t < l.start - 0.05 || t > l.end + 0.05) continue;
    const f = (t - l.start) * TL.fps, i = Math.floor(f);
    const a = l.env[clamp(i, 0, l.env.length - 1)] ?? 0, b = l.env[clamp(i + 1, 0, l.env.length - 1)] ?? 0;
    return clamp(lerp(a, b, f - i) * 1.05);
  }
  return 0;
}
function linea(t) {                           // subtítulo visible: desde el inicio de la línea hasta la siguiente
  let s = null;
  for (const l of TL.lineas) if (t >= l.start - 0.05 && t < l.end + 0.45) s = l;
  return s;
}
const orbita = (centro, ang, d, alto, mira = 0) => [[centro[0] + Math.sin(ang) * d, centro[1] + alto, centro[2] + Math.cos(ang) * d], [centro[0], centro[1] + mira, centro[2]]];
const CL = () => [lucia.g.position.x, 1.9, lucia.g.position.z], CJ = () => [jesus.g.position.x, 2.35, jesus.g.position.z];
// cámaras: cada una devuelve [posición, mira, fov] según u ∈ [0,1] del plano (acercamiento sutil de ~8%)
const CAM = {
  espaldas: (u) => { const d = lerp(1, 0.93, u); return [[0.15 * d, lerp(2.15, 2.1, u), -4.9 * d + 0.45], [0, 1.72, 3.0], 38]; },
  lucia: (u) => [...orbita(CL(), 0.38, lerp(3.0, 2.75, u), 0.08, 0.0), 30],
  lucia_cerca: (u) => [...orbita(CL(), 0.34, lerp(2.45, 2.2, u), 0.1, 0.02), 30],
  bebe: (u) => [[lerp(-0.08, -0.12, u), 2.2, lerp(2.6, 2.4, u)], [-0.36, 1.84, 0.7], 30],
  jesus: (u) => [...orbita(CJ(), -0.32, lerp(2.35, 2.15, u), 0.05, 0.0), 30],
  jesus_camara: (u) => [...orbita(CJ(), -0.32, lerp(2.3, 1.8, easeInOut(u)), 0.05, 0.02), 30],
  dos: (u) => [[lerp(0.05, 0.02, u), 2.0, lerp(5.8, 5.3, u)], [0.0, 1.75, 0.45], 36],
  orbita: (u) => { const a = easeInOut(u) * Math.PI * 2; return [...orbita([0.0, 1.72, 0.47], a, 4.4, 0.35, 0.0), 38]; },
};
let PLANOS = [];
function armarPlanos() {
  const c = (id, d = 0.12) => M[id] - d;   // corte un poco antes de que empiece a hablar
  PLANOS = [
    { t0: 0, cam: 'espaldas' },                          // L01 "Jesús…" / L02 "¿Sí, hija?"
    { t0: c('L03'), cam: 'lucia_cerca' },                // ¿Por qué se fue?
    { t0: c('L04'), cam: 'jesus' },                      // ¿Qué es lo que más te duele?
    { t0: c('L05'), cam: 'lucia' },                      // Que me dejó sola…
    { t0: c('L06'), cam: 'bebe' },                       // que Mateo no lo va a conocer…
    { t0: c('L07'), cam: 'lucia_cerca' },                // y que a lo mejor… fue mi culpa.
    { t0: c('L08', 0.5), cam: 'dos' },                   // Hija mía… mírame.
    { t0: c('L09', 0.2), cam: 'orbita', t1: M.L09 + 3.6 }, // Él decidió irse. Tú decidiste quedarte. (360°)
    { t0: c('L10'), cam: 'jesus' },                      // Eso no habla de lo que te falta…
    { t0: c('L11'), cam: 'lucia' },                      // Pero no sé si puedo sola…
    { t0: c('L12'), cam: 'jesus' },                      // ¿Puede una madre olvidarse…?
    { t0: c('L13', 0.3), cam: 'bebe' },                  // No…
    { t0: c('L14'), cam: 'dos' },                        // …yo nunca me olvidaré de ti.
    { t0: c('L15', 0.35), cam: 'jesus_camara' },         // No estás sola. Yo me quedo. (a cámara)
    { t0: c('L16', 0.45), cam: 'espaldas' },             // Gracias, Jesús. → loop
  ];
  PLANOS.forEach((p, i) => { p.t1 = p.t1 ?? (PLANOS[i + 1]?.t0 ?? TL.duracion); });
  for (let i = 1; i < PLANOS.length; i++) PLANOS[i].t0 = Math.max(PLANOS[i].t0, PLANOS[i - 1].t1 ?? 0);
}
function estado(t) {
  const fin = TL.duracion;
  // intensidad del llanto: sube con la regla de tres, se calma con las palabras de Jesús
  const llorar = serie([[0, 0.45], [M.L03, 1], [M.L05, 0.85], [M.L07, 1], [M.L08 + 0.5, 0.8], [M.L10, 0.55], [M.L11, 0.7], [M.L12, 0.55], [M.L14 + 1, 0.35], [M.L16, 0.2], [fin, 0.15]], t);
  // Lucía: mira hacia Jesús; baja la cabeza al bebé cuando lo nombra; levanta la mirada en "mírame"
  const aJesus = serie([[0, 0], [M.L01 - 0.3, 0.45], [M.L02 + 0.6, 0.25], [M.L03, 0.2]], t);
  const alBebe = serie([[M.L06 - 0.4, 0], [M.L06, 1], [M.L07 - 0.1, 0.3], [M.L08, 0.5], [M.L08 + 0.8, 0], [M.L12 + 1.2, 0], [M.L13 - 0.2, 1], [M.L13 + 1.0, 0.8], [M.L14, 0]], t);
  const secarse = Math.max(serie([[M.L10 + 1.5, 0], [M.L10 + 2.2, 1], [M.L11 - 0.2, 1], [M.L11 + 0.3, 0]], t), 0);
  const abrazo = serie([[M.L14 - 0.4, 0], [M.L14 + 1.0, 1], [M.L15 - 0.3, 0.2], [M.L16 - 0.5, 1], [fin, 1]], t);
  const aCamara = serie([[M.L15 - 0.5, 0], [M.L15, 1], [M.L16 - 0.6, 1], [M.L16 - 0.2, 0]], t);
  const giraJ = serie([[0, 0], [M.L02 - 0.4, -0.35], [M.L02 + 0.8, -0.1], [M.L03, -0.2]], t);
  return {
    lucia: { llorar, hablar: habla('lucia', t), girar: 0.2 + aJesus - alBebe * 0.25, cabeceo: 0.08 + alBebe * 0.28 - (1 - llorar) * 0.04, secarse },
    jesus: { hablar: habla('jesus', t), girar: lerp(giraJ, 0.02, aCamara), cabeceo: 0.06 * (1 - aCamara), abrazar: abrazo },
    abrazo,
  };
}
window.cuadro = (t) => {
  const p = PLANOS.find((d) => t >= d.t0 && t < d.t1) || PLANOS[PLANOS.length - 1];
  const e = estado(t);
  const espalda = p.cam === 'espaldas';
  luciaE.g.visible = false;                                          // la variante embarazada es para otros episodios
  // de espaldas los dos miran el atardecer (como la apertura del dinosaurio); luego se voltean a verse
  lucia.g.rotation.y = espalda ? 0.25 : 0.3;
  jesus.g.rotation.y = espalda ? -0.25 : -0.3;
  jesus.g.position.x = lerp(POS.jesus[0], 0.3, e.abrazo);          // se acerca para abrazarla
  lucia.pose({ t, ...e.lucia });
  jesus.pose({ t, ...e.jesus, gesto: espalda && e.abrazo < 0.5 ? 'espalda' : 'reposo' });
  const [pos, mira, fov] = CAM[p.cam](clamp((t - p.t0) / (p.t1 - p.t0)));
  camera.position.set(...pos); camera.lookAt(...mira); camera.fov = fov; camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  ctx.drawImage(glCanvas, 0, 0);
  // subtítulo pixel (blanco con contorno negro), en dos renglones si no cabe
  const l = linea(t);
  if (l) {
    const tam = 78 * S; ctx.font = `${tam}px ${FUENTE}`;
    const palabras = l.sub.split(' '), renglones = [''];
    for (const w of palabras) {
      const prueba = (renglones[renglones.length - 1] + ' ' + w).trim();
      if (ctx.measureText(prueba).width > W * 0.8 && renglones[renglones.length - 1]) renglones.push(w); else renglones[renglones.length - 1] = prueba;
    }
    const y0 = H * 0.66 - (renglones.length - 1) * tam * 0.6;
    renglones.forEach((r, i) => texto(r, W / 2, y0 + i * tam * 1.2, tam));
  }
};

async function preparar() {
  try {
    const f = new FontFace('Pixelify', 'url(/node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-400-normal.woff2)');
    document.fonts.add(await f.load());
  } catch (e) { console.warn(e); }
  const tex = await new THREE.TextureLoader().loadAsync('/assets/jesus_cara.png'); tex.colorSpace = THREE.SRGBColorSpace;
  lucia = new Lucia('bebe'); en(lucia.g, ...POS.lucia); scene.add(lucia.g);
  luciaE = new Lucia('embarazada'); en(luciaE.g, 2.4, 0.88, 0.6); scene.add(luciaE.g);
  jesus = new Jesus(tex); en(jesus.g, ...POS.jesus); scene.add(jesus.g);
  TL = await (await fetch('/timeline.json')).json();
  for (const l of TL.lineas) { M[l.id] = l.start; LIN[l.id] = l; }
  armarPlanos();
  window.duracion = TL.duracion;
  window.cuadro(0);
  window.listo = true;
}
preparar();
