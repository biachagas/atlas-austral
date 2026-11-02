#!/usr/bin/env python3
"""Atualiza o cabeçalho e o rodapé de todas as páginas do site a partir de um único modelo.

Não faz parte do site (o site funciona sem rodar isto). Serve só para quem mantém o código:
se mudar um link do menu ou do rodapé, mude aqui e rode, na pasta do repositório:

    python3 ferramentas/cabecalho-rodape.py

Cada página tem os marcadores <!-- cabecalho -->…<!-- /cabecalho --> e <!-- rodape -->…<!-- /rodape -->;
o que estiver entre eles é substituído. O item do menu da página atual recebe aria-current="page".
"""
import pathlib, re, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent

MENU = [
    ("index.html", "Início"),
    ("catalogo.html", "Catálogo"),
    ("publicacoes.html", "Publicações"),
    ("consultoria.html", "Consultoria"),
    ("sobre-o-atlas.html", "Sobre o Atlas"),
    ("sobre-mim.html", "Sobre mim"),
]
# páginas que não estão no menu, mas acendem um item dele
PAI = {"produto.html": "catalogo.html"}

LUPA = ('<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" '
        'stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>')
TRES = ('<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" '
        'stroke-width="2" stroke-linecap="round"/></svg>')

FOTO = "https://commons.wikimedia.org/wiki/File:-2015-08-09-_Salvador_54_Romerito_Pontes_(20267312938).jpg"
CCBY = "https://creativecommons.org/licenses/by/2.0/deed.pt-br"


def cabecalho(pagina):
    atual = PAI.get(pagina, pagina)
    itens = "".join(
        f'<a href="{h}"{" aria-current=\"page\"" if h == atual else ""} data-t>{r}</a>' for h, r in MENU)
    return f"""<!-- cabecalho -->
<a class="pular" href="#conteudo" data-t>Pular para o conteúdo</a>
<header class="topo">
  <div class="wrap">
    <a class="marca" href="index.html"><img class="logo logo-claro" src="assets/img/logos/atlas-austral.svg" width="185" height="44" alt="Atlas Austral: página inicial" data-t-attr="alt"><img class="logo logo-escuro" src="assets/img/logos/atlas-austral-escuro.svg" width="185" height="44" alt="Atlas Austral: página inicial" data-t-attr="alt"></a>
    <nav class="nav" id="menu" aria-label="Menu principal" data-t-attr="aria-label">{itens}</nav>
    <div class="icones">
      <a class="ic busca-ic" href="catalogo.html#busca" title="Buscar no catálogo" aria-label="Buscar no catálogo" data-t-attr="title,aria-label">{LUPA}</a>
      <button type="button" class="lang" id="btn-idioma"><span class="on">PT</span><span>EN</span></button>
      <button type="button" class="ic mob" aria-expanded="false" aria-controls="menu" aria-label="Abrir menu">{TRES}</button>
    </div>
  </div>
</header>
<!-- /cabecalho -->"""


def rodape():
    return f"""<!-- rodape -->
<footer>
  <div class="cartao-logos">
    <img src="assets/img/logos/ppdru.png" width="153" height="62" alt="PPDRU: Programa de Pós-Graduação em Desenvolvimento Regional e Urbano" data-t-attr="alt">
    <img src="assets/img/logos/unifacs.png" width="282" height="62" alt="UNIFACS: Universidade Salvador">
    <img class="anima" src="assets/img/logos/anima.png" width="113" height="84" alt="Ânima Educação">
    <img class="capes" src="assets/img/logos/capes.png" width="384" height="70" alt="CAPES: Coordenação de Aperfeiçoamento de Pessoal de Nível Superior" data-t-attr="alt">
  </div>
  <nav class="links-rod wrap" aria-label="Links do rodapé" data-t-attr="aria-label">
    <img class="logo logo-claro" src="assets/img/logos/atlas-austral.svg" width="193" height="46" alt="Atlas Austral"><img class="logo logo-escuro" src="assets/img/logos/atlas-austral-escuro.svg" width="193" height="46" alt="Atlas Austral">
    <a href="sobre-o-atlas.html" data-t>Sobre o Atlas</a>
    <a href="consultoria.html" data-t>Consultoria</a>
    <a href="sobre-o-atlas.html#acessibilidade" data-t>Acessibilidade e privacidade</a>
    <a href="sobre-o-atlas.html#citar" data-t>Como citar</a>
    <em data-t>Cartografias de uma Internacionalista do Sul.</em>
  </nav>
  <div class="base wrap">
    <span><span data-t>Mapas e dados: CC BY-NC 4.0 · Código: MIT</span> · <span data-t>Silhueta do Farol da Barra baseada em foto de <a href="{FOTO}">Romerito Pontes</a> (Wikimedia Commons, <a href="{CCBY}">CC BY 2.0</a>)</span> · <span data-t>Sem cookies e sem rastreamento</span></span>
    <span>© 2026 Bianca Chagas · Atlas Austral</span>
  </div>
</footer>
<!-- /rodape -->"""


def aplicar(arquivo):
    s = arquivo.read_text(encoding="utf-8")
    novo = re.sub(r"<!-- cabecalho -->.*?<!-- /cabecalho -->", lambda m: cabecalho(arquivo.name), s, flags=re.S)
    novo = re.sub(r"<!-- rodape -->.*?<!-- /rodape -->", lambda m: rodape(), novo, flags=re.S)
    if novo != s:
        arquivo.write_text(novo, encoding="utf-8")
        return True
    return False


if __name__ == "__main__":
    mudou = [p.name for p in sorted(RAIZ.glob("*.html")) if aplicar(p)]
    print("atualizadas:", ", ".join(mudou) if mudou else "nenhuma")
