import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {ORO} from './Moto';
import {Efectos, Entorno, golpe, Luces} from './Escenario';
import EVENTOS from './eventos.json';
import {Bici, DeLargo, ESCENAS, Final, Gancho, Mecanismo, Ochenta, Pregunta, Solita, VsCoche} from './Escenas';
import {CLAVE, PALABRAS} from './palabras';
import {tramo} from './util';

export const DURACION = 58.6;
const SANS = 'Helvetica, Arial, sans-serif';

const COMPONENTES = {gancho: Gancho, pregunta: Pregunta, ochenta: Ochenta, coche: VsCoche, mecanismo: Mecanismo, solita: Solita, bici: Bici, delargo: DeLargo, final: Final};

// Frases de subtítulo: se corta en puntuación o cada 4 palabras
const FRASES = (() => {
  const out: number[][] = [];
  let cur: number[] = [];
  PALABRAS.forEach(([w], i) => {
    cur.push(i);
    if (/[.,?]$/.test(w) || cur.length === 3) { out.push(cur); cur = []; }
  });
  if (cur.length) out.push(cur);
  return out;
})();

const Subtitulos = ({s}: {s: number}) => {
  const {fps} = useVideoConfig();
  const k = PALABRAS.findIndex(([, a], i) => s >= a - 0.05 && (i === PALABRAS.length - 1 || s < PALABRAS[i + 1][1] - 0.05));
  if (k < 0) return null;
  const frase = FRASES.find((f) => f.includes(k))!;
  return (
    <div style={{position: 'absolute', top: 250, width: '100%', padding: '0 70px', textAlign: 'center', fontFamily: SANS,
      fontSize: 84, fontWeight: 900, lineHeight: 1.15, letterSpacing: -1, textShadow: '0 4px 18px rgba(0,0,0,.8)'}}>
      {frase.map((i) => {
        if (i > k) return null;
        const [w, a] = PALABRAS[i];
        const actual = i === k;
        const clave = CLAVE.has(w);
        const pop = spring({frame: Math.round((s - a) * fps), fps, config: {damping: 14, stiffness: 220}, durationInFrames: 8});
        return (
          <span key={i} style={{display: 'inline-block', margin: '0 12px',
            color: clave ? ORO : actual ? '#ffffff' : 'rgba(235,240,250,.6)', transform: `scale(${actual ? 0.82 + 0.18 * pop : 1}) translateY(${actual ? (1 - pop) * 14 : 0}px)`,
            WebkitTextStroke: '2px rgba(0,0,0,.55)', textShadow: clave ? `0 0 28px ${ORO}88, 0 6px 18px rgba(0,0,0,.9)` : '0 6px 18px rgba(0,0,0,.9)'}}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

// Velocímetro (escenas de velocidad)
const Velocimetro = ({kmh, vis, marca}: {kmh: number; vis: number; marca?: number}) => {
  if (vis <= 0) return null;
  const ang = (v: number) => -120 + (Math.min(v, 100) / 100) * 240;
  const p = (v: number, r: number) => [200 + r * Math.sin((ang(v) * Math.PI) / 180), 200 - r * Math.cos((ang(v) * Math.PI) / 180)];
  return (
    <div style={{position: 'absolute', bottom: 210, left: 340, width: 400, height: 400, opacity: vis}}>
      <svg width={400} height={400}>
        <path d={`M ${p(0, 160).join(' ')} A 160 160 0 1 1 ${p(100, 160).join(' ')}`} stroke="rgba(255,255,255,.18)" strokeWidth={14} fill="none" strokeLinecap="round" />
        <path d={`M ${p(0, 160).join(' ')} A 160 160 0 ${ang(kmh) + 120 > 180 ? 1 : 0} 1 ${p(kmh, 160).join(' ')}`} stroke={ORO} strokeWidth={14} fill="none" strokeLinecap="round" style={{filter: `drop-shadow(0 0 10px ${ORO})`}} />
        {marca !== undefined && <line x1={p(marca, 140)[0]} y1={p(marca, 140)[1]} x2={p(marca, 182)[0]} y2={p(marca, 182)[1]} stroke="#ff4d5a" strokeWidth={6} />}
      </svg>
      <div style={{position: 'absolute', top: 120, width: '100%', textAlign: 'center', fontFamily: SANS, color: 'white'}}>
        <div style={{fontSize: 130, fontWeight: 800, lineHeight: 1}}>{Math.round(kmh)}</div>
        <div style={{fontSize: 30, letterSpacing: 6, opacity: 0.7}}>KM/H</div>
      </div>
    </div>
  );
};

// Cierre: botón de seguir y menú de compartir
const Compartir = ({s}: {s: number}) => {
  const seguir = tramo(s, 53.65, 53.95) - tramo(s, 54.25, 54.45);
  const hoja = tramo(s, 54.35, 54.8);
  const elegido = s > 55.1;
  const enviado = s > 56.4;
  const contactos = ['Compa', 'Toño', 'Luis', 'Pao'];
  return (
    <>
      {seguir > 0 && (
        <div style={{position: 'absolute', top: 1180, width: '100%', textAlign: 'center', opacity: seguir, transform: `scale(${0.8 + 0.2 * seguir})`}}>
          <span style={{fontFamily: SANS, fontSize: 56, fontWeight: 800, color: '#0b1324', background: ORO, padding: '18px 60px', borderRadius: 60}}>+ Seguir</span>
        </div>
      )}
      {hoja > 0 && (
        <div style={{position: 'absolute', left: 60, right: 60, bottom: 120, transform: `translateY(${(1 - hoja) * 700}px)`, background: 'rgba(16,22,36,.96)',
          borderRadius: 40, padding: 50, border: '1px solid rgba(255,255,255,.08)', fontFamily: SANS, color: 'white'}}>
          <div style={{fontSize: 34, opacity: 0.6, marginBottom: 36}}>Enviar a…</div>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            {contactos.map((c, i) => (
              <div key={c} style={{textAlign: 'center', width: 180}}>
                <div style={{width: 140, height: 140, margin: '0 auto', borderRadius: 70, background: ['#3b5b8f', '#7a4b8f', '#3f7f6a', '#8f5b3b'][i],
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, fontWeight: 800,
                  boxShadow: i === 0 && elegido ? `0 0 0 8px ${ORO}` : 'none'}}>{c[0]}</div>
                <div style={{fontSize: 32, marginTop: 16}}>{c}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop: 50, textAlign: 'center', fontSize: 44, fontWeight: 800, padding: '26px 0', borderRadius: 24,
            background: enviado ? '#2f9e66' : ORO, color: enviado ? 'white' : '#0b1324'}}>{enviado ? '✓ Enviado' : 'Enviar'}</div>
        </div>
      )}
    </>
  );
};

export const Contramanillar = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const s = frame / fps;
  const esc = ESCENAS.find((e) => s >= e.de && s < e.a) ?? ESCENAS[ESCENAS.length - 1];
  const t = s - esc.de;
  const Escena = COMPONENTES[esc.id];
  // destello corto en cada corte
  const flash = interpolate(t, [0, 0.1], [0.22, 0], {extrapolateRight: 'clamp'});
  // barrido (latigazo) alrededor de cada corte: desenfoque que sube antes y baja después
  const latigo = EVENTOS.cortes.reduce((acc, c) => Math.max(acc, Math.max(0, 1 - Math.abs(s - c) / 0.1)), 0);
  const velOchenta = esc.id === 'ochenta' ? tramo(t, 0, 0.4) : 0;
  const velBici = esc.id === 'bici' ? tramo(t, 0.2, 0.5) : 0;
  const kmhBici = esc.id === 'bici' ? interpolate(t, [0, 3, 4.2, 6.6], [10, 10, 34, 36], {extrapolateRight: 'clamp'}) : 0;

  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, #16233d 0%, #0b1324 55%, #060a14 100%)'}}>
      <Audio src={staticFile('mezcla.wav')} />
      <AbsoluteFill style={{filter: latigo > 0.02 ? `blur(${latigo * 14}px)` : undefined, transform: `scale(${1 + latigo * 0.06})`}}>
        <ThreeCanvas width={width} height={height} shadows gl={{antialias: true}} camera={{fov: 40, near: 0.05, far: 300}}>
          <Entorno />
          <Luces />
          <Escena t={t} />
          <Efectos s={s} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Velocimetro kmh={80 + Math.sin(s * 9) * 0.6} vis={velOchenta} />
      <Velocimetro kmh={kmhBici} vis={velBici} marca={20} />
      {esc.id === 'final' && <Compartir s={s} />}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,.55) 100%)', pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: 'white', opacity: flash, pointerEvents: 'none'}} />
      <Subtitulos s={s} />
    </AbsoluteFill>
  );
};
