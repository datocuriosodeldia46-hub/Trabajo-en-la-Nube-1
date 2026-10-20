import {useMemo} from 'react';
import {ORO, ROJO} from './Moto';
import {Camara, Carretera, Estela, Etiqueta, Flecha, Huella, MotoEn, Suelo} from './Escenario';
import {Estado, estadoEn, lerp, local, remuestrear, simular, tramo} from './util';

// Línea de tiempo (segundos de la narración)
export const ESCENAS = [
  {id: 'gancho', de: 0, a: 6.75},
  {id: 'pregunta', de: 6.75, a: 11.8},
  {id: 'ochenta', de: 11.8, a: 15.95},
  {id: 'coche', de: 15.95, a: 21.35},
  {id: 'mecanismo', de: 21.35, a: 31.85},
  {id: 'solita', de: 31.85, a: 36.25},
  {id: 'bici', de: 36.25, a: 42.9},
  {id: 'delargo', de: 42.9, a: 48.6},
  {id: 'final', de: 48.6, a: 58.6},
] as const;

// Todo el mundo se dibuja desplazado para que el ancla (la moto) quede en el origen: así las sombras siempre caen bien
const Mundo = ({a, children}: {a: {x: number; z: number}; children: React.ReactNode}) => (
  <group position={[-a.x, 0, -a.z]}>
    <Suelo ax={a.x} az={a.z} />
    {children}
  </group>
);
const rel = (a: {x: number; z: number}, p: [number, number, number]): [number, number, number] => [p[0] - a.x, p[1], p[2] - a.z];
const camSigue = (e: Estado, lx: number, ly: number, lz: number, mz = 3, my = 1): {pos: [number, number, number]; mira: [number, number, number]} => {
  const s = {...e, lean: 0};
  return {pos: rel(e, local(s, lx, ly, lz)), mira: rel(e, local(s, 0, my, mz))};
};
const usarCamino = (sim: Estado[]) => useMemo(() => remuestrear(sim.map((e) => ({x: e.x, z: e.z})), 1, 60), [sim]);

// 1. Gancho: empujas a la izquierda… y la moto se va a la derecha
export const Gancho = ({t}: {t: number}) => {
  const sim = useMemo(() => simular(7, (u) => ({
    v: 11,
    dir: 0.24 * (tramo(u, 2.5, 2.9) - tramo(u, 3.3, 3.9)),
    lean: 0.58 * tramo(u, 3.0, 4.3),
  }), 0, -20), []);
  const camino = usarCamino(sim);
  const e = estadoEn(sim, t);
  const c = camSigue(e, -2.4, 3.4, -6.2, 4, 0.9);
  const puno = local(e, -0.4, 1.45, 0.55);
  return (
    <>
      <Camara pos={c.pos} mira={c.mira} fov={42 - 4 * tramo(t, 0, 6.7)} />
      <Mundo a={e}>
        <Carretera pts={camino} />
        <MotoEn e={e} />
        <Flecha de={puno} dir={[Math.sin(e.h), 0, Math.cos(e.h)]} largo={0.9 * (tramo(t, 2.4, 2.7) - tramo(t, 3.9, 4.2))} />
        <Etiqueta p={puno} texto="EMPUJAS ESTE PUÑO" vis={tramo(t, 2.5, 2.8) - tramo(t, 4.3, 4.5)} alto={110} />
        <Etiqueta p={local(e, 0, 2.1, 0)} texto="… Y SE VA A LA DERECHA" vis={tramo(t, 4.4, 4.7)} alto={70} />
      </Mundo>
    </>
  );
};

