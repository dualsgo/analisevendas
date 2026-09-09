import { DetailedSaleRow } from "@/lib/types";
import { parseISO, format, getDay, startOfWeek, endOfWeek, getISOWeek, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getShiftForDate, isSundayOrHoliday } from "@/lib/shift-utils";
import { ShiftComparisonResult } from "@/lib/shift-comparison";

/**
 * Format number with comma as decimal separator for Brazilian Excel
 */
export function formatNumberBr(num: number, decimals = 2): string {
  if (isNaN(num) || num === null || num === undefined) return "0,00";
  return num.toFixed(decimals).replace(".", ",");
}

/**
 * Trigger CSV download in browser with UTF-8 BOM
 */
export function downloadCsvString(filename: string, csvContent: string) {
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

interface ShiftAgg {
  cupons: number;
  vNF: number;
  itens: number;
  vendedores: Set<string>;
}

function createEmptyShift(): ShiftAgg {
  return { cupons: 0, vNF: 0, itens: 0, vendedores: new Set<string>() };
}

/**
 * 1. EXPORTAÇÃO DIÁRIA (Linhas: Dias | Colunas: Indicadores por Turno e Total)
 */
export function exportDailyShiftsCsv(sales: DetailedSaleRow[], allowedDates?: string[]): string {
  const allowedSet = allowedDates ? new Set(allowedDates) : null;
  const daysMap: Record<
    string,
    {
      manha: ShiftAgg;
      tarde: ShiftAgg;
      noite: ShiftAgg;
      total: ShiftAgg;
    }
  > = {};

  for (const s of sales) {
    if (!s.dhEmi) continue;
    let d: Date;
    let dStr: string;
    try {
      d = parseISO(s.dhEmi);
      dStr = format(d, "yyyy-MM-dd");
    } catch {
      continue;
    }

    if (allowedSet && !allowedSet.has(dStr)) continue;

    if (!daysMap[dStr]) {
      daysMap[dStr] = {
        manha: createEmptyShift(),
        tarde: createEmptyShift(),
        noite: createEmptyShift(),
        total: createEmptyShift(),
      };
    }

    const turno = getShiftForDate(d);
    const vNF = parseFloat(s.vNF) || 0;
    const qItens = parseFloat(s.itens_qtd) || 0;
    const vend = s.vendedor || "DESCONHECIDO";

    const bucket = daysMap[dStr][turno];
    bucket.cupons++;
    bucket.vNF += vNF;
    bucket.itens += qItens;
    if (vend !== "COLABORADOR NÃO IDENTIFICADO") bucket.vendedores.add(vend);

    const totalBucket = daysMap[dStr].total;
    totalBucket.cupons++;
    totalBucket.vNF += vNF;
    totalBucket.itens += qItens;
    if (vend !== "COLABORADOR NÃO IDENTIFICADO") totalBucket.vendedores.add(vend);
  }

  const sortedDates = Object.keys(daysMap).sort();

  const headers = [
    "Data",
    "Dia da Semana",
    "Tipo de Dia",
    // Manhã
    "Manhã - Faturamento (R$)",
    "Manhã - Cupons",
    "Manhã - TKM (R$)",
    "Manhã - P.A.",
    "Manhã - Itens",
    "Manhã - Vendedores",
    // Tarde
    "Tarde - Faturamento (R$)",
    "Tarde - Cupons",
    "Tarde - TKM (R$)",
    "Tarde - P.A.",
    "Tarde - Itens",
    "Tarde - Vendedores",
    // Noite
    "Noite - Faturamento (R$)",
    "Noite - Cupons",
    "Noite - TKM (R$)",
    "Noite - P.A.",
    "Noite - Itens",
    "Noite - Vendedores",
    // Total Dia
    "Total Dia - Faturamento (R$)",
    "Total Dia - Cupons",
    "Total Dia - TKM (R$)",
    "Total Dia - P.A.",
    "Total Dia - Itens",
    "Total Dia - Vendedores",
  ];

  const lines = [headers.join(";")];

  for (const dStr of sortedDates) {
    const d = parseISO(dStr);
    const dayOfWeek = format(d, "EEEE", { locale: ptBR });
    const isSpecial = isSundayOrHoliday(dStr);
    const dayType = getDay(d) === 0 ? "Domingo" : isSpecial ? "Feriado" : "Dia Normal";

    const dayData = daysMap[dStr];

    const fmtT = (agg: ShiftAgg) => {
      const tkm = agg.cupons > 0 ? agg.vNF / agg.cupons : 0;
      const pa = agg.cupons > 0 ? agg.itens / agg.cupons : 0;
      return [
        formatNumberBr(agg.vNF),
        agg.cupons.toString(),
        formatNumberBr(tkm),
        formatNumberBr(pa),
        agg.itens.toString(),
        agg.vendedores.size.toString(),
      ];
    };

    const row = [
      format(d, "dd/MM/yyyy"),
      dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1),
      dayType,
      ...fmtT(dayData.manha),
      ...fmtT(dayData.tarde),
      ...fmtT(dayData.noite),
      ...fmtT(dayData.total),
    ];

    lines.push(row.join(";"));
  }

  return lines.join("\n");
}

