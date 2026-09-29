// Ep01 · "Mamá, estoy en problemas" — escena Three.js determinista.
// window.cuadro(t) dibuja el cuadro del segundo t (cámara, animación y subtítulos
// salen del timeline.json), para renderizar cuadro por cuadro sin depender del reloj.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const qs = new URLSearchParams(location.search);
const W = +(qs.get('w') || 1080);
const H = +(qs.get('h') || 1920);
const S = W / 1080; // escala de la interfaz 2D
const PX = +(qs.get('px') || 3); // factor de pixelado (como la referencia)
const FUENTE = '"Pixelify", monospace';

// ───────────────────────── utilidades ─────────────────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const pop = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2)); // entrada con rebote

function mat(color, o = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0,
    flatShading: o.flat ?? true, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1,
    transparent: o.transparent ?? false, opacity: o.opacity ?? 1,
  });
}
function caja(w, h, d, color, o = {}) {
  const g = o.r ? new RoundedBoxGeometry(w, h, d, 3, o.r) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(g, o.material || mat(color, o));
  m.castShadow = o.sombra ?? true;
  m.receiveShadow = true;
  return m;
}
function en(obj, x, y, z) { obj.position.set(x, y, z); return obj; }

// ───────────────────────── renderer ─────────────────────────
const glCanvas = document.createElement('canvas');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(Math.round(W / PX), Math.round(H / PX), false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const salida = document.getElementById('salida');
salida.width = W; salida.height = H;
const ctx = salida.getContext('2d');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#161a3a');
const camera = new THREE.PerspectiveCamera(34, W / H, 0.05, 200);

// ───────────────────────── luces ─────────────────────────
scene.add(new THREE.HemisphereLight('#9fb0ff', '#5a3a30', 1.25));
const luna = new THREE.DirectionalLight('#aebcff', 1.5);
luna.position.set(-2.5, 6, 9);
luna.target.position.set(0, 0.6, 0);
luna.castShadow = true;
luna.shadow.mapSize.set(2048, 2048);
Object.assign(luna.shadow.camera, { left: -6, right: 6, top: 6, bottom: -3, near: 1, far: 25 });
luna.shadow.bias = -0.0008;
scene.add(luna, luna.target);
const lampara = new THREE.PointLight('#ffb25e', 14, 9, 1.6);
lampara.position.set(-2.7, 1.9, -1.55);
scene.add(lampara);
const relleno = new THREE.PointLight('#ffd6a8', 10, 8, 1.6); // luz cálida frontal (como el "sol" de Sad Monarch)
relleno.position.set(0.6, 2.4, 2.6);
scene.add(relleno);
const luzTel = new THREE.PointLight('#bfe6ff', 0, 2.2, 2);
scene.add(luzTel);
const luzPuerta = new THREE.PointLight('#ffcf7a', 0, 5, 1.5);
luzPuerta.position.set(2.6, 3.4, -1.7);
scene.add(luzPuerta);

// ───────────────────────── texturas procedurales ─────────────────────────
function texturaCanvas(w, h, dibujar) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}
const texPiso = texturaCanvas(512, 512, (g, w, h) => {
  const tonos = ['#8a5a3c', '#94623f', '#7f5236', '#9a6844'];
  for (let i = 0; i < 8; i++) { g.fillStyle = tonos[i % 4]; g.fillRect(0, i * h / 8, w, h / 8 - 3); }
  g.fillStyle = '#5e3b27'; for (let i = 0; i < 8; i++) g.fillRect(0, i * h / 8 + h / 8 - 3, w, 3);
});
texPiso.wrapS = texPiso.wrapT = THREE.RepeatWrapping; texPiso.repeat.set(3, 3);

