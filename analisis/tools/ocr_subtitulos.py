"""Extrae la transcripción de subtítulos quemados en un video (OCR cuadro por cuadro).

Uso: python3 ocr_subtitulos.py VIDEO SALIDA_BASE [--fps 3]

Genera SALIDA_BASE.json, SALIDA_BASE.srt y SALIDA_BASE.md con cada línea,
su tiempo de inicio/fin y el color del texto (sirve para saber quién habla).
"""
import argparse
import json
import re
from difflib import SequenceMatcher

import cv2
import numpy as np
from rapidocr_onnxruntime import RapidOCR

# Textos del escenario que no son subtítulos (carteles, cuadernos, marcas de agua).
ESCALA = 1.6

# Correcciones de confusiones típicas de fuentes pixel (u/w, n/m, H/M).
CORRECCIONES = {"uorried": "worried", "knous": "knows", "uhat": "what", "Hy child": "My child", "I'n": "I'm", "uill": "will", "uith": "with"}

IGNORAR = re.compile(r"^(kitchen rota|please wash.*|mon|jamie|sadmonarch|look first|test small|claude\.md|gotcha\.md|recording)$", re.I)


def color_texto(frame, box):
    """Clasifica el color del texto (blanco / amarillo) usando los píxeles más brillantes del recuadro."""
    xs = [int(p[0]) for p in box]
    ys = [int(p[1]) for p in box]
    x0, x1 = max(min(xs), 0), min(max(xs), frame.shape[1])
    y0, y1 = max(min(ys), 0), min(max(ys), frame.shape[0])
    roi = frame[y0:y1, x0:x1]
    if roi.size == 0:
        return "desconocido"
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV).reshape(-1, 3)
    brillantes = hsv[hsv[:, 2] >= np.percentile(hsv[:, 2], 85)]
    sat = float(np.median(brillantes[:, 1]))
    hue = float(np.median(brillantes[:, 0]))
    if sat < 60:
        return "blanco"
    if 15 <= hue <= 40:
        return "amarillo"
    return f"color(h={hue:.0f},s={sat:.0f})"


def lineas_de_frame(ocr, frame, alto_min):
    grande = cv2.resize(frame, None, fx=ESCALA, fy=ESCALA, interpolation=cv2.INTER_CUBIC)
    res, _ = ocr(grande, use_cls=False)
    if not res:
        return []
    items = []
    for box, texto, conf in res:
        box = [(p[0] / ESCALA, p[1] / ESCALA) for p in box]
        alto = max(p[1] for p in box) - min(p[1] for p in box)
        texto = texto.strip()
        if conf < 0.75 or alto < alto_min or len(texto) < 2 or IGNORAR.match(texto):
            continue
        items.append((min(p[1] for p in box), min(p[0] for p in box), texto, color_texto(frame, box)))
    # Un subtítulo puede ocupar 2 renglones: se agrupan por renglón y se leen izquierda→derecha.
    renglon = alto_min * 1.5
    items.sort(key=lambda it: (round(it[0] / renglon), it[1]))
    if not items:
        return []
    texto = " ".join(t for _, _, t, _ in items)
    for mal, bien in CORRECCIONES.items():
        texto = texto.replace(mal, bien)
    colores = [c for *_, c in items]
    return [(texto, max(set(colores), key=colores.count))]


def normalizar(t):
    return re.sub(r"[^a-z0-9áéíóúñ ]", "", t.lower()).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("salida")
    ap.add_argument("--fps", type=float, default=3)
    args = ap.parse_args()

    ocr = RapidOCR()
    cap = cv2.VideoCapture(args.video)
    fps_video = cap.get(cv2.CAP_PROP_FPS) or 30
    paso = max(int(round(fps_video / args.fps)), 1)
    alto = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    alto_min = alto * 0.018  # descarta letras diminutas del fondo

    segmentos = []
    i = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if i % paso == 0:
            t = i / fps_video
            lineas = lineas_de_frame(ocr, frame, alto_min)
            texto, color = lineas[0] if lineas else ("", None)
            ultimo = segmentos[-1] if segmentos else None
            if texto and ultimo and SequenceMatcher(None, normalizar(ultimo["texto"]), normalizar(texto)).ratio() > 0.92:
                ultimo["fin"] = t + paso / fps_video
                ultimo["lecturas"].append(texto)
            elif texto:
                segmentos.append({"inicio": t, "fin": t + paso / fps_video, "texto": texto, "color": color, "lecturas": [texto]})
        i += 1
    cap.release()

    # Destellos de OCR de un solo muestreo (texto a medio aparecer) se descartan.
    segmentos = [s for s in segmentos if len(s["lecturas"]) > 1 or s["fin"] - s["inicio"] > 0.4]

    # La lectura más frecuente de cada segmento corrige errores sueltos de OCR.
    for s in segmentos:
        s["texto"] = max(set(s["lecturas"]), key=s["lecturas"].count)
        del s["lecturas"]

    # Segmentos consecutivos con las mismas palabras (renglones leídos en otro orden,
    # o un número basura pegado por un objeto que cruza el texto) son el mismo subtítulo.
    def palabras(t):
        return {w for w in normalizar(t).split() if not w.isdigit()}

    limpios = []
    for s in segmentos:
        if limpios and palabras(s["texto"]) and palabras(s["texto"]) <= palabras(limpios[-1]["texto"]) | palabras(s["texto"]) \
                and palabras(s["texto"]) == palabras(limpios[-1]["texto"]):
            limpios[-1]["fin"] = s["fin"]
        else:
            limpios.append(s)
    segmentos = limpios

    with open(args.salida + ".json", "w") as f:
        json.dump(segmentos, f, ensure_ascii=False, indent=2)

    def ts(x, sep=","):
        h, r = divmod(x, 3600)
        m, s = divmod(r, 60)
        return f"{int(h):02d}:{int(m):02d}:{int(s):02d}{sep}{int((s % 1) * 1000):03d}"

    with open(args.salida + ".srt", "w") as f:
        for n, s in enumerate(segmentos, 1):
            f.write(f"{n}\n{ts(s['inicio'])} --> {ts(s['fin'])}\n{s['texto']}\n\n")

    with open(args.salida + ".md", "w") as f:
        f.write("| Tiempo | Color | Texto |\n|---|---|---|\n")
        for s in segmentos:
            f.write(f"| {s['inicio']:05.1f}–{s['fin']:05.1f} s | {s['color']} | {s['texto']} |\n")

    print(f"{len(segmentos)} segmentos -> {args.salida}.json/.srt/.md")


if __name__ == "__main__":
    main()
