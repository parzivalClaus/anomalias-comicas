# Anomalias Cósmicas — Base do MVP

> Documento inicial para implementação com Codex.
> Objetivo: criar um protótipo jogável, bonito e pequeno o suficiente para validar o loop principal antes de expandir conteúdo.

## 1. Visão do jogo

**Anomalias Cósmicas** é um jogo casual de **merge + idle + coleção** com estética de criaturas gelatinosas alienígenas, ruínas antigas e fenômenos cósmicos.

O jogador mantém criaturas em um tabuleiro, compra novas criaturas básicas, recebe moedas passivamente e mescla duas criaturas iguais para descobrir uma forma evoluída.

A longo prazo, o diferencial será que nem toda evolução dependerá apenas de `1 + 1 = 2`: ambiente, objetos, tempo, posição no mapa, eventos e anomalias poderão alterar resultados. **Isso não entra no primeiro MVP.**

O jogo deve começar simples e transmitir a sensação de que existe algo maior por trás dele. Um **portal cósmico inativo** deve estar presente no cenário desde o início, sem função jogável no MVP.

---

## 2. Plataforma e stack

### Plataforma inicial

- Navegador.
- Interface pensada primeiro para **mobile vertical**.
- Deve continuar utilizável em desktop, centralizando a área de jogo com largura máxima semelhante a uma tela de celular/tablet.
- Estrutura preparada para futuramente virar **PWA/app mobile** e receber monetização, sem implementar anúncios agora.

### Stack preferida

- React.
- Vite.
- TypeScript.
- CSS Modules, CSS comum organizado ou outra solução leve. Evitar dependência pesada apenas para estilização.
- Persistência inicial em `localStorage`.
- Nenhum backend é necessário para o primeiro MVP.

### Princípios técnicos

- Componentes pequenos e reutilizáveis.
- Dados das criaturas separados da lógica visual.
- Nenhuma regra importante deve ficar hardcoded dentro do JSX.
- A estrutura deve permitir adicionar dezenas ou centenas de criaturas futuramente apenas cadastrando dados/assets.
- Não adicionar complexidade prematura.

---

## 3. Escopo do primeiro MVP

O MVP terá apenas **uma família com duas formas**.

Fluxo básico:

1. O jogador começa com algumas moedas e/ou uma criatura inicial.
2. Compra uma criatura básica.
3. A criatura ocupa um slot livre do mapa.
4. Cada criatura gera moedas passivamente.
5. Duas criaturas básicas iguais podem ser arrastadas uma sobre a outra.
6. As duas desaparecem e dão origem à criatura de nível 2.
7. A nova forma é registrada na Dex.
8. O jogador continua comprando, produzindo moedas e fazendo merges.

### O que precisa existir

- Tabuleiro 4 x 5 = **20 slots**.
- Compra da criatura básica.
- Drag and drop/touch para mover criaturas entre slots.
- Merge de duas criaturas compatíveis.
- Geração automática de moedas.
- Persistência do estado local.
- Dex com as duas criaturas.
- Descoberta visual da segunda criatura na Dex somente depois do primeiro merge.
- Animação idle das criaturas usando **um único PNG por criatura**.
- Feedback visual de merge.
- Portal inativo no cenário.

### Fora do MVP

Não implementar ainda:

- Login.
- Supabase/backend.
- Multiplayer.
- Ranking.
- Anúncios.
- Loja premium.
- Cristais/gemas.
- Missões diárias.
- Eventos.
- Ovos.
- Pesquisa.
- Mapas adicionais.
- Prestígio/reset.
- Evoluções secretas.
- Evoluções condicionais.
- Combinação entre espécies diferentes.
- Clima.
- Ciclo de dia/noite.
- Combate.
- NPCs.

Esses conceitos podem orientar a arquitetura, mas **não devem gerar código desnecessário agora**.

---

## 4. Identidade visual

Direção visual:

- Cute/cartoon.
- Criaturas gelatinosas e arredondadas.
- Natureza alienígena.
- Tons cósmicos.
- Ruínas antigas e tecnologia misteriosa.
- Interface arredondada, limpa e legível.
- Mobile vertical.

O cenário deverá futuramente ser fornecido como uma imagem estática própria, sem botões ou textos embutidos.

### Composição da tela inicial

Estrutura aproximada de cima para baixo:

1. HUD de moedas.
2. Área visual do cenário com o **portal cósmico apagado/inativo**.
3. Tabuleiro principal 4 x 5.
4. Botão grande de compra de criatura.
5. Botão/acesso para Dex.

No MVP, manter a interface propositalmente limpa. Não reproduzir todos os botões presentes nas artes conceituais.

---

## 5. O mapa/tabuleiro

