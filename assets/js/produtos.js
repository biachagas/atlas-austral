/* Atlas Austral · leitura dos arquivos de dados e desenho do catálogo, das capas e da ficha de produto.
   Os produtos ficam em dados/produtos/<id>.json e a ordem em dados/produtos.json (ver COMO-ACRESCENTAR-UM-PRODUTO.md).
   Nada vem de fora do site. */
(function () {
  "use strict";
  const A = window.Atlas;
  const L = A.txt;
  const TIPOS = {
    painel: { pt: "Painel interativo", en: "Interactive dashboard" },
    mapas: { pt: "Série de mapas", en: "Map series" },
    base: { pt: "Base de dados", en: "Dataset" },
    qgis: { pt: "Projeto QGIS", en: "QGIS project" }
  };
  const RECORTES = ["América do Sul", "Brasil", "Bahia", "Salvador"];
  const RECORTE_EN = { "América do Sul": "South America", "Brasil": "Brazil", "Bahia": "Bahia", "Salvador": "Salvador" };
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const semAcento = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  async function json(caminho) {
    const r = await fetch(caminho, { cache: "no-cache" });
    if (!r.ok) throw new Error(caminho + ": " + r.status);
    return r.json();
  }
  let cache = null;
  async function carregar() {
    if (cache) return cache;
    const lista = await json("dados/produtos.json");
    const produtos = await Promise.all(lista.produtos.map(id => json(`dados/produtos/${id}.json`).catch(e => { console.error(e); return null; })));
    const breve = await json("dados/em-breve.json").catch(() => ({ itens: [] }));
    cache = { produtos: produtos.filter(Boolean), breve: breve.itens || [] };
    return cache;
  }

  const tipoTxt = p => L(TIPOS[p.tipo]) || p.tipo;
  const linkFicha = p => A.link(`produto.html?id=${encodeURIComponent(p.id)}`);
  const recorteTxt = r => (A.lang === "en" ? RECORTE_EN[r] || r : r);

  function selos(p) {
    const s = (p.selos || []).map(x => `<span class="selo">${esc(A.t(x))}</span>`);
    if (p.status === "em andamento") s.splice(1, 0, `<span class="selo and">${esc(A.t("em andamento"))}</span>`);
    if (p.doi) s.push(`<span class="selo doi">DOI</span>`);
    return s.join("");
  }

  // Capa (imagem grande com faixa Navy), usada no Início, no Catálogo e em Sobre mim
  function capa(p) {
    return `<a class="capa" href="${linkFicha(p)}"><img src="${esc(p.imagem.arquivo)}" alt="" loading="lazy">
      <div class="vel"><span class="tag">${esc(tipoTxt(p))} · ${esc(L(p.local))}</span><h3>${esc(L(p.titulo))}</h3><div class="meta">${selos(p)}</div></div><i aria-hidden="true">→</i></a>`;
  }
  function etiquetasBreve(itens) {
    return itens.map(b => `<li><span>${esc(L(b.regiao))}</span>${esc(L(b.tema))}</li>`).join("");
  }
  function cartoesBreve(itens) {
    return itens.map(b => `<div class="bc"><span class="hach"></span><span class="tag verde">${esc(L(b.regiao))}</span><b>${esc(L(b.tema))}</b><small>${esc(A.t("Em avaliação. Publicado após o resultado."))}</small></div>`).join("");
  }

  // ---------- Catálogo ----------
  async function catalogo() {
    const { produtos, breve } = await carregar();
    const q0 = new URLSearchParams(location.search);
    const estado = { tipo: q0.get("tipo") || "", recorte: q0.get("recorte") || "", ano: q0.get("ano") || "", q: q0.get("q") || "" };
    const campo = document.getElementById("busca");
    campo.value = estado.q;
    const anos = [...new Set(produtos.map(p => String(p.ano)))].sort().reverse();
    const grupos = [
      ["tipo", A.t("Tipo"), Object.keys(TIPOS).map(k => [k, L(TIPOS[k])])],
      ["recorte", A.t("Recorte"), RECORTES.map(r => [r, recorteTxt(r)])],
      ["ano", A.t("Ano"), anos.map(a => [a, a])]
    ];
    const caixa = document.getElementById("filtros");
    caixa.innerHTML = grupos.map(([k, rot, ops]) =>
      `<div class="filtro" role="group" aria-label="${esc(rot)}"><span>${esc(rot)}</span>` +
      [["", A.t("Todos")], ...ops].map(([v, r]) => `<button type="button" data-f="${k}" data-v="${esc(v)}" aria-pressed="${estado[k] === v}">${esc(r)}</button>`).join("") +
      `</div>`).join("");
    caixa.addEventListener("click", ev => {
      const b = ev.target.closest("button[data-f]");
      if (!b) return;
      estado[b.dataset.f] = b.dataset.v;
      caixa.querySelectorAll(`button[data-f="${b.dataset.f}"]`).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      desenhar(true);
    });
    document.getElementById("form-busca").addEventListener("submit", ev => {
      ev.preventDefault(); estado.q = campo.value.trim(); desenhar(true);
    });
    campo.addEventListener("input", () => { estado.q = campo.value.trim(); desenhar(false); });

    function confere(p) {
      if (estado.tipo && p.tipo !== estado.tipo) return false;
      if (estado.recorte && p.recorte !== estado.recorte) return false;
      if (estado.ano && String(p.ano) !== estado.ano) return false;
      if (estado.q) {
        const alvo = semAcento([L(p.titulo), p.titulo_alternativo, L(p.resumo), L(p.local), p.recorte, recorteTxt(p.recorte), tipoTxt(p),
          L(TIPOS[p.tipo]), (TIPOS[p.tipo] || {}).en, p.palavras_chave, p.ano].join(" ").replace(/<[^>]+>/g, " "));
        return semAcento(estado.q).split(/\s+/).filter(Boolean).every(t => alvo.includes(t));
      }
      return true;
    }
    function desenhar(gravar) {
      const achados = produtos.filter(confere);
      document.getElementById("capas-cat").innerHTML = achados.map(capa).join("") ||
        `<p class="sem-resultado">${esc(A.t("Nenhum produto encontrado com esses filtros."))}</p>`;
      const n = achados.length;
      const filtrado = estado.q || estado.tipo || estado.recorte || estado.ano;
      document.getElementById("contagem").innerHTML = A.lang === "en"
        ? `<b>${n} ${filtrado ? (n === 1 ? "product found" : "products found") : (n === 1 ? "published product" : "published products")}</b> · newest first`
        : `<b>${n} ${filtrado ? (n === 1 ? "produto encontrado" : "produtos encontrados") : (n === 1 ? "produto publicado" : "produtos publicados")}</b> · do mais recente para o mais antigo`;
      if (gravar) {
        const p = new URLSearchParams();
        if (A.lang === "en") p.set("lang", "en");
        Object.entries(estado).forEach(([k, v]) => v && p.set(k, v));
        history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
      }
    }
    desenhar(false);
    document.getElementById("breve-cards").innerHTML = cartoesBreve(breve);
    if (location.hash === "#busca") campo.focus();
  }

  // ---------- Ficha de produto ----------
  function pessoa(c) {
    const perfis = [];
    if (c.orcid) perfis.push(`<a class="perfil" href="https://orcid.org/${esc(c.orcid)}"><img src="assets/img/perfis/orcid.svg" alt="">ORCID ${esc(c.orcid)}</a>`);
    if (c.lattes) perfis.push(`<a class="perfil" href="http://lattes.cnpq.br/${esc(c.lattes)}"><img src="assets/img/perfis/lattes.png" alt="">${esc(A.t("Currículo Lattes"))}</a>`);
    if (c.linkedin) perfis.push(`<a class="perfil" href="${esc(c.linkedin)}"><img src="assets/img/perfis/linkedin.png" alt="">LinkedIn</a>`);
    return `<div class="pessoa"><span class="tag">${esc(L(c.papel))}</span><b>${esc(c.nome)}</b>` +
      (c.nota ? `<small>${esc(L(c.nota))}</small>` : "") + (perfis.length ? `<div class="perfis">${perfis.join("")}</div>` : "") + `</div>`;
  }
  const FORMATOS = [["abnt", "ABNT (NBR 6023)"], ["apa", "APA (7ª ed.)"], ["iso", "ISO 690"]];
  function blocoCitar(p) {
    if (!p.citar) return "";
    const ops = FORMATOS.filter(([k]) => p.citar[k]).map(([k, r]) => `<option value="${k}">${esc(A.t(r))}</option>`).join("");
    return `<section class="bloco"><h2>${esc(A.t("Como citar"))}</h2>
      <label class="campo-cit">${esc(A.t("Formato"))} <select id="cit-estilo">${ops}</select></label>
      <p class="ref" id="cit-texto" aria-live="polite"></p>
      <button type="button" class="btn sec peq" id="cit-copiar">${esc(A.t("Copiar referência"))}</button><span class="copiar-ok" id="cit-ok" aria-live="polite"></span></section>`;
  }
  function ativarCitar(p) {
    const s = document.getElementById("cit-estilo");
    if (!s) return;
    const t = document.getElementById("cit-texto"), ok = document.getElementById("cit-ok");
    const mostra = () => { t.innerHTML = p.citar[s.value]; ok.textContent = ""; };
    s.addEventListener("change", mostra); mostra();
    document.getElementById("cit-copiar").addEventListener("click", async () => {
      const texto = t.textContent.trim();
      try { await navigator.clipboard.writeText(texto); ok.textContent = A.t("Referência copiada."); }
      catch (e) {
        const r = document.createRange(); r.selectNodeContents(t);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
        ok.textContent = A.t("Selecionada: use Ctrl+C para copiar.");
      }
    });
  }
  async function ficha() {
    const id = new URLSearchParams(location.search).get("id");
    const alvo = document.getElementById("ficha");
    let p = null;
    try { p = (await carregar()).produtos.find(x => x.id === id); } catch (e) { console.error(e); }
    if (!p) {
      alvo.innerHTML = `<div class="vazio-grande"><h1>${esc(A.t("Produto não encontrado"))}</h1><p>${esc(A.t("O endereço pode estar incompleto. Veja todos os produtos no catálogo."))}</p><a class="btn" href="${A.link("catalogo.html")}">${esc(A.t("Ver todo o catálogo →"))}</a></div>`;
      return;
    }
    const titulo = L(p.titulo);
    document.title = `${titulo} · Atlas Austral`;
    document.getElementById("trilha-atual").textContent = titulo;
    const im = p.imagem;
    const linkIm = im.link ? ` <a href="${esc(im.link.url)}">${esc(L(im.link.rotulo))}</a>` : "";
    const botoes = (p.botoes || []).map(b => b.url
      ? `<a class="btn${b.secundario ? " sec" : ""}" href="${esc(b.url)}">${esc(L(b.rotulo))}</a>`
      : `<span class="btn btn-off" aria-disabled="true">${esc(L(b.rotulo))}</span>`).join(" "); // botão sem "url" = desativado (ex.: pré-lançamento)
    const linhas = (p.ficha || []).map(f => `<tr><th scope="row">${esc(A.t(f.campo))}</th><td>${L(f.valor)}</td></tr>`).join("");
    const pubs = (p.publicacoes || []).length
      ? `<ul class="lista8">${p.publicacoes.map(x => `<li>${L(x.referencia)}${x.url ? ` <a href="${esc(x.url)}">${esc(A.t("Ver publicação →"))}</a>` : ""}</li>`).join("")}</ul>`
      : `<p class="vazio">${esc(A.t("Nenhuma publicação associada até o momento."))}</p>`;
    alvo.innerHTML = `
      <figure class="moldura-p"><img src="${esc(im.arquivo)}" alt="${esc(L(im.alt))}"><figcaption><span>${esc(L(im.legenda))}</span>${linkIm}</figcaption></figure>
      <div class="prod-txt"><span class="tag">${esc(tipoTxt(p))} · ${esc(L(p.local))}</span><h1>${esc(titulo)}</h1>
        ${p.titulo_alternativo && A.lang !== "en" ? `<p class="en-tit" lang="en">${esc(p.titulo_alternativo)}</p>` : ""}
        <div class="meta">${selos(p).replace('<span class="selo doi">DOI</span>', "")}</div>
        ${p.aviso ? `<p class="aviso-and">${esc(L(p.aviso))}</p>` : ""}
        <p>${L(p.resumo)}</p>
        <div class="acoes">${botoes}</div>
        ${p.doi ? `<p class="doi">DOI <a href="https://doi.org/${esc(p.doi)}">${esc(p.doi)}</a></p>` : ""}
      </div>
      <section class="bloco ficha-t"><h2>${esc(A.t("Ficha técnica"))}</h2><table>${linhas}</table></section>
      ${blocoCitar(p)}
      <section class="bloco"><h2>${esc(A.t("Créditos"))}</h2><div class="pessoas">${(p.creditos || []).map(pessoa).join("")}</div>
        ${p.apoio ? `<p class="apoio8">${esc(L(p.apoio))}</p>` : ""}</section>
      <section class="bloco"><h2>${esc(A.t("Publicações associadas"))}</h2>${pubs}</section>`;
    ativarCitar(p);
  }

  window.AtlasProdutos = { carregar, capa, etiquetasBreve, cartoesBreve, catalogo, ficha, tipoTxt, esc };
})();

/* Liga a página certa conforme os elementos presentes */
(function () {
  const P = window.AtlasProdutos;
  const erro = e => console.error("Atlas Austral:", e);
  if (document.getElementById("capas-cat")) P.catalogo().catch(erro);
  if (document.getElementById("ficha")) P.ficha().catch(erro);
  const eu = document.getElementById("capas-eu");
  if (eu) P.carregar().then(d => { eu.innerHTML = d.produtos.slice(0, 2).map(P.capa).join(""); }).catch(erro);
})();
