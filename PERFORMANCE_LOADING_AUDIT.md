# Auditoria de carregamento e assets

Data: 2026-09-05

## Budgets iniciais

- JS inicial comprimido: ideal <= 300 KB; aceitável <= 500 KB.
- CSS inicial comprimido: ideal <= 50 KB.
- Background inicial: ideal <= 500 KB; aceitável <= 800 KB.
- Sprite individual: preferencialmente dezenas de KB; aceitável enquanto 512x512 não pesar demais.
- Primeira carga total: idealmente poucos MB, não dezenas de MB.

## Antes

Último build antes desta rodada:

- JS inicial: 466,17 KB, gzip 133,75 KB.
- CSS inicial: 32,79 KB, gzip 7,82 KB.
- Assets emitidos no build: ~8,6 MB.
- Service worker/cache customizado: inexistente. O projeto usa manifest PWA, mas não faz precache de pasta inteira.
- Requests esperados na primeira tela jogável, após liberar gameplay: HTML, JS, CSS, background atual, ovo, sprites presentes no save e ícone/manifest quando o navegador solicitar.

Principais assets:

- `public/backgrounds/game-board.png`: 941x1672, 2,17 MB.
- `public/backgrounds/game-board-portal-cracked.png`: 941x1672, 2,17 MB.
- `public/backgrounds/game-board-portal-open.png`: 941x1672, 2,18 MB.
- Sprites de criaturas: 512x512, entre 92 KB e 313 KB.
- `src/assets/ui/ovo-cosmico.png`: 512x512, 96 KB.
- `public/ui/dex.png`: 232x232, 100 KB.

## Depois

Build após esta rodada:

- JS inicial: 467,66 KB, gzip 134,24 KB.
- CSS inicial: 32,75 KB, gzip 7,88 KB.
- Total em `dist`: ~8,60 MB.

Mudanças aplicadas:

- Background do estado atual passou a ser definido por variável inline no `gameStage`.
- Backgrounds de portal rachado/ativo saíram das regras CSS globais, evitando que estados futuros fiquem referenciados diretamente no CSS inicial.
- Preload discreto após gameplay/hidratação:
  - `portal-cracked` quando Nebulux já existe ou foi descoberto.
  - `portal-open` quando energia do portal rachado chega a 80%.
  - sprite resultante quando já existe par de merge imediato.
- A Dex não renderiza mais `<img>` real para espécies não descobertas; usa placeholder reservado.
- Imagens descobertas na Dex usam `loading="lazy"` e `decoding="async"`.
- Sprites de criaturas, ovos, drag preview e discovery têm fallback visual em caso de erro de imagem.

## Cache/PWA

Não existe service worker customizado nem precache indiscriminado. Isso é bom para o crescimento do jogo: criaturas, mapas e backgrounds futuros não entram automaticamente em um cache agressivo.

Recomendação para quando houver service worker:

- Precache apenas HTML/app shell mínimo, JS/CSS essenciais e ícones do app.
- Usar runtime caching para criaturas, backgrounds, mapas futuros e imagens de conteúdo.
- HTML/manifest/service worker devem revalidar; assets versionados/hash podem ter cache longo.

## Pontos que ficaram para depois

- Testar conversão visual de backgrounds para WebP/AVIF. Não havia `magick`, `cwebp` ou `avifenc` disponível localmente nesta rodada.
- Medir requests reais com Chrome DevTools/Lighthouse em Fast 3G/Slow 3G.
- Considerar code splitting futuro para Dex/mapas/painéis quando o conteúdo crescer.
- Avaliar sprites em WebP transparente caso mantenham bordas limpas e sem halo.

## Regra de evolução

Carregar agora o que o jogador vê agora. Pré-carregar discretamente apenas o que provavelmente verá em breve. O restante deve ser carregado sob demanda.
