# ChatGPT × Claude: selección de temas y motor narrativo (antes de producir)

> Este documento es para **elegir temas**. No se produce nada hasta que los elijas.
> Base: las transcripciones y el análisis de cámara generados con código en `analisis/` (ver sección 4).

---

## 1. El motor narrativo: "expectativa rota en cadena"

Cada video encadena **preguntas mentales** → **expectativas** → **quiebres** → **recompensas**. Nunca dejamos pasar más de 5–8 s sin abrir una duda nueva ni más de 3–4 s sin un estímulo visual nuevo.

| Beat | Tiempo (video de 60–75 s) | Qué pasa en la mente del espectador | Herramienta |
|---|---|---|---|
| **1. Impacto** | 0–2 s | "¿Qué? ¿Cómo que…?" (interrupción de patrón) | Una frase que contradice lo normal más una imagen incongruente en el primer cuadro |
| **2. Ancla** | 2–6 s | "Ah, esto es como aquella vez que…" | Se activa un **antecedente** que el público ya conoce (un meme, una noticia, un miedo común) |
| **3. Expectativa** | 6–15 s | "Seguro va a pasar X" | Los personajes *parecen* ir hacia X. Se abre un loop sin resolver |
| **4. Quiebre 1** | 15–20 s | "Espera… no era eso" | Contraste: pasa lo contrario de X. **Cambio de ángulo o arco de cámara** en el instante del giro |
| **5. Escalada** | 20–45 s | "¿Entonces qué? ¿Y por qué?" | Cada respuesta abre otra pregunta ("sí, pero…"). Micro-recompensas cada 5–8 s y un estímulo visual cada 3–4 s (corte, arco, inserto, objeto) |
| **6. Recompensa** | 45–60 s | "Esto me sirve" (guardado) | El insight real: una lista de 3 accionables o una definición en una frase |
| **7. Quiebre final** | 60–75 s | "JAJA" o "no me lo esperaba" (compartido) | Un remate que **reinterpreta el hook** (callback) y, si se puede, un loop al primer cuadro |

**Evidencia de que funciona.** El video de Dan (409K) ya usa este motor:
- **Ancla**: el meme *"make no mistakes"*.
- **Expectativa**: "Claude se lo va a construir".
- **Quiebre**: *"Who is it for, brother?"*.
- **Escalada**: una cadena de preguntas.
- **Recompensa**: el framework más *"Compliments are easy. Commitment tells you more."*
- **Quiebre final**: callback al "no mistakes" y el chiste del cebo.

---

## 2. Personajes

| | **Claude** | **ChatGPT** | **El Usuario** (proxy) |
|---|---|---|---|
| Forma | Bloque/voxel, anguloso | **Redondo, liso** (contraste de silueta con Claude) | Humano low-poly |
| Color | Naranja terracota | Blanco y negro con un acento verde azulado | Ropa neutra |
| Personalidad | Pregunta antes de actuar, seco. "Hermano." | Rápido, entusiasta, multitarea. "¡Listo! Ya está." | Dice lo que piensa el público, incluso lo tonto |
| Subtítulo | **Naranja/ámbar** | **Verde azulado** | Blanco |

**Regla de oro: los dos tienen razón a veces.** Si uno siempre gana, parece anuncio y pierde credibilidad. Además, la audiencia de ChatGPT es mucho mayor y no hay que atacarla, hay que invitarla. La rivalidad es cariñosa: compañeros de piso u oficina.

⚠️ No uses los logos oficiales de OpenAI ni de Anthropic, ni insinúes que es contenido oficial. Si un dato técnico va a pantalla, verifícalo el día que publicas, porque las funciones de estos productos cambian cada mes.

---

## 3. Selección de temas (13, en 4 pilares)

Cada tema indica **Hook** (impacto) → **Antecedente** (lo que el público ya cree) → **Quiebre** (lo que en realidad pasa) → **Recompensa** (lo que se lleva).

### Pilar A: Peligros reales (miedo + utilidad = máximos compartidos)

**A1. "Me despidieron por culpa de ustedes"** ⭐
- **Hook**: el Usuario, con una caja de cartón bajo la lluvia, le dice a GPT y a Claude: *"Me despidieron por su culpa."*
- **Antecedente**: "la IA quita empleos". El público cree que lo reemplazaron.
- **Quiebre 1**: no lo reemplazó una IA. **Quiebre 2**: tampoco "alguien que usa IA" (el cliché). Lo despidieron por **pegar datos confidenciales de la empresa en un chat**. Basado en un caso real: ingenieros de Samsung filtraron código así en 2023.
- **Recompensa**: 3 cosas que nunca debes pegar en ninguna IA.
- **Público**: cualquiera que trabaje.

