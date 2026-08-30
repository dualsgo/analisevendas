import { DetailedSaleRow } from "./types";
import { parseISO, format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface GranularBucketStat {
  itemCount: number;
  label: string;
  couponsCount: number;
  couponsRate: number;
  piecesCount: number;
  piecesRate: number;
  revenue: number;
  revenueRate: number;
  avgTicket: number;
  avgPricePerPiece: number;
  paContribution: number;
}

export interface MonthlyBasketStat {
  monthKey: string; // "2024-01", etc.
  monthLabel: string; // "Janeiro 2024"
  monthShort: string; // "Jan/24"
  totalCupons: number;
  totalItens: number;
  totalVenda: number;
  paReal: number;
  paSustentado1to5: number;
  deltaOutliers: number;
  unitRate: number; // % 1 item
  twoItemsRate: number; // % 2 itens
  threeItemsRate: number; // % 3 itens
  fourToFiveRate: number; // % 4-5 itens
  sixPlusRate: number; // % 6+ itens
  tenPlusRate: number; // % 10+ itens
  unitRuleSuccess: boolean; // unitRate <= 50%
  twoItemsRuleSuccess: boolean; // twoItemsRate >= 30%
  outlierCouponsCount: number;
  outlierPiecesCount: number;
}

export interface RealityCheckBenchmark {
  rule1ItemTarget: number; // 50%
  rule2ItemsTarget: number; // 30%
  avgUnitRate: number;
  minUnitRate: number;
  maxUnitRate: number;
  monthsHitting1ItemRule: number;
  pctMonthsHitting1ItemRule: number;

  avgTwoItemsRate: number;
  minTwoItemsRate: number;
  maxTwoItemsRate: number;
  monthsHitting2ItemsRule: number;
  pctMonthsHitting2ItemsRule: number;

  avgThreePlusRate: number;
  avgPaReal: number;
  avgPaSustentado: number;
  avgDeltaOutliers: number;

  realityVerdict1Item: "REALISTA" | "DESAFIADOR" | "RIGIDO_DEMAIS";
  realityVerdict2Items: "REALISTA" | "DESAFIADOR" | "MUITO_ALTO";
  recommendedUnitTarget: number;
  recommendedTwoItemsTarget: number;
  summaryText: string;
}

export interface HistoricalAuditReport {
  totalRows: number;
  activeSalesCount: number;
  canceledSalesCount: number;
  totalPieces: number;
  totalRevenue: number;
  overallPaReal: number;
  overallPaSustentado: number;
  dateRange: {
    startDate: string;
    endDate: string;
    totalDays: number;
    monthsCount: number;
  };
  granularBuckets: GranularBucketStat[];
  monthlyStats: MonthlyBasketStat[];
  benchmark: RealityCheckBenchmark;
  topOutlierSales: Array<{
    chave: string;
    date: string;
    time: string;
    vendedor: string;
    itens_qtd: number;
    vNF: number;
  }>;
}

/**
 * Processa a base de vendas completa (ex: Jan a Ago) e gera auditoria profunda da proporção de itens
 */
export function computeHistoricalBasketAudit(rows: DetailedSaleRow[]): HistoricalAuditReport {
  const activeSales = rows.filter(r => !r.is_cancelada && r.tpNF === 1);
  const canceledCount = rows.filter(r => r.is_cancelada || r.tpNF !== 1).length;

  if (activeSales.length === 0) {
    return {
      totalRows: rows.length,
      activeSalesCount: 0,
      canceledSalesCount: canceledCount,
      totalPieces: 0,
      totalRevenue: 0,
      overallPaReal: 0,
      overallPaSustentado: 0,
      dateRange: { startDate: "", endDate: "", totalDays: 0, monthsCount: 0 },
      granularBuckets: [],
      monthlyStats: [],
      benchmark: {
        rule1ItemTarget: 50,
        rule2ItemsTarget: 30,
        avgUnitRate: 0,
        minUnitRate: 0,
        maxUnitRate: 0,
        monthsHitting1ItemRule: 0,
        pctMonthsHitting1ItemRule: 0,
        avgTwoItemsRate: 0,
        minTwoItemsRate: 0,
        maxTwoItemsRate: 0,
        monthsHitting2ItemsRule: 0,
        pctMonthsHitting2ItemsRule: 0,
        avgThreePlusRate: 0,
        avgPaReal: 0,
        avgPaSustentado: 0,
        avgDeltaOutliers: 0,
        realityVerdict1Item: "REALISTA",
        realityVerdict2Items: "REALISTA",
        recommendedUnitTarget: 50,
        recommendedTwoItemsTarget: 30,
        summaryText: "Nenhuma venda ativa encontrada para análise."
      },
      topOutlierSales: []
    };
  }

  let totalPieces = 0;
  let totalRevenue = 0;
  let piecesIn1to5 = 0;
  let cuponsIn1to5 = 0;

  // Granular buckets: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10-14, 15+
  const granularMap: Record<number, { count: number; pieces: number; revenue: number }> = {
    1: { count: 0, pieces: 0, revenue: 0 },
    2: { count: 0, pieces: 0, revenue: 0 },
    3: { count: 0, pieces: 0, revenue: 0 },
    4: { count: 0, pieces: 0, revenue: 0 },
    5: { count: 0, pieces: 0, revenue: 0 },
    6: { count: 0, pieces: 0, revenue: 0 },
    7: { count: 0, pieces: 0, revenue: 0 },
    8: { count: 0, pieces: 0, revenue: 0 },
    9: { count: 0, pieces: 0, revenue: 0 },
    10: { count: 0, pieces: 0, revenue: 0 }, // 10 a 14
    15: { count: 0, pieces: 0, revenue: 0 }, // 15+
  };

  // Month grouping map
  const monthlyMap: Record<string, {
    sales: DetailedSaleRow[];
    cupons: number;
    pieces: number;
    revenue: number;
    piecesIn1to5: number;
    cuponsIn1to5: number;
    countByItems: Record<number, number>;
  }> = {};

  const validDatesSet = new Set<string>();
  const allOutliers: Array<{
    chave: string;
    date: string;
    time: string;
    vendedor: string;
    itens_qtd: number;
    vNF: number;
  }> = [];

  activeSales.forEach(sale => {
    const qtd = Math.max(1, parseInt(sale.itens_qtd || "1"));
    const vNF = parseFloat(sale.vNF || "0");
    const dEmi = sale.dhEmi ? sale.dhEmi.slice(0, 10) : "";
    const hEmi = sale.dhEmi && sale.dhEmi.length >= 16 ? sale.dhEmi.slice(11, 16) : "";

    totalPieces += qtd;
    totalRevenue += vNF;

    if (dEmi && dEmi.length >= 10) {
      validDatesSet.add(dEmi.slice(0, 10));
    }

    if (qtd <= 5) {
      piecesIn1to5 += qtd;
      cuponsIn1to5 += 1;
    }

    // Granular bucket key
    let gKey = qtd;
    if (qtd >= 10 && qtd <= 14) gKey = 10;
    else if (qtd >= 15) gKey = 15;

    if (granularMap[gKey]) {
      granularMap[gKey].count += 1;
      granularMap[gKey].pieces += qtd;
      granularMap[gKey].revenue += vNF;
    }

    // Month key: "YYYY-MM"
    const monthKey = dEmi && dEmi.length >= 7 ? dEmi.slice(0, 7) : "Indefinido";
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = {
        sales: [],
        cupons: 0,
        pieces: 0,
        revenue: 0,
        piecesIn1to5: 0,
        cuponsIn1to5: 0,
        countByItems: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 10: 0 }
      };
    }

    const m = monthlyMap[monthKey];
    m.sales.push(sale);
    m.cupons += 1;
    m.pieces += qtd;
    m.revenue += vNF;
    if (qtd <= 5) {
      m.piecesIn1to5 += qtd;
      m.cuponsIn1to5 += 1;
    }

    if (qtd === 1) m.countByItems[1] = (m.countByItems[1] || 0) + 1;
    else if (qtd === 2) m.countByItems[2] = (m.countByItems[2] || 0) + 1;
    else if (qtd === 3) m.countByItems[3] = (m.countByItems[3] || 0) + 1;
    else if (qtd >= 4 && qtd <= 5) m.countByItems[4] = (m.countByItems[4] || 0) + 1;
    else if (qtd >= 6 && qtd <= 9) m.countByItems[6] = (m.countByItems[6] || 0) + 1;
    else if (qtd >= 10) m.countByItems[10] = (m.countByItems[10] || 0) + 1;

    // Outlier capture (6+ items)
    if (qtd >= 6) {
      allOutliers.push({
        chave: sale.chave || `${dEmi}-${hEmi}-${sale.vendedor}`,
        date: dEmi,
        time: hEmi,
        vendedor: sale.vendedor || "Não informado",
        itens_qtd: qtd,
        vNF
      });
    }
  });

  const totalCupons = activeSales.length;
  const overallPaReal = totalCupons > 0 ? totalPieces / totalCupons : 0;
  const overallPaSustentado = cuponsIn1to5 > 0 ? piecesIn1to5 / cuponsIn1to5 : overallPaReal;

  // Build granular buckets
  const bucketKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15];
  const granularBuckets: GranularBucketStat[] = bucketKeys.map(k => {
    const raw = granularMap[k] || { count: 0, pieces: 0, revenue: 0 };
    const couponsRate = totalCupons > 0 ? (raw.count / totalCupons) * 100 : 0;
    const piecesRate = totalPieces > 0 ? (raw.pieces / totalPieces) * 100 : 0;
    const revenueRate = totalRevenue > 0 ? (raw.revenue / totalRevenue) * 100 : 0;
    const avgTicket = raw.count > 0 ? raw.revenue / raw.count : 0;
    const avgPricePerPiece = raw.pieces > 0 ? raw.revenue / raw.pieces : 0;
    const paContribution = totalCupons > 0 ? raw.pieces / totalCupons : 0;

    let label = `${k} ${k === 1 ? "Item" : "Itens"}`;
    if (k === 10) label = "10 a 14 Itens";
    if (k === 15) label = "15+ Itens";

    return {
      itemCount: k,
      label,
      couponsCount: raw.count,
      couponsRate,
      piecesCount: raw.pieces,
      piecesRate,
      revenue: raw.revenue,
      revenueRate,
      avgTicket,
      avgPricePerPiece,
      paContribution
    };
  });

  // Build monthly statistics
  const sortedMonthKeys = Object.keys(monthlyMap).filter(k => k !== "Indefinido").sort();
  const monthlyStats: MonthlyBasketStat[] = sortedMonthKeys.map(mKey => {
    const m = monthlyMap[mKey];
    let monthLabel = mKey;
    let monthShort = mKey;

    try {
      const parsed = parseISO(`${mKey}-01`);
      if (isValid(parsed)) {
        monthLabel = format(parsed, "MMMM yyyy", { locale: ptBR });
        monthShort = format(parsed, "MMM/yy", { locale: ptBR });
      }
    } catch {
      // Keep raw
    }

    const paReal = m.cupons > 0 ? m.pieces / m.cupons : 0;
    const paSustentado1to5 = m.cuponsIn1to5 > 0 ? m.piecesIn1to5 / m.cuponsIn1to5 : paReal;
    const deltaOutliers = Math.max(0, paReal - paSustentado1to5);

    const unitRate = m.cupons > 0 ? ((m.countByItems[1] || 0) / m.cupons) * 100 : 0;
    const twoItemsRate = m.cupons > 0 ? ((m.countByItems[2] || 0) / m.cupons) * 100 : 0;
    const threeItemsRate = m.cupons > 0 ? ((m.countByItems[3] || 0) / m.cupons) * 100 : 0;
    const fourToFiveRate = m.cupons > 0 ? ((m.countByItems[4] || 0) / m.cupons) * 100 : 0;
    const sixPlusCount = (m.countByItems[6] || 0) + (m.countByItems[10] || 0);
    const sixPlusRate = m.cupons > 0 ? (sixPlusCount / m.cupons) * 100 : 0;
    const tenPlusRate = m.cupons > 0 ? ((m.countByItems[10] || 0) / m.cupons) * 100 : 0;

    const monthOutliers = allOutliers.filter(o => o.date.startsWith(mKey));
    const outlierPiecesCount = monthOutliers.reduce((acc, o) => acc + o.itens_qtd, 0);

    return {
      monthKey: mKey,
      monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      monthShort,
      totalCupons: m.cupons,
      totalItens: m.pieces,
      totalVenda: m.revenue,
      paReal,
      paSustentado1to5,
      deltaOutliers,
      unitRate,
      twoItemsRate,
      threeItemsRate,
      fourToFiveRate,
      sixPlusRate,
      tenPlusRate,
      unitRuleSuccess: unitRate <= 50,
      twoItemsRuleSuccess: twoItemsRate >= 30,
      outlierCouponsCount: monthOutliers.length,
      outlierPiecesCount
    };
  });

  // Calculate Reality Check Benchmark across all months
  const validMonths = monthlyStats.filter(m => m.totalCupons >= 30);
  const monthsAnalyzed = validMonths.length > 0 ? validMonths : monthlyStats;

  const unitRates = monthsAnalyzed.map(m => m.unitRate);
  const twoItemsRates = monthsAnalyzed.map(m => m.twoItemsRate);
  const threePlusRates = monthsAnalyzed.map(m => 100 - m.unitRate - m.twoItemsRate);
  const paReals = monthsAnalyzed.map(m => m.paReal);
  const paSustentados = monthsAnalyzed.map(m => m.paSustentado1to5);
  const deltaOutliersList = monthsAnalyzed.map(m => m.deltaOutliers);

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const min = (arr: number[]) => arr.length > 0 ? Math.min(...arr) : 0;
  const max = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : 0;

  const avgUnitRate = avg(unitRates);
  const minUnitRate = min(unitRates);
  const maxUnitRate = max(unitRates);

  const avgTwoItemsRate = avg(twoItemsRates);
  const minTwoItemsRate = min(twoItemsRates);
  const maxTwoItemsRate = max(twoItemsRates);

  const avgThreePlusRate = avg(threePlusRates);
  const avgPaReal = avg(paReals);
  const avgPaSustentado = avg(paSustentados);
  const avgDeltaOutliers = avg(deltaOutliersList);

  const monthsHitting1ItemRule = monthsAnalyzed.filter(m => m.unitRate <= 50).length;
  const pctMonthsHitting1ItemRule = monthsAnalyzed.length > 0 ? (monthsHitting1ItemRule / monthsAnalyzed.length) * 100 : 0;

  const monthsHitting2ItemsRule = monthsAnalyzed.filter(m => m.twoItemsRate >= 30).length;
  const pctMonthsHitting2ItemsRule = monthsAnalyzed.length > 0 ? (monthsHitting2ItemsRule / monthsAnalyzed.length) * 100 : 0;

  // Verdicts
  let realityVerdict1Item: "REALISTA" | "DESAFIADOR" | "RIGIDO_DEMAIS" = "REALISTA";
  if (pctMonthsHitting1ItemRule >= 60) realityVerdict1Item = "REALISTA";
  else if (pctMonthsHitting1ItemRule >= 25 || avgUnitRate <= 55) realityVerdict1Item = "DESAFIADOR";
  else realityVerdict1Item = "RIGIDO_DEMAIS";

  let realityVerdict2Items: "REALISTA" | "DESAFIADOR" | "MUITO_ALTO" = "REALISTA";
  if (pctMonthsHitting2ItemsRule >= 60) realityVerdict2Items = "REALISTA";
  else if (pctMonthsHitting2ItemsRule >= 25 || avgTwoItemsRate >= 25) realityVerdict2Items = "DESAFIADOR";
  else realityVerdict2Items = "MUITO_ALTO";

  const recommendedUnitTarget = Math.min(55, Math.max(45, Math.round(avgUnitRate * 0.95)));
  const recommendedTwoItemsTarget = Math.max(25, Math.min(32, Math.round(avgTwoItemsRate * 1.05)));

  let summaryText = "";
  if (realityVerdict1Item === "REALISTA" && realityVerdict2Items === "REALISTA") {
    summaryText = `As metas estipuladas (1 item ≤ 50% e 2 itens ≥ 30%) são 100% aderentes à realidade operacional da sua loja, correspondendo ao padrão atingido nos meses de maior produtividade.`;
  } else if (realityVerdict2Items === "MUITO_ALTO") {
    summaryText = `A meta de 1 item (≤ 50%) é alcançável (média histórica: ${avgUnitRate.toFixed(1)}%), porém a meta de 2 itens (≥ 30%) está muito acima da média histórica real (${avgTwoItemsRate.toFixed(1)}%). Recomenda-se um piso gradual de ${recommendedTwoItemsTarget}%.`;
  } else {
    summaryText = `A média histórica de 1 item é de ${avgUnitRate.toFixed(1)}% (Meta: ≤50%) e a de 2 itens é de ${avgTwoItemsRate.toFixed(1)}% (Meta: ≥30%). A proporção de 3+ itens responde por ${avgThreePlusRate.toFixed(1)}% dos cupons.`;
  }

  // Date range
  const sortedDates = Array.from(validDatesSet).sort();
  const startDate = sortedDates.length > 0 ? sortedDates[0] : "";
  const endDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : "";

  return {
    totalRows: rows.length,
    activeSalesCount: totalCupons,
    canceledSalesCount: canceledCount,
    totalPieces,
    totalRevenue,
    overallPaReal,
    overallPaSustentado,
    dateRange: {
      startDate,
      endDate,
      totalDays: sortedDates.length,
      monthsCount: sortedMonthKeys.length
    },
    granularBuckets,
    monthlyStats,
    benchmark: {
      rule1ItemTarget: 50,
      rule2ItemsTarget: 30,
      avgUnitRate,
      minUnitRate,
      maxUnitRate,
      monthsHitting1ItemRule,
      pctMonthsHitting1ItemRule,
      avgTwoItemsRate,
      minTwoItemsRate,
      maxTwoItemsRate,
      monthsHitting2ItemsRule,
      pctMonthsHitting2ItemsRule,
      avgThreePlusRate,
      avgPaReal,
      avgPaSustentado,
      avgDeltaOutliers,
      realityVerdict1Item,
      realityVerdict2Items,
      recommendedUnitTarget,
      recommendedTwoItemsTarget,
      summaryText
    },
    topOutlierSales: allOutliers.sort((a, b) => b.itens_qtd - a.itens_qtd).slice(0, 30)
  };
}

