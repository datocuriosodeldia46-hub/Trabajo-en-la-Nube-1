# Ep02 · "¿Por qué se fue?" (abandono)

**Formato:** 9:16 · 46 s · Lucía (con Mateo en brazos) × Jesús · solo conversación, sin tarjetas ni versículos en pantalla.

| Plano | Tiempo | Línea | Cámara |
|---|---|---|---|
| Apertura | 0–4 s | Lucía: *"Jesús…"* · Jesús: *"¿Sí, hija?"* | De espaldas frente al sol, acercamiento lento |
| Hook | 4–6 s | *"¿Por qué se fue?"* (llorando) | Primer plano de Lucía |
| Pregunta | 6–9 s | Jesús: *"¿Qué es lo que más te duele?"* | Primer plano de Jesús |
| Regla de tres | 9–16 s | *"Que me dejó sola…"* / *"que Mateo no lo va a conocer…"* (mira al bebé) / *"y que a lo mejor… fue mi culpa."* (sollozos) | Lucía → bebé → Lucía más cerca |
| Quiebre | 16–19 s | Jesús: *"Hija mía… mírame."* (ella levanta la mirada; entra el piano) | Plano de los dos |
| Reencuadre | 19–27 s | *"Él decidió irse. Tú decidiste quedarte."* / *"Eso no habla de lo que te falta. Habla de quién eres."* | **Órbita de 360°** y primer plano de Jesús |
| Duda | 27–29 s | *"Pero no sé si puedo sola…"* | Lucía |
| La Palabra (Is 49:15, hablada) | 29–38 s | *"¿Puede una madre olvidarse del niño que carga en brazos?"* / *"No…"* / *"Pues aunque ella lo olvidara… yo nunca me olvidaré de ti."* | Jesús → bebé → los dos (la abraza) |
| Promesa | 38–41 s | *"No estás sola. Yo me quedo."* | Jesús **mira a cámara**, acercamiento |
| Loop | 41–46 s | *"Gracias, Jesús."* | El plano de espaldas del inicio, ahora con el brazo de Jesús en su hombro |

## Producción
- Voces: ElevenLabs v3 (Lucía = "Blue", Jesús = "Israel Medina"), generadas una sola vez: 16 líneas.
- Todo lo demás se hace con código (`tools/timeline.py`): pausas emocionales, reverb corta, piano y pad sintetizados (La m – Fa – Do – Sol) que entran en "mírame" y se abren con una melodía en "Yo me quedo", viento y pajaritos. La boca se mueve con la envolvente de cada voz.
- Escena: `escena/main.js` (Three.js). Render: `python3 tools/timeline.py && node render.mjs`.
- Descripción sugerida para el post: *"Isaías 49:15. Mándaselo a una mamá que necesite oír esto."*
