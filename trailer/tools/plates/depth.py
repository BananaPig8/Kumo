# Mapas de profundidad (Depth Anything V2 small, ONNX local) de cada ilustración.
# Guarda assets/plates/<plano>-depth.webp en gris: 0 = lejos, 255 = cerca.
# Modelo: https://github.com/fabio-sim/Depth-Anything-ONNX/releases (depth_anything_v2_vits.onnx)
import os, sys
import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
R = os.path.join(ROOT, 'out', 'refs') + '/'
OUT = os.path.join(ROOT, 'assets', 'plates') + '/'
MODEL = os.environ.get('DEPTH_MODEL', os.path.expanduser('~/.cache/kumo/depth_v2_vits.onnx'))
KEEP = {'shrine': ['fg']}
SRC = {'town': 'pueblo', 'roof': 'tejado', 'goggles': 'gafas', 'tunnel': 'tunel', 'reveal': 'revelacion',
       'cliff': 'acantilado', 'shrine': 'santuario', 'flyby': 'pasada', 'chase': 'persecucion', 'whale': 'ballena',
       'airship': 'dirigible', 'dive': 'picado', 'title': 'titulo'}

sess = ort.InferenceSession(MODEL, providers=['CPUExecutionProvider'])
mean = np.array([0.485, 0.456, 0.406], np.float32)
std = np.array([0.229, 0.224, 0.225], np.float32)

def infer(rgb):
    x = cv2.resize(rgb, (518, 518), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255
    x = ((x - mean) / std).transpose(2, 0, 1)[None]
    return sess.run(None, {sess.get_inputs()[0].name: x})[0][0]

only = set(sys.argv[1:])
def depth_of(rgb):
    h, w = rgb.shape[:2]
    # La imagen es muy apaisada: se mide en tres ventanas cuadradas solapadas y se mezclan,
    # ajustando la escala de cada una a la de la vista completa.
    full = cv2.resize(infer(rgb), (w, h), interpolation=cv2.INTER_CUBIC)
    acc = np.zeros((h, w), np.float32); wsum = np.zeros((h, w), np.float32)
    for x0 in np.linspace(0, w - h, 3).astype(int):
        d = cv2.resize(infer(rgb[:, x0:x0 + h]), (h, h), interpolation=cv2.INTER_CUBIC)
        ref = full[:, x0:x0 + h]
        a, b = np.polyfit(d.ravel()[::7], ref.ravel()[::7], 1)
        d = a * d + b
        ramp = np.minimum(np.linspace(0, 1, h) * 4, 1) * np.minimum(np.linspace(1, 0, h) * 4, 1)
        wgt = np.tile(np.maximum(ramp, 0.02), (h, 1)).astype(np.float32)
        acc[:, x0:x0 + h] += d * wgt; wsum[:, x0:x0 + h] += wgt
    d = acc / np.maximum(wsum, 1e-6)
    lo, hi = np.percentile(d, 1), np.percentile(d, 99.5)
    return np.clip((d - lo) / (hi - lo), 0, 1)

import json, re
meta_src = open(os.path.join(ROOT, 'src', 'scenes', 'plates', 'meta.js')).read()
META = {m.group(1): json.loads(m.group(2)) for m in re.finditer(r'^  (\w+): (\{.*\}),$', meta_src, re.M)}
layer_depth = {}
for shot, src in SRC.items():
    if only and shot not in only: continue
    # Profundidad del fondo ya limpio (sin capas ni texto): lo que hay debajo se mueve como fondo.
    plate = np.array(Image.open(OUT + shot + '.webp').convert('RGB'))
    d = depth_of(plate)
    h, w = d.shape
    holes = []
    # Profundidad de cada capa recortada: mediana de la ilustración original dentro de su silueta.
    if META[shot]['layers']:
        dref = depth_of(np.array(Image.open(R + src + '-ghibli-cliente.png').convert('RGB')))
        for name, b in META[shot]['layers'].items():
            a = np.array(Image.open(OUT + f'{shot}-{name}.webp').convert('RGBA'))[..., 3] > 128
            sub = dref[b['y']:b['y'] + b['h'], b['x']:b['x'] + b['w']]
            layer_depth[f'{shot}-{name}'] = round(float(np.median(sub[a])), 3)
            if name not in KEEP.get(shot, []):
                m = np.zeros((h, w), np.uint8)
                m[b['y']:b['y'] + b['h'], b['x']:b['x'] + b['w']] = a
                holes.append((cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))) > 0, layer_depth[f'{shot}-{name}']))
    # Lo que hay debajo de cada capa (relleno) se mueve con la capa: así queda tapado. Alrededor,
    # una rampa suave hacia el fondo: al moverse la cámara se estiran nubes, no el relleno.
    for m, ld in holes:
        dist = cv2.distanceTransform((~m).astype(np.uint8), cv2.DIST_L2, 5)
        ramp = np.clip(1 - dist / 90.0, 0, 1) ** 1.5
        d = d * (1 - ramp) + ld * ramp
    # Suaviza respetando bordes para que el paralaje no rompa los contornos.
    d8 = (d * 255).astype(np.uint8)
    d8 = cv2.bilateralFilter(d8, 9, 30, 9)
    d8 = cv2.resize(d8, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    Image.fromarray(d8, 'L').save(OUT + f'{shot}-depth.webp', lossless=True)
    print(shot, d8.shape, flush=True)

if not only:
    with open(os.path.join(ROOT, 'src', 'scenes', 'plates', 'depth.js'), 'w') as f:
        f.write('// Generado por tools/plates/depth.py: profundidad (0 lejos, 1 cerca) de cada capa recortada.\n')
        f.write('export const LAYER_DEPTH = ' + json.dumps(layer_depth) + ';\n')
