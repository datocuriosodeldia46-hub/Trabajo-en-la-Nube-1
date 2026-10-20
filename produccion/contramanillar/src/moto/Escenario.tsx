import * as THREE from 'three';
import {useMemo} from 'react';
import {Html} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import {useCurrentFrame} from 'remotion';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {Bloom, ChromaticAberration, EffectComposer, Noise, Vignette} from '@react-three/postprocessing';
import EVENTOS from './eventos.json';
import {Moto, ORO, ROJO} from './Moto';
import {cinta, Estado} from './util';

const FONDO = '#0b1324';

// Acercamiento brusco: sube rápido (≈3 frames) y regresa suave
export const golpe = (s: number) => EVENTOS.golpes.reduce((acc, [t, f]) => {
  const d = s - t;
  if (d < -0.02 || d > 1.2) return acc;
  const sube = Math.min(1, (d + 0.02) / 0.1);
  return acc + f * 0.16 * sube * Math.exp(-Math.max(0, d - 0.1) * 3.2);
}, 0);
const temblor = (s: number) => EVENTOS.golpes.reduce((acc, [t, f]) => {
  const d = s - t;
  return d < 0 || d > 0.45 ? acc : acc + f * 0.035 * Math.exp(-d * 9);
}, 0);

// Cámara puesta por frame (determinista), con golpes de zoom y temblor sincronizados con el sonido
export const Camara = ({pos, mira, fov = 40}: {pos: [number, number, number]; mira: [number, number, number]; fov?: number}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const s = useCurrentFrame() / 30;
  const k = temblor(s);
  camera.position.set(pos[0] + Math.sin(s * 71) * k, pos[1] + Math.sin(s * 53 + 1) * k, pos[2] + Math.sin(s * 61 + 2) * k);
  camera.lookAt(...mira);
  const f = fov / (1 + golpe(s));
  if (camera.fov !== f) { camera.fov = f; camera.updateProjectionMatrix(); }
  return null;
};

// Reflejos realistas sin descargar nada: entorno de estudio generado por código
export const Entorno = () => {
  const {gl, scene} = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;
  }, [gl, scene]);
  return null;
};

// Brillo (bloom), viñeta, grano y aberración cromática en los golpes
export const Efectos = ({s}: {s: number}) => (
  <EffectComposer multisampling={4}>
    <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.85} luminanceSmoothing={0.2} radius={0.7} />
    <ChromaticAberration offset={new THREE.Vector2(0.0025 * golpe(s) * 6, 0.0012 * golpe(s) * 6)} radialModulation={false} modulationOffset={0} />
    <Noise opacity={0.05} />
    <Vignette eskil={false} offset={0.25} darkness={0.75} />
  </EffectComposer>
);

