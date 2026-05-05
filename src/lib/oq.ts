// Lógica central dos OQs: normalização, validação, sorteio, score

export type Modo = "abcde" | "lacuna" | "oq_falta";
export type Especialidade =
  | "clinica_medica" | "cirurgia_geral" | "pediatria"
  | "ginecologia_obstetricia" | "medicina_preventiva";

export const ESPECIALIDADE_LABEL: Record<Especialidade, string> = {
  clinica_medica: "Clínica Médica",
  cirurgia_geral: "Cirurgia Geral",
  pediatria: "Pediatria",
  ginecologia_obstetricia: "Ginecologia e Obstetrícia",
  medicina_preventiva: "Medicina Preventiva",
};

export const MODO_LABEL: Record<Modo, string> = {
  abcde: "Múltipla escolha",
  lacuna: "Lacuna",
  oq_falta: "OQ Falta",
};

export interface CardRow {
  id: string;
  modo: Modo;
  especialidade: Especialidade;
  comando: string;
  alternativa_a: string | null; alternativa_b: string | null;
  alternativa_c: string | null; alternativa_d: string | null;
  alternativa_e: string | null;
  alternativa_correta: string | null;
  info_1: string | null; var_1: string | null;
  info_2: string | null; var_2: string | null;
  info_3: string | null; var_3: string | null;
  info_4: string | null; var_4: string | null;
  info_5: string | null; var_5: string | null;
  explicacao: string;
  peso_importancia: number;
  origem: string;
  verificado: boolean;
  criado_por_usuario_id?: string | null;
}

export function normalize(s: string): string {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Checa se a resposta do aluno bate com info principal ou variações. Tolerante. */
export function matchAnswer(answer: string, info: string, vars: string | null): boolean {
  if (!answer.trim()) return false;
  const a = normalize(answer);
  if (!a) return false;
  const targets = [info, ...(vars ? vars.split(/[;|]/) : [])]
    .map((s) => s.trim()).filter(Boolean).map(normalize);
  // match exato normalizado, ou containment forte (>= 80% chars)
  for (const t of targets) {
    if (!t) continue;
    if (a === t) return true;
    if (a.replace(/\s/g, "") === t.replace(/\s/g, "")) return true;
    if (a.length >= 3 && t.includes(a) && a.length / t.length >= 0.6) return true;
    if (t.length >= 3 && a.includes(t) && t.length / a.length >= 0.6) return true;
  }
  return false;
}

export function getInfos(card: CardRow): { info: string; vars: string | null; idx: number }[] {
  const out: { info: string; vars: string | null; idx: number }[] = [];
  for (let i = 1; i <= 5; i++) {
    const info = (card as any)[`info_${i}`] as string | null;
    const vars = (card as any)[`var_${i}`] as string | null;
    if (info && info.trim()) out.push({ info, vars, idx: i });
  }
  return out;
}

export function sortearLacuna(card: CardRow): number {
  const infos = getInfos(card);
  if (infos.length === 0) return 1;
  return infos[Math.floor(Math.random() * infos.length)].idx;
}

/** Nota 0-4 de acordo com comportamento. */
export function calcularNota(opts: { acertou: boolean; nivelPista: number; tentativas: number }): number {
  const { acertou, nivelPista, tentativas } = opts;
  if (!acertou) return 4;
  if (nivelPista === 0 && tentativas <= 1) return 1;
  if (nivelPista === 0) return 1;
  if (nivelPista === 1) return 2;
  if (nivelPista === 2) return 3;
  return 3;
}

/** Score de prioridade: maior = mais urgente para revisar. */
export function calcularScore(opts: {
  pesoImportancia: number;
  contadorErros: number;
  contadorAcertos: number;
  nivelPistaUltima: number;
  diasDesdeUltima: number;
  isNovo: boolean;
}): number {
  const { pesoImportancia, contadorErros, contadorAcertos, nivelPistaUltima, diasDesdeUltima, isNovo } = opts;
  return (
    pesoImportancia * 2 +
    contadorErros * 5 +
    nivelPistaUltima * 3 +
    diasDesdeUltima * 0.5 +
    (isNovo ? 10 : 0) -
    contadorAcertos * 2
  );
}
