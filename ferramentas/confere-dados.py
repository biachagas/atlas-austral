#!/usr/bin/env python3
"""Conferência dos arquivos de dados do Atlas (roda sozinha no GitHub a cada envio).

Confere:
- se todo arquivo .json do repositório abre sem erro (vírgula, aspas, chaves);
- se cada id de dados/produtos.json tem o seu arquivo em dados/produtos/ e vice-versa;
- se cada produto tem os campos obrigatórios, as três citações (ABNT, APA, ISO),
  o texto alternativo em PT e EN e a imagem no lugar indicado;
- se dados/em-breve.json só tem tema, região e posição (nada de título, revista ou autoria).
Uso, na pasta do repositório:   python3 ferramentas/confere-dados.py
Sai com código 1 se encontrar problema (o GitHub mostra um X vermelho e manda e-mail).
"""
import json, pathlib, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
problemas = []

def erro(onde, msg):
    problemas.append(f"- {onde}: {msg}")

def abrir(arq):
    try:
        return json.loads(arq.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        erro(arq.relative_to(RAIZ), f"o arquivo não abre (linha {e.lineno}, coluna {e.colno}: {e.msg}). "
             "Quase sempre é vírgula ou aspas faltando ou sobrando perto dessa linha.")
    except UnicodeDecodeError:
        erro(arq.relative_to(RAIZ), "o arquivo não está em UTF-8.")
    return None

# 1. Todo .json abre
dados = {}
for arq in sorted(RAIZ.rglob("*.json")):
    if ".git" in arq.parts:
        continue
    d = abrir(arq)
    if d is not None:
        dados[arq.relative_to(RAIZ).as_posix()] = d

def bilingue(onde, campo, v):
    if not isinstance(v, dict) or not str(v.get("pt", "")).strip() or not str(v.get("en", "")).strip():
        erro(onde, f'"{campo}" precisa ter texto em "pt" e em "en".')

# 2. Lista de produtos x arquivos
lista = dados.get("dados/produtos.json")
ids = []
if lista is not None:
    ids = lista.get("produtos", []) if isinstance(lista, dict) else []
    if not ids:
        erro("dados/produtos.json", 'a lista "produtos" está vazia ou faltando.')
    if len(ids) != len(set(ids)):
        erro("dados/produtos.json", "há um id repetido na lista.")
arquivos = {p.stem for p in (RAIZ / "dados/produtos").glob("*.json")}
for i in ids:
    if i not in arquivos:
        erro("dados/produtos.json", f'o id "{i}" está na lista, mas não existe dados/produtos/{i}.json.')
for a in sorted(arquivos - set(ids)):
    erro(f"dados/produtos/{a}.json", 'o arquivo existe, mas o id não está em dados/produtos.json (não aparece no site).')

# 3. Cada produto
OBRIG = ["id", "tipo", "recorte", "ano", "status", "titulo", "resumo", "imagem", "ficha", "citar", "creditos"]
TIPOS = {"painel", "mapas", "base", "qgis"}
RECORTES = {"América do Sul", "Brasil", "Bahia", "Salvador"}
for chave, d in dados.items():
    if not (chave.startswith("dados/produtos/") and chave.count("/") == 2):
        continue
    onde = chave
    if not isinstance(d, dict):
        erro(onde, "o conteúdo deveria começar com { e terminar com }."); continue
    for c in OBRIG:
        if c not in d:
            erro(onde, f'falta o campo "{c}".')
    if d.get("id") and d["id"] != pathlib.Path(chave).stem:
        erro(onde, f'o "id" ({d["id"]}) tem de ser igual ao nome do arquivo ({pathlib.Path(chave).stem}).')
    if "tipo" in d and d["tipo"] not in TIPOS:
        erro(onde, f'"tipo" deve ser um destes: {", ".join(sorted(TIPOS))}.')
    if "recorte" in d and d["recorte"] not in RECORTES:
        erro(onde, f'"recorte" deve ser um destes: {", ".join(sorted(RECORTES))}.')
    if "status" in d and d["status"] not in {"publicado", "em andamento"}:
        erro(onde, '"status" deve ser "publicado" ou "em andamento".')
    for c in ("titulo", "resumo"):
        if c in d: bilingue(onde, c, d[c])
    cit = d.get("citar")
    if isinstance(cit, dict) or cit is None:
        for n, rot in (("abnt", "ABNT"), ("apa", "APA"), ("iso", "ISO 690")):
            if not cit or not str(cit.get(n, "")).strip():
                erro(onde, f'falta a referência {rot} em "citar" -> "{n}" (D109).')
    img = d.get("imagem")
    if isinstance(img, dict):
        bilingue(onde, "imagem -> alt (texto alternativo)", img.get("alt"))
        arq = img.get("arquivo")
        if not arq:
            erro(onde, 'falta "imagem" -> "arquivo".')
        elif not (RAIZ / arq).is_file():
            erro(onde, f'a imagem "{arq}" não foi encontrada no repositório (confira o nome e a pasta).')
    m = d.get("mapa")
    if isinstance(m, dict):
        try:
            lon, lat = float(m["lon"]), float(m["lat"])
            if not (-82 <= lon <= -34 and -56 <= lat <= 13):
                erro(onde, f'o ponto do mapa ({lat}, {lon}) caiu fora da América do Sul. Sul e oeste são negativos; "lat" é a latitude e "lon" a longitude.')
        except (KeyError, TypeError, ValueError):
            erro(onde, '"mapa" precisa de "lon" e "lat" em número (graus decimais).')

# 4. Em breve: só tema genérico e região
eb = dados.get("dados/em-breve.json")
if isinstance(eb, dict):
    PERMIT = {"regiao", "tema", "ancora", "rotulo"}
    for n, it in enumerate(eb.get("itens", []), 1):
        extra = set(it) - PERMIT if isinstance(it, dict) else {"?"}
        if extra:
            erro("dados/em-breve.json", f"o item {n} tem campos não permitidos ({', '.join(sorted(extra))}). "
                 "Trabalho em avaliação leva só tema, região e posição: nunca título, evento, revista ou autoria.")
        elif isinstance(it, dict):
            for c in ("regiao", "tema"):
                bilingue(f"dados/em-breve.json, item {n}", c, it.get(c))

if problemas:
    print("CONFERÊNCIA: encontrei problemas. O site pode ficar quebrado até corrigir.\n")
    print("\n".join(problemas))
    sys.exit(1)
print(f"Conferência dos dados: tudo certo ({len(dados)} arquivos .json, {len(ids)} produtos).")