// Líneas de velocidad alrededor de la moto (en coordenadas de la moto)
export const Rafagas = ({e, n = 40, fuerza = 1}: {e: Estado; n?: number; fuerza?: number}) => {
  const lineas = useMemo(() => Array.from({length: n}, (_, i) => {
    const r = (k: number) => Math.abs(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
    const lado = r(1) < 0.5 ? -1 : 1;
    return {x: lado * (1.2 + r(2) * 3.5), y: 0.15 + r(3) * 2.6, z0: r(4) * 40, largo: 0.8 + r(5) * 1.8};
  }), [n]);
  if (fuerza <= 0) return null;
  return (
    <group position={[e.x, 0, e.z]} rotation={[0, e.h, 0]}>
      {lineas.map((l, i) => {
        const z = 25 - ((l.z0 + e.dist * 1.6) % 40);
        return (
          <mesh key={i} position={[l.x, l.y, z]}>
            <boxGeometry args={[0.012, 0.012, l.largo * fuerza]} />
            <meshBasicMaterial color="#cfe0ff" transparent opacity={0.35 * fuerza} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

export const Luces = () => (
  <>
    <fog attach="fog" args={[FONDO, 18, 70]} />
    <hemisphereLight args={['#9fb4e0', '#1a2236', 1.5]} />
    <ambientLight intensity={0.35} />
    <directionalLight position={[-6, 9, 8]} intensity={1.4} />
    <directionalLight position={[6, 12, -4]} intensity={3.2} castShadow shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-bias={-0.0004} />
    <pointLight position={[-3, 2.5, -4]} intensity={30} distance={14} color={ORO} />
    <pointLight position={[3, 3, 3]} intensity={14} distance={12} color="#8fb3ff" />
  </>
);

// Suelo con rejilla que parece infinita (se recoloca en saltos de 1 m alrededor del ancla)
export const Suelo = ({ax, az}: {ax: number; az: number}) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[Math.round(ax), -0.001, Math.round(az)]} receiveShadow>
      <planeGeometry args={[240, 240]} />
      <meshStandardMaterial color="#0d1626" roughness={0.95} />
    </mesh>
    <gridHelper args={[240, 120, '#22324f', '#16223a']} position={[Math.round(ax / 2) * 2, 0.002, Math.round(az / 2) * 2]} />
  </group>
);

export const Carretera = ({pts, ancho = 4.2}: {pts: {x: number; z: number}[]; ancho?: number}) => {
  const g = useMemo(() => ({
    asfalto: cinta(pts, 0, ancho, 0.006),
    bordeI: cinta(pts, -ancho / 2 + 0.12, 0.09, 0.012),
    bordeD: cinta(pts, ancho / 2 - 0.12, 0.09, 0.012),
    centro: cinta(pts, 0, 0.1, 0.012, 2),
  }), [pts, ancho]);
  return (
    <group>
      <mesh geometry={g.asfalto} receiveShadow><meshStandardMaterial color="#141b28" roughness={0.85} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={g.bordeI}><meshStandardMaterial color={ORO} emissive={ORO} emissiveIntensity={1.4} toneMapped={false} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={g.bordeD}><meshStandardMaterial color={ORO} emissive={ORO} emissiveIntensity={1.4} toneMapped={false} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={g.centro}><meshStandardMaterial color="#e8ecf4" emissive="#e8ecf4" emissiveIntensity={0.5} side={THREE.DoubleSide} /></mesh>
    </group>
  );
};

// Moto colocada en el mundo según su estado; `base` desplaza las ruedas lateralmente (escena del mecanismo)
export const MotoEn = ({e, base = 0, brazos = false, rodarExtra = 0}: {e: Estado; base?: number; brazos?: boolean; rodarExtra?: number}) => (
  <group position={[e.x, 0, e.z]} rotation={[0, e.h, 0]}>
    <group position={[base, 0, 0]} rotation={[0, 0, e.lean]}>
      <Moto direccion={e.dir} rodar={-(e.dist + rodarExtra) / 0.33} brazosResaltados={brazos} />
    </group>
  </group>
);

// Etiqueta con línea guía, anclada a un punto 3D
export const Etiqueta = ({p, texto, color = ORO, vis = 1, alto = 90, tam = 36}: {p: [number, number, number]; texto: string; color?: string; vis?: number; alto?: number; tam?: number}) => {
  if (vis <= 0.01) return null;
  return (
    <Html position={p} zIndexRange={[20, 0]} style={{pointerEvents: 'none'}}>
      <div style={{transform: `translate(-50%, -100%) scale(${0.85 + 0.15 * vis})`, transformOrigin: 'bottom center', opacity: vis,
        display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Helvetica, Arial, sans-serif'}}>
        <div style={{whiteSpace: 'nowrap', fontSize: tam, fontWeight: 800, letterSpacing: 4, color, padding: '8px 16px',
          background: 'rgba(8,12,22,0.82)', border: `2px solid ${color}`, borderRadius: 6, boxShadow: `0 0 24px ${color}55`}}>{texto}</div>
        <div style={{width: 3, height: alto, background: color, opacity: 0.85}} />
        <div style={{width: 16, height: 16, borderRadius: 8, background: color, boxShadow: `0 0 18px ${color}`}} />
      </div>
    </Html>
  );
};

// Flecha 3D brillante (desde `de`, en dirección `dir`)
export const Flecha = ({de, dir, largo = 1, color = ORO, grosor = 0.05}: {de: [number, number, number]; dir: [number, number, number]; largo?: number; color?: string; grosor?: number}) => {
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize()), [dir[0], dir[1], dir[2]]);
  if (largo <= 0.01) return null;
  return (
    <group position={de} quaternion={q}>
      <mesh position={[0, largo * 0.4, 0]}><cylinderGeometry args={[grosor, grosor, largo * 0.8, 12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} /></mesh>
      <mesh position={[0, largo * 0.88, 0]}><coneGeometry args={[grosor * 2.8, largo * 0.24, 16]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} /></mesh>
    </group>
  );
};

// Huella de contacto del neumático en el suelo
export const Huella = ({p, color = ORO, vis = 1}: {p: [number, number, number]; color?: string; vis?: number}) => (
  <mesh position={[p[0], 0.02, p[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.16 * vis, 0.32 * vis, 1]}>
    <circleGeometry args={[1, 32]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} transparent opacity={0.9} />
  </mesh>
);

// Estela luminosa en el suelo con los últimos puntos recorridos
export const Estela = ({pts, color = ORO, y = 0.03, grosor = 0.05}: {pts: {x: number; z: number}[]; color?: string; y?: number; grosor?: number}) => {
  const g = useMemo(() => {
    if (pts.length < 3) return null;
    const curva = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x, y, p.z)));
    return new THREE.TubeGeometry(curva, Math.min(200, pts.length * 2), grosor, 8, false);
  }, [pts, y, grosor]);
  if (!g) return null;
  return <mesh geometry={g}><meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} toneMapped={false} /></mesh>;
};