// ───────────────────────── cielo por la ventana ─────────────────────────
function cielo() {
  const g = new THREE.Group();
  const shader = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv;
      void main(){
        vec3 alto=vec3(0.16,0.17,0.46), medio=vec3(0.55,0.25,0.55), bajo=vec3(0.93,0.47,0.45);
        float y=floor(vUv.y*48.)/48.;   // bandas escalonadas, como cielo de videojuego
        vec3 c=mix(bajo,medio,smoothstep(0.2,0.5,y)); c=mix(c,alto,smoothstep(0.5,0.92,y));
        gl_FragColor=vec4(c,1.);
      }`,
    depthWrite: false,
  });
  const fondo = new THREE.Mesh(new THREE.PlaneGeometry(60, 26), shader);
  en(fondo, 0, 6, 16); fondo.rotation.y = Math.PI; g.add(fondo);
  const basico = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o });
  const lunaDisco = new THREE.Mesh(new THREE.CircleGeometry(1.0, 24), basico('#fbe98a'));
  en(lunaDisco, -1.6, 4.9, 15.8); lunaDisco.rotation.y = Math.PI; g.add(lunaDisco);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(1.7, 24), basico('#ffd79a', 0.18));
  en(halo, -1.6, 4.9, 15.85); halo.rotation.y = Math.PI; g.add(halo);
  // Nubes pixeladas: bloques morados con borde inferior iluminado
  let s = 5;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 11; i++) {
    const nube = new THREE.Group();
    const cx = lerp(-12, 12, rnd()), cy = lerp(3.8, 10, rnd()), ancho = lerp(1.6, 4.5, rnd());
    for (let k = 0; k < 5; k++) {
      const w = ancho * lerp(0.35, 0.8, rnd()), h = lerp(0.25, 0.6, rnd());
      const x = cx + lerp(-ancho / 2, ancho / 2, rnd()), y = cy + lerp(-0.3, 0.3, rnd());
      const base = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basico('#5b4596'));
      en(base, x, y, 15.6); base.rotation.y = Math.PI; nube.add(base);
      const luz = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, h * 0.35), basico('#f59f6c'));
      en(luz, x + 0.1, y - h * 0.42, 15.55); luz.rotation.y = Math.PI; nube.add(luz);
    }
    g.add(nube);
  }
  // Isla / cerro de voxeles con árboles en el horizonte
  const verde = ['#1e3a37', '#264a40', '#2f5a48'];
  for (let i = 0; i < 70; i++) {
    const x = lerp(-10, 10, rnd()), alto = Math.max(0.2, 1.3 - Math.abs(x) * 0.12 + lerp(-0.25, 0.25, rnd()));
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.55, alto, 0.4), basico(verde[i % 3]));
    en(b, x, alto / 2 - 0.3, 15.0 + lerp(0, 0.4, rnd())); g.add(b);
  }
  for (let i = 0; i < 9; i++) {
    const x = lerp(-7, 7, rnd());
    const tronco = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.0, 0.18), basico('#3a2a2a'));
    en(tronco, x, 1.3, 14.8); g.add(tronco);
    for (let k = 0; k < 3; k++) {
      const copa = new THREE.Mesh(new THREE.BoxGeometry(0.9 - k * 0.2, 0.45, 0.5), basico(verde[(i + k) % 3]));
      en(copa, x, 1.8 + k * 0.38, 14.7); g.add(copa);
    }
  }
  const pos = [];
  for (let i = 0; i < 60; i++) pos.push(lerp(-14, 14, rnd()), lerp(7, 13, rnd()), 15.7);
  g.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({ color: '#fff6d8', size: 0.12 })));
  return g;
}

// ───────────────────────── sala ─────────────────────────
const tapiz = '#e2c19a';
function sala() {
  const g = new THREE.Group();
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: texPiso, roughness: 0.8 }));
  piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; g.add(piso);
  const alfombra = new THREE.Mesh(new THREE.CircleGeometry(1.7, 40), mat('#b5523b'));
  alfombra.rotation.x = -Math.PI / 2; en(alfombra, -0.2, 0.006, 1.45); alfombra.receiveShadow = true; g.add(alfombra);
  const aro = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.4, 40), mat('#e0915f'));
  aro.rotation.x = -Math.PI / 2; en(aro, -0.2, 0.008, 1.45); g.add(aro);

  // Pared trasera (alta, para el balcón del cuarto del hijo)
  g.add(en(caja(14, 6.5, 0.2, tapiz), 0, 3.25, -2.4));
  g.add(en(caja(14, 0.9, 0.06, '#c9a179'), 0, 0.45, -2.28));
  g.add(en(caja(14, 0.05, 0.08, '#8c6446'), 0, 0.92, -2.26));
  g.add(en(caja(0.2, 6.5, 14, '#d9b58d'), -4.6, 3.25, 0));
  g.add(en(caja(0.2, 6.5, 14, '#d9b58d'), 4.9, 3.25, 0));
  g.add(en(caja(14, 0.2, 14, '#cfb08a', { sombra: false }), 0, 6.3, 0));
  // Pared de la ventana (frente a la mamá), con hueco
  const pv = '#d4ae86';
  g.add(en(caja(14, 0.8, 0.25, pv), 0, 0.4, 4.9));
  g.add(en(caja(14, 2.6, 0.25, pv), 0, 5.0, 4.9));
  g.add(en(caja(4.5, 2.9, 0.25, pv), -4.75, 2.25, 4.9));
  g.add(en(caja(4.5, 2.9, 0.25, pv), 4.75, 2.25, 4.9));
  const madera = '#6b4430';
  g.add(en(caja(5.1, 0.12, 0.3, madera), 0, 0.78, 4.85));
  g.add(en(caja(5.1, 0.12, 0.3, madera), 0, 3.72, 4.85));
  for (const x of [-2.5, 0, 2.5]) g.add(en(caja(0.1, 3.0, 0.3, madera), x, 2.25, 4.85));
  g.add(en(caja(5.1, 0.08, 0.3, madera), 0, 2.45, 4.85));

  // Cuadros en la pared
  const cuadros = [[-1.4, 2.0, 0.7, 0.9, '#e07a5f'], [-0.3, 2.15, 0.55, 0.55, '#3d8b8f'], [0.75, 1.95, 0.8, 0.6, '#f2c94c']];
  for (const [x, y, w, h, c] of cuadros) {
    g.add(en(caja(w + 0.08, h + 0.08, 0.04, '#5a3a28'), x, y, -2.28));
    g.add(en(caja(w, h, 0.02, c), x, y, -2.25));
  }
  // Lámpara de pie
  g.add(en(caja(0.35, 0.05, 0.35, '#3a2a22', { r: 0.02 }), -2.7, 0.03, -1.55));
  const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.7, 8), mat('#3a2a22')); en(poste, -2.7, 0.88, -1.55); g.add(poste);
  const pantalla = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 0.36, 16, 1, true), mat('#ffd9a0', { emissive: '#ffb25e', ei: 0.9 }));
  pantalla.material.side = THREE.DoubleSide; en(pantalla, -2.7, 1.9, -1.55); g.add(pantalla);
  // Planta
  const maceta = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.35, 8), mat('#b5523b', { flat: true })); en(maceta, -3.7, 0.18, -1.7); g.add(maceta);
  for (const [x, y, z, s] of [[-3.7, 0.65, -1.7, 0.32], [-3.55, 0.9, -1.65, 0.22], [-3.85, 0.85, -1.75, 0.2]]) {
    const hoja = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), mat('#3f7d4f', { flat: true })); en(hoja, x, y, z); hoja.castShadow = true; g.add(hoja);
  }
  // Mesa de centro
  g.add(en(caja(1.35, 0.08, 0.72, '#9a6a45', { r: 0.03 }), 0.1, 0.46, 1.35));
  for (const [x, z] of [[-0.5, 1.05], [0.7, 1.05], [-0.5, 1.65], [0.7, 1.65]]) g.add(en(caja(0.06, 0.42, 0.06, '#7a5236'), x, 0.21, z));
  const taza = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.1, 16), mat('#e9e4d8')); en(taza, -0.35, 0.55, 1.45); taza.castShadow = true; g.add(taza);

  // Balcón del segundo piso con la puerta del cuarto del hijo + escalera
  g.add(en(caja(3.9, 0.18, 1.4, '#8a5a3c'), 2.9, 2.75, -1.6));
  for (let i = 0; i <= 8; i++) g.add(en(caja(0.04, 0.7, 0.04, '#5e3b27'), 1.05 + i * 0.45, 3.2, -0.93));
  g.add(en(caja(3.8, 0.06, 0.08, '#5e3b27'), 2.9, 3.56, -0.93));
  for (let i = 0; i < 9; i++) g.add(en(caja(1.0, 0.3 * (i + 1), 0.26, '#9a6844'), 4.35, 0.15 * (i + 1), 1.2 - i * 0.26));
  g.add(en(caja(1.2, 2.2, 0.08, '#4a2e1f'), 2.6, 3.95, -2.28));
  const puerta = en(caja(1.0, 2.0, 0.06, '#7a4a2e'), 2.6, 3.87, -2.22); g.add(puerta);
  const perilla = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), mat('#e0b24c', { rough: 0.3, metal: 0.6 })); en(perilla, 2.95, 3.85, -2.17); g.add(perilla);
  return g;
}
const franjaPuerta = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.05), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0 }));
en(franjaPuerta, 2.6, 2.87, -2.18);
const brilloPuerta = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.8), new THREE.MeshBasicMaterial({ color: '#ffc46b', transparent: true, opacity: 0, depthWrite: false }));
en(brilloPuerta, 2.6, 2.95, -2.15);

// ───────────────────────── sofá, teléfono ─────────────────────────
function sofa() {
  const g = new THREE.Group();
  const t = '#2d6e73', c = '#3b8a8f';
  g.add(en(caja(3.0, 0.42, 1.0, t, { r: 0.06 }), 0, 0.3, 0));
  for (const x of [-0.95, 0, 0.95]) g.add(en(caja(0.92, 0.18, 0.9, c, { r: 0.07 }), x, 0.6, 0.04));
  g.add(en(caja(3.0, 0.8, 0.3, t, { r: 0.08 }), 0, 0.92, -0.42));
  for (const x of [-1.62, 1.62]) g.add(en(caja(0.3, 0.62, 1.02, t, { r: 0.08 }), x, 0.6, 0));
  const cojin = en(caja(0.42, 0.38, 0.14, '#f2c94c', { r: 0.07 }), -1.38, 0.84, -0.22); cojin.rotation.z = 0.2; g.add(cojin);
  return g;
}

const telCanvas = document.createElement('canvas'); telCanvas.width = 256; telCanvas.height = 512;
const telTex = new THREE.CanvasTexture(telCanvas); telTex.colorSpace = THREE.SRGBColorSpace;
const telefono = new THREE.Group();
telefono.add(caja(0.095, 0.014, 0.185, '#15161a', { r: 0.006 }));
const pantallaTel = new THREE.Mesh(new THREE.PlaneGeometry(0.084, 0.168), new THREE.MeshBasicMaterial({ map: telTex, toneMapped: false }));
pantallaTel.rotation.x = -Math.PI / 2; pantallaTel.position.y = 0.0075;
telefono.add(pantallaTel);
en(telefono, 0.22, 0.508, 1.32); telefono.rotation.y = -0.25;

function corazon(g, x, y, s, color) {
  g.fillStyle = color; g.beginPath();
  g.moveTo(x, y + s * 0.3);
  g.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  g.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.75, x, y + s);
  g.bezierCurveTo(x, y + s * 0.75, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  g.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  g.fill();
}
function dibujarTelefono(estado, t, env) {
  const g = telCanvas.getContext('2d'), w = 256, h = 512;
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1c2a4a'); grad.addColorStop(1, '#0b0f1c');
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffffff'; g.textAlign = 'center';
  g.font = `bold 20px ${FUENTE}`; g.fillText('2:07', 36, 30);
  // avatar
  g.fillStyle = '#3d8b8f'; g.beginPath(); g.arc(w / 2, 150, 58, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f2e3c8'; g.beginPath(); g.arc(w / 2, 136, 22, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(w / 2, 196, 38, Math.PI, 0); g.fill();
  g.fillStyle = '#ffffff'; g.font = `bold 38px ${FUENTE}`; g.fillText('Hijo', w / 2 - 14, 262);
  corazon(g, w / 2 + 52, 236, 26, '#ff5470');
  g.font = `22px ${FUENTE}`;
  const seg = Math.max(0, Math.floor(t));
  const reloj = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
  if (estado === 'llamada') {
    g.fillStyle = '#9fe0b0'; g.fillText(`En llamada · ${reloj}`, w / 2, 298);
    g.fillStyle = '#b9c6e6'; g.fillText('Altavoz activado', w / 2, 326);
    for (let i = 0; i < 13; i++) {
      const a = 6 + 60 * env * (0.45 + 0.55 * Math.abs(Math.sin(i * 1.7 + t * 11)));
      g.fillStyle = '#7fd3ff'; g.fillRect(34 + i * 15, 380 - a / 2, 9, a);
    }
    g.fillStyle = '#e5484d'; g.beginPath(); g.arc(w / 2, 462, 30, 0, Math.PI * 2); g.fill();
  } else if (estado === 'terminada') {
    g.fillStyle = '#ff7b7b'; g.fillText('Llamada finalizada', w / 2, 298);
  } else if (estado === 'llamando') {
    g.fillStyle = '#b9c6e6'; g.fillText('Llamando' + '.'.repeat(1 + Math.floor(t * 3) % 3), w / 2, 298);
    g.fillStyle = '#e5484d'; g.beginPath(); g.arc(w / 2, 462, 30, 0, Math.PI * 2); g.fill();
  } else if (estado === 'entrante') {
    g.fillStyle = '#b9c6e6'; g.fillText('Llamada entrante', w / 2, 298);
    g.fillStyle = '#e5484d'; g.beginPath(); g.arc(70, 462, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#35c46a'; g.beginPath(); g.arc(186, 462, 30 + 4 * Math.sin(t * 12), 0, Math.PI * 2); g.fill();
  }
  telTex.needsUpdate = true;
}

// ───────────────────────── personajes ─────────────────────────
function capsula(r, largo, color, o = {}) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, largo, 6, 14), o.material || mat(color, o));
  m.castShadow = true; m.receiveShadow = true; return m;
}

// Material de la cara: foto con máscara suave + mandíbula animada por shader.
function materialCara(textura) {
  return new THREE.ShaderMaterial({
    uniforms: { mapa: { value: textura }, abrir: { value: 0 }, luz: { value: 1.0 } },
    transparent: true,
    vertexShader: `varying vec2 vUv;
      void main(){ vUv=uv; vec3 p=position; p.z -= 1.1*p.x*p.x; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: `uniform sampler2D mapa; uniform float abrir; uniform float luz; varying vec2 vUv;
      const float BOCA=0.198;   // línea de la boca (v desde abajo), medida en la foto
      const float CX=0.478;     // centro horizontal de la boca
      void main(){
        vec2 uv=vUv;
        float peso=smoothstep(0.24,0.36,uv.x)*(1.-smoothstep(0.62,0.74,uv.x));
        float d=abrir*peso;
        vec4 c;
        if(uv.y<BOCA){
          c=texture2D(mapa, vec2(uv.x, uv.y+d));
          float dentro=1.-smoothstep(0.075,0.13,abs(uv.x-CX));
          float hueco=step(BOCA-d, uv.y)*dentro;
          vec3 bocaColor=mix(vec3(0.12,0.02,0.03), vec3(0.30,0.08,0.09), smoothstep(BOCA-d,BOCA,uv.y));
          c.rgb=mix(c.rgb, bocaColor, hueco*smoothstep(0.0,0.003,d));
        } else {
          c=texture2D(mapa, uv);
        }
        c.rgb*=luz;
        gl_FragColor=vec4(c.rgb, c.a);
        #include <colorspace_fragment>
      }`,
  });
}

