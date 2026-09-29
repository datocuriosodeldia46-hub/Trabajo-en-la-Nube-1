"""Genera pruebas de 8 s del efecto "voz de videojuego" (presets A/B/C) con las voces ya
generadas: hijo (teléfono), mamá, GPT y Claude, más una base chiptune de fondo.
No gasta créditos: todo es procesamiento local.

Uso: python3 tools/pruebas_voz.py  →  audio/pruebas/prueba_{A,B,C}.wav
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import retro  # noqa: E402
import timeline as T  # noqa: E402

MUESTRA = [("L01", 0.2), ("L02", 0.15), ("L17", 0.25), ("L06", 0.25), ("L22", 0.3)]  # (línea, pausa previa)


def guardar(x, ruta):
    x = x / max(np.abs(x).max() / 0.95, 1)
    subprocess.run([T.FF, "-v", "error", "-y", "-f", "s16le", "-ar", str(T.SR), "-ac", "1", "-i", "-", str(ruta)],
                   input=(x * 32767).astype("<i2").tobytes(), check=True)


def main():
    lineas = {l["id"]: l for l in json.load(open(T.BASE / "lineas.json"))}
    destino = T.BASE / "audio" / "pruebas"
    destino.mkdir(parents=True, exist_ok=True)
    for preset in "ABC":
        partes = []
        for lid, pausa in MUESTRA:
            x = T.comprimir_pausas(T.recortar(T.decodificar(T.BASE / "audio" / f"{lid}.mp3")))
            if lid in T.TELEFONO:
                x = T.filtro_telefono(x)
            partes += [np.zeros(int(pausa * T.SR)), retro.voz_retro(x, lineas[lid]["who"], preset)]
        voz = np.concatenate(partes)[: 8 * T.SR]
        voz = np.pad(voz, (0, 8 * T.SR - len(voz)))
        fondo = retro.musica_tension(8.0)[: len(voz)]
        guardar(voz + fondo, destino / f"prueba_{preset}.wav")
        print(preset, destino / f"prueba_{preset}.wav")


if __name__ == "__main__":
    main()