// 2. ¿Quién gira? No son tus brazos: es la inclinación
export const Pregunta = ({t}: {t: number}) => {
  const sim = useMemo(() => simular(5.2, (u) => ({v: 9, dir: 0, lean: 0.55 * tramo(u, 3.85, 4.7)})), []);
  const camino = usarCamino(sim);
  const e = estadoEn(sim, t);
  // de un primer plano lateral de los brazos a una vista trasera baja
  const k = tramo(t, 3.7, 4.6);
  const c = camSigue(e, lerp(-3.4, -0.3, k), lerp(2.3, 1.3, k), lerp(1.2, -4.8, k), lerp(0.3, 3, k), lerp(1.3, 1, k));
  const brazos = t > 2.6 && t < 3.9;
  return (
    <>
      <Camara pos={c.pos} mira={c.mira} fov={lerp(42, 44, k)} />
      <Mundo a={e}>
        <Carretera pts={camino} />
        <MotoEn e={e} brazos={brazos} />
        <Etiqueta p={local(e, -0.3, 1.5, 0.3)} texto="¿TUS BRAZOS? ✕" color={ROJO} vis={tramo(t, 2.65, 2.9) - tramo(t, 3.7, 3.9)} alto={80} />
        <Etiqueta p={local(e, 0, 2.05, 0)} texto={`INCLINACIÓN ${Math.round((e.lean * 180) / Math.PI)}°`} vis={tramo(t, 4.0, 4.3)} alto={60} />
      </Mundo>
    </>
  );
};

// 3. Vas a 80 y aparece una curva cerrada
export const Ochenta = ({t}: {t: number}) => {
  const camino = useMemo(() => {
    const pts: {x: number; z: number}[] = [];
    for (let z = -10; z <= 60; z += 1) pts.push({x: 0, z});
    const R = 14;
    for (let a = 0; a <= Math.PI / 2; a += 0.05) pts.push({x: -R + R * Math.cos(a), z: 60 + R * Math.sin(a)});
    for (let x = -R - 1; x > -R - 60; x -= 1) pts.push({x, z: 60 + R});
    return pts;
  }, []);
  const z = -2 + t * 12;
  const e: Estado = {x: 0, z, h: 0, lean: 0, dir: 0, dist: t * 22, v: 22};
  const vib = Math.sin(t * 47) * 0.02;
  const chevrones = useMemo(() => Array.from({length: 7}, (_, i) => {
    const a = (i / 6) * (Math.PI / 2);
    const R = 16.6;
    return {x: -14 + R * Math.cos(a), z: 60 + R * Math.sin(a), r: -a};
  }), []);
  return (
    <>
      <Camara pos={[0.6, 1.9 + vib, -4.2]} mira={[0, 1.2, 12]} fov={50} />
      <Mundo a={e}>
        <Carretera pts={camino} />
        <MotoEn e={e} />
        {chevrones.map((c, i) => (
          <group key={i} position={[c.x, 1, c.z]} rotation={[0, c.r + Math.PI / 2, 0]}>
            <mesh><boxGeometry args={[1.1, 0.7, 0.05]} /><meshStandardMaterial color={ROJO} emissive={ROJO} emissiveIntensity={1.6 * tramo(t, 2.8, 3.2)} toneMapped={false} /></mesh>
          </group>
        ))}
        <Etiqueta p={[-4, 2.5, 66]} texto="CURVA CERRADA" color={ROJO} vis={tramo(t, 3.1, 3.4)} alto={60} tam={36} />
      </Mundo>
    </>
  );
};

// Coche low-poly para la comparación
const Coche = ({dir}: {dir: number}) => (
  <group>
    <mesh position={[0, 0.62, 0]} castShadow><boxGeometry args={[1.8, 0.6, 4]} /><meshStandardMaterial color="#4a6fa5" roughness={0.4} metalness={0.3} /></mesh>
    <mesh position={[0, 1.15, -0.25]} castShadow><boxGeometry args={[1.55, 0.5, 2]} /><meshStandardMaterial color="#1a2433" roughness={0.1} metalness={0.6} /></mesh>
    {[[-0.9, -1.35, 0], [0.9, -1.35, 0], [-0.9, 1.35, 1], [0.9, 1.35, 1]].map(([x, z, del], i) => (
      <group key={i} position={[x, 0.36, z]} rotation={[0, del ? dir : 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.36, 0.36, 0.28, 24]} /><meshStandardMaterial color="#11151d" /></mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.24, 0.02, 8, 24]} /><meshStandardMaterial color={ORO} emissive={ORO} emissiveIntensity={2} toneMapped={false} /></mesh>
      </group>
    ))}
  </group>
);

