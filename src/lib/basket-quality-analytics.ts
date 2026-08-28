import { DetailedSaleRow } from "./types";
import { parseISO, format, getDay, startOfWeek, endOfWeek, isWeekend } from "date-fns";

export type BasketDiagnosticType = 
  | "AMOSTRA_INSUFICIENTE"
  | "PRODUTIVIDADE_SUSTENTADA"
  | "PA_INFLADO_CONCENTRACAO"
  | "BOA_CONVERSAO_BAIXA_PROFUNDIDADE"
  | "BAIXA_CONVERSAO";

export interface BasketDiagnosticInfo {
  type: BasketDiagnosticType;
  title: string;
  badgeLabel: string;
  badgeVariant: "emerald" | "amber" | "blue" | "rose" | "slate";
  description: string;
  recommendation: string;
}

export interface BasketBucket {
  id: number | string;
  label: string;
  count: number;
  rate: number; // % do total de cupons
  pieces: number;
  piecesRate: number; // % do total de peças
  revenue: number;
  avgTicket: number;
}

export interface BasketQualityMetrics {
  totalCupons: number;
  totalItens: number;
  totalVenda: number;
  
  // Núcleo
  paReal: number;
  paMediano: number;
  deltaPA: number;
  paOperacional1to3: number;
  tkm: number;
  
  // Distribuição de Cesta
  buckets: BasketBucket[];
  unitCount: number; // 1 item
  unitRate: number; // % 1 item
  twoItemsCount: number; // 2 itens
  twoItemsRate: number; // % 2 itens
  threePlusCount: number; // 3+ itens
  threePlusRate: number; // % 3+ itens
  multiCouponsCount: number; // 2+ itens
  multiCouponsRate: number; // % 2+ itens
  deepCouponsCount: number; // 4+ itens
  deepCouponsRate: number; // % 4+ itens
  
  // Profundidade e Concentração da Cauda
  piecesIn1to3: number;
  cuponsIn1to3: number;
  piecesIn4Plus: number;
  tailPiecesRate: number; // % das peças que vieram de 4+ itens
  tailCouponsRate: number; // % dos cupons que têm 4+ itens
  concentrationIndex: number; // Razão: % Peças 4+ / % Cupons 4+
  avgDeepBasketPieces: number; // Profundidade média quando há venda adicional (2+)
  
  // Diagnóstico
  diagnostic: BasketDiagnosticInfo;
}

export interface TemporalDailyMetric extends BasketQualityMetrics {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "15/08"
  weekdayName: string; // "Segunda-feira"
  weekdayShort: string; // "Seg"
  isWeekendDay: boolean;
}

export interface DayOfWeekMetric {
  dayIndex: number; // 0=Dom, 1=Seg, ... 6=Sáb
  dayName: string;
  dayShort: string;
  totalDays: number;
  metrics: BasketQualityMetrics;
}

export interface WeekComparisonMetric {
  weekKey: string; // "Semana 1", "Semana 2"
  dateRangeLabel: string; // "01/08 - 07/08"
  metrics: BasketQualityMetrics;
}

export interface WeekdayVsWeekendComparison {
  weekdays: BasketQualityMetrics; // Seg a Sex
  weekends: BasketQualityMetrics; // Sáb e Dom
  deltas: {
    paRealDiff: number;
    paMedianoDiff: number;
    unitRateDiff: number;
    multiRateDiff: number;
    concentrationDiff: number;
  };
}

export interface CollaboratorBasketMetric extends BasketQualityMetrics {
  name: string;
}

export interface FullBasketQualityReport {
  overall: BasketQualityMetrics;
  temporalScope: {
    totalDays: number;
    startDate: string;
    endDate: string;
    isSingleDay: boolean;
    isMultiWeek: boolean;
    isMultiMonth: boolean;
  };
  dailyTrend: TemporalDailyMetric[];
  daysOfWeek: DayOfWeekMetric[];
  weekdayVsWeekend: WeekdayVsWeekendComparison;
  weeklyComparison: WeekComparisonMetric[];
  collaborators: CollaboratorBasketMetric[];
}

const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAYS_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

/**
 * Diagnostica a qualidade e sustentação da distribuição de atendimentos
 */
