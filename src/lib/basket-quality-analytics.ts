import { DetailedSaleRow } from "./types";
import { parseISO, format, getDay, startOfWeek, endOfWeek, isWeekend } from "date-fns";

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
  itensSample: Array<{ cProd: string; xProd: string; qCom: number; vProd: number }>;
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

export interface BasketQualityMetrics {
  totalCupons: number;
  totalItens: number;
  totalVenda: number;
  
  // Núcleo e Médias
  paReal: number;
  paMediano: number;
  deltaPA: number;
  paOperacional1to3: number;
  paOperacional1to5: number;
  tkm: number;
  pmMedio: number; // Preço Médio por Peça
  
  // Distribuição Granular de Faixas
  buckets: BasketBucket[];
  unitCount: number; // 1 item
  unitRate: number; // % 1 item
  twoItemsCount: number; // 2 itens
  twoItemsRate: number; // % 2 itens
  threeItemsCount: number; // 3 itens
  threeItemsRate: number; // % 3 itens
  threePlusCount: number; // 3+ itens
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
  
  // Métricas Avançadas de Sustentação vs Efeito Sorte
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
  savedByLuck?: boolean;
  paWithoutOutliers?: number;
  topOutlierCoupon?: OutlierCoupon;
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
  deltaSorte: number; // paReal - paSustentadoSemAnomalias
  luckySharePercent: number; // % do PA do colaborador que veio de compras 6+
  profile: CollaboratorProfileType;
  profileLabel: string;
  profileBadgeColor: string;
  topSaleItemCount: number;
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
  topOutliers: OutlierCoupon[];
  daysSavedByLuck: Array<{
    date: string;
    dayLabel: string;
    weekdayShort: string;
    paReal: number;
    paWithoutOutliers: number;
    deltaDrop: number;
    mainOutlierVendedor: string;
    outlierPieces: number;
  }>;
}

const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAYS_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

/**
 * Definições das 6 faixas estruturais de itens por cupom
 */