/**
 * 2. EXPORTAÇÃO SEMANAL (Linhas: Semanas | Colunas: Indicadores por Turno e Total)
 */
export function exportWeeklyShiftsCsv(sales: DetailedSaleRow[], allowedDates?: string[]): string {
  const allowedSet = allowedDates ? new Set(allowedDates) : null;
  const weeksMap: Record<
    string,
    {
      label: string;
      periodo: string;
      diasAtivos: Set<string>;
      manha: ShiftAgg;
      tarde: ShiftAgg;
      noite: ShiftAgg;
      total: ShiftAgg;
    }
  > = {};

  for (const s of sales) {
    if (!s.dhEmi) continue;
    let d: Date;
    let dStr: string;
    try {
      d = parseISO(s.dhEmi);
      dStr = format(d, "yyyy-MM-dd");
    } catch {
      continue;
    }

    if (allowedSet && !allowedSet.has(dStr)) continue;

    const year = getYear(d);
    const weekNum = getISOWeek(d);
    const weekKey = `${year}-W${weekNum.toString().padStart(2, "0")}`;

    if (!weeksMap[weekKey]) {
      const startW = startOfWeek(d, { weekStartsOn: 1 });
      const endW = endOfWeek(d, { weekStartsOn: 1 });
      weeksMap[weekKey] = {
        label: `Semana ${weekNum}/${year}`,
        periodo: `${format(startW, "dd/MM/yyyy")} a ${format(endW, "dd/MM/yyyy")}`,
        diasAtivos: new Set<string>(),
        manha: createEmptyShift(),
        tarde: createEmptyShift(),
        noite: createEmptyShift(),
        total: createEmptyShift(),
      };
    }

    weeksMap[weekKey].diasAtivos.add(dStr);

    const turno = getShiftForDate(d);
    const vNF = parseFloat(s.vNF) || 0;
    const qItens = parseFloat(s.itens_qtd) || 0;
    const vend = s.vendedor || "DESCONHECIDO";

    const bucket = weeksMap[weekKey][turno];
    bucket.cupons++;
    bucket.vNF += vNF;
    bucket.itens += qItens;
    if (vend !== "COLABORADOR NÃO IDENTIFICADO") bucket.vendedores.add(vend);

    const totalBucket = weeksMap[weekKey].total;
    totalBucket.cupons++;
    totalBucket.vNF += vNF;
    totalBucket.itens += qItens;
    if (vend !== "COLABORADOR NÃO IDENTIFICADO") totalBucket.vendedores.add(vend);
  }

  const sortedWeeks = Object.keys(weeksMap).sort();

  const headers = [
    "Semana",
    "Período da Semana",
    "Dias com Vendas",
    // Manhã
    "Manhã - Faturamento (R$)",
    "Manhã - Cupons",
    "Manhã - TKM (R$)",
    "Manhã - P.A.",
    "Manhã - Itens",
    "Manhã - Vendedores",
    // Tarde
    "Tarde - Faturamento (R$)",
    "Tarde - Cupons",
    "Tarde - TKM (R$)",
    "Tarde - P.A.",
    "Tarde - Itens",
    "Tarde - Vendedores",
    // Noite
    "Noite - Faturamento (R$)",
    "Noite - Cupons",
    "Noite - TKM (R$)",
    "Noite - P.A.",
    "Noite - Itens",
    "Noite - Vendedores",
    // Total Semana
    "Total Semana - Faturamento (R$)",
    "Total Semana - Cupons",
    "Total Semana - TKM (R$)",
    "Total Semana - P.A.",
    "Total Semana - Itens",
    "Total Semana - Vendedores",
  ];

  const lines = [headers.join(";")];

  for (const wKey of sortedWeeks) {
    const w = weeksMap[wKey];

    const fmtT = (agg: ShiftAgg) => {
      const tkm = agg.cupons > 0 ? agg.vNF / agg.cupons : 0;
      const pa = agg.cupons > 0 ? agg.itens / agg.cupons : 0;
      return [
        formatNumberBr(agg.vNF),
        agg.cupons.toString(),
        formatNumberBr(tkm),
        formatNumberBr(pa),
        agg.itens.toString(),
        agg.vendedores.size.toString(),
      ];
    };

    const row = [
      w.label,
      w.periodo,
      w.diasAtivos.size.toString(),
      ...fmtT(w.manha),
      ...fmtT(w.tarde),
      ...fmtT(w.noite),
      ...fmtT(w.total),
    ];

    lines.push(row.join(";"));
  }

  return lines.join("\n");
}

