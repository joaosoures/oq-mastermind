## Visão geral

Implementar três sistemas interligados: (1) Trial de 7 dias com acesso total, (2) Onboarding guiado obrigatório no primeiro login, (3) Ciclo de congelamento + exclusão automática após 60 dias de inatividade, com gatilhos de e-mail nos momentos-chave.

A maior parte da infraestrutura já existe (tabela `assinaturas`, funções `get_user_plan`, `can_use_feature`, `cleanup_expired_users`, `daily_subscription_maintenance`), mas precisa de ajustes para alinhar com as novas regras (trial = acesso Ouro, congelamento mais estrito, janela de 60 dias em vez de 30+15).

---

## 1. Trial de 7 dias = acesso Ouro total

**Banco:**
- O trigger `handle_new_user` já cria assinatura `trial` por 7 dias — manter.
- Atualizar `can_use_feature`: hoje o trial já tem todas as features. Confirmar que `materiais` e `gerar_oq_ia` incluem `trial`. ✓ já está correto.
- Atualizar `get_user_plan`: ao expirar trial sem upgrade, retornar `'congelado'` em vez de `'gratis_expirado'`. Adicionar `'congelado'` ao enum/lógica.

**Frontend:**
- `useUserPlan`: adicionar `isCongelado` e tipo `PlanoEfetivo = 'congelado'`.
- Quando congelado: bloquear geração de OQs, materiais, trilha; **bloquear gravação em `historico_estudo` e `desempenho_cards`** (não alimentar algoritmo). Tela de estudo entra em modo "preview" com banner de upgrade.

---

## 2. Congelamento — não alimentar estatísticas

Adicionar **RLS check** nas tabelas `historico_estudo` e `desempenho_cards`:
- `WITH CHECK`: só permite INSERT/UPDATE se `get_user_plan(auth.uid()) IN ('trial','ouro','prata')`.
- Usuário congelado vê dados existentes (SELECT permanece liberado) mas não grava novos.

---

## 3. Onboarding obrigatório no primeiro login

**Banco:** adicionar à tabela `profiles`:
- `onboarding_completed boolean default false`
- `onboarding_skipped boolean default false`
- `objetivo_principal text` (ex: "residencia_clinica", "revalida", "prova_titulo")

**Frontend — novo componente `OnboardingFlow.tsx`:**
- Overlay full-screen, bloqueia navegação (renderizado dentro de `AppLayout` antes de `<Outlet />` se `!completed && !skipped`).
- Botão "Pular tutorial" pequeno, discreto no canto superior direito.
- **Passos:**
  1. **Boas-vindas + objetivo** — escolher objetivo principal (chips), grava em `profiles.objetivo_principal`.
  2. **Configurar trilha** — abre `SetupDialog` existente da trilha em modo embutido.
  3. **Responder 1 OQ de cada modo** (ABCDE, Lacuna, OQ-Falta) — usar OQs pré-selecionados fáceis, com resposta destacada/sugerida. Calibra `desempenho_cards`.
  4. **Ver tarefas da semana** — preview do calendário da trilha.
  5. **Conclusão** — marca `onboarding_completed = true`.

---

## 4. Marcadores visuais de urgência

**Novo componente `TrialUrgencyBanner.tsx`** no topo do `AppLayout`:
- Trial: "Faltam X dias do seu teste grátis — depois é só **R$ 0,72/dia** para continuar (Prata)" com CTA "Assinar".
- Trial últimos 3 dias: cor de alerta + animação sutil.
- Congelado: banner vermelho "Sua conta está congelada. Reative para não perder seus dados em X dias."
- Estilo enfatizando "centavos por dia" / "democratização do estudo".

Atualizar `LoginAlerts.tsx` para a nova janela de 60 dias.

---

## 5. Ciclo de exclusão de 60 dias

**Banco — reescrever `cleanup_expired_users` e `daily_subscription_maintenance`:**
- Janela única: **60 dias** após entrar em `congelado` (trial expirado OU pagamento falhou).
- Atualizar `excluir_dados_em = data_congelamento + 60 days`.
- Aviso de pré-exclusão aos **45 dias** (flag `aviso_pre_exclusao_enviado_em`).
- Aos 60 dias: deletar histórico, desempenho, favoritos, geracoes_ia, temp_oqs, cards do usuário (mesma lógica atual). Marcar assinatura como `expirado`.

**Cron job (pg_cron + pg_net):**
- Schedule diário (3h da manhã BRT) que chama `daily_subscription_maintenance()` + dispara edge function de e-mails.

---

## 6. Gatilhos de e-mail

**Pré-requisito:** configurar domínio de e-mail (Lovable Emails). Vou mostrar o botão de setup no primeiro turno; só depois desse passo, deploy as edge functions abaixo.

**Edge function `send-lifecycle-email`:**
- Eventos: `trial_started`, `payment_failed_frozen`, `pre_deletion_warning_45d`.
- Templates React Email com branding do projeto.

**Disparadores:**
- `trial_started`: trigger no INSERT da `assinaturas`.
- `payment_failed_frozen`: webhook Stripe (`invoice.payment_failed`) já existe em `payments-webhook` — adicionar enfileiramento de e-mail.
- `pre_deletion_warning_45d`: rotina cron diária filtra `assinaturas` onde `data_congelamento <= now() - 45 days AND aviso_pre_exclusao_enviado_em IS NULL`.

Tabela `email_send_log` (criada pelo `setup_email_infra`) será usada para auditoria.

---

## Ordem de execução

1. Migration: adicionar colunas em `profiles` (onboarding), em `assinaturas` (`data_congelamento`, `aviso_pre_exclusao_enviado_em`), atualizar `get_user_plan`, `cleanup_expired_users`, `daily_subscription_maintenance`, adicionar RLS de congelamento em `historico_estudo`/`desempenho_cards`.
2. Atualizar `useUserPlan` + criar `useOnboarding` hook.
3. Construir `OnboardingFlow.tsx` + integração no `AppLayout`.
4. Construir `TrialUrgencyBanner.tsx` + integração no `AppLayout`.
5. Bloquear UI em estado `congelado` (Trilha, Materiais, GerarOQs, Estudo).
6. Setup de email domain (botão para o usuário) → scaffold infra → edge function `send-lifecycle-email`.
7. Cron job pg_cron diário.
8. Atualizar webhook do Stripe para enfileirar e-mail de congelamento.

---

## Detalhes técnicos

- Mantém a integração nativa Stripe atual; nenhuma chave nova necessária.
- RLS para bloquear gravação de stats usa `get_user_plan(auth.uid())` em `WITH CHECK`.
- Onboarding "responder OQs fáceis" usa OQs já existentes com `verificado=true` filtrados por simplicidade (ex: peso_importancia >= 8).
- Botão "Pular" grava `onboarding_skipped=true` e não bloqueia mais.
- `TrialUrgencyBanner` não aparece para `ouro`/`prata` ativos nem para admin.

---

## O que NÃO faz parte deste plano

- Mudar preços/produtos Stripe (já configurados).
- Notificações push/SMS (apenas e-mail).
- Mudanças nas features de cada plano (mantém mapping atual).
