# Dos referencias virales de "explicador en una toma" y qué aplicar a nuestros videos

Videos analizados (verticales 720×1280, 30 fps, 3D estilizado, mismo creador o mismo formato):

- **A. "Comida fría"** (45,4 s). Dejar las sobras en la barra hasta que se enfríen.
- **B. "Aire a 18°"** (40,4 s). *"Stop setting your aircon to 18 – Comment KIT and I'll DM you my free summer aircon checklist"*.

Método:
- Cuadros cada 0,5 s y tiras a 6 fps en cada transición.
- Detección de cortes.
- Transcripción por OCR de sus subtítulos: `transcripciones/ref_comida_fria.*` y `transcripciones/ref_aire_18.*`.
- Medición de audio (EBU R128).

---

## 1. Los números

| | A (comida) | B (aire) | Lucas (nuestro) |
|---|---|---|---|
| Duración | 45,4 s | 40,4 s | 35,3 s |
| Palabras | 151 (**3,4 p/s**) | 124 (**3,1 p/s**) | 128 (**3,7 p/s**) |
| Subtítulos | 62, de 2–3 palabras (0,7 s c/u) | 38, de 2–4 palabras (1,0 s c/u) | sin subtítulos (van en edición) |
| Cortes duros | ~8 (**uno cada 5 s**) | ~8 (**uno cada 5 s**) | 31 (**uno cada 1,1 s**) |
| Cámara | **siempre en movimiento**: acercamiento lento, giros rápidos, "clavados" dentro de objetos | igual | se mueve, pero la mayoría de los planos están cortados |
| Audio | −14,1 LUFS, **LRA 1,4 LU**, sin un solo silencio | −14,1 LUFS, LRA 2,7 LU, sin silencios | −14,7 LUFS, LRA 3,0 LU |
| Personaje | muñeco de bloques muy simple | el mismo muñeco | repartidor detallado |

**La lección más importante:** el realismo no es lo que los hace virales. El personaje es casi de Minecraft. Lo que funciona es la **claridad**: una idea por frase, una imagen por frase y una cámara que nunca se detiene.

---

## 2. Estructura del guion (idéntica en los dos)

| Paso | A (comida) | B (aire) | Por qué engancha |
|---|---|---|---|
| **1. Gancho: "lo que tú haces está mal"** (0–4 s) | "Leaving your leftovers on the bench till they go cold **is how food poisoning starts**" | "Turning your aircon down to 18 **won't cool you any faster**" | Habla de **un hábito que el espectador hizo hoy**. No hay personaje lejano: el protagonista es **tú**. Genera la duda "¿lo estoy haciendo mal?" |
| **2. Giro / mito roto** (4–8 s) | "Modern fridges can handle warm food. **The waiting is the problem**" | "Your aircon doesn't make cold. **It pulls the heat out of your room**" | Contradice lo que todos creen; se gana el "no sabía esto" |
| **3. Mecanismo, viajando DENTRO del objeto** (8–25 s) | bacterias entre 5 y 60 °C → esporas que sobreviven la cocción → despiertan → toxina que ni hirviendo se destruye | ventilador → tubos helados → baja presión, hierve a 5° → compresor → calor afuera → válvula | Física y biología reales, visibles. Cada paso es una frase corta con su propia imagen |
| **4. Consecuencia concreta** (25–31 s) | "A pot left on the stove overnight? **Throw it out.** Reheating won't make it safe" | "18 just keeps it running longer… every degree lower **adds up to 10% to your bill**" | Pasa de "dato curioso" a "me afecta a mí" (salud o dinero) |
| **5. Segundo giro** (31–37 s) | "One big pot cools from the outside in… the middle stays warm for hours" | — | Una segunda sorpresa justo cuando parecía terminar, así la retención no cae |
| **6. Regla accionable con número** (37 s–final) | "Split into shallow containers… **never more than 2 hours** after cooking" + cartel **FRIDGE IT WITHIN 2 HOURS** | "**Set it to 25.** It cools just as fast for a lot less" | Termina en una instrucción que se puede **guardar y compartir**. El final es la regla: sin despedida ni "sígueme" |
| **CTA** (en la descripción) | — | "Comment **KIT** and I'll DM you my checklist" | Pedir una palabra en los comentarios infla la señal más fuerte para el algoritmo |

