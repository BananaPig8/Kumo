# Prepara los fondos del tráiler a partir de las imágenes del cliente (out/refs/):
# 1) borra el texto pintado, 2) recorta las capas que se mueven (sobre la imagen ya
# limpia) y 3) rellena lo que queda debajo de cada capa en el fondo.
# Escribe assets/plates/<plano>.webp, <plano>-<capa>.webp y src/scenes/plates/meta.js.
import json, os
import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
R = os.path.join(ROOT, 'out', 'refs') + '/'
OUT = os.path.join(ROOT, 'assets', 'plates') + '/'
META = os.path.join(ROOT, 'src', 'scenes', 'plates', 'meta.js')
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.dirname(META), exist_ok=True)

# Capas de atrás adelante. dil: margen (px) que se rellena en el fondo bajo la capa, que
# debe superar lo que la capa llegue a separarse del fondo; keep: debajo se deja la imagen
# original (para capas que apenas se mueven, como la hierba delantera).
SHOTS = {
    'town': {'src': 'pueblo', 'layers': [('front', {'dil': 16, 'k': 12}), ('pole', {'dil': 30, 'k': 22})]},
    'roof': {'src': 'tejado', 'layers': [('near', {'dil': 18, 'k': 8})]},
    'goggles': {'src': 'gafas', 'layers': [('face', {'dil': 18, 'k': 10})]},
    'tunnel': {'src': 'tunel'},
    'reveal': {'src': 'revelacion', 'layers': [('left', {'dil': 14, 'k': 10}), ('isle', {'dil': 16, 'k': 12})]},
    'cliff': {'src': 'acantilado', 'layers': [('isle', {'dil': 14, 'k': 10}), ('front', {'dil': 18, 'k': 12}), ('scarf', {'dil': 8})],
              'text': [[615, 640, 1315, 722, 'white', 7]]},
    'shrine': {'src': 'santuario', 'layers': [('platform', {'dil': 16, 'k': 10, 'cut': ['key']}), ('key', {'dil': 12}), ('fg', {'keep': True})]},
    'flyby': {'src': 'pasada', 'layers': [('isleA', {'dil': 12, 'k': 8}), ('isleB', {'dil': 12, 'k': 8}), ('isleC', {'dil': 12, 'k': 8}), ('glider', {'patch': {'dy': 235}})]},
    'chase': {'src': 'persecucion', 'layers': [('isleL', {'dil': 12, 'k': 8}), ('glider', {'dil': 14, 'k': 10})]},
    'whale': {'src': 'ballena', 'layers': [('whale', {'dil': 14, 'k': 10}), ('glider', {'dil': 16, 'k': 14})]},
    'airship': {'src': 'dirigible', 'layers': [('glider', {'dil': 18, 'k': 16})], 'text': [[675, 645, 1268, 712, 'white', 7]]},
    'dive': {'src': 'picado', 'layers': [('glider', {'patch': {'dx': 580}})]},
    'title': {'src': 'titulo', 'layers': [('isle', {'dil': 14, 'k': 10})], 'smooth_text': True,
              'text': [[905, 105, 1015, 215, 'gold', 10], [625, 212, 1360, 378, 'white', 16], [620, 378, 1340, 432, 'white', 8], [680, 562, 1270, 628, 'white', 8]]},
}

def disk(r): return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
def sam(src, name): return np.array(Image.open(os.path.join(HERE, 'masks', f'{src}-{name}.png'))) > 127

def layer_mask(shot, src, name, rgb):
    if name == 'scarf':
        # Rojo de la cinta, más la máscara SAM (recoge los pliegues oscuros).
        x0, y0, x1, y1 = 1205, 185, 1780, 318
        r, g, b = [rgb[..., i].astype(int) for i in range(3)]
        m = (r > 85) & (r - g > 45) & (r - b > 35)
        box = np.zeros_like(m); box[y0:y1, x0:x1] = True
        m = (m & box) | sam(src, name)
    elif shot == 'roof' and name == 'near':
        # El tejado entero (bajo su caballete), con ella, el gato y la chimenea.
        m = sam(src, 'kid') | sam(src, 'chimney')
        m[588:, :] = True
    else:
        m = sam(src, name)
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, disk(4)) > 0
    m = ndi.binary_fill_holes(m)
    if shot == 'shrine' and name == 'platform':
        # La panza de roca baja hasta detrás de la hierba delantera: se lleva entera.
        low = m[600:].any(axis=0)
        m[600:740, low] = True
        # El hueco del arco (donde flota la llave) va con la plataforma.
        m = ndi.binary_fill_holes(cv2.morphologyEx((m | sam(src, 'key')).astype(np.uint8), cv2.MORPH_CLOSE, disk(28)) > 0)
    if shot == 'shrine' and name == 'fg':
        m[770:, :] = True  # la franja de hierba llega hasta abajo del todo
    if shot == 'cliff' and name == 'front':
        m[760:, :1300] = True
        # La antena del gorro (demasiado fina para la máscara).
        a8 = m.astype(np.uint8)
        cv2.line(a8, (1272, 222), (1281, 172), 1, 3)
        cv2.circle(a8, (1281, 174), 7, 1, -1)
        m = a8 > 0
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

