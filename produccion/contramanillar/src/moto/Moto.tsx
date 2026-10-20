import * as THREE from 'three';
import {useMemo} from 'react';
import {RoundedBox} from '@react-three/drei';

// Paleta "3D profundo": pintura roja con barniz, metales, y acentos dorados que brillan
export const ORO = '#f5c451';
export const ROJO = '#ff4d5a';

const M = {
  pintura: () => new THREE.MeshPhysicalMaterial({color: '#d63a26', metalness: 0.35, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06}),
  grafito: () => new THREE.MeshStandardMaterial({color: '#2b3039', metalness: 0.65, roughness: 0.38}),
  cromo: () => new THREE.MeshStandardMaterial({color: '#dfe4ec', metalness: 1, roughness: 0.12}),
  goma: () => new THREE.MeshStandardMaterial({color: '#16191f', roughness: 0.92}),
  bronce: () => new THREE.MeshStandardMaterial({color: '#c9962e', metalness: 0.9, roughness: 0.3}),
  cuero: () => new THREE.MeshPhysicalMaterial({color: '#23272f', roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.5}),
  asiento: () => new THREE.MeshStandardMaterial({color: '#191c22', roughness: 0.75}),
  mezclilla: () => new THREE.MeshStandardMaterial({color: '#2f3d55', roughness: 0.8}),
  casco: () => new THREE.MeshPhysicalMaterial({color: '#f2f4f8', metalness: 0.1, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.04}),
  visor: () => new THREE.MeshPhysicalMaterial({color: '#0a0e17', metalness: 1, roughness: 0.04, clearcoat: 1}),
  oro: () => new THREE.MeshStandardMaterial({color: ORO, emissive: ORO, emissiveIntensity: 2.2, toneMapped: false}),
  oroSuave: () => new THREE.MeshStandardMaterial({color: ORO, emissive: ORO, emissiveIntensity: 1.2, toneMapped: false}),
  faro: () => new THREE.MeshStandardMaterial({color: '#ffffff', emissive: '#fff4d6', emissiveIntensity: 4, toneMapped: false}),
  stop: () => new THREE.MeshStandardMaterial({color: '#ff2a2a', emissive: '#ff2a2a', emissiveIntensity: 3, toneMapped: false}),
  pantalla: () => new THREE.MeshStandardMaterial({color: '#7fd4ff', emissive: '#7fd4ff', emissiveIntensity: 1.5, toneMapped: false}),
  freno: () => new THREE.MeshStandardMaterial({color: '#c42b2b', metalness: 0.5, roughness: 0.35}),
};
type Mats = {[K in keyof typeof M]: THREE.Material};
let cache: Mats | null = null;
const mats = (): Mats => (cache ??= Object.fromEntries(Object.entries(M).map(([k, f]) => [k, f()])) as Mats);

// Pieza de perfil lateral extruida y redondeada: puntos (z adelante, y arriba); el grosor va en x
const perfil = (pts: [number, number][], grosor: number, bisel: number) => {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 2) {
    const c = pts[i], p = pts[(i + 1) % pts.length];
    s.quadraticCurveTo(c[0], c[1], p[0], p[1]);
  }
  const g = new THREE.ExtrudeGeometry(s, {depth: grosor - 2 * bisel, bevelEnabled: true, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 6, curveSegments: 24});
  g.translate(0, 0, -(grosor - 2 * bisel) / 2);
  g.rotateY(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
};

const tubo = (pts: [number, number, number][], r: number, seg = 48) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 14, false);

// Segmento cónico entre dos puntos
const Hueso = ({a, b, r1, r2, mat}: {a: THREE.Vector3; b: THREE.Vector3; r1: number; r2: number; mat: THREE.Material}) => {
  const d = new THREE.Vector3().subVectors(b, a);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  return (
    <mesh position={new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)} quaternion={q} material={mat} castShadow>
      <cylinderGeometry args={[r2, r1, d.length(), 20]} />
    </mesh>
  );
};

