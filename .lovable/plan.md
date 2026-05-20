## Trilha Estratégica — Nova Aba (Mapa para a Prova)

Nova rota `/trilha` no app, com visual no mesmo padrão da "Área do Aluno" (Estudo/Dashboard). Aproveita o vínculo `cards.aula_id → materiais.id` e o `materiais.tier` (prevalência) como base do algoritmo.

### Estrutura visual (5 blocos)

```text
┌──────────────────────────────────────────────┐
│ [⚙ Config]   Trilha Estratégica              │
│  Status: 4/7 metas  ████████░░  •  Pediatria │
├──────────────────────────────────────────────┤
│ 🔥 FOCO SINCRONIZADO (rodízio atual)         │
│   • Card Aula → [Material] [Baralho] [Rev]   │
├──────────────────────────────────────────────┤
│ 🎯 BASE DA PROVA (tier 1 — alta prevalência) │
│   • Card Aula → [Material] [Baralho] [Rev]   │
├──────────────────────────────────────────────┤
│ ⏰ PENDÊNCIAS (só se houver atraso)          │
│   • Tema X  [Fazer agora] [Redistribuir]     │
├──────────────────────────────────────────────┤
│ 🔍 Revisão específica: [busca matéria/aula]  │
└──────────────────────────────────────────────┘
```

### 1. Setup inicial (pop-up + engrenagem)

Modal aberto no primeiro acesso, depois acessível por botão de engrenagem:

- **Data da prova** (date picker) e **prova alvo** (texto livre: ENARE, PSU-MG…)
- **Perfil**: Médico / Interno 4º ano / Interno geral
- **Rodízio atual** + lista dinâmica dos próximos rodízios (especialidade + nº semanas)
- **Disponibilidade**: 7 toggles dia da semana + horas/dia (slider 0–8h)

Salvo em `user_settings.settings.trilha` (jsonb já existente — não precisa migração).

### 2. Cabeçalho

- Barra de progresso semanal "X/Y metas concluídas" — meta = soma de cards previstos para a semana corrente baseada em horas disponíveis (≈ 30 OQs/hora).
- Tag de contexto do rodízio atual.

### 3. Corpo — Conteúdos da semana

Algoritmo (client-side, sem novas tabelas):

1. Carrega `materiais` + contagem de cards por aula via consulta já existente.
2. **Foco sincronizado**: filtra materiais cuja `especialidade` ou `key_words` casa com o rodízio atual (e próximos rodízios próximos).
3. **Base da prova**: materiais com `tier = 1` (alta prevalência) não cobertos pelo foco.
4. Tier 3 é empurrado para semanas futuras (até a data da prova).
5. Cada container: nome da aula, especialidade, contadores (#OQs), e botões:
  - **[Material]** → `/materiais?id=…`
  - **[Baralho]** → `/estudo?aula=…`
  - **[Revisão]** → `/estudo?aula=…&modo=revisao`

### 4. Gestor de atrasos

Calcula com base em `historico_estudo` da semana anterior (já existe). Se cards previstos > cards estudados, mostra pendências:

- **[Fazer agora]** → entra no estudo daquele baralho
- **[Redistribuir]** → marca aula no `settings.trilha.redistribuidos` com prazo nas próximas N semanas. Itens já redistribuídos não podem ser redistribuídos de novo (flag `ja_redistribuido`).

### 5. Revisão específica

Combobox com busca em `materiais.nome / especialidade / key_words`, ao escolher: navega para `/estudo?aula=…`.

### Arquivos

**Novos:**

- `src/pages/TrilhaEstrategica.tsx` — página principal
- `src/components/trilha/SetupDialog.tsx` — modal de configuração
- `src/components/trilha/SemanaHeader.tsx` — barra de progresso + tag rodízio
- `src/components/trilha/BlocoAula.tsx` — card de aula com botões de ação
- `src/components/trilha/PendenciasBlock.tsx`
- `src/components/trilha/RevisaoEspecifica.tsx`
- `src/hooks/useTrilhaPlano.ts` — hook que carrega settings + materiais + monta o plano da semana

**Alterados:**

- `src/App.tsx` — adicionar rota `/trilha`
- `src/components/AppLayout.tsx` — link de navegação "Trilha Estratégica"

### Design

- Mesma linguagem visual de `Estudo`/`Dashboard / area do aluno` (cards com `bg-card`, `border`, gradientes sutis do design system, ícones lucide).
- Cores dos blocos: Foco = `accent` (laranja/destaque), Base = `primary`, Pendências = `destructive`.
- Responsivo mobile-first (viewport atual 488px).

### Sem mudanças no banco

Tudo usa tabelas/colunas já existentes (`materiais.tier`, `materiais.especialidade`, `materiais.key_words`, `cards.aula_id`, `historico_estudo`, `user_settings.settings`).