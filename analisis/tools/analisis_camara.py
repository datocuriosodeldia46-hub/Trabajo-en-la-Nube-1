"""Detecta cortes y movimientos de cámara (zoom, paneo, tilt, órbita) en un video.

Uso: python3 analisis_camara.py VIDEO SALIDA_BASE [--fps 10]

Para cada par de cuadros estima una transformación de similitud (ORB + RANSAC):
escala (zoom), rotación y traslación. Los cortes se detectan por el cambio del
histograma de color. Dentro de cada plano acumula el movimiento y lo clasifica.
El paralaje (inliers bajos con traslación alta) delata órbitas o travellings 3D.
"""
import argparse
import json
import math

import cv2
import numpy as np

ANCHO = 270  # los cuadros se reducen para acelerar el análisis


def hist(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h = cv2.calcHist([hsv], [0, 1], None, [32, 32], [0, 180, 0, 256])
    return cv2.normalize(h, h).flatten()


def movimiento(orb, a, b):
    ka, da = orb.detectAndCompute(a, None)
    kb, db = orb.detectAndCompute(b, None)
    if da is None or db is None or len(ka) < 12 or len(kb) < 12:
        return None
    matches = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(da, db)
    if len(matches) < 12:
        return None
    pa = np.float32([ka[m.queryIdx].pt for m in matches])
    pb = np.float32([kb[m.trainIdx].pt for m in matches])
    M, inl = cv2.estimateAffinePartial2D(pa, pb, method=cv2.RANSAC, ransacReprojThreshold=2.0)
    if M is None:
        return None
    escala = math.hypot(M[0, 0], M[1, 0])
    rot = math.degrees(math.atan2(M[1, 0], M[0, 0]))
    return {"escala": escala, "rot": rot, "tx": M[0, 2], "ty": M[1, 2], "inliers": float(inl.mean())}


def clasificar(p, ancho, alto):
    zoom = p["zoom"]
    pan = p["pan"] / ancho
    tilt = p["tilt"] / alto
    etiquetas = []
    if zoom > 1.06:
        etiquetas.append(f"push-in / zoom in ×{zoom:.2f}")
    elif zoom < 0.94:
        etiquetas.append(f"pull-out / zoom out ×{zoom:.2f}")
    if abs(pan) > 0.12:
        etiquetas.append(f"paneo/travelling {'→' if pan < 0 else '←'} {abs(pan)*100:.0f}% del ancho")
    if abs(tilt) > 0.10:
        etiquetas.append(f"tilt/grúa {'↑' if tilt > 0 else '↓'} {abs(tilt)*100:.0f}% del alto")
    if abs(p["rot"]) > 3:
        etiquetas.append(f"roll {p['rot']:+.0f}°")
    if p["inliers_medio"] < 0.55 and (abs(pan) > 0.12 or abs(tilt) > 0.10):
        etiquetas.append("paralaje fuerte → órbita / travelling 3D")
    if not etiquetas:
        etiquetas.append("fijo (movimiento sutil)" if p["movimiento_total"] > 0.02 else "fijo")
    return etiquetas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("salida")
    ap.add_argument("--fps", type=float, default=10)
    args = ap.parse_args()

    cap = cv2.VideoCapture(args.video)
    fps_v = cap.get(cv2.CAP_PROP_FPS) or 30
    paso = max(int(round(fps_v / args.fps)), 1)
    orb = cv2.ORB_create(800)

    planos, previo, h_prev, suave_prev = [], None, None, None
    difs = []
    i = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if i % paso:
            i += 1
            continue
        t = i / fps_v
        f = cv2.resize(frame, (ANCHO, int(frame.shape[0] * ANCHO / frame.shape[1])))
        g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
        h = hist(f)
        suave = cv2.GaussianBlur(cv2.resize(g, (90, 160)), (5, 5), 0).astype(np.float32)
        # Corte = salto de píxeles muy por encima del movimiento normal (umbral calibrado:
        # en estos videos el ruido entre cuadros es ~1 y un corte da 30–75), o cambio de paleta.
        dif = 0.0 if suave_prev is None else float(np.abs(suave - suave_prev).mean())
        difs.append((t, dif))
        corte = h_prev is None or dif > 14 \
            or cv2.compareHist(h_prev, h, cv2.HISTCMP_CORREL) < 0.6
        m = None if corte else movimiento(orb, previo, g)
        if not corte and m is not None and m["inliers"] < 0.15 and abs(m["escala"] - 1) > 0.3:
            corte = True  # salto brusco que el histograma no vio
        if corte:
            planos.append({"inicio": t, "fin": t, "zoom": 1.0, "pan": 0.0, "tilt": 0.0, "rot": 0.0, "inl": [], "mov": 0.0})
        elif m is not None:
            p = planos[-1]
            p["zoom"] *= m["escala"]
            p["pan"] += m["tx"]
            p["tilt"] += m["ty"]
            p["rot"] += m["rot"]
            p["inl"].append(m["inliers"])
            p["mov"] += abs(m["escala"] - 1) + (abs(m["tx"]) + abs(m["ty"])) / ANCHO
        planos[-1]["fin"] = t + paso / fps_v
        previo, h_prev, suave_prev = g, h, suave
        i += 1
    cap.release()

    alto = ANCHO * 16 / 9
    salida = []
    for n, p in enumerate(planos, 1):
        p["inliers_medio"] = float(np.mean(p["inl"])) if p["inl"] else 1.0
        p["movimiento_total"] = p["mov"]
        salida.append({
            "plano": n, "inicio": round(p["inicio"], 2), "fin": round(p["fin"], 2),
            "duracion": round(p["fin"] - p["inicio"], 2), "zoom": round(p["zoom"], 3),
            "pan_px": round(p["pan"], 1), "tilt_px": round(p["tilt"], 1), "rot_deg": round(p["rot"], 1),
            "inliers_medio": round(p["inliers_medio"], 2), "movimiento": clasificar(p, ANCHO, alto),
        })

    # Ráfagas: cambio sostenido (no corte) entre cuadros durante ≥0.5 s. En estos videos
    # corresponden a arcos/órbitas animadas de cámara o a objetos grandes cruzando el cuadro.
    rafagas, actual = [], None
    for t, d in difs:
        if 2.5 < d <= 14:
            actual = actual or {"inicio": t, "fin": t, "pico": d}
            actual["fin"], actual["pico"] = t, max(actual["pico"], d)
        else:
            if actual and actual["fin"] - actual["inicio"] >= 0.5:
                rafagas.append(actual)
            actual = None

    # Planos de menos de 0.3 s suelen ser destellos/transiciones: se reportan pero no cuentan como corte.
    reales = [s for s in salida if s["duracion"] >= 0.3]
    dur = cap_dur = salida[-1]["fin"] if salida else 0
    resumen = {
        "duracion_s": round(dur, 1), "planos": len(reales),
        "cortes_por_minuto": round(len(reales) / dur * 60, 1) if dur else 0,
        "duracion_media_plano_s": round(float(np.mean([s["duracion"] for s in reales])), 2) if reales else 0,
        "planos_con_movimiento": sum(1 for s in reales if not s["movimiento"][0].startswith("fijo")),
        "rafagas_de_movimiento": len(rafagas),
    }
    with open(args.salida + ".json", "w") as f:
        json.dump({"resumen": resumen, "planos": salida, "rafagas": rafagas}, f, ensure_ascii=False, indent=2)
    with open(args.salida + ".md", "w") as f:
        f.write("| Resumen | |\n|---|---|\n" + "".join(f"| {k} | {v} |\n" for k, v in resumen.items()))
        f.write("\n| # | Tiempo | Duración | Movimiento detectado | Zoom | Paralaje (inliers) |\n|---|---|---|---|---|---|\n")
        for s in salida:
            f.write(f"| {s['plano']} | {s['inicio']:.1f}–{s['fin']:.1f} s | {s['duracion']:.1f} s | {'; '.join(s['movimiento'])} | ×{s['zoom']:.2f} | {s['inliers_medio']:.2f} |\n")
        if rafagas:
            f.write("\n| Ráfaga de movimiento | Duración | Intensidad pico |\n|---|---|---|\n")
            for r in rafagas:
                f.write(f"| {r['inicio']:.1f}–{r['fin']:.1f} s | {r['fin'] - r['inicio']:.1f} s | {r['pico']:.1f} |\n")
    print(json.dumps(resumen, ensure_ascii=False))


if __name__ == "__main__":
    main()
