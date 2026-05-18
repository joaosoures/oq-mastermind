
## Objetivo

Criar fluxo administrativo para gerar OQs a partir de **Aulas** (texto de transcrição/material), com prompt editável, escolha de modelo de IA, vínculo OQ→Aula (usado depois para recomendar a aula correspondente ao OQ que o aluno mais erra) e dashboard por aula.

---

## 1. Backend (migration)

### Nova tabela `aulas`
- `id` uuid pk
- `nome` text not null
- `especialidade` especialidade (enum existente)
- `conteudo` text (transcrição/resumo da aula que alimenta a IA)
- `link_aula` text null (URL futura para redirecionar o aluno)
- `descricao` text null
- `criado_em`, `atualizado_em` timestamps
- RLS: apenas admins (has_role admin) podem SELECT/INSERT/UPDATE/DELETE.
- Leitura também liberada para qualquer authenticated (para que o aluno consiga buscar metadados da aula vinculada ao OQ que errou).

### Nova tabela `ia_prompts` (prompt editável e versionável)
- `id` uuid pk
- `chave` text unique (ex.: `gerar_oqs_aula`, `gerar_oqs_pdf`)
- `prompt` text not null
- `modelo_padrao` text not null (ex.: `google/gemini-2.5-flash`)
- `atualizado_em`, `atualizado_por` uuid
- RLS: SELECT/UPDATE só admins. Seed inicial com o system prompt atual da edge `gerar-oqs-ia` + chave `gerar_oqs_aula` herdando o mesmo prompt.

### Alterar tabela `cards`
- Adicionar coluna `aula_id uuid null` (sem FK rígida, igual ao padrão do projeto).
- Index em `aula_id`.
- RLS existente permanece.

### Alterar tabela `temp_oqs`
- Adicionar `aula_id uuid null` e `modelo_ia text null` para propagar até a aprovação.

### View / função auxiliar
- Função `aulas_stats()` retornando `aula_id, nome, especialidade, total, abcde, lacuna, oq_falta` agregando `cards` por `aula_id` e `modo`. Security definer, somente admin.

---

## 2. Edge function `gerar-oqs-aula`

Nova função (não modifica a existente para não quebrar fluxo dos usuários).

- Input: `{ aula_id, modelo, prompt_override?: string }`.
- Verifica JWT e role admin via `user_roles`.
- Carrega `aulas.conteudo` e `ia_prompts` (chave `gerar_oqs_aula`) se `prompt_override` não vier.
- Chama Lovable AI Gateway no `modelo` informado (whitelist: `google/gemini-2.5-pro`, `google/gemini-2.5-flash`, `google/gemini-2.5-flash-lite`, `openai/gpt-5`, `openai/gpt-5-mini`).
- Retorna `{ questions }` no mesmo shape da função atual.
- Reutiliza mesmo validador/mapeamento de modos.

Sem mexer em `LOVABLE_API_KEY` (já existe). Sem secrets novos.

---

## 3. Frontend

### Nova rota `/admin/gerar-aulas`
- Adicionada em `App.tsx` dentro de `ProtectedRoute adminOnly`.
- Botão no fim de `GerarOQs.tsx` (`isAdmin` only): **"GERAR A PARTIR DE AULAS"** — grande, estilo TactileButton, leva à nova página.

### Página `AdminGerarAulas.tsx` — 4 seções

**A. Aulas cadastradas**
- Lista/CRUD: criar, editar, excluir aula (nome, especialidade, conteúdo, link_aula).
- Select da aula ativa para gerar.

**B. Configuração da geração**
- Textarea grande com o `prompt` atual (carregado de `ia_prompts`), com botões **Salvar** e **Restaurar padrão**.
- Select do modelo de IA (whitelist acima), persistido como `modelo_padrao`.
- Select da aula (origem do conteúdo).
- Botão **Gerar OQs** → chama `gerar-oqs-aula`, insere em `temp_oqs` com `aula_id` + `modelo_ia` + `contexto_origem = "Aula: <nome>"`.

**C. Revisão dos OQs gerados**
- Reaproveita a mesma UI de `temp_oqs` da `GerarOQs.tsx` (lista, editar, aprovar, descartar, aprovar todos), filtrada por `aula_id` da sessão atual.
- Ao aprovar, grava `cards.aula_id` = aula selecionada.

**D. Estatísticas por aula**
- Tabela: nome da aula • especialidade • total OQs • por modo (ABC/DE, lacuna, OQ falta). Lê de `aulas_stats()`.

### Componentização
- Extrair `TempOQReview` (lista + editar + aprovar/descartar) de `GerarOQs.tsx` para `src/components/oq/TempOQReview.tsx` e reusar nas duas páginas. Isso evita duplicar ~400 linhas.

---

## 4. Vínculo OQ↔Aula (uso futuro)

- `cards.aula_id` permite, na tela de estudo do aluno, consultar a aula de origem do card mais errado e oferecer CTA "Reveja esta aula" usando `aulas.link_aula`. Sem UI nesta entrega — só o vínculo de dados pronto.

---

## Detalhes técnicos

- Modelo padrão sugerido: `google/gemini-2.5-flash` (mesmo da função atual).
- Sem alterações em `LOVABLE_API_KEY` ou secrets.
- Sem mudança de auth/RLS dos usuários comuns.
- Botão de acesso na `GerarOQs` aparece apenas se `isAdmin === true`.
- Nova rota protegida por `ProtectedRoute adminOnly`.
- Migration única cobre: `aulas`, `ia_prompts`, alter `cards`, alter `temp_oqs`, função `aulas_stats`, seed do prompt.

---

## Entregáveis

1. Migration SQL (tabelas, RLS, função, seed).
2. Edge function `supabase/functions/gerar-oqs-aula/index.ts`.
3. `src/pages/AdminGerarAulas.tsx`.
4. `src/components/oq/TempOQReview.tsx` (extração reusável).
5. Rota nova em `App.tsx`.
6. Botão admin grande no fim de `GerarOQs.tsx`.