def remove_text(bgr, tm, smooth):
    if not smooth:
        return cv2.inpaint(bgr, tm.astype(np.uint8) * 255, 7, cv2.INPAINT_TELEA)
    # Cielo: relleno suave (convolución normalizada) con un poco de grano, en vez de
    # las manchas radiales del relleno por difusión.
    keep = (~tm).astype(np.float32)
    f = bgr.astype(np.float32)
    fill = cv2.GaussianBlur(f * keep[..., None], (0, 0), 22) / np.maximum(cv2.GaussianBlur(keep, (0, 0), 22)[..., None], 1e-4)
    grain = cv2.GaussianBlur(np.random.default_rng(7).normal(0, 2.2, f.shape[:2]).astype(np.float32), (0, 0), 0.8)[..., None]
    soft = cv2.GaussianBlur(tm.astype(np.float32), (0, 0), 2)[..., None]
    return np.clip(f * (1 - soft) + (fill + grain) * soft, 0, 255).astype(np.uint8)

meta = {}
for shot, cfg in SHOTS.items():
    src = cfg['src']
    rgb0 = np.array(Image.open(R + src + '-ghibli-cliente.png').convert('RGB'))
    H, W = rgb0.shape[:2]
    bgr = cv2.cvtColor(rgb0, cv2.COLOR_RGB2BGR)
    if 'text' in cfg:
        bgr = remove_text(bgr, text_mask(rgb0, cfg['text']), cfg.get('smooth_text', False))
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)  # imagen limpia: de aquí salen las capas
    hole = np.zeros((H, W), bool)   # zona que se rellena (lejos del borde, para no arrastrar su color)
    swap = np.zeros((H, W), bool)   # zona del fondo que de verdad se sustituye por el relleno
    layers = {}
    for name, o in cfg.get('layers', []):
        m = layer_mask(shot, src, name, rgb0)
        if 'cut' in o:
            # Otra capa que va delante y se mueve por su cuenta: se borra de esta.
            cm = np.zeros((H, W), bool)
            for other in o['cut']:
                cm |= layer_mask(shot, src, other, rgb0)
            cm = cv2.dilate(cm.astype(np.uint8), disk(8))
            lrgb = cv2.cvtColor(cv2.inpaint(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), cm * 255, 7, cv2.INPAINT_TELEA), cv2.COLOR_BGR2RGB)
        else:
            lrgb = rgb
        # Capa: píxeles limpios con borde suave, recortada a su caja.
        a = cv2.GaussianBlur(cv2.dilate(m.astype(np.uint8) * 255, disk(1)), (0, 0), 1.0)
        ys, xs = np.nonzero(a > 8)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        Image.fromarray(np.dstack([lrgb, a])[y0:y1, x0:x1], 'RGBA').save(OUT + f'{shot}-{name}.webp', quality=92, alpha_quality=100, method=6)
        layers[name] = {'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0)}
        if 'patch' in o:
            # El planeador se aleja y deja todo su hueco a la vista: se rellena con nubes de
            # otra zona de la imagen (clonado de Poisson).
            p = o['patch']
            pm = cv2.dilate(m.astype(np.uint8), disk(16))
            shifted = np.roll(np.roll(bgr, -p.get('dx', 0), axis=1), -p.get('dy', 0), axis=0)
            ys, xs = np.nonzero(pm)
            bgr = cv2.seamlessClone(shifted, bgr, pm * 255, (int((xs.min() + xs.max()) / 2), int((ys.min() + ys.max()) / 2)), cv2.NORMAL_CLONE)
        elif not o.get('keep'):
            hole |= cv2.dilate(m.astype(np.uint8), disk(o.get('dil', 12))) > 0
            # Alrededor de la capa se conserva la pintura original; solo se sustituye
            # lo que la capa tapa más un margen igual a lo que llega a desplazarse.
            swap |= cv2.dilate(m.astype(np.uint8), disk(o.get('k', 6))) > 0
    if hole.any():
        filled = cv2.inpaint(bgr, hole.astype(np.uint8) * 255, 7, cv2.INPAINT_TELEA)
        soft = cv2.GaussianBlur(swap.astype(np.float32), (0, 0), 1.5)[..., None]
        bgr = np.clip(bgr * (1 - soft) + filled * soft, 0, 255).astype(np.uint8)
    Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)).save(OUT + f'{shot}.webp', quality=92, method=6)
    meta[shot] = {'w': W, 'h': H, 'layers': layers}
    print(shot, list(layers), round(hole.mean(), 4), flush=True)

with open(META, 'w') as f:
    f.write('// Generado por tools/plates/prep.py: tamaño de cada imagen y caja de cada capa recortada.\n')
    f.write('export const PLATES = {\n')
    for k, m in meta.items():
        f.write(f'  {k}: {json.dumps(m)},\n')
    f.write('};\n')
