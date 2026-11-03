/* Atlas Austral · Início: destaques do catálogo e etiquetas "em breve", lidos dos arquivos de dados. */
(function () {
  "use strict";
  const P = window.AtlasProdutos;
  function iniciar() {
    // textos dentro do desenho da faixa do Farol (SVG não passa pela tradução automática)
    if (window.Atlas.lang === "en") document.querySelectorAll(".faixa-ssa text").forEach(t => {
      t.textContent = t.textContent.replace("SALVADOR (BA)", "SALVADOR, BAHIA").replace("FAROL DA BARRA", "BARRA LIGHTHOUSE").replace(/(″)O$/, "$1W");
    });
    P.carregar().then(d => {
      const capas = document.getElementById("capas-inicio");
      if (capas) capas.innerHTML = d.produtos.slice(0, 2).map(P.capa).join("");
      const breve = document.getElementById("breve-inicio");
      if (breve) breve.innerHTML = P.etiquetasBreve(d.breve);
    }).catch(e => console.error("Atlas Austral:", e));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
