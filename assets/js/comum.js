/* Atlas Austral · funções comuns a todas as páginas
   - idioma PT | EN pelo endereço (?lang=en), no mesmo esquema do painel (i18n.js + i18n-en.js);
   - tradução automática do HTML: todo texto (ou elemento com <b>, <i>, <a> dentro) que estiver em i18n-en.js
     é trocado, assim como os atributos alt, title, aria-label e placeholder; marque com data-sem-traducao o que não deve ser traduzido
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

  // Tradução automática: qualquer elemento cujo conteúdo (ou texto) seja uma chave do dicionário é trocado.
  // Assim o HTML fica em português puro e o inglês vem só de i18n-en.js.
  const PULAR = new Set(["SCRIPT", "STYLE", "SVG", "svg", "TEXTAREA", "CODE", "NOSCRIPT"]);
  const ATRIBUTOS = ["alt", "title", "aria-label", "placeholder"];
  function tem(k) { return Object.prototype.hasOwnProperty.call(window.I18N_EN || {}, k); }
  function traduzir(raiz) {
    if (lang !== "en") return;
    (function andar(el) {
      for (const n of [...el.childNodes]) {
        if (n.nodeType === 3) {
          const k = norm(n.nodeValue);
          if (k && tem(k)) n.nodeValue = n.nodeValue.replace(n.nodeValue.trim(), window.I18N_EN[k]);
          else if (k && /[A-Za-zÀ-ú]{3}/.test(k) && el.closest && !el.closest("[data-sem-traducao]")) faltando.add(k);
        } else if (n.nodeType === 1 && !PULAR.has(n.tagName) && !n.hasAttribute("data-sem-traducao")) {
          ATRIBUTOS.forEach(a => { if (n.hasAttribute(a)) { const k = norm(n.getAttribute(a)); if (tem(k)) n.setAttribute(a, window.I18N_EN[k]); } });
          const k = norm(n.innerHTML);
          if (n.children.length && tem(k)) { n.innerHTML = window.I18N_EN[k]; continue; }
          andar(n);
        }
      }
    })(raiz.body || raiz);
    if (raiz === document) {
      const k = norm(document.title); if (tem(k)) document.title = window.I18N_EN[k];
      const m = document.querySelector('meta[name="description"]');
      if (m && tem(norm(m.content))) m.content = window.I18N_EN[norm(m.content)];
    }
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