// Cinemática inversa de dos huesos: articulación intermedia hacia el vector `polo`
const ik = (a: THREE.Vector3, b: THREE.Vector3, l1: number, l2: number, polo: THREE.Vector3) => {
  const d = new THREE.Vector3().subVectors(b, a);
  const L = Math.min(d.length(), l1 + l2 - 1e-4);
  const dir = d.clone().normalize();
  const x = (l1 * l1 - l2 * l2 + L * L) / (2 * L);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const p = polo.clone().sub(dir.clone().multiplyScalar(polo.dot(dir))).normalize();
  return a.clone().add(dir.multiplyScalar(x)).add(p.multiplyScalar(h));
};

export const Rueda = ({z, giro = 0, discos = [1]}: {z: number; giro?: number; discos?: number[]}) => {
  const m = mats();
  return (
    <group position={[0, 0.31, z]}>
      <group rotation={[giro, 0, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]} scale={[1, 1, 1.5]} material={m.goma} castShadow><torusGeometry args={[0.25, 0.065, 24, 64]} /></mesh>
        <mesh rotation={[0, Math.PI / 2, 0]} material={m.grafito}><torusGeometry args={[0.2, 0.018, 12, 64]} /></mesh>
        <mesh rotation={[0, Math.PI / 2, 0]} material={m.oro}><torusGeometry args={[0.192, 0.006, 8, 64]} /></mesh>
        {[0, 1, 2, 3, 4].map((k) => (
          <group key={k} rotation={[(k * Math.PI * 2) / 5, 0, 0]}>
            {[-0.13, 0.13].map((a) => (
              <mesh key={a} position={[0, 0.1, 0]} rotation={[a, 0, 0]} material={m.grafito}><boxGeometry args={[0.03, 0.19, 0.022]} /></mesh>
            ))}
          </group>
        ))}
        <mesh rotation={[0, 0, Math.PI / 2]} material={m.cromo}><cylinderGeometry args={[0.045, 0.045, 0.14, 24]} /></mesh>
        {discos.map((d) => (
          <mesh key={d} rotation={[0, 0, Math.PI / 2]} position={[0.07 * d, 0, 0]} material={m.cromo}><cylinderGeometry args={[0.15, 0.15, 0.008, 48]} /></mesh>
        ))}
      </group>
      {discos.map((d) => (
        <mesh key={d} position={[0.08 * d, 0.1, -0.11]} rotation={[0.7, 0, 0]} material={m.freno}><boxGeometry args={[0.04, 0.1, 0.06]} /></mesh>
      ))}
    </group>
  );
};

const CABEZA_DIR = new THREE.Vector3(0, 1.03, 0.42); // pivote de la dirección
const EJE_DIR = new THREE.Vector3(0, 0.71, -0.3).normalize();
const PUNOS = [new THREE.Vector3(-0.35, 1.14, 0.33), new THREE.Vector3(0.35, 1.14, 0.33)]; // [derecho, izquierdo]

type Props = {direccion?: number; rodar?: number; piloto?: boolean; brazosResaltados?: boolean};