export function getBasketDiagnostic(
  totalCupons: number,
  paReal: number,
  paMediano: number,
  unitRate: number,
  multiRate: number,
  threePlusRate: number,
  tailPiecesRate: number,
  concentrationIndex: number,
  minCoupons = 10
): BasketDiagnosticInfo {
  if (totalCupons < minCoupons) {
    return {
      type: "AMOSTRA_INSUFICIENTE",
      title: "Amostra Reduzida de Atendimentos",
      badgeLabel: "Amostra Reduzida",
      badgeVariant: "slate",
      description: `Apenas ${totalCupons} cupom(ns) analisado(s). O volume é insuficiente para inferência estatística confiável.`,
      recommendation: "Aguarde o avanço do turno ou amplie o intervalo de datas para obter um diagnóstico consistente."
    };
  }

  // 1. Caso de PA Inflado por Concentração na Cauda
  // PA alto, mas com cauda muito concentrada e comportamento central monopeça
  if (paReal >= 1.70 && (unitRate >= 50 || paMediano <= 1) && tailPiecesRate >= 22 && concentrationIndex >= 2.8) {
    return {
      type: "PA_INFLADO_CONCENTRACAO",
      title: "PA Inflado por Concentração da Cauda",
      badgeLabel: "Inflado por Cauda",
      badgeVariant: "amber",
      description: `O PA de ${paReal.toFixed(2)} foi fortemente sustentado por compras grandes (${tailPiecesRate.toFixed(1)}% das peças vieram de cupons 4+), enquanto ${unitRate.toFixed(1)}% dos atendimentos saíram com apenas 1 peça.`,
      recommendation: "Investigar se o balcão relaxou na venda casada após garantir meta com poucos clientes volumosos."
    };
  }

  // 2. Caso de Boa Conversão com Baixa Profundidade
  // Conseguiu reduzir cupom unitário, grande massa de 2 itens, mas poucos 3+
  if (unitRate <= 48 && multiRate >= 50 && threePlusRate <= 18) {
    return {
      type: "BOA_CONVERSAO_BAIXA_PROFUNDIDADE",
      title: "Boa Conversão com Baixa Profundidade",
      badgeLabel: "Boa Conversão / 2 Itens",
      badgeVariant: "blue",
      description: `Ótima evolução na eliminação de cupons de 1 item (${multiRate.toFixed(1)}% com venda adicional), porém a maior parte das cestas estacionou no 2º item (apenas ${threePlusRate.toFixed(1)}% em 3+ itens).`,
      recommendation: "Incentivar campanhas de 3º nível (acessórios, brinquedos de impulso, SLP e cross-selling complementar)."
    };
  }

  // 3. Caso de Produtividade Sustentada
  // Bom PA, boa distribuição de 2+ e 3+, e concentração controlada
  if (paReal >= 1.65 && unitRate <= 48 && threePlusRate >= 15 && tailPiecesRate <= 28) {
    return {
      type: "PRODUTIVIDADE_SUSTENTADA",
      title: "Produtividade de Cesta Sustentada",
      badgeLabel: "Sustentado & Equilibrado",
      badgeVariant: "emerald",
      description: `Atendimento regular e consistente: PA Real (${paReal.toFixed(2)}) e Mediano (${paMediano.toFixed(1)}) alinhados, com ${multiRate.toFixed(1)}% de vendas adicionais distribuídas por toda a equipe.`,
      recommendation: "Reconhecer a equipe pela disciplina de abordagem e manter a cadência de venda consultiva."
    };
  }

  // 4. Caso de Baixa Conversão (Balcão Raso)
  return {
    type: "BAIXA_CONVERSAO",
    title: "Baixa Conversão de Atendimento",
    badgeLabel: "Baixa Conversão",
    badgeVariant: "rose",
    description: `Predomínio de cupons monopeça (${unitRate.toFixed(1)}% com 1 item). Pouca capacidade de agregação de itens adicionais na rotina da loja.`,
    recommendation: "Reforçar abordagem proativa na entrada da loja, organização visual do caixa (P1) e ofertas de checkout."
  };
}

/**
 * Calcula todas as métricas de qualidade e sustentação de cesta para um conjunto de vendas
 */
