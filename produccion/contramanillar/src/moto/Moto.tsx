import * as THREE from 'three';

// Paleta "3D profundo": cuerpo mate, acentos dorados que brillan
export const ORO = '#f5c451';
export const ROJO = '#ff4d5a';
const CUERPO = '#e3e8f1';
const OSCURO = '#3d4759';
const LLANTA = '#222936';

const Mate = ({c, r = 0.55, m = 0.2}: {c: string; r?: number; m?: number}) => <meshStandardMaterial color={c} roughness={r} metalness={m} />;
const Brillo = ({c = ORO, i = 2}: {c?: string; i?: number}) => <meshStandardMaterial color={c} emissive={c} emissiveIntensity={i} toneMapped={false} />;

export const Rueda = ({z, giro = 0}: {z: number; giro?: number}) => (
  <group position={[0, 0.33, z]} rotation={[giro, 0, 0]}>
    <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.27, 0.075, 16, 48]} /><Mate c={LLANTA} r={0.9} /></mesh>
    <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.2, 0.012, 8, 48]} /><Brillo /></mesh>
    <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.2, 0.2, 0.03, 32]} /><Mate c={OSCURO} m={0.6} r={0.4} /></mesh>
    {[0, 1, 2, 3, 4].map((k) => (
      <mesh key={k} rotation={[(k * Math.PI * 2) / 5, 0, 0]}><boxGeometry args={[0.035, 0.38, 0.03]} /><Mate c="#8a93a3" m={0.7} r={0.3} /></mesh>
    ))}
  </group>
);

type Props = {
  direccion?: number;    // ángulo del manubrio en rad (+ = izquierda del piloto)
  rodar?: number;        // ángulo de giro de las ruedas
  piloto?: boolean;
  brazosResaltados?: boolean;
  fantasma?: number;     // 0..1 opacidad para versión "fantasma"
};

// Moto low-poly: eje longitudinal +z (adelante), suelo en y=0
export const Moto = ({direccion = 0, rodar = 0, piloto = true, brazosResaltados = false}: Props) => {
  const rake = -0.42; // inclinación de la horquilla
  return (
    <group>
      <Rueda z={-0.72} giro={rodar} />
      {/* Conjunto delantero que gira sobre el eje de dirección */}
      <group position={[0, 1.05, 0.48]} rotation={[rake, 0, 0]}>
        <group rotation={[0, direccion, 0]}>
          <group rotation={[-rake, 0, 0]} position={[0, -1.05, -0.48]}>
            <Rueda z={0.78} giro={rodar} />
            {[-0.11, 0.11].map((x) => (
              <mesh key={x} position={[x, 0.72, 0.64]} rotation={[rake, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 0.85, 12]} /><Mate c="#9aa3b3" m={0.8} r={0.25} /></mesh>
            ))}
            <mesh position={[0, 0.66, 0.79]} rotation={[0.3, 0, 0]}><boxGeometry args={[0.2, 0.05, 0.42]} /><Mate c={CUERPO} /></mesh>
            {/* Manubrio y puños */}
            <group position={[0, 1.12, 0.5]}>
              <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.02, 0.02, 0.78, 12]} /><Mate c="#9aa3b3" m={0.8} r={0.25} /></mesh>
              {[-0.36, 0.36].map((x) => (
                <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.032, 0.032, 0.14, 12]} /><Mate c={OSCURO} r={0.9} /></mesh>
              ))}
            </group>
            <mesh position={[0, 1.0, 0.7]}><sphereGeometry args={[0.09, 20, 16]} /><Brillo c="#fff4d6" i={3} /></mesh>
          </group>
        </group>
      </group>
      {/* Chasis, motor, tanque, asiento, escape */}
      <mesh position={[0, 0.55, -0.02]}><boxGeometry args={[0.3, 0.34, 0.5]} /><Mate c={OSCURO} m={0.5} r={0.45} /></mesh>
      <mesh position={[0, 0.98, 0.2]} rotation={[0.12, 0, 0]} scale={[0.55, 0.42, 1]}><capsuleGeometry args={[0.28, 0.3, 8, 20]} /><Mate c={CUERPO} r={0.35} m={0.3} /></mesh>
      <mesh position={[0, 0.98, 0.2]} rotation={[0.12, 0, 0]} scale={[0.56, 0.05, 1.02]}><capsuleGeometry args={[0.28, 0.3, 8, 20]} /><Brillo /></mesh>
      <mesh position={[0, 0.92, -0.38]} rotation={[-0.08, 0, 0]}><boxGeometry args={[0.28, 0.08, 0.6]} /><Mate c={OSCURO} r={0.9} /></mesh>
      <mesh position={[0, 0.78, -0.62]} rotation={[0.35, 0, 0]}><boxGeometry args={[0.24, 0.1, 0.45]} /><Mate c={CUERPO} /></mesh>
      <mesh position={[0.17, 0.42, -0.45]} rotation={[Math.PI / 2 - 0.15, 0, 0]}><cylinderGeometry args={[0.05, 0.06, 0.65, 16]} /><Mate c="#a7afbd" m={0.9} r={0.2} /></mesh>
      <mesh position={[0, 0.66, -0.36]} rotation={[0.9, 0, 0]}><boxGeometry args={[0.06, 0.06, 0.62]} /><Mate c="#9aa3b3" m={0.8} /></mesh>
      {piloto && <Piloto direccion={direccion} resaltar={brazosResaltados} />}
    </group>
  );
};

// Segmento entre dos puntos (para brazos y piernas)
const Seg = ({a, b, r, children}: {a: THREE.Vector3; b: THREE.Vector3; r: number; children: React.ReactNode}) => {
  const d = new THREE.Vector3().subVectors(b, a);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const m = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  return <mesh position={m} quaternion={q}><capsuleGeometry args={[r, d.length(), 6, 12]} />{children}</mesh>;
};

const Piloto = ({direccion, resaltar}: {direccion: number; resaltar: boolean}) => {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const hombro = (s: number) => V(s * 0.2, 1.55, -0.05);
  // los puños se mueven con el manubrio (aprox. rotación en Y alrededor del eje de dirección)
  const puno = (s: number) => {
    const x = s * 0.36, z = 0.5 - 0.0;
    return V(x * Math.cos(direccion), 1.42, 0.52 - x * Math.sin(direccion) * 1.0 + (z - 0.5));
  };
  const traje = <Mate c="#56678a" r={0.7} />;
  const brazo = resaltar ? <Brillo c={ORO} i={1.6} /> : traje;
  return (
    <group>
      <Seg a={V(0, 1.0, -0.35)} b={V(0, 1.5, -0.1)} r={0.17}>{traje}</Seg>
      <mesh position={[0, 1.78, 0.02]}><sphereGeometry args={[0.16, 24, 18]} /><Mate c={CUERPO} r={0.3} m={0.4} /></mesh>
      <mesh position={[0, 1.79, 0.13]} scale={[1, 0.55, 0.6]}><sphereGeometry args={[0.13, 20, 12]} /><Mate c="#0c0f15" r={0.1} m={0.8} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Seg a={hombro(s)} b={puno(s)} r={0.055}>{brazo}</Seg>
          <Seg a={V(s * 0.14, 0.95, -0.32)} b={V(s * 0.24, 0.62, 0.0)} r={0.075}>{traje}</Seg>
          <Seg a={V(s * 0.24, 0.62, 0.0)} b={V(s * 0.2, 0.32, -0.2)} r={0.06}>{traje}</Seg>
        </group>
      ))}
    </group>
  );
};
