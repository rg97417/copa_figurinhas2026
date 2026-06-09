"""
Gera figurinha usando modelo2.png como template real.
Substitui apenas a foto da pessoa + texto dos pills.
"""
from PIL import Image, ImageDraw, ImageFont
import os

BASE   = os.path.dirname(os.path.dirname(__file__))
TMPL   = os.path.join(BASE, "Funil/modelo2.png")
FOTO   = os.path.join(BASE, "Funil/crianca_exemplo.png")
OUT    = os.path.join(BASE, "Funil/figurinha_v2.png")

# Dados do usuário
NOME   = "SOFIA MATOS"
DATA   = "12-08-2017"
ALTURA = "1,22 m"
PESO   = "24 kg"
CLUBE  = "FLAMENGO"

# Coordenadas medidas do modelo2.png (666x896)
# Área da foto: x=0..535, y=0..678
# Faixa direita: x=535..666 (mantida do template)
# Pill 1: y=683..721
# Pill 2: y=733..757
FOTO_X2  = 535
FOTO_Y2  = 678
PILL1_Y1, PILL1_Y2 = 664, 724
PILL2_Y1, PILL2_Y2 = 730, 762
BOTTOM_Y = 896

TEAL_BG  = (99, 188, 205, 255)   # cor de fundo do template amostrada
GREEN_26 = (64, 143, 59, 255)    # verde do '26' amostrado
PILL1_C  = (38, 100, 107)
PILL2_C  = (61, 121, 123)
WHITE    = (255, 255, 255)
PANINI_C = (220, 40, 40)

def get_font(size, bold=False):
    paths = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Impact.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, size)
            except: pass
    return ImageFont.load_default()

# ── 1. Carregar template ──────────────────────────────────────────────────────
tmpl = Image.open(TMPL).convert("RGBA")
W, H = tmpl.size   # 666 x 896
out  = tmpl.copy()
draw = ImageDraw.Draw(out)

# ── 2. Preencher área da foto com fundo teal (apagar Neymar) ─────────────────
draw.rectangle([0, 0, FOTO_X2, FOTO_Y2], fill=TEAL_BG)

# ── 3. Redesenhar o '26' decorativo ─────────────────────────────────────────
font26 = get_font(int(H * 0.70))
# '2' à esquerda
draw.text((-int(W*0.04), int(H*0.03)), "2", font=font26, fill=GREEN_26)
# '6' à direita (parcialmente visível na faixa direita)
bb6 = font26.getbbox("6")
draw.text((W - (bb6[2]-bb6[0]) + int(W*0.04), int(H*0.03)), "6", font=font26, fill=GREEN_26)

# ── 4. Colar foto da criança na área esquerda ─────────────────────────────────
foto = Image.open(FOTO).convert("RGBA")
fw, fh = foto.size
target_w = FOTO_X2
target_h = FOTO_Y2

# Redimensiona mantendo proporção, alinha pelo topo (rosto)
ratio = fw / fh
if ratio > target_w / target_h:
    new_h = target_h
    new_w = int(new_h * ratio)
else:
    new_w = target_w
    new_h = int(new_w / ratio)

foto_r = foto.resize((new_w, new_h), Image.LANCZOS)
# Crop centralizado (mantém topo para o rosto aparecer)
cx = (new_w - target_w) // 2
foto_crop = foto_r.crop((cx, 0, cx + target_w, target_h))

# Gradiente de fade na base da foto
from PIL import ImageFilter
fade = Image.new("L", (target_w, target_h), 255)
fd = ImageDraw.Draw(fade)
fade_start = int(target_h * 0.80)
for y in range(fade_start, target_h):
    alpha = int(220 * (y - fade_start) / (target_h - fade_start))
    fd.line([(0, y), (target_w, y)], fill=255 - alpha)
foto_crop.putalpha(fade)

out.alpha_composite(foto_crop, dest=(0, 0))

# ── 5. Redesenhar pills por cima (com texto do usuário) ───────────────────────
pill_r = (PILL1_Y2 - PILL1_Y1) // 2

def pill(draw, x0, y0, x1, y1, fill):
    r = (y1 - y0) // 2
    draw.rectangle([x0+r, y0, x1-r, y1], fill=fill)
    draw.ellipse([x0, y0, x0+2*r, y1], fill=fill)
    draw.ellipse([x1-2*r, y0, x1, y1], fill=fill)

mx = int(W * 0.04)

# Pill 1 — nome + stats
pill(draw, mx, PILL1_Y1, W-mx, PILL1_Y2, PILL1_C)
name_f  = get_font(int((PILL1_Y2-PILL1_Y1)*0.47), bold=True)
stats_f = get_font(int((PILL1_Y2-PILL1_Y1)*0.30))
pad = int((PILL1_Y2-PILL1_Y1)*0.38)
draw.text((mx + pad, PILL1_Y1 + int((PILL1_Y2-PILL1_Y1)*0.07)), NOME,  font=name_f,  fill=WHITE)
stats = f"{DATA}  |  {ALTURA}  |  {PESO}"
draw.text((mx + pad, PILL1_Y1 + int((PILL1_Y2-PILL1_Y1)*0.56)), stats, font=stats_f, fill=(255,255,255,200))

# Pill 2 — clube + SINGLR/branding
pill(draw, mx, PILL2_Y1, W-mx, PILL2_Y2, PILL2_C)
club_f   = get_font(int((PILL2_Y2-PILL2_Y1)*0.50), bold=True)
brand_f  = get_font(int((PILL2_Y2-PILL2_Y1)*0.38), bold=True)
pad2 = int((PILL2_Y2-PILL2_Y1)*0.38)
draw.text((mx + pad2, PILL2_Y1 + int((PILL2_Y2-PILL2_Y1)*0.25)), CLUBE, font=club_f, fill=WHITE)

# SINGLR STUDIO box (direita do pill2) — vermelho como no original
brand_text = "SINGLR STUDIO"
bb = brand_f.getbbox(brand_text)
bw = bb[2]-bb[0]+12; bh = bb[3]-bb[1]+8
bx = W - mx - bw - 4
by = PILL2_Y1 + (PILL2_Y2-PILL2_Y1-bh)//2
draw.rounded_rectangle([bx, by, bx+bw, by+bh], radius=3, fill=(200,30,30))
draw.text((bx+6, by+4), brand_text, font=brand_f, fill=WHITE)

# ── 6. Salvar ─────────────────────────────────────────────────────────────────
out_rgb = Image.new("RGB", (W, H), (240, 240, 240))
out_rgb.paste(out, mask=out.split()[3])
out_rgb.save(OUT, "PNG")
print(f"✅ Gerado: {OUT}  ({W}x{H}px)")
