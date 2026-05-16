# Sistema de Planos, Página "Meu plano" e Travas de Segurança

## 1. Banco de dados (Lovable Cloud)

### 1.1 Ajustes em `assinaturas`
- Ampliar enum `plano` para incluir: `trial`, `gratis`, `prata`, `ouro` (manter compatibilidade com valores existentes).
- Ampliar enum `status_assinatura` para incluir: `trial`, `ativo`, `inadimplente`, `cancelado`, `expirado`.
- Adicionar colunas:
  - `valor_mensal numeric` (28.50 / 21.50 / 0)
  - `metodo_pagamento text` (ex: "Cartão final 1234", null para grátis)
  - `proxima_renovacao timestamptz`
  - `data_inadimplencia timestamptz` (quando ficou inadimplente)
- Atualizar `handle_new_user()` para criar `assinaturas` com `plano='trial'`, `data_fim_trial = now()+7 days`, `excluir_dados_em = now()+22 days` (7 trial + 15 graça).

### 1.2 Tabela `pagamentos` (histórico)
- `id, usuario_id, valor, plano, status (pago/falhou/pendente), metodo, data_pagamento, criado_em`
- RLS: usuário vê só os dele; admin vê todos.

### 1.3 Funções helper SECURITY DEFINER
- `public.get_user_plan(_user_id uuid) returns text` — retorna o plano **efetivo** considerando trial expirado (se trial venceu → retorna `gratis_expirado`).
- `public.can_use_feature(_user_id uuid, _feature text) returns boolean` — central de permissões. Features: `estudo_focado`, `gerar_oq_planilha`, `gerar_oq_ia`, `materiais`, `metricas_avancadas`.
- Atualizar `is_subscriber` para considerar Ouro/Prata como ativos.

### 1.4 RLS reforçada (travas no banco)
- `cards` (inserir): bloquear INSERT de OQs gerados pelo usuário se `can_use_feature(auth.uid(), 'gerar_oq_planilha')` for false.
- `geracoes_ia` (insert): exigir `can_use_feature(..., 'gerar_oq_ia')`.
- `materiais` (select): já tem `is_subscriber` — ajustar para exigir Ouro especificamente em materiais premium.
- `historico_estudo` (insert): permitir sempre que houver plano (até gratis), mas bloquear quando `cards.modo` exigir estudo focado e usuário não tiver permissão — feito via função no front + check no banco em uma trigger leve.

### 1.5 Rotinas de exclusão (pg_cron + edge function)
- Edge function `cleanup-inadimplentes` (verify_jwt=false, autenticada por header secreto):
  - Para `plano in (ouro, prata)` com `status='inadimplente'` há > 30 dias: deletar `historico_estudo`, `desempenho_cards`, `favoritos`, `cards` (criados pelo user com `origem='usuario'`), `geracoes_ia`, `temp_oqs` daquele user.
  - Para `plano='trial'` com `data_fim_trial < now() - 15 days` e sem upgrade: mesma limpeza.
  - Atualizar `status='expirado'` na assinatura.
- Agendar via `pg_cron` para rodar 1x por dia (03:00 BRT).

## 2. Navegação — nova aba "Meu plano"

Em `src/components/AppLayout.tsx`, adicionar item no grupo "Mais":
- Título: "Meu plano", ícone `CreditCard`, rota `/meu-plano`.
- Registrar rota em `src/App.tsx` dentro do `ProtectedRoute`.

## 3. Página `/meu-plano` (`src/pages/MeuPlano.tsx`)

### 3.1 Área Superior — Painel de status
Grid responsivo (1 col mobile / 2 col desktop):

