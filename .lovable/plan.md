# Plano: Melhorias do leitor de Materiais no mobile

## 1. Grifo por toque (sem precisar segurar)

Problema: no mobile, o long-press seleciona a tela inteira e dificulta grifar.

Solução — modo "Tap to Highlight" no mobile:
- Adicionar um botão flutuante (canto inferior esquerdo do viewer) tipo "marcador" com 3 estados: **off / amarelo / verde / rosa** (ciclando ou expandindo um pequeno menu).
- Quando o modo grifo estiver ativo:
  - No mobile, desabilitar `user-select` para o PDF (evita seleção bagunçada).
  - Cada **tap em uma palavra** sobre a TextLayer detecta o nó de texto sob o ponto (`document.caretRangeFromPoint`), seleciona aquela palavra (regex `\S+`), gera o retângulo normalizado e salva imediatamente como `material_highlights` — sem precisar abrir o tooltip.
  - Taps consecutivos em palavras adjacentes **estendem** o último grifo (mesma linha): faz merge dos rects no registro mais recente, em vez de criar vários.
- Quando o modo grifo estiver **off**, mantemos o comportamento atual (seleção + tooltip) que funciona bem no desktop.

## 2. Borracha / Desfazer grifo

Problema: hoje só dá para apagar com duplo clique ou hover, inviável no mobile.

Solução:
- Adicionar no mesmo botão flutuante um modo **Borracha** (ícone `Eraser`).
- Com borracha ativa: um **tap** em qualquer marcação a remove (chama `deleteHighlight`).
- Adicionar também um botão **Desfazer** (`Undo2`) ao lado, que remove a última marcação criada na sessão (stack local de IDs).
- O painel flutuante de ferramentas fica fixo, vertical, no canto inferior esquerdo, com:
  - botão grifo (cor atual visível, tap longo abre cores)
  - botão borracha
  - botão desfazer

## 3. Zoom padrão fixo em 120%

- Em `MaterialPdfViewer`, alterar o estado inicial para `useState(1.2)` e remover o ajuste automático que sobe para 1.4 no mobile.
- Manter os botões +/− funcionando normalmente (o usuário ainda pode alterar pontualmente, mas o padrão ao abrir qualquer PDF passa a ser 120%).

## 4. Anotações em tela quase cheia + scroll + parágrafos pré-preenchidos

Problema: teclado do celular cobre o textarea.

Solução no `Sheet` de Anotações em `Materiais.tsx`:
- Altura do sheet: `h-[95vh]` no mobile (`sm:h-[600px]` no desktop) — abre quase até o topo.
- Header compacto + `Textarea` envolto em um container com `overflow-y-auto` (scroll explícito).
- Garantir que o textarea cresça e role: `flex-1 min-h-0` no wrapper, `min-h-[120vh]` no textarea para sempre haver espaço de rolagem mesmo com teclado aberto.
- Quando `noteContent` estiver vazio, pré-popular ao abrir com várias linhas em branco (≈ 15 linhas `\n`) para o usuário já ter "papel" para rolar e o cursor não ficar colado no topo.
- Adicionar `scroll-margin` e, ao focar o textarea, fazer `scrollIntoView({ block: "center" })` para reposicionar acima do teclado.

## Detalhes técnicos

Arquivos a alterar:
- `src/components/MaterialPdfViewer.tsx`
  - novo estado `tool: "none" | "highlight" | "eraser"` + `highlightColor`
  - novo handler `onPageTap(e, pageNumber)` que usa `caretRangeFromPoint` para pegar a palavra
  - função `extendOrCreateHighlight(rects, text, page, color)` com merge na última marcação da mesma linha (mesma y±2%)
  - `deleteLastHighlight()` para desfazer
  - quando `tool !== "none"` no mobile: aplicar `select-none` na Document e interceptar clicks
  - zoom inicial = `1.2`
  - UI: painel vertical flutuante no canto inferior esquerdo
- `src/pages/Materiais.tsx`
  - `SheetContent` de anotações: altura `h-[95vh]`, layout flex coluna
  - Textarea com wrapper rolável + pré-preenchimento condicional
  - `onFocus` scroll

Nada de mudanças no schema do banco — `material_highlights` já tem `position.rects[]` e suporta tudo.