O mapa possui exatamente **20 posições**, organizadas visualmente em:

```text
[ 01 ][ 02 ][ 03 ][ 04 ]
[ 05 ][ 06 ][ 07 ][ 08 ]
[ 09 ][ 10 ][ 11 ][ 12 ]
[ 13 ][ 14 ][ 15 ][ 16 ]
[ 17 ][ 18 ][ 19 ][ 20 ]
```

Cada slot pode conter no máximo uma criatura.

### Interações

- Arrastar uma criatura para slot vazio: move a criatura.
- Arrastar criatura sobre outra incompatível: retorna para a posição original.
- Arrastar criatura de nível 1 sobre outra criatura igual de nível 1: realiza merge.
- Criatura de nível 2 ainda não possui merge no MVP.
- Se todos os 20 slots estiverem ocupados, impedir nova compra e informar claramente que não há espaço.

O sistema de drag deve funcionar com:

- Mouse.
- Touch.
- Pointer events em navegadores modernos.

Priorizar boa experiência mobile.

---

## 6. Família inicial de criaturas

Nome provisório da família: **Família Nebular**.

### #001 — Nébulo

Primeira forma da anomalia.

**Conceito:** pequena criatura gelatinosa azul, curiosa, simples e extremamente expressiva apesar do corpo amorfo. É a forma primordial conhecida da espécie.

- `id`: `nebulo`
- Dex: `#001`
- Tier: 1
- Merge: `Nébulo + Nébulo -> Nebulume`
- Produção inicial sugerida: **1 moeda/segundo**.
- Custo inicial sugerido: **25 moedas**.

Descrição da Dex:

> Uma pequena anomalia gelatinosa que parece reagir ao ambiente ao seu redor. Ninguém sabe de onde vieram os primeiros Nébulos.

### #002 — Nebulume

Primeira evolução conhecida.

**Conceito:** forma maior e mais energética do Nébulo. Mantém a aparência gelatinosa e traços reconhecíveis da criatura original, mas apresenta estruturas/bolhas mais desenvolvidas e um brilho interno mais intenso.

- `id`: `nebulume`
- Dex: `#002`
- Tier: 2
- Sem merge adicional no MVP.
- Produção inicial sugerida: **3 moedas/segundo**.

Descrição da Dex:

> Quando dois Nébulos entram em ressonância, suas estruturas se fundem em uma anomalia maior. O processo libera uma quantidade incomum de energia.

> Os nomes podem ser alterados futuramente. O importante nesta etapa é manter a relação visual clara entre forma básica e evolução.

---

## 7. Economia inicial

Valores são provisórios e devem ficar em configuração/dados, nunca espalhados pelo código.

Sugestão inicial:

```ts
startingCoins = 100
nebuloPurchaseCost = 25
nebuloCoinsPerSecond = 1
nebulumeCoinsPerSecond = 3
```

No primeiro MVP, o preço pode permanecer fixo para facilitar testes.

Depois poderemos experimentar aumento progressivo de preço, por exemplo:

```text
25 -> 30 -> 36 -> 43 -> ...
```

Mas não implementar curva econômica complexa antes de validar o loop.

### Produção

A produção total é a soma de todas as criaturas presentes no mapa.

Exemplo:

```text
3 Nébulos     = 3 moedas/s
2 Nebulumes   = 6 moedas/s
TOTAL         = 9 moedas/s
```

A HUD deve mostrar:

```text
🪙 1.250
+9/s
```

---

## 8. Ganho offline

Implementar uma versão simples já no MVP.

Ao salvar, guardar um timestamp.

Quando o jogo for aberto novamente:

```text
tempoAusente = agora - ultimoTimestamp
recompensa = producaoPorSegundo * tempoAusente
```

Aplicar um limite inicial, por exemplo **8 horas**, para evitar valores absurdos.

Ao retornar, exibir modal simples:

```text
Enquanto você esteve fora...
+4.320 moedas
[Coletar]
```

Esse sistema deve ser simples e configurável.

---

## 9. Dex

A Dex é parte central do produto desde o primeiro MVP.

Tela/modal com duas entradas:

```text
#001 Nébulo
#002 ???
```

Ao realizar o primeiro merge:

```text
NOVA ANOMALIA DESCOBERTA
#002 Nebulume
```

Depois disso a Dex passa a mostrar:

```text
#001 Nébulo      ✓
#002 Nebulume    ✓
```

Mostrar também progresso:

```text
Anomalias descobertas
2 / 2
```

Mesmo tendo só duas criaturas inicialmente, a estrutura da Dex deve suportar muitas entradas futuramente.

---

## 10. Sistema visual das criaturas

