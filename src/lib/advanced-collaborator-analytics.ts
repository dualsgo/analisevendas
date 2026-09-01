import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { EscalaStore, getPosicaoForColaboradorAndDate, PositionGoalConfig, DEFAULT_POSITION_METAS } from "@/lib/escalaProcessor";
import agingDataRaw from "@/data/aging-campaign.json";

export const SLP_DDC_CODES = ['5149138']; // Campanha Atual (SLP DDC)
export const SLP_OUTROS_CODES = [
  '5135238', '5135269', '5135270', '5135273', '5146458', '5146469', '5146470', '5146471', 
  '5146472', '5146473', '5146474', '5146475', '5146476', '5146501', '5146504', '5146505', 
  '5141894', '5141895', '5141896', '5141897', '5141898', '5141899', '5141900', '5141902', 
  '5141903', '5141904', '5141905', '5141907', '5141909', '5141910', '5141911', '5141912', 
  '5141913', '5141914', '5141915', '5141916', '5141917', '5141920', '5141949', '5141978', 
  '5140469', '5140475', '5140476', '5140477', '5140478', '5140479', '5146477', '5146478', 
  '5146502', '5146503'
];
export const SLP_CODES = [...SLP_DDC_CODES, ...SLP_OUTROS_CODES];

export const SOCIAL_CODES = [
  '5057181', '5055875', '5135601', '5129270', '5129271', '5129247', '5129262', '5122642', 
  '5122641', '5135612', '5122639', '5122638', '5133676', '5113644', '5113641', '5113642', 
  '5113643', '5129267', '5129255', '5143422', '5139528', '5143423', '5145833', '5139527', 
  '5147797', '5147796', '5145834', '5079753', '5079752', '5106673', '5106671', '5106674', 
  '5106672', '5088519', '5097336', '5097335', '5011918', '5136558'
];

export const BARALHO_CODES = ['5147797', '5147796', '5149977', '5149978'];
export const SACOLA_CODES = ['5133676', '5113644'];
export const LANCHINHO_CODES = ['5132632', '5135912', '5132608', '5135830', '5135839'];
export const AGING_CODES = new Set(agingDataRaw.map((item: { codigo: number | string }) => String(item.codigo)));

export interface CollaboratorExtendedStats {
  name: string;
  vendaTotal: number;
  cuponsTotal: number;
  itensTotal: number;
  diasTrabalhados: number;
  vendaPorDia: number;
  cuponsPorDia: number;
  itensPorDia: number;
  tkm: number;
  pa: number;
  cpfRate: number;
  descontoTotal: number;
  descontoPercent: number;
  shareLoja: number;
  precoMedioItem: number;
  
  // Escala e Meta Ponderada
  metaPonderadaPA: number;
  atingimentoPonderadoPct: number;
  saldoPecas: number;
  
  // Campanhas Segregadas: SLP DDC (Campanha Atual) e SLP (Demais)
  slpDdcQty: number;
  slpDdcValor: number;
  slpDdcPenetracaoRate: number;
  slpQty: number;
  slpValor: number;
  slpPenetracaoRate: number;
  slpTotalQty: number;
  slpTotalValor: number;
  socialQty: number;
  socialValor: number;
  socialPenetracaoRate: number;
  agingQty: number;
  agingValor: number;
  agingPenetracaoRate: number;
  
  // Omnichannel & Trocas
  retiradasCount: number;
  adicionaisCount: number;
  trocasCount: number;
  trocasValorDiferenca: number;
  trocasPositivasCount: number;
  trocasScoreMedio: number;
  
  // Quadrante de Dispersão
  quadrantKey: "ESTRELA" | "SNIPER" | "VELOCISTA" | "MENTORIA";
  quadrantName: string;
  quadrantDesc: string;
  quadrantBadgeClass: string;

  // J-Score (Fairness Index: 0 - 100)
  jScore: number;
  jScoreBreakdown: {
    metaPonderadaScore: number;
    produtividadeDiaScore: number;
    tkmScore: number;
    campanhasScore: number;
    fidelidadeMargemScore: number;
  };

  // Z-Scores em relação à equipe
  zScores: {
    pa: number;
    tkm: number;
    vendaPorDia: number;
    cuponsPorDia: number;
    cpfRate: number;
    slpRate: number;
    socialRate: number;
    descontoRate: number;
  };

