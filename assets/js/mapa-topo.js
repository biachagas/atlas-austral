/* Atlas Austral · mapa do topo do Início e minimapas de "Explore por recorte" (D88).
   Base: dados/mapa-base.json (Natural Earth, já projetado por ferramentas/gera-base-mapa.py).
   Pontos: lidos de cada arquivo de produto (campo "mapa") e de dados/em-breve.json, em longitude/latitude;
   são projetados aqui com a mesma projeção (azimutal equivalente de Lambert, centro 60°O, 15°S). */
(function () {
  "use strict";
  const A = window.Atlas, P = window.AtlasProdutos, esc = P.esc, L = A.txt;
  const NS = "http://www.w3.org/2000/svg";

  function projetor(pr) {
    const r = Math.PI / 180, l0 = pr.lon0 * r, p0 = pr.lat0 * r;
    return (lon, lat) => {
      const l = lon * r, p = lat * r;
      const k = Math.sqrt(2 / (1 + Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l - l0)));
      const x = pr.R * k * Math.cos(p) * Math.sin(l - l0);
      const y = pr.R * k * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l - l0));
      return [(x - pr.xmin) * pr.F, (pr.ymax - y) * pr.F];
    };
  }
  const grad = id => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2691F"/><stop offset="1" stop-color="#E85A8A"/></linearGradient>`;

  async function iniciar() {
    const caixa = document.getElementById("mapa-topo");
    if (!caixa) return;
    const [base, dados] = await Promise.all([fetch("dados/mapa-base.json").then(r => r.json()), P.carregar()]);
    const proj = projetor(base.projecao);
    const W = base.largura, H = base.altura, M = { e: 70, t: 30, d: 100, b: 60 };
    const vb = [-M.e, -M.t, W + M.e + M.d, H + M.t + M.b];

    // escala gráfica calculada na projeção: F unidades do SVG por km (vale no centro da projeção)
    const km = 1000, u = km * base.projecao.F;
    const sx = W - 250, sy = H + 22;
    const fmt = n => n.toLocaleString(A.lang === "en" ? "en" : "pt-BR");
    const projTxt = A.t("Projeção azimutal equivalente de Lambert (centro 60°O, 15°S)");

    const pontos = dados.produtos.filter(p => p.mapa).map(p => ({ p, xy: proj(p.mapa.lon, p.mapa.lat) }));
    const breve = dados.breve.map(b => ({ b, xy: proj(b.ancora[0], b.ancora[1]) }));
    const pct = ([x, y]) => [((x - vb[0]) / vb[2]) * 100, ((y - vb[1]) / vb[3]) * 100];
    const doPct = ([px, py]) => [vb[0] + (px / 100) * vb[2], vb[1] + (py / 100) * vb[3]];

    const titulo = A.t("Mapa da América do Sul com a Bahia em destaque e a localização das produções do Atlas");
    let svg = `<svg class="mapa-svg" role="img" aria-labelledby="mapa-tit mapa-desc" xmlns="${NS}" viewBox="${vb.join(" ")}">
      <title id="mapa-tit">${esc(titulo)}</title>
      <desc id="mapa-desc">${esc(mapaDescricao(dados))}</desc>
      <defs>${grad("poente")}</defs>
      <g class="grat">${base.graticula.map(d => `<path d="${d}"/>`).join("")}${base.rotulos_graticula.map(t => `<text x="${t.x}" y="${t.y}">${esc(A.lang === "en" ? t.texto.replace("O", "W") : t.texto)}</text>`).join("")}</g>
      ${base.feicoes.map(f => `<path class="${f.classe}" d="${f.d}"/>`).join("")}`;
    breve.forEach(({ b, xy }) => {
      const [lx, ly] = doPct([b.rotulo[0] + 8, b.rotulo[1] + 2.4]);
      svg += `<line class="lider" x1="${xy[0].toFixed(1)}" y1="${xy[1].toFixed(1)}" x2="${lx.toFixed(1)}" y2="${ly.toFixed(1)}"/><circle class="anc" cx="${xy[0].toFixed(1)}" cy="${xy[1].toFixed(1)}" r="3"/>`;
    });
    pontos.forEach(({ p, xy }) => {
      svg += `<circle class="pt${p.mapa.cor === "laranja" ? " sal" : ""}" cx="${xy[0].toFixed(1)}" cy="${xy[1].toFixed(1)}" r="${p.mapa.cor === "laranja" ? 6.5 : 8}"/>`;
    });
    svg += `<g class="rosa-v" transform="translate(${W - 20},${H - 190})"><image href="assets/img/logos/simbolo-cor.svg" x="-44" y="-44" width="88" height="88"/><text x="0" y="-52" text-anchor="middle">N</text></g>
      <g class="escala" transform="translate(${sx},${sy})"><path d="M0,0H${u.toFixed(1)}M0,-5V5M${(u / 2).toFixed(1)},-5V5M${u.toFixed(1)},-5V5"/>
        <text x="0" y="-9">0</text><text x="${(u / 2).toFixed(1)}" y="-9" text-anchor="middle">${fmt(km / 2)}</text><text x="${u.toFixed(1)}" y="-9" text-anchor="middle">${fmt(km)} km</text>
        <text class="proj" x="${(u - 330).toFixed(1)}" y="20">${esc(projTxt)}</text></g></svg>`;

    let html = svg;
    pontos.forEach(({ p }) => {
      const [x, y] = p.mapa.posicao_rotulo;
      html += `<a class="rot" href="${A.link("produto.html?id=" + encodeURIComponent(p.id))}" style="left:${x}%;top:${y}%"${p.mapa.cor === "laranja" ? ' data-cor="laranja"' : ""}>${esc(L(p.mapa.rotulo))}<small>${esc(L(p.mapa.detalhe))}</small></a>`;
    });
    breve.forEach(({ b }) => {
      html += `<a class="rot rbreve" href="${A.link("sobre-o-atlas.html#em-breve")}" style="left:${b.rotulo[0]}%;top:${b.rotulo[1]}%">${esc(A.t("Em breve"))} · ${esc(L(b.tema))}</a>`;
    });
    html += `<p class="leg-m">${pontos.map(({ p }) => `<span class="${p.mapa.cor === "laranja" ? "o" : ""}" aria-hidden="true">●</span> ${esc(L(p.mapa.rotulo))}`).join(" · ")}</p>`;
    caixa.innerHTML = html;
    minimapas(base);
  }

  function mapaDescricao(d) {
    const pub = d.produtos.filter(p => p.mapa).map(p => L(p.mapa.rotulo)).join("; ");
    const br = d.breve.map(b => `${L(b.regiao)}, ${L(b.tema)}`).join("; ");
    return A.lang === "en"
      ? `Published products: ${pub}. Coming soon (general topic and region only): ${br}.`
      : `Produtos publicados: ${pub}. Em breve (só tema e região gerais): ${br}.`;
  }

  // Minimapas: mesma base, recortes diferentes
  function minimapas(base) {
    const f = base.feicoes;
    const quad = (b, folga) => { const w = b[2] - b[0], h = b[3] - b[1], s = Math.max(w, h) * (1 + folga); return [b[0] + w / 2 - s / 2, b[1] + h / 2 - s / 2, s, s].map(v => v.toFixed(1)).join(" "); };
    const desenhos = {
      "America do Sul": { vb: quad([0, 0, base.largura, base.altura], 0.08), cls: () => "m-on", g: "pmsa" },
      "Brasil": { vb: quad(base.caixas.Brasil, 0.1), cls: x => (x.nome === "Brazil" || x.classe === "ba") ? "m-on" : "m-base", g: "pmbr" },
      "Bahia": { vb: quad(base.caixas.Bahia, 0.25), cls: x => x.classe === "ba" ? "m-forte" : x.nome === "Brazil" ? "m-br" : "m-base", g: "pmba" }
    };
    document.querySelectorAll("[data-minimapa]").forEach(el => {
      const d = desenhos[el.dataset.minimapa];
      el.innerHTML = `<svg class="mini" aria-hidden="true" focusable="false" xmlns="${NS}" viewBox="${d.vb}"><defs>${grad(d.g)}</defs>${f.map(x => `<path class="${d.cls(x)}" style="fill:url(#${d.g})${d.cls(x) === "m-on" || d.cls(x) === "m-forte" ? "" : ";fill:none"}" d="${x.d}"/>`).join("")}</svg>`;
      el.querySelectorAll("path").forEach(p => { if (!/m-on|m-forte/.test(p.getAttribute("class"))) p.removeAttribute("style"); });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => iniciar().catch(e => console.error(e)));
  else iniciar().catch(e => console.error(e));
})();