export function computeBasketMetrics(rows: DetailedSaleRow[], minCoupons = 10): BasketQualityMetrics {
  const activeSales = rows.filter(r => !r.is_cancelada && r.tpNF === 1);
  const totalCupons = activeSales.length;

  if (totalCupons === 0) {
    const emptyBucket = (id: number | string, label: string) => ({
      id, label, count: 0, rate: 0, pieces: 0, piecesRate: 0, revenue: 0, avgTicket: 0
    });
    return {
      totalCupons: 0,
      totalItens: 0,
      totalVenda: 0,
      paReal: 0,
      paMediano: 0,
      deltaPA: 0,
      paOperacional1to3: 0,
      tkm: 0,
      buckets: [
        emptyBucket(1, "1 Item"),
        emptyBucket(2, "2 Itens"),
        emptyBucket(3, "3 Itens"),
        emptyBucket(4, "4 Itens"),
        emptyBucket(5, "5 Itens"),
        emptyBucket("6+", "6+ Itens")
      ],
      unitCount: 0,
      unitRate: 0,
      twoItemsCount: 0,
      twoItemsRate: 0,
      threePlusCount: 0,
      threePlusRate: 0,
      multiCouponsCount: 0,
      multiCouponsRate: 0,
      deepCouponsCount: 0,
      deepCouponsRate: 0,
      piecesIn1to3: 0,
      cuponsIn1to3: 0,
      piecesIn4Plus: 0,
      tailPiecesRate: 0,
      tailCouponsRate: 0,
      concentrationIndex: 0,
      avgDeepBasketPieces: 0,
      diagnostic: getBasketDiagnostic(0, 0, 0, 0, 0, 0, 0, 0, minCoupons)
    };
  }

  let totalItens = 0;
  let totalVenda = 0;
  const itemCountsList: number[] = [];

  const rawBuckets = [
    { id: 1, label: "1 Item", count: 0, pieces: 0, revenue: 0 },
    { id: 2, label: "2 Itens", count: 0, pieces: 0, revenue: 0 },
    { id: 3, label: "3 Itens", count: 0, pieces: 0, revenue: 0 },
    { id: 4, label: "4 Itens", count: 0, pieces: 0, revenue: 0 },
    { id: 5, label: "5 Itens", count: 0, pieces: 0, revenue: 0 },
    { id: "6+", label: "6+ Itens", count: 0, pieces: 0, revenue: 0 },
  ];

  activeSales.forEach(sale => {
    const qtd = Math.max(1, parseInt(sale.itens_qtd || "1"));
    const vNF = parseFloat(sale.vNF || "0");
    
    totalItens += qtd;
    totalVenda += vNF;
    itemCountsList.push(qtd);

    if (qtd === 1) { rawBuckets[0].count++; rawBuckets[0].pieces += qtd; rawBuckets[0].revenue += vNF; }
    else if (qtd === 2) { rawBuckets[1].count++; rawBuckets[1].pieces += qtd; rawBuckets[1].revenue += vNF; }
    else if (qtd === 3) { rawBuckets[2].count++; rawBuckets[2].pieces += qtd; rawBuckets[2].revenue += vNF; }
    else if (qtd === 4) { rawBuckets[3].count++; rawBuckets[3].pieces += qtd; rawBuckets[3].revenue += vNF; }
    else if (qtd === 5) { rawBuckets[4].count++; rawBuckets[4].pieces += qtd; rawBuckets[4].revenue += vNF; }
    else { rawBuckets[5].count++; rawBuckets[5].pieces += qtd; rawBuckets[5].revenue += vNF; }
  });

  // Cálculo de Mediana
  itemCountsList.sort((a, b) => a - b);
  const mid = Math.floor(itemCountsList.length / 2);
  const paMediano = itemCountsList.length % 2 !== 0 
    ? itemCountsList[mid] 
    : (itemCountsList[mid - 1] + itemCountsList[mid]) / 2;

  const paReal = totalItens / totalCupons;
  const deltaPA = paReal - paMediano;
  const tkm = totalVenda / totalCupons;

  // Buckets formatados com %
  const buckets: BasketBucket[] = rawBuckets.map(b => ({
    ...b,
    rate: totalCupons > 0 ? (b.count / totalCupons) * 100 : 0,
    piecesRate: totalItens > 0 ? (b.pieces / totalItens) * 100 : 0,
    avgTicket: b.count > 0 ? b.revenue / b.count : 0
  }));

  const unitCount = rawBuckets[0].count;
  const unitRate = totalCupons > 0 ? (unitCount / totalCupons) * 100 : 0;

  const twoItemsCount = rawBuckets[1].count;
  const twoItemsRate = totalCupons > 0 ? (twoItemsCount / totalCupons) * 100 : 0;

  const threePlusCount = rawBuckets[2].count + rawBuckets[3].count + rawBuckets[4].count + rawBuckets[5].count;
  const threePlusRate = totalCupons > 0 ? (threePlusCount / totalCupons) * 100 : 0;

  const multiCouponsCount = totalCupons - unitCount; // 2+ itens
  const multiCouponsRate = totalCupons > 0 ? (multiCouponsCount / totalCupons) * 100 : 0;

  const deepCouponsCount = rawBuckets[3].count + rawBuckets[4].count + rawBuckets[5].count; // 4+ itens
  const deepCouponsRate = totalCupons > 0 ? (deepCouponsCount / totalCupons) * 100 : 0;

  // Cupons e Peças 1 a 3 vs 4+
  const cuponsIn1to3 = rawBuckets[0].count + rawBuckets[1].count + rawBuckets[2].count;
  const piecesIn1to3 = rawBuckets[0].pieces + rawBuckets[1].pieces + rawBuckets[2].pieces;
  const paOperacional1to3 = cuponsIn1to3 > 0 ? piecesIn1to3 / cuponsIn1to3 : 0;

  const piecesIn4Plus = rawBuckets[3].pieces + rawBuckets[4].pieces + rawBuckets[5].pieces;
  const tailPiecesRate = totalItens > 0 ? (piecesIn4Plus / totalItens) * 100 : 0;
  const tailCouponsRate = deepCouponsRate;

  // Razão de Concentração: % Peças 4+ / % Cupons 4+
  const concentrationIndex = tailCouponsRate > 0 ? tailPiecesRate / tailCouponsRate : 0;

  // Profundidade quando 2+
  const piecesIn2Plus = totalItens - rawBuckets[0].pieces;
  const avgDeepBasketPieces = multiCouponsCount > 0 ? piecesIn2Plus / multiCouponsCount : 0;

  const diagnostic = getBasketDiagnostic(
    totalCupons,
    paReal,
    paMediano,
    unitRate,
    multiCouponsRate,
    threePlusRate,
    tailPiecesRate,
    concentrationIndex,
    minCoupons
  );

  return {
    totalCupons,
    totalItens,
    totalVenda,
    paReal,
    paMediano,
    deltaPA,
    paOperacional1to3,
    tkm,
    buckets,
    unitCount,
    unitRate,
    twoItemsCount,
    twoItemsRate,
    threePlusCount,
    threePlusRate,
    multiCouponsCount,
    multiCouponsRate,
    deepCouponsCount,
    deepCouponsRate,
    piecesIn1to3,
    cuponsIn1to3,
    piecesIn4Plus,
    tailPiecesRate,
    tailCouponsRate,
    concentrationIndex,
    avgDeepBasketPieces,
    diagnostic
  };
}

