## Plano: Importação dos 202 materiais

### 1. Mapeamento CSV → tabela `materiais`

| CSV | Banco |
|---|---|
| NOME | `nome` |
| TIPO | `tipo_1` (sempre `"texto"` → normalizo para `"PDF"`) |
| LINK | `link_1` |
| TIPO 2 | `tipo_2` (sempre `"audio"` → `"AUDIO"`) |
| LINK 2 | `link_2` (todos preenchidos, nenhum `SEM AUDIO`) |
| ESPECIALIDADE | `especialidade` (normalizado para chave interna) |
| TIER | `tier` (1, 2 ou 3) |
| KEY WORDS | `key_words` |

Normalização de `especialidade` para casar com `ESPECIALIDADE_LABEL` da página:

- `Clínica Médica` → `clinica_medica`
- `Cirurgia Geral` → `cirurgia_geral`
- `Pediatria` → `pediatria`
- `GO` → `ginecologia_obstetricia`
- `Prev/MFC` → `medicina_preventiva`
- `Saúde Mental` → `saude_mental` *(não existe em `ESPECIALIDADE_LABEL`; a UI já faz fallback `|| m.especialidade`, então exibirá `saude_mental` cru — vou adicionar uma entrada local de label no `Materiais.tsx` para mostrar "Saúde Mental" corretamente nos filtros e cards)*

### 2. Importação

- 202 linhas serão inseridas via tool de insert SQL (um único `INSERT ... VALUES (...), (...)` em lote).
- Gerado a partir do CSV `/tmp/mat.csv` com escape de aspas simples nas key words.

### 3. Validação de fluxo na `/materiais`

- **Busca por Key Words**: o código já filtra por `m.key_words.toLowerCase().includes(searchTerm)` além do nome — ✅ funcionará após o insert. Vou validar com uma query (`select` por `ilike '%trombolise%'`).
- **Ordenação por Tier**: query já é `order("tier", { ascending: true })` — Tier 1 (alta incidência) aparece antes de Tier 3. ✅
- **Filtros de Especialidade e Tier**: já implementados via `Select`. Vou confirmar que aparecem todas as 6 especialidades após o insert.

### 4. Conflito com `sync.ts`

Análise: `src/lib/sync.ts` lida exclusivamente com a fila offline de `desempenho_cards` (resultados de OQs respondidos), gravando via `registrarDesempenho` na tabela `desempenho_cards`. Não toca em `materiais`, não compartilha localStorage key, não roda em rotas de Materiais. **Sem conflito** — nenhuma mudança necessária.

### Detalhes técnicos

- Migração não é necessária (schema já existe).
- Uso da tool `supabase--insert` com um único batch de 202 valores.
- Adição mínima em `src/pages/Materiais.tsx`: dicionário local `MATERIAL_ESPECIALIDADE_LABEL` que estende `ESPECIALIDADE_LABEL` com `saude_mental: "Saúde Mental"`, usado nos cards, filtros e modal.
- Sem alteração em `client.ts`, `AuthContext`, `sync.ts`, `queue.ts`.

### Entregáveis

1. Insert em lote dos 202 materiais.
2. Patch curto em `Materiais.tsx` para suportar `saude_mental`.
3. Verificação pós-insert via `select count(*)` por especialidade e por tier.
