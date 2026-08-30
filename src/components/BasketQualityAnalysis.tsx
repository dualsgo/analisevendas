"use client";

import React, { useState, useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { 
  computeFullBasketQualityReport,
  computePurgedBasketMetrics,
  computeBasketMetrics,
  BasketDiagnosticType,
  BasketQualityMetrics,
  TemporalDailyMetric,
  DayOfWeekMetric,
  CollaboratorBasketMetric,
  OutlierCoupon,
  PurgeConfig,
  BUCKET_DEFINITIONS
} from "@/lib/basket-quality-analytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  Cell, 
  ReferenceLine 
} from "recharts";
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  Layers, 
  ShoppingBag, 
  Users, 
  Calendar, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Search, 
  Calculator, 
  ArrowRight, 
  Zap, 
  Clock, 
  ShieldCheck,
  ChevronRight,
  Filter,
  BarChart3,
  CalendarDays,
  CalendarRange,
  Flame,
  FilterX,
  RefreshCw,
  Trophy,
  Activity,
  Dices,
  SlidersHorizontal,
  ChevronDown,
  Eye,
  Sliders,
  Check,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BasketQualityAnalysisProps {
  data: DetailedSaleRow[];
}

type TabType = 
  | "OVERVIEW" 
  | "PURGE_LAB"
  | "COLLABORATORS" 
  | "OUTLIERS"
  | "DAILY" 
  | "WEEKDAYS" 
  | "WEEKEND_VS_WEEKDAY" 
  | "WEEKLY" 
  | "SIMULATOR";

const BUCKET_COLORS = [
  "#ef4444", // 1 Item - Vermelho / Monopeça
  "#3b82f6", // 2 Itens - Azul / Conversão Ativa
  "#10b981", // 3 Itens - Verde Esmeralda / Cesta Profunda
  "#8b5cf6", // 4-5 Itens - Roxo / Alto Volume
  "#f59e0b", // 6-9 Itens - Âmbar / Super Cestas
  "#d946ef", // 10+ Itens - Magenta / Mega Cupons (Efeito Sorte)
];

const BUCKET_COLOR_MAP: Record<string, string> = {
  "1": "#ef4444",
  "2": "#3b82f6",
  "3": "#10b981",
  "4-5": "#8b5cf6",
  "6-9": "#f59e0b",
  "10+": "#d946ef"
};

const DIAGNOSTIC_COLORS = {
  PRODUTIVIDADE_SUSTENTADA: "border-emerald-500 bg-emerald-50 text-emerald-800",
  PA_INFLADO_CONCENTRACAO: "border-amber-500 bg-amber-50 text-amber-800",
  ALTA_DEPENDENCIA_MEGA_CUPONS: "border-purple-500 bg-purple-50 text-purple-900",
  BOA_CONVERSAO_BAIXA_PROFUNDIDADE: "border-blue-500 bg-blue-50 text-blue-800",
  BAIXA_CONVERSAO: "border-rose-500 bg-rose-50 text-rose-800",
  AMOSTRA_INSUFICIENTE: "border-slate-400 bg-slate-50 text-slate-700"
};

const DIAGNOSTIC_BADGES = {
  PRODUTIVIDADE_SUSTENTADA: "bg-emerald-500 text-white",
  PA_INFLADO_CONCENTRACAO: "bg-amber-500 text-white",
  ALTA_DEPENDENCIA_MEGA_CUPONS: "bg-purple-600 text-white",
  BOA_CONVERSAO_BAIXA_PROFUNDIDADE: "bg-blue-600 text-white",
  BAIXA_CONVERSAO: "bg-rose-500 text-white",
  AMOSTRA_INSUFICIENTE: "bg-slate-500 text-white"
};

