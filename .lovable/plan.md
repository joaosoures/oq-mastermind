
## Visão geral

Hoje a geração é uma chamada única que tenta fazer tudo ao mesmo tempo. Vamos quebrar em **3 estágios especializados**, cada um com um modelo de IA escolhido para o trabalho, prompt próprio e ponto de inspeção visível para o admin.

```text
PDF da aula
   │
   ▼
[1] TRIAGEM        ── Gemini 2.5 Pro (lê PDF + classifica)
   │  output: mapa pedagógico (JSON)
   │  ─── admin pode revisar / regenerar ───
   ▼
[2] GERAÇÃO POR MODO   ── 3 chamadas em paralelo
   ├─ LACUNA       ── Gemini 2.5 Flash (rápido, formato simples)
   ├─ OQ FALTA     ── Gemini 2.5 Flash
   └─ ABCDE        ── GPT-5 (raciocínio + malícia + explicação florida)
   │  output: lista bruta de OQs
   ▼
[3] FILTRO DE SOLUBILIDADE   ── GPT-5 (resolve com o PDF na mão)
   │  output: OQs aprovados + reescritos + descartados
   ▼
Revisão humana (admin aprova/edita/descarta)
   ▼
cards (com aula_id) → estudo do aluno
```

## Etapa 1 — Triagem (mapa pedagógico)

**Modelo:** `google/gemini-2.5-pro` (multimodal, melhor leitura de PDF + raciocínio estrutural).

**O que faz:** lê o PDF inteiro e devolve um JSON estruturado com cada "ponto cobrável" da aula, já classificado:

```json
{
  "aula": "Pneumonia Adquirida na Comunidade",
  "pontos": [
    {
      "id": "p1",
      "categoria": "memorizacao_pura",
      "modo_sugerido": "lacuna",
      "trecho_origem": "página 4 — critérios CURB-65...",
      "conceito": "Um dos critérios do CURB-65",
      "valor_chave": "Confusão mental",
      "justificativa": "Item de classificação seca, ideal para lacuna."
    },
    {
      "id": "p2",
      "categoria": "padrao_gestalt",
      "modo_sugerido": "oq_falta",
      "trecho_origem": "página 5 — tríade clássica de...",
      "elementos_completos": ["febre", "tosse produtiva", "dor pleurítica"],
      "elemento_a_ocultar_exemplo": "dor pleurítica"
    },
    {
      "id": "p3",
      "categoria": "conduta",
      "modo_sugerido": "abcde",
      "subtipo": "conduta_indireta",
      "cenario_base": "Paciente jovem hígido com PAC sem critérios de gravidade",
      "armadilha_sugerida": "Comorbidade que contraindica macrolídeo isolado"
    }
  ]
}
```

**Por que separar:** isola o trabalho cognitivo de "o que cobrar" do trabalho de "como cobrar". O admin vê o mapa antes de gastar tokens na geração final.

## Etapa 2 — Geração especializada por modo

Três chamadas **em paralelo**, cada uma recebendo só os pontos do seu modo + o trecho do PDF correspondente.

### 2a) LACUNA — `google/gemini-2.5-flash`
- Regra dura: `resposta` = termo único, sem símbolos, sem números acompanhados de unidade.
- `variacoes` = sinônimos aceitos (separados por `;`).
- Comando contém exatamente um `[___]`.
- Validação programática: rejeita se resposta tiver espaço, hífen, vírgula ou >25 caracteres.

### 2b) OQ FALTA — `google/gemini-2.5-flash`
- Regra dura: `resposta` curta (1–2 palavras), sem símbolos.
- `variacoes` cobrem 3–5 formas comuns de o aluno escrever (com/sem acento, sinônimos clínicos).
- Comando descreve o padrão/tríade/score com **um** elemento ausente, marcado como `[O QUE FALTA?]`.

### 2c) ABCDE — `openai/gpt-5`
- Modelo mais caro porque aqui está a "malícia" e a explicação rica.
- Prompt aplica as 4 regras do usuário:
  - **Semiologia descritiva** (descrever a manobra, não dar o nome do sinal).
  - **Critério não-limítrofe** (lab/imagem claramente alterados).
  - **Ruído estratégico** (comorbidade que invalida a conduta óbvia).
  - **Distratores com manha de banca** (termos absolutos induzindo erro).
- Alterna 50/50 entre `diagnostico_direto` e `conduta_indireta` (campo controlado pelo prompt + checagem pós-geração).
- `explicacao` "florida": parágrafo único, tece o erro dos distratores no fio do texto.

### Anti-fadiga (pós-geração, no servidor)
Antes de salvar em `temp_oqs`, embaralhamos a ordem com a regra: **nunca dois OQs do mesmo modo seguidos** e **alternância sprint/maratona** (curto/longo) baseada no tamanho do comando.