**Regra fundamental:** uma criatura deve precisar de apenas **um PNG transparente**.

Não criar spritesheets ou múltiplos frames para idle.

O movimento será procedural via CSS/animação.

### Idle padrão — “respiração”

Combinar suavemente:

- `scaleX`.
- `scaleY`.
- pequeno `translateY`.

Exemplo conceitual:

```css
@keyframes breathe {
  0%, 100% {
    transform: translateY(0) scaleX(1) scaleY(1);
  }

  50% {
    transform: translateY(-2px) scaleX(1.025) scaleY(0.975);
  }
}
```

Duração aproximada:

```text
2.0s - 3.0s
```

Adicionar pequena variação aleatória de fase/duração entre criaturas para impedir que todas respirem sincronizadas.

### Sombra

Cada criatura deve possuir uma sombra separada da imagem:

- Elipse simples.
- Baixa opacidade.
- Pode variar levemente conforme o corpo sobe/desce.

### Efeitos externos

A arquitetura deve permitir efeitos separados do PNG:

- Bolhas.
- Partículas.
- Brilho.
- Eletricidade.
- Fumaça.
- Poeira cósmica.

Para o MVP, implementar apenas algumas bolhas discretas nos Nébulos/Nebulumes se isso não aumentar muito o escopo.

---

## 11. Feedback do merge

O merge precisa ser satisfatório mesmo com assets simples.

Sequência sugerida:

1. Jogador solta Nébulo A sobre Nébulo B.
2. Ambos fazem um pequeno squash/stretch.
3. Imagens convergem para o centro do slot.
4. Pequeno flash/partículas.
5. As duas desaparecem.
6. Nebulume nasce com animação:

```text
scale(0) -> scale(1.15) -> scale(0.95) -> scale(1)
```

7. Se for a primeira descoberta, abrir feedback de nova entrada na Dex.

Não bloquear a tela por muito tempo. A animação inteira pode durar aproximadamente 400–700 ms.

---

## 12. Portal cósmico

O portal é um elemento visual importante da identidade do jogo.

No MVP:

- Deve aparecer no cenário.
- Deve estar desligado/escuro.
- Não deve possuir funcionalidade.
- Não precisa de botão próprio.
- Não explicar ao jogador o que ele é.

**Importante:** estruturar visualmente como camada separada do background se for conveniente, pois futuramente queremos conseguir:

- Acender runas.
- Emitir pulsos.
- Aplicar glow.
- Trocar imagem/estado.
- Animar abertura.

O primeiro grande momento futuro do jogo será o portal reagir inesperadamente a alguma descoberta.

Não implementar essa progressão ainda.

---

## 13. Modelo de dados sugerido

### CreatureDefinition

```ts
interface CreatureDefinition {
  id: string;
  dexNumber: number;
  name: string;
  tier: number;
  image: string;
  coinsPerSecond: number;
  purchaseCost?: number;
  mergeResultId?: string;
  description: string;
  idleAnimation?: 'breathe' | 'float' | 'bounce';
  effect?: 'bubbles' | 'none';
}
```

### CreatureInstance

Uma criatura presente no tabuleiro deve possuir identidade própria.

```ts
interface CreatureInstance {
  instanceId: string;
  creatureId: string;
  slotIndex: number;
}
```

### GameState

```ts
interface GameState {
  coins: number;
  creatures: CreatureInstance[];
  discoveredCreatureIds: string[];
  lastSavedAt: number;
}
```

Não misturar definição da espécie com instância presente no mapa.

---

## 14. Estrutura sugerida do projeto

Não precisa seguir exatamente estes nomes, mas manter separação semelhante:

```text
src/
  assets/
    creatures/
    backgrounds/
    ui/

  components/
    GameBoard/
    BoardSlot/
    Creature/
    CoinHud/
    BuyCreatureButton/
    Dex/
    DiscoveryModal/
    OfflineRewardModal/
    Portal/

  data/
    creatures.ts
    gameConfig.ts

  hooks/
    useGameLoop.ts
    useGamePersistence.ts

  state/
    gameStore.ts

  types/
    game.ts

  utils/
    economy.ts
    merge.ts

  App.tsx
```

Pode usar Context + reducer ou Zustand. Se Zustand simplificar bastante o código, é uma escolha aceitável. Evitar Redux para este escopo.

---

## 15. Persistência

Salvar automaticamente em `localStorage` sempre que houver mudança relevante:

- Compra.
- Movimento.
- Merge.
- Descoberta.
- Moedas em intervalos razoáveis.

Não escrever em localStorage 60 vezes por segundo.

Sugestão:

- Estado visual de moedas pode atualizar frequentemente.
- Persistência pode ocorrer a cada poucos segundos e em ações importantes.