// 4. Una moto no gira como un coche: primero se cae hacia adentro
export const VsCoche = ({t}: {t: number}) => {
  const coche = useMemo(() => simular(5.6, (u) => ({v: 4.5 * (1 - tramo(u, 2.8, 3.6)), lean: 0, dir: -0.3 * tramo(u, 0.85, 1.2), directo: 1}), -1.9, 0, 0, 2.7), []);
  const moto = useMemo(() => simular(5.6, (u) => ({v: 4.5, dir: 0.18 * (tramo(u, 3.1, 3.4) - tramo(u, 3.6, 3.9)), lean: 0.6 * tramo(u, 3.4, 4.4)}), 1.9, 0), []);
  const ec = estadoEn(coche, t), em = estadoEn(moto, t);
  const a = {x: (ec.x + em.x) / 2, z: (ec.z + em.z) / 2};
  return (
    <>
      <Camara pos={[0.3, 9.5, -13]} mira={[0, 0.4, 3.5]} fov={50} />
      <Mundo a={a}>
        <group position={[ec.x, 0, ec.z]} rotation={[0, ec.h, 0]}><Coche dir={ec.dir} /></group>
        <MotoEn e={em} />
        <Etiqueta p={local(ec, 0, 1.6, 0)} texto="COCHE: GIRA LAS LLANTAS" vis={tramo(t, 0.9, 1.2)} alto={50} tam={26} />
        <Etiqueta p={local(em, 0, 2.05, 0)} texto="MOTO: PRIMERO SE CAE" vis={tramo(t, 3.5, 3.8)} alto={50} tam={26} />
        <Estela pts={coche.slice(0, Math.round(t * 30) + 1).map((s) => ({x: s.x, z: s.z}))} color="#6f9be0" />
        <Estela pts={moto.slice(0, Math.round(t * 30) + 1).map((s) => ({x: s.x, z: s.z}))} />
      </Mundo>
    </>
  );
};

// 5. El mecanismo, visto desde atrás: puño derecho → llanta a la izquierda → ruedas se van → peso a la derecha
export const Mecanismo = ({t}: {t: number}) => {
  // el piso avanza; la moto va recta. `base` mueve las ruedas a la izquierda (+x); el centro de masa se queda
  const T = (s: number) => s - 21.35; // tiempos de la narración → tiempo local
  const dir = 0.3 * (tramo(t, T(23.4), T(24.2)) - tramo(t, T(27.0), T(28.2)));
  const base = 0.42 * tramo(t, T(26.4), T(29.2)) + 0.2 * tramo(t, T(29.6), T(31.3));
  const lean = Math.asin(Math.min(0.9, base / 1.1));
  const e: Estado = {x: 0, z: t * 7, h: 0, lean, dir, dist: t * 7, v: 7};
  const cm: [number, number, number] = [0, 1.1, e.z];
  const ruedaD = local({...e, x: base}, 0, 0, 0.78), ruedaT = local({...e, x: base}, 0, 0, -0.72);
  const camino = useMemo(() => Array.from({length: 140}, (_, i) => ({x: 0, z: -20 + i})), []);
  const puno = local({...e, x: base}, -0.4, 1.45, 0.55);
  return (
    <>
      <Camara pos={[-0.35, 2.3, -4.3]} mira={[0.1, 0.95, 1.2]} fov={44} />
      <Mundo a={{x: 0, z: e.z}}>
        <Carretera pts={camino} />
        <MotoEn e={e} base={base} />
        <Flecha de={puno} dir={[0, 0, 1]} largo={0.8 * (tramo(t, T(21.8), T(22.1)) - tramo(t, T(23.2), T(23.5)))} />
        <Etiqueta p={puno} texto="EMPUJAS EL PUÑO DERECHO" vis={tramo(t, T(21.8), T(22.1)) - tramo(t, T(23.2), T(23.4))} alto={120} tam={28} />
        <Etiqueta p={local({...e, x: base}, 0, 0.66, 1.0)} texto="← LA LLANTA, A LA IZQUIERDA" vis={tramo(t, T(23.5), T(23.8)) - tramo(t, T(26.2), T(26.4))} alto={170} tam={28} />
        <Huella p={ruedaD} vis={tramo(t, T(23.4), T(23.8))} />
        <Huella p={ruedaT} vis={tramo(t, T(23.4), T(23.8))} />
        <Flecha de={[ruedaT[0] - 0.1, 0.05, ruedaT[2]]} dir={[1, 0, 0]} largo={0.9 * (tramo(t, T(26.4), T(26.8)) - tramo(t, T(29.3), T(29.6)))} />
        <Etiqueta p={[base + 0.2, 0.05, e.z - 0.5]} texto="← LAS RUEDAS SE VAN" vis={tramo(t, T(26.5), T(26.8)) - tramo(t, T(29.3), T(29.5))} alto={70} tam={26} />
        {/* Centro de masa y su vertical */}
        <mesh position={cm} renderOrder={10}><sphereGeometry args={[0.14, 20, 16]} /><meshBasicMaterial color={ORO} depthTest={false} transparent opacity={tramo(t, T(26.4), T(26.8))} /></mesh>
        <Etiqueta p={[cm[0], cm[1] + 0.15, cm[2]]} texto="CENTRO DE MASA" vis={tramo(t, T(26.9), T(27.2)) - tramo(t, T(29.5), T(29.7))} alto={150} tam={26} />
        {Array.from({length: 8}, (_, i) => (
          <mesh key={i} position={[0, 1.0 - i * 0.13, e.z]} renderOrder={10}><boxGeometry args={[0.03, 0.07, 0.03]} /><meshBasicMaterial color={ORO} depthTest={false} transparent opacity={tramo(t, T(26.6), T(27))} /></mesh>
        ))}
        <Flecha de={[cm[0], cm[1], cm[2]]} dir={[-1, -0.35, 0]} largo={0.9 * tramo(t, T(29.7), T(30.1))} color={ROJO} grosor={0.06} />
        <Etiqueta p={[cm[0] + 0.05, cm[1] + 0.25, cm[2]]} texto="TU PESO → DERECHA" color={ROJO} vis={tramo(t, T(29.8), T(30.1))} alto={60} tam={28} />
      </Mundo>
    </>
  );
};