// Moto naked: eje longitudinal +z (adelante), suelo en y=0, el lado derecho del piloto es -x
export const Moto = ({direccion = 0, rodar = 0, piloto = true, brazosResaltados = false}: Props) => {
  const m = mats();
  const g = useMemo(() => ({
    tanque: perfil([[-0.16, 0.92], [-0.14, 1.1], [0.12, 1.16], [0.36, 1.15], [0.47, 1.04], [0.45, 0.9], [0.15, 0.86], [-0.05, 0.86]], 0.36, 0.07),
    asiento: perfil([[-0.18, 0.9], [-0.15, 1.0], [-0.42, 0.97], [-0.66, 0.99], [-0.72, 0.95], [-0.62, 0.88]], 0.29, 0.035),
    colin: perfil([[-0.5, 0.86], [-0.72, 0.98], [-0.96, 1.03], [-0.98, 0.98], [-0.72, 0.85]], 0.2, 0.03),
    cupula: perfil([[0.5, 0.98], [0.62, 1.22], [0.74, 1.12], [0.8, 1.0], [0.7, 0.92]], 0.26, 0.03),
    chasis: [-1, 1].map((s) => tubo([[s * 0.11, 1.0, 0.42], [s * 0.16, 0.96, 0.18], [s * 0.16, 0.8, -0.12], [s * 0.12, 0.6, -0.25]], 0.032)),
    escape: tubo([[-0.06, 0.68, 0.3], [-0.09, 0.42, 0.36], [-0.12, 0.24, 0.18], [-0.15, 0.25, -0.12], [-0.21, 0.42, -0.44]], 0.032),
    basculante: [-1, 1].map((s) => tubo([[s * 0.12, 0.6, -0.25], [s * 0.13, 0.45, -0.48], [s * 0.13, 0.31, -0.7]], 0.03, 16)),
    guardabarros: new THREE.TorusGeometry(0.33, 0.05, 8, 32, Math.PI * 0.55),
  }), []);
  const resorte = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 200; i++) {
      const k = i / 200, a = k * Math.PI * 2 * 9;
      pts.push(new THREE.Vector3(Math.cos(a) * 0.045, k * 0.3, Math.sin(a) * 0.045));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.008, 6, false);
  }, []);
  const qDir = useMemo(() => new THREE.Quaternion().setFromAxisAngle(EJE_DIR, direccion), [direccion]);
  const punos = PUNOS.map((p) => p.clone().sub(CABEZA_DIR).applyQuaternion(qDir).add(CABEZA_DIR));

  return (
    <group>
      <Rueda z={-0.71} giro={rodar} discos={[-1]} />
      {/* Conjunto delantero: gira alrededor del eje de dirección */}
      <group position={CABEZA_DIR} quaternion={qDir}>
        <group position={CABEZA_DIR.clone().negate()}>
          <Rueda z={0.72} giro={rodar} discos={[-1, 1]} />
          <mesh geometry={g.guardabarros} position={[0, 0.31, 0.72]} rotation={[0, Math.PI / 2, Math.PI * 0.32]} scale={[1, 1, 1.6]} material={m.pintura} />
          {[-0.1, 0.1].map((x) => (
            <group key={x}>
              <Hueso a={new THREE.Vector3(x, 0.33, 0.71)} b={new THREE.Vector3(x, 0.72, 0.555)} r1={0.032} r2={0.032} mat={m.bronce} />
              <Hueso a={new THREE.Vector3(x, 0.72, 0.555)} b={new THREE.Vector3(x, 1.1, 0.39)} r1={0.024} r2={0.024} mat={m.cromo} />
            </group>
          ))}
          <RoundedBox args={[0.3, 0.04, 0.12]} radius={0.015} position={[0, 1.08, 0.41]} material={m.grafito} />
          <Hueso a={new THREE.Vector3(-0.37, 1.15, 0.33)} b={new THREE.Vector3(0.37, 1.15, 0.33)} r1={0.014} r2={0.014} mat={m.cromo} />
          {[-1, 1].map((s) => (
            <group key={s}>
              <Hueso a={new THREE.Vector3(s * 0.3, 1.15, 0.33)} b={new THREE.Vector3(s * 0.4, 1.15, 0.33)} r1={0.022} r2={0.022} mat={m.goma} />
              <Hueso a={new THREE.Vector3(s * 0.22, 1.16, 0.35)} b={new THREE.Vector3(s * 0.3, 1.33, 0.36)} r1={0.008} r2={0.008} mat={m.cromo} />
              <mesh position={[s * 0.31, 1.35, 0.36]} scale={[1, 0.6, 0.3]} material={m.grafito}><sphereGeometry args={[0.05, 16, 12]} /></mesh>
            </group>
          ))}
          <mesh geometry={g.cupula} material={m.pintura} castShadow />
          <mesh position={[0, 1.02, 0.72]} rotation={[Math.PI / 2 - 0.25, 0, 0]} material={m.grafito}><cylinderGeometry args={[0.1, 0.11, 0.1, 32]} /></mesh>
          <mesh position={[0, 1.03, 0.775]} rotation={[Math.PI / 2 - 0.25, 0, 0]} material={m.faro}><circleGeometry args={[0.085, 32]} /></mesh>
          <mesh position={[0, 1.03, 0.776]} rotation={[-0.25, 0, 0]} material={m.oro}><torusGeometry args={[0.09, 0.006, 8, 48]} /></mesh>
          <RoundedBox args={[0.14, 0.08, 0.03]} radius={0.01} position={[0, 1.2, 0.47]} rotation={[-0.6, 0, 0]} material={m.grafito} />
          <mesh position={[0, 1.205, 0.486]} rotation={[-0.6, 0, 0]} material={m.pantalla}><planeGeometry args={[0.1, 0.05]} /></mesh>
        </group>
      </group>

      {/* Chasis multitubular, motor bicilíndrico, radiador */}
      {g.chasis.map((geo, i) => <mesh key={i} geometry={geo} material={m.bronce} castShadow />)}
      <RoundedBox args={[0.3, 0.28, 0.42]} radius={0.05} position={[0, 0.47, 0.02]} material={m.grafito} castShadow />
      <group position={[0, 0.76, 0.14]} rotation={[-0.38, 0, 0]}>
        {Array.from({length: 7}, (_, i) => (
          <RoundedBox key={i} args={[0.34, 0.012, 0.24]} radius={0.004} position={[0, i * 0.032, 0]} material={i % 2 ? m.grafito : m.cromo} />
        ))}
        <RoundedBox args={[0.24, 0.24, 0.17]} radius={0.03} position={[0, 0.1, 0]} material={m.grafito} />
      </group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.16, 0.47, -0.02]} rotation={[0, 0, Math.PI / 2]} material={m.cromo}><cylinderGeometry args={[0.11, 0.11, 0.03, 40]} /></mesh>
      ))}
      <RoundedBox args={[0.34, 0.3, 0.05]} radius={0.015} position={[0, 0.74, 0.36]} rotation={[-0.15, 0, 0]} material={m.grafito} />
      <mesh geometry={g.escape} material={m.cromo} castShadow />
      <Hueso a={new THREE.Vector3(-0.21, 0.42, -0.42)} b={new THREE.Vector3(-0.23, 0.64, -0.86)} r1={0.07} r2={0.06} mat={m.grafito} />
      <Hueso a={new THREE.Vector3(-0.23, 0.635, -0.85)} b={new THREE.Vector3(-0.235, 0.645, -0.88)} r1={0.06} r2={0.06} mat={m.cromo} />
      {g.basculante.map((geo, i) => <mesh key={i} geometry={geo} material={m.grafito} castShadow />)}
      <group position={[0, 0.55, -0.42]} rotation={[0.6, 0, 0]}>
        <mesh geometry={resorte} material={m.freno} />
        <mesh position={[0, 0.15, 0]} material={m.cromo}><cylinderGeometry args={[0.02, 0.02, 0.34, 12]} /></mesh>
      </group>
      <Hueso a={new THREE.Vector3(0.14, 0.42, -0.02)} b={new THREE.Vector3(0.14, 0.33, -0.7)} r1={0.008} r2={0.008} mat={m.oroSuave} />
      {[-1, 1].map((s) => (
        <Hueso key={s} a={new THREE.Vector3(s * 0.13, 0.42, -0.2)} b={new THREE.Vector3(s * 0.22, 0.42, -0.2)} r1={0.014} r2={0.014} mat={m.cromo} />
      ))}

      {/* Carrocería */}
      <mesh geometry={g.tanque} material={m.pintura} castShadow />
      <mesh position={[0, 1.155, 0.15]} scale={[1, 0.08, 1]} material={m.oro}><boxGeometry args={[0.05, 0.1, 0.42]} /></mesh>
      <mesh geometry={g.asiento} material={m.asiento} castShadow />
      <mesh geometry={g.colin} material={m.pintura} castShadow />
      <mesh position={[0, 1.0, -0.975]} rotation={[0, Math.PI, 0]} material={m.stop}><planeGeometry args={[0.12, 0.035]} /></mesh>

      {piloto && <Piloto punos={punos} resaltar={brazosResaltados} />}
    </group>
  );
};