Adicionar botão de desenvolvimento para **resetar save** durante o MVP.

---

## 16. Responsividade

Base visual projetada para aproximadamente:

```text
390 x 844
430 x 932
```

Mas não usar dimensões fixas que quebrem outras telas.

Requisitos:

- Mobile vertical é prioridade.
- Tabuleiro deve caber sem scroll horizontal.
- Desktop deve exibir a aplicação centralizada.
- Imagens devem usar proporção e `object-fit` adequadamente.
- Considerar `safe-area-inset` para futura versão instalada em celulares.

---

## 17. Áudio

Não é obrigatório para a primeira entrega técnica.

Porém preparar pontos claros para futuramente adicionar:

- Compra.
- Drag/drop.
- Merge.
- Nova descoberta.
- Coleta de moedas.
- Portal.

Não adicionar biblioteca de áudio complexa neste momento.

---

## 18. Critérios de aceite do MVP

O MVP está funcional quando for possível:

- [ ] Abrir o jogo no navegador em formato vertical/mobile-first.
- [ ] Ver cenário com portal inativo.
- [ ] Ver tabuleiro 4x5 com 20 slots.
- [ ] Visualizar saldo de moedas e produção por segundo.
- [ ] Comprar um Nébulo se houver moedas e slot vazio.
- [ ] Ver o Nébulo executando animação idle com um único PNG.
- [ ] Arrastar criatura entre slots.
- [ ] Mesclar dois Nébulos.
- [ ] Criar um Nebulume após o merge.
- [ ] Receber produção maior do Nebulume.
- [ ] Abrir a Dex.
- [ ] Ver Nebulume oculto antes da primeira descoberta.
- [ ] Receber feedback de nova descoberta no primeiro merge.
- [ ] Ver Nebulume revelado posteriormente na Dex.
- [ ] Fechar e abrir o jogo sem perder progresso.
- [ ] Receber moedas referentes ao tempo offline, respeitando limite configurado.
- [ ] Resetar o save por ferramenta/botão de desenvolvimento.

---

## 19. Ordem recomendada de implementação

### Etapa 1 — Estrutura visual

- React/Vite/TypeScript.
- Layout mobile-first.
- Background.
- Portal.
- Grid 4x5.
- HUD.
- Botão comprar.

### Etapa 2 — Estado do jogo

- Creature definitions.
- Instances.
- Moedas.
- Compra.
- Slots.

### Etapa 3 — Interação

- Drag/touch.
- Movimento entre slots.
- Merge `Nébulo + Nébulo -> Nebulume`.

### Etapa 4 — Vida visual

- Respiração procedural.
- Sombras.
- Animação de nascimento/merge.
- Partículas simples.

### Etapa 5 — Dex

- Descobertas.
- Silhueta/??? para não descobertos.
- Modal de nova anomalia.

### Etapa 6 — Persistência

- LocalStorage.
- Save periódico.
- Offline earnings.
- Reset de desenvolvimento.

### Etapa 7 — Polimento

- Ajustar economia.
- Mobile/touch.
- Feedback quando grid estiver cheio.
- Microanimações.
- Revisão visual.

---

## 20. Direção futura — NÃO IMPLEMENTAR AGORA

Este MVP deve permitir expansão posterior para o conceito completo:

```text
merge(A, A)
merge(A, B)
adjacent(A, B)
expose(A, anomaly)
feed(A, item)
wait(A, duration)
timeOfDay(A, period)
weather(A, type)
count(A, amount)
```

A ideia central futura é que a Dex não seja apenas uma sequência linear. Algumas anomalias serão descobertas por experimentação e pistas.

Exemplo futuro:

```text
Nébulo + Nébulo -> Nebulume

Nebulume + condição cósmica -> ???
Nebulume + ambiente aquático -> ???
Nebulume perto de determinada espécie -> ???
```

O jogador deve inicialmente acreditar que entendeu a regra do jogo e, mais tarde, descobrir que o universo possui regras escondidas.

---

## 21. Regra de ouro para o Codex

**Priorizar um jogo pequeno, jogável e agradável em vez de antecipar funcionalidades futuras.**

Antes de adicionar qualquer sistema que não esteja explicitamente no MVP, perguntar:

> Isso é necessário para comprar uma criatura, gerar moedas, mover, fazer merge, descobrir o Nebulume ou registrar a Dex?

Se a resposta for não, provavelmente deve ficar para depois.

O primeiro objetivo não é criar um jogo completo.

O primeiro objetivo é responder:

> **É gostoso comprar Nébulos, vê-los vivos no tabuleiro, juntar dois e descobrir o Nebulume?**

Se esse loop funcionar, expandiremos o universo.