/**
 * Gera o texto do relatório completo em Markdown estruturado para o Antigravity / Gemini analisar
 */
export function generateMarkdownReportForAI(audit: HistoricalAuditReport): string {
  const { dateRange, benchmark, granularBuckets, monthlyStats } = audit;

  let md = `# RELATÓRIO DE AUDITORIA HISTÓRICA DE CESTAS (JAN A AGO)
**Data de Emissão:** ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}
**Período Analisado:** ${dateRange.startDate ? dateRange.startDate.split("-").reverse().join("/") : "-"} até ${dateRange.endDate ? dateRange.endDate.split("-").reverse().join("/") : "-"} (${dateRange.monthsCount} meses / ${dateRange.totalDays} dias de venda)

---

## 1. RESUMO EXECUTIVO CONSOLIDADO
- **Total de Cupons Ativos (Atendimentos):** ${audit.activeSalesCount.toLocaleString("pt-BR")}
- **Total de Peças Vendidas:** ${audit.totalPieces.toLocaleString("pt-BR")}
- **Faturamento Total Líquido:** R$ ${audit.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **PA Real Geral da Loja:** ${audit.overallPaReal.toFixed(2)} peças/cupom
- **PA Sustentado (Base 1 a 5 peças):** ${audit.overallPaSustentado.toFixed(2)} peças/cupom
- **Distorção Global por Vendas Atípicas (6+ peças):** +${(audit.overallPaReal - audit.overallPaSustentado).toFixed(2)} PA

---

## 2. DISTRIBUIÇÃO GRANULAR DE ITENS POR CUPOM (1 A 15+ ITENS)

| Faixa de Peças | Cupons | % Cupons | Peças | % Peças | Faturamento (R$) | % Receita | Ticket Médio | Contribuição no PA |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
`;

  granularBuckets.forEach(b => {
    md += `| **${b.label}** | ${b.couponsCount.toLocaleString("pt-BR")} | **${b.couponsRate.toFixed(2)}%** | ${b.piecesCount.toLocaleString("pt-BR")} | ${b.piecesRate.toFixed(2)}% | R$ ${b.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | ${b.revenueRate.toFixed(2)}% | R$ ${b.avgTicket.toFixed(2)} | +${b.paContribution.toFixed(2)} |\n`;
  });

  md += `
---

## 3. MATRIZ HISTÓRICA MÊS A MÊS (JANEIRO A AGOSTO)

| Mês | Cupons | PA Real | PA Sustentado (1-5) | % 1 Item (Meta ≤50%) | % 2 Itens (Meta ≥30%) | % 3 Itens | % 4-5 Itens | % 6+ Itens | Vendas Atípicas (6+) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
`;

  monthlyStats.forEach(m => {
    const status1 = m.unitRuleSuccess ? "✓ OK" : "⚠ ACIMA";
    const status2 = m.twoItemsRuleSuccess ? "✓ OK" : "✗ ABAIXO";
    md += `| **${m.monthShort}** | ${m.totalCupons.toLocaleString("pt-BR")} | **${m.paReal.toFixed(2)}** | ${m.paSustentado1to5.toFixed(2)} | **${m.unitRate.toFixed(1)}%** (${status1}) | **${m.twoItemsRate.toFixed(1)}%** (${status2}) | ${m.threeItemsRate.toFixed(1)}% | ${m.fourToFiveRate.toFixed(1)}% | ${m.sixPlusRate.toFixed(1)}% | ${m.outlierCouponsCount} cup (${m.outlierPiecesCount} pçs) |\n`;
  });

  md += `
---

## 4. AUDITORIA ESTATÍSTICA DAS REGRAS (REALITY CHECK)

### Regra de 1 Item (Monopeça) — Meta Definida: ≤ 50.0%
- **Média Histórica Real:** ${benchmark.avgUnitRate.toFixed(2)}%
- **Menor Taxa Registrada:** ${benchmark.minUnitRate.toFixed(2)}%
- **Maior Taxa Registrada:** ${benchmark.maxUnitRate.toFixed(2)}%
- **Meses que Bateram a Meta (≤ 50%):** ${benchmark.monthsHitting1ItemRule} de ${monthlyStats.length} meses (${benchmark.pctMonthsHitting1ItemRule.toFixed(0)}%)
- **Diagnóstico:** **${benchmark.realityVerdict1Item}**

### Regra de 2 Itens (Venda Casada) — Meta Definida: ≥ 30.0%
- **Média Histórica Real:** ${benchmark.avgTwoItemsRate.toFixed(2)}%
- **Menor Taxa Registrada:** ${benchmark.minTwoItemsRate.toFixed(2)}%
- **Maior Taxa Registrada:** ${benchmark.maxTwoItemsRate.toFixed(2)}%
- **Meses que Bateram a Meta (≥ 30%):** ${benchmark.monthsHitting2ItemsRule} de ${monthlyStats.length} meses (${benchmark.pctMonthsHitting2ItemsRule.toFixed(0)}%)
- **Diagnóstico:** **${benchmark.realityVerdict2Items}**

### Saldo da Cesta (3+ Itens — Profundidade)
- **Média Histórica de 3+ Itens:** ${benchmark.avgThreePlusRate.toFixed(2)}% dos cupons

---

## 5. CONCLUSÃO TÉCNICA E RECOMENDAÇÕES PARA O ANTIGRAVITY
${benchmark.summaryText}

**Sugestão de Parametrização Baseada no Histórico Real:**
- Meta Teto de 1 Item: **≤ ${benchmark.recommendedUnitTarget}%**
- Meta Piso de 2 Itens: **≥ ${benchmark.recommendedTwoItemsTarget}%**
- Saldo Mínimo de 3+ Itens: **≥ ${(100 - benchmark.recommendedUnitTarget - benchmark.recommendedTwoItemsTarget)}%**
`;

  return md;
}
