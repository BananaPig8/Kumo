# Prepara los fondos del tráiler a partir de las imágenes del cliente:
# capas recortadas (lo que se anima), fondo con los huecos rellenos y sin texto pintado.
import json, os
import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
R = os.path.join(ROOT, 'out', 'refs') + '/'
OUT = os.path.join(ROOT, 'assets', 'plates') + '/'
META = os.path.join(ROOT, 'src', 'scenes', 'plates', 'meta.js')
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.dirname(META), exist_ok=True)

SHOTS = {
    'town': {'src': 'pueblo'},
    'roof': {'src': 'tejado'},
    'goggles': {'src': 'gafas'},
    'tunnel': {'src': 'tunel'},
    'reveal': {'src': 'revelacion', 'layers': ['isle', 'left']},
    'cliff': {'src': 'acantilado', 'layers': ['scarf'], 'text': [[615, 640, 1315, 722, 'white', 7]]},
    'shrine': {'src': 'santuario', 'layers': ['key', 'fg'], 'keep': ['fg']},
    'flyby': {'src': 'pasada', 'layers': ['glider'], 'patch': {'layer': 'glider', 'dy': 235}},
    'chase': {'src': 'persecucion', 'layers': ['glider']},
    'whale': {'src': 'ballena', 'layers': ['whale', 'glider']},
    'airship': {'src': 'dirigible', 'layers': ['glider'], 'text': [[675, 645, 1268, 712, 'white', 7]]},
    'dive': {'src': 'picado', 'layers': ['glider'], 'patch': {'layer': 'glider', 'dx': 580}},
    'title': {'src': 'titulo', 'layers': ['isle'], 'smooth_text': True,
              'text': [[905, 105, 1015, 215, 'gold', 10], [625, 212, 1360, 378, 'white', 16], [620, 378, 1340, 432, 'white', 8], [680, 562, 1270, 628, 'white', 8]]},
}

def disk(r): return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))

def layer_mask(shot, src, name, rgb):
    if name == 'scarf':
        x0, y0, x1, y1 = 1205, 185, 1780, 318
        r, g, b = [rgb[..., i].astype(int) for i in range(3)]
        m = (r > 85) & (r - g > 45) & (r - b > 35)
        box = np.zeros_like(m); box[y0:y1, x0:x1] = True
        m &= box
        # Unión con la máscara SAM (recoge los pliegues oscuros de la cinta).
        m |= np.array(Image.open(os.path.join(HERE, 'masks', f'{src}-{name}.png'))) > 127
    else:
        m = np.array(Image.open(os.path.join(HERE, 'masks', f'{src}-{name}.png'))) > 127
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, disk(4)) > 0
    m = ndi.binary_fill_holes(m)
    if shot == 'shrine' and name == 'fg':
        m[770:, :] = True  # la franja de hierba llega hasta abajo del todo
    return m

def text_mask(rgb, boxes):
    # «Top-hat»: lo que es más claro que su entorno y más fino que el disco (las letras).
    # Las letras son blanco crema (poco saturadas); el kanji es dorado (caja marcada con 'gold').
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    th = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, disk(24)).astype(np.int16)
    m = np.zeros(gray.shape, bool)
    for b in boxes:
        x0, y0, x1, y1 = b[:4]
        t, s, v = th[y0:y1, x0:x1], hsv[y0:y1, x0:x1, 1], hsv[y0:y1, x0:x1, 2]
        if len(b) > 4 and b[4] == 'gold':
            sub = (t > 22) & (v > 150)
        else:
            sub = (t > 14) & (s < 75) & (v > 165)
        sub = cv2.morphologyEx(sub.astype(np.uint8), cv2.MORPH_OPEN, disk(1))
        # Se ensancha para llevarse también el halo y la sombra del rótulo.
        grow = b[5] if len(b) > 5 else 8
        m[y0:y1, x0:x1] |= cv2.dilate(sub, disk(grow)) > 0
    return m

meta = {}
for shot, cfg in SHOTS.items():
    src = cfg['src']
    rgb = np.array(Image.open(R + src + '-ghibli-cliente.png').convert('RGB'))
    H, W = rgb.shape[:2]
    hole = np.zeros((H, W), bool)
    layers = {}
    masks = {}
    for name in cfg.get('layers', []):
        m = layer_mask(shot, src, name, rgb)
        masks[name] = m
        # La hierba delantera apenas se desplaza: debajo se deja la original (mejor que un borrón).
        if name not in cfg.get('keep', []):
            hole |= cv2.dilate(m.astype(np.uint8), disk(10)) > 0
        # Capa: píxeles originales con borde suave, recortada a su caja.
        a = cv2.dilate(m.astype(np.uint8) * 255, disk(1))
        a = cv2.GaussianBlur(a, (0, 0), 1.0)
        ys, xs = np.nonzero(a > 8)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        rgba = np.dstack([rgb, a])[y0:y1, x0:x1]
        Image.fromarray(rgba, 'RGBA').save(OUT + f'{shot}-{name}.webp', quality=92, alpha_quality=100, method=6)
        layers[name] = {'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0)}
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    if 'text' in cfg:
        tm = text_mask(rgb, cfg['text'])
        if cfg.get('smooth_text'):
            # Cielo: relleno suave (convolución normalizada) más la textura de pincel de al lado,
            # en vez de las manchas radiales del relleno por difusión.
            keep = (~tm).astype(np.float32)
            f = bgr.astype(np.float32)
            num = cv2.GaussianBlur(f * keep[..., None], (0, 0), 22)
            den = cv2.GaussianBlur(keep, (0, 0), 22)[..., None]
            fill = num / np.maximum(den, 1e-4)
            grain = np.random.default_rng(7).normal(0, 2.2, f.shape[:2]).astype(np.float32)[..., None]
            out = np.clip(fill + cv2.GaussianBlur(grain, (0, 0), 0.8)[..., None] if grain.ndim == 2 else fill + grain, 0, 255)
            soft = cv2.GaussianBlur(tm.astype(np.float32), (0, 0), 2)[..., None]
            bgr = (f * (1 - soft) + out * soft).astype(np.uint8)
        else:
            hole |= tm
    if 'patch' in cfg:
        # Hueco grande (el planeador se aleja): se rellena con nubes de al lado (clonado de Poisson).
        p = cfg['patch']
        pm = cv2.dilate(masks[p['layer']].astype(np.uint8), disk(16))
        shifted = np.roll(np.roll(bgr, -p.get('dx', 0), axis=1), -p.get('dy', 0), axis=0)
        ys, xs = np.nonzero(pm)
        c = (int((xs.min() + xs.max()) / 2), int((ys.min() + ys.max()) / 2))
        bgr = cv2.seamlessClone(shifted, bgr, pm * 255, c, cv2.NORMAL_CLONE)
        hole &= ~(pm > 0)
    if hole.any():
        bgr = cv2.inpaint(bgr, hole.astype(np.uint8) * 255, 7, cv2.INPAINT_TELEA)
    plate = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
    plate.save(OUT + f'{shot}.webp', quality=92, method=6)
    meta[shot] = {'w': W, 'h': H, 'layers': layers}
    print(shot, W, H, list(layers), round(hole.mean(), 4), flush=True)

with open(META, 'w') as f:
    f.write('// Generado por la preparación de fondos: tamaño de cada imagen y caja de cada capa recortada.\n')
    f.write('export const PLATES = {\n')
    for k, m in meta.items():
        f.write(f'  {k}: {json.dumps(m)},\n')
    f.write('};\n')