/**
 * 3. EXPORTAÇÃO MENSAL (Linhas: Meses | Colunas: Indicadores por Turno e Total)
 */
export function exportMonthlyShiftsCsv(sales: DetailedSaleRow[], allowedDates?: string[]): string {
  const allowedSet = allowedDates ? new Set(allowedDates) : null;
  const monthsMap: Record<
    string,
    {
      label: string;
      diasAtivos: Set<string>;
      manha: ShiftAgg;
      tarde: ShiftAgg;
      noite: ShiftAgg;
      total: ShiftAgg;
    }
  > = {};

  for (const s of sales) {
    if (!s.dhEmi) continue;
    let d: Date;
    let dStr: string;
    let mStr: string;
    try {
      d = parseISO(s.dhEmi);
      dStr = format(d, "yyyy-MM-dd");
      mStr = format(d, "yyyy-MM");
    } catch {
      continue;
    }

    if (allowedSet && !allowedSet.has(dStr)) continue;

    if (!monthsMap[mStr]) {
      let label = mStr;
      try {
        label = format(parseISO(`${mStr}-01`), "MMMM 'de' yyyy", { locale: ptBR });
        label = label.charAt(0).toUpperCase() + label.slice(1);
      } catch {}

      monthsMap[mStr] = {
        label,
        diasAtivos: new Set<string>(),
        manha: createEmptyShift(),
        tarde: createEmptyShift(),
        noite: createEmptyShift(),
        total: createEmptyShift(),
      };
    }

    monthsMap[mStr].diasAtivos.add(dStr);

    const turno = getShiftForDate(d);
    const vNF = parseFloat(s.vNF) || 0;
    const qItens = parseFloat(s.itens_qtd) || 0;
    const vend = s.vendedor || "DESCONHECIDO";

    const bucket = monthsMap[mStr][turno];
    bucket.cupons++;
    bucket.vNF += vNF;
    bucket.itens += qItens;
    if (vend !== "COLABORADOR NÃO IDENTIFICADO") bucket.vendedores.add(vend);

    const totalBucket = monthsMap[mStr].total;
    totalBucket.cupons++;
    totalBucket.vNF += vNF;
    totalBucket.itens += qItens;
    if (vend !== "COLABORADOR NÃO IDENTIFICADO") totalBucket.vendedores.add(vend);
  }

  const sortedMonths = Object.keys(monthsMap).sort();

  const headers = [
    "Mês / Ano",
    "Dias com Vendas",
    // Manhã
    "Manhã - Faturamento (R$)",
    "Manhã - Cupons",
    "Manhã - TKM (R$)",
    "Manhã - P.A.",
    "Manhã - Itens",
    "Manhã - Vendedores",
    // Tarde
    "Tarde - Faturamento (R$)",
    "Tarde - Cupons",
    "Tarde - TKM (R$)",
    "Tarde - P.A.",
    "Tarde - Itens",
    "Tarde - Vendedores",
    // Noite
    "Noite - Faturamento (R$)",
    "Noite - Cupons",
    "Noite - TKM (R$)",
    "Noite - P.A.",
    "Noite - Itens",
    "Noite - Vendedores",
    // Total Mês
    "Total Mês - Faturamento (R$)",
    "Total Mês - Cupons",
    "Total Mês - TKM (R$)",
    "Total Mês - P.A.",
    "Total Mês - Itens",
    "Total Mês - Vendedores",
  ];

  const lines = [headers.join(";")];

  for (const mKey of sortedMonths) {
    const m = monthsMap[mKey];

    const fmtT = (agg: ShiftAgg) => {
      const tkm = agg.cupons > 0 ? agg.vNF / agg.cupons : 0;
      const pa = agg.cupons > 0 ? agg.itens / agg.cupons : 0;
      return [
        formatNumberBr(agg.vNF),
        agg.cupons.toString(),
        formatNumberBr(tkm),
        formatNumberBr(pa),
        agg.itens.toString(),
        agg.vendedores.size.toString(),
      ];
    };

    const row = [
      m.label,
      m.diasAtivos.size.toString(),
      ...fmtT(m.manha),
      ...fmtT(m.tarde),
      ...fmtT(m.noite),
      ...fmtT(m.total),
    ];

    lines.push(row.join(";"));
  }

  return lines.join("\n");
}

