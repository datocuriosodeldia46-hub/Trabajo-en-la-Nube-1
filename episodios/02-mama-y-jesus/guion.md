# Ep02 · "¿Por qué se fue?" (abandono)

**Formato:** 9:16 · 1:05 · Lucía (con Mateo en brazos) × Jesús · solo conversación, sin tarjetas ni versículos en pantalla.

| Plano | Tiempo | Línea | Cámara / acción |
|---|---|---|---|
| Llega sola | 0–3.5 s | Lucía: *"Jesús…"* | Sube la colina caminando y llorando; la cámara retrocede frente a ella (travelling) |
| Respuesta | 3.5–5 s | Jesús: *"¿Sí, hija?"* | De espaldas frente al sol; él voltea a verla |
| Hook | 5–7 s | *"¿Por qué se fue?"* | Primer plano con arco lento y cámara en mano sutil |
| Pregunta | 7–9.5 s | *"¿Qué es lo que más te duele?"* | Primer plano de Jesús |
| La herida escala | 9.5–21 s | *"Que me dejó sola…"* / *"que Mateo no lo va a conocer…"* (bebé) / *"y que a lo mejor… fue mi culpa."* / *"Tal vez si hubiera sido más bonita… más paciente…"* | Plano medio → bebé → **dolly zoom** (el fondo se estira en "fue mi culpa") → 3/4 desde el lado de Jesús |
| Quiebre | 21–23 s | *"Hija mía… mírame."* (entra el piano) | Plano de los dos |
| Reencuadre | 23–30 s | *"Él decidió irse. Tú decidiste quedarte."* / *"Eso no habla de lo que te falta. Habla de quién eres."* | **Órbita de 360°** → Jesús |
| El bebé | 30–37 s | *"Mira a Mateo."* / *"Te he visto cada madrugada… meciéndolo cuando ya no podías más."* | La cámara baja de su cara al bebé; luego **grúa** del bebé a su cara |
| Duda | 37–40 s | *"Pero no sé si puedo sola…"* | Se seca las lágrimas |
| La Palabra (Is 49:15, hablada) | 40–48 s | *"¿Puede una madre olvidarse del niño que carga en brazos?"* / *"No…"* / *"…yo nunca me olvidaré de ti."* | Jesús en contrapicado → bebé → los dos: Jesús da un paso y la abraza |
| Caminan juntos | 49–57 s | *"¿Y si un día me canso?"* / *"Entonces yo te cargo a ti… como tú lo cargas a él."* (Is 46:4) | Travelling frontal y lateral; pasos en el pasto |
| Promesa | 57–59.5 s | *"No estás sola. Yo me quedo."* | Se detienen; Jesús **mira a cámara** |
| Despedida / loop | 59.5–65 s | *"Gracias, Jesús."* (ya sonríe) | Se van caminando hacia el sol; la cámara sube en grúa. Loop: llegó sola, se va acompañada |

## Producción
- Voces: ElevenLabs v3 (Lucía = "Blue", Jesús = "Israel Medina"), 21 líneas generadas una sola vez.
- Todo lo demás es código (`tools/timeline.py`): pausas, reverb, piano y pad sintetizados, viento, pajaritos y pasos en el pasto. La duración está fijada en 65 s.
- Escena: `escena/main.js` (Three.js). Caminatas con piernas y pies articulados, rebote y balanceo; recorridos y planos sincronizados con las marcas del timeline.
- Render: `python3 tools/timeline.py && node render.mjs`.
- Descripción sugerida: *"Isaías 49:15. Mándaselo a una mamá que necesite oír esto."*
