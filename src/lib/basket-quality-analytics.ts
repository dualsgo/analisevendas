import { DetailedSaleRow } from "./types";
import { parseISO, format, getDay, startOfWeek, endOfWeek, isWeekend, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

export type BasketDiagnosticType = 
  | "AMOSTRA_INSUFICIENTE"
  | "PRODUTIVIDADE_SUSTENTADA"
  | "PA_INFLADO_CONCENTRACAO"
  | "ALTA_DEPENDENCIA_MEGA_CUPONS"
  | "BOA_CONVERSAO_BAIXA_PROFUNDIDADE"
  | "BAIXA_CONVERSAO";

export interface BasketDiagnosticInfo {
  type: BasketDiagnosticType;
  title: string;
  badgeLabel: string;
  badgeVariant: "emerald" | "amber" | "blue" | "rose" | "slate" | "purple";
  description: string;
  recommendation: string;
}

export type BasketBucketRiskLevel = "LOW" | "HEALTHY" | "CONSULTIVE" | "VOLUME" | "ATYPICAL" | "ANOMALY";

export interface BasketBucket {
  id: string; // "1", "2", "3", "4-5", "6-9", "10+"
  label: string;
  rangeDescription: string;
  benchmarkLabel: string; // "Meta: ≤ 50%", "Meta: ≥ 30%", etc.
  benchmarkStatus: "SUCCESS" | "WARNING" | "CRITICAL" | "NEUTRAL";
  minItems: number;
  maxItems: number;
  count: number;
  rate: number; // % do total de cupons
  pieces: number;
  piecesRate: number; // % do total de peças
  revenue: number;
  revenueRate: number; // % do total faturado
  avgTicket: number;
  avgPricePerPiece: number;
  paContribution: number; // Quantos pontos de PA esta faixa adiciona ao PA total (pieces / totalCupons)
  leverageRatio: number; // Razão: % Peças / % Cupons
  riskLevel: BasketBucketRiskLevel;
  diagnostic: string;
}

export interface OutlierCoupon {
  chave: string;
  nf: string;
  vendedor: string;
  dhEmi: string;
  dateLabel: string;
  timeLabel: string;
  itens_qtd: number;
  vNF: number;
  avgPrice: number;
  paImpactOnTotal: number; // Quanto este cupom isolado adicionou ao PA total da loja
  dailyPaImpact?: number; // Impacto isolado no PA daquele dia específico
  itensSample: Array<{ 
    cProd: string; 
    xProd: string; 
    qCom: number; 
    vProd: number;
    vUnCom?: number;
    vDesc?: number;
  }>;
  classification: "MEGA_ANOMALIA" | "SUPER_CESTA" | "VOLUME_COMERCIAL";
}

export interface PurgeConfig {
  excludedBucketIds: string[]; // ["10+", "6-9", "4-5", "1"]
  maxItemsCutoff: number | null; // ex: 5 (ignora qualquer cupom com > 5 itens)
  excludedChaves: string[]; // chaves específicas de cupons expurgados
}

export interface PurgeSimulationResult {
  originalMetrics: BasketQualityMetrics;
  purgedMetrics: BasketQualityMetrics;
  purgedCouponsCount: number;
  purgedCouponsRate: number;
  purgedPiecesCount: number;
  purgedPiecesRate: number;
  purgedRevenue: number;
  purgedRevenueRate: number;
  deltaPA: number; // purged.paReal - original.paReal
  pctPADiff: number; // % de deflação do PA
  luckyDependencyScore: number; // 0 a 100: quanto o PA dependia das vendas expurgadas
  luckyDependencyLevel: "BAIXA" | "MODERADA" | "ALTA" | "CRÍTICA";
  diagnostic: string;
}

export interface MacroBasketSplit {
  upTo2Items: {
    cupons: number;
    cuponsRate: number; // % dos cupons totais
    pieces: number;
    piecesRate: number; // % das peças totais
    revenue: number;
    revenueRate: number; // % do faturamento total
    pa: number; // pieces / cupons
    tkm: number;
    pmMedio: number;
    oneItem: {
      cupons: number;
      cuponsRate: number;
      pieces: number;
      piecesRate: number;
      revenue: number;
      revenueRate: number;
    };
    twoItems: {
      cupons: number;
      cuponsRate: number;
      pieces: number;
      piecesRate: number;
      revenue: number;
      revenueRate: number;
    };
  };
  threePlusItems: {
    cupons: number;
    cuponsRate: number; // % dos cupons totais
    pieces: number;
    piecesRate: number; // % das peças totais
    revenue: number;
    revenueRate: number; // % do faturamento total
    pa: number; // pieces / cupons
    tkm: number;
    pmMedio: number;
    threeItems: {
      cupons: number;
      cuponsRate: number;
      pieces: number;
      piecesRate: number;
      revenue: number;
      revenueRate: number;
    };
    fourToFive: {
      cupons: number;
      cuponsRate: number;
      pieces: number;
      piecesRate: number;
      revenue: number;
      revenueRate: number;
    };
    sixPlus: {
      cupons: number;
      cuponsRate: number;
      pieces: number;
      piecesRate: number;
      revenue: number;
      revenueRate: number;
    };
  };
  paLeverageFrom3Plus: number; // paReal - upTo2Items.pa
  revenueRatioUpTo2Vs3Plus: number;
  diagnostic: string;
}

export interface BasketQualityMetrics {
  totalCupons: number;
  totalItens: number;
  totalVenda: number;
  
  // Macro Divisão: Até 2 Itens vs 3+ Itens
  macroSplit: MacroBasketSplit;
  
  // Núcleo e Médias
  paReal: number;
  deltaPA: number;
  paOperacional1to3: number;
  paOperacional1to5: number;
  tkm: number;
  pmMedio: number; // Preço Médio por Peça
  
  // Distribuição Granular de Faixas
  buckets: BasketBucket[];
  unitCount: number; // 1 item
  unitRate: number; // % 1 item (Meta: ≤ 50%)
  twoItemsCount: number; // 2 itens
  twoItemsRate: number; // % 2 itens (Meta: ≥ 30%)
  threeItemsCount: number; // 3 itens
  threeItemsRate: number; // % 3 itens
  threePlusCount: number; // 3+ itens (Restante da cesta)
  threePlusRate: number; // % 3+ itens
  fourToFiveCount: number; // 4 a 5 itens
  fourToFiveRate: number;
  sixToNineCount: number; // 6 a 9 itens
  sixToNineRate: number;
  tenPlusCount: number; // 10+ itens
  tenPlusRate: number;
  multiCouponsCount: number; // 2+ itens
  multiCouponsRate: number; // % 2+ itens
  deepCouponsCount: number; // 4+ itens
  deepCouponsRate: number; // % 4+ itens
  outlierCouponsCount: number; // 6+ itens
  outlierCouponsRate: number; // % 6+ itens
  
  // Profundidade e Concentração da Cauda
  piecesIn1to3: number;
  cuponsIn1to3: number;
  piecesIn1to5: number;
  cuponsIn1to5: number;
  piecesIn4Plus: number;
  piecesIn6Plus: number;
  piecesIn10Plus: number;
  tailPiecesRate: number; // % das peças que vieram de 4+ itens
  tailCouponsRate: number; // % dos cupons que têm 4+ itens
  concentrationIndex: number; // Razão: % Peças 4+ / % Cupons 4+
  avgDeepBasketPieces: number; // Profundidade média quando há venda adicional (2+)
  
  // Métricas Avançadas de Sustentação vs Impacto de Vendas Isoladas
  sustainabilityIndex: number; // Índice de Sustentação do PA (0 a 100)
  luckyRatio: number; // % do PA oriundo de cupons >= 6 itens
  luckyRatio10Plus: number; // % do PA oriundo de mega cupons >= 10 itens
  
  // Cupons Anômalos / Outliers
  outliers: OutlierCoupon[];
  
  // Diagnóstico
  diagnostic: BasketDiagnosticInfo;
}

export interface TemporalDailyMetric extends BasketQualityMetrics {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "15/08"
  weekdayName: string; // "Segunda-feira"
  weekdayShort: string; // "Seg"
  isWeekendDay: boolean;
  hasIsolatedOutlierImpact: boolean;
  isolatedOutliersCount: number;
  isolatedPiecesCount: number;
  isolatedSalesPaDelta: number;
  isolatedOutliersList: OutlierCoupon[];
  technicalExplanation: string;
  paWithoutOutliers: number;
  topOutlierCoupon?: OutlierCoupon;
  savedByLuck?: boolean; // Compatibilidade retroativa
}

export interface DayOfWeekMetric {
  dayIndex: number; // 0=Dom, 1=Seg, ... 6=Sáb
  dayName: string;
  dayShort: string;
  totalDays: number;
  metrics: BasketQualityMetrics;
}

export interface DayOfWeekOccurrence {
  date: string; // "2026-01-05"
  dateFormatted: string; // "05/01/2026"
  dayLabel: string;
  metrics: BasketQualityMetrics;
}

export interface DayOfWeekDetailedEvolution {
  dayIndex: number;
  dayName: string;
  dayShort: string;
  totalDays: number;
  aggregateMetrics: BasketQualityMetrics;
  occurrences: DayOfWeekOccurrence[];
}

export interface WeekComparisonMetric {
  weekKey: string; // "Semana 1", "Semana 2"
  dateRangeLabel: string; // "01/08 - 07/08"
  startDate: string;
  endDate: string;
  metrics: BasketQualityMetrics;
}

export interface MonthComparisonMetric {
  monthKey: string; // "2026-01"
  monthLabel: string; // "Janeiro 2026"
  monthShort: string; // "Jan/26"
  totalDays: number;
  metrics: BasketQualityMetrics;
}

export interface WeekdayVsWeekendComparison {
  weekdays: BasketQualityMetrics; // Seg a Sex
  weekends: BasketQualityMetrics; // Sáb e Dom
  deltas: {
    paRealDiff: number;
    unitRateDiff: number;
    twoItemsRateDiff: number;
    threePlusRateDiff: number;
    multiRateDiff: number;
    concentrationDiff: number;
  };
}

export type CollaboratorProfileType = 
  | "CONSISTENTE"
  | "ESPECIALISTA_CONVERSAO"
  | "DEPENDENTE_MEGA_VENDA"
  | "MONOPECA_BALCAO"
  | "AMOSTRA_BAIXA";

export interface CollaboratorBasketMetric extends BasketQualityMetrics {
  name: string;
  paSustentadoSemAnomalias: number; // PA expurgando 6+ itens
  paSustentadoBase1to3: number;
  deltaSorte: number; // paReal - paSustentadoSemAnomalias (Impacto das vendas atípicas 6+)
  luckySharePercent: number; // % das peças do colaborador que vieram de compras 6+
  profile: CollaboratorProfileType;
  profileLabel: string;
  profileBadgeColor: string;
  topSaleItemCount: number;
  topCouponDetails?: OutlierCoupon;
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
  dayOfWeekEvolution: DayOfWeekDetailedEvolution[];
  weekdayVsWeekend: WeekdayVsWeekendComparison;
  weeklyComparison: WeekComparisonMetric[];
  monthlyComparison: MonthComparisonMetric[];
  collaborators: CollaboratorBasketMetric[];
  topOutliers: OutlierCoupon[];
  daysWithOutlierImpact: Array<{
    date: string;
    dayLabel: string;
    weekdayShort: string;
    paReal: number;
    paWithoutOutliers: number;
    deltaDrop: number;
    isolatedSalesCount: number;
    totalOutlierPieces: number;
    mainOutlierVendedor: string;
    outliersSummary: string;
    outliersList: OutlierCoupon[];
  }>;
  daysSavedByLuck: Array<{
    date: string;
    dayLabel: string;
    weekdayShort: string;
    paReal: number;
    paWithoutOutliers: number;
    deltaDrop: number;
    mainOutlierVendedor: string;
    outlierPieces: number;
  }>; // Compatibilidade retroativa
}

const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAYS_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

/**
 * Definições das 6 faixas estruturais de itens por cupom com metas explícitas
 */
export const BUCKET_DEFINITIONS = [
  {
    id: "1",
    label: "1 Item",
    rangeDescription: "1 Peça (Monopeça)",
    benchmarkLabel: "Meta: ≤ 55% (Ouro: ≤ 50%)",
    minItems: 1,
    maxItems: 1,
    riskLevel: "ANOMALY" as BasketBucketRiskLevel,
    diagnostic: "Atendimento unitário sem venda adicional agregada. Meta operacional de controle: ≤ 55% dos atendimentos (Meta de Excelência: ≤ 50%)."
  },
  {
    id: "2",
    label: "2 Itens",
    rangeDescription: "2 Peças (Venda Casada)",
    benchmarkLabel: "Meta: ≥ 28% (Ouro: ≥ 30%)",
    minItems: 2,
    maxItems: 2,
    riskLevel: "HEALTHY" as BasketBucketRiskLevel,
    diagnostic: "Primeiro degrau de conversão ativa (item principal + complemento). Meta operacional: ≥ 28% dos atendimentos (Meta de Excelência: ≥ 30%)."
  },
  {
    id: "3",
    label: "3 Itens",
    rangeDescription: "3 Peças (Cesta Profunda)",
    benchmarkLabel: "Saldo Consultivo: ≥ 9%",
    minItems: 3,
    maxItems: 3,
    riskLevel: "CONSULTIVE" as BasketBucketRiskLevel,
    diagnostic: "Padrão de venda consultiva e cross-selling profundo (look completo, conjunto ou compra planejada)."
  },
  {
    id: "4-5",
    label: "4 a 5 Itens",
    rangeDescription: "4 a 5 Peças (Alto Volume)",
    benchmarkLabel: "Saldo Volume: ≥ 5.5%",
    minItems: 4,
    maxItems: 5,
    riskLevel: "VOLUME" as BasketBucketRiskLevel,
    diagnostic: "Compras familiares ou clientes com alta intenção de gasto. Alavanca expressiva de faturamento."
  },
  {
    id: "6-9",
    label: "6 a 9 Itens",
    rangeDescription: "6 a 9 Peças (Super Cestas)",
    benchmarkLabel: "Vendas Atípicas (6-9 Peças)",
    minItems: 6,
    maxItems: 9,
    riskLevel: "ATYPICAL" as BasketBucketRiskLevel,
    diagnostic: "Grandes compras e eventos. Ponto de atenção para dispersão estatística e auditoria de sustentação."
  },
  {
    id: "10+",
    label: "10+ Itens",
    rangeDescription: "10+ Peças (Mega Vendas / Outliers)",
    benchmarkLabel: "Mega Outliers (10+ Peças)",
    minItems: 10,
    maxItems: 99999,
    riskLevel: "ANOMALY" as BasketBucketRiskLevel,
    diagnostic: "Compras corporativas, atacado ou fardamentos. Inflam pontualmente o PA e exigem isolamento analítico."
  }
];

/**
 * Classifica um cupom na respectiva faixa
 */
export function getBucketIdForQuantity(qty: number): string {
  if (qty <= 1) return "1";
  if (qty === 2) return "2";
  if (qty === 3) return "3";
  if (qty <= 5) return "4-5";
  if (qty <= 9) return "6-9";
  return "10+";
}

/**
 * Diagnostica a qualidade e sustentação da distribuição de atendimentos
 * Regras calibradas com o histórico de 8 meses:
 * - 1 Item: meta operacional <= 55% (excelência <= 50%)
 * - 2 Itens: meta operacional >= 28% (excelência >= 30%)
 * - Restante 3+ Itens: saldo consultivo/profundo (>= 16%)
 */
export function getBasketDiagnostic(
  totalCupons: number,
  paReal: number,
  unitRate: number,
  twoItemsRate: number,
  threePlusRate: number,
  tailPiecesRate: number,
  tenPlusPiecesRate: number,
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

  // 1. Caso de Alta Dependência de Mega Cupons (10+ itens)
  if (tenPlusPiecesRate >= 18) {
    return {
      type: "ALTA_DEPENDENCIA_MEGA_CUPONS",
      title: "PA Alavancado por Mega Vendas Isoladas (10+ Itens)",
      badgeLabel: "Alta Dependência de Outliers",
      badgeVariant: "purple",
      description: `O PA de ${paReal.toFixed(2)} foi fortemente alavancado por mega compras (${tenPlusPiecesRate.toFixed(1)}% das peças vieram de cupons com 10+ itens). O PA da rotina diária é inferior ao oficial.`,
      recommendation: "Auditar a rotina de atendimento para garantir que a equipe mantenha a venda agregada sem depender de mega vendas atípicas."
    };
  }

  // 2. Caso de PA Inflado por Concentração na Cauda (4+ ou 6+ itens com 1 item acima de 55%)
  if (unitRate > 55 && tailPiecesRate >= 22 && concentrationIndex >= 2.5) {
    return {
      type: "PA_INFLADO_CONCENTRACAO",
      title: "PA Alavancado por Concentração em Vendas Isoladas",
      badgeLabel: "Inflado por Vendas Isoladas",
      badgeVariant: "amber",
      description: `O PA de ${paReal.toFixed(2)} foi sustentado por vendas atípicas de alto volume (${tailPiecesRate.toFixed(1)}% das peças em 4+ itens), enquanto ${unitRate.toFixed(1)}% dos atendimentos saíram com apenas 1 peça (acima da meta operacional de 55%).`,
      recommendation: "Acompanhar a abordagem no balcão e no checkout para evitar que a equipe relaxe na venda casada após garantir faturamento com poucos clientes volumosos."
    };
  }

  // 3. Caso de Produtividade Sustentada e Equilibrada (1 item <= 55%, 2 itens >= 28%, 3+ consistente)
  if (unitRate <= 55 && twoItemsRate >= 28 && threePlusRate >= 14) {
    const isGold = unitRate <= 50 && twoItemsRate >= 30;
    return {
      type: "PRODUTIVIDADE_SUSTENTADA",
      title: isGold ? "Padrão Ouro de Produtividade Sustentada" : "Produtividade de Cesta Sustentada e Equilibrada",
      badgeLabel: isGold ? "Padrão Ouro de Sustentação" : "Sustentado & Equilibrado",
      badgeVariant: "emerald",
      description: `Atendimento em padrão de alta produtividade: Monopeça sob controle (${unitRate.toFixed(1)}% ≤ 55%), venda casada em 2 itens atingindo a meta (${twoItemsRate.toFixed(1)}% ≥ 28%) e saldo consistente de ${threePlusRate.toFixed(1)}% em 3+ itens sem distorção por outliers.`,
      recommendation: "Reconhecer a equipe pela disciplina de abordagem e manter a cadência de venda consultiva agregada."
    };
  }

  // 4. Caso de Boa Conversão em 2 Itens com Oportunidade de Profundidade em 3+
  if (unitRate <= 55 && twoItemsRate >= 28 && threePlusRate < 14) {
    return {
      type: "BOA_CONVERSAO_BAIXA_PROFUNDIDADE",
      title: "Boa Conversão no 2º Item com Potencial em 3+",
      badgeLabel: "Conversão Sólida em 2 Itens",
      badgeVariant: "blue",
      description: `Bom controle de monopeça (${unitRate.toFixed(1)}% ≤ 55%) e forte conversão no 2º item (${twoItemsRate.toFixed(1)}% ≥ 28%), porém a maior parte das cestas adicionais para no 2º item (apenas ${threePlusRate.toFixed(1)}% em 3+ itens).`,
      recommendation: "Incentivar técnicas de 3º nível: oferta de acessórios, produtos de impulso, SLP e combos completos de look."
    };
  }

  // 5. Caso de Baixa Conversão (Monopeça > 58% ou 2 Itens < 25.5%)
  return {
    type: "BAIXA_CONVERSAO",
    title: "Baixa Conversão de Venda Casada",
    badgeLabel: "Monopeça Excessiva",
    badgeVariant: "rose",
    description: `Predomínio de cupons monopeça (${unitRate.toFixed(1)}% > 55% meta) e/ou agregação no 2º item abaixo do padrão da loja (${twoItemsRate.toFixed(1)}% < 28% meta). Dificuldade em transformar atendimentos unitários em vendas casadas.`,
    recommendation: "Reforçar abordagem proativa na entrada da loja, organização visual dos expositores de checkout (P1) e ofertas de impulso de 2º item."
  };
}

/**
 * Calcula todas as métricas de qualidade e sustentação de cesta para um conjunto de vendas
 */
export function computeBasketMetrics(rows: DetailedSaleRow[], minCoupons = 10): BasketQualityMetrics {
  const activeSales = rows.filter(r => !r.is_cancelada && r.tpNF === 1);
  const totalCupons = activeSales.length;

  if (totalCupons === 0) {
    const emptyBuckets: BasketBucket[] = BUCKET_DEFINITIONS.map(b => ({
      id: b.id,
      label: b.label,
      rangeDescription: b.rangeDescription,
      benchmarkLabel: b.benchmarkLabel,
      benchmarkStatus: "NEUTRAL",
      minItems: b.minItems,
      maxItems: b.maxItems,
      count: 0,
      rate: 0,
      pieces: 0,
      piecesRate: 0,
      revenue: 0,
      revenueRate: 0,
      avgTicket: 0,
      avgPricePerPiece: 0,
      paContribution: 0,
      leverageRatio: 0,
      riskLevel: b.riskLevel,
      diagnostic: b.diagnostic
    }));

    const emptyMacroSplit: MacroBasketSplit = {
      upTo2Items: {
        cupons: 0,
        cuponsRate: 0,
        pieces: 0,
        piecesRate: 0,
        revenue: 0,
        revenueRate: 0,
        pa: 0,
        tkm: 0,
        pmMedio: 0,
        oneItem: { cupons: 0, cuponsRate: 0, pieces: 0, piecesRate: 0, revenue: 0, revenueRate: 0 },
        twoItems: { cupons: 0, cuponsRate: 0, pieces: 0, piecesRate: 0, revenue: 0, revenueRate: 0 }
      },
      threePlusItems: {
        cupons: 0,
        cuponsRate: 0,
        pieces: 0,
        piecesRate: 0,
        revenue: 0,
        revenueRate: 0,
        pa: 0,
        tkm: 0,
        pmMedio: 0,
        threeItems: { cupons: 0, cuponsRate: 0, pieces: 0, piecesRate: 0, revenue: 0, revenueRate: 0 },
        fourToFive: { cupons: 0, cuponsRate: 0, pieces: 0, piecesRate: 0, revenue: 0, revenueRate: 0 },
        sixPlus: { cupons: 0, cuponsRate: 0, pieces: 0, piecesRate: 0, revenue: 0, revenueRate: 0 }
      },
      paLeverageFrom3Plus: 0,
      revenueRatioUpTo2Vs3Plus: 1,
      diagnostic: "Sem atendimentos no período."
    };

    return {
      totalCupons: 0,
      totalItens: 0,
      totalVenda: 0,
      macroSplit: emptyMacroSplit,
      paReal: 0,
      deltaPA: 0,
      paOperacional1to3: 0,
      paOperacional1to5: 0,
      tkm: 0,
      pmMedio: 0,
      buckets: emptyBuckets,
      unitCount: 0,
      unitRate: 0,
      twoItemsCount: 0,
      twoItemsRate: 0,
      threeItemsCount: 0,
      threeItemsRate: 0,
      threePlusCount: 0,
      threePlusRate: 0,
      fourToFiveCount: 0,
      fourToFiveRate: 0,
      sixToNineCount: 0,
      sixToNineRate: 0,
      tenPlusCount: 0,
      tenPlusRate: 0,
      multiCouponsCount: 0,
      multiCouponsRate: 0,
      deepCouponsCount: 0,
      deepCouponsRate: 0,
      outlierCouponsCount: 0,
      outlierCouponsRate: 0,
      piecesIn1to3: 0,
      cuponsIn1to3: 0,
      piecesIn1to5: 0,
      cuponsIn1to5: 0,
      piecesIn4Plus: 0,
      piecesIn6Plus: 0,
      piecesIn10Plus: 0,
      tailPiecesRate: 0,
      tailCouponsRate: 0,
      concentrationIndex: 0,
      avgDeepBasketPieces: 0,
      sustainabilityIndex: 50,
      luckyRatio: 0,
      luckyRatio10Plus: 0,
      outliers: [],
      diagnostic: getBasketDiagnostic(0, 0, 0, 0, 0, 0, 0, 0, minCoupons)
    };
  }

  let totalItens = 0;
  let totalVenda = 0;
  const itemCountsList: number[] = [];

  const rawBucketsMap: Record<string, { count: number; pieces: number; revenue: number }> = {
    "1": { count: 0, pieces: 0, revenue: 0 },
    "2": { count: 0, pieces: 0, revenue: 0 },
    "3": { count: 0, pieces: 0, revenue: 0 },
    "4-5": { count: 0, pieces: 0, revenue: 0 },
    "6-9": { count: 0, pieces: 0, revenue: 0 },
    "10+": { count: 0, pieces: 0, revenue: 0 },
  };

  const rawOutliers: OutlierCoupon[] = [];

  activeSales.forEach(sale => {
    const qtd = Math.max(1, parseInt(sale.itens_qtd || "1"));
    const vNF = parseFloat(sale.vNF || "0");
    
    totalItens += qtd;
    totalVenda += vNF;
    itemCountsList.push(qtd);

    const bucketId = getBucketIdForQuantity(qtd);
    if (rawBucketsMap[bucketId]) {
      rawBucketsMap[bucketId].count++;
      rawBucketsMap[bucketId].pieces += qtd;
      rawBucketsMap[bucketId].revenue += vNF;
    }

    // Identificação de Outlier para Dossiê (se >= 6 itens ou vNF expressivo)
    if (qtd >= 6) {
      const parsedDate = sale.dhEmi ? parseISO(sale.dhEmi) : new Date();
      const dateLabel = format(parsedDate, "dd/MM/yyyy");
      const timeLabel = format(parsedDate, "HH:mm");

      const itensSample = (sale.itens || []).map(it => ({
        cProd: it.cProd || "",
        xProd: it.xProd || "",
        qCom: it.qCom || 1,
        vProd: (it.vProd || 0) - (it.vDesc || 0),
        vUnCom: (it as any).vUnCom || (it.qCom && it.vProd ? it.vProd / it.qCom : 0),
        vDesc: it.vDesc || 0
      }));

      rawOutliers.push({
        chave: sale.chave || `${sale.nf}_${sale.vendedor}_${sale.dhEmi}`,
        nf: sale.nf || "N/A",
        vendedor: sale.vendedor?.trim() || "NÃO IDENTIFICADO",
        dhEmi: sale.dhEmi || "",
        dateLabel,
        timeLabel,
        itens_qtd: qtd,
        vNF,
        avgPrice: qtd > 0 ? vNF / qtd : 0,
        paImpactOnTotal: totalCupons > 0 ? qtd / totalCupons : 0,
        itensSample,
        classification: qtd >= 10 ? "MEGA_ANOMALIA" : qtd >= 6 ? "SUPER_CESTA" : "VOLUME_COMERCIAL"
      });
    }
  });

  // Ordenar Outliers por quantidade de peças decrescente
  rawOutliers.sort((a, b) => b.itens_qtd - a.itens_qtd);

  const paReal = totalCupons > 0 ? totalItens / totalCupons : 0;
  const tkm = totalCupons > 0 ? totalVenda / totalCupons : 0;
  const pmMedio = totalItens > 0 ? totalVenda / totalItens : 0;

  const unitCount = rawBucketsMap["1"].count;
  const unitRate = totalCupons > 0 ? (unitCount / totalCupons) * 100 : 0;

  const twoItemsCount = rawBucketsMap["2"].count;
  const twoItemsRate = totalCupons > 0 ? (twoItemsCount / totalCupons) * 100 : 0;

  const threeItemsCount = rawBucketsMap["3"].count;
  const threeItemsRate = totalCupons > 0 ? (threeItemsCount / totalCupons) * 100 : 0;

  const fourToFiveCount = rawBucketsMap["4-5"].count;
  const fourToFiveRate = totalCupons > 0 ? (fourToFiveCount / totalCupons) * 100 : 0;

  const sixToNineCount = rawBucketsMap["6-9"].count;
  const sixToNineRate = totalCupons > 0 ? (sixToNineCount / totalCupons) * 100 : 0;

  const tenPlusCount = rawBucketsMap["10+"].count;
  const tenPlusRate = totalCupons > 0 ? (tenPlusCount / totalCupons) * 100 : 0;

  const threePlusCount = threeItemsCount + fourToFiveCount + sixToNineCount + tenPlusCount;
  const threePlusRate = totalCupons > 0 ? (threePlusCount / totalCupons) * 100 : 0;

  const multiCouponsCount = totalCupons - unitCount; // 2+ itens
  const multiCouponsRate = totalCupons > 0 ? (multiCouponsCount / totalCupons) * 100 : 0;

  const deepCouponsCount = fourToFiveCount + sixToNineCount + tenPlusCount; // 4+ itens
  const deepCouponsRate = totalCupons > 0 ? (deepCouponsCount / totalCupons) * 100 : 0;

  const outlierCouponsCount = sixToNineCount + tenPlusCount; // 6+ itens
  const outlierCouponsRate = totalCupons > 0 ? (outlierCouponsCount / totalCupons) * 100 : 0;

  // Cupons e Peças 1 a 3 vs 4+
  const cuponsIn1to3 = rawBucketsMap["1"].count + rawBucketsMap["2"].count + rawBucketsMap["3"].count;
  const piecesIn1to3 = rawBucketsMap["1"].pieces + rawBucketsMap["2"].pieces + rawBucketsMap["3"].pieces;
  const paOperacional1to3 = cuponsIn1to3 > 0 ? piecesIn1to3 / cuponsIn1to3 : 0;

  // Cupons e Peças 1 a 5 (Sem grandes anomalias 6+)
  const cuponsIn1to5 = cuponsIn1to3 + fourToFiveCount;
  const piecesIn1to5 = piecesIn1to3 + rawBucketsMap["4-5"].pieces;
  const paOperacional1to5 = cuponsIn1to5 > 0 ? piecesIn1to5 / cuponsIn1to5 : 0;

  const piecesIn4Plus = rawBucketsMap["4-5"].pieces + rawBucketsMap["6-9"].pieces + rawBucketsMap["10+"].pieces;
  const piecesIn6Plus = rawBucketsMap["6-9"].pieces + rawBucketsMap["10+"].pieces;
  const piecesIn10Plus = rawBucketsMap["10+"].pieces;

  const tailPiecesRate = totalItens > 0 ? (piecesIn4Plus / totalItens) * 100 : 0;
  const tailCouponsRate = deepCouponsRate;
  const tenPlusPiecesRate = totalItens > 0 ? (piecesIn10Plus / totalItens) * 100 : 0;

  // Razão de Concentração: % Peças 4+ / % Cupons 4+
  const concentrationIndex = tailCouponsRate > 0 ? tailPiecesRate / tailCouponsRate : 0;

  // Profundidade quando 2+
  const piecesIn2Plus = totalItens - rawBucketsMap["1"].pieces;
  const avgDeepBasketPieces = multiCouponsCount > 0 ? piecesIn2Plus / multiCouponsCount : 0;

  // Distorção gerada por anomalias 6+
  const deltaPA = Math.max(0, paReal - paOperacional1to5);

  // Ratios de Vendas Isoladas
  const luckyRatio = totalItens > 0 ? (piecesIn6Plus / totalItens) * 100 : 0;
  const luckyRatio10Plus = tenPlusPiecesRate;

  // Buckets formatados com metas e métricas ricas
  const buckets: BasketBucket[] = BUCKET_DEFINITIONS.map(def => {
    const raw = rawBucketsMap[def.id] || { count: 0, pieces: 0, revenue: 0 };
    const rate = totalCupons > 0 ? (raw.count / totalCupons) * 100 : 0;
    const piecesRate = totalItens > 0 ? (raw.pieces / totalItens) * 100 : 0;
    const revenueRate = totalVenda > 0 ? (raw.revenue / totalVenda) * 100 : 0;
    const avgTicket = raw.count > 0 ? raw.revenue / raw.count : 0;
    const avgPricePerPiece = raw.pieces > 0 ? raw.revenue / raw.pieces : 0;
    const paContribution = totalCupons > 0 ? raw.pieces / totalCupons : 0;
    const leverageRatio = rate > 0 ? piecesRate / rate : 0;

    let benchmarkStatus: "SUCCESS" | "WARNING" | "CRITICAL" | "NEUTRAL" = "NEUTRAL";
    if (def.id === "1") {
      benchmarkStatus = rate <= 55 ? "SUCCESS" : rate <= 58 ? "WARNING" : "CRITICAL";
    } else if (def.id === "2") {
      benchmarkStatus = rate >= 28 ? "SUCCESS" : rate >= 25.5 ? "WARNING" : "CRITICAL";
    } else if (def.id === "3") {
      benchmarkStatus = rate >= 9 ? "SUCCESS" : "NEUTRAL";
    } else if (def.id === "10+" || def.id === "6-9") {
      benchmarkStatus = piecesRate >= 18 ? "WARNING" : "NEUTRAL";
    }

    return {
      id: def.id,
      label: def.label,
      rangeDescription: def.rangeDescription,
      benchmarkLabel: def.benchmarkLabel,
      benchmarkStatus,
      minItems: def.minItems,
      maxItems: def.maxItems,
      count: raw.count,
      rate,
      pieces: raw.pieces,
      piecesRate,
      revenue: raw.revenue,
      revenueRate,
      avgTicket,
      avgPricePerPiece,
      paContribution,
      leverageRatio,
      riskLevel: def.riskLevel,
      diagnostic: def.diagnostic
    };
  });

  // Índice de Sustentação de Cesta (Health Score 0 a 100)
  // Regras de benchmark: 1 item <= 50%, 2 itens >= 30%, saldo saudável em 3+ itens
  let sustainabilityScore = 100;
  if (unitRate > 50) {
    sustainabilityScore -= Math.min(35, (unitRate - 50) * 1.5); // penalização por monopeça acima de 50%
  } else {
    sustainabilityScore += 5; // bônus de conformidade (<= 50%)
  }

  if (twoItemsRate >= 30) {
    sustainabilityScore += 5; // bônus por atingir meta de 2 itens (>= 30%)
  } else {
    sustainabilityScore -= Math.min(20, (30 - twoItemsRate) * 1.2); // penalização se < 30%
  }

  if (threePlusRate >= 15) {
    sustainabilityScore += 5; // bônus de profundidade no saldo restante
  }

  if (luckyRatio > 15) {
    sustainabilityScore -= Math.min(25, (luckyRatio - 15) * 1.2); // penalização por concentração em vendas atípicas (6+)
  }

  if (concentrationIndex > 3.0) {
    sustainabilityScore -= Math.min(15, (concentrationIndex - 3.0) * 8); // penalização por cauda excessivamente concentrada
  }

  const sustainabilityIndex = Math.max(10, Math.min(100, Math.round(sustainabilityScore)));

  const diagnostic = getBasketDiagnostic(
    totalCupons,
    paReal,
    unitRate,
    twoItemsRate,
    threePlusRate,
    tailPiecesRate,
    tenPlusPiecesRate,
    concentrationIndex,
    minCoupons
  );

  // MACRO DIVISÃO: ATÉ 2 ITENS (1 e 2 peças) VS DE 3 PARA CIMA (3+ peças)
  const upTo2Cupons = unitCount + twoItemsCount;
  const upTo2CuponsRate = totalCupons > 0 ? (upTo2Cupons / totalCupons) * 100 : 0;
  const upTo2Pieces = rawBucketsMap["1"].pieces + rawBucketsMap["2"].pieces;
  const upTo2PiecesRate = totalItens > 0 ? (upTo2Pieces / totalItens) * 100 : 0;
  const upTo2Revenue = rawBucketsMap["1"].revenue + rawBucketsMap["2"].revenue;
  const upTo2RevenueRate = totalVenda > 0 ? (upTo2Revenue / totalVenda) * 100 : 0;
  const upTo2PA = upTo2Cupons > 0 ? upTo2Pieces / upTo2Cupons : 0;
  const upTo2TKM = upTo2Cupons > 0 ? upTo2Revenue / upTo2Cupons : 0;
  const upTo2PMMedio = upTo2Pieces > 0 ? upTo2Revenue / upTo2Pieces : 0;

  const threePlusRevenue = rawBucketsMap["3"].revenue + rawBucketsMap["4-5"].revenue + rawBucketsMap["6-9"].revenue + rawBucketsMap["10+"].revenue;
  const threePlusRevenueRate = totalVenda > 0 ? (threePlusRevenue / totalVenda) * 100 : 0;
  const threePlusPieces = piecesIn4Plus + rawBucketsMap["3"].pieces;
  const threePlusPiecesRate = totalItens > 0 ? (threePlusPieces / totalItens) * 100 : 0;
  const threePlusPA = threePlusCount > 0 ? threePlusPieces / threePlusCount : 0;
  const threePlusTKM = threePlusCount > 0 ? threePlusRevenue / threePlusCount : 0;
  const threePlusPMMedio = threePlusPieces > 0 ? threePlusRevenue / threePlusPieces : 0;

  const paLeverageFrom3Plus = Math.max(0, paReal - upTo2PA);
  const revenueRatioUpTo2Vs3Plus = threePlusRevenue > 0 ? upTo2Revenue / threePlusRevenue : 1;

  const macroSplit: MacroBasketSplit = {
    upTo2Items: {
      cupons: upTo2Cupons,
      cuponsRate: upTo2CuponsRate,
      pieces: upTo2Pieces,
      piecesRate: upTo2PiecesRate,
      revenue: upTo2Revenue,
      revenueRate: upTo2RevenueRate,
      pa: upTo2PA,
      tkm: upTo2TKM,
      pmMedio: upTo2PMMedio,
      oneItem: {
        cupons: unitCount,
        cuponsRate: unitRate,
        pieces: rawBucketsMap["1"].pieces,
        piecesRate: totalItens > 0 ? (rawBucketsMap["1"].pieces / totalItens) * 100 : 0,
        revenue: rawBucketsMap["1"].revenue,
        revenueRate: totalVenda > 0 ? (rawBucketsMap["1"].revenue / totalVenda) * 100 : 0
      },
      twoItems: {
        cupons: twoItemsCount,
        cuponsRate: twoItemsRate,
        pieces: rawBucketsMap["2"].pieces,
        piecesRate: totalItens > 0 ? (rawBucketsMap["2"].pieces / totalItens) * 100 : 0,
        revenue: rawBucketsMap["2"].revenue,
        revenueRate: totalVenda > 0 ? (rawBucketsMap["2"].revenue / totalVenda) * 100 : 0
      }
    },
    threePlusItems: {
      cupons: threePlusCount,
      cuponsRate: threePlusRate,
      pieces: threePlusPieces,
      piecesRate: threePlusPiecesRate,
      revenue: threePlusRevenue,
      revenueRate: threePlusRevenueRate,
      pa: threePlusPA,
      tkm: threePlusTKM,
      pmMedio: threePlusPMMedio,
      threeItems: {
        cupons: threeItemsCount,
        cuponsRate: threeItemsRate,
        pieces: rawBucketsMap["3"].pieces,
        piecesRate: totalItens > 0 ? (rawBucketsMap["3"].pieces / totalItens) * 100 : 0,
        revenue: rawBucketsMap["3"].revenue,
        revenueRate: totalVenda > 0 ? (rawBucketsMap["3"].revenue / totalVenda) * 100 : 0
      },
      fourToFive: {
        cupons: fourToFiveCount,
        cuponsRate: fourToFiveRate,
        pieces: rawBucketsMap["4-5"].pieces,
        piecesRate: totalItens > 0 ? (rawBucketsMap["4-5"].pieces / totalItens) * 100 : 0,
        revenue: rawBucketsMap["4-5"].revenue,
        revenueRate: totalVenda > 0 ? (rawBucketsMap["4-5"].revenue / totalVenda) * 100 : 0
      },
      sixPlus: {
        cupons: outlierCouponsCount,
        cuponsRate: outlierCouponsRate,
        pieces: piecesIn6Plus,
        piecesRate: totalItens > 0 ? (piecesIn6Plus / totalItens) * 100 : 0,
        revenue: rawBucketsMap["6-9"].revenue + rawBucketsMap["10+"].revenue,
        revenueRate: totalVenda > 0 ? ((rawBucketsMap["6-9"].revenue + rawBucketsMap["10+"].revenue) / totalVenda) * 100 : 0
      }
    },
    paLeverageFrom3Plus,
    revenueRatioUpTo2Vs3Plus,
    diagnostic: `As vendas até 2 itens respondem por ${upTo2RevenueRate.toFixed(1)}% da receita e ${upTo2CuponsRate.toFixed(1)}% do fluxo com PA de ${upTo2PA.toFixed(2)}. O bloco de 3+ peças representa ${threePlusRevenueRate.toFixed(1)}% da receita (${threePlusRate.toFixed(1)}% do fluxo) e alavanca o PA total em +${paLeverageFrom3Plus.toFixed(2)} pontos.`
  };

  return {
    totalCupons,
    totalItens,
    totalVenda,
    macroSplit,
    paReal,
    deltaPA,
    paOperacional1to3,
    paOperacional1to5,
    tkm,
    pmMedio,
    buckets,
    unitCount,
    unitRate,
    twoItemsCount,
    twoItemsRate,
    threeItemsCount,
    threeItemsRate,
    threePlusCount,
    threePlusRate,
    fourToFiveCount,
    fourToFiveRate,
    sixToNineCount,
    sixToNineRate,
    tenPlusCount,
    tenPlusRate,
    multiCouponsCount,
    multiCouponsRate,
    deepCouponsCount,
    deepCouponsRate,
    outlierCouponsCount,
    outlierCouponsRate,
    piecesIn1to3,
    cuponsIn1to3,
    piecesIn1to5,
    cuponsIn1to5,
    piecesIn4Plus,
    piecesIn6Plus,
    piecesIn10Plus,
    tailPiecesRate,
    tailCouponsRate,
    concentrationIndex,
    avgDeepBasketPieces,
    sustainabilityIndex,
    luckyRatio,
    luckyRatio10Plus,
    outliers: rawOutliers,
    diagnostic
  };
}

/**
 * Simula o recálculo do PA com expurgo de faixas, teto máximo ou chaves específicas
 */
export function computePurgedBasketMetrics(
  rows: DetailedSaleRow[],
  config: PurgeConfig,
  minCoupons = 10
): PurgeSimulationResult {
  const activeSales = rows.filter(r => !r.is_cancelada && r.tpNF === 1);
  const originalMetrics = computeBasketMetrics(activeSales, minCoupons);

  const excludedBucketsSet = new Set(config.excludedBucketIds || []);
  const excludedChavesSet = new Set(config.excludedChaves || []);

  const purgedSales = activeSales.filter(sale => {
    const chave = sale.chave || `${sale.nf}_${sale.vendedor}_${sale.dhEmi}`;
    if (excludedChavesSet.has(chave)) return false;

    const qtd = Math.max(1, parseInt(sale.itens_qtd || "1"));
    if (config.maxItemsCutoff !== null && qtd > config.maxItemsCutoff) return false;

    const bucketId = getBucketIdForQuantity(qtd);
    if (excludedBucketsSet.has(bucketId)) return false;

    return true;
  });

  const purgedMetrics = computeBasketMetrics(purgedSales, minCoupons);

  const purgedCouponsCount = originalMetrics.totalCupons - purgedMetrics.totalCupons;
  const purgedCouponsRate = originalMetrics.totalCupons > 0 ? (purgedCouponsCount / originalMetrics.totalCupons) * 100 : 0;

  const purgedPiecesCount = originalMetrics.totalItens - purgedMetrics.totalItens;
  const purgedPiecesRate = originalMetrics.totalItens > 0 ? (purgedPiecesCount / originalMetrics.totalItens) * 100 : 0;

  const purgedRevenue = originalMetrics.totalVenda - purgedMetrics.totalVenda;
  const purgedRevenueRate = originalMetrics.totalVenda > 0 ? (purgedRevenue / originalMetrics.totalVenda) * 100 : 0;

  const deltaPA = purgedMetrics.paReal - originalMetrics.paReal;
  const pctPADiff = originalMetrics.paReal > 0 ? (deltaPA / originalMetrics.paReal) * 100 : 0;

  // Grau de dependência dos cupons expurgados
  const dropAbsolute = Math.abs(deltaPA);
  let luckyDependencyScore = Math.min(100, Math.round(dropAbsolute * 100 + purgedPiecesRate * 0.8));
  if (originalMetrics.totalCupons === 0) luckyDependencyScore = 0;

  let luckyDependencyLevel: "BAIXA" | "MODERADA" | "ALTA" | "CRÍTICA" = "BAIXA";
  if (dropAbsolute >= 0.40 || luckyDependencyScore >= 50) luckyDependencyLevel = "CRÍTICA";
  else if (dropAbsolute >= 0.25 || luckyDependencyScore >= 30) luckyDependencyLevel = "ALTA";
  else if (dropAbsolute >= 0.10 || luckyDependencyScore >= 15) luckyDependencyLevel = "MODERADA";

  let diagnostic = "";
  if (purgedCouponsCount === 0) {
    diagnostic = "Nenhuma faixa ou cupom expurgado. Exibindo métricas integrais da loja.";
  } else if (luckyDependencyLevel === "CRÍTICA") {
    diagnostic = `Alerta Crítico: O PA oficial recua de ${originalMetrics.paReal.toFixed(2)} para ${purgedMetrics.paReal.toFixed(2)} (${pctPADiff.toFixed(1)}%). O resultado dependia massivamente de poucas vendas atípicas de alto volume.`;
  } else if (luckyDependencyLevel === "ALTA") {
    diagnostic = `Dependência Alta: O PA sustentado da rotina é de ${purgedMetrics.paReal.toFixed(2)} (distorção de ${Math.abs(deltaPA).toFixed(2)} pontos). As vendas expurgadas respondiam por ${purgedPiecesRate.toFixed(1)}% das peças.`;
  } else if (luckyDependencyLevel === "MODERADA") {
    diagnostic = `Impacto Moderado: O PA recuou ${Math.abs(deltaPA).toFixed(2)} pontos (${purgedMetrics.paReal.toFixed(2)}). A equipe possui sustentação intermediária.`;
  } else {
    diagnostic = `Alta Sustentação: Variação residual no PA (${deltaPA >= 0 ? `+${deltaPA.toFixed(2)}` : deltaPA.toFixed(2)}). A produtividade de cesta é sólida e independe de anomalias pontuais.`;
  }

  return {
    originalMetrics,
    purgedMetrics,
    purgedCouponsCount,
    purgedCouponsRate,
    purgedPiecesCount,
    purgedPiecesRate,
    purgedRevenue,
    purgedRevenueRate,
    deltaPA,
    pctPADiff,
    luckyDependencyScore,
    luckyDependencyLevel,
    diagnostic
  };
}

/**
 * Gera o relatório completo multi-temporal e por colaborador com análises técnicas de vendas isoladas vs sustentação
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

  // 2. Evolução Diária com Análise Técnica de Impacto de Vendas Isoladas
  const daysWithOutlierImpactList: FullBasketQualityReport["daysWithOutlierImpact"] = [];
  const daysSavedByLuckList: FullBasketQualityReport["daysSavedByLuck"] = [];

  const dailyTrend: TemporalDailyMetric[] = sortedDates.map(dateStr => {
    const daySales = salesByDayMap.get(dateStr) || [];
    const metrics = computeBasketMetrics(daySales, 5);
    const parsedDate = parseISO(dateStr);
    const dayOfWeekIdx = getDay(parsedDate);
    const weekend = isWeekend(parsedDate);

    // Calcular PA sem cupons de 6+ itens no dia
    const salesWithoutOutliers = daySales.filter(s => {
      const q = Math.max(1, parseInt(s.itens_qtd || "1"));
      return q < 6;
    });
    const metricsWithoutOutliers = computeBasketMetrics(salesWithoutOutliers, 3);
    const paWithoutOutliers = metricsWithoutOutliers.paReal;

    const deltaDrop = Math.max(0, metrics.paReal - paWithoutOutliers);
    
    // Vendas isoladas no dia (>= 6 itens)
    const dayOutlierSales = metrics.outliers.map(o => ({
      ...o,
      dailyPaImpact: daySales.length > 0 ? o.itens_qtd / daySales.length : 0
    }));

    const isolatedOutliersCount = dayOutlierSales.length;
    const isolatedPiecesCount = dayOutlierSales.reduce((sum, o) => sum + o.itens_qtd, 0);
    const topOutlier = dayOutlierSales[0] || undefined;

    // Critério Técnico: dia em que o PA foi inflado em >= 0.20 pontos por 1 ou mais vendas isoladas (6+ itens)
    const hasIsolatedOutlierImpact = deltaDrop >= 0.20 && isolatedOutliersCount >= 1;

    let technicalExplanation = "Produção 100% orgânica e contínua no dia.";
    if (hasIsolatedOutlierImpact && topOutlier) {
      if (isolatedOutliersCount === 1) {
        technicalExplanation = `1 venda isolada de ${topOutlier.itens_qtd} peças (${topOutlier.vendedor} às ${topOutlier.timeLabel}) inflou o PA do dia em +${deltaDrop.toFixed(2)} (PA Base: ${paWithoutOutliers.toFixed(2)} → Real: ${metrics.paReal.toFixed(2)}).`;
      } else {
        technicalExplanation = `${isolatedOutliersCount} vendas isoladas (totalizando ${isolatedPiecesCount} peças) inflaram o PA do dia em +${deltaDrop.toFixed(2)} (PA Base: ${paWithoutOutliers.toFixed(2)} → Real: ${metrics.paReal.toFixed(2)}). Maior venda: ${topOutlier.itens_qtd} pçs (${topOutlier.vendedor}).`;
      }

      daysWithOutlierImpactList.push({
        date: dateStr,
        dayLabel: format(parsedDate, "dd/MM"),
        weekdayShort: DAYS_SHORT[dayOfWeekIdx],
        paReal: metrics.paReal,
        paWithoutOutliers,
        deltaDrop,
        isolatedSalesCount: isolatedOutliersCount,
        totalOutlierPieces: isolatedPiecesCount,
        mainOutlierVendedor: topOutlier.vendedor,
        outliersSummary: technicalExplanation,
        outliersList: dayOutlierSales
      });

      daysSavedByLuckList.push({
        date: dateStr,
        dayLabel: format(parsedDate, "dd/MM"),
        weekdayShort: DAYS_SHORT[dayOfWeekIdx],
        paReal: metrics.paReal,
        paWithoutOutliers,
        deltaDrop,
        mainOutlierVendedor: topOutlier.vendedor,
        outlierPieces: topOutlier.itens_qtd
      });
    }

    return {
      ...metrics,
      date: dateStr,
      dayLabel: format(parsedDate, "dd/MM"),
      weekdayName: DAYS_FULL[dayOfWeekIdx],
      weekdayShort: DAYS_SHORT[dayOfWeekIdx],
      isWeekendDay: weekend,
      hasIsolatedOutlierImpact,
      isolatedOutliersCount,
      isolatedPiecesCount,
      isolatedSalesPaDelta: deltaDrop,
      isolatedOutliersList: dayOutlierSales,
      technicalExplanation,
      paWithoutOutliers,
      topOutlierCoupon: topOutlier,
      savedByLuck: hasIsolatedOutlierImpact
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
      unitRateDiff: weekendMetrics.unitRate - weekdayMetrics.unitRate,
      twoItemsRateDiff: weekendMetrics.twoItemsRate - weekdayMetrics.twoItemsRate,
      threePlusRateDiff: weekendMetrics.threePlusRate - weekdayMetrics.threePlusRate,
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
  const weeklyComparison: WeekComparisonMetric[] = sortedWeeks.map(([weekStartKey, data], idx) => {
    const d = parseISO(weekStartKey);
    const weekEnd = endOfWeek(d, { weekStartsOn: 1 });
    return {
      weekKey: `Semana ${idx + 1}`,
      dateRangeLabel: data.label,
      startDate: weekStartKey,
      endDate: format(weekEnd, "yyyy-MM-dd"),
      metrics: computeBasketMetrics(data.sales, 5)
    };
  });

  // 5.1 Evolução Detalhada por Dia da Semana (Ocorrências de cada dia)
  const dayOfWeekEvolution: DayOfWeekDetailedEvolution[] = dowOrder.map(dow => {
    const datesForDow = Array.from(dayOfWeekDatesMap.get(dow) || []).sort();
    const dowSales = dayOfWeekSalesMap.get(dow) || [];
    const aggregateMetrics = computeBasketMetrics(dowSales, 5);

    const occurrences: DayOfWeekOccurrence[] = datesForDow.map(dateStr => {
      const daySales = dowSales.filter(s => s.dhEmi && s.dhEmi.startsWith(dateStr));
      const parsedDate = parseISO(dateStr);
      return {
        date: dateStr,
        dateFormatted: format(parsedDate, "dd/MM/yyyy"),
        dayLabel: format(parsedDate, "dd/MM"),
        metrics: computeBasketMetrics(daySales, 1)
      };
    });

    return {
      dayIndex: dow,
      dayName: DAYS_FULL[dow],
      dayShort: DAYS_SHORT[dow],
      totalDays: datesForDow.length,
      aggregateMetrics,
      occurrences
    };
  });

  // 5.2 Mês a Mês (MoM)
  const salesByMonthMap = new Map<string, { monthKey: string; dates: Set<string>; sales: DetailedSaleRow[] }>();
  activeSales.forEach(s => {
    if (s.dhEmi && s.dhEmi.length >= 7) {
      const mKey = s.dhEmi.substring(0, 7);
      const dayStr = s.dhEmi.substring(0, 10);
      if (!salesByMonthMap.has(mKey)) {
        salesByMonthMap.set(mKey, { monthKey: mKey, dates: new Set(), sales: [] });
      }
      const m = salesByMonthMap.get(mKey)!;
      m.dates.add(dayStr);
      m.sales.push(s);
    }
  });

  const sortedMonths = Array.from(salesByMonthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const monthlyComparison: MonthComparisonMetric[] = sortedMonths.map(([mKey, data]) => {
    let monthLabel = mKey;
    let monthShort = mKey;
    try {
      const parsed = parseISO(`${mKey}-01`);
      if (isValid(parsed)) {
        const full = format(parsed, "MMMM yyyy", { locale: ptBR });
        monthLabel = full.charAt(0).toUpperCase() + full.slice(1);
        monthShort = format(parsed, "MMM/yy", { locale: ptBR });
      }
    } catch {}

    return {
      monthKey: mKey,
      monthLabel,
      monthShort,
      totalDays: data.dates.size,
      metrics: computeBasketMetrics(data.sales, 5)
    };
  });

  // 6. Colaboradores com Análise de Vendas Isoladas vs Sustentação
  const salesByVendorMap = new Map<string, DetailedSaleRow[]>();
  activeSales.forEach(s => {
    const v = s.vendedor?.trim() || "NÃO IDENTIFICADO";
    if (v === "NÃO IDENTIFICADO") return;
    if (!salesByVendorMap.has(v)) salesByVendorMap.set(v, []);
    salesByVendorMap.get(v)!.push(s);
  });

  const collaborators: CollaboratorBasketMetric[] = Array.from(salesByVendorMap.entries())
    .map(([name, sales]) => {
      const metrics = computeBasketMetrics(sales, 6);
      
      // Simulação sem anomalias (sem 6+ itens)
      const salesSem6Plus = sales.filter(s => {
        const q = Math.max(1, parseInt(s.itens_qtd || "1"));
        return q < 6;
      });
      const metricsSem6Plus = computeBasketMetrics(salesSem6Plus, 3);
      const paSustentadoSemAnomalias = metricsSem6Plus.paReal;
      const deltaSorte = Math.max(0, metrics.paReal - paSustentadoSemAnomalias);
      const luckySharePercent = metrics.totalItens > 0 ? (metrics.piecesIn6Plus / metrics.totalItens) * 100 : 0;

      // Classificação Técnica do Perfil
      let profile: CollaboratorProfileType = "CONSISTENTE";
      let profileLabel = "Produtor Consistente";
      let profileBadgeColor = "bg-emerald-500 text-white";

      if (metrics.totalCupons < 6) {
        profile = "AMOSTRA_BAIXA";
        profileLabel = "Amostra Reduzida";
        profileBadgeColor = "bg-slate-400 text-white";
      } else if (deltaSorte >= 0.30 && luckySharePercent >= 18) {
        profile = "DEPENDENTE_MEGA_VENDA";
        profileLabel = "Alavancado por Vendas Isoladas";
        profileBadgeColor = "bg-purple-600 text-white";
      } else if (metrics.unitRate > 58) {
        profile = "MONOPECA_BALCAO";
        profileLabel = `Monopeça Excessiva (${metrics.unitRate.toFixed(0)}% > 55%)`;
        profileBadgeColor = "bg-rose-500 text-white";
      } else if (metrics.twoItemsRate >= 28) {
        profile = "ESPECIALISTA_CONVERSAO";
        profileLabel = `Especialista Venda Casada (${metrics.twoItemsRate.toFixed(0)}% ≥ 28%)`;
        profileBadgeColor = "bg-blue-600 text-white";
      } else if (metrics.unitRate <= 55) {
        profile = "CONSISTENTE";
        profileLabel = "Produtor Sustentado (≤ 55%)";
        profileBadgeColor = "bg-emerald-500 text-white";
      }

      let topCouponDetails: OutlierCoupon | undefined = metrics.outliers.length > 0 ? metrics.outliers[0] : undefined;
      
      if (!topCouponDetails && sales.length > 0) {
        let maxSale = sales[0];
        let maxQ = Math.max(1, parseInt(maxSale.itens_qtd || "1"));
        for (let i = 1; i < sales.length; i++) {
          const q = Math.max(1, parseInt(sales[i].itens_qtd || "1"));
          if (q > maxQ) {
            maxQ = q;
            maxSale = sales[i];
          }
        }

        const parsedDate = maxSale.dhEmi ? parseISO(maxSale.dhEmi) : new Date();
        const dateLabel = format(parsedDate, "dd/MM/yyyy");
        const timeLabel = format(parsedDate, "HH:mm");
        const vNF = parseFloat(maxSale.vNF || "0");
        const itensSample = (maxSale.itens || []).map(it => ({
          cProd: it.cProd || "",
          xProd: it.xProd || "",
          qCom: it.qCom || 1,
          vProd: (it.vProd || 0) - (it.vDesc || 0),
          vUnCom: (it as any).vUnCom || (it.qCom && it.vProd ? it.vProd / it.qCom : 0),
          vDesc: it.vDesc || 0
        }));

        topCouponDetails = {
          chave: maxSale.chave || `${maxSale.nf}_${maxSale.vendedor}_${maxSale.dhEmi}`,
          nf: maxSale.nf || "N/A",
          vendedor: maxSale.vendedor?.trim() || name,
          dhEmi: maxSale.dhEmi || "",
          dateLabel,
          timeLabel,
          itens_qtd: maxQ,
          vNF,
          avgPrice: maxQ > 0 ? vNF / maxQ : 0,
          paImpactOnTotal: overall.totalCupons > 0 ? maxQ / overall.totalCupons : 0,
          itensSample,
          classification: maxQ >= 10 ? "MEGA_ANOMALIA" : maxQ >= 6 ? "SUPER_CESTA" : "VOLUME_COMERCIAL"
        };
      }

      const topSaleItemCount = topCouponDetails ? topCouponDetails.itens_qtd : (metrics.outliers.length > 0 ? metrics.outliers[0].itens_qtd : 0);

      return {
        name,
        ...metrics,
        paSustentadoSemAnomalias,
        paSustentadoBase1to3: metrics.paOperacional1to3,
        deltaSorte,
        luckySharePercent,
        profile,
        profileLabel,
        profileBadgeColor,
        topSaleItemCount,
        topCouponDetails
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
    monthlyComparison,
    dayOfWeekEvolution,
    collaborators,
    topOutliers: overall.outliers,
    daysWithOutlierImpact: daysWithOutlierImpactList,
    daysSavedByLuck: daysSavedByLuckList
  };
}