/**
 * 4. EXPORTAÇÃO DO COMPARATIVO RESUMIDO (Período A vs Período B com Variações)
 */
export function exportComparisonSummaryCsv(
  comparison: ShiftComparisonResult,
  labelA = "Período A",
  labelB = "Período B"
): string {
  const headers = [
    "Turno",
    `Faturamento ${labelA} (R$)`,
    `Faturamento ${labelB} (R$)`,
    "Diferença Faturamento (R$)",
    "Variação Faturamento (%)",
    `Cupons ${labelA}`,
    `Cupons ${labelB}`,
    "Diferença Cupons",
    "Variação Cupons (%)",
    `TKM ${labelA} (R$)`,
    `TKM ${labelB} (R$)`,
    "Diferença TKM (R$)",
    "Variação TKM (%)",
    `P.A. ${labelA}`,
    `P.A. ${labelB}`,
    "Diferença P.A.",
    "Variação P.A. (%)",
    `Itens ${labelA}`,
    `Itens ${labelB}`,
    "Variação Itens (%)",
    `Vendedores ${labelA}`,
    `Vendedores ${labelB}`,
  ];

  const lines = [headers.join(";")];

  const formatRow = (
    shiftName: string,
    sA: { vNF: number; cupons: number; tkm: number; pa: number; itens: number; tamanhoEq?: number; vendedoresCount?: number },
    sB: { vNF: number; cupons: number; tkm: number; pa: number; itens: number; tamanhoEq?: number; vendedoresCount?: number },
    v: {
      vNF: { diff: number; pct: number };
      cupons: { diff: number; pct: number };
      tkm: { diff: number; pct: number };
      pa: { diff: number; pct: number };
      itens: { diff: number; pct: number };
    }
  ) => {
    const vendsA = sA.tamanhoEq ?? sA.vendedoresCount ?? 0;
    const vendsB = sB.tamanhoEq ?? sB.vendedoresCount ?? 0;

    return [
      shiftName,
      formatNumberBr(sA.vNF),
      formatNumberBr(sB.vNF),
      formatNumberBr(v.vNF.diff),
      `${formatNumberBr(v.vNF.pct, 1)}%`,
      sA.cupons.toString(),
      sB.cupons.toString(),
      v.cupons.diff.toString(),
      `${formatNumberBr(v.cupons.pct, 1)}%`,
      formatNumberBr(sA.tkm),
      formatNumberBr(sB.tkm),
      formatNumberBr(v.tkm.diff),
      `${formatNumberBr(v.tkm.pct, 1)}%`,
      formatNumberBr(sA.pa),
      formatNumberBr(sB.pa),
      formatNumberBr(v.pa.diff),
      `${formatNumberBr(v.pa.pct, 1)}%`,
      sA.itens.toString(),
      sB.itens.toString(),
      `${formatNumberBr(v.itens.pct, 1)}%`,
      vendsA.toString(),
      vendsB.toString(),
    ].join(";");
  };

  lines.push(
    formatRow("Manhã", comparison.periodA.shifts.manha, comparison.periodB.shifts.manha, comparison.shifts.manha)
  );
  lines.push(
    formatRow("Tarde", comparison.periodA.shifts.tarde, comparison.periodB.shifts.tarde, comparison.shifts.tarde)
  );
  lines.push(
    formatRow("Noite", comparison.periodA.shifts.noite, comparison.periodB.shifts.noite, comparison.shifts.noite)
  );
  lines.push(
    formatRow("TOTAL LOJA", comparison.periodA.total, comparison.periodB.total, comparison.total)
  );

  return lines.join("\n");
}