/**
 * Gera o relatório completo multi-temporal e por colaborador
 */
export function computeFullBasketQualityReport(rows: DetailedSaleRow[]): FullBasketQualityReport {
  const activeSales = rows.filter(r => !r.is_cancelada && r.tpNF === 1);
  const overall = computeBasketMetrics(activeSales, 10);

  // 1. Mapeamento Temporal e Granularidades
  const datesSet = new Set<string>();
  const salesByDayMap = new Map<string, DetailedSaleRow[]>();

  activeSales.forEach(s => {
    if (s.dhEmi) {
      const dayStr = s.dhEmi.substring(0, 10);
      datesSet.add(dayStr);
      if (!salesByDayMap.has(dayStr)) salesByDayMap.set(dayStr, []);
      salesByDayMap.get(dayStr)!.push(s);
    }
  });

  const sortedDates = Array.from(datesSet).sort();
  const totalDays = sortedDates.length;
  const startDate = sortedDates[0] || "";
  const endDate = sortedDates[sortedDates.length - 1] || "";

  // 2. Evolução Diária (Daily Trend)
  const dailyTrend: TemporalDailyMetric[] = sortedDates.map(dateStr => {
    const daySales = salesByDayMap.get(dateStr) || [];
    const metrics = computeBasketMetrics(daySales, 5); // limite menor para diário
    const parsedDate = parseISO(dateStr);
    const dayOfWeekIdx = getDay(parsedDate);
    const weekend = isWeekend(parsedDate);

    return {
      ...metrics,
      date: dateStr,
      dayLabel: format(parsedDate, "dd/MM"),
      weekdayName: DAYS_FULL[dayOfWeekIdx],
      weekdayShort: DAYS_SHORT[dayOfWeekIdx],
      isWeekendDay: weekend
    };
  });

  // 3. Agrupamento por Dia da Semana (Seg a Dom)
  const dayOfWeekSalesMap = new Map<number, DetailedSaleRow[]>();
  const dayOfWeekDatesMap = new Map<number, Set<string>>();

  for (let i = 0; i < 7; i++) {
    dayOfWeekSalesMap.set(i, []);
    dayOfWeekDatesMap.set(i, new Set<string>());
  }

  activeSales.forEach(s => {
    if (s.dhEmi) {
      const d = parseISO(s.dhEmi);
      const dow = getDay(d);
      const dayStr = s.dhEmi.substring(0, 10);
      dayOfWeekSalesMap.get(dow)!.push(s);
      dayOfWeekDatesMap.get(dow)!.add(dayStr);
    }
  });

  // Ordenar de Segunda (1) a Domingo (0)
  const dowOrder = [1, 2, 3, 4, 5, 6, 0];
  const daysOfWeek: DayOfWeekMetric[] = dowOrder.map(dow => {
    const sales = dayOfWeekSalesMap.get(dow) || [];
    const totalDaysCount = dayOfWeekDatesMap.get(dow)?.size || 0;
    const metrics = computeBasketMetrics(sales, 5);

    return {
      dayIndex: dow,
      dayName: DAYS_FULL[dow],
      dayShort: DAYS_SHORT[dow],
      totalDays: totalDaysCount,
      metrics
    };
  });

  // 4. Dias Úteis vs Fim de Semana
  const weekdaySales = activeSales.filter(s => s.dhEmi && !isWeekend(parseISO(s.dhEmi)));
  const weekendSales = activeSales.filter(s => s.dhEmi && isWeekend(parseISO(s.dhEmi)));

  const weekdayMetrics = computeBasketMetrics(weekdaySales, 5);
  const weekendMetrics = computeBasketMetrics(weekendSales, 5);

  const weekdayVsWeekend: WeekdayVsWeekendComparison = {
    weekdays: weekdayMetrics,
    weekends: weekendMetrics,
    deltas: {
      paRealDiff: weekendMetrics.paReal - weekdayMetrics.paReal,
      paMedianoDiff: weekendMetrics.paMediano - weekdayMetrics.paMediano,
      unitRateDiff: weekendMetrics.unitRate - weekdayMetrics.unitRate,
      multiRateDiff: weekendMetrics.multiCouponsRate - weekdayMetrics.multiCouponsRate,
      concentrationDiff: weekendMetrics.tailPiecesRate - weekdayMetrics.tailPiecesRate
    }
  };

  // 5. Semana a Semana (WoW)
  const salesByWeekMap = new Map<string, { label: string; sales: DetailedSaleRow[] }>();
  activeSales.forEach(s => {
    if (s.dhEmi) {
      const d = parseISO(s.dhEmi);
      const weekStart = startOfWeek(d, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(d, { weekStartsOn: 1 });
      const key = format(weekStart, "yyyy-MM-dd");
      const label = `${format(weekStart, "dd/MM")} - ${format(weekEnd, "dd/MM")}`;

      if (!salesByWeekMap.has(key)) {
        salesByWeekMap.set(key, { label, sales: [] });
      }
      salesByWeekMap.get(key)!.sales.push(s);
    }
  });

  const sortedWeeks = Array.from(salesByWeekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const weeklyComparison: WeekComparisonMetric[] = sortedWeeks.map(([_, data], idx) => {
    return {
      weekKey: `Semana ${idx + 1}`,
      dateRangeLabel: data.label,
      metrics: computeBasketMetrics(data.sales, 5)
    };
  });

  // 6. Colaboradores
  const salesByVendorMap = new Map<string, DetailedSaleRow[]>();
  activeSales.forEach(s => {
    const v = s.vendedor?.trim() || "NÃO IDENTIFICADO";
    if (v === "NÃO IDENTIFICADO") return;
    if (!salesByVendorMap.has(v)) salesByVendorMap.set(v, []);
    salesByVendorMap.get(v)!.push(s);
  });

  const collaborators: CollaboratorBasketMetric[] = Array.from(salesByVendorMap.entries())
    .map(([name, sales]) => {
      const metrics = computeBasketMetrics(sales, 8); // Amostra mínima individual
      return {
        name,
        ...metrics
      };
    })
    .sort((a, b) => b.totalCupons - a.totalCupons);

  // Escopo Temporal
  const monthsSet = new Set(sortedDates.map(d => d.substring(0, 7)));
  const temporalScope = {
    totalDays,
    startDate,
    endDate,
    isSingleDay: totalDays === 1,
    isMultiWeek: weeklyComparison.length > 1,
    isMultiMonth: monthsSet.size > 1
  };

  return {
    overall,
    temporalScope,
    dailyTrend,
    daysOfWeek,
    weekdayVsWeekend,
    weeklyComparison,
    collaborators
  };
}
