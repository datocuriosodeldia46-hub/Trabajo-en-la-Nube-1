# "Lucas" — el airbag que se infla antes del golpe

> Borrador para aprobar. Todavía no hay nada producido.
> Formato: vertical 1080×1920, ~44 s, 30 fps, 3D por código (three.js, como la máquina de garra), narración en español (México) con ElevenLabs y subtítulos de 2 palabras.
> Se sigue la fórmula medida en `analisis/motos-seleccion-de-temas.md`.

## Guion por beats

| Tiempo | Narración | Imagen | Función |
|---|---|---|---|
| 0–4,2 s | **"Lucas va a ochenta por Reforma… cuando un camión le cierra el paso."** | Cuadro 1: el camión ya invade el carril, a 2 m de la moto. Cámara pegada al casco, de noche, Reforma mojada | **Gancho con peligro + nombre**, sin intro |
| 4,2–6,8 s | "Pero Lucas trae puesto un **chaleco con airbag**." | **Primer destello de rayos X**: el chaleco bajo la chamarra se ve en verde | **Ancla**: tecnología real con nombre |
| 6,8–11,5 s | "En lugar de esperar el golpe, sus sensores revisan su cuerpo **mil veces por segundo**…" | Rayos X del pecho: chip, giroscopio y acelerómetro con pulsos de luz. El tiempo se frena | **Expectativa rota** ("en lugar de…") |
| 11,5–14 s | "…y en milisegundos detectan que va a chocar." | Barra roja "IMPACTO" en el HUD del chip, contador de ms | Micro-recompensa |
| 14–16,3 s | "Una pequeña carga libera **nitrógeno a presión**…" | Macro en rayos X: el cartucho dispara y el gas corre por los tubos | **Mecanismo real** |
| 16,3–19 s | "…que infla el chaleco **más rápido que un parpadeo**." | **Pantalla dividida**: el ojo de Lucas tras la visera, a medio parpadeo, vs. el chaleco ya inflado (contadores ~150 ms vs ~40 ms) | El dato que se comenta y se comparte |
| 19–23,2 s | "Y forma una armadura de aire alrededor de su **cuello, pecho y espalda**." | Órbita de 360° en rayos X con flechas verdes de presión | "Aprendí algo" |
| 23,2–25,5 s | "Lucas sale disparado por encima del cofre…" | Cámara lenta: Lucas en el aire sobre el camión | **Primera recompensa** espectacular |
| 25,5–28 s | "…pero cae de espaldas en medio de Reforma." | Contrapicado: el **Ángel de la Independencia** iluminado de fondo y Lucas cayendo | **Complicación** + monumento icónico |
| 28–30,6 s | "El aire absorbe el impacto contra el asfalto…" | Rayos X en el instante del golpe: flechas que se reparten por toda la espalda | Segundo mecanismo |
| 30,6–33 s | "…y lo hace rodar en lugar de romperse." | Lucas rueda por el asfalto mojado, chispas de la moto al fondo | Recompensa |
| 33–37,5 s | "Al mismo tiempo, su **casco detecta el choque** y manda su ubicación a emergencias." | Rayos X del casco: sensor y ondas de señal que suben al cielo, luego ícono de ambulancia | **Segundo aparato** (casco con detección de choques) |
| 37,5–41 s | "Lucas se levanta, revisa la mochila…" | Lucas de pie, abre la mochila de reparto: la pizza está intacta | Respiro, ternura |
| 41–43,5 s | "…y entrega **a tiempo**." | Timbre, la puerta se abre, la caja pasa de mano. Corte seco en la palabra final | **Final sin cierre**: el video vuelve a empezar solo |

**Total:** ~136 palabras (≈3,1 palabras/s, como Alex), unos 40 planos y ~30 % del tiempo en rayos X.

### Por qué puede viralizar más allá de los motociclistas
- **Todos conocen a un repartidor** y todos han visto un camión cerrarse en la calle. El peligro se entiende sin saber nada de motos.
- **Datos reales que se pueden comprobar**: sensores a ~1000 lecturas por segundo, inflado en unas decenas de milisegundos (más rápido que un parpadeo de ~100–150 ms), cuello, pecho y espalda, y cascos que avisan a emergencias. Así, los comentarios de "¿esto existe?" encuentran que sí.
- **El final de la pizza** quita el miedo y deja una sonrisa. Ese contraste invita a compartir con frases como "mándaselo a alguien que anda en moto".
- **Reforma y el Ángel** sitúan la historia en México de inmediato, y cualquier hispanohablante los reconoce.

### Honestidad del guion
El vuelo y la caída están exagerados para el espectáculo. Los mecanismos sí son reales: sensores, gas a presión, zonas protegidas y casco con detección de choques. No se nombra una marca para no atribuirle cifras exactas que no podemos confirmar; en la descripción del video se puede mencionar "chalecos airbag tipo Tech-Air".

## Voz (ElevenLabs, acento mexicano)

| Voz | Descripción | Muestra |
|---|---|---|
| **Luis Guillermo** (recomendada) | Narrador mexicano dramático, profundo y expresivo | [escuchar](https://api.us.elevenlabs.io/v1/voices/gwk2CKlAQ1B4a2RPxJoF/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJjdXN0b20iLCJ3b3Jrc3BhY2VfaWQiOiJjNTFhNjliMDZmNzM0MWY0ODU2ZWVhNTk3Mjk3OTc3MiIsImZpbGVuYW1lIjoiQnZNOEEwcGdTZ2hSM1dkZk5JaGIubXAzIiwidGltZXN0YW1wIjoxNzkyNTU4ODAwMDAwMDAwfQ%3D%3D) |
| **MexiTony** | Narrador de misterio y true crime, suspenso atrapante | [escuchar](https://storage.googleapis.com/eleven-public-prod/database/workspace/80e7a0514ecd470ea8c56de35402a120/voices/dHGPYv4XsWTepHhOTsGA/sDk8qPCa1Gi2Ri5tldV2.mp3) |
| **Eduardo Ramírez** | Joven, profunda, hecha para suspenso | [escuchar](https://api.us.elevenlabs.io/v1/voices/gzmm2yLE54OQMX21gPk2/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJjdXN0b20iLCJ3b3Jrc3BhY2VfaWQiOiI3NzczOGVhMDYxZmM0ZmQ2OTFkMWJiNDM1YWQ4MTBhZSIsImZpbGVuYW1lIjoiN2JjZmY3OTItZjBlNS00NDdkLWFjYzgtZWJmYTc2OGYyZmViLm1wMyIsInRpbWVzdGFtcCI6MTc5MjU1ODgwMDAwMDAwMH0%3D) |
| **Ricardo** | Joven y enérgica, tono de locutor; la más rápida | [escuchar](https://api.us.elevenlabs.io/v1/voices/kDzST3FMx0eYtPSCuBKd/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJjdXN0b20iLCJ3b3Jrc3BhY2VfaWQiOiJmM2Q1OWZlMDQ5YTE0YjQxODM5ZTNjMzRlM2M4NzI3NyIsImZpbGVuYW1lIjoiZDc0NzM2NjYtZWY4Mi00YWRhLTkyODgtMDUwMDU0ZTE3ZTYyLm1wMyIsInRpbWVzdGFtcCI6MTc5MjU1ODgwMDAwMDAwMH0%3D) |

La voz de Alex es intensa y rápida, sin dramatizar cada frase. Luis Guillermo y Ricardo son los extremos de ese registro: más cine o más TikTok.