// Pieza low-poly facetada (cilindro de pocos lados, como los personajes de la referencia)
function cil(rt, rb, h, lados, color, o = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, lados), o.material || mat(color, { flat: true, ...o }));
  m.castShadow = true; m.receiveShadow = true; return m;
}

// Brazo articulado: hombro → codo → muñeca (mano low-poly con pulgar)
function brazo(manga, piel, lado) {
  const hombro = new THREE.Group();
  const sup = cil(0.08, 0.068, 0.3, 6, manga); sup.position.y = -0.15; hombro.add(sup);
  const codo = new THREE.Group(); codo.position.y = -0.3; hombro.add(codo);
  const ant = cil(0.068, 0.056, 0.26, 6, manga); ant.position.y = -0.13; codo.add(ant);
  const muneca = new THREE.Group(); muneca.position.y = -0.27; codo.add(muneca);
  const mano = caja(0.078, 0.1, 0.042, piel, { flat: true }); mano.position.y = -0.05; muneca.add(mano);
  const pulgar = caja(0.026, 0.055, 0.032, piel, { flat: true }); pulgar.position.set(0.048 * lado, -0.03, 0.012); pulgar.rotation.z = 0.45 * lado; muneca.add(pulgar);
  hombro.userData = { codo, muneca, lado };
  return hombro;
}

// Pierna sentada: cadera → rodilla, con tenis de suela blanca
function pierna(pantalon) {
  const cadera = new THREE.Group(); cadera.rotation.x = -Math.PI / 2;
  const muslo = cil(0.105, 0.09, 0.4, 6, pantalon); muslo.position.y = -0.2; cadera.add(muslo);
  const rodilla = new THREE.Group(); rodilla.position.y = -0.4; rodilla.rotation.x = Math.PI / 2; cadera.add(rodilla);
  const espinilla = cil(0.088, 0.072, 0.42, 6, pantalon); espinilla.position.y = -0.21; rodilla.add(espinilla);
  const tenis = caja(0.12, 0.08, 0.24, '#26262b', { flat: true }); tenis.position.set(0, -0.44, 0.05); rodilla.add(tenis);
  const suela = caja(0.125, 0.03, 0.25, '#f2f2ee', { flat: true }); suela.position.set(0, -0.49, 0.05); rodilla.add(suela);
  cadera.userData = { rodilla };
  return cadera;
}