## Etapa 3 — Filtro de Solubilidade

**Modelo:** `openai/gpt-5` (mesmo modelo da geração ABCDE — bom raciocínio, e como já foi pago no input do PDF, custo marginal).

Para cada OQ gerado, manda: `{PDF, OQ, resposta_oficial}` e pergunta:
1. A resposta correta é alcançável **só** com o PDF? (sim/não)
2. Existe ambiguidade que permitiria outra alternativa correta? (sim/não + qual)
3. O comando tem texto redundante que possa ser podado? (sim → versão enxuta)

Output por OQ: `{status: "aprovado" | "reescrito" | "descartado", oq_final, motivo}`.

**Por que vale a pena:** elimina antes da revisão humana os OQs que gerariam recurso ou que estão "fora do material". Reduz fadiga do admin na etapa de aprovação.

## Painel admin — mudanças de UI

Na aba **Prompt & Modelo**, em vez de um campo único, abas internas:
- `Triagem` — prompt + seletor de modelo (default Gemini 2.5 Pro).
- `Geração LACUNA` — prompt + modelo (default Flash).
- `Geração OQ FALTA` — prompt + modelo (default Flash).
- `Geração ABCDE` — prompt + modelo (default GPT-5).
- `Filtro Solubilidade` — prompt + modelo (default GPT-5) + toggle on/off.

Cada um salvo como linha própria em `ia_prompts` com `chave` distinta.

Na aba **Revisão**, novo passo intermediário:
1. Admin clica "Gerar a partir desta aula".
2. Aparece **"Mapa Pedagógico"** (resultado da triagem) — lista colapsável por categoria, com botões **Aprovar mapa e gerar** / **Regerar triagem** / **Editar JSON**.
3. Após aprovar, roda etapas 2 e 3; mostra cada OQ com badge `aprovado`/`reescrito`/`descartado` + motivo do filtro.
4. Admin faz aprovação final card a card.

## Mudanças de backend

**Nova tabela `triagens_aula`:**
- `aula_id` (materiais.id), `mapa_json`, `modelo_usado`, `criado_por`, `status` (`pendente` | `aprovada` | `descartada`), timestamps.
- RLS: admin-only.

**Tabela `temp_oqs`** — adicionar colunas:
- `triagem_id` (FK opcional → `triagens_aula.id`)
- `etapa_filtro_status` (`aprovado` | `reescrito` | `descartado`)
- `etapa_filtro_motivo` (text)
- `ponto_id` (text — referência ao item do mapa que originou o OQ)

**Tabela `cards`** — já tem `aula_id`. Adicionar:
- `triagem_id` (FK opcional) para rastrear qual mapa originou o card (útil depois para a feature de "redirecionar aluno para a aula do erro").

**Seed da tabela `ia_prompts`** com 5 novas chaves:
- `triagem_aula`, `gerar_lacuna`, `gerar_oq_falta`, `gerar_abcde`, `filtro_solubilidade`.

**Edge functions:**
- `triagem-aula` (novo) — etapa 1.
- `gerar-oqs-aula` (refatorado) — recebe `triagem_id`, dispara 2a/2b/2c em paralelo (`Promise.all`) e depois 3.
- Mantém validação programática (lacuna sem espaços, abcde com 5 opções, etc.) e mensagens de erro padronizadas (`AI_RATE_LIMIT`, `AI_CREDITS_EXHAUSTED`).

## Por que 3 modelos diferentes e não um só

- **Triagem (Pro):** ler PDF longo + raciocinar sobre estrutura pedagógica é o que Gemini Pro faz melhor, e roda **1 vez** por aula → custo absoluto baixo.
- **LACUNA/OQ FALTA (Flash):** formato simples, repetitivo, alto volume → Flash entrega 10x mais rápido e barato sem perda de qualidade.
- **ABCDE (GPT-5):** aqui está a "alma" do OQ. Vale pagar o modelo mais forte só nos itens que realmente exigem nuance.
- **Solubilidade (GPT-5):** precisa "resolver de verdade" o OQ contra o PDF → exige raciocínio comparável ao da geração.

Resultado esperado: **mesmo custo total ou menor** que rodar tudo em GPT-5, com qualidade superior à de rodar tudo em Flash.

## Ordem de implementação

1. Migração: nova tabela `triagens_aula`, colunas extras em `temp_oqs` e `cards`, seed dos 5 prompts em `ia_prompts`.
2. Edge function `triagem-aula`.
3. Refatorar `gerar-oqs-aula` para o fluxo de 3 etapas com paralelismo + filtro.
4. UI admin: abas de prompts, tela de mapa pedagógico, badges do filtro.
5. Smoke test com 1 aula real (curl + revisão visual do mapa e dos OQs).
