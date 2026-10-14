# Máscaras SAM locales (rembg) para las capas que se animan. Guarda masks/<shot>-<layer>.png
import json, os, sys
import numpy as np
from PIL import Image
from rembg import new_session, remove

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
R = os.path.join(ROOT, 'out', 'refs') + '/'
OUT = os.path.join(os.path.dirname(__file__), 'masks')
os.makedirs(OUT, exist_ok=True)

def rect(x0, y0, x1, y1): return {'type': 'rectangle', 'data': [x0, y0, x1, y1], 'label': 1}
def pt(x, y, l=1): return {'type': 'point', 'data': [x, y], 'label': l}

# Cada capa = lista de grupos de prompts; la máscara final es la unión.
SPECS = {
  ('revelacion', 'isle'): [[rect(755, 40, 1480, 809), pt(1110, 200), pt(1100, 520), pt(1100, 700)],
                           [rect(860, 520, 895, 809), pt(876, 650)], [rect(1350, 520, 1385, 809), pt(1366, 650)]],
  ('revelacion', 'left'): [[rect(100, 190, 465, 585), pt(280, 420), pt(295, 255)]],
  ('santuario', 'key'): [[rect(905, 205, 1070, 430), pt(988, 300), pt(988, 390)]],
  ('santuario', 'fg'): [[rect(0, 625, 700, 809), pt(300, 770)], [rect(640, 625, 1320, 809), pt(1000, 775)], [rect(1260, 625, 1942, 809), pt(1600, 770)]],
  ('pasada', 'glider'): [[rect(550, 305, 1125, 575), pt(840, 390), pt(690, 385), pt(1000, 395), pt(915, 520)]],
  ('persecucion', 'glider'): [[rect(665, 410, 1325, 780), pt(1000, 560), pt(800, 475), pt(1215, 655), pt(1060, 740)],
                              [rect(940, 470, 1060, 620), pt(1017, 500), pt(968, 592), pt(996, 602), pt(1010, 540)]],
  ('acantilado', 'scarf'): [[rect(1205, 185, 1780, 318), pt(1262, 292), pt(1330, 290), pt(1417, 287), pt(1500, 275), pt(1583, 263), pt(1667, 247), pt(1740, 222)]],
  ('picado', 'glider'): [[rect(725, 515, 1305, 750), pt(1010, 600), pt(850, 612), pt(1180, 596), pt(1100, 700)]],
  ('ballena', 'whale'): [[rect(140, 100, 1870, 560), pt(900, 300), pt(470, 330)],
                         [rect(570, 5, 1405, 215), pt(690, 110), pt(1050, 130), pt(990, 50), pt(1320, 150)],
                         [rect(660, 345, 1120, 740), pt(850, 520), pt(1050, 690)]],
  ('ballena', 'glider'): [[rect(1295, 545, 1545, 640), pt(1420, 575)]],
  ('titulo', 'isle'): [[rect(115, 170, 612, 792), pt(360, 300), pt(360, 600), pt(250, 450)]],
  ('dirigible', 'glider'): [[rect(425, 595, 595, 720), pt(500, 640)]],
}

only = set(sys.argv[1:])
sess = None
for (shot, layer), groups in SPECS.items():
    key = f'{shot}-{layer}'
    path = os.path.join(OUT, key + '.png')
    if os.path.exists(path) and key not in only: continue
    sess = sess or new_session('sam')
    img = Image.open(R + shot + '-ghibli-cliente.png').convert('RGB')
    acc = np.zeros((img.height, img.width), bool)
    for g in groups:
        m = np.array(remove(img, session=sess, sam_prompt=g, only_mask=True)) > 127
        # Recorta al rectángulo del grupo (SAM a veces se sale).
        r = next(p for p in g if p['type'] == 'rectangle')['data']
        box = np.zeros_like(acc); box[r[1]:r[3], r[0]:r[2]] = True
        acc |= m & box
    Image.fromarray((acc * 255).astype('uint8')).save(path)
    print(key, round(acc.mean(), 4), flush=True)