class Mama {
  constructor(texCara) {
    this.g = new THREE.Group();
    const piel = '#c38d74', sueter = '#c98f94', blusa = '#efe3d3', pantalon = '#394061', pelo = '#2b1b16';
    this.cadera = new THREE.Group(); this.cadera.position.set(0, 0.74, 0.02); this.g.add(this.cadera);
    const pelvis = cil(0.19, 0.2, 0.16, 6, pantalon); pelvis.position.y = 0.02; this.cadera.add(pelvis);
    this.torso = new THREE.Group(); this.cadera.add(this.torso);
    const pecho = cil(0.215, 0.175, 0.5, 6, sueter); pecho.position.y = 0.33; pecho.scale.z = 0.72; this.torso.add(pecho);
    const hombros = cil(0.24, 0.215, 0.08, 6, sueter); hombros.position.y = 0.6; hombros.scale.z = 0.72; this.torso.add(hombros);
    const cuello = cil(0.062, 0.07, 0.14, 6, piel); cuello.position.y = 0.7; this.torso.add(cuello);
    this.cabeza = new THREE.Group(); this.cabeza.position.y = 0.78; this.torso.add(this.cabeza);
    const craneo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), mat(pelo, { flat: true })); craneo.scale.set(1.02, 1.15, 1.0); craneo.position.set(0, 0.15, -0.03); craneo.castShadow = true; this.cabeza.add(craneo);
    const mechon = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), mat(pelo, { flat: true })); mechon.position.set(0, 0.29, 0.03); mechon.scale.set(1.5, 0.55, 1.1); this.cabeza.add(mechon);
    const mandibula = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), mat(piel, { flat: true })); mandibula.position.set(0, 0.06, 0.05); mandibula.scale.set(1, 1.05, 0.8); this.cabeza.add(mandibula);
    const chongo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 0), mat(pelo, { flat: true })); chongo.position.set(0, 0.16, -0.22); this.cabeza.add(chongo);
    this.cara = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.42, 20, 20), materialCara(texCara));
    this.cara.position.set(0, 0.14, 0.185); this.cara.renderOrder = 2; this.cabeza.add(this.cara);
    this.brazoI = brazo(sueter, piel, -1); this.brazoI.position.set(-0.25, 0.6, 0); this.torso.add(this.brazoI);
    this.brazoD = brazo(sueter, piel, 1); this.brazoD.position.set(0.25, 0.6, 0); this.torso.add(this.brazoD);
    this.piernas = [-0.11, 0.11].map((x) => { const p = pierna(pantalon); p.position.set(x, 0.0, 0.02); this.cadera.add(p); return p; });
  }
  pose({ inclinar = 0, alcanzar = 0, girar = 0, cabeceo = 0, abrir = 0, hablar = 0, hundirse = 0, t = 0 }) {
    const respiro = Math.sin(t * 1.6);
    this.g.position.y = Math.sin(t * 2.2) * 0.006;                                    // "idle" de videojuego
    this.torso.rotation.x = 0.05 + inclinar * 0.35 - hundirse * 0.2 + respiro * 0.012;
    this.torso.rotation.z = Math.sin(t * 0.9) * 0.025 + hablar * Math.sin(t * 5) * 0.03;
    this.cadera.position.z = 0.02 + inclinar * 0.08 - hundirse * 0.06;
    this.torso.scale.y = 1 + respiro * 0.012;
    this.cabeza.rotation.y = girar + Math.sin(t * 0.7) * 0.05;
    this.cabeza.rotation.x = cabeceo + inclinar * 0.25 - hundirse * 0.15 + hablar * Math.sin(t * 9) * 0.07;
    this.cabeza.rotation.z = Math.sin(t * 0.8) * 0.04 + hablar * Math.sin(t * 4.3) * 0.04;
    // Brazo izquierdo: reposo en el regazo, gesticula un poco al hablar
    const gI = hablar * (0.5 + 0.5 * Math.sin(t * 6.1));
    this.brazoI.rotation.set(-0.4 - gI * 0.35, 0, -0.14 - gI * 0.1);
    this.brazoI.userData.codo.rotation.x = -1.15 - gI * 0.55;
    this.brazoI.userData.muneca.rotation.z = gI * Math.sin(t * 7) * 0.4;
    // Brazo derecho: estira la mano hacia la mesa (alcanzar) o gesticula
    const gD = hablar * (0.5 + 0.5 * Math.sin(t * 5.3 + 1.7)) * (1 - alcanzar);
    this.brazoD.rotation.set(lerp(-0.4 - gD * 0.45, -1.2, alcanzar), lerp(0, -0.3, alcanzar), lerp(0.14 + gD * 0.12, 0.05, alcanzar));
    this.brazoD.userData.codo.rotation.x = lerp(-1.15 - gD * 0.6, -0.3, alcanzar);
    this.brazoD.userData.muneca.rotation.z = -gD * Math.sin(t * 6.5) * 0.45;
    // Piernas: pies que se mecen apenas
    this.piernas.forEach((p, i) => { p.userData.rodilla.rotation.x = Math.PI / 2 + Math.sin(t * 1.7 + i * 2) * 0.05; });
    this.cara.material.uniforms.abrir.value = abrir;
  }
}

class ClaudeBot {
  constructor() {
    this.g = new THREE.Group();
    this.cuerpo = new THREE.Group(); this.g.add(this.cuerpo);
    const naranja = '#d77655', sombra = '#b85f42';
    const cuerpo = caja(0.66, 0.5, 0.46, naranja, { flat: true }); cuerpo.position.y = 0.25; this.cuerpo.add(cuerpo);
    this.brazos = [-1, 1].map((l) => {
      const piv = new THREE.Group(); piv.position.set(0.33 * l, 0.25, 0);
      const b = caja(0.15, 0.13, 0.22, naranja, { flat: true }); b.position.x = 0.07 * l; piv.add(b);
      this.cuerpo.add(piv); return piv;
    });
    this.patas = [-0.22, -0.08, 0.08, 0.22].map((x, i) => {
      const piv = new THREE.Group(); piv.position.set(x, 0.02, 0.17);
      const p = caja(0.085, 0.13, 0.09, i % 2 ? naranja : sombra, { flat: true }); p.position.y = -0.06; piv.add(p);
      this.cuerpo.add(piv); return piv;
    });
    this.ojos = [];
    for (const x of [-0.13, 0.13]) {
      const o = caja(0.06, 0.14, 0.02, '#141414', { sombra: false }); o.position.set(x, 0.3, 0.232); this.cuerpo.add(o); this.ojos.push(o);
    }
  }
  pose({ hablar = 0, girar = 0, parpadeo = 1, t = 0 }) {
    const salto = Math.abs(Math.sin(t * 9)) * hablar;
    this.cuerpo.position.y = salto * 0.07 + Math.abs(Math.sin(t * 2.1)) * 0.012;      // brinquitos al hablar
    this.cuerpo.scale.set(1 + salto * 0.05, 1 - salto * 0.05, 1 + salto * 0.03);
    this.cuerpo.rotation.z = Math.sin(t * 1.3) * 0.03 + hablar * Math.sin(t * 7) * 0.05;
    this.g.rotation.y = girar;
    this.brazos.forEach((b, i) => { b.rotation.z = (i ? 1 : -1) * (0.1 + hablar * (0.3 + 0.3 * Math.sin(t * 13 + i))); });
    this.patas.forEach((p, i) => { p.rotation.x = Math.sin(t * 3.2 + i * 1.6) * 0.35; });   // patitas colgando que se mecen
    for (const o of this.ojos) o.scale.y = parpadeo;
  }
}

// GPT: el nudo del logo extruido en 3D (contorno trazado de la imagen), con la cara en el hexágono central
class GPTBot {
  constructor(formas) {
    this.g = new THREE.Group();
    this.cuerpo = new THREE.Group(); this.g.add(this.cuerpo);
    this.nudo = new THREE.Group(); this.cuerpo.add(this.nudo);
    const R = 0.36;
    const v = ([x, y]) => new THREE.Vector2(x * R, y * R);
    for (const f of formas) {
      const forma = new THREE.Shape(f.contorno.map(v));
      for (const h of f.huecos) forma.holes.push(new THREE.Path(h.map(v)));
      const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.012, bevelSegments: 1, curveSegments: 2 });
      geo.translate(0, 0, -0.05);
      const m = new THREE.Mesh(geo, mat('#17191e', { rough: 0.32, flat: true }));
      m.castShadow = true; m.receiveShadow = true; this.nudo.add(m);
    }
    this.cara = new THREE.Group(); this.cuerpo.add(this.cara);
    const placa = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 6), mat('#f4f3ee', { flat: true, rough: 0.45 }));
    placa.rotation.x = Math.PI / 2; this.cara.add(placa);
    this.ojos = [-0.034, 0.034].map((x) => {
      const o = caja(0.022, 0.05, 0.012, '#111216', { sombra: false }); o.position.set(x, 0.008, 0.04); this.cara.add(o); return o;
    });
    // Manos flotantes estilo videojuego
    this.manos = [-1, 1].map((l) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 0), mat('#f4f3ee', { flat: true, rough: 0.4 }));
      m.castShadow = true; this.cuerpo.add(m); m.userData.lado = l; return m;
    });
    // Tableta (aparece con los "12 mil seguidores")
    this.tableta = new THREE.Group();
    this.tableta.add(caja(0.36, 0.25, 0.02, '#1b1d22', { r: 0.01 }));
    this.pantallaTab = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.22), new THREE.MeshBasicMaterial({ map: texPerfil(), toneMapped: false }));
    this.pantallaTab.position.z = 0.011; this.tableta.add(this.pantallaTab);
    this.tableta.position.set(0, -0.08, 0.3); this.tableta.rotation.x = -0.2; this.tableta.scale.setScalar(0.001);
    this.cuerpo.add(this.tableta);
  }
  pose({ hablar = 0, girar = 0, saltar = 0, tableta = 0, parpadeo = 1, t = 0 }) {
    this.cuerpo.position.y = 0.46 + Math.sin(t * 2.4) * 0.03 + saltar * 0.28;           // flota como ítem de videojuego
    this.cuerpo.rotation.z = Math.sin(t * 1.1) * 0.06;
    this.nudo.rotation.z = -t * 0.45 - saltar * Math.PI * 2;                           // el nudo gira; la cara queda derecha
    const pulso = 1 + hablar * 0.06 * Math.abs(Math.sin(t * 16));
    this.nudo.scale.setScalar(pulso);
    this.g.rotation.y = girar;
    for (const o of this.ojos) o.scale.y = parpadeo * (1 + hablar * 0.35);
    this.manos.forEach((m) => {
      const l = m.userData.lado;
      const gesto = hablar * Math.sin(t * 10 + l);
      m.position.set(l * (0.42 + gesto * 0.04), -0.1 + Math.sin(t * 2.4 + l) * 0.03 + Math.abs(gesto) * 0.12, 0.08 + (tableta > 0.5 ? 0.18 : 0));
      m.rotation.set(t * 0.8, t * 0.6 * l, 0);
    });
    this.tableta.scale.setScalar(Math.max(0.001, pop(tableta)));
  }
}