// 6. Se inclina… y la llanta gira solita hacia la curva
export const Solita = ({t}: {t: number}) => {
  const sim = useMemo(() => simular(4.6, (u) => ({v: 10, lean: 0.6, dir: -0.08 * tramo(u, 2.7, 3.1)})), []);
  const camino = usarCamino(sim);
  const e = estadoEn(sim, t);
  const ang = lerp(-2.6, -1.2, tramo(t, 0, 4.4));
  const c = camSigue(e, Math.sin(ang) * 5, 2.6, Math.cos(ang) * 5, 0.5, 0.9);
  const ruedaD = local(e, 0, 0.35, 0.78);
  return (
    <>
      <Camara pos={c.pos} mira={c.mira} fov={40} />
      <Mundo a={e}>
        <Carretera pts={camino} />
        <MotoEn e={e} />
        <Estela pts={sim.slice(Math.round(t * 30), Math.round(t * 30) + 60).map((s) => ({x: s.x, z: s.z}))} y={0.04} grosor={0.04} />
        <Etiqueta p={ruedaD} texto="GIRA SOLITA" vis={tramo(t, 2.9, 3.2)} alto={130} />
      </Mundo>
    </>
  );
};

// 7. A vuelta de rueda manejas como bici; arriba de 20 km/h, al revés
export const Bici = ({t}: {t: number}) => {
  const sim = useMemo(() => simular(6.8, (u) => {
    const rapido = tramo(u, 3.0, 4.2);
    return {
      v: lerp(2.6, 9, rapido),
      directo: lerp(1, 0.15, rapido),
      dir: -0.5 * (tramo(u, 1.7, 2.1) - tramo(u, 2.7, 3.0)) + 0.22 * (tramo(u, 5.5, 5.8) - tramo(u, 6.0, 6.3)),
      lean: 0.55 * tramo(u, 5.8, 6.6),
    };
  }), []);
  const e = estadoEn(sim, t);
  const camino = usarCamino(sim);
  const huella = sim.slice(0, Math.round(t * 30) + 1).map((s) => ({x: s.x, z: s.z}));
  return (
    <>
      <Camara pos={[1.5, 9, -5]} mira={[0, 0, 1.5]} fov={45} />
      <Mundo a={e}>
        <Carretera pts={camino} ancho={5} />
        <MotoEn e={e} />
        <Estela pts={huella} color={t < 3 ? '#8fd6ff' : ORO} />
        <Etiqueta p={local(e, 0, 2, 0)} texto="DIRECTO, COMO BICI" color="#8fd6ff" vis={tramo(t, 1.75, 2.0) - tramo(t, 2.9, 3.1)} alto={50} />
        <Etiqueta p={local(e, 0, 2, 0)} texto="AL REVÉS" vis={tramo(t, 5.5, 5.75)} alto={50} tam={40} />
      </Mundo>
    </>
  );
};