const Piloto = ({punos, resaltar}: {punos: THREE.Vector3[]; resaltar: boolean}) => {
  const m = mats();
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const pelvis = V(0, 1.0, -0.33), pecho = V(0, 1.37, -0.13), cabeza = V(0, 1.61, 0.0);
  const brazo = resaltar ? m.oro : m.cuero;
  const torsoQ = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), pecho.clone().sub(pelvis).normalize());
  return (
    <group>
      {/* Torso con chamarra de cuero y joroba de protección */}
      <mesh position={pelvis.clone().add(pecho).multiplyScalar(0.5)} quaternion={torsoQ} scale={[1.3, 1, 0.85]} material={m.cuero} castShadow>
        <capsuleGeometry args={[0.15, 0.24, 8, 24]} />
      </mesh>
      <mesh position={[0, 1.36, -0.25]} quaternion={torsoQ} scale={[1, 1, 0.5]} material={m.grafito}><capsuleGeometry args={[0.1, 0.16, 6, 16]} /></mesh>
      {/* Casco con visor reflejante y franja dorada */}
      <Hueso a={V(0, 1.46, -0.08)} b={V(0, 1.53, -0.04)} r1={0.055} r2={0.055} mat={m.cuero} />
      <mesh position={cabeza} scale={[1, 1.02, 1.13]} material={m.casco} castShadow><sphereGeometry args={[0.152, 48, 32]} /></mesh>
      <mesh position={cabeza} rotation={[0, Math.PI / 2, 0]} scale={[1.13, 1.02, 1]} material={m.oro}><torusGeometry args={[0.153, 0.007, 8, 64, Math.PI]} /></mesh>
      <mesh position={[0, 1.6, 0.012]} rotation={[-0.15, 0, 0]} scale={[1, 1, 1.13]} material={m.visor}>
        <sphereGeometry args={[0.156, 40, 20, -Math.PI * 0.32 + Math.PI / 2, Math.PI * 0.64, Math.PI * 0.36, Math.PI * 0.26]} />
      </mesh>
      {/* Brazos (CI hacia los puños) y guantes */}
      {[-1, 1].map((s, i) => {
        const hombro = V(s * 0.21, 1.42, -0.1);
        const mano = punos[i].clone().add(V(-s * 0.02, 0.02, 0));
        const codo = ik(hombro, mano, 0.31, 0.31, V(s * 1, -0.8, -0.2));
        return (
          <group key={s}>
            <mesh position={hombro} material={m.cuero}><sphereGeometry args={[0.07, 20, 16]} /></mesh>
            <Hueso a={hombro} b={codo} r1={0.062} r2={0.052} mat={brazo} />
            <mesh position={codo} material={brazo}><sphereGeometry args={[0.052, 16, 12]} /></mesh>
            <Hueso a={codo} b={mano} r1={0.05} r2={0.042} mat={brazo} />
            <RoundedBox args={[0.09, 0.07, 0.11]} radius={0.025} position={mano} material={m.asiento} />
            <mesh position={mano.clone().add(V(0, 0.035, 0.02))} material={m.oroSuave}><boxGeometry args={[0.07, 0.012, 0.04]} /></mesh>
          </group>
        );
      })}
      {/* Piernas (CI hacia los estribos) y botas */}
      {[-1, 1].map((s) => {
        const cadera = V(s * 0.12, 0.97, -0.33);
        const pie = V(s * 0.2, 0.44, -0.2);
        const rodilla = ik(cadera, pie, 0.46, 0.46, V(s * 0.35, 0.2, 1));
        return (
          <group key={s}>
            <Hueso a={cadera} b={rodilla} r1={0.09} r2={0.072} mat={m.mezclilla} />
            <mesh position={rodilla} material={m.mezclilla}><sphereGeometry args={[0.072, 16, 12]} /></mesh>
            <Hueso a={rodilla} b={pie.clone().add(V(0, 0.06, 0))} r1={0.066} r2={0.055} mat={m.mezclilla} />
            <RoundedBox args={[0.1, 0.13, 0.26]} radius={0.03} position={pie.clone().add(V(0, 0.02, 0.05))} material={m.asiento} castShadow />
            <mesh position={pie.clone().add(V(0, -0.045, 0.05))} material={m.oroSuave}><boxGeometry args={[0.102, 0.012, 0.25]} /></mesh>
          </group>
        );
      })}
    </group>
  );
};
