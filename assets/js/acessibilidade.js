/* Menu de acessibilidade — componente reaproveitável (painel de Comércio Exterior da Bahia e site do Atlas Austral).
   Não depende do código das páginas. Precisa só de:
     - um botão de idioma #btn-idioma (o botão do menu entra logo antes dele) ou um elemento [data-a11y-botao] (o botão entra dentro dele);
     - opcionalmente window.t() para traduzir (sem t(), fica em português). Ao mudar <html lang>, os textos do menu são refeitos.
   A escolha fica só no navegador da pessoa (localStorage "atlas-austral-a11y"); nada é enviado a lugar nenhum.
   Aplica classes no <html>: a11y-contraste, a11y-escuro, a11y-cinza, a11y-links, a11y-titulos, a11y-cursor, a11y-sem-animacao,
   e a variável CSS --a11y-escala (tamanho do texto). Avisa as páginas com o evento "atlas-a11y" em document. */
(function () {
  "use strict";
  const CHAVE = "atlas-austral-a11y";
  const ESCALAS = [0.875, 1, 1.125, 1.25, 1.5];
  const OPCOES = [ // chave, classe no <html>, rótulo
    ["contraste", "a11y-contraste", "Alto contraste"],
    ["escuro", "a11y-escuro", "Modo escuro"],
    ["cinza", "a11y-cinza", "Tons de cinza"],
    ["links", "a11y-links", "Destacar links"],
    ["titulos", "a11y-titulos", "Destacar títulos"],
    ["cursor", "a11y-cursor", "Cursor grande"],
    ["semAnimacao", "a11y-sem-animacao", "Pausar animações"]
  ];
  const tr = s => (typeof window.t === "function" ? window.t(s) : s);
  const raiz = document.documentElement;
  const mm = q => { try { return window.matchMedia(q).matches; } catch (e) { return false; } };

  // Padrão: segue as preferências do sistema (movimento reduzido e contraste maior); o modo escuro nunca liga sozinho.
  function padrao() {
    return { escala: 1, contraste: mm("(prefers-contrast: more)"), escuro: false, cinza: false, links: false,
      titulos: false, cursor: false, semAnimacao: mm("(prefers-reduced-motion: reduce)") };
  }
  function ler() {
    const e = padrao();
    try {
      const s = JSON.parse(window.localStorage.getItem(CHAVE) || "null");
      if (s && typeof s === "object") {
        if (ESCALAS.includes(s.escala)) e.escala = s.escala;
        OPCOES.forEach(([k]) => { if (typeof s[k] === "boolean") e[k] = s[k]; });
      }
    } catch (err) { /* armazenamento indisponível: vale só nesta página */ }
    return e;
  }
  function gravar() {
    try { window.localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (err) { /* segue sem guardar */ }
  }
  function apagar() {
    try { window.localStorage.removeItem(CHAVE); } catch (err) { /* nada */ }
  }

  let estado = ler();
  function aplicar(mudou) {
    raiz.style.setProperty("--a11y-escala", String(estado.escala));
    raiz.classList.toggle("a11y-texto-grande", estado.escala > 1.125);
    OPCOES.forEach(([k, cls]) => raiz.classList.toggle(cls, !!estado[k]));
    if (mudou) document.dispatchEvent(new CustomEvent("atlas-a11y", { detail: { estado: { ...estado }, mudou } }));
  }
  aplicar(); // antes de desenhar a página, para não piscar

  // ---------- interface ----------
  const ICONE = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <circle cx="12" cy="6.6" r="1.7" fill="currentColor"/>
    <path d="M6.5 9.3l5.5 1.2 5.5-1.2M12 10.5v3.6M12 14.1l-2.6 4.8M12 14.1l2.6 4.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  let btn, painel, fundo;

  function montar() {
    btn = document.createElement("button");
    btn.type = "button";
    btn.id = "a11y-botao";
    btn.className = "btn btn-claro a11y-botao";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", "a11y-painel");
    const ancora = document.getElementById("btn-idioma");
    const lugar = document.querySelector("[data-a11y-botao]");
    if (ancora && ancora.parentNode) ancora.parentNode.insertBefore(btn, ancora);
    else if (lugar) lugar.appendChild(btn);
    else { btn.classList.add("a11y-botao-flutuante"); document.body.appendChild(btn); }

    fundo = document.createElement("div");
    fundo.className = "a11y-fundo";
    fundo.hidden = true;
    fundo.addEventListener("click", () => fechar(true));

    painel = document.createElement("div");
    painel.id = "a11y-painel";
    painel.className = "a11y-painel";
    painel.setAttribute("role", "dialog");
    painel.setAttribute("aria-modal", "false");
    painel.setAttribute("aria-labelledby", "a11y-titulo");
    painel.hidden = true;
    document.body.append(fundo, painel);

    btn.addEventListener("click", () => (painel.hidden ? abrir() : fechar(true)));
    painel.addEventListener("click", ev => {
      const b = ev.target.closest("button[data-a11y]");
      if (!b) return;
      const acao = b.dataset.a11y;
      if (acao === "fechar") return fechar(true);
      if (acao === "mais" || acao === "menos") {
        const i = ESCALAS.indexOf(estado.escala) + (acao === "mais" ? 1 : -1);
        if (i < 0 || i >= ESCALAS.length) return;
        estado.escala = ESCALAS[i];
        gravar(); aplicar("escala"); atualizarEstados();
        return;
      }
      if (acao === "restaurar") {
        apagar(); estado = padrao(); aplicar("restaurar"); atualizarEstados();
        avisar(tr("Configurações de acessibilidade restauradas."));
        return;
      }
      estado[acao] = !estado[acao];
      gravar(); aplicar(acao); atualizarEstados();
    });
    window.addEventListener("resize", () => { if (!painel.hidden) posicionar(); });
    document.addEventListener("atlas-a11y", () => { if (!painel.hidden) requestAnimationFrame(posicionar); });
    document.addEventListener("keydown", ev => {
      if (ev.key === "Escape" && !painel.hidden) { ev.preventDefault(); fechar(true); }
    });
    // Troca de idioma do site (atributo lang do <html>) refaz os textos do menu
    new MutationObserver(textos).observe(raiz, { attributes: true, attributeFilter: ["lang"] });
    textos();
  }

  function textos() {
    if (!btn) return;
    const rot = tr("Acessibilidade");
    btn.innerHTML = `${ICONE}<span class="a11y-botao-txt sr-only">${rot}</span>`;
    btn.setAttribute("aria-label", tr("Menu de acessibilidade"));
    btn.title = tr("Menu de acessibilidade");
    const aberto = !painel.hidden;
    painel.innerHTML = `
      <div class="a11y-cab">
        <h2 id="a11y-titulo">${rot}</h2>
        <button type="button" class="a11y-fechar" data-a11y="fechar" aria-label="${tr("Fechar o menu de acessibilidade")}">✕ <span>${tr("Fechar")}</span></button>
      </div>
      <div class="a11y-corpo">
        <div class="a11y-grupo" role="group" aria-labelledby="a11y-t-texto">
          <p class="a11y-sub" id="a11y-t-texto">${tr("Tamanho do texto")}</p>
          <div class="a11y-tamanho">
            <button type="button" class="a11y-op" data-a11y="menos"><span aria-hidden="true">A−</span> ${tr("Diminuir texto")}</button>
            <output class="a11y-nivel" aria-live="polite"></output>
            <button type="button" class="a11y-op" data-a11y="mais"><span aria-hidden="true">A+</span> ${tr("Aumentar texto")}</button>
          </div>
        </div>
        <div class="a11y-grupo" role="group" aria-label="${tr("Opções de exibição")}">
          ${OPCOES.map(([k, , r]) => `<button type="button" class="a11y-op a11y-liga" data-a11y="${k}" aria-pressed="false"><span class="a11y-chave" aria-hidden="true"></span>${tr(r)}</button>`).join("")}
        </div>
        <button type="button" class="a11y-op a11y-restaurar" data-a11y="restaurar">↺ ${tr("Restaurar padrão")}</button>
        <p class="a11y-nota">${tr("Suas escolhas ficam só neste navegador e não são enviadas a lugar nenhum.")}</p>
        <p class="sr-only a11y-aviso" aria-live="polite"></p>
      </div>`;
    atualizarEstados();
    if (aberto) painel.querySelector("#a11y-titulo").focus?.();
  }

  function atualizarEstados() {
    if (!painel) return;
    const i = ESCALAS.indexOf(estado.escala);
    const pct = (estado.escala * 100).toLocaleString(raiz.lang === "en" ? "en" : "pt-BR", { maximumFractionDigits: 1 }) + "%";
    const nivel = painel.querySelector(".a11y-nivel");
    nivel.textContent = pct;
    nivel.setAttribute("aria-label", `${tr("Tamanho do texto")}: ${pct}`);
    painel.querySelector('[data-a11y="menos"]').disabled = i <= 0;
    painel.querySelector('[data-a11y="mais"]').disabled = i >= ESCALAS.length - 1;
    OPCOES.forEach(([k]) => painel.querySelector(`[data-a11y="${k}"]`).setAttribute("aria-pressed", String(!!estado[k])));
  }
  function avisar(msg) {
    const a = painel.querySelector(".a11y-aviso");
    if (a) { a.textContent = ""; setTimeout(() => { a.textContent = msg; }, 30); }
  }
  // O painel abre logo abaixo do cabeçalho onde está o botão, para o botão e o PT | EN continuarem à mão
  function posicionar() {
    const cab = btn.closest("header");
    const topo = cab && getComputedStyle(cab).position !== "static" ? Math.max(0, Math.round(cab.getBoundingClientRect().bottom)) : 0;
    painel.style.top = fundo.style.top = topo + "px";
  }
  function abrir() {
    posicionar();
    painel.hidden = false; fundo.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    raiz.classList.add("a11y-aberto");
    const h = painel.querySelector("#a11y-titulo");
    h.setAttribute("tabindex", "-1"); h.focus();
  }
  function fechar(devolverFoco) {
    painel.hidden = true; fundo.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    raiz.classList.remove("a11y-aberto");
    if (devolverFoco) btn.focus();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
  else montar();

  window.AtlasA11y = {
    estado: () => ({ ...estado }),
    semAnimacao: () => !!estado.semAnimacao,
    abrir: () => abrir(), fechar: () => fechar(true), textos: () => textos()
  };
})();
