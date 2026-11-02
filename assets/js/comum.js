/* Atlas Austral · funções comuns a todas as páginas
   - idioma PT | EN pelo endereço (?lang=en), no mesmo esquema do painel (i18n.js + i18n-en.js);
   - tradução dos textos marcados no HTML:
       data-t            → troca o conteúdo do elemento (a chave é o texto em português, como está no HTML)
       data-t-attr="alt,title,aria-label,placeholder,content" → troca esses atributos
   - links internos levam o ?lang=en adiante;
   - menu do celular (botão ☰);
   - botão de contato: o e-mail só é montado no clique (D30), não fica escrito no código.
   Sem cookies e sem serviços externos. */
(function () {
  "use strict";
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang") === "en" ? "en" : "pt";
  window.I18N.definir(lang);

  const norm = s => s.replace(/\s+/g, " ").trim();
  const faltando = new Set();
  function tr(chave) {
    const k = norm(chave);
    if (lang !== "en" || !k) return k;
    const d = window.I18N_EN || {};
    if (Object.prototype.hasOwnProperty.call(d, k)) return d[k];
    faltando.add(k);
    return k;
  }

  // Link interno com o idioma atual
  function link(href) {
    if (!href || /^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(href)) return href;
    if (!/\.html(\?|#|$)/.test(href) && href !== "./") return href;
    if (lang !== "en") return href;
    const [semHash, hash] = href.split("#");
    const sep = semHash.includes("?") ? "&" : "?";
    return semHash + sep + "lang=en" + (hash !== undefined ? "#" + hash : "");
  }

  function traduzir(raiz) {
    if (lang !== "en") return;
    raiz.querySelectorAll("[data-t]").forEach(el => { el.innerHTML = tr(el.innerHTML); });
    raiz.querySelectorAll("[data-t-attr]").forEach(el => {
      el.getAttribute("data-t-attr").split(",").map(a => a.trim()).forEach(a => {
        if (el.hasAttribute(a)) el.setAttribute(a, tr(el.getAttribute(a)));
      });
    });
  }
  function ajustarLinks(raiz) {
    raiz.querySelectorAll("a[href]").forEach(a => {
      if (a.dataset.semIdioma !== undefined) return;
      a.setAttribute("href", link(a.getAttribute("href")));
    });
  }

  // Botão PT | EN: mesma página, outro idioma
  function botaoIdioma() {
    const b = document.getElementById("btn-idioma");
    if (!b) return;
    b.innerHTML = `<span class="${lang === "pt" ? "on" : ""}">PT</span><span class="${lang === "en" ? "on" : ""}">EN</span>`;
    const rot = lang === "en" ? "Ver em português" : "View in English";
    b.setAttribute("aria-label", rot);
    b.title = rot;
    b.setAttribute("lang", lang === "en" ? "pt-BR" : "en");
    b.addEventListener("click", () => {
      const p = new URLSearchParams(window.location.search);
      if (lang === "en") p.delete("lang"); else p.set("lang", "en");
      const q = p.toString();
      window.location.href = window.location.pathname + (q ? "?" + q : "") + window.location.hash;
    });
  }

  // Menu do celular
  function menuCelular() {
    const b = document.querySelector(".mob");
    const nav = document.getElementById("menu");
    if (!b || !nav) return;
    const rotulo = aberto => tr(aberto ? "Fechar menu" : "Abrir menu");
    b.setAttribute("aria-label", rotulo(false));
    b.addEventListener("click", () => {
      const abrir = !nav.classList.contains("aberto");
      nav.classList.toggle("aberto", abrir);
      b.setAttribute("aria-expanded", String(abrir));
      b.setAttribute("aria-label", rotulo(abrir));
      if (abrir) nav.querySelector("a")?.focus();
    });
    document.addEventListener("keydown", ev => {
      if (ev.key === "Escape" && nav.classList.contains("aberto")) {
        nav.classList.remove("aberto"); b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-label", rotulo(false)); b.focus();
      }
    });
  }

  // Contato (D30): o endereço é montado só no clique, a partir de pedaços invertidos
  const C = ["ab.sagahcacnaib", "moc.liamg"];
  function contato() {
    document.querySelectorAll("[data-contato]").forEach(el => {
      el.addEventListener("click", ev => {
        ev.preventDefault();
        const inv = s => s.split("").reverse().join("");
        const assunto = encodeURIComponent(lang === "en" ? "Contact via Atlas Austral" : "Contato pelo Atlas Austral");
        window.location.href = "mailto:" + inv(C[0]) + "@" + inv(C[1]) + "?subject=" + assunto;
      });
    });
  }

  function iniciar() {
    traduzir(document);
    ajustarLinks(document);
    botaoIdioma();
    menuCelular();
    contato();
    if (faltando.size && params.has("conferir")) console.warn("Atlas Austral: traduções que faltam", [...faltando]);
    document.documentElement.classList.add("js-pronto");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();

  // Para os outros scripts do site (catálogo, fichas, mapa)
  window.Atlas = {
    lang,
    t: tr,
    link,
    traduzir: raiz => { traduzir(raiz); ajustarLinks(raiz); },
    // texto bilíngue dos arquivos de dados: {"pt": "...", "en": "..."} ou texto simples
    txt: v => (v && typeof v === "object" && !Array.isArray(v)) ? (v[lang] ?? v.pt ?? "") : (v ?? ""),
    faltando: () => [...faltando]
  };
})();