/**
 * 5. EXPORTAÇÃO POR COLABORADOR NA COMPARAÇÃO
 */
export function exportEmployeeComparisonCsv(
  comparison: ShiftComparisonResult,
  labelA = "Período A",
  labelB = "Período B"
): string {
  const headers = [
    "Colaborador",
    `Faturamento Total ${labelA} (R$)`,
    `Faturamento Total ${labelB} (R$)`,
    "Diferença Total (R$)",
    "Variação Total (%)",
    `Cupons Total ${labelA}`,
    `Cupons Total ${labelB}`,
    "Variação Cupons (%)",
    `Manhã ${labelA} (R$)`,
    `Manhã ${labelB} (R$)`,
    "Variação Manhã (%)",
    `Tarde ${labelA} (R$)`,
    `Tarde ${labelB} (R$)`,
    "Variação Tarde (%)",
    `Noite ${labelA} (R$)`,
    `Noite ${labelB} (R$)`,
    "Variação Noite (%)",
  ];

  const lines = [headers.join(";")];

  for (const emp of comparison.employeeComparison) {
    const row = [
      emp.nome,
      formatNumberBr(emp.totalVNF.valA),
      formatNumberBr(emp.totalVNF.valB),
      formatNumberBr(emp.totalVNF.diff),
      `${formatNumberBr(emp.totalVNF.pct, 1)}%`,
      emp.totalCupons.valA.toString(),
      emp.totalCupons.valB.toString(),
      `${formatNumberBr(emp.totalCupons.pct, 1)}%`,
      formatNumberBr(emp.byShift.manha.vNF.valA),
      formatNumberBr(emp.byShift.manha.vNF.valB),
      `${formatNumberBr(emp.byShift.manha.vNF.pct, 1)}%`,
      formatNumberBr(emp.byShift.tarde.vNF.valA),
      formatNumberBr(emp.byShift.tarde.vNF.valB),
      `${formatNumberBr(emp.byShift.tarde.vNF.pct, 1)}%`,
      formatNumberBr(emp.byShift.noite.vNF.valA),
      formatNumberBr(emp.byShift.noite.vNF.valB),
      `${formatNumberBr(emp.byShift.noite.vNF.pct, 1)}%`,
    ];
    lines.push(row.join(";"));
  }

  return lines.join("\n");
}