// 8. El que jala el manubrio hacia la curva… se sigue de largo
export const DeLargo = ({t}: {t: number}) => {
  const curva = useMemo(() => {
    const pts: {x: number; z: number}[] = [];
    for (let z = -40; z < 0; z += 1) pts.push({x: 0, z});
    const R = 14;
    for (let a = 0; a <= Math.PI / 2 + 0.001; a += 0.04) pts.push({x: -R + R * Math.cos(a), z: R * Math.sin(a)});
    for (let x = -R - 1; x > -R - 50; x -= 1) pts.push({x, z: R});
    return pts;
  }, []);
  const sim = useMemo(() => simular(5.8, (u) => ({
    v: 10,
    dir: -0.22 * tramo(u, 2.7, 3.1),
    lean: -0.18 * tramo(u, 2.9, 3.6),
  }), 0, -27), []);
  const e = estadoEn(sim, t);
  const rastro = sim.slice(0, Math.round(t * 30) + 1).map((s) => ({x: s.x, z: s.z}));
  const ideal = useMemo(() => curva.filter((p, i) => i % 2 === 0), [curva]);
  return (
    <>
      <Camara pos={[9, 23, -25]} mira={[-5, 0, -3]} fov={46} />
      <Mundo a={{x: 0, z: 0}}>
        <Carretera pts={curva} ancho={5} />
        <Estela pts={ideal} y={0.05} grosor={0.06} />
        <Estela pts={rastro} color={ROJO} y={0.06} grosor={0.09} />
        <MotoEn e={e} />
        <Etiqueta p={local(e, 0, 2, 0)} texto="JALAS HACIA LA CURVA" color={ROJO} vis={tramo(t, 2.75, 3.0) - tramo(t, 4.3, 4.5)} alto={60} tam={34} />
        <Etiqueta p={local(e, 0, 2, 0)} texto="SE SIGUE DE LARGO" color={ROJO} vis={tramo(t, 4.5, 4.75)} alto={60} tam={40} />
        <Etiqueta p={[-10, 0.2, 10]} texto="LA CURVA" vis={tramo(t, 0.6, 0.9) - tramo(t, 2.6, 2.8)} alto={50} tam={26} />
      </Mundo>
    </>
  );
};

// 9-10. Cierre: la moto cae hacia la curva con su estela dorada; la cámara la rodea y se eleva
export const Final = ({t}: {t: number}) => {
  const sim = useMemo(() => simular(10.2, () => ({v: 10.5, lean: 0.62, dir: -0.06})), []);
  const camino = usarCamino(sim);
  const e = estadoEn(sim, t);
  const i = Math.round(t * 30);
  const estela = sim.slice(Math.max(0, i - 75), i + 1).map((s) => ({x: s.x, z: s.z}));
  const ang = 2.3 + t * 0.32;
  const sube = tramo(t, 4.8, 9.5);
  const r = lerp(6.2, 8.5, sube);
  const c = camSigue(e, Math.sin(ang) * r, lerp(1.3, 4.2, sube), Math.cos(ang) * r, 0, lerp(0.9, 0.3, sube));
  return (
    <>
      <Camara pos={c.pos} mira={c.mira} fov={lerp(38, 46, sube)} />
      <Mundo a={e}>
        <Carretera pts={camino} />
        <Estela pts={estela} y={0.04} grosor={0.07} />
        <MotoEn e={e} />
      </Mundo>
    </>
  );
};
