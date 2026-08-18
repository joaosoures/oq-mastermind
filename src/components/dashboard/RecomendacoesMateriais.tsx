function RecomendacoesMateriais({ stats, locked }: { stats: EspecialidadeStats[]; locked: boolean }) {
  const navigate = useNavigate();
  const todas = Object.keys(ESPECIALIDADE_LABEL) as Especialidade[];

  // Constrói recomendações estratégicas (máx 3) priorizando: baixo domínio com volume → não estudadas → reforço top
  const recs: { esp: Especialidade; tipo: "fraco" | "novo" | "reforco"; razao: string; metric: string }[] = [];
  const estudadas = stats.filter(s => s.visto > 0);
  const fracas = [...estudadas].filter(s => s.dominio < 70).sort((a, b) => a.dominio - b.dominio);
  for (const s of fracas.slice(0, 2)) {
    recs.push({
      esp: s.especialidade,
      tipo: "fraco",
      razao: "Domínio abaixo do ideal — revise os materiais para virar o jogo.",
      metric: `${Math.round(s.dominio)}% de acerto · ${s.erros} erros`,
    });
  }
  const estudadasIds = new Set(estudadas.map(s => s.especialidade));
  const naoEstudadas = todas.filter(e => !estudadasIds.has(e));
  for (const e of naoEstudadas.slice(0, 3 - recs.length)) {
    recs.push({
      esp: e,
      tipo: "novo",
      razao: "Ainda sem dados — comece pelos materiais para criar base.",
      metric: "Território inexplorado",
    });
  }
  if (recs.length < 3 && estudadas.length > 0) {
    const fortes = [...estudadas].sort((a, b) => b.dominio - a.dominio);
    for (const s of fortes) {
      if (recs.find(r => r.esp === s.especialidade)) continue;
      recs.push({
        esp: s.especialidade,
        tipo: "reforco",
        razao: "Mantenha o nível — material rápido para consolidar.",
        metric: `${Math.round(s.dominio)}% de domínio`,
      });
      if (recs.length >= 3) break;
    }
  }

  const tipoMeta: Record<string, { Icon: any; tag: string; color: string }> = {
    fraco: { Icon: AlertTriangle, tag: "Ponto Crítico", color: "text-destructive" },
    novo: { Icon: Compass, tag: "Explorar", color: "text-accent" },
    reforco: { Icon: TrendingUp, tag: "Consolidar", color: "text-success" },
  };

  return (