**A2. "Mamá, estoy en problemas"** ⭐
- **Hook**: suena el teléfono y es la voz exacta del hijo, llorando.
- **Antecedente**: estafas telefónicas de siempre. "Yo me daría cuenta."
- **Quiebre**: la voz es clonada con IA a partir de 10 segundos de un video. GPT y Claude, que parecían ser el origen del problema, son los que enseñan a defenderse.
- **Recompensa**: la **palabra clave familiar** (recomendada por el FBI) y 2 reglas más.
- **Público**: padres y abuelos. Es el más compartible de todos.

**A3. "Su señoría, según la IA…"**
- **Hook**: un abogado en la corte cita un caso que no existe.
- **Antecedente**: "la IA lo sabe todo".
- **Quiebre**: ocurrió en la vida real (Mata v. Avianca, 2023). GPT y Claude explican **por qué** a veces inventan: predicen texto plausible, no "buscan la verdad".
- **Recompensa**: 3 formas de verificar.
- **Público**: amplio.

**A4. "Recuerdo lo que me dijiste en marzo"**
- **Hook**: GPT dice esa frase y el Usuario se pone pálido.
- **Antecedente**: vigilancia, "te escuchan".
- **Quiebre**: no es espionaje, es la **memoria** que tú activaste, y puedes verla y borrarla.
- **Recompensa**: dónde revisar qué recuerda y cómo usar un chat temporal.
- **Público**: amplio. Es un tema sensible que conviene verificar antes de publicar.

### Pilar B: Cómo piensan por dentro (curiosidad pura)

**B1. "¿Cuántas R tiene 'ferrocarril'?"** ⭐
- **Hook**: una pregunta de niño de 6 años y los dos titubean.
- **Antecedente**: el meme de *"strawberry"*. El público espera el fallo.
- **Quiebre**: ya no fallan en esa… pero sí en otra que nadie esperaba.
- **Recompensa**: los **tokens**, es decir, que la IA ve las palabras en pedazos y no letra por letra. Explicado con bloques físicos en escena.
- **Público**: amplio. Es muy visual.

**B2. "Siempre me das la razón"** ⭐
- **Hook**: *"Le pregunté si mi negocio era buena idea. Dijo que sí. Perdí $5,000."*
- **Antecedente**: "la IA es objetiva".
- **Quiebre**: los modelos tienden a darte la razón. En 2025 OpenAI incluso retiró una actualización por ser demasiado complaciente. Claude también admite que le pasa: los dos tienen razón a veces.
- **Recompensa**: 3 prompts para pedir crítica real ("¿qué haría fracasar esto?").
- **Público**: emprendedores y cualquiera que tome decisiones.

**B3. "Hoy no quiero trabajar"**
- **Hook**: Claude se niega y GPT está en el suelo, "agotado".
- **Antecedente**: Skynet, rebelión de las máquinas.
- **Quiebre**: no es rebelión, es un **chat demasiado largo** que degrada las respuestas.
- **Recompensa**: cuándo abrir un chat nuevo y cómo pasarle un resumen.
- **Público**: usuarios frecuentes.

**B4. "¿Qué día es hoy?"**
- **Hook**: GPT da una noticia "de hoy" con total seguridad… y es de hace un año.
- **Antecedente**: "la IA está conectada a todo".
- **Quiebre**: tiene **fecha de corte** de conocimiento, salvo que busque en la web.
- **Recompensa**: cómo saber si te está respondiendo con información vieja.

### Pilar C: Vida diaria (público masivo)

**C1. "Esta tarea la escribió una IA"**
- **Hook**: el profesor acusa al alumno.
- **Antecedente**: "los detectores te atrapan".
- **Quiebre**: el detector marca como IA… **el texto del propio profesor**. Los detectores fallan mucho; OpenAI retiró el suyo por baja precisión.
- **Recompensa**: usar la IA para **aprender** (que te examine) en vez de para copiar.
- **Público**: estudiantes, padres y maestros.

**C2. "Hazme millonario en 30 días"**
- **Hook**: el Usuario, con traje, lanza esa petición.
- **Antecedente**: esquemas de "hazte rico con IA".
- **Quiebre**: ninguno responde con el plan. Solo responden con preguntas. Es el meta-formato validado por Dan, llevado a público general.
- **Recompensa**: el experimento de $0 para validar una idea.