export function BasketQualityAnalysis({ data }: BasketQualityAnalysisProps) {
  const [activeTab, setActiveTab] = useState<TabType>("OVERVIEW");
  
  // Filtros de Colaboradores
  const [colabSearch, setColabSearch] = useState("");
  const [colabProfileFilter, setColabProfileFilter] = useState<string>("ALL");
  const [selectedColab, setSelectedColab] = useState<string | null>(null);

  // Estados do Laboratório de Expurgo Interativo
  const [excludedBuckets, setExcludedBuckets] = useState<string[]>([]);
  const [maxCutoff, setMaxCutoff] = useState<number | null>(null);
  const [isCutoffActive, setIsCutoffActive] = useState<boolean>(false);
  const [cutoffSliderValue, setCutoffSliderValue] = useState<number>(5);
  const [excludedChaves, setExcludedChaves] = useState<string[]>([]);
  const [outlierSearch, setOutlierSearch] = useState("");

  // Simulador What-If de Conversão
  const [simConvert1to2, setSimConvert1to2] = useState(20); // % de cupons 1 item para converter em 2
  const [simConvert2to3, setSimConvert2to3] = useState(15); // % de cupons 2 itens para converter em 3

  // Processamento do Relatório Completo Oficial
  const report = useMemo(() => {
    return computeFullBasketQualityReport(data);
  }, [data]);

  const { 
    overall, 
    temporalScope, 
    dailyTrend, 
    daysOfWeek, 
    weekdayVsWeekend, 
    weeklyComparison, 
    collaborators, 
    topOutliers, 
    daysWithOutlierImpact 
  } = report;

  // Configuração atual de Expurgo
  const purgeConfig: PurgeConfig = useMemo(() => ({
    excludedBucketIds: excludedBuckets,
    maxItemsCutoff: isCutoffActive ? cutoffSliderValue : null,
    excludedChaves
  }), [excludedBuckets, isCutoffActive, cutoffSliderValue, excludedChaves]);

  // Simulação de Expurgo
  const purgeSimulation = useMemo(() => {
    return computePurgedBasketMetrics(data, purgeConfig, 10);
  }, [data, purgeConfig]);

  // Ações Rápidas de Expurgo
  const applyPresetPurge = (preset: "NONE" | "10_PLUS" | "6_PLUS" | "4_PLUS" | "1_ITEM") => {
    setExcludedChaves([]);
    setIsCutoffActive(false);
    if (preset === "NONE") {
      setExcludedBuckets([]);
    } else if (preset === "10_PLUS") {
      setExcludedBuckets(["10+"]);
    } else if (preset === "6_PLUS") {
      setExcludedBuckets(["6-9", "10+"]);
    } else if (preset === "4_PLUS") {
      setExcludedBuckets(["4-5", "6-9", "10+"]);
    } else if (preset === "1_ITEM") {
      setExcludedBuckets(["1"]);
    }
  };

  const toggleBucketExclusion = (bucketId: string) => {
    setExcludedBuckets(prev => 
      prev.includes(bucketId) 
        ? prev.filter(id => id !== bucketId) 
        : [...prev, bucketId]
    );
  };

  const toggleChaveExclusion = (chave: string) => {
    setExcludedChaves(prev => 
      prev.includes(chave) 
        ? prev.filter(c => c !== chave) 
        : [...prev, chave]
    );
  };

  const resetAllPurges = () => {
    setExcludedBuckets([]);
    setIsCutoffActive(false);
    setExcludedChaves([]);
  };

  // Filtragem de Colaboradores
  const filteredCollaborators = useMemo(() => {
    return collaborators.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(colabSearch.toLowerCase());
      const matchProfile = colabProfileFilter === "ALL" || c.profile === colabProfileFilter;
      return matchSearch && matchProfile;
    });
  }, [collaborators, colabSearch, colabProfileFilter]);

  // Colaborador Selecionado no Drilldown
  const activeColabMetric = useMemo(() => {
    if (!selectedColab) return null;
    return collaborators.find(c => c.name === selectedColab) || null;
  }, [collaborators, selectedColab]);

  // Filtragem de Outliers
  const filteredOutliers = useMemo(() => {
    return topOutliers.filter(o => {
      const matchSearch = 
        o.vendedor.toLowerCase().includes(outlierSearch.toLowerCase()) ||
        o.nf.includes(outlierSearch) ||
        o.itensSample.some(it => it.xProd.toLowerCase().includes(outlierSearch.toLowerCase()));
      return matchSearch;
    });
  }, [topOutliers, outlierSearch]);

  // Projeção do Simulador What-If
  const simulationResult = useMemo(() => {
    const totalC = overall.totalCupons;
    if (totalC === 0) return { newPA: 0, deltaPA: 0, newUnitRate: 0, addedPieces: 0, estimatedRevenue: 0 };

    const c1 = overall.unitCount;
    const c2 = overall.twoItemsCount;
    const currentPieces = overall.totalItens;
    const avgPricePerPiece = overall.totalItens > 0 ? overall.totalVenda / overall.totalItens : 45;

    // Conversão 1 -> 2 (+1 peça por cupom convertido)
    const convertedFrom1 = Math.round(c1 * (simConvert1to2 / 100));
    // Conversão 2 -> 3 (+1 peça por cupom convertido)
    const convertedFrom2 = Math.round(c2 * (simConvert2to3 / 100));

    const addedPieces = convertedFrom1 + convertedFrom2;
    const newTotalPieces = currentPieces + addedPieces;
    const newPA = newTotalPieces / totalC;
    const deltaPA = newPA - overall.paReal;

    const newC1 = c1 - convertedFrom1;
    const newUnitRate = (newC1 / totalC) * 100;
    const estimatedRevenue = addedPieces * avgPricePerPiece;

    return {
      newPA,
      deltaPA,
      newUnitRate,
      addedPieces,
      convertedFrom1,
      convertedFrom2,
      estimatedRevenue
    };
  }, [overall, simConvert1to2, simConvert2to3]);

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const hasActivePurge = excludedBuckets.length > 0 || isCutoffActive || excludedChaves.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 1. CABEÇALHO PEDAGÓGICO & DIAGNÓSTICO INTELIGENTE COM HEALTH SCORE */}
      <div className={cn(
        "rounded-3xl p-6 md:p-8 border-2 shadow-sm relative overflow-hidden transition-all",
        DIAGNOSTIC_COLORS[overall.diagnostic.type]
      )}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={cn(
                "px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm",
                DIAGNOSTIC_BADGES[overall.diagnostic.type]
              )}>
                {overall.diagnostic.badgeLabel}
              </span>
              <span className="text-xs font-bold text-slate-600 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                {temporalScope.totalDays === 1 
                  ? `Dia Único (${temporalScope.startDate.split("-").reverse().join("/")})` 
                  : `${temporalScope.totalDays} dias analisados (${temporalScope.startDate.split("-").reverse().join("/")} a ${temporalScope.endDate.split("-").reverse().join("/")})`
                }
              </span>
              <span className="text-xs font-bold text-slate-600 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                {overall.totalCupons} atendimentos
              </span>
              <span className="text-xs font-bold text-slate-600 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5">
                <Dices className="w-3.5 h-3.5 text-purple-600" />
                Vendas Atípicas (6+): <strong className={cn(overall.luckyRatio >= 18 ? "text-purple-700" : "text-slate-800")}>{overall.luckyRatio.toFixed(1)}% das peças</strong>
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
              <Target className="w-7 h-7 text-indigo-600 shrink-0" />
              {overall.diagnostic.title}
            </h1>
            <p className="text-sm text-slate-700 font-medium max-w-4xl leading-relaxed">
              {overall.diagnostic.description}
            </p>
          </div>

          {/* Cards de Health Score e Recomendação */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            {/* Índice de Sustentação de PA (Score 0-100) */}
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-64 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Índice de Sustentação
                </span>
                <Badge variant="outline" className={cn(
                  "text-[9px] font-black uppercase",
                  overall.sustainabilityIndex >= 75 ? "border-emerald-300 text-emerald-700 bg-emerald-50" :
                  overall.sustainabilityIndex >= 50 ? "border-amber-300 text-amber-700 bg-amber-50" :
                  "border-rose-300 text-rose-700 bg-rose-50"
                )}>
                  {overall.sustainabilityIndex >= 75 ? "Excelente" : overall.sustainabilityIndex >= 50 ? "Estável" : "Vulnerável"}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{overall.sustainabilityIndex}</span>
                <span className="text-xs font-bold text-slate-400">/ 100</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    overall.sustainabilityIndex >= 75 ? "bg-emerald-500" :
                    overall.sustainabilityIndex >= 50 ? "bg-amber-500" : "bg-rose-500"
                  )} 
                  style={{ width: `${overall.sustainabilityIndex}%` }} 
                />
              </div>
            </div>

            {/* Recomendação Tática */}
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-64 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Recomendação Tática
              </span>
              <p className="text-xs font-bold text-slate-800 leading-snug">
                {overall.diagnostic.recommendation}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GRID DE KPIS DE NÚCLEO, SUSTENTAÇÃO E CAUDA */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* PA REAL */}
        <Card className="ri-card bg-white p-4 flex flex-col justify-between border-slate-200">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">PA Real Oficial</span>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-black text-slate-900 tracking-tight">{overall.paReal.toFixed(2)}</p>
              <span className="text-xs font-bold text-slate-400">pçs/cup</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-100">
            {overall.totalItens} peças em {overall.totalCupons} cup.
          </p>
        </Card>

        {/* PA SUSTENTADO (SEM ANOMALIAS 6+) */}
        <Card className="ri-card bg-white p-4 flex flex-col justify-between border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">PA Sustentado</span>
              <Badge variant="outline" className="text-[8px] font-black uppercase border-emerald-300 text-emerald-700 bg-emerald-50">Sem 6+</Badge>
            </div>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-black text-emerald-600 tracking-tight">{overall.paOperacional1to5.toFixed(2)}</p>
              <span className="text-xs font-bold text-slate-400">pçs (1–5)</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Δ Vendas Isoladas:</span>
            <span className={cn("font-bold", (overall.paReal - overall.paOperacional1to5) >= 0.20 ? "text-purple-600" : "text-slate-600")}>
              +{(overall.paReal - overall.paOperacional1to5).toFixed(2)}
            </span>
          </p>
        </Card>

        {/* % 1 ITEM (MONOPEÇA - META <= 50%) */}
        <Card className="ri-card bg-white p-4 flex flex-col justify-between border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">% 1 Item</span>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[8px] font-black uppercase",
                  overall.unitRate <= 50 
                    ? "border-emerald-300 text-emerald-700 bg-emerald-50" 
                    : "border-rose-300 text-rose-700 bg-rose-50"
                )}
              >
                Meta ≤ 50%
              </Badge>
            </div>
            <div className="flex items-baseline gap-1.5">
              <p className={cn("text-3xl font-black tracking-tight", overall.unitRate <= 50 ? "text-emerald-600" : "text-rose-600")}>
                {overall.unitRate.toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>{overall.unitCount} cupons</span>
            <span className={overall.unitRate <= 50 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
              {overall.unitRate <= 50 ? "✓ No padrão" : "⚠ Acima do teto"}
            </span>
          </p>
        </Card>

        {/* % 2 ITENS (VENDA CASADA - META >= 30%) */}
        <Card className="ri-card bg-white p-4 flex flex-col justify-between border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">% 2 Itens</span>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[8px] font-black uppercase",
                  overall.twoItemsRate >= 30 
                    ? "border-emerald-300 text-emerald-700 bg-emerald-50" 
                    : "border-amber-300 text-amber-700 bg-amber-50"
                )}
              >
                Meta ≥ 30%
              </Badge>
            </div>
            <div className="flex items-baseline gap-1.5">
              <p className={cn("text-3xl font-black tracking-tight", overall.twoItemsRate >= 30 ? "text-emerald-600" : "text-amber-600")}>
                {overall.twoItemsRate.toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>{overall.twoItemsCount} cupons</span>
            <span className={overall.twoItemsRate >= 30 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
              {overall.twoItemsRate >= 30 ? "✓ No padrão" : "Abaixo do piso"}
            </span>
          </p>
        </Card>

        {/* % 3+ ITENS (SALDO PROFUNDIDADE) */}
        <Card className="ri-card bg-white p-4 flex flex-col justify-between border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">% 3+ Itens</span>
              <Badge variant="outline" className="text-[8px] font-black uppercase border-indigo-200 text-indigo-700 bg-indigo-50">
                Restante
              </Badge>
            </div>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-black text-indigo-600 tracking-tight">{overall.threePlusRate.toFixed(1)}%</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-100">
            3 pçs: {overall.threeItemsRate.toFixed(1)}% | 4+ pçs: {overall.deepCouponsRate.toFixed(1)}%
          </p>
        </Card>

        {/* MEGA VENDAS ISOLADAS (10+ ITENS) */}
        <Card className="ri-card bg-white p-4 flex flex-col justify-between border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Mega Vendas (10+)</span>
              <Badge variant="outline" className="text-[8px] font-black uppercase border-purple-300 text-purple-700 bg-purple-50">Outliers</Badge>
            </div>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-black text-purple-600 tracking-tight">{overall.tenPlusCount}</p>
              <span className="text-xs font-bold text-slate-400">cup ({overall.luckyRatio10Plus.toFixed(1)}% pçs)</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-100">
            {overall.piecesIn10Plus} peças em mega compras
          </p>
        </Card>
      </div>

      {/* 3. MENU DE NAVEGAÇÃO DE ABAS TEMPORAIS E VISÕES */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80">
        <TabButton 
          active={activeTab === "OVERVIEW"} 
          onClick={() => setActiveTab("OVERVIEW")} 
          icon={Layers} 
          label="Diagnóstico por Faixas" 
        />
        <TabButton 
          active={activeTab === "PURGE_LAB"} 
          onClick={() => setActiveTab("PURGE_LAB")} 
          icon={SlidersHorizontal} 
          label="Laboratório de Expurgo" 
          badge={hasActivePurge ? "Ativo" : undefined}
          badgeColor="bg-amber-500"
        />
        <TabButton 
          active={activeTab === "COLLABORATORS"} 
          onClick={() => setActiveTab("COLLABORATORS")} 
          icon={Users} 
          label={`Raio-X da Equipe (${collaborators.length})`} 
        />
        <TabButton 
          active={activeTab === "OUTLIERS"} 
          onClick={() => setActiveTab("OUTLIERS")} 
          icon={Flame} 
          label={`Dossiê de Mega Cupons (${topOutliers.length})`} 
        />
        {dailyTrend.length > 1 && (
          <TabButton 
            active={activeTab === "DAILY"} 
            onClick={() => setActiveTab("DAILY")} 
            icon={CalendarDays} 
            label={`Evolução Diária (${dailyTrend.length}d)`} 
            badge={daysWithOutlierImpact.length > 0 ? `${daysWithOutlierImpact.length}d c/ vendas isoladas` : undefined}
            badgeColor="bg-purple-600"
          />
        )}
        {daysOfWeek.some(d => d.totalDays > 0) && (
          <TabButton 
            active={activeTab === "WEEKDAYS"} 
            onClick={() => setActiveTab("WEEKDAYS")} 
            icon={Calendar} 
            label="Dias da Semana" 
          />
        )}
        {temporalScope.totalDays >= 3 && (
          <TabButton 
            active={activeTab === "WEEKEND_VS_WEEKDAY"} 
            onClick={() => setActiveTab("WEEKEND_VS_WEEKDAY")} 
            icon={Scale} 
            label="Úteis vs Fim de Semana" 
          />
        )}
        {weeklyComparison.length > 1 && (
          <TabButton 
            active={activeTab === "WEEKLY"} 
            onClick={() => setActiveTab("WEEKLY")} 
            icon={CalendarRange} 
            label={`Semana a Semana (${weeklyComparison.length} sem)`} 
          />
        )}
        <TabButton 
          active={activeTab === "SIMULATOR"} 
          onClick={() => setActiveTab("SIMULATOR")} 
          icon={Calculator} 
          label="Simulador What-If" 
        />
      </div>

      {/* 4. CONTEÚDO DAS ABAS */}

      {/* --- ABA 1: ESTRUTURA & DIAGNÓSTICO POR FAIXA (OVERVIEW) --- */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Histograma de Faixas */}
            <Card className="ri-card lg:col-span-2 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    Distribuição das 6 Faixas de Atendimento
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Meta ideal: 1 item ≤ 50%, 2 itens ≥ 30%, restante em 3 e 4+ itens com volume saudável.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-bold text-slate-700 w-fit">
                  {overall.totalCupons} cupons | {overall.totalItens} peças | {formatBRL(overall.totalVenda)}
                </Badge>
              </div>

              {/* Gráfico de Barras com Recharts */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overall.buckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        `${Number(value).toFixed(1)}%`, 
                        name === "rate" ? "% dos Cupons" : name === "piecesRate" ? "% das Peças" : "% da Receita"
                      ]}
                      labelFormatter={(label) => `Faixa: ${label}`}
                      contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px", fontWeight: 700 }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingTop: "10px" }} />
                    <Bar dataKey="rate" name="% dos Cupons" fill="#6366f1" radius={[6, 6, 0, 0]}>
                      {overall.buckets.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BUCKET_COLOR_MAP[entry.id] || "#6366f1"} />
                      ))}
                    </Bar>
                    <Bar dataKey="piecesRate" name="% das Peças" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="revenueRate" name="% da Receita" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Grid das 6 Faixas Estruturais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {overall.buckets.map((b) => (
                  <div key={b.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: BUCKET_COLOR_MAP[b.id] }} />
                        <p className="text-xs font-black text-slate-800 uppercase">{b.label}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[9px] font-black uppercase",
                          b.benchmarkStatus === "SUCCESS" ? "border-emerald-300 text-emerald-700 bg-emerald-50" :
                          b.benchmarkStatus === "WARNING" ? "border-amber-300 text-amber-700 bg-amber-50" :
                          b.benchmarkStatus === "CRITICAL" ? "border-rose-300 text-rose-700 bg-rose-50" :
                          "border-slate-200 text-slate-600 bg-white"
                        )}
                      >
                        {b.benchmarkLabel}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">% Cupons</span>
                        <p className="text-base font-black text-slate-900">{b.rate.toFixed(1)}%</p>
                        <span className="text-[9px] text-slate-500">({b.count} cup)</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">% Peças</span>
                        <p className="text-base font-black text-slate-900">{b.piecesRate.toFixed(1)}%</p>
                        <span className="text-[9px] text-slate-500">({b.pieces} pçs)</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">TKM</span>
                        <p className="text-xs font-black text-indigo-600 mt-1">{formatBRL(b.avgTicket)}</p>
                        <span className="text-[9px] text-slate-500">{formatBRL(b.avgPricePerPiece)}/pç</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-600 font-medium leading-tight pt-1 border-t border-slate-100">
                      {b.diagnostic}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Painel de Sustentação & Vendas Isoladas */}
            <Card className="ri-card p-6 space-y-5 flex flex-col justify-between">
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Flame className="w-5 h-5 text-indigo-600" />
                  Impacto de Vendas Isoladas vs Sustentação
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Audite o quanto os números da loja são sustentados pelo atendimento rotineiro vs vendas volumosas isoladas.
                </p>
              </div>

              <div className="space-y-4">
                {/* Mega Cupons 10+ */}
                <div className="bg-purple-50/80 p-4 rounded-2xl border border-purple-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-purple-900 uppercase flex items-center gap-1.5">
                      <Dices className="w-4 h-4 text-purple-600" />
                      Mega Vendas Isoladas (10+ Itens)
                    </span>
                    <Badge className="bg-purple-600 text-white text-[10px]">{overall.tenPlusCount} atendimentos</Badge>
                  </div>
                  <div className="flex justify-between items-baseline text-xs text-purple-900 font-bold">
                    <span>Peças geradas:</span>
                    <span className="text-sm font-black">{overall.piecesIn10Plus} pçs ({overall.luckyRatio10Plus.toFixed(1)}% do total)</span>
                  </div>
                  <div className="flex justify-between items-baseline text-xs text-purple-900 font-bold">
                    <span>Faturamento gerado:</span>
                    <span className="text-sm font-black">{formatBRL(overall.buckets.find(b => b.id === "10+")?.revenue || 0)}</span>
                  </div>
                  <p className="text-[10px] text-purple-700 font-medium pt-1 border-t border-purple-200">
                    Impacto isolado no PA da loja: <strong>+{((overall.buckets.find(b => b.id === "10+")?.paContribution) || 0).toFixed(2)} pontos</strong>
                  </p>
                </div>

                {/* Cauda 6 a 9 Itens */}
                <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-600" />
                      Super Cestas (6 a 9 Itens)
                    </span>
                    <Badge className="bg-amber-600 text-white text-[10px]">{overall.sixToNineCount} atendimentos</Badge>
                  </div>
                  <div className="flex justify-between items-baseline text-xs text-amber-900 font-bold">
                    <span>Peças geradas:</span>
                    <span className="text-sm font-black">{overall.piecesIn6Plus - overall.piecesIn10Plus} pçs ({overall.sixToNineRate.toFixed(1)}% dos cupons)</span>
                  </div>
                  <p className="text-[10px] text-amber-800 font-medium pt-1 border-t border-amber-200">
                    Impacto isolado no PA: <strong>+{((overall.buckets.find(b => b.id === "6-9")?.paContribution) || 0).toFixed(2)} pontos</strong>
                  </p>
                </div>

                {/* Núcleo Operacional 1 a 3 */}
                <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-emerald-900 uppercase flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Núcleo Operacional Base (1 a 3 Itens)
                    </span>
                    <Badge className="bg-emerald-600 text-white text-[10px]">{overall.cuponsIn1to3} cup</Badge>
                  </div>
                  <div className="flex justify-between items-baseline text-xs text-emerald-900 font-bold">
                    <span>PA Base da Operação:</span>
                    <span className="text-sm font-black">{overall.paOperacional1to3.toFixed(2)} peças/cupom</span>
                  </div>
                  <p className="text-[10px] text-emerald-700 font-medium pt-1 border-t border-emerald-200">
                    Responde por {((overall.cuponsIn1to3 / (overall.totalCupons || 1)) * 100).toFixed(1)}% do fluxo e {(overall.piecesIn1to3 / (overall.totalItens || 1) * 100).toFixed(1)}% das peças.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={() => setActiveTab("PURGE_LAB")} 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-2 shadow-sm"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Abrir Laboratório de Expurgo e Simulação
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* --- ABA 2: LABORATÓRIO DE EXPURGO & SIMULAÇÃO SEM ANOMALIAS (PURGE_LAB) --- */}
      {activeTab === "PURGE_LAB" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Painel de Controle de Expurgo */}
            <Card className="ri-card p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                    Controles de Expurgo
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Selecione quais faixas ou tetos de itens deseja remover para auditar a sustentação.
                  </p>
                </div>
                {hasActivePurge && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={resetAllPurges} 
                    className="h-8 text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Resetar
                  </Button>
                )}
              </div>

              {/* Botões de Ação Rápida */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Cenários Rápidos de 1 Clique
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant={excludedBuckets.length === 1 && excludedBuckets.includes("10+") ? "default" : "outline"}
                    onClick={() => applyPresetPurge("10_PLUS")}
                    className={cn("text-xs font-bold justify-start", excludedBuckets.includes("10+") && "bg-purple-600 text-white")}
                  >
                    <Dices className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                    Expurgar 10+ (Outliers)
                  </Button>
                  <Button
                    size="sm"
                    variant={excludedBuckets.includes("6-9") && excludedBuckets.includes("10+") ? "default" : "outline"}
                    onClick={() => applyPresetPurge("6_PLUS")}
                    className={cn("text-xs font-bold justify-start", excludedBuckets.includes("6-9") && "bg-amber-600 text-white")}
                  >
                    <Flame className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                    Expurgar 6+ (Atípicas)
                  </Button>
                  <Button
                    size="sm"
                    variant={excludedBuckets.includes("4-5") && excludedBuckets.includes("6-9") ? "default" : "outline"}
                    onClick={() => applyPresetPurge("4_PLUS")}
                    className={cn("text-xs font-bold justify-start", excludedBuckets.includes("4-5") && "bg-indigo-600 text-white")}
                  >
                    <Layers className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                    Isolar 1 a 3 (Base)
                  </Button>
                  <Button
                    size="sm"
                    variant={excludedBuckets.includes("1") ? "default" : "outline"}
                    onClick={() => applyPresetPurge("1_ITEM")}
                    className={cn("text-xs font-bold justify-start", excludedBuckets.includes("1") && "bg-rose-600 text-white")}
                  >
                    <FilterX className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                    Expurgar 1 Item
                  </Button>
                </div>
              </div>

              {/* Toggles por Faixa Individual */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Expurgo por Faixa Específica
                </span>
                <div className="space-y-2">
                  {BUCKET_DEFINITIONS.map(def => {
                    const isExcluded = excludedBuckets.includes(def.id);
                    const bMetrics = overall.buckets.find(b => b.id === def.id);
                    return (
                      <div 
                        key={def.id} 
                        onClick={() => toggleBucketExclusion(def.id)}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer",
                          isExcluded 
                            ? "bg-rose-50 border-rose-300 text-rose-900" 
                            : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/70 text-slate-800"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Checkbox checked={isExcluded} onCheckedChange={() => toggleBucketExclusion(def.id)} />
                          <div>
                            <span className="text-xs font-black">{def.label}</span>
                            <span className="text-[10px] text-slate-400 block">{def.rangeDescription}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={isExcluded ? "destructive" : "outline"} className="text-[9px] font-bold">
                            {isExcluded ? "EXPURGADO" : `${bMetrics?.count || 0} cup (${bMetrics?.rate.toFixed(1)}%)`}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Slider de Teto Máximo de Itens */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={isCutoffActive} onCheckedChange={setIsCutoffActive} />
                    <span className="text-xs font-bold text-slate-700">Teto Máximo de Peças</span>
                  </div>
                  {isCutoffActive && (
                    <Badge className="bg-indigo-600 text-white font-black text-xs">
                      Máx {cutoffSliderValue} peças
                    </Badge>
                  )}
                </div>

                {isCutoffActive && (
                  <div className="space-y-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                    <div className="flex justify-between text-[10px] font-bold text-indigo-900">
                      <span>Corte em: <strong>{cutoffSliderValue} peças</strong></span>
                      <span>Ignora cupons &gt; {cutoffSliderValue}</span>
                    </div>
                    <Slider
                      value={[cutoffSliderValue]}
                      min={2}
                      max={20}
                      step={1}
                      onValueChange={([val]) => setCutoffSliderValue(val)}
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* Painel Comparativo: Antes vs Depois do Expurgo */}
            <Card className="ri-card lg:col-span-2 p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <Scale className="w-5 h-5 text-indigo-600" />
                      Resultado do Expurgo: Original vs Sustentado
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Simulação do PA e faturamento após expurgar as anomalias selecionadas.
                    </p>
                  </div>
                  <Badge className={cn(
                    "text-xs font-black uppercase px-3 py-1",
                    purgeSimulation.luckyDependencyLevel === "CRÍTICA" ? "bg-purple-600 text-white" :
                    purgeSimulation.luckyDependencyLevel === "ALTA" ? "bg-amber-500 text-white" :
                    purgeSimulation.luckyDependencyLevel === "MODERADA" ? "bg-blue-600 text-white" :
                    "bg-emerald-600 text-white"
                  )}>
                    Dependência de Vendas Isoladas: {purgeSimulation.luckyDependencyLevel}
                  </Badge>
                </div>

                {/* Banner de Diagnóstico do Expurgo */}
                <div className={cn(
                  "p-4 rounded-2xl border text-xs font-bold leading-relaxed",
                  purgeSimulation.luckyDependencyLevel === "CRÍTICA" ? "bg-purple-50 border-purple-200 text-purple-900" :
                  purgeSimulation.luckyDependencyLevel === "ALTA" ? "bg-amber-50 border-amber-200 text-amber-900" :
                  "bg-slate-50 border-slate-200 text-slate-800"
                )}>
                  {purgeSimulation.diagnostic}
                </div>

                {/* Comparativo de Números-Chave */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* PA Original vs Sustentado */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400">PA Sustentado</span>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl sm:text-3xl font-black text-slate-900">
                        {purgeSimulation.purgedMetrics.paReal.toFixed(2)}
                      </p>
                      <span className={cn(
                        "text-xs font-bold",
                        purgeSimulation.deltaPA < 0 ? "text-rose-600" : "text-emerald-600"
                      )}>
                        {purgeSimulation.deltaPA > 0 ? `+${purgeSimulation.deltaPA.toFixed(2)}` : purgeSimulation.deltaPA.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">Original: {purgeSimulation.originalMetrics.paReal.toFixed(2)}</p>
                  </div>

                  {/* Cupons Mantidos vs Expurgados */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400">Cupons Retidos</span>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl sm:text-3xl font-black text-indigo-600">
                        {purgeSimulation.purgedMetrics.totalCupons}
                      </p>
                    </div>
                    <p className="text-[10px] text-rose-600 font-bold">
                      -{purgeSimulation.purgedCouponsCount} expurgados ({purgeSimulation.purgedCouponsRate.toFixed(1)}%)
                    </p>
                  </div>

                  {/* Peças Mantidas vs Expurgadas */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400">Peças Retidas</span>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl sm:text-3xl font-black text-emerald-600">
                        {purgeSimulation.purgedMetrics.totalItens}
                      </p>
                    </div>
                    <p className="text-[10px] text-rose-600 font-bold">
                      -{purgeSimulation.purgedPiecesCount} expurgadas ({purgeSimulation.purgedPiecesRate.toFixed(1)}%)
                    </p>
                  </div>

                  {/* Faturamento Retido vs Expurgado */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400">Receita Retida</span>
                    <p className="text-lg sm:text-xl font-black text-slate-900">
                      {formatBRL(purgeSimulation.purgedMetrics.totalVenda)}
                    </p>
                    <p className="text-[10px] text-rose-600 font-bold">
                      -{formatBRL(purgeSimulation.purgedRevenue)} ({purgeSimulation.purgedRevenueRate.toFixed(1)}%)
                    </p>
                  </div>
                </div>

                {/* Tabela Resumo do Cenário Simulado sem Mediana */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="h-9">
                        <TableHead className="text-[10px] font-black uppercase text-slate-600">Métrica</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Original (Total)</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Sustentado (Expurgado)</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Diferença (Δ)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="h-10 hover:bg-slate-50">
                        <TableCell className="font-bold text-xs text-slate-800">PA Real (Peças/Cupom)</TableCell>
                        <TableCell className="text-center font-bold text-slate-700">{purgeSimulation.originalMetrics.paReal.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-black text-indigo-600">{purgeSimulation.purgedMetrics.paReal.toFixed(2)}</TableCell>
                        <TableCell className={cn("text-center font-black text-xs", purgeSimulation.deltaPA < 0 ? "text-rose-600" : "text-emerald-600")}>
                          {purgeSimulation.deltaPA > 0 ? `+${purgeSimulation.deltaPA.toFixed(2)}` : purgeSimulation.deltaPA.toFixed(2)} ({purgeSimulation.pctPADiff.toFixed(1)}%)
                        </TableCell>
                      </TableRow>
                      <TableRow className="h-10 hover:bg-slate-50">
                        <TableCell className="font-bold text-xs text-slate-800">% Cupons 1 Item (Monopeça - Meta ≤50%)</TableCell>
                        <TableCell className="text-center font-bold text-rose-600">{purgeSimulation.originalMetrics.unitRate.toFixed(1)}%</TableCell>
                        <TableCell className="text-center font-black text-rose-600">{purgeSimulation.purgedMetrics.unitRate.toFixed(1)}%</TableCell>
                        <TableCell className="text-center font-bold text-xs text-slate-600">
                          {(purgeSimulation.purgedMetrics.unitRate - purgeSimulation.originalMetrics.unitRate).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                      <TableRow className="h-10 hover:bg-slate-50">
                        <TableCell className="font-bold text-xs text-slate-800">% Cupons 2 Itens (Venda Casada - Meta ≥30%)</TableCell>
                        <TableCell className="text-center font-bold text-emerald-600">{purgeSimulation.originalMetrics.twoItemsRate.toFixed(1)}%</TableCell>
                        <TableCell className="text-center font-black text-emerald-600">{purgeSimulation.purgedMetrics.twoItemsRate.toFixed(1)}%</TableCell>
                        <TableCell className="text-center font-bold text-xs text-slate-600">
                          {(purgeSimulation.purgedMetrics.twoItemsRate - purgeSimulation.originalMetrics.twoItemsRate).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                      <TableRow className="h-10 hover:bg-slate-50">
                        <TableCell className="font-bold text-xs text-slate-800">% Cupons 3+ Itens (Cesta Profunda)</TableCell>
                        <TableCell className="text-center font-bold text-indigo-600">{purgeSimulation.originalMetrics.threePlusRate.toFixed(1)}%</TableCell>
                        <TableCell className="text-center font-black text-indigo-600">{purgeSimulation.purgedMetrics.threePlusRate.toFixed(1)}%</TableCell>
                        <TableCell className="text-center font-bold text-xs text-slate-600">
                          {(purgeSimulation.purgedMetrics.threePlusRate - purgeSimulation.originalMetrics.threePlusRate).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                      <TableRow className="h-10 hover:bg-slate-50">
                        <TableCell className="font-bold text-xs text-slate-800">Ticket Médio (TKM)</TableCell>
                        <TableCell className="text-center font-bold text-slate-700">{formatBRL(purgeSimulation.originalMetrics.tkm)}</TableCell>
                        <TableCell className="text-center font-black text-slate-900">{formatBRL(purgeSimulation.purgedMetrics.tkm)}</TableCell>
                        <TableCell className="text-center font-bold text-xs text-slate-600">
                          {formatBRL(purgeSimulation.purgedMetrics.tkm - purgeSimulation.originalMetrics.tkm)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {hasActivePurge && (
                <div className="pt-2">
                  <p className="text-[11px] text-slate-500 font-medium italic">
                    💡 Dica: Você pode alternar para a aba <strong>Raio-X da Equipe</strong> para ver a comparação de cada vendedor individualmente com e sem as anomalias.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* --- ABA 3: RAIO-X DOS COLABORADORES (COLLABORATORS) --- */}
      {activeTab === "COLLABORATORS" && (
        <div className="space-y-6">
          <Card className="ri-card p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Raio-X de Sustentação & Vendas Isoladas por Colaborador
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Compare o PA Real oficial vs o PA Sustentado (sem mega vendas 6+) e acompanhe a conformidade das metas de 1 item (≤ 50%) e 2 itens (≥ 30%).
                </p>
              </div>

              {/* Filtros e Busca */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-60">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input 
                    placeholder="Buscar vendedor..." 
                    className="pl-9 h-9 text-xs rounded-xl border-slate-200" 
                    value={colabSearch} 
                    onChange={e => setColabSearch(e.target.value)} 
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Button 
                    size="sm" 
                    variant={colabProfileFilter === "ALL" ? "default" : "outline"} 
                    onClick={() => setColabProfileFilter("ALL")}
                    className="h-8 text-[11px] font-bold rounded-lg"
                  >
                    Todos
                  </Button>
                  <Button 
                    size="sm" 
                    variant={colabProfileFilter === "CONSISTENTE" ? "default" : "outline"} 
                    onClick={() => setColabProfileFilter("CONSISTENTE")}
                    className="h-8 text-[11px] font-bold rounded-lg text-emerald-700"
                  >
                    Consistentes
                  </Button>
                  <Button 
                    size="sm" 
                    variant={colabProfileFilter === "DEPENDENTE_MEGA_VENDA" ? "default" : "outline"} 
                    onClick={() => setColabProfileFilter("DEPENDENTE_MEGA_VENDA")}
                    className="h-8 text-[11px] font-bold rounded-lg text-purple-700"
                  >
                    Vendas Atípicas
                  </Button>
                  <Button 
                    size="sm" 
                    variant={colabProfileFilter === "MONOPECA_BALCAO" ? "default" : "outline"} 
                    onClick={() => setColabProfileFilter("MONOPECA_BALCAO")}
                    className="h-8 text-[11px] font-bold rounded-lg text-rose-700"
                  >
                    Monopeça
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabela de Colaboradores com Metas e Vendas Isoladas */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-10">
                    <TableHead className="text-[10px] font-black uppercase text-slate-600">Colaborador</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Cupons</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">PA Real (Oficial)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-emerald-700 text-center">PA Sustentado (Sem 6+)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-purple-700 text-center">Δ Vendas Isoladas</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 1 Item (≤50%)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 2 Itens (≥30%)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 3+ Itens</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Maior Cupom</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Perfil Comportamental</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCollaborators.map(c => (
                    <TableRow 
                      key={c.name} 
                      className={cn(
                        "h-12 hover:bg-slate-50/80 cursor-pointer transition-colors",
                        selectedColab === c.name && "bg-indigo-50/50"
                      )} 
                      onClick={() => setSelectedColab(selectedColab === c.name ? null : c.name)}
                    >
                      <TableCell className="font-black text-slate-900 uppercase text-xs">
                        <div className="flex items-center gap-1.5">
                          {selectedColab === c.name && <ChevronDown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                          <span>{c.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{c.totalCupons}</TableCell>
                      <TableCell className="text-center font-black text-slate-900 text-sm">{c.paReal.toFixed(2)}</TableCell>
                      <TableCell className="text-center font-black text-emerald-700 bg-emerald-50/50 text-sm">
                        {c.paSustentadoSemAnomalias.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center font-black text-purple-700">
                        {c.deltaSorte >= 0.20 ? (
                          <Badge className="bg-purple-600 text-white text-[9px] font-black">
                            +{c.deltaSorte.toFixed(2)} ({c.luckySharePercent.toFixed(0)}% pçs)
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-xs font-bold">+{c.deltaSorte.toFixed(2)}</span>
                        )}
                      </TableCell>
                      <TableCell className={cn("text-center font-bold text-xs", c.unitRate <= 50 ? "text-emerald-700 font-black" : "text-rose-600")}>
                        {c.unitRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className={cn("text-center font-bold text-xs", c.twoItemsRate >= 30 ? "text-emerald-700 font-black" : "text-amber-600")}>
                        {c.twoItemsRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center font-bold text-indigo-600 text-xs">
                        {c.threePlusRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700">
                        {c.topSaleItemCount > 0 ? (
                          <span className={cn(c.topSaleItemCount >= 10 ? "font-black text-purple-600" : "font-medium text-slate-600")}>
                            {c.topSaleItemCount} pçs
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[9px] font-bold uppercase shadow-sm", c.profileBadgeColor)}>
                          {c.profileLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Drilldown do Colaborador Selecionado */}
            {activeColabMetric && (
              <div className="bg-slate-50/80 p-6 rounded-3xl border border-indigo-200 space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm uppercase">
                      {activeColabMetric.name.substring(0, 2)}
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                        {activeColabMetric.name}
                        <Badge className={cn("text-[9px] font-bold uppercase", activeColabMetric.profileBadgeColor)}>
                          {activeColabMetric.profileLabel}
                        </Badge>
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {activeColabMetric.totalCupons} cupons | {activeColabMetric.totalItens} peças | TKM: {formatBRL(activeColabMetric.tkm)}
                      </p>
                    </div>
                  </div>

                  <Button size="sm" variant="ghost" onClick={() => setSelectedColab(null)} className="h-7 text-xs text-slate-500">
                    Fechar detalhes
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {activeColabMetric.buckets.map(b => (
                    <div key={b.id} className="bg-white p-3 rounded-xl border border-slate-200 text-center space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: BUCKET_COLOR_MAP[b.id] }} />
                        <span className="text-[10px] font-black uppercase text-slate-700">{b.label}</span>
                      </div>
                      <p className="text-lg font-black text-slate-900">{b.rate.toFixed(1)}%</p>
                      <span className="text-[9px] text-slate-400 font-bold">{b.count} cup ({b.pieces} pçs)</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-slate-600 font-medium">
                  {activeColabMetric.diagnostic.description} <strong>Recomendação:</strong> {activeColabMetric.diagnostic.recommendation}
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* --- ABA 4: DOSSIÊ DE MEGA CUPONS / OUTLIERS (OUTLIERS) --- */}
      {activeTab === "OUTLIERS" && (
        <div className="space-y-6">
          <Card className="ri-card p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Flame className="w-5 h-5 text-purple-600" />
                  Dossiê de Mega Cupons & Vendas Anômalas (6+ e 10+ Itens)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Investigue os cupons individuais que geraram maior distorção no PA da loja e teste o expurgo pontual de cada um.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input 
                  placeholder="Buscar cupom, vendedor, item..." 
                  className="pl-9 h-9 text-xs rounded-xl border-slate-200" 
                  value={outlierSearch} 
                  onChange={e => setOutlierSearch(e.target.value)} 
                />
              </div>
            </div>

            {filteredOutliers.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-black uppercase text-slate-800">Nenhum Mega Cupom Detectado</h4>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                  Não foram encontradas vendas com 6 ou mais itens no período selecionado. A produção da loja é 100% orgânica.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredOutliers.map(outlier => {
                    const isIndividuallyExcluded = excludedChaves.includes(outlier.chave);
                    return (
                      <div 
                        key={outlier.chave}
                        className={cn(
                          "p-4 rounded-2xl border transition-all space-y-3",
                          isIndividuallyExcluded 
                            ? "bg-rose-50/60 border-rose-200 opacity-60" 
                            : outlier.itens_qtd >= 10 
                              ? "bg-purple-50/50 border-purple-200 shadow-sm" 
                              : "bg-white border-slate-200 shadow-sm"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase",
                              outlier.classification === "MEGA_ANOMALIA" ? "bg-purple-600 text-white" : "bg-amber-500 text-white"
                            )}>
                              {outlier.itens_qtd} Peças
                            </span>
                            <span className="text-xs font-black text-slate-900">{formatBRL(outlier.vNF)}</span>
                          </div>
                          <Button
                            size="sm"
                            variant={isIndividuallyExcluded ? "default" : "outline"}
                            onClick={() => toggleChaveExclusion(outlier.chave)}
                            className={cn(
                              "h-7 text-[10px] font-bold px-2 rounded-lg",
                              isIndividuallyExcluded ? "bg-rose-600 hover:bg-rose-700 text-white" : "text-slate-600 hover:text-rose-600"
                            )}
                          >
                            {isIndividuallyExcluded ? "Expurgado" : "Expurgar Cupom"}
                          </Button>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between text-slate-700">
                            <span className="font-bold">Vendedor:</span>
                            <span className="font-black uppercase text-slate-900">{outlier.vendedor}</span>
                          </div>
                          <div className="flex justify-between text-slate-700">
                            <span className="font-bold">Data / Hora:</span>
                            <span className="text-slate-500">{outlier.dateLabel} às {outlier.timeLabel}</span>
                          </div>
                          <div className="flex justify-between text-slate-700">
                            <span className="font-bold">Impacto no PA da Loja:</span>
                            <span className="font-black text-purple-700">+{outlier.paImpactOnTotal.toFixed(3)} PA</span>
                          </div>
                        </div>

                        {/* Amostra de Produtos */}
                        {outlier.itensSample.length > 0 && (
                          <div className="bg-white/80 p-2.5 rounded-xl border border-slate-100 space-y-1">
                            <span className="text-[9px] font-black uppercase text-slate-400 block">Itens Comprados:</span>
                            <div className="space-y-0.5 max-h-24 overflow-y-auto pr-1">
                              {outlier.itensSample.map((it, idx) => (
                                <div key={idx} className="flex justify-between text-[10px] text-slate-700">
                                  <span className="truncate max-w-[160px] font-medium">{it.qCom}x {it.xProd}</span>
                                  <span className="font-bold shrink-0">{formatBRL(it.vProd)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* --- ABA 5: EVOLUÇÃO DIÁRIA & IMPACTO DE VENDAS ISOLADAS (DAILY) --- */}
      {activeTab === "DAILY" && (
        <div className="space-y-6">
          <Card className="ri-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-indigo-600" />
                  Evolução Temporal do PA: Real vs Sustentado (Dia a Dia)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Acompanhe a consistência diária da equipe e audite o impacto exato de vendas isoladas que inflaram o PA de cada dia.
                </p>
              </div>
            </div>

            {/* Gráfico de Linhas Temporal Comparativo sem Mediana */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} domain={[1, 'auto']} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    formatter={(val: any, name: string) => [
                      name.includes("%") ? `${Number(val).toFixed(1)}%` : Number(val).toFixed(2),
                      name
                    ]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px", fontWeight: 700 }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingTop: "10px" }} />
                  <Line yAxisId="left" type="monotone" dataKey="paReal" name="PA Real Oficial" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line yAxisId="left" type="monotone" dataKey="paWithoutOutliers" name="PA Sustentado (Sem 6+)" stroke="#10b981" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="unitRate" name="% Cupons 1 Item (Meta ≤50%)" stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="twoItemsRate" name="% Cupons 2 Itens (Meta ≥30%)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela Dia a Dia com Detalhamento Técnico das Vendas Isoladas */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-10">
                    <TableHead className="text-[10px] font-black uppercase text-slate-600">Data / Dia</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Cupons</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">PA Real</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-emerald-700 text-center">PA Sustentado</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 1 Item (≤50%)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 2 Itens (≥30%)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 3+ Itens</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-purple-700">Distorção por Vendas Isoladas</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Diagnóstico do Dia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyTrend.map(d => (
                    <TableRow key={d.date} className={cn("h-14 hover:bg-slate-50/80", d.hasIsolatedOutlierImpact && "bg-purple-50/40")}>
                      <TableCell className="font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2.5 h-2.5 rounded-full",
                            d.hasIsolatedOutlierImpact ? "bg-purple-600 animate-pulse" : d.isWeekendDay ? "bg-amber-500" : "bg-indigo-500"
                          )} />
                          <div>
                            <span className="font-black text-xs text-slate-900">{d.dayLabel}</span>
                            <span className="text-[10px] text-slate-400 font-normal ml-1">({d.weekdayShort})</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{d.totalCupons}</TableCell>
                      <TableCell className="text-center font-black text-slate-900 text-sm">{d.paReal.toFixed(2)}</TableCell>
                      <TableCell className="text-center font-black text-emerald-700 text-sm">
                        {(d.paWithoutOutliers || d.paReal).toFixed(2)}
                      </TableCell>
                      <TableCell className={cn("text-center font-bold text-xs", d.unitRate <= 50 ? "text-emerald-700 font-black" : "text-rose-600")}>
                        {d.unitRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className={cn("text-center font-bold text-xs", d.twoItemsRate >= 30 ? "text-emerald-700 font-black" : "text-amber-600")}>
                        {d.twoItemsRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center font-bold text-indigo-600 text-xs">
                        {d.threePlusRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {d.hasIsolatedOutlierImpact ? (
                          <div className="space-y-1 py-1">
                            <div className="flex items-center gap-1.5">
                              <Badge className="bg-purple-600 text-white text-[9px] font-black uppercase">
                                +{d.isolatedSalesPaDelta.toFixed(2)} PA ({d.isolatedOutliersCount} venda{d.isolatedOutliersCount > 1 ? "s" : ""})
                              </Badge>
                            </div>
                            <p className="text-[10px] text-purple-950 font-medium leading-snug">
                              {d.technicalExplanation}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">Produção Orgânica</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[9px] font-bold uppercase", DIAGNOSTIC_BADGES[d.diagnostic.type])}>
                          {d.diagnostic.badgeLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* --- ABA 6: DIAS DA SEMANA (WEEKDAYS) --- */}
      {activeTab === "WEEKDAYS" && (
        <div className="space-y-6">
          <Card className="ri-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  Perfil de Cesta por Dia da Semana (Segunda a Domingo)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Descubra em quais dias a equipe converte melhor a venda casada e onde os cupons de 1 item mais pesam.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              {daysOfWeek.map(dow => {
                const hasData = dow.totalDays > 0;
                return (
                  <Card key={dow.dayIndex} className={cn(
                    "p-4 border text-center space-y-2 relative overflow-hidden",
                    hasData ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-100 opacity-50"
                  )}>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-xs font-black uppercase text-slate-800">{dow.dayShort}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{dow.totalDays}d</span>
                    </div>

                    {hasData ? (
                      <div className="space-y-1.5 pt-1">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">PA Real</span>
                          <p className="text-xl font-black text-slate-900">{dow.metrics.paReal.toFixed(2)}</p>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-600 font-bold pt-1 border-t border-slate-50">
                          <span>Sustentado:</span>
                          <span className="text-emerald-600 font-black">{dow.metrics.paOperacional1to5.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-600 font-bold">
                          <span>% 1 Item:</span>
                          <span className={cn(dow.metrics.unitRate <= 50 ? "text-emerald-600" : "text-rose-600")}>
                            {dow.metrics.unitRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-600 font-bold">
                          <span>% 2 Itens:</span>
                          <span className={cn(dow.metrics.twoItemsRate >= 30 ? "text-emerald-600 font-black" : "text-amber-600")}>
                            {dow.metrics.twoItemsRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="pt-2">
                          <Badge className={cn("text-[8px] font-bold uppercase w-full justify-center py-0.5", DIAGNOSTIC_BADGES[dow.metrics.diagnostic.type])}>
                            {dow.metrics.diagnostic.badgeLabel}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-6">Sem dados</p>
                    )}
                  </Card>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* --- ABA 7: DIAS ÚTEIS VS FIM DE SEMANA (WEEKEND_VS_WEEKDAY) --- */}
      {activeTab === "WEEKEND_VS_WEEKDAY" && (
        <div className="space-y-6">
          <Card className="ri-card p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-600" />
                Comparativo: Dias Úteis (Seg–Sex) vs. Fim de Semana (Sáb–Dom)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Avalie como o perfil de compra do cliente e a profundidade de atendimento mudam no fim de semana.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DIAS ÚTEIS */}
              <div className="bg-slate-50/80 p-6 rounded-3xl border border-slate-200 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    <h4 className="text-base font-black uppercase text-slate-800">Dias Úteis (Seg–Sex)</h4>
                  </div>
                  <Badge variant="outline" className="font-bold">{weekdayVsWeekend.weekdays.totalCupons} cupons</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">PA Real</span>
                    <p className="text-xl font-black text-slate-900">{weekdayVsWeekend.weekdays.paReal.toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">PA Sustentado</span>
                    <p className="text-xl font-black text-emerald-600">{weekdayVsWeekend.weekdays.paOperacional1to5.toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">% 1 Item</span>
                    <p className={cn("text-xl font-black", weekdayVsWeekend.weekdays.unitRate <= 50 ? "text-emerald-600" : "text-rose-600")}>
                      {weekdayVsWeekend.weekdays.unitRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">% 2 Itens</span>
                    <p className={cn("text-xl font-black", weekdayVsWeekend.weekdays.twoItemsRate >= 30 ? "text-emerald-600" : "text-amber-600")}>
                      {weekdayVsWeekend.weekdays.twoItemsRate.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 text-xs font-bold text-slate-700">
                  <div className="flex justify-between">
                    <span>Taxa de Cesta Profunda (3+ Itens):</span>
                    <span className="text-indigo-600 font-black">{weekdayVsWeekend.weekdays.threePlusRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vendas Atípicas (6+ Itens):</span>
                    <span className="text-purple-600 font-black">{weekdayVsWeekend.weekdays.luckyRatio.toFixed(1)}% das peças</span>
                  </div>
                </div>

                <Badge className={cn("text-xs font-bold uppercase w-full justify-center py-1.5", DIAGNOSTIC_BADGES[weekdayVsWeekend.weekdays.diagnostic.type])}>
                  {weekdayVsWeekend.weekdays.diagnostic.title}
                </Badge>
              </div>

              {/* FIM DE SEMANA */}
              <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-200/80 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <h4 className="text-base font-black uppercase text-amber-950">Fim de Semana (Sáb–Dom)</h4>
                  </div>
                  <Badge variant="outline" className="font-bold border-amber-200">{weekdayVsWeekend.weekends.totalCupons} cupons</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">PA Real</span>
                    <p className="text-xl font-black text-amber-950">{weekdayVsWeekend.weekends.paReal.toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">PA Sustentado</span>
                    <p className="text-xl font-black text-emerald-600">{weekdayVsWeekend.weekends.paOperacional1to5.toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">% 1 Item</span>
                    <p className={cn("text-xl font-black", weekdayVsWeekend.weekends.unitRate <= 50 ? "text-emerald-600" : "text-rose-600")}>
                      {weekdayVsWeekend.weekends.unitRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">% 2 Itens</span>
                    <p className={cn("text-xl font-black", weekdayVsWeekend.weekends.twoItemsRate >= 30 ? "text-emerald-600" : "text-amber-600")}>
                      {weekdayVsWeekend.weekends.twoItemsRate.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 text-xs font-bold text-slate-700">
                  <div className="flex justify-between">
                    <span>Taxa de Cesta Profunda (3+ Itens):</span>
                    <span className="text-indigo-600 font-black">{weekdayVsWeekend.weekends.threePlusRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vendas Atípicas (6+ Itens):</span>
                    <span className="text-purple-600 font-black">{weekdayVsWeekend.weekends.luckyRatio.toFixed(1)}% das peças</span>
                  </div>
                </div>

                <Badge className={cn("text-xs font-bold uppercase w-full justify-center py-1.5", DIAGNOSTIC_BADGES[weekdayVsWeekend.weekends.diagnostic.type])}>
                  {weekdayVsWeekend.weekends.diagnostic.title}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* --- ABA 8: SEMANA A SEMANA (WEEKLY) --- */}
      {activeTab === "WEEKLY" && (
        <div className="space-y-6">
          <Card className="ri-card p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-indigo-600" />
                Comparativo Semana a Semana (Week-over-Week)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Evolução da conversão de cesta e sustentação ao longo das semanas do período.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {weeklyComparison.map(w => (
                <Card key={w.weekKey} className="p-5 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-sm font-black uppercase text-slate-800">{w.weekKey}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{w.dateRangeLabel}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-500 font-bold">PA Real:</span>
                      <span className="text-xl font-black text-slate-900">{w.metrics.paReal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-500 font-bold">PA Sustentado:</span>
                      <span className="text-sm font-black text-emerald-600">{w.metrics.paOperacional1to5.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-500 font-bold">% 1 Item:</span>
                      <span className="text-sm font-black text-rose-600">{w.metrics.unitRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-500 font-bold">% 2+ Itens:</span>
                      <span className="text-sm font-black text-emerald-600">{w.metrics.multiCouponsRate.toFixed(1)}%</span>
                    </div>
                  </div>

                  <Badge className={cn("text-[9px] font-bold uppercase w-full justify-center py-1", DIAGNOSTIC_BADGES[w.metrics.diagnostic.type])}>
                    {w.metrics.diagnostic.badgeLabel}
                  </Badge>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* --- ABA 9: SIMULADOR TÁTICO WHAT-IF (SIMULATOR) --- */}
      {activeTab === "SIMULATOR" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Controles de Simulação */}
            <Card className="ri-card p-6 space-y-8">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-indigo-600" />
                  Alavancas Táticas de Conversão
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Simule o impacto no PA e na receita ao converter cupons unitários em adicionais.
                </p>
              </div>

              {/* Slider 1: Converter 1 item -> 2 itens */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-slate-700">
                    Converter [1 Item] para [2 Itens]
                  </span>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    {simConvert1to2}% ({simulationResult.convertedFrom1} cupons)
                  </span>
                </div>
                <Slider 
                  value={[simConvert1to2]} 
                  min={0} 
                  max={50} 
                  step={5} 
                  onValueChange={([v]) => setSimConvert1to2(v)} 
                />
                <p className="text-[11px] text-slate-400 font-medium">
                  Hoje a loja tem {overall.unitCount} cupons com 1 item ({overall.unitRate.toFixed(1)}%).
                </p>
              </div>

              {/* Slider 2: Converter 2 itens -> 3 itens */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-slate-700">
                    Converter [2 Itens] para [3 Itens]
                  </span>
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                    {simConvert2to3}% ({simulationResult.convertedFrom2} cupons)
                  </span>
                </div>
                <Slider 
                  value={[simConvert2to3]} 
                  min={0} 
                  max={50} 
                  step={5} 
                  onValueChange={([v]) => setSimConvert2to3(v)} 
                />
                <p className="text-[11px] text-slate-400 font-medium">
                  Hoje a loja tem {overall.twoItemsCount} cupons com 2 itens ({overall.twoItemsRate.toFixed(1)}%).
                </p>
              </div>
            </Card>

            {/* Resultado da Projeção */}
            <Card className="ri-card bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-8 border-none shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                  Projeção de Impacto Tático
                </span>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[10px] font-bold text-slate-300 uppercase">Novo PA Projetado</span>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-black text-white">{simulationResult.newPA.toFixed(2)}</p>
                      <span className="text-xs font-bold text-emerald-400">
                        +{simulationResult.deltaPA.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">Atual: {overall.paReal.toFixed(2)}</p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[10px] font-bold text-slate-300 uppercase">Nova Taxa de 1 Item</span>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-black text-white">{simulationResult.newUnitRate.toFixed(1)}%</p>
                      <span className="text-xs font-bold text-emerald-400">
                        -{(overall.unitRate - simulationResult.newUnitRate).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">Atual: {overall.unitRate.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="bg-emerald-500/20 border border-emerald-500/30 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Receita Adicional Estimada</span>
                  <p className="text-2xl md:text-3xl font-black text-emerald-400">
                    +{formatBRL(simulationResult.estimatedRevenue)}
                  </p>
                  <p className="text-xs text-emerald-200/80 font-medium">
                    +{simulationResult.addedPieces} peças a mais vendidas pela equipe.
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-medium italic">
                * Simulação baseada no ticket médio por peça atual da loja ({formatBRL(overall.totalItens > 0 ? overall.totalVenda / overall.totalItens : 45)}).
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ 
  active, 
  onClick, 
  icon: Icon, 
  label,
  badge,
  badgeColor = "bg-indigo-600"
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: any; 
  label: string; 
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "text-xs font-bold rounded-xl h-8 px-3.5 transition-all flex items-center gap-1.5 shrink-0",
        active 
          ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:text-white" 
          : "text-slate-600 hover:text-slate-900 hover:bg-white"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      {badge && (
        <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full text-white ml-1", badgeColor)}>
          {badge}
        </span>
      )}
    </Button>
  );
}
