/* Tradução PT | EN embutida no site (sem serviço externo, sem cookies).
   Uso:  t("Texto em português")            -> texto no idioma ativo
         t`Exportação em ${ano}`             -> chave "Exportação em {0}"
   O dicionário (window.I18N_EN) fica em i18n-en.js. Chave ausente = mantém o português. */
(function () {
  const I = { lang: "pt" };
  I.definir = l => {
    I.lang = l === "en" ? "en" : "pt";
    document.documentElement.lang = I.lang === "en" ? "en" : "pt-BR";
  };
  function trad(chave) {
    if (I.lang !== "en") return null;
    const d = window.I18N_EN || {};
    return Object.prototype.hasOwnProperty.call(d, chave) ? d[chave] : null;
  }
  window.t = function (s, ...vals) {
    if (Array.isArray(s) && s.raw) { // template marcado
      const chave = s.reduce((acc, p, i) => acc + p + (i < vals.length ? `{${i}}` : ""), "");
      const alvo = trad(chave) ?? chave;
      return alvo.replace(/\{(\d+)\}/g, (_, i) => vals[+i]);
    }
    if (s == null) return s;
    return trad(s) ?? s;
  };
  window.I18N = I;
})();