// Perfil de "Firulais" (sin logos reales)
function perroCara(g, cx, cy, r) {
  g.fillStyle = '#c8914f'; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  g.fillStyle = '#8a5a2e'; g.fillRect(cx - r - r * 0.3, cy - r, r * 0.45, r * 1.1); g.fillRect(cx + r - r * 0.15, cy - r, r * 0.45, r * 1.1);
  g.fillStyle = '#f0d9b5'; g.fillRect(cx - r * 0.5, cy + r * 0.05, r, r * 0.7);
  g.fillStyle = '#1b1b1b'; g.fillRect(cx - r * 0.55, cy - r * 0.4, r * 0.25, r * 0.25); g.fillRect(cx + r * 0.3, cy - r * 0.4, r * 0.25, r * 0.25);
  g.fillRect(cx - r * 0.18, cy + r * 0.1, r * 0.36, r * 0.22);
}
function texPerfil(grande = false) {
  const w = grande ? 1024 : 512, h = grande ? 1536 : 340;
  return texturaCanvas(w, h, (g) => {
    const k = w / 512;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    if (grande) {
      g.fillStyle = '#111'; g.textAlign = 'center'; g.font = `bold ${34 * k}px ${FUENTE}`; g.fillText('@firulais.oficial', w / 2, 70 * k);
      g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(w / 2, 220 * k, 118 * k, 0, Math.PI * 2); g.fill();
      perroCara(g, w / 2, 220 * k, 70 * k);
      g.fillStyle = '#111'; g.font = `bold ${60 * k}px ${FUENTE}`; g.fillText('12.4 mil', w / 2, 430 * k);
      g.font = `${30 * k}px ${FUENTE}`; g.fillStyle = '#555'; g.fillText('seguidores', w / 2, 470 * k);
      g.fillStyle = '#111'; g.font = `${28 * k}px ${FUENTE}`; g.fillText('El perrito más guapo de la colonia', w / 2, 540 * k);
      g.fillStyle = '#3d8b8f'; g.fillRect(40 * k, 575 * k, w - 80 * k, 70 * k);
      g.fillStyle = '#fff'; g.font = `bold ${30 * k}px ${FUENTE}`; g.fillText('Seguir', w / 2, 622 * k);
      const cols = ['#f2c94c', '#e07a5f', '#3d8b8f', '#9b8ec4', '#f4a261', '#7bc47f'];
      for (let i = 0; i < 6; i++) {
        const x = 40 * k + (i % 3) * 148 * k, y = 680 * k + Math.floor(i / 3) * 148 * k;
        g.fillStyle = cols[i]; g.fillRect(x, y, 140 * k, 140 * k);
        perroCara(g, x + 70 * k, y + 70 * k, 32 * k);
      }
    } else {
      g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(90, 120, 64, 0, Math.PI * 2); g.fill();
      perroCara(g, 90, 120, 38);
      g.fillStyle = '#111'; g.font = `bold 34px ${FUENTE}`; g.fillText('@firulais.oficial', 175, 95);
      g.font = `bold 44px ${FUENTE}`; g.fillText('12.4 mil', 175, 160);
      g.font = `26px ${FUENTE}`; g.fillStyle = '#555'; g.fillText('seguidores', 175, 195);
      const cols = ['#f2c94c', '#e07a5f', '#3d8b8f', '#9b8ec4'];
      for (let i = 0; i < 4; i++) { g.fillStyle = cols[i]; g.fillRect(20 + i * 122, 230, 112, 100); perroCara(g, 76 + i * 122, 280, 26); }
    }
  });
}

class Perro {
  constructor() {
    this.g = new THREE.Group();
    const cafe = '#c8914f', oscuro = '#8a5a2e';
    const cuerpo = caja(0.5, 0.24, 0.28, cafe, { r: 0.04 }); cuerpo.position.y = 0.12; this.g.add(cuerpo);
    this.cuello = new THREE.Group(); this.cuello.position.set(0.24, 0.16, 0); this.g.add(this.cuello);
    const cabeza = caja(0.24, 0.2, 0.22, cafe, { r: 0.03 }); cabeza.position.set(0.12, 0.02, 0); this.cuello.add(cabeza);
    const hocico = caja(0.1, 0.09, 0.12, '#f0d9b5', { r: 0.02 }); hocico.position.set(0.27, -0.02, 0); this.cuello.add(hocico);
    const nariz = caja(0.035, 0.03, 0.05, '#1b1b1b'); nariz.position.set(0.325, 0.01, 0); this.cuello.add(nariz);
    this.orejas = [];
    for (const z of [-0.09, 0.09]) { const o = caja(0.06, 0.13, 0.05, oscuro, { r: 0.015 }); o.position.set(0.08, 0.1, z); this.cuello.add(o); this.orejas.push(o); }
    this.ojos = [];
    for (const z of [-0.06, 0.06]) { const o = caja(0.02, 0.018, 0.03, '#141414'); o.position.set(0.245, 0.06, z); this.cuello.add(o); this.ojos.push(o); }
    this.cola = caja(0.18, 0.05, 0.05, cafe, { r: 0.02 }); this.cola.position.set(-0.3, 0.2, 0); this.g.add(this.cola);
    for (const [x, z] of [[0.17, 0.1], [0.17, -0.1], [-0.17, 0.1], [-0.17, -0.1]]) { const p = caja(0.07, 0.06, 0.07, cafe, { r: 0.015 }); p.position.set(x, 0.02, z); this.g.add(p); }
  }
  pose({ alerta = 0, t = 0 }) {
    this.cuello.rotation.z = lerp(-0.55, 0.25, alerta);
    this.cuello.position.y = lerp(0.1, 0.18, alerta);
    for (const o of this.orejas) o.rotation.z = lerp(0.9, 0, alerta);
    for (const o of this.ojos) o.scale.y = lerp(0.2, 2.2, alerta);
    this.cola.rotation.y = alerta * Math.sin(t * 18) * 0.7;
    this.g.scale.y = 1 + Math.sin(t * 2.4) * 0.015 * (1 - alerta);
  }
}