**Fórmula:**
> *[Hábito tuyo] + [consecuencia que no esperas] → "En realidad, [mito roto]" → viaje dentro del [objeto] mostrando el mecanismo paso a paso → [consecuencia en salud o dinero] → (segundo giro) → [regla con número] → fin.*

Por qué es **adictivo y fácil de consumir**:
- **Cada frase abre una pregunta y la siguiente la cierra.** Por ejemplo: "Some survive cooking… as tough spores… as the food cools… they wake up… and multiply". Nunca hay un momento de "ya entendí, me voy".
- **Frases de 3 a 6 palabras**, sin subordinadas. Se entiende con un solo oído y sin sonido gracias a los subtítulos.
- **Narración a ~3,2 palabras por segundo, sin pausas** (el audio no tiene ni un silencio de 0,25 s). Siempre está pasando algo.
- **Números concretos y redondos**: 5 a 60 °C, 2 horas, 18 contra 25, 10 %. Se recuerdan y se discuten en los comentarios.
- **Termina en la regla.** El espectador se queda con algo útil y lo comparte con alguien ("mándaselo a tu mamá").

---

## 3. La cámara: "una sola toma"

Tienen pocos cortes (uno cada ~5 s), pero **cada subtítulo trae un cambio visual**. Ese cambio sale de la cámara o de la animación, no de un corte. Así la sensación es de un plano continuo que viaja.

Técnicas medidas cuadro a cuadro:

1. **Acercamiento lento constante.** No hay ni un plano quieto: la cámara avanza todo el tiempo, despacio, hacia el sujeto.
2. **Giro rápido con desenfoque como transición.** En B (1,5–2,0 s), del control remoto en la mano (vista en primera persona) la cámara gira hacia la cara enojada del personaje y luego sube al aparato de aire. Son tres sujetos en una toma.
3. **"Clavado" dentro del objeto** para cambiar de escala, que es la firma del formato:
   - A, 13,8–14,2 s: la cámara entra a la olla atravesando el guiso con desenfoque y aparece en un mundo macro de partículas de comida con esporas.
   - A, 19,3–19,6 s: zoom con desenfoque dentro de una bacteria y llega al arroz.
   - B, 7,8–8,3 s: entra por la rejilla del aire, pasa un destello rojo y aparece dentro de un túnel de aletas y tubos.
   - B, 10,5–10,8 s: otro clavado, ahora a la cámara del manómetro.
4. **Corte de revelado.** En B (18–20 s), la unidad exterior abre su tapa sola mientras la cámara se acerca y deja ver el compresor sin cortar.
5. **Sección transversal.** En A (30–36 s), la olla en el refrigerador se ve en corte, con capas que se enfrían de afuera hacia adentro, mientras la cámara avanza.
6. **Movimiento de pausa al final.** En B (35,9–37 s), la cámara sube de la mesa (control y monedas) al personaje sonriendo, siempre en movimiento.
7. **Composición vertical con zona libre:**
   - el sujeto ocupa el centro, entre el 25 % y el 65 % de la altura;
   - los subtítulos van cerca del 70–75 % de la altura, pequeños, blancos, con sombra;
   - los carteles de dato van arriba, cerca del 15 %, en mayúsculas con una palabra resaltada en color.

---

## 4. Lenguaje visual: código de colores constante

| Concepto | Cómo se ve |
|---|---|
| Calor | partículas **rojas** que brillan |
| Frío | cristales **blancos o azules** y carámbanos |
| Bacterias | gotas **verdes** |
| Toxina | estrellas **moradas** |
| Dinero | **monedas que se apilan** |
| Tiempo y temperatura | reloj y termómetro en la pared, cuya aguja se mueve con la narración |
| Emoción | el personaje **pasa de enojado o enfermo a sonriente** al llegar la regla |

