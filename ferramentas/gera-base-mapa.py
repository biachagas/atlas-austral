#!/usr/bin/env python3
"""Gera dados/mapa-base.json: contornos da América do Sul e da Bahia já projetados para o mapa do Início.

Não faz parte do site (o site só lê o JSON). Rodar de novo só se mudar a base ou a projeção.

Fonte: Natural Earth (domínio público), https://www.naturalearthdata.com/
  - países: ne_50m_admin_0_countries.geojson (1:50 milhões)
  - Bahia:  ne_10m_admin_1_states_provinces.geojson (1:10 milhões)
  obtidos do repositório oficial github.com/nvkelso/natural-earth-vector.
Projeção: azimutal equivalente de Lambert (esfera de raio 6371 km), centro 60°O, 15°S.
O mesmo cálculo da projeção está em assets/js/mapa-topo.js, para posicionar os pontos lidos dos dados.

Uso: python3 ferramentas/gera-base-mapa.py PASTA_DOS_GEOJSON
"""
import json, math, sys, pathlib

PASTA = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/ne/geojson")
SAIDA = pathlib.Path(__file__).resolve().parent.parent / "dados" / "mapa-base.json"
R, LON0, LAT0 = 6371.0, -60.0, -15.0
L0, P0 = math.radians(LON0), math.radians(LAT0)
LARGURA = 600.0          # unidades do SVG para a largura do continente
TOL = 0.9                # simplificação (unidades do SVG); ~0,9 px na tela
AREA_MIN = 2.0           # ilhas menores que isto (px²) saem


def laea(lon, lat):
    l, p = math.radians(lon), math.radians(lat)
    k = math.sqrt(2 / (1 + math.sin(P0) * math.sin(p) + math.cos(P0) * math.cos(p) * math.cos(l - L0)))
    return (R * k * math.cos(p) * math.sin(l - L0),
            R * k * (math.cos(P0) * math.sin(p) - math.sin(P0) * math.cos(p) * math.cos(l - L0)))


def dp(pts, tol):
    """Douglas-Peucker."""
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    n = math.hypot(dx, dy) or 1e-9
    imax, dmax = 0, -1
    for i in range(1, len(pts) - 1):
        x, y = pts[i]
        d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / n
        if d > dmax:
            imax, dmax = i, d
    if dmax > tol:
        return dp(pts[:imax + 1], tol)[:-1] + dp(pts[imax:], tol)
    return [pts[0], pts[-1]]


def area(pts):
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]))) / 2


def poligonos(geom):
    """Polígonos do continente: ficam de fora as ilhas oceânicas distantes (Galápagos, Trindade e Martim Vaz,
    Fernando de Noronha), que esticariam o quadro sem ajudar a leitura."""
    pols = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    return [pol for pol in pols if all(-82.5 < x < -34 for x, _ in pol[0])]


paises = json.load(open(PASTA / "ne_50m_admin_0_countries.geojson"))["features"]
estados = json.load(open(PASTA / "ne_10m_admin_1_states_provinces.geojson"))["features"]

feicoes = []  # (classe, nome, lista de anéis em lon/lat)
for f in paises:
    p = f["properties"]
    if p["CONTINENT"] == "South America":
        feicoes.append(("pais br" if p["ADM0_A3"] == "BRA" else "pais", p["NAME"], [a for pol in poligonos(f["geometry"]) for a in pol[:1]]))
    elif p["ADM0_A3"] == "FRA":  # Guiana Francesa (parte da França no Natural Earth)
        aneis = [pol[0] for pol in poligonos(f["geometry"]) if all(-55 < x < -51 and 1 < y < 6.5 for x, y in pol[0])]
        feicoes.append(("pais", "French Guiana", aneis))
bahia = [f for f in estados if f["properties"].get("adm1_code") == "BRA-528" or
         (f["properties"].get("admin") == "Brazil" and f["properties"].get("name") == "Bahia")]
assert len(bahia) == 1, "Bahia não encontrada"
feicoes.append(("ba", "Bahia", [pol[0] for pol in poligonos(bahia[0]["geometry"])]))

todos = [laea(x, y) for _, _, aneis in feicoes if _ != "ba" for a in aneis for x, y in a]
xmin = min(x for x, _ in todos); xmax = max(x for x, _ in todos)
ymin = min(y for _, y in todos); ymax = max(y for _, y in todos)
F = LARGURA / (xmax - xmin)  # unidades SVG por km


def P(lon, lat):
    x, y = laea(lon, lat)
    return ((x - xmin) * F, (ymax - y) * F)


def caminho(aneis):
    partes = []
    for a in aneis:
        pts = [P(x, y) for x, y in a]
        if area(pts) < AREA_MIN:
            continue
        # anel fechado: divide no ponto mais distante do primeiro antes de simplificar
        j = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
        s = dp(pts[:j + 1], TOL)[:-1] + dp(pts[j:], TOL)
        if len(s) < 4:
            continue
        partes.append("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in s[:-1]) + "Z")
    return "".join(partes)


saida = {
    "fonte": "Natural Earth (domínio público): ne_50m_admin_0_countries e ne_10m_admin_1_states_provinces",
    "projecao": {"nome": "Lambert azimutal equivalente", "lon0": LON0, "lat0": LAT0, "R": R,
                 "xmin": round(xmin, 3), "ymax": round(ymax, 3), "F": F},
    "largura": round((xmax - xmin) * F, 1), "altura": round((ymax - ymin) * F, 1),
    "feicoes": [{"classe": c, "nome": n, "d": caminho(a)} for c, n, a in feicoes],
}
# gratícula (arcos de 10 em 10 graus)
grat = []
for lat in range(-60, 21, 10):
    grat.append("M" + "L".join("%.1f,%.1f" % P(lon / 2, lat) for lon in range(-180, -40)))
for lon in range(-90, -19, 10):
    grat.append("M" + "L".join("%.1f,%.1f" % P(lon, lat / 2) for lat in range(-120, 30)))
saida["graticula"] = grat
saida["rotulos_graticula"] = [{"texto": t, "x": round(P(*ll)[0], 1), "y": round(P(*ll)[1] - 5, 1)}
                              for t, ll in [("0°", (-84, 0)), ("20°S", (-84, -20)), ("40°S", (-84, -40))]] + \
                             [{"texto": t, "x": round(P(*ll)[0], 1), "y": -7} for t, ll in [("70°O", (-70, 12.5)), ("50°O", (-50, 12.5))]]
# Caixas dos minimapas (Brasil e Bahia), em unidades do SVG
def caixa(nome):
    d = [f for f in saida["feicoes"] if f["nome"] == nome][0]["d"]
    import re as _re
    nums = [tuple(map(float, m)) for m in _re.findall(r"(-?[\d.]+),(-?[\d.]+)", d)]
    xs, ys = [p[0] for p in nums], [p[1] for p in nums]
    return [round(min(xs), 1), round(min(ys), 1), round(max(xs), 1), round(max(ys), 1)]
saida["caixas"] = {"Brasil": caixa("Brazil"), "Bahia": caixa("Bahia")}

SAIDA.write_text(json.dumps(saida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(SAIDA, round(SAIDA.stat().st_size / 1024), "KB", "largura", saida["largura"], "altura", saida["altura"])
