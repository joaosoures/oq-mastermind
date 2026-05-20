# Migração para Stripe e Reestruturação dos Planos Prata/Ouro

## Visão geral

Vamos desativar o Paddle, conectar o Stripe (integração nativa da Lovable) e refinar as permissões dos planos **Prata** e **Ouro** já existentes no banco. O foco é: checkout funcionando via Stripe, webhooks sincronizando o status no banco em tempo real, e o Prata com biblioteca de materiais bloqueada + sem direcionamento automático de baralhos.

> ⚠️ **Importante sobre a chave Stripe que você enviou:** ela **não deve** ser colada aqui — você a expôs publicamente no chat e ela precisa ser **rotacionada agora** no painel do Stripe. A Lovable tem uma integração **nativa de Stripe (sem necessidade de chave própria)** que recomendamos usar — você não precisa gerenciar conta, chaves ou webhooks manualmente. Confirme na próxima etapa se prefere a integração nativa (recomendado) ou usar sua própria conta Stripe (BYOK) com a chave já rotacionada.

---

## 1. Desativação do Paddle

- Você desconecta o Paddle no painel de Pagamentos (menu de 3 pontos → "Desconectar Paddle"). Isso é manual, eu não consigo fazer por você.
- Em seguida eu removo do código:
  - `src/lib/paddle.ts`, `src/hooks/usePaddleCheckout.ts`, `src/hooks/usePaddlePortal.ts`
  - `src/components/PaymentTestModeBanner.tsx` (substituído pela versão Stripe)
  - Edge functions: `get-paddle-price`, `payments-portal`, `payments-webhook`, `_shared/paddle.ts`
  - Variáveis `VITE_PAYMENTS_CLIENT_TOKEN` em `.env.development` e `.env.production`
  - Segredos `PADDLE_*` e `PAYMENTS_*_WEBHOOK_SECRET` (depois que o Stripe estiver no ar)
- As colunas `paddle_subscription_id` e `paddle_customer_id` da tabela `assinaturas` serão **renomeadas** para `stripe_subscription_id` / `stripe_customer_id` (preserva histórico de schema, sem perda de dados).
- ⚠️ **Assinaturas Paddle ativas não migram automaticamente.** Quem estiver pagando hoje pelo Paddle continua até cancelar/reassinar via Stripe. Se houver assinantes em produção, avise antes de publicar.

## 2. Ativação do Stripe

- Habilito a integração nativa Stripe da Lovable (`enable_stripe_payments`) **ou** a BYOK se você insistir em usar sua chave.
- Crio os 2 produtos/preços recorrentes mensais:
  - `plano_prata` → `prata_mensal` (R$ 21,50/mês)
  - `plano_ouro` → `ouro_mensal` (R$ 28,50/mês)
- Adiciono `<StripeTestModeBanner />` no layout enquanto estiver em modo teste.

## 3. Checkout, Portal e Webhooks

- Hook `useStripeCheckout` abre o checkout do Stripe (overlay/redirect) passando `userId` em `client_reference_id` e `customer_email`.
- Hook `useStripePortal` abre o portal de gerenciamento para cancelar/trocar plano. **Upgrade Prata→Ouro usa `proration_behavior: 'create_prorations'`** (cobra a diferença proporcional).
- Edge function `stripe-webhook` (com `verify_jwt = false` + verificação de assinatura via `STRIPE_WEBHOOK_SECRET`) trata:
  - `customer.subscription.created` / `.updated` → upsert em `assinaturas` (plano, status, `proxima_renovacao`, `cancel_at_period_end`)
  - `customer.subscription.deleted` → status `cancelado`
  - `invoice.payment_succeeded` → insert em `pagamentos`, marca status `ativo`, limpa inadimplência
  - `invoice.payment_failed` → status `inadimplente`, agenda `excluir_dados_em` (+30 dias)
- O frontend escuta a tabela `assinaturas` via Realtime (já implementado em `useUserPlan`), então o UI atualiza em tempo real assim que o webhook grava.

## 4. RBAC e restrições dos planos

O sistema de planos (`get_user_plan`, `can_use_feature`, `useUserPlan.canUse`) já existe. Vou ajustar o `FEATURE_MAP` e a função SQL `can_use_feature` para refletir exatamente:

| Feature                            | Trial | Prata | Ouro |
|------------------------------------|:-----:|:-----:|:----:|
| Estudo geral + métricas básicas    | ✅    | ✅    | ✅   |
| Métricas avançadas                 | ✅    | ✅    | ✅   |
| Criação de trilhas                 | ✅    | ✅    | ✅   |
| Repetição espaçada                 | ✅    | ✅    | ✅   |
| Gerar OQs por planilha             | ✅    | ✅    | ✅   |
| Gerar OQs por IA (texto próprio)   | ✅    | ✅    | ✅   |
| **Biblioteca de materiais**        | ✅    | 🔒    | ✅   |
| **Direcionamento automático**      | ✅    | 🔒    | ✅   |

> Mudança vs. hoje: `gerar_oq_ia` passa a incluir Prata (era só Ouro/Trial). `materiais` continua exclusivo de Ouro/Trial.

## 5. UI das restrições do Prata

- **Página Materiais**: cards renderizados com overlay de cadeado + CTA "Upgrade para Ouro". Clique no cadeado → modal explicando o benefício + botão que abre checkout do Ouro com prorate.
- **Trilha Estratégica**: o algoritmo de direcionamento automático de baralhos é desativado para Prata; mostra banner "Direcionamento automático disponível no Plano Ouro" com o mesmo CTA.
- Componente reutilizável `<UpgradeOuroGate feature="..." />` para envolver qualquer área travada.
- Página `/meu-plano`: card de Upgrade visível para Prata com botão direto pro checkout de Ouro (com prorate).

---

## Detalhes técnicos

**Migração SQL:**
```sql
ALTER TABLE assinaturas RENAME COLUMN paddle_subscription_id TO stripe_subscription_id;
ALTER TABLE assinaturas RENAME COLUMN paddle_customer_id TO stripe_customer_id;
-- atualizar can_use_feature: gerar_oq_ia passa a aceitar 'prata'
```

**Arquivos novos:**
- `src/lib/stripe.ts`
- `src/hooks/useStripeCheckout.ts`, `src/hooks/useStripePortal.ts`
- `src/components/StripeTestModeBanner.tsx`
- `src/components/UpgradeOuroGate.tsx`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/stripe-checkout/index.ts` (cria sessão com `client_reference_id` + prorate)
- `supabase/functions/stripe-portal/index.ts`

**Arquivos modificados:**
- `src/hooks/useUserPlan.ts` (FEATURE_MAP)
- `src/pages/Materiais.tsx`, `src/pages/TrilhaEstrategica.tsx`, `src/pages/MeuPlano.tsx`
- `src/components/trilha/*` (desligar direcionamento automático no Prata)

**Segredos novos:** `STRIPE_SECRET_KEY` (se BYOK) e `STRIPE_WEBHOOK_SECRET`. Na integração nativa, ambos são gerenciados pela Lovable.

---

## Antes de eu começar, confirme:

1. **Stripe nativo (recomendado, sem chave) ou BYOK com sua chave rotacionada?**
2. **Já existem assinantes ativos no Paddle em produção?** (se sim, planejamos comunicação antes de publicar)
3. **Confirma os valores R$ 21,50 (Prata) e R$ 28,50 (Ouro), mensais?**