```text
┌─────────────────────────┬─────────────────────────┐
│  Perfil                 │  Plano atual (destaque) │
│  avatar, nome, email    │  badge Ouro/Prata/Grátis│
├─────────────────────────┼─────────────────────────┤
│  Datas importantes      │  Pagamento              │
│  • Renovação / fim trial│  • método atual         │
│  • Contagem regressiva  │  • últimos 3 pagamentos │
└─────────────────────────┴─────────────────────────┘
│  Alerta crítico (full width, só se aplicável)     │
│  "Faltam X dias para exclusão definitiva…"        │
```

- Badge do plano com cor: Ouro = gradiente dourado, Prata = prateado, Grátis = neutro.
- Contagem regressiva calculada client-side a partir de `data_fim_trial` / `excluir_dados_em` / `data_inadimplencia + 30d`.
- Alerta crítico renderizado quando: trial < 3 dias, inadimplente, ou em janela de exclusão.

### 3.2 Área Inferior — 3 cards comparativos
Grid de 3 colunas (1 col mobile, 3 col md+), card do plano atual destacado (border colorida + selo "Seu plano"):

- **Aluno de Ouro** — R$ 28,50/mês · ~R$ 0,92/dia
- **Aluno de Prata** — R$ 21,50/mês · ~R$ 0,69/dia
- **Grátis** — 7 dias trial Ouro, depois degradado

Cada item da checklist com ícone `Check` (verde) ou `X` (vermelho desbotado), texto riscado quando bloqueado. Botão "Fazer upgrade" / "Plano atual" no rodapé do card.

## 4. Travas de UI (frontend)

### 4.1 Hook `useUserPlan`
`src/hooks/useUserPlan.ts` — retorna `{ plano, status, isOuro, isPrata, isGratis, isTrialAtivo, canUse(feature) }`. Busca via `get_user_plan` RPC + cache no React Query.

### 4.2 Componente `LockedFeature`
Wrapper que mostra conteúdo desabilitado + tooltip "Disponível no plano Ouro/Prata" + onClick redireciona para `/meu-plano`.

### 4.3 Aplicação nas páginas existentes
- `src/components/AppLayout.tsx` (sidebar Especialidades / módulos focados): se `!canUse('estudo_focado')`, marcar como bloqueado (cadeado + onClick redireciona).
- `src/pages/Estudo.tsx`: bloquear filtros "Crítico/Novo/Difíceis/Esquecidos" para grátis pós-trial.
- `src/pages/GerarOQs.tsx`: desabilitar botão IA se `!canUse('gerar_oq_ia')`; desabilitar planilha se `!canUse('gerar_oq_planilha')`.
- `src/pages/Materiais.tsx`: itens premium com cadeado se não-Ouro.
- `src/pages/Dashboard.tsx`: métricas avançadas com overlay bloqueado para grátis.

## 5. Detalhes técnicos

- **Cálculo do "dia proporcional"**: `valor / 31`, formatado `R$ 0,92`.
- **Realtime**: o painel reage a mudanças em `assinaturas` via Supabase Realtime para refletir upgrade imediato.
- **Segurança**: toda decisão crítica passa por `can_use_feature` no banco — UI é apenas conveniência. RLS bloqueia INSERTs mesmo se o front for burlado.
- **Pagamentos**: este plano **não** integra processador de pagamento (Stripe/Paddle). Cria a estrutura (tabela `pagamentos`, método, próxima renovação) para ser preenchida quando você decidir o gateway. O botão "Fazer upgrade" abre um modal "Em breve" ou pode ser ligado a um link externo provisório — me confirme se quer que eu já sugira/integre um gateway depois.

## 6. Fora de escopo desta entrega

- Integração real com gateway de pagamento (Stripe/Paddle/Pix) — fica para um próximo passo.
- Tela de admin para forçar mudança de plano manualmente (já existe `assinaturas` editável via painel atual).
- E-mails transacionais de aviso de inadimplência (pode ser adicionado depois com Lovable Email).

---

Se aprovar, executo nesta ordem: migração de banco → edge function + cron → página `/meu-plano` → travas de UI nas páginas existentes.