// ───────────────────────── insertos planos (estilo Sad Monarch) ─────────────────────────
function fondoPlano(color, x) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(30, 40), new THREE.MeshBasicMaterial({ color }));
  m.position.set(x, 1.6, -2); return m;
}
function tarjetaOnda(titulo, color, x) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 900;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new RoundedBoxGeometry(1.15, 2.0, 0.06, 4, 0.08), [0, 1, 2, 3].map(() => mat('#15161a')).concat([new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), mat('#15161a')]));
  m.position.set(x, 1.6, 0); m.castShadow = true;
  m.userData = { c, tex, titulo, color };
  return m;
}
function dibujarOnda(tarjeta, t, fase) {
  const { c, tex, titulo, color } = tarjeta.userData; const g = c.getContext('2d');
  g.fillStyle = '#10131f'; g.fillRect(0, 0, 512, 900);
  g.fillStyle = color; g.fillRect(0, 0, 512, 150);
  g.fillStyle = '#111'; g.font = `bold 46px ${FUENTE}`; g.textAlign = 'center'; g.fillText(titulo, 256, 95);
  g.fillStyle = '#f2e3c8'; g.beginPath(); g.arc(256, 330, 90, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3d8b8f'; g.beginPath(); g.arc(256, 520, 150, Math.PI, 0); g.fill();
  for (let i = 0; i < 16; i++) {
    const a = 20 + 170 * Math.abs(Math.sin(i * 1.3 + fase) * Math.sin(t * 6 + i * 0.7));
    g.fillStyle = color; g.fillRect(40 + i * 28, 720 - a / 2, 18, a);
  }
  tex.needsUpdate = true;
}
const INS_A = 100, INS_B = 200, INS_C = 300;
const insertoA = new THREE.Group();
insertoA.add(fondoPlano('#f2c94c', INS_A));
const tarjetaVideo = tarjetaOnda('Video de ayer', '#7fd3ff', INS_A - 0.68);
const tarjetaClon = tarjetaOnda('Voz clonada', '#ff7b7b', INS_A + 0.68);
tarjetaVideo.position.y = tarjetaClon.position.y = 2.1;
insertoA.add(tarjetaVideo, tarjetaClon);
const flecha = new THREE.Group();
const fl1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 12), mat('#15161a')); fl1.rotation.z = Math.PI / 2; flecha.add(fl1);
const fl2 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 16), mat('#15161a')); fl2.rotation.z = -Math.PI / 2; fl2.position.x = 0.16; flecha.add(fl2);
flecha.position.set(INS_A, 2.1, 0.1); insertoA.add(flecha);

const insertoB = new THREE.Group();
insertoB.add(fondoPlano('#f7b2c4', INS_B));
const tabletaGrande = new THREE.Mesh(new RoundedBoxGeometry(1.7, 2.55, 0.08, 4, 0.1), [0, 1, 2, 3].map(() => mat('#1b1d22')).concat([new THREE.MeshBasicMaterial({ map: texPerfil(true), toneMapped: false }), mat('#1b1d22')]));
tabletaGrande.position.set(INS_B, 1.95, 0); insertoB.add(tabletaGrande);

const insertoC = new THREE.Group();
insertoC.add(fondoPlano('#f2c94c', INS_C));
const oro = mat('#e0a526', { rough: 0.35, metal: 0.4 });
const llave = new THREE.Group();
const aroLlave = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.09, 12, 6), oro); aroLlave.position.x = -0.45; llave.add(aroLlave);
llave.add(en(caja(0.9, 0.12, 0.12, '', { material: oro }), 0.15, 0, 0));
llave.add(en(caja(0.1, 0.22, 0.12, '', { material: oro }), 0.45, -0.14, 0));
llave.add(en(caja(0.1, 0.16, 0.12, '', { material: oro }), 0.28, -0.12, 0));
const reloj = new THREE.Group();
const vidrio = mat('#bfe6ff', { rough: 0.1, transparent: true, opacity: 0.85 });
const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.5, 6), vidrio); c1.position.y = 0.25; c1.rotation.x = Math.PI; reloj.add(c1);
const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.5, 6), vidrio); c2.position.y = -0.25; reloj.add(c2);
reloj.add(en(caja(0.8, 0.08, 0.8, '#7a4a2e'), 0, 0.53, 0), en(caja(0.8, 0.08, 0.8, '#7a4a2e'), 0, -0.53, 0));
const arena = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.26, 6), mat('#e8b04b')); arena.position.y = -0.36; reloj.add(arena);
const telIcono = new THREE.Group();
telIcono.add(caja(0.55, 1.0, 0.08, '#15161a', { r: 0.06 }));
telIcono.add(en(caja(0.47, 0.84, 0.02, '#35c46a', { emissive: '#35c46a', ei: 0.4 }), 0, 0, 0.045));
const flechaCirc = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 10, 40, Math.PI * 1.6), mat('#e5484d')); telIcono.add(flechaCirc);
const puntaCirc = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 12), mat('#e5484d')); puntaCirc.position.set(0.62, -0.02, 0); puntaCirc.rotation.z = Math.PI; telIcono.add(puntaCirc);
const iconos = [llave, reloj, telIcono];
for (const i of iconos) { i.position.set(INS_C, 2.05, 0); insertoC.add(i); }

// ───────────────────────── montaje ─────────────────────────
scene.add(cielo(), sala(), sofa(), telefono, franjaPuerta, brilloPuerta, insertoA, insertoB, insertoC);
let mama, claude, gpt, perro, TL, M, E, K, planos;

const colores = { mama: '#ffffff', hijo: '#a9d8ff', gpt: '#8ff5de', claude: '#ffd66b' };
const FUENTE_SUB = '"Baskerville", Georgia, serif';
const posHablante = { mama: [0, 1.6, 0.1], gpt: [-0.92, 1.15, 0.05], claude: [0.94, 0.97, 0.05], hijo: [0.22, 0.52, 1.32] };

function lineaEn(t) {
  let actual = null;
  for (const l of TL.lineas) if (l.start - 0.05 <= t) actual = l; else break;
  return actual;
}
function envDe(quien, t) {
  for (const l of TL.lineas) {
    if (l.who === quien && t >= l.start && t < l.end) {
      const i = Math.floor((t - l.start) * TL.fps);
      return clamp((l.env[i] ?? 0) * 1.1);
    }
  }
  return 0;
}
// A quién mira cada personaje: al que habla (o al teléfono si habla el hijo).
function yawHacia(desde, quien) {
  const [x, , z] = posHablante[quien];
  return Math.atan2(x - desde[0], z - desde[2] + 0.001);
}
function mirar(desde, t, propio) {
  const ls = TL.lineas;
  let i = -1;
  for (let k = 0; k < ls.length; k++) if (ls[k].start - 0.2 <= t) i = k;
  const objetivo = (k) => {
    if (k < 0) return 'hijo';
    let q = ls[k].who;
    if (q === propio) { // si habla él mismo, mira a quien habló antes
      for (let j = k - 1; j >= 0; j--) if (ls[j].who !== propio) return ls[j].who;
      return 'hijo';
    }
    return q;
  };
  const a = yawHacia(desde, objetivo(i - 1)), b = yawHacia(desde, objetivo(i));
  const t0 = i >= 0 ? ls[i].start - 0.2 : 0;
  return lerp(a, b, smooth(t0, t0 + 0.35, t));
}