export const BUCKET_DEFINITIONS = [
  {
    id: "1",
    label: "1 Item",
    rangeDescription: "1 Peça (Monopeça)",
    minItems: 1,
    maxItems: 1,
    riskLevel: "ANOMALY" as BasketBucketRiskLevel,
    diagnostic: "Atendimento transacional sem venda adicional agregada. Ponto de atenção para abordagem e checkout."
  },
  {
    id: "2",
    label: "2 Itens",
    rangeDescription: "2 Peças (Venda Casada)",
    minItems: 2,
    maxItems: 2,
    riskLevel: "HEALTHY" as BasketBucketRiskLevel,
    diagnostic: "Primeiro degrau de conversão ativa (item principal + complemento/acessório). Núcleo saudável de loja."
  },
  {
    id: "3",
    label: "3 Itens",
    rangeDescription: "3 Peças (Cesta Profunda)",
    minItems: 3,
    maxItems: 3,
    riskLevel: "CONSULTIVE" as BasketBucketRiskLevel,
    diagnostic: "Padrão de venda consultiva e cross-selling profundo (look completo ou compra planejada)."
  },
  {
    id: "4-5",
    label: "4 a 5 Itens",
    rangeDescription: "4 a 5 Peças (Alto Volume)",
    minItems: 4,
    maxItems: 5,
    riskLevel: "VOLUME" as BasketBucketRiskLevel,
    diagnostic: "Compras familiares ou clientes com alta intenção de gasto. Alavanca natural de faturamento."
  },
  {
    id: "6-9",
    label: "6 a 9 Itens",
    rangeDescription: "6 a 9 Peças (Super Cestas)",
    minItems: 6,
    maxItems: 9,
    riskLevel: "ATYPICAL" as BasketBucketRiskLevel,
    diagnostic: "Grandes compras e eventos. Começa a gerar dispersão estatística relevante sobre a média da equipe."
  },
  {
    id: "10+",
    label: "10+ Itens",
    rangeDescription: "10+ Peças (Mega Cupons / Efeito Sorte)",
    minItems: 10,
    maxItems: 99999,
    riskLevel: "ANOMALY" as BasketBucketRiskLevel,
    diagnostic: "Compras de atacado, fardamento, presentes corporativos ou outliers. Inflam brutalmente o PA e exigem auditoria de sustentação."
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
 */
export function getBasketDiagnostic(
  totalCupons: number,
  paReal: number,
  paMediano: number,
  unitRate: number,
  multiRate: number,
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
  if (tenPlusPiecesRate >= 18 && (paReal - paMediano >= 0.40)) {
    return {
      type: "ALTA_DEPENDENCIA_MEGA_CUPONS",
      title: "PA Inflado por Mega Cupons (Efeito Sorte)",
      badgeLabel: "Efeito Sorte Crítico",
      badgeVariant: "purple",
      description: `O PA de ${paReal.toFixed(2)} foi fortemente sustentado por mega compras (${tenPlusPiecesRate.toFixed(1)}% das peças vieram de cupons com 10+ itens). O PA Mediano da equipe é de apenas ${paMediano.toFixed(1)} peças.`,
      recommendation: "Auditar a rotina diária para garantir que a equipe mantenha a venda agregada mesmo sem contar com mega vendas pontuais."
    };
  }

  // 2. Caso de PA Inflado por Concentração na Cauda (4+ ou 6+ itens)
  if (paReal >= 1.70 && (unitRate >= 50 || paMediano <= 1) && tailPiecesRate >= 22 && concentrationIndex >= 2.8) {
    return {
      type: "PA_INFLADO_CONCENTRACAO",
      title: "PA Inflado por Concentração da Cauda",
      badgeLabel: "Inflado por Cauda",
      badgeVariant: "amber",
      description: `O PA de ${paReal.toFixed(2)} foi fortemente sustentado por compras grandes (${tailPiecesRate.toFixed(1)}% das peças em 4+ itens), enquanto ${unitRate.toFixed(1)}% dos atendimentos saíram com apenas 1 peça.`,
      recommendation: "Investigar se o balcão relaxou na venda casada após garantir meta com poucos clientes volumosos."
    };
  }

  // 3. Caso de Boa Conversão com Baixa Profundidade
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

  // 4. Caso de Produtividade Sustentada
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

  // 5. Caso de Baixa Conversão (Balcão Raso)
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
    const emptyBuckets: BasketBucket[] = BUCKET_DEFINITIONS.map(b => ({
      id: b.id,
      label: b.label,
      rangeDescription: b.rangeDescription,
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

    return {
      totalCupons: 0,
      totalItens: 0,
      totalVenda: 0,
      paReal: 0,
      paMediano: 0,
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
      diagnostic: getBasketDiagnostic(0, 0, 0, 0, 0, 0, 0, 0, 0, minCoupons)
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
        vProd: (it.vProd || 0) - (it.vDesc || 0)
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

  // Cálculo de Mediana
  itemCountsList.sort((a, b) => a - b);
  const mid = Math.floor(itemCountsList.length / 2);
  const paMediano = itemCountsList.length % 2 !== 0 
    ? itemCountsList[mid] 
    : (itemCountsList[mid - 1] + itemCountsList[mid]) / 2;

  const paReal = totalCupons > 0 ? totalItens / totalCupons : 0;
  const deltaPA = paReal - paMediano;
  const tkm = totalCupons > 0 ? totalVenda / totalCupons : 0;
  const pmMedio = totalItens > 0 ? totalVenda / totalItens : 0;

  // Buckets formatados com métricas ricas
  const buckets: BasketBucket[] = BUCKET_DEFINITIONS.map(def => {
    const raw = rawBucketsMap[def.id] || { count: 0, pieces: 0, revenue: 0 };
    const rate = totalCupons > 0 ? (raw.count / totalCupons) * 100 : 0;
    const piecesRate = totalItens > 0 ? (raw.pieces / totalItens) * 100 : 0;
    const revenueRate = totalVenda > 0 ? (raw.revenue / totalVenda) * 100 : 0;
    const avgTicket = raw.count > 0 ? raw.revenue / raw.count : 0;
    const avgPricePerPiece = raw.pieces > 0 ? raw.revenue / raw.pieces : 0;
    const paContribution = totalCupons > 0 ? raw.pieces / totalCupons : 0;
    const leverageRatio = rate > 0 ? piecesRate / rate : 0;

    return {
      id: def.id,
      label: def.label,
      rangeDescription: def.rangeDescription,
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

  // Lucky Ratios
  const luckyRatio = totalItens > 0 ? (piecesIn6Plus / totalItens) * 100 : 0;
  const luckyRatio10Plus = tenPlusPiecesRate;

  // Índice de Sustentação de Cesta (Health Score 0 a 100)
  // Penaliza alta taxa de 1 item, alta concentração de cauda e grande dispersão média-mediana
  let sustainabilityScore = 100;
  sustainabilityScore -= Math.min(35, unitRate * 0.7); // até -35 por monopeça
  if (deltaPA > 0.40) sustainabilityScore -= Math.min(25, (deltaPA - 0.40) * 35); // dispersão média-mediana
  if (luckyRatio > 20) sustainabilityScore -= Math.min(20, (luckyRatio - 20) * 1.0); // dependência de anomalias
  if (concentrationIndex > 3.0) sustainabilityScore -= Math.min(15, (concentrationIndex - 3.0) * 8); // concentração
  if (threePlusRate >= 15) sustainabilityScore += 5; // bônus de profundidade
  const sustainabilityIndex = Math.max(10, Math.min(100, Math.round(sustainabilityScore)));

  const diagnostic = getBasketDiagnostic(
    totalCupons,
    paReal,
    paMediano,
    unitRate,
    multiCouponsRate,
    threePlusRate,
    tailPiecesRate,
    tenPlusPiecesRate,
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
    diagnostic = `Alerta Crítico: O PA oficial cai de ${originalMetrics.paReal.toFixed(2)} para ${purgedMetrics.paReal.toFixed(2)} (${pctPADiff.toFixed(1)}%). O resultado do período dependia massivamente das vendas expurgadas.`;
  } else if (luckyDependencyLevel === "ALTA") {
    diagnostic = `Dependência Alta: O PA sustentado é de ${purgedMetrics.paReal.toFixed(2)} (variação de ${deltaPA.toFixed(2)}). As faixas expurgadas respondiam por ${purgedPiecesRate.toFixed(1)}% das peças.`;
  } else if (luckyDependencyLevel === "MODERADA") {
    diagnostic = `Impacto Moderado: O PA recuou ${Math.abs(deltaPA).toFixed(2)} pontos (${purgedMetrics.paReal.toFixed(2)}). A equipe possui base razoável de sustentação.`;
  } else {
    diagnostic = `Alta Sustentação: Variação residual no PA (${deltaPA >= 0 ? `+${deltaPA.toFixed(2)}` : deltaPA.toFixed(2)}). A produtividade de cesta é sólida e não depende de anomalias pontuais.`;
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
 * Gera o relatório completo multi-temporal e por colaborador com análises de sorte vs sustentação
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

  // 2. Evolução Diária com Detecção de Dias Salvos por Sorte
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

    const deltaDrop = metrics.paReal - paWithoutOutliers;
    const topOutlier = metrics.outliers[0] || undefined;

    // Critério: Dia com PA inflado em mais de 0.35 por cupons de 6+ ou 10+
    const savedByLuck = deltaDrop >= 0.35 && (metrics.luckyRatio >= 20 || metrics.tenPlusCount >= 1);

    if (savedByLuck && topOutlier) {
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
      savedByLuck,
      paWithoutOutliers,
      topOutlierCoupon: topOutlier
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

  // 6. Colaboradores com Análise de Efeito Sorte vs Sustentação
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

      // Classificação do Perfil
      let profile: CollaboratorProfileType = "CONSISTENTE";
      let profileLabel = "Produtor Consistente";
      let profileBadgeColor = "bg-emerald-500 text-white";

      if (metrics.totalCupons < 6) {
        profile = "AMOSTRA_BAIXA";
        profileLabel = "Amostra Reduzida";
        profileBadgeColor = "bg-slate-400 text-white";
      } else if (deltaSorte >= 0.35 && luckySharePercent >= 20) {
        profile = "DEPENDENTE_MEGA_VENDA";
        profileLabel = "Inflado por Mega Venda";
        profileBadgeColor = "bg-purple-600 text-white";
      } else if (metrics.unitRate >= 52) {
        profile = "MONOPECA_BALCAO";
        profileLabel = "Balcão Monopeça";
        profileBadgeColor = "bg-rose-500 text-white";
      } else if (metrics.twoItemsRate + metrics.threeItemsRate >= 50) {
        profile = "ESPECIALISTA_CONVERSAO";
        profileLabel = "Especialista em Venda Casada";
        profileBadgeColor = "bg-blue-600 text-white";
      }

      const topSaleItemCount = metrics.outliers.length > 0 ? metrics.outliers[0].itens_qtd : 0;

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
        topSaleItemCount
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
    collaborators,
    topOutliers: overall.outliers,
    daysSavedByLuck: daysSavedByLuckList
  };
}
