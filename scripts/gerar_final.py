"""
Gerador final — custom pills + auto-fit de texto proporcional.
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
import numpy as np

BASE     = os.path.dirname(os.path.dirname(__file__))
FONT_DIR = os.path.join(BASE, "Funil")
TMPL     = os.path.join(BASE, "Funil/Modelo_correto1.png")
FOTO     = sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASE, "Funil/pessoa_recortada.png")
OUT      = sys.argv[2] if len(sys.argv) > 2 else os.path.join(BASE, "Funil/figurinha_final.png")

# ── Dados (substituídos dinamicamente na API) ─────────────────────────────────
NOME   = sys.argv[3] if len(sys.argv) > 3 else "SOFIA MATOS"
DATA   = sys.argv[4] if len(sys.argv) > 4 else "12-08-2017"
ALTURA = sys.argv[5] if len(sys.argv) > 5 else "1,22 m"
PESO   = sys.argv[6] if len(sys.argv) > 6 else "24 kg"
CLUBE  = sys.argv[7] if len(sys.argv) > 7 else "FLAMENGO"

# ── Fontes ────────────────────────────────────────────────────────────────────
def load_font(size, weight="Regular"):
    """weight: Regular | SemiBold | Bold | CondensedBold | CondensedSemiBold"""
    name_map = {
        "Regular":          "Barlow-Regular.ttf",
        "SemiBold":         "Barlow-SemiBold.ttf",
        "Bold":             "Barlow-Bold.ttf",
        "CondensedBold":    "BarlowCondensed-Bold.ttf",
        "CondensedSemiBold":"BarlowCondensed-SemiBold.ttf",
    }
    candidates = [
        os.path.join(FONT_DIR, name_map.get(weight, "Barlow-Regular.ttf")),
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if "Bold" in weight
            else "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, size)
            except: pass
    return ImageFont.load_default()

def text_size(f, text):
    bb = f.getbbox(text)
    return bb[2] - bb[0], bb[3] - bb[1]

def auto_fit(text, weight, start_size, max_w, min_size=18):
    """Reduz o tamanho até o texto caber na largura máxima."""
    for s in range(start_size, min_size - 1, -1):
        f = load_font(s, weight)
        w, _ = text_size(f, text)
        if w <= max_w:
            return f, s
    return load_font(min_size, weight), min_size

WHITE      = (255, 255, 255, 255)
WHITE_SOFT = (255, 255, 255, 230)
PILL_COLOR = (6, 121, 134, 252)   # dark teal amostrado do template

# ── Layout do card 1016×1350 ──────────────────────────────────────────────────
W, H = 1016, 1350

FOTO_X2, FOTO_Y2 = 800, 1115      # foto cobre a área esquerda
FOTO_FADE_START  = int(FOTO_Y2 * 0.78)  # fade começa em ~870px

# Pills CUSTOM desenhados sobre o template
PILL_X1  = 60                      # margem esquerda
PILL1_X2 = 760                     # pill 1 (nome+stats) — fica dentro do frame esq
PILL2_X2 = 703                     # pill 2 (clube) — para antes do logo PANINI

P1_Y1, P1_Y2 = 1058, 1198         # pill 1 — 140px de altura
P2_Y1, P2_Y2 = 1215, 1308         # pill 2 — 93px de altura
PILL_RADIUS   = 26                 # raio arredondado das pills

# Margem interna horizontal dos pills (padding do texto)
PILL_PAD_X = 24

# ── 1. Template ───────────────────────────────────────────────────────────────
tmpl   = Image.open(TMPL).convert("RGBA")
canvas = tmpl.copy()
draw   = ImageDraw.Draw(canvas)

# ── 2. Foto com fundo removido ────────────────────────────────────────────────
foto_orig = Image.open(FOTO).convert("RGBA")
arr  = np.array(foto_orig)
alph = arr[:, :, 3]
rows = np.any(alph > 30, axis=1)
cols = np.any(alph > 30, axis=0)
if rows.any() and cols.any():
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    pad  = int((cmax - cmin) * 0.025)
    cmin = max(0, cmin - pad)
    cmax = min(foto_orig.width - 1, cmax + pad)
    foto_orig = foto_orig.crop((cmin, rmin, cmax, rmax))

fw, fh    = foto_orig.size
target_w  = FOTO_X2               # 800
target_h  = FOTO_Y2               # 1115

ratio_src = fw / fh
ratio_dst = target_w / target_h
if ratio_src > ratio_dst:
    new_h = target_h
    new_w = int(new_h * ratio_src)
else:
    new_w = target_w
    new_h = int(new_w / ratio_src)

foto_r    = foto_orig.resize((new_w, new_h), Image.LANCZOS)
cx        = (new_w - target_w) // 2
foto_crop = foto_r.crop((cx, 0, cx + target_w, target_h))

# Combinar alpha rembg × fade vertical (preserva transparência já existente)
existing = np.array(foto_crop.split()[3], dtype=np.float32)
fade     = np.ones_like(existing) * 255.0
for y in range(FOTO_FADE_START, target_h):
    t = (y - FOTO_FADE_START) / (target_h - FOTO_FADE_START)
    fade[y, :] = 255.0 * (1.0 - t * 0.95)
foto_crop.putalpha(Image.fromarray(np.minimum(existing, fade).astype(np.uint8)))

canvas.alpha_composite(foto_crop, dest=(0, 0))

# ── 3. Desenhar pills customizadas ────────────────────────────────────────────
draw.rounded_rectangle([PILL_X1, P1_Y1, PILL1_X2, P1_Y2],
                       radius=PILL_RADIUS, fill=PILL_COLOR)
draw.rounded_rectangle([PILL_X1, P2_Y1, PILL2_X2, P2_Y2],
                       radius=PILL_RADIUS, fill=PILL_COLOR)

# ── 4. Texto Pill 1 — NOME (bold) + stats (semibold) ─────────────────────────
p1h  = P1_Y2 - P1_Y1    # 140px
p1cw = PILL1_X2 - PILL_X1 - 2 * PILL_PAD_X   # largura útil de texto
p1cx = (PILL_X1 + PILL1_X2) // 2

# Tamanho-alvo do nome: 55% do pill height → 77px de render → font ~107px
# Proporção nome/stats mantida em ~1.55
NAME_TARGET = round(p1h * 0.33 / 0.72)   # ~64px
STAT_RATIO  = 45.9 / 29.1               # ratio exato do Canva ≈ 1.577
stat_target = round(NAME_TARGET / STAT_RATIO)  # ~69px

stats_text = f"{DATA} | {ALTURA} | {PESO}"

# Auto-fit: reduz ambos proporcionalmente até caber na largura
name_f, name_fs = auto_fit(NOME.upper(),  "Bold",     NAME_TARGET,                   p1cw)
stat_f, _       = auto_fit(stats_text,   "SemiBold", round(name_fs / STAT_RATIO),   p1cw)

nw, nh = text_size(name_f, NOME.upper())
sw, sh = text_size(stat_f, stats_text)
GAP    = int(p1h * 0.04)   # ~6px
block_h = nh + GAP + sh
block_y = P1_Y1 + (p1h - block_h) // 2

draw.text((p1cx, block_y),            NOME.upper(), font=name_f, fill=WHITE,      anchor="mt")
draw.text((p1cx, block_y + nh + GAP), stats_text,   font=stat_f, fill=WHITE_SOFT, anchor="mt")

# ── 5. Texto Pill 2 — CLUBE (bold) ────────────────────────────────────────────
p2h  = P2_Y2 - P2_Y1    # 93px
p2cw = PILL2_X2 - PILL_X1 - 2 * PILL_PAD_X
p2cx = (PILL_X1 + PILL2_X2) // 2

CLUB_TARGET = round(name_fs * (27 / 45.9))  # proporcional ao ratio do Canva (~37px)
club_f, _   = auto_fit(CLUBE.upper(), "Bold", CLUB_TARGET, p2cw)

cw, ch = text_size(club_f, CLUBE.upper())
club_y = P2_Y1 + (p2h - ch) // 2 + 6    # +6px offset óptico para baixo

draw.text((p2cx, club_y), CLUBE.upper(), font=club_f, fill=WHITE, anchor="mt")

# ── 6. Salvar ──────────────────────────────────────────────────────────────────
out_rgb = Image.new("RGB", (W, H), (54, 188, 208))  # teal template como bg
out_rgb.paste(canvas, mask=canvas.split()[3])
out_rgb.save(OUT, "PNG")
print(f"OK  {OUT}  {W}×{H}px  |  nome={name_fs}px  stats={sh}px  clube={ch}px")