  // Outlier tags
  outliers: Array<{
    metric: string;
    label: string;
    type: "positive" | "negative";
    zScore: number;
    explanation: string;
  }>;

  // Radar 6D Normalizado (0 a 100)
  radarDimensions: {
    produtividade: number;
    profundidadeCesta: number;
    ticketMedio: number;
    campanhas: number;
    fidelidade: number;
    preservacaoMargem: number;
  };
}

export interface TeamDispersionStats {
  collaborators: CollaboratorExtendedStats[];
  teamMeans: {
    vendaPorDia: number;
    cuponsPorDia: number;
    pa: number;
    tkm: number;
    cpfRate: number;
    slpRate: number;
    socialRate: number;
    descontoRate: number;
    jScore: number;
  };
  teamStdDevs: {
    vendaPorDia: number;
    cuponsPorDia: number;
    pa: number;
    tkm: number;
    cpfRate: number;
    slpRate: number;
    socialRate: number;
    descontoRate: number;
  };
  quadrantCounts: Record<string, number>;
  outliersSummary: {
    positiveOutliers: Array<{ name: string; tag: string; value: string; metric: string }>;
    negativeOutliers: Array<{ name: string; tag: string; value: string; metric: string }>;
  };
}

// Utilitário de Média e Desvio Padrão
function calculateMeanAndStd(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (values.length === 1) return { mean, std: 0 };
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

// Utilitário de Z-Score
function calculateZScore(val: number, mean: number, std: number): number {
  if (std === 0 || isNaN(std)) return 0;
  return (val - mean) / std;
}

// Normaliza valor para escala 0 - 100 baseado em mín e máx
function normalizeMinMax(val: number, min: number, max: number): number {
  if (max === min) return 50;
  const clamped = Math.max(min, Math.min(max, val));
  return ((clamped - min) / (max - min)) * 100;
}

export function computeTeamDispersionAnalysis(
  activeSales: DetailedSaleRow[],
  vinculos: VinculoTroca[] = [],
  escalaStore: EscalaStore | null = null,
  customMetas: PositionGoalConfig = DEFAULT_POSITION_METAS
): TeamDispersionStats {
  const storeTotalVenda = activeSales.reduce((acc, s) => acc + (parseFloat(s.vNF) || 0), 0);

  // 1. Agrupar vendas por vendedor
  const vendorSalesMap = new Map<string, DetailedSaleRow[]>();
  activeSales.forEach(s => {
    const v = s.vendedor?.trim() || "NÃO IDENTIFICADO";
    if (v === "NÃO IDENTIFICADO") return;
    if (!vendorSalesMap.has(v)) {
      vendorSalesMap.set(v, []);
    }
    vendorSalesMap.get(v)!.push(s);
  });

  // 2. Extrair métricas brutas de cada vendedor
  const rawList = Array.from(vendorSalesMap.entries()).map(([vendorName, sales]) => {
    const cuponsTotal = sales.length;
    const vendaTotal = sales.reduce((acc, s) => acc + (parseFloat(s.vNF) || 0), 0);
    const itensTotal = sales.reduce((acc, s) => acc + (parseFloat(s.itens_qtd) || 0), 0);
    const cpfCount = sales.filter(s => s.cpf_cnpj_dest && s.cpf_cnpj_dest.trim() !== "").length;
    const descontoTotal = sales.reduce((acc, s) => acc + (parseFloat(s.desconto_total) || 0), 0);

    const daysSet = new Set<string>();
    sales.forEach(s => {
      if (s.dhEmi) {
        try {
          daysSet.add(s.dhEmi.substring(0, 10));
        } catch (e) {}
      }
    });
    const diasTrabalhados = Math.max(1, daysSet.size);

    const pa = cuponsTotal > 0 ? itensTotal / cuponsTotal : 0;
    const tkm = cuponsTotal > 0 ? vendaTotal / cuponsTotal : 0;
    const cpfRate = cuponsTotal > 0 ? (cpfCount / cuponsTotal) * 100 : 0;
    const descontoPercent = (vendaTotal + descontoTotal) > 0 ? (descontoTotal / (vendaTotal + descontoTotal)) * 100 : 0;
    const shareLoja = storeTotalVenda > 0 ? (vendaTotal / storeTotalVenda) * 100 : 0;
    const precoMedioItem = itensTotal > 0 ? vendaTotal / itensTotal : 0;

    const vendaPorDia = vendaTotal / diasTrabalhados;
    const cuponsPorDia = cuponsTotal / diasTrabalhados;
    const itensPorDia = itensTotal / diasTrabalhados;

    // Cálculo de Meta Ponderada por Escala
    let totalPecasEsperadas = 0;
    sales.forEach(sale => {
      let posKey = "DEFAULT";
      const saleDate = sale.dhEmi ? sale.dhEmi.substring(0, 10) : "";
      if (escalaStore && escalaStore.escalas.length > 0 && saleDate) {
        const foundPos = getPosicaoForColaboradorAndDate(
          escalaStore.escalas,
          vendorName,
          saleDate,
          escalaStore.aliases
        );
        if (foundPos) {
          if (foundPos.startsWith("P1")) posKey = "P1";
          else if (foundPos.startsWith("P2")) posKey = "P2";
          else if (foundPos.startsWith("P3")) posKey = "P3";
          else if (foundPos.startsWith("DIG")) posKey = "DIG";
          else posKey = foundPos;
        }
      }
      const metaPos = customMetas[posKey as keyof PositionGoalConfig] ?? customMetas.DEFAULT;
      totalPecasEsperadas += metaPos;
    });

    const metaPonderadaPA = cuponsTotal > 0 ? totalPecasEsperadas / cuponsTotal : customMetas.DEFAULT;
    const atingimentoPonderadoPct = metaPonderadaPA > 0 ? (pa / metaPonderadaPA) * 100 : 0;
    const saldoPecas = itensTotal - totalPecasEsperadas;

    // Campanhas Segregadas
    let slpDdcQty = 0;
    let slpDdcValor = 0;
    let slpDdcCupons = 0;

    let slpQty = 0;
    let slpValor = 0;
    let slpCupons = 0;

    let socialQty = 0;
    let socialValor = 0;
    let socialCupons = 0;

    let agingQty = 0;
    let agingValor = 0;
    let agingCupons = 0;

    let retiradasCount = 0;
    let adicionaisCount = 0;

    sales.forEach(s => {
      let hasSlpDdc = false;
      let hasSlp = false;
      let hasSocial = false;
      let hasAging = false;

      if (s.canal === "RETIRADA_ONLINE" || s.is_retirada_online) retiradasCount++;
      if (s.is_adicional || s.canal === "RETIRADA_ADICIONAL") adicionaisCount++;

      s.itens?.forEach(item => {
        const c = item.cProd;
        const q = item.qCom || 0;
        const v = (item.vProd || 0) - (item.vDesc || 0);

        if (SLP_DDC_CODES.includes(c)) {
          slpDdcQty += q;
          slpDdcValor += v;
          hasSlpDdc = true;
        } else if (SLP_OUTROS_CODES.includes(c)) {
          slpQty += q;
          slpValor += v;
          hasSlp = true;
        }
        if (SOCIAL_CODES.includes(c) || SACOLA_CODES.includes(c) || BARALHO_CODES.includes(c) || LANCHINHO_CODES.includes(c)) {
          socialQty += q;
          socialValor += v;
          hasSocial = true;
        }
        if (AGING_CODES.has(c)) {
          agingQty += q;
          agingValor += v;
          hasAging = true;
        }
      });

      if (hasSlpDdc) slpDdcCupons++;
      if (hasSlp) slpCupons++;
      if (hasSocial) socialCupons++;
      if (hasAging) agingCupons++;
    });

    const slpDdcPenetracaoRate = cuponsTotal > 0 ? (slpDdcCupons / cuponsTotal) * 100 : 0;
    const slpPenetracaoRate = cuponsTotal > 0 ? (slpCupons / cuponsTotal) * 100 : 0;
    const socialPenetracaoRate = cuponsTotal > 0 ? (socialCupons / cuponsTotal) * 100 : 0;
    const agingPenetracaoRate = cuponsTotal > 0 ? (agingCupons / cuponsTotal) * 100 : 0;

    // Trocas
    const vendorVinculos = vinculos.filter(v => (v.vendedor?.trim() || "") === vendorName);
    const trocasCount = vendorVinculos.length;
    const trocasValorDiferenca = vendorVinculos.reduce((acc, v) => acc + (v.valor_diferenca || 0), 0);
    const trocasPositivasCount = vendorVinculos.filter(v => (v.valor_diferenca || 0) > 0.01).length;
    const trocasScoreMedio = trocasCount > 0
      ? vendorVinculos.reduce((acc, v) => acc + (v.score_qualidade || 0), 0) / trocasCount
      : 0;

    return {
      name: vendorName,
      vendaTotal,
      cuponsTotal,
      itensTotal,
      diasTrabalhados,
      vendaPorDia,
      cuponsPorDia,
      itensPorDia,
      tkm,
      pa,
      cpfRate,
      descontoTotal,
      descontoPercent,
      shareLoja,
      precoMedioItem,
      metaPonderadaPA,
      atingimentoPonderadoPct,
      saldoPecas,
      slpDdcQty,
      slpDdcValor,
      slpDdcPenetracaoRate,
      slpQty,
      slpValor,
      slpPenetracaoRate,
      slpTotalQty: slpDdcQty + slpQty,
      slpTotalValor: slpDdcValor + slpValor,
      socialQty,
      socialValor,
      socialPenetracaoRate,
      agingQty,
      agingValor,
      agingPenetracaoRate,
      retiradasCount,
      adicionaisCount,
      trocasCount,
      trocasValorDiferenca,
      trocasPositivasCount,
      trocasScoreMedio
    };
  });

  if (rawList.length === 0) {
    return {
      collaborators: [],
      teamMeans: { vendaPorDia: 0, cuponsPorDia: 0, pa: 0, tkm: 0, cpfRate: 0, slpRate: 0, socialRate: 0, descontoRate: 0, jScore: 0 },
      teamStdDevs: { vendaPorDia: 0, cuponsPorDia: 0, pa: 0, tkm: 0, cpfRate: 0, slpRate: 0, socialRate: 0, descontoRate: 0 },
      quadrantCounts: { ESTRELA: 0, SNIPER: 0, VELOCISTA: 0, MENTORIA: 0 },
      outliersSummary: { positiveOutliers: [], negativeOutliers: [] }
    };
  }

  // 3. Médias e Desvios Padrão do Time
  const statsVendaDia = calculateMeanAndStd(rawList.map(v => v.vendaPorDia));
  const statsCuponsDia = calculateMeanAndStd(rawList.map(v => v.cuponsPorDia));
  const statsPA = calculateMeanAndStd(rawList.map(v => v.pa));
  const statsTKM = calculateMeanAndStd(rawList.map(v => v.tkm));
  const statsCPF = calculateMeanAndStd(rawList.map(v => v.cpfRate));
  const statsSLP = calculateMeanAndStd(rawList.map(v => v.slpPenetracaoRate));
  const statsSocial = calculateMeanAndStd(rawList.map(v => v.socialPenetracaoRate));
  const statsDesconto = calculateMeanAndStd(rawList.map(v => v.descontoPercent));

  const teamMeans = {
    vendaPorDia: statsVendaDia.mean,
    cuponsPorDia: statsCuponsDia.mean,
    pa: statsPA.mean,
    tkm: statsTKM.mean,
    cpfRate: statsCPF.mean,
    slpRate: statsSLP.mean,
    socialRate: statsSocial.mean,
    descontoRate: statsDesconto.mean,
    jScore: 0
  };

  const teamStdDevs = {
    vendaPorDia: statsVendaDia.std,
    cuponsPorDia: statsCuponsDia.std,
    pa: statsPA.std,
    tkm: statsTKM.std,
    cpfRate: statsCPF.std,
    slpRate: statsSLP.std,
    socialRate: statsSocial.std,
    descontoRate: statsDesconto.std
  };

  // Valores Mínimos e Máximos para Normalização
  const maxVendaDia = Math.max(...rawList.map(v => v.vendaPorDia), statsVendaDia.mean * 1.5);
  const maxPA = Math.max(...rawList.map(v => v.pa), 2.5);
  const maxTKM = Math.max(...rawList.map(v => v.tkm), statsTKM.mean * 1.5);

  const quadrantCounts = { ESTRELA: 0, SNIPER: 0, VELOCISTA: 0, MENTORIA: 0 };
  const positiveOutliers: Array<{ name: string; tag: string; value: string; metric: string }> = [];
  const negativeOutliers: Array<{ name: string; tag: string; value: string; metric: string }> = [];

  // 4. Mapear cada colaborador com Z-Scores, J-Score, Quadrante e Outliers
  const collaborators: CollaboratorExtendedStats[] = rawList.map(item => {
    // Z-Scores
    const zPA = calculateZScore(item.pa, statsPA.mean, statsPA.std);
    const zTKM = calculateZScore(item.tkm, statsTKM.mean, statsTKM.std);
    const zVendaDia = calculateZScore(item.vendaPorDia, statsVendaDia.mean, statsVendaDia.std);
    const zCuponsDia = calculateZScore(item.cuponsPorDia, statsCuponsDia.mean, statsCuponsDia.std);
    const zCPF = calculateZScore(item.cpfRate, statsCPF.mean, statsCPF.std);
    const zSLP = calculateZScore(item.slpPenetracaoRate, statsSLP.mean, statsSLP.std);
    const zSocial = calculateZScore(item.socialPenetracaoRate, statsSocial.mean, statsSocial.std);
    const zDesconto = calculateZScore(item.descontoPercent, statsDesconto.mean, statsDesconto.std);

    // Mapeamento de Quadrante (Eixo X: Cupons/Dia, Eixo Y: PA vs Meta)
    const isAboveGiro = item.cuponsPorDia >= statsCuponsDia.mean;
    const isAbovePA = item.pa >= statsPA.mean;

    let quadrantKey: "ESTRELA" | "SNIPER" | "VELOCISTA" | "MENTORIA";
    let quadrantName = "";
    let quadrantDesc = "";
    let quadrantBadgeClass = "";

    if (isAboveGiro && isAbovePA) {
      quadrantKey = "ESTRELA";
      quadrantName = "Estrela de Alto Impacto";
      quadrantDesc = "Alto volume de atendimentos diários aliado à alta profundidade de cesta.";
      quadrantBadgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
    } else if (!isAboveGiro && isAbovePA) {
      quadrantKey = "SNIPER";
      quadrantName = "Sniper Consultivo";
      quadrantDesc = "Foco em vendas profundas e ticket expressivo, com ritmo mais cadenciado.";
      quadrantBadgeClass = "bg-indigo-100 text-indigo-800 border-indigo-300";
    } else if (isAboveGiro && !isAbovePA) {
      quadrantKey = "VELOCISTA";
      quadrantName = "Operador de Giro Rápido";
      quadrantDesc = "Elevado fluxo de clientes por dia com oportunidade de adicionar mais peças.";
      quadrantBadgeClass = "bg-blue-100 text-blue-800 border-blue-300";
    } else {
      quadrantKey = "MENTORIA";
      quadrantName = "Zona de Oportunidade & Mentoria";
      quadrantDesc = "Atendimento abaixo da média da loja tanto em volume de giro quanto em peças por cliente.";
      quadrantBadgeClass = "bg-amber-100 text-amber-800 border-amber-300";
    }

    quadrantCounts[quadrantKey]++;

    // Cálculo do J-Score (Score de Justiça de 0 a 100)
    // 30% Atingimento de Meta Ponderada + 25% Produtividade Diária + 15% TKM + 15% Campanhas + 15% Fidelidade/Margem
    const metaPonderadaScore = Math.min(100, Math.max(0, item.atingimentoPonderadoPct));
    const produtividadeDiaScore = Math.min(100, Math.max(0, normalizeMinMax(item.vendaPorDia, 0, maxVendaDia)));
    const tkmScore = Math.min(100, Math.max(0, normalizeMinMax(item.tkm, 0, maxTKM)));
    const campanhasScore = Math.min(100, Math.max(0, (item.slpPenetracaoRate * 1.5 + item.socialPenetracaoRate * 2 + (item.agingQty > 0 ? 20 : 0))));
    
    // Fidelidade e Margem (Mais CPF e Menos Desconto Injustificado)
    const fidelidadeScore = Math.min(100, item.cpfRate);
    const margemScore = Math.max(0, 100 - (item.descontoPercent * 4));
    const fidelidadeMargemScore = (fidelidadeScore * 0.6 + margemScore * 0.4);

    const jScore = Number((
      metaPonderadaScore * 0.30 +
      produtividadeDiaScore * 0.25 +
      tkmScore * 0.15 +
      campanhasScore * 0.15 +
      fidelidadeMargemScore * 0.15
    ).toFixed(1));

    // Radar 6D Normalizado
    const radarDimensions = {
      produtividade: Number(normalizeMinMax(item.vendaPorDia, 0, maxVendaDia).toFixed(0)),
      profundidadeCesta: Number(normalizeMinMax(item.pa, 1.0, maxPA).toFixed(0)),
      ticketMedio: Number(normalizeMinMax(item.tkm, statsTKM.mean * 0.4, maxTKM).toFixed(0)),
      campanhas: Number(Math.min(100, item.slpPenetracaoRate * 2 + item.socialPenetracaoRate * 2.5).toFixed(0)),
      fidelidade: Number(Math.min(100, item.cpfRate).toFixed(0)),
      preservacaoMargem: Number(Math.max(0, Math.min(100, 100 - item.descontoPercent * 5 + (item.trocasPositivasCount > 0 ? 15 : 0))).toFixed(0))
    };

    // Detecção de Outliers (Z >= 1.25 ou Z <= -1.25)
    const outliers: Array<{
      metric: string;
      label: string;
      type: "positive" | "negative";
      zScore: number;
      explanation: string;
    }> = [];

    // Outlier PA
    if (zPA >= 1.25) {
      outliers.push({
        metric: "pa",
        label: "Super Cesta (+PA)",
        type: "positive",
        zScore: zPA,
        explanation: `PA de ${item.pa.toFixed(2)} está +${zPA.toFixed(1)}σ acima da média do time (${statsPA.mean.toFixed(2)}).`
      });
      positiveOutliers.push({ name: item.name, tag: "Super Cesta (+PA)", value: `${item.pa.toFixed(2)} PA`, metric: "PA" });
    } else if (zPA <= -1.25) {
      outliers.push({
        metric: "pa",
        label: "Gargalo de Cesta (-PA)",
        type: "negative",
        zScore: zPA,
        explanation: `PA de ${item.pa.toFixed(2)} está ${zPA.toFixed(1)}σ abaixo do padrão do time (${statsPA.mean.toFixed(2)}).`
      });
      negativeOutliers.push({ name: item.name, tag: "Gargalo de Cesta (-PA)", value: `${item.pa.toFixed(2)} PA`, metric: "PA" });
    }

    // Outlier TKM
    if (zTKM >= 1.25) {
      outliers.push({
        metric: "tkm",
        label: "Ticket de Alta Renda (+TKM)",
        type: "positive",
        zScore: zTKM,
        explanation: `TKM de R$ ${item.tkm.toFixed(2)} está +${zTKM.toFixed(1)}σ acima da média (${statsTKM.mean.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).`
      });
      positiveOutliers.push({ name: item.name, tag: "Ticket de Alta Renda", value: `R$ ${item.tkm.toFixed(2)}`, metric: "TKM" });
    } else if (zTKM <= -1.25) {
      outliers.push({
        metric: "tkm",
        label: "Ticket Reduzido (-TKM)",
        type: "negative",
        zScore: zTKM,
        explanation: `TKM de R$ ${item.tkm.toFixed(2)} está ${zTKM.toFixed(1)}σ abaixo da média da loja.`
      });
      negativeOutliers.push({ name: item.name, tag: "Ticket Reduzido", value: `R$ ${item.tkm.toFixed(2)}`, metric: "TKM" });
    }

    // Outlier Giro Diário
    if (zCuponsDia >= 1.25) {
      outliers.push({
        metric: "cuponsPorDia",
        label: "Trator de Balcão (+Giro)",
        type: "positive",
        zScore: zCuponsDia,
        explanation: `${item.cuponsPorDia.toFixed(1)} atendimentos/dia está +${zCuponsDia.toFixed(1)}σ acima da média do time.`
      });
      positiveOutliers.push({ name: item.name, tag: "Trator de Balcão (+Giro)", value: `${item.cuponsPorDia.toFixed(1)} cupons/dia`, metric: "Giro" });
    } else if (zCuponsDia <= -1.25) {
      outliers.push({
        metric: "cuponsPorDia",
        label: "Baixa Frequência (-Giro)",
        type: "negative",
        zScore: zCuponsDia,
        explanation: `${item.cuponsPorDia.toFixed(1)} atendimentos/dia está ${zCuponsDia.toFixed(1)}σ abaixo do ritmo da loja.`
      });
      negativeOutliers.push({ name: item.name, tag: "Baixa Frequência (-Giro)", value: `${item.cuponsPorDia.toFixed(1)} cupons/dia`, metric: "Giro" });
    }

    // Outlier SLP
    if (zSLP >= 1.25 && item.slpPenetracaoRate > 5) {
      outliers.push({
        metric: "slp",
        label: "Mestre de Sugestiva (+SLP)",
        type: "positive",
        zScore: zSLP,
        explanation: `Penetração de SLP em ${item.slpPenetracaoRate.toFixed(1)}% dos cupons (+${zSLP.toFixed(1)}σ acima da equipe).`
      });
      positiveOutliers.push({ name: item.name, tag: "Mestre de Sugestiva", value: `${item.slpPenetracaoRate.toFixed(1)}% SLP`, metric: "SLP" });
    }

    // Outlier Social
    if (zSocial >= 1.25 && item.socialPenetracaoRate > 5) {
      outliers.push({
        metric: "social",
        label: "Campeão Ação Social (+Social)",
        type: "positive",
        zScore: zSocial,
        explanation: `Penetração social de ${item.socialPenetracaoRate.toFixed(1)}% (+${zSocial.toFixed(1)}σ acima da equipe).`
      });
      positiveOutliers.push({ name: item.name, tag: "Campeão Social", value: `${item.socialPenetracaoRate.toFixed(1)}% Social`, metric: "Social" });
    }

    // Outlier CPF
    if (zCPF >= 1.25 && item.cpfRate > 60) {
      outliers.push({
        metric: "cpf",
        label: "Guardião de Cadastro (+CPF)",
        type: "positive",
        zScore: zCPF,
        explanation: `Taxa de CPF de ${item.cpfRate.toFixed(1)}% (+${zCPF.toFixed(1)}σ acima da média).`
      });
      positiveOutliers.push({ name: item.name, tag: "Guardião de Cadastro", value: `${item.cpfRate.toFixed(1)}% CPF`, metric: "CPF" });
    } else if (zCPF <= -1.25) {
      outliers.push({
        metric: "cpf",
        label: "Alerta de Cadastro (-CPF)",
        type: "negative",
        zScore: zCPF,
        explanation: `Taxa de CPF de ${item.cpfRate.toFixed(1)}% está ${zCPF.toFixed(1)}σ abaixo do time.`
      });
      negativeOutliers.push({ name: item.name, tag: "Alerta de Cadastro (-CPF)", value: `${item.cpfRate.toFixed(1)}% CPF`, metric: "CPF" });
    }

    // Outlier Desconto Excessivo
    if (zDesconto >= 1.25 && item.descontoPercent > 5) {
      outliers.push({
        metric: "desconto",
        label: "Alerta Margem (+Desconto)",
        type: "negative",
        zScore: zDesconto,
        explanation: `Concessão de desconto de ${item.descontoPercent.toFixed(1)}% (+${zDesconto.toFixed(1)}σ acima do padrão da equipe).`
      });
      negativeOutliers.push({ name: item.name, tag: "Desconto Excessivo", value: `${item.descontoPercent.toFixed(1)}% desc`, metric: "Margem" });
    }

    return {
      ...item,
      quadrantKey,
      quadrantName,
      quadrantDesc,
      quadrantBadgeClass,
      jScore,
      jScoreBreakdown: {
        metaPonderadaScore: Number(metaPonderadaScore.toFixed(1)),
        produtividadeDiaScore: Number(produtividadeDiaScore.toFixed(1)),
        tkmScore: Number(tkmScore.toFixed(1)),
        campanhasScore: Number(campanhasScore.toFixed(1)),
        fidelidadeMargemScore: Number(fidelidadeMargemScore.toFixed(1))
      },
      zScores: {
        pa: Number(zPA.toFixed(2)),
        tkm: Number(zTKM.toFixed(2)),
        vendaPorDia: Number(zVendaDia.toFixed(2)),
        cuponsPorDia: Number(zCuponsDia.toFixed(2)),
        cpfRate: Number(zCPF.toFixed(2)),
        slpRate: Number(zSLP.toFixed(2)),
        socialRate: Number(zSocial.toFixed(2)),
        descontoRate: Number(zDesconto.toFixed(2))
      },
      outliers,
      radarDimensions
    };
  });

  // Ordenar colaboradores por J-Score decrescente
  collaborators.sort((a, b) => b.jScore - a.jScore);

  teamMeans.jScore = Number((collaborators.reduce((acc, c) => acc + c.jScore, 0) / (collaborators.length || 1)).toFixed(1));

  return {
    collaborators,
    teamMeans,
    teamStdDevs,
    quadrantCounts,
    outliersSummary: {
      positiveOutliers,
      negativeOutliers
    }
  };
}
