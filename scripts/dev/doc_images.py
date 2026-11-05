#!/usr/bin/env python3
"""Gera as imagens explicativas do README (docs/assets/*-light.png e *-dark.png) em português.

Uso: python3 scripts/dev/doc_images.py <diretório com archivo/ e newsreader/ (pacotes @fontsource descompactados)>
  Ex.: npm pack @fontsource/archivo@5 @fontsource/newsreader@5, descompacte cada um em <dir>/archivo e <dir>/newsreader.
Requer google-chrome (headless). Cores da marca: azul #0A2A52 e laranja #F26419.
"""
import base64, subprocess, sys, pathlib, tempfile

root = pathlib.Path(sys.argv[1])
out = pathlib.Path(__file__).resolve().parents[2] / "docs" / "assets"

def font(path, family, weight):
    b = base64.b64encode(pathlib.Path(path).read_bytes()).decode()
    return f"@font-face{{font-family:'{family}';font-weight:{weight};src:url(data:font/woff2;base64,{b}) format('woff2')}}"

FONTS = "".join([
    font(root / "archivo/package/files/archivo-latin-500-normal.woff2", "Archivo", 500),
    font(root / "archivo/package/files/archivo-latin-700-normal.woff2", "Archivo", 700),
    font(root / "archivo/package/files/archivo-latin-900-normal.woff2", "Archivo", 900),
    font(root / "newsreader/package/files/newsreader-latin-700-normal.woff2", "Newsreader", 700),
])

THEMES = {
    "light": dict(bg="#FFFFFF", card="#F2F5F9", line="#D5DDE8", ink="#0A2A52", mute="#4C5E78", accent="#F26419", on="#FFFFFF"),
    "dark": dict(bg="#0B1624", card="#13243A", line="#22405F", ink="#EAF0F7", mute="#9DB0C8", accent="#FF8238", on="#0B1624"),
}

def page(body, t, w, h):
    return f"""<!doctype html><meta charset=utf-8><style>{FONTS}
*{{box-sizing:border-box;margin:0}}
body{{width:{w}px;height:{h}px;background:{t['bg']};color:{t['ink']};font-family:Archivo,sans-serif;padding:56px 64px;display:flex;flex-direction:column}}
h1{{font-family:Newsreader,serif;font-weight:700;font-size:52px;line-height:1.1;letter-spacing:-.01em}}
h1 em{{font-style:normal;color:{t['accent']}}}
.sub{{color:{t['mute']};font-size:25px;margin-top:12px;font-weight:500}}
.row{{display:flex;gap:18px;align-items:stretch}}
.card{{background:{t['card']};border:2px solid {t['line']};border-radius:18px;padding:22px 24px;flex:1}}
.card b{{display:block;font-size:26px;font-weight:900;margin-bottom:8px}}
.card span{{color:{t['mute']};font-size:21px;line-height:1.35;font-weight:500}}
.num{{display:inline-flex;width:40px;height:40px;border-radius:50%;background:{t['accent']};color:{t['on']};font-weight:900;font-size:22px;align-items:center;justify-content:center;margin-bottom:12px}}
.arrow{{align-self:center;color:{t['accent']};font-size:38px;font-weight:900}}
.tag{{display:inline-block;border:2px solid {t['line']};border-radius:999px;padding:6px 16px;font-size:20px;font-weight:700;color:{t['mute']};margin:4px 6px 4px 0}}
.hot{{background:{t['accent']};color:{t['on']};border-color:{t['accent']}}}
.grow{{flex:1;display:flex;flex-direction:column;justify-content:center;gap:26px}}
</style>{body}"""

def banner(t):
    srcs = "".join(f"<span class=tag>{s}</span>" for s in ["Agência Brasil","Câmara","Senado","TSE","G1","OpenAI","Google DeepMind","Alerj"])
    cats = "".join(f"<span class='tag hot'>{s}</span>" if s in ("IA & Política",) else f"<span class=tag>{s}</span>" for s in ["Política","Eleições","IA & Política","Inteligência Artificial","Tecnologia","Dicas","Análise"])
    return page(f"""<div class=grow><div><h1>Muitas fontes entram.<br><em>Só o que importa</em> vira destaque.</h1>
<div class=sub>O Destaques da Hora lê as fontes, seleciona, resume e agrupa o mesmo fato em um caso só.</div></div>
<div class=row><div class=card><b>Fontes públicas</b>{srcs}</div><div class=arrow>→</div>
<div class=card><b>Seleção e resumo</b><span>Duas notas independentes por matéria, com regra de neutralidade partidária e texto sempre ligado ao original.</span></div><div class=arrow>→</div>
<div class=card><b>Editorias</b>{cats}</div></div></div>""", t, 1600, 520)