function construirPlanos() {
  const P = [];
  const add = (t0, t1, o) => P.push({ t0, t1, ...o });
  const tLlamando = K.marcar;
  add(0, M('L02') - 0.08, { de: [0.52, 0.95, 2.0], a: [0.38, 0.86, 1.78], mira: [0.22, 0.5, 1.32] });                      // 1 CU teléfono (hook)
  add(M('L02') - 0.08, E('L02') + 0.12, { de: [0, 1.68, 2.35], a: [0, 1.68, 2.12], mira: [0, 1.64, 0], ease: 'out' });     // 2 MCU mamá
  add(E('L02') + 0.12, M('L04') - 0.08, { de: [-1.95, 2.15, -2.1], a: [-1.82, 2.08, -1.95], mira: [0.45, 0.9, 2.4], fov: 58 });      // 3 general de espaldas (ventana)
  add(M('L04') - 0.08, E('L04') + 0.12, { de: [-0.92, 1.25, 3.35], a: [-0.92, 1.25, 3.1], mira: [-0.92, 1.12, 0] });         // 4 MCU GPT
  add(E('L04') + 0.12, M('L06') - 0.62, { de: [0.94, 1.18, 2.6], a: [0.94, 1.18, 2.42], mira: [0.94, 0.98, 0] });          // 5 MCU Claude
  add(M('L06') - 0.62, E('L06') + 0.35, { orbita: { centro: [0.1, 1.15, 0.1], radio: 2.5, radioAtras: 2.05, alt: 0.6, a0: 0.1, a1: 0.1 + Math.PI * 2 }, fov: 46 }); // 6 ÓRBITA 360°
  add(E('L06') + 0.35, E('L07') + 0.08, { de: [0, 1.7, 3.1], a: [0, 1.7, 1.4], mira: [0, 1.67, 0], ease: 'out', dur: 0.35 }); // 7 zoom de golpe a la mamá
  add(E('L07') + 0.08, M('L08') + 2.1, { de: [0.8, 1.45, 3.1], a: [0.72, 1.42, 2.9], mira: [0.45, 1.3, 0] });              // 8 mamá + Claude
  add(M('L08') + 2.1, E('L08') + 0.25, { de: [INS_A, 1.75, 6.2], a: [INS_A, 1.75, 5.6], mira: [INS_A, 1.75, 0], subBajo: true }); // 9 INSERTO clonación
  add(E('L08') + 0.25, E('L09') + 0.12, { de: [-0.92, 1.35, 3.6], a: [-0.92, 1.35, 3.4], mira: [-0.92, 1.25, 0] });          // 10 GPT salta
  add(E('L09') + 0.12, E('L10') + 0.1, { de: [1.9, 1.42, 2.25], a: [1.75, 1.38, 2.05], mira: [0.05, 1.28, 0.55] });        // 11 mamá se inclina al teléfono
  add(E('L10') + 0.1, E('L11') - 0.55, { de: [0.46, 0.9, 1.9], a: [0.36, 0.82, 1.72], mira: [0.22, 0.5, 1.32] });          // 12 CU teléfono
  add(E('L11') - 0.55, E('L11') + 0.45, { de: [-0.45, 0.62, 3.95], a: [-0.52, 0.58, 3.75], mira: [-0.95, 0.28, 2.3] });     // 13 el perro levanta la cabeza
  add(E('L11') + 0.45, E('L12') + 0.25, { de: [0, 1.66, 2.7], a: [0, 1.66, 1.45], mira: [0, 1.6, 0.15], ease: 'inout' });  // 14 dolly lento a la mamá
  add(E('L12') + 0.25, M('L13') + 1.05, { de: [-0.92, 1.25, 3.35], a: [-0.92, 1.25, 3.15], mira: [-0.92, 1.1, 0] });      // 15 GPT saca la tableta
  add(M('L13') + 1.05, E('L13') + 0.2, { de: [INS_B, 1.45, 6.6], a: [INS_B, 1.45, 5.9], mira: [INS_B, 1.45, 0], subBajo: true }); // 16 INSERTO perfil
  add(E('L13') + 0.2, E('L14') + 0.25, { de: [0.94, 1.18, 2.6], a: [0.94, 1.18, 2.42], mira: [0.94, 0.98, 0] });           // 17 Claude
  add(E('L14') + 0.25, M('L15') - 0.1, { de: [0.46, 0.9, 1.9], a: [0.34, 0.8, 1.68], mira: [0.22, 0.5, 1.32] });           // 18 CU teléfono (cuelga y marca)
  add(M('L15') - 0.1, E('L15') + 0.3, { de: [0.2, 1.3, 4.2], a: [1.2, 2.9, 3.2], mira: [0.2, 1.0, 0], miraA: [2.6, 3.7, -2.2], dur: 2.0, fov: 40 }); // 19 GRÚA al cuarto
  add(E('L15') + 0.3, E('L16') + 0.35, { de: [0, 1.45, 4.45], a: [0, 1.42, 4.25], mira: [0, 1.0, 0], fov: 56 });           // 20 general frontal
  add(E('L16') + 0.35, E('L20') + 0.35, { reglas: true });                                                                  // 21 INSERTO reglas
  add(E('L20') + 0.35, E('L21') + 0.2, { de: [0, 1.68, 2.3], a: [0, 1.68, 2.14], mira: [0, 1.64, 0] });                    // 22 mamá orgullosa
  add(E('L21') + 0.2, E('L23') + 0.45, { de: [0, 1.35, 4.35], a: [0, 1.35, 4.2], mira: [0, 1.0, 0], fov: 52, quietos: true }); // 23 los dos voltean a cámara
  add(E('L23') + 0.45, TL.duracion + 1, { de: [-1.95, 2.15, -2.1], a: [-1.85, 2.1, -2.0], mira: [0.45, 0.9, 2.4], fov: 58 });     // 24 general de espaldas → loop
  return P;
}

function camara(t) {
  const p = planos.find((s) => t >= s.t0 && t < s.t1) || planos[planos.length - 1];
  const dur = p.dur ?? (p.t1 - p.t0);
  const u = clamp((t - p.t0) / dur);
  camera.fov = p.fov ?? 34;
  if (p.orbita) {
    const { centro, radio, radioAtras = radio, alt, a0, a1 } = p.orbita;
    const e = easeInOut(u);
    const a = lerp(a0, a1, e);
    const r = lerp(radioAtras, radio, (Math.cos(a) + 1) / 2) * (1 - 0.08 * Math.sin(Math.PI * e));
    camera.position.set(centro[0] + Math.sin(a) * r, centro[1] + alt + 0.35 * Math.sin(Math.PI * e), centro[2] + Math.cos(a) * r);
    camera.lookAt(...centro);
  } else if (p.reglas) {
    const tramos = [M('L18') - 0.25, M('L19') - 0.25, M('L20') - 0.25];
    let k = 0; for (let i = 0; i < 3; i++) if (t >= tramos[i]) k = i;
    const u2 = clamp((t - (k === 0 ? p.t0 : tramos[k])) / 1.4);
    const a = lerp(-0.35, 0.0, easeInOut(u2)) + k * 0.0;
    camera.position.set(INS_C + Math.sin(a) * 4.4, 1.7, Math.cos(a) * 4.4);
    camera.lookAt(INS_C, 1.75, 0);
  } else {
    const e = p.ease === 'out' ? easeOut(u) : p.ease === 'inout' ? easeInOut(u) : u;
    camera.position.set(...lerp3(p.de, p.a, e));
    camera.lookAt(...lerp3(p.mira, p.miraA ?? p.mira, p.miraA ? easeInOut(u) : e));
  }
  camera.updateProjectionMatrix();
  return p;
}