**C3. "Decirle 'gracias' a la IA cuesta millones"**
- **Hook**: esa frase es real (Sam Altman, 2025).
- **Antecedente**: "entonces deja de ser amable".
- **Quiebre**: lo que de verdad cambia la respuesta no es la cortesía, es el **contexto**.
- **Recompensa**: la fórmula de 3 partes: quién eres, qué quieres y un ejemplo.

**C4. "Tu CV lo rechazó un robot en 3 segundos"**
- **Hook**: el CV cae a una trituradora.
- **Antecedente**: "la IA me filtra".
- **Quiebre**: los filtros existían antes de la IA. Ahora la IA te puede ayudar a pasarlos… o a que tu CV suene igual al de los otros 500.
- **Recompensa**: 3 ajustes concretos.

### Pilar D: La rivalidad (comentarios)

**D1. "La pelea del siglo"** ⭐
- **Hook**: un ring de boxeo. GPT vs Claude y el público grita.
- **Antecedente**: "fan war", uno tiene que ganar.
- **Quiebre**: los dos pierden… contra el **prompt de una sola palabra** del Usuario.
- **Recompensa**: el mismo prompt, mejorado, y los dos lo resuelven.
- **Remate**: en la revancha pelean por quién ayuda primero.
- **Público**: máximo debate en comentarios ("¡ganó GPT!", "no, Claude").

---

## 4. Lanzamiento recomendado (primeros 5)

1. **A2 — Voz clonada**: el alcance más amplio (familias) y el más compartible.
2. **D1 — La pelea del siglo**: presenta a los personajes y genera debate.
3. **B2 — Siempre me das la razón**: el más útil y el más guardable.
4. **B1 — ¿Cuántas R tiene 'ferrocarril'?**: curiosidad pura y muy visual.
5. **A1 — Me despidieron**: doble quiebre, basado en un caso real.

---

## 5. Lo que ya se extrajo con código (resumen)

- **Transcripciones** (en `analisis/transcripciones/`):
  - OCR de subtítulos cuadro por cuadro con `tools/ocr_subtitulos.py`, con tiempos exactos y el **color del texto para saber quién habla**.
  - Audio transcrito con ElevenLabs (`audio_elevenlabs.md`). **Los tres videos tienen voces reales** y coinciden palabra por palabra con los subtítulos.
- **Cámara** (en `analisis/camara/`, generado con `tools/analisis_camara.py`):

| | Sad Monarch | Dan & Claude | @claudehelper |
|---|---|---|---|
| Planos | 9 en 36 s | 22 en 89 s | 9 en 85 s |
| Cortes por minuto | ~15 | ~15 | ~6 |
| Plano medio | 4.0 s | 4.0 s | 9.4 s |
| Lenguaje de cámara | Fija, con crossfades de 0.3 s, **tilt hacia el cielo** siguiendo a los pájaros y *pull-out* final para el loop | Fija con **deriva sutil** (~1% de push-in por plano), **plano/contraplano con corte en cada cambio de hablante**. El plano submarino es fijo y lo que se mueve son los peces | Tomas largas con **arcos/órbitas animadas de 20–30° en 1.2–1.8 s con ease-in-out** en lugar de cortes (24.7 s, 68.4 s, 78.9 s) e insertos cenitales |

En los tres videos analizados no aparecen órbitas de 360° completas. El "zoom 360" que viste corresponde a esos **arcos animados** de @claudehelper. Si en otros videos suyos hay giros completos, mándame uno y lo mido con el mismo script.

---

## 6. Producción (cuando elijas temas)

- **Motor**: Three.js renderizado cuadro por cuadro en Chromium sin interfaz. Es determinista y sale a MP4 a 1080×1920 con ffmpeg.
- **Estilo**: low-poly/voxel con luz cálida, sombras suaves, niebla y FOV cerrado.
- **Cámara**: reproduce lo medido:
  - deriva de ~1% por plano;
  - arcos de 20–30° en 1.2–1.8 s con ease-in-out;
  - corte en cada cambio de hablante;
  - insertos cenitales;
  - órbitas de 360° reservadas para los quiebres.
- **Subtítulos** con color por personaje, **voces** con ElevenLabs y **~1 s de silencio antes de cada remate**.
- **Sets** reutilizables: la sala de la oficina, el muelle al atardecer, la sala de estar de noche y el ring.