def how(t):
    steps = [("Coletar","RSS, páginas e envios próprios, no ritmo de cada fonte"),("Pré-filtrar","Descarta o que está fora do nicho, com folga para não perder nada"),
             ("Duas notas","Dois avaliadores independentes; entra só quem passa o limite da fonte"),("Escrever","Título, resumo e \"Por que importa\" em português, sem juízo de valor"),
             ("Agrupar","Mesmo fato, de várias fontes, vira um caso único"),("Em alta e boletim","Calor das últimas 48 h; boletim diário às 7h")]
    cards = ""
    for i,(a,b) in enumerate(steps,1):
        cards += f"<div class=card><div class=num>{i}</div><b>{a}</b><span>{b}</span></div>"
        if i<6: cards += "<div class=arrow>›</div>"
    return page(f"""<div class=grow><div><h1>Seis etapas, <em>da fonte ao leitor</em></h1><div class=sub>Tudo roda no servidor. Abrir uma página nunca chama modelo de IA.</div></div><div class=row>{cards}</div></div>""", t, 1700, 520)

def cluster(t):
    srcs = ["Agência Brasil","G1","Câmara","Folha","X (perfil oficial)"]
    left = "".join(f"<div class=card style='padding:14px 20px;margin-bottom:12px'><b style='font-size:22px;margin:0'>{s}</b><span style='font-size:18px'>cobre a votação</span></div>" for s in srcs)
    return page(f"""<div class=grow><div><h1>Cinco reportagens, <em>um caso</em></h1><div class=sub>O leitor vê o fato uma vez, com todas as fontes e a linha do tempo.</div></div>
<div class=row><div style='flex:1'>{left}</div><div class=arrow>→</div>
<div class=card style='flex:1.1;align-self:center'><div class=num>1</div><b>Caso: votação em plenário</b><span>5 fontes · 5 reportagens · último desdobramento às 21h40<br>Resumo atualizado conforme o caso evolui.</span></div><div class=arrow>→</div>
<div class=card style='flex:.8;align-self:center'><b>Em alta</b><span>Posição pelo calor: meia-vida de 24 h, janela de 48 h.</span><br><br><span class='tag hot'>1º lugar</span></div></div></div>""", t, 1700, 560)

def channels(t):
    ch = [("Site","Capa, Em alta, Boletim, Temas e busca"),("RSS","Destaques, todas as notícias, boletim, resumo semanal e balanço mensal"),
          ("API pública","JSON anônimo e somente leitura, com OpenAPI"),("MCP","Ferramentas para assistentes de IA"),("Markdown para agentes","Endereços prontos para agentes lerem e citarem")]
    cards = "".join(f"<div class=card><b>{a}</b><span>{b}</span></div>" for a,b in ch)
    return page(f"""<div class=grow><div><h1>Uma fonte de verdade, <em>cinco formas de ler</em></h1><div class=sub>Todas as saídas públicas passam pela mesma camada de leitura. Anônimas e sem chave.</div></div><div class=row>{cards}</div></div>""", t, 1700, 480)

def preview(t):
    return page(f"""<div class=grow><div><h1>Capa em estilo <em>jornal</em></h1><div class=sub>Prévia do layout planejado (ilustrativa): manchete, chamadas, Boletim e Em alta.</div></div>
<div class=row style='height:300px'><div class=card style='flex:2'><div class='tag hot'>IA & Política</div><b style='font-family:Newsreader,serif;font-size:36px'>Manchete do dia</b><span>Resumo em duas linhas, fonte e horário de Brasília.</span></div>
<div style='flex:1;display:flex;flex-direction:column;gap:14px'><div class=card><b style='font-size:22px'>Chamada</b><span>Título curto da segunda notícia</span></div><div class=card><b style='font-size:22px'>Chamada</b><span>Título curto da terceira notícia</span></div></div>
<div class=card style='flex:1'><b style='font-size:24px'>Boletim das 7h</b><span>Os destaques do dia, em ordem de importância.</span><br><br><b style='font-size:24px'>Em alta</b><span>1º · 2º · 3º assuntos</span></div></div></div>""", t, 1700, 560)

IMAGES = {"banner": (banner,1600,520), "how": (how,1700,520), "cluster": (cluster,1700,560), "channels": (channels,1700,480), "shots": (preview,1700,560)}
tmp = pathlib.Path(tempfile.mkdtemp())
for name,(fn,w,h) in IMAGES.items():
    for tn,t in THEMES.items():
        f = tmp / f"{name}-{tn}.html"; f.write_text(fn(t))
        subprocess.run(["google-chrome","--headless","--no-sandbox","--hide-scrollbars",f"--screenshot={out}/{name}-{tn}.png",f"--window-size={w},{h}","--force-device-scale-factor=1",f.as_uri()],check=True,capture_output=True)
        print(name,tn)