function animar(t, plano) {
  const L = lineaEn(t);
  // Mamá
  const alcanzar = smooth(K.colgar - 0.5, K.colgar - 0.15, t) * (1 - smooth(K.marcar + 0.4, K.marcar + 0.9, t));
  const inclinar = Math.max(smooth(M('L10') - 0.4, M('L10'), t) * (1 - smooth(E('L12'), E('L12') + 0.6, t)), alcanzar * 0.8);
  const hundirse = smooth(M('L16'), M('L16') + 0.6, t) * (1 - smooth(E('L20'), E('L20') + 0.5, t));
  const orgullo = smooth(M('L21'), M('L21') + 0.4, t) * (1 - smooth(E('L21') + 0.3, E('L21') + 0.8, t));
  mama.pose({
    inclinar, alcanzar, hundirse,
    girar: clamp(mirar([0, 1.6, 0.1], t, 'mama') * 0.45, -0.55, 0.55),
    cabeceo: -orgullo * 0.12 + (L && L.who === 'hijo' ? 0.22 : 0),
    abrir: envDe('mama', t) * 0.05,
    hablar: envDe('mama', t), t,
  });
  // Claude
  const parpadeo = ((t % 3.7) < 0.12) ? 0.15 : 1;
  const miraC = clamp(mirar([0.94, 0.97, 0.05], t, 'claude') * 0.6, -0.8, 0.8);
  const giroC = plano.quietos ? lerp(miraC, -0.2, smooth(E('L21') + 0.35, E('L21') + 0.75, t)) : miraC;
  claude.pose({ hablar: envDe('claude', t), girar: giroC, parpadeo, t });
  // GPT
  const saltar = Math.max(0, Math.sin(clamp((t - M('L09')) / 0.6) * Math.PI)) * (t >= M('L09') && t < M('L09') + 0.6 ? 1 : 0);
  const tab = Math.max(smooth(M('L13') + 0.2, M('L13') + 0.7, t) * (1 - smooth(E('L13') + 0.4, E('L13') + 0.8, t)),
    smooth(M('L23'), M('L23') + 0.4, t));
  const miraG = clamp(mirar([-0.92, 1, 0.05], t, 'gpt') * 0.35, -0.35, 0.35); // el logo es plano: poco giro para que siempre se lea
  const giroG = plano.quietos ? lerp(miraG, 0.2, smooth(E('L21') + 0.45, E('L21') + 0.85, t)) : miraG;
  gpt.pose({ hablar: envDe('gpt', t), girar: giroG, saltar, tableta: tab, parpadeo: ((t + 1.3) % 4.1) < 0.12 ? 0.15 : 1, t });
  // Perro: se despierta al oír "Firulais"
  const alerta = Math.max(
    smooth(M('L11') + 0.1, M('L11') + 0.35, t) * (1 - smooth(E('L11') + 1.2, E('L11') + 1.8, t)),
    smooth(E('L21') - 0.7, E('L21') - 0.4, t) * (1 - smooth(E('L23') + 1, E('L23') + 1.5, t)));
  perro.pose({ alerta, t });
  // Teléfono: estado de la pantalla y vibración
  let estado = 'llamada', reloj = t + 14;
  if (t >= K.colgar && t < K.marcar) estado = 'terminada';
  else if (t >= K.marcar && t < M('L15') - 0.05) estado = 'llamando';
  else if (t >= M('L15') - 0.05 && t < K.loop - 0.1) reloj = t - M('L15');
  if (t >= K.loop - 0.1) estado = 'entrante';
  const vibra = (t < 0.9 || t >= K.loop) && ((t % 0.45) < 0.3);
  telefono.position.x = 0.22 + (vibra ? Math.sin(t * 190) * 0.004 : 0);
  dibujarTelefono(estado, reloj, envDe('hijo', t));
  const llamadaActiva = estado !== 'terminada';
  luzTel.position.set(0.22, 0.75, 1.32);
  luzTel.intensity = llamadaActiva ? 1.6 + envDe('hijo', t) * 1.5 : 0.4;
  // Luz del cuarto del hijo
  const luzCuarto = smooth(M('L15') - 0.05, M('L15') + 0.15, t);
  franjaPuerta.material.opacity = luzCuarto;
  brilloPuerta.material.opacity = luzCuarto * 0.35;
  luzPuerta.intensity = luzCuarto * 8;
  // Insertos
  const onda = envDe('claude', t);
  dibujarOnda(tarjetaVideo, t, 0.0);
  dibujarOnda(tarjetaClon, t, 0.0);
  flecha.position.x = INS_A - 0.06 + Math.sin(t * 6) * 0.04;
  tarjetaVideo.rotation.y = 0.12 + onda * 0.02; tarjetaClon.rotation.y = -0.12;
  tabletaGrande.rotation.y = Math.sin(t * 0.8) * 0.06;
  const tramos = [M('L18'), M('L19'), M('L20')];
  iconos.forEach((ic, i) => {
    const on = t >= tramos[i] - 0.25 && (i === 2 || t < tramos[i + 1] - 0.25);
    const u = on ? pop(clamp((t - (tramos[i] - 0.25)) / 0.45)) : 0;
    ic.scale.setScalar(Math.max(0.001, u * 1.1));
    ic.rotation.y = t * 0.9 + i;
  });
  arena.scale.y = 0.4 + 0.6 * ((t * 0.3) % 1);
}

// ───────────────────────── capa 2D: subtítulos ─────────────────────────
function envolver(texto, maxW) {
  const palabras = texto.split(' '); const lineas = []; let actual = '';
  for (const p of palabras) {
    const prueba = actual ? actual + ' ' + p : p;
    if (ctx.measureText(prueba).width > maxW && actual) { lineas.push(actual); actual = p; } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}
function textoConBorde(txt, x, y, color, tam, fuente = FUENTE_SUB) {
  ctx.font = `700 ${tam}px ${fuente}`;
  ctx.save();
  ctx.shadowColor = 'rgba(20,10,30,0.85)'; ctx.shadowBlur = tam * 0.28; ctx.shadowOffsetX = tam * 0.04; ctx.shadowOffsetY = tam * 0.07;
  ctx.lineJoin = 'round'; ctx.lineWidth = tam * 0.09; ctx.strokeStyle = 'rgba(25,15,35,0.9)';
  ctx.strokeText(txt, x, y);
  ctx.restore();
  ctx.fillStyle = color; ctx.fillText(txt, x, y);
}
function capa2D(t, plano) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(glCanvas, 0, 0, W, H);
  // viñeta suave
  const v = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.5, H * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,6,20,0.38)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (plano.reglas) textoConBorde('3 REGLAS', W / 2, H * 0.16, '#ffffff', 118 * S);
  // subtítulo vigente: desde que empieza la línea hasta que empieza la siguiente (máx. +0.9 s)
  const ls = TL.lineas;
  let sub = null;
  for (let i = 0; i < ls.length; i++) {
    const fin = Math.min(ls[i + 1] ? ls[i + 1].start - 0.03 : Infinity, ls[i].end + 0.9);
    if (t >= (i === 0 ? 0 : ls[i].start - 0.04) && t < fin) sub = ls[i];
  }
  if (sub) {
    const tam = 64 * S;
    ctx.font = `700 ${tam}px ${FUENTE_SUB}`;
    const renglones = envolver(sub.sub, W * 0.84);
    const y0 = H * (plano.subBajo ? 0.845 : 0.685) - (renglones.length - 1) * tam * 0.6;
    renglones.forEach((r, i) => textoConBorde(r, W / 2, y0 + i * tam * 1.2, colores[sub.who], tam));
  }
}

// ───────────────────────── API para el render ─────────────────────────
window.cuadro = (t) => {
  const plano = camara(t);
  animar(t, plano);
  renderer.render(scene, camera);
  capa2D(t, plano);
};

async function preparar() {
  TL = await (await fetch('/timeline.json')).json();
  const porId = Object.fromEntries(TL.lineas.map((l) => [l.id, l]));
  M = (id) => porId[id].start; E = (id) => porId[id].end; K = TL.marcas;
  try {
    for (const [peso, archivo] of [[400, 'pixelify-sans-latin-400-normal.woff2'], [700, 'pixelify-sans-latin-700-normal.woff2']]) {
      const f = new FontFace('Pixelify', `url(/node_modules/@fontsource/pixelify-sans/files/${archivo})`, { weight: String(peso) });
      document.fonts.add(await f.load());
    }
  } catch (e) { console.warn('fuente no disponible, uso monospace', e); }
  try {
    const f = new FontFace('Baskerville', 'url(/node_modules/@fontsource/libre-baskerville/files/libre-baskerville-latin-700-normal.woff2)', { weight: '700' });
    document.fonts.add(await f.load());
  } catch (e) { console.warn('fuente serif no disponible', e); }
  const formasLogo = await (await fetch('/assets/logo_gpt.json')).json();
  const texCara = await new THREE.TextureLoader().loadAsync('/assets/mama_cara.png');
  texCara.colorSpace = THREE.SRGBColorSpace;
  mama = new Mama(texCara); en(mama.g, 0, 0, 0); scene.add(mama.g);
  claude = new ClaudeBot(); en(claude.g, 0.94, 0.69, 0.05); scene.add(claude.g);
  gpt = new GPTBot(formasLogo); en(gpt.g, -0.92, 0.69, 0.05); scene.add(gpt.g);
  perro = new Perro(); en(perro.g, -1.15, 0.01, 2.05); perro.g.rotation.y = -0.9; scene.add(perro.g);
  planos = construirPlanos();
  // Texturas que usan la fuente se redibujan ahora que cargó
  gpt.pantallaTab.material.map = texPerfil();
  tabletaGrande.material[4].map = texPerfil(true);
  window.cuadro(0);
  window.duracion = TL.duracion;
  window.listo = true;
}
preparar();
