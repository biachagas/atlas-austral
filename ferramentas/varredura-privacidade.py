#!/usr/bin/env python3
"""Varredura de privacidade antes de publicar (regra 6 do projeto).

Procura, em todos os arquivos do repositório (menos .git), coisas que não podem ir para o ar:
e-mails pessoais, links de sessão do assistente, CPF, telefone, chaves e tokens.
Uso, na pasta do repositório:   python3 ferramentas/varredura-privacidade.py
Sai com código 1 se encontrar algo (assim também serve para um robô de conferência).
"""
import pathlib, re, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
REGRAS = [
    ("e-mail (fora do noreply do GitHub)", re.compile(r"[\w.+-]+@(?!users\.noreply\.github\.com)(?:gmail|hotmail|outlook|yahoo|live|icloud|unifacs|ufba)\.[\w.]+", re.I)),
    ("link de sessão do assistente", re.compile(r"claude\.ai/code|Claude-Session", re.I)),
    ("CPF", re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b")),
    ("telefone", re.compile(r"\(?\b\d{2}\)?\s?9\d{4}-?\d{4}\b")),
    ("chave ou token", re.compile(r"(ghp_|github_pat_|sk-[A-Za-z0-9]{10}|AKIA[0-9A-Z]{12}|-----BEGIN [A-Z ]*PRIVATE KEY)")),
    ("arquivo privado", re.compile(r"INVENTARIO-PRIVADO|LISTA-PRODUCOES-RASCUNHO")),
]
IGNORAR = {".git"}
TEXTO = {".html", ".css", ".js", ".json", ".md", ".py", ".svg", ".txt", ".yml", ".yaml", ""}

achados = []
for arq in RAIZ.rglob("*"):
    if not arq.is_file() or any(p in IGNORAR for p in arq.parts) or arq.suffix.lower() not in TEXTO:
        continue
    if arq.resolve() == pathlib.Path(__file__).resolve():
        continue
    texto = arq.read_text(encoding="utf-8", errors="ignore")
    for nome, rx in REGRAS:
        for m in rx.finditer(texto):
            linha = texto.count("\n", 0, m.start()) + 1
            achados.append(f"{arq.relative_to(RAIZ)}:{linha}: {nome}: {m.group(0)[:40]}")

if achados:
    print("ATENÇÃO, encontrado:")
    print("\n".join(achados))
    sys.exit(1)
print("Varredura de privacidade: nada encontrado.")