El espectador aprende el código en segundos y después "lee" la escena sin esfuerzo.

---

## 5. Audio

- **Volumen constante:** −14,1 LUFS con un rango de 1,4 a 2,7 LU. No hay subidas ni bajadas; es una mezcla muy comprimida, pensada para el celular.
- **Siempre hay una cama debajo de la voz**, de 13 a 21 dB bajo ella (música suave y efectos). Nunca hay silencio.
- **Efectos ligados a cada imagen:** cristales, burbujas, giros rápidos y monedas.

---

## 6. Qué cambiar en nuestros videos (Lucas y los siguientes)

### Guion
1. **Gancho en segunda persona sobre un hábito real.** No "Lucas va a ochenta…", sino algo como "**Si andas en moto sin chaleco, esto es lo que pasa en un choque**" o "**Si te avientas al suelo en un choque, así te salva un chaleco con airbag**". El protagonista puede seguir siendo Lucas, pero la primera frase es para **ti**.
2. **Mito roto en la segunda frase.** Por ejemplo: "El airbag no se infla cuando chocas. **Se infla antes**".
3. **Consecuencia con número:** cuánto reduce la lesión, cuántos milisegundos tarda. Solo cifras verificables y redondas.
4. **Terminar en una regla que se pueda guardar**, por ejemplo "Revisa que tu chaleco tenga sensor y cartucho cargado", y en un cartel de dato (**"SE INFLA EN 0,05 s"**).
5. **CTA de palabra clave en la descripción o al final**: "Comenta **CASCO** y te mando la lista de equipo que sí funciona".

### Cámara y edición
6. **Menos cortes y más viaje.** Pasar de 31 cortes a unos 8. Cada transición puede ser un movimiento de cámara:
   - un clavado dentro del chaleco hasta los sensores;
   - un giro rápido del casco al camión;
   - una sección transversal del chaleco inflándose.

   Nuestro sistema de planos ya lo permite: basta con encadenar trayectorias continuas y con desenfoque de movimiento.
7. **Un cambio visual por subtítulo**: algo se mueve, aparece, cambia de color o la aguja del termómetro avanza. No hace falta cortar.
8. **Cambios de escala** (de calle a chaleco, a sensor, a chip), como hacen ellos con la olla, la comida y la bacteria. Es más fácil de entender que los rayos X muy cercanos, que se leían abstractos.
9. **Primera persona en el gancho.** Que el espectador vea "sus" manos en el manubrio, como la mano con el control remoto en B.

### Estilo y producción
10. **Bajar el realismo y subir la claridad.** Un personaje más simple y expresivo, con la cara visible (enojado → asustado → sonriente), funciona igual o mejor y nos deja producir más rápido. El casco integral de Lucas le quita expresión.
11. **Código de colores fijo en todos nuestros videos:** verde = tecnología o sensores, rojo = peligro o impacto, azul = aire o protección, dorado = dinero.
12. **Carteles de dato** arriba, en mayúsculas con una palabra en color, en el dato clave y al final.
13. **Audio:** cama continua sin silencios, LRA cerca de 2 LU y un efecto por cada imagen.
14. **Ritmo de voz cerca de 3,2 palabras por segundo.** Lucas va a 3,7, algo rápido para un tema técnico; los dos ejemplos respiran un poco más.

### Temas que encajan con esta fórmula (motos). Son candidatos: hay que verificar cada dato antes de escribir el guion
- "Calentar la moto 10 minutos no la cuida: la desgasta."
- "Frenar solo con el freno trasero alarga tu frenado al doble."
- "Bajarle aire a las llantas en lluvia no da más agarre."
- "Tu casco caduca aunque nunca se haya caído."

Todos son hábitos que el espectador tiene, con un mecanismo que se puede mostrar viajando dentro del objeto (motor, freno, llanta, casco) y una regla final con número.
