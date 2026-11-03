# Como acrescentar um produto ao Atlas (sem mexer no código)

Tudo é feito pelo próprio site do GitHub, no navegador.

## 1. Imagem
Em `assets/img/produtos/`, clique em **Add file › Upload files** e envie a imagem do produto (JPG, cerca de 800×600 px, até 200 KB). Use um nome sem espaços nem acentos, por exemplo `p07-energia-bahia.jpg`.

## 2. Arquivo de dados
1. Abra `dados/produtos/`, entre em `p06-matatu.json` e copie todo o conteúdo.
2. Volte para `dados/produtos/`, clique em **Add file › Create new file** e dê o nome `p07-nome-curto.json`.
3. Cole o conteúdo e troque os valores. O que cada campo faz:

| Campo | O que é |
|---|---|
| `id` | igual ao nome do arquivo, sem `.json` |
| `tipo` | `painel`, `mapas`, `base` ou `qgis` |
| `recorte` | `América do Sul`, `Brasil`, `Bahia` ou `Salvador` (é o filtro do catálogo) |
| `ano`, `status` | ano do produto; `status`: `publicado` ou `em andamento` |
| `titulo`, `resumo`, `local` | texto em português (`pt`) e em inglês (`en`) |
| `titulo_alternativo` | título em inglês que já está no próprio trabalho (opcional) |
| `imagem` | caminho da imagem, texto alternativo (`alt`) e legenda |
| `botoes` | links (painel, GitHub, Zenodo). `"secundario": true` deixa o botão vazado |
| `ficha` | linhas da ficha técnica: `campo` (nome em português) e `valor` |
| `citar` | **as três referências: `abnt`, `apa` e `iso`** (obrigatório, D109) |
| `creditos` | pessoas: papel, nome e, se houver, `orcid`, `lattes` (só o número) e `linkedin` |
| `publicacoes` | lista de publicações associadas (pode ficar `[]`) |
| `mapa` | ponto no mapa do Início: `lon` e `lat` em graus decimais (oeste e sul são negativos), `cor` (`rosa` ou `laranja`), rótulo, detalhe e `posicao_rotulo` (posição do cartão, em % da largura e da altura do mapa) |
| `palavras_chave` | palavras extras para a busca |

Campos de texto aceitam `<b>`, `<i>` e `<a href="…">`. O que não souber, escreva `<span class="pend">pendente</span>`: nunca invente.

## 3. Lista de produtos
Abra `dados/produtos.json`, clique no lápis e acrescente o `id` na posição desejada (o primeiro aparece primeiro). Cuidado com as vírgulas:

```json
"produtos": [
  "p07-nome-curto",
  "p00-comex-bahia",
  "p06-matatu"
]
```

## 4. Trabalho que saiu do "em breve"
Apague o item correspondente em `dados/em-breve.json`. Enquanto o trabalho estiver em avaliação, ele fica **só** ali, com tema e região genéricos: nunca título, evento, revista ou autoria.

## 5. Salvar
Clique em **Commit changes**. Em um ou dois minutos o site atualiza. Se o catálogo ficar vazio, quase sempre é uma vírgula ou aspas faltando no arquivo: o site https://jsonlint.com mostra onde está o erro.

## Textos fixos das páginas
Os textos das páginas estão nos arquivos `.html`, em português. A tradução para o inglês fica em `assets/js/i18n-en.js`: se mudar um texto em português, mude a chave correspondente lá também.
