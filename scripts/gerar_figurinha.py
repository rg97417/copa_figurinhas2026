"""
Gerador de figurinha Copa 2026 — script de validação visual
Usa Pillow para compor o sticker como uma imagem real PNG
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os, sys

# ── Configurações ──────────────────────────────────────────────────────────────
CARD_W, CARD_H = 800, 1096          # 2× tamanho real (400×548) para qualidade
BORDER        = 10                   # borda foil
INNER_W       = CARD_W - BORDER*2
INNER_H       = CARD_H - BORDER*2
CORNER_R      = 44                   # raio das bordas internas

STRIP_W_PCT   = 0.205
TOP_H_PCT     = 0.715
PILL1_H_PCT   = 0.155
PILL2_H_PCT   = 0.115
PILL_MX_PCT   = 0.030

COPA_BLUE     = (92,  184, 232)      # #5CB8E8
DECO_COL      = (28,  112, 170, 100) # rgba(28,112,170,0.39)
PILL1_COL     = (26,  56,  86)       # #1A3856
PILL2_COL     = (35,  86,  144)      # #235690
FOIL_COL      = (200, 225, 245)      # borda
WHITE         = (255, 255, 255)
WHITE_75      = (255, 255, 255, 190)
PANINI_COL    = (255, 136, 0)        # laranja Panini

# ── Dimensões calculadas ───────────────────────────────────────────────────────
strip_w = int(INNER_W * STRIP_W_PCT)
photo_w = INNER_W - strip_w
top_h   = int(INNER_H * TOP_H_PCT)
pill1_h = int(INNER_H * PILL1_H_PCT)
pill2_h = int(INNER_H * PILL2_H_PCT)
pill_mx = int(INNER_W * PILL_MX_PCT)
pill_w  = INNER_W - pill_mx*2

total_pill_area = INNER_H - top_h
gap1 = max(6, int((total_pill_area - pill1_h - pill2_h) * 0.38))
gap2 = max(6, int((total_pill_area - pill1_h - pill2_h) * 0.32))

deco_fs = int(INNER_H * 0.72)       # fonte do "26"

# ── Dados da figurinha ─────────────────────────────────────────────────────────
NOME     = "SOFIA MATOS"
DATA     = "12/08/2017"
ALTURA   = "1,22 m"
PESO     = "24 kg"
CLUBE    = "FLAMENGO"
FOTO_PATH = os.path.join(os.path.dirname(__file__), "../Funil/crianca_exemplo.png")
OUT_PATH  = os.path.join(os.path.dirname(__file__), "../Funil/figurinha_gerada.png")

# ── Utilitários de desenho ─────────────────────────────────────────────────────
def rounded_rect_mask(draw, xy, r, fill):
    x0, y0, x1, y1 = xy
    draw.rectangle([x0+r, y0, x1-r, y1], fill=fill)
    draw.rectangle([x0, y0+r, x1, y1-r], fill=fill)
    draw.ellipse([x0, y0, x0+2*r, y0+2*r], fill=fill)
    draw.ellipse([x1-2*r, y0, x1, y0+2*r], fill=fill)
    draw.ellipse([x0, y1-2*r, x0+2*r, y1], fill=fill)
    draw.ellipse([x1-2*r, y1-2*r, x1, y1], fill=fill)

def pill(draw, xy, fill):
    x0, y0, x1, y1 = xy
    h = y1 - y0
    r = h // 2
    rounded_rect_mask(draw, xy, r, fill)

def try_font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Impact.ttf",
        "/Library/Fonts/Impact.ttf",
        "/System/Library/Fonts/Arial Bold.ttf" if bold else "/System/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        if os.path.exists(path):
            try: return ImageFont.truetype(path, size)
            except: pass
    return ImageFont.load_default()

def brazil_flag(size):
    """Desenha bandeira do Brasil em mini imagem quadrada"""
    s = size
    flag = Image.new("RGBA", (s, s), (0,0,0,0))
    d = ImageDraw.Draw(flag)
    # círculo verde
    d.ellipse([0,0,s-1,s-1], fill=(0, 156, 59))
    # losango amarelo
    half = s//2
    pts = [(half, int(s*0.08)), (int(s*0.92), half), (half, int(s*0.92)), (int(s*0.08), half)]
    d.polygon(pts, fill=(255, 223, 0))
    # círculo azul
    r = int(s*0.30)
    d.ellipse([half-r, half-r, half+r, half+r], fill=(0, 39, 118))
    # faixa branca curvada (simplificada como arco)
    d.arc([half-r, half-r, half+r, half+r], start=200, end=340, fill=WHITE, width=max(2, s//18))
    return flag

# ══════════════════════════════════════════════════════════════════════════════
# GERAR FIGURINHA
# ══════════════════════════════════════════════════════════════════════════════

# 1. Base card com borda foil
card = Image.new("RGBA", (CARD_W, CARD_H), FOIL_COL)

# Máscara de borda arredondada para o card inteiro
card_mask = Image.new("L", (CARD_W, CARD_H), 0)
ImageDraw.Draw(card_mask).rounded_rectangle([0,0,CARD_W-1,CARD_H-1], radius=CORNER_R+BORDER, fill=255)
card.putalpha(card_mask)

# 2. Inner card (azul Copa)
inner = Image.new("RGBA", (INNER_W, INNER_H), COPA_BLUE)
inner_draw = ImageDraw.Draw(inner)

# 3. "26" decorativo GIGANTE
deco_font = try_font(deco_fs, bold=False)
deco_layer = Image.new("RGBA", (INNER_W, INNER_H), (0,0,0,0))
deco_draw  = ImageDraw.Draw(deco_layer)

deco_top = int(INNER_H * 0.036)
deco_color_rgba = (28, 112, 170, 155)

# Posiciona "2" à esquerda com overflow
off_x = -int(INNER_W * 0.04)
deco_draw.text((off_x, deco_top), "2", font=deco_font, fill=deco_color_rgba)
# Posiciona "6" à direita com overflow
bbox6 = deco_font.getbbox("6")
w6 = bbox6[2] - bbox6[0]
deco_draw.text((INNER_W - w6 + int(INNER_W * 0.04), deco_top), "6", font=deco_font, fill=deco_color_rgba)

inner.alpha_composite(deco_layer)

# 4. Foto do usuário na área esquerda (80%)
photo_area_w = photo_w
photo_area_h = top_h

try:
    photo_orig = Image.open(FOTO_PATH).convert("RGBA")
    # Redimensiona mantendo proporção (crop centrado no topo)
    ph_ratio = photo_orig.width / photo_orig.height
    target_ratio = photo_area_w / photo_area_h
    if ph_ratio > target_ratio:
        # foto mais larga: ajusta pela altura
        new_h = photo_area_h
        new_w = int(new_h * ph_ratio)
        photo_resized = photo_orig.resize((new_w, new_h), Image.LANCZOS)
        # crop centrado
        left = (new_w - photo_area_w) // 2
        photo_crop = photo_resized.crop((left, 0, left + photo_area_w, photo_area_h))
    else:
        # foto mais alta: ajusta pela largura
        new_w = photo_area_w
        new_h = int(new_w / ph_ratio)
        photo_resized = photo_orig.resize((new_w, new_h), Image.LANCZOS)
        # alinha pelo topo (rosto fica no topo)
        photo_crop = photo_resized.crop((0, 0, photo_area_w, photo_area_h))

    # Gradiente de fade na base da foto (suaviza transição para pills)
    fade = Image.new("L", (photo_area_w, photo_area_h), 255)
    fade_draw = ImageDraw.Draw(fade)
    fade_start = int(photo_area_h * 0.78)
    for y in range(fade_start, photo_area_h):
        alpha = int(255 * (1 - (y - fade_start) / (photo_area_h - fade_start)) * 0.55)
        fade_draw.line([(0,y),(photo_area_w,y)], fill=255-alpha)
    photo_crop.putalpha(fade)

    inner.alpha_composite(photo_crop, dest=(0, 0))
    photo_ok = True
except Exception as e:
    print(f"Foto não encontrada: {e}")
    photo_ok = False

# 5. Right strip overlay (faixa direita escura + bandeira + BRA)
strip_overlay = Image.new("RGBA", (strip_w, top_h), (12, 68, 118, 32))
strip_draw = ImageDraw.Draw(strip_overlay)

# ─ FIFA badge ─
badge_d = int(strip_w * 0.72)
badge_x = (strip_w - badge_d) // 2
badge_y = int(top_h * 0.06)
strip_draw.ellipse([badge_x, badge_y, badge_x+badge_d, badge_y+badge_d], fill=(20, 46, 82))
strip_draw.ellipse([badge_x, badge_y, badge_x+badge_d, badge_y+badge_d], outline=(255,255,255,80), width=2)
fifa_f  = try_font(int(badge_d*0.24), bold=True)
num_f   = try_font(int(badge_d*0.34), bold=True)
fifa_bb = fifa_f.getbbox("FIFA")
num_bb  = num_f.getbbox("26")
fifa_text_x = badge_x + (badge_d - (fifa_bb[2]-fifa_bb[0]))//2
num_text_x  = badge_x + (badge_d - (num_bb[2]-num_bb[0]))//2
strip_draw.text((fifa_text_x, badge_y + int(badge_d*0.22)), "FIFA", font=fifa_f, fill=WHITE)
strip_draw.text((num_text_x,  badge_y + int(badge_d*0.46)), "26",   font=num_f,  fill=(255,213,0))

# ─ Bandeira Brasil ─
flag_d  = int(strip_w * 0.80)
flag_y  = int(top_h * 0.46)
flag_x  = (strip_w - flag_d) // 2
flag_img = brazil_flag(flag_d)
strip_overlay.alpha_composite(flag_img, dest=(flag_x, flag_y))

# ─ BRA text ─
bra_f  = try_font(int(strip_w * 0.22), bold=True)
bra_bb = bra_f.getbbox("BRA")
bra_x  = (strip_w - (bra_bb[2]-bra_bb[0])) // 2
bra_y  = flag_y + flag_d + int(strip_w * 0.08)
strip_draw.text((bra_x, bra_y), "BRA", font=bra_f, fill=(255,255,255,230))

# ─ Barras decorativas ─
bar_w   = int(strip_w * 0.46)
bar_x   = (strip_w - bar_w) // 2
bar_y   = bra_y + int(strip_w * 0.28)
for i in range(3):
    strip_draw.rounded_rectangle(
        [bar_x, bar_y + i*9, bar_x + bar_w, bar_y + i*9 + 5],
        radius=3, fill=(255,255,255,105)
    )

inner.alpha_composite(strip_overlay, dest=(photo_w, 0))

# "6" deco re-aplicado por cima do strip pra ficar visível na faixa direita
deco_layer2 = Image.new("RGBA", (INNER_W, INNER_H), (0,0,0,0))
deco_draw2  = ImageDraw.Draw(deco_layer2)
bbox6_2 = deco_font.getbbox("6")
w6_2 = bbox6_2[2] - bbox6_2[0]
deco_draw2.text((INNER_W - w6_2 + int(INNER_W * 0.04), deco_top), "6", font=deco_font, fill=(28, 112, 170, 130))
inner.alpha_composite(deco_layer2)

# 6. Pills na base
pill_draw = ImageDraw.Draw(inner)

# Pill 1 — nome + stats
p1_x0 = pill_mx
p1_y0 = top_h + gap1
p1_x1 = pill_mx + pill_w
p1_y1 = p1_y0 + pill1_h
pill(pill_draw, (p1_x0, p1_y0, p1_x1, p1_y1), PILL1_COL)

# Texto Pill 1
name_f  = try_font(int(pill1_h * 0.44), bold=True)
stats_f = try_font(int(pill1_h * 0.28), bold=False)
pad_l   = int(pill1_h * 0.38)
name_bb = name_f.getbbox(NOME)
name_y  = p1_y0 + int(pill1_h * 0.10)
pill_draw.text((p1_x0 + pad_l, name_y), NOME, font=name_f, fill=WHITE)

stats_text = f"{DATA}  |  {ALTURA}  |  {PESO}"
stats_y = name_y + (name_bb[3]-name_bb[1]) + int(pill1_h * 0.06)
pill_draw.text((p1_x0 + pad_l, stats_y), stats_text, font=stats_f, fill=(255,255,255,210))

# Pill 2 — clube + PANINI
p2_x0 = pill_mx
p2_y0 = p1_y1 + gap2
p2_x1 = pill_mx + pill_w
p2_y1 = p2_y0 + pill2_h
pill(pill_draw, (p2_x0, p2_y0, p2_x1, p2_y1), PILL2_COL)

club_f    = try_font(int(pill2_h * 0.46), bold=True)
panini_f  = try_font(int(pill2_h * 0.34), bold=True)
club_y    = p2_y0 + int(pill2_h * 0.28)
pill_draw.text((p2_x0 + pad_l, club_y), CLUBE, font=club_f, fill=WHITE)

panini_bb = panini_f.getbbox("PANINI")
pill_draw.text(
    (p2_x1 - (panini_bb[2]-panini_bb[0]) - int(pill2_h*0.28), club_y + int(pill2_h*0.05)),
    "PANINI", font=panini_f, fill=PANINI_COL
)

# 7. Borda interna sutil
border_layer = Image.new("RGBA", (INNER_W, INNER_H), (0,0,0,0))
border_draw  = ImageDraw.Draw(border_layer)
border_draw.rounded_rectangle([0,0,INNER_W-1,INNER_H-1], radius=CORNER_R, outline=(255,255,255,70), width=2)
inner.alpha_composite(border_layer)

# 8. Máscara de canto arredondado no inner card
inner_mask = Image.new("L", (INNER_W, INNER_H), 0)
ImageDraw.Draw(inner_mask).rounded_rectangle([0,0,INNER_W-1,INNER_H-1], radius=CORNER_R, fill=255)
inner.putalpha(inner_mask)

# 9. Composição final
card.alpha_composite(inner, dest=(BORDER, BORDER))

# 10. Salva
out_dir = os.path.dirname(OUT_PATH)
os.makedirs(out_dir, exist_ok=True)
card_rgb = Image.new("RGB", (CARD_W, CARD_H), (240, 240, 240))
card_rgb.paste(card, mask=card.split()[3])
card_rgb.save(OUT_PATH, "PNG", quality=95)
print(f"✅ Figurinha gerada em: {OUT_PATH}")
print(f"   Tamanho: {CARD_W}×{CARD_H}px")
