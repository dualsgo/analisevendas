"use client";

import React, { useState, useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { 
  computeFullBasketQualityReport,
  BasketDiagnosticType,
  BasketQualityMetrics,
  TemporalDailyMetric,
  DayOfWeekMetric,
  CollaboratorBasketMetric
} from "@/lib/basket-quality-analytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
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
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BasketQualityAnalysisProps {
  data: DetailedSaleRow[];
}

type TabType = "OVERVIEW" | "DAILY" | "WEEKDAYS" | "WEEKEND_VS_WEEKDAY" | "WEEKLY" | "COLLABORATORS" | "SIMULATOR";

const BUCKET_COLORS = [
  "#ef4444", // 1 Item - Rose/Red (Unitário)
  "#3b82f6", // 2 Itens - Blue (Conversão Básica)
  "#10b981", // 3 Itens - Emerald (Cesta Profunda)
  "#8b5cf6", // 4 Itens - Violet (Cauda Volume)
  "#f59e0b", // 5 Itens - Amber (Cauda Volume)
  "#f97316", // 6+ Itens - Orange (Super Compra)
];

const DIAGNOSTIC_COLORS = {
  PRODUTIVIDADE_SUSTENTADA: "border-emerald-500 bg-emerald-50 text-emerald-800",
  PA_INFLADO_CONCENTRACAO: "border-amber-500 bg-amber-50 text-amber-800",
  BOA_CONVERSAO_BAIXA_PROFUNDIDADE: "border-blue-500 bg-blue-50 text-blue-800",
  BAIXA_CONVERSAO: "border-rose-500 bg-rose-50 text-rose-800",
  AMOSTRA_INSUFICIENTE: "border-slate-400 bg-slate-50 text-slate-700"
};

const DIAGNOSTIC_BADGES = {
  PRODUTIVIDADE_SUSTENTADA: "bg-emerald-500 text-white",
  PA_INFLADO_CONCENTRACAO: "bg-amber-500 text-white",
  BOA_CONVERSAO_BAIXA_PROFUNDIDADE: "bg-blue-600 text-white",
  BAIXA_CONVERSAO: "bg-rose-500 text-white",
  AMOSTRA_INSUFICIENTE: "bg-slate-500 text-white"
};

export function BasketQualityAnalysis({ data }: BasketQualityAnalysisProps) {
  const [activeTab, setActiveTab] = useState<TabType>("OVERVIEW");
  const [colabSearch, setColabSearch] = useState("");
  const [colabDiagnosticFilter, setColabDiagnosticFilter] = useState<string>("ALL");
  const [selectedColab, setSelectedColab] = useState<string | null>(null);

  // Simulador What-If
  const [simConvert1to2, setSimConvert1to2] = useState(20); // % de cupons 1 item para converter em 2
  const [simConvert2to3, setSimConvert2to3] = useState(15); // % de cupons 2 itens para converter em 3

  // Processamento do Relatório Completo
  const report = useMemo(() => {
    return computeFullBasketQualityReport(data);
  }, [data]);

  const { overall, temporalScope, dailyTrend, daysOfWeek, weekdayVsWeekend, weeklyComparison, collaborators } = report;

  // Filtragem de Colaboradores
  const filteredCollaborators = useMemo(() => {
    return collaborators.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(colabSearch.toLowerCase());
      const matchDiag = colabDiagnosticFilter === "ALL" || c.diagnostic.type === colabDiagnosticFilter;
      return matchSearch && matchDiag;
    });
  }, [collaborators, colabSearch, colabDiagnosticFilter]);

  // Colaborador Selecionado
  const activeColabMetric = useMemo(() => {
    if (!selectedColab) return null;
    return collaborators.find(c => c.name === selectedColab) || null;
  }, [collaborators, selectedColab]);

  // Projeção do Simulador
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 1. CABEÇALHO PEDAGÓGICO & DIAGNÓSTICO INTELIGENTE */}
      <div className={cn(
        "rounded-3xl p-6 md:p-8 border-2 shadow-sm relative overflow-hidden transition-all",
        DIAGNOSTIC_COLORS[overall.diagnostic.type]
      )}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
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
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
              <Target className="w-7 h-7 text-indigo-600 shrink-0" />
              {overall.diagnostic.title}
            </h1>
            <p className="text-sm text-slate-700 font-medium max-w-4xl leading-relaxed">
              {overall.diagnostic.description}
            </p>
          </div>

          {/* Card de Ação Sugerida */}
          <div className="bg-white/90 backdrop-blur-md p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm max-w-sm shrink-0 space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Recomendação Tática
            </span>
            <p className="text-xs font-bold text-slate-800 leading-snug">
              {overall.diagnostic.recommendation}
            </p>
          </div>
        </div>
      </div>

      {/* 2. GRID DE KPIS DE NÚCLEO E ESTRUTURA */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* PA REAL */}
        <Card className="ri-card bg-white p-4 flex flex-col justify-between border-slate-200">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">PA Real (Oficial)</span>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-black text-slate-900 tracking-tight">{overall.paReal.toFixed(2)}</p>
              <span className="text-xs font-bold text-slate-400">peças/cupom</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-100">
            {overall.totalItens} peças em {overall.totalCupons} cup.
          </p>
        </Card>

        {/* PA MEDIANO */}
        <Card className="ri-card bg-white p-4 flex flex-col justify-between border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">PA Mediano</span>
              <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200">Atend. Típico</Badge>
            </div>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-black text-indigo-600 tracking-tight">{overall.paMediano.toFixed(1)}</p>
              <span className="text-xs font-bold text-slate-400">peças</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Δ Dispersão:</span>
            <span className={cn("font-bold", overall.deltaPA > 0.35 ? "text-amber-600" : "text-emerald-600")}>
              {overall.deltaPA > 0 ? `+${overall.deltaPA.toFixed(2)}` : overall.deltaPA.toFixed(2)}
            </span>
          </p>
        </Card>

        {/* PA OPERACIONAL 1-3 */}
        <Card className="ri-card bg-white p-4 flex flex-col justify-between border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">PA Base 1–3</span>
              <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200">Sem Cauda</Badge>
            </div>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-black text-slate-800 tracking-tight">{overall.paOperacional1to3.toFixed(2)}</p>
              <span className="text-xs font-bold text-slate-400">peças</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-100">
            {overall.piecesIn1to3} peças em {overall.cuponsIn1to3} cup.
          </p>
        </Card>

        {/* % 1 ITEM (UNITÁRIO) */}
        <Card className="ri-card bg-white p-4 flex flex-col justify-between border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">% Cupons 1 Item</span>
              <span className="text-[10px] font-black text-rose-500">Monopeça</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-black text-rose-600 tracking-tight">{overall.unitRate.toFixed(1)}%</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-100">
            {overall.unitCount} cupons de 1 item
          </p>
        </Card>

        {/* % 2+ ITENS (VENDA ADICIONAL) */}
        <Card className="ri-card bg-white p-4 flex flex-col justify-between border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">% Venda Adic. (2+)</span>
              <span className="text-[10px] font-black text-emerald-500">Conversão</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-black text-emerald-600 tracking-tight">{overall.multiCouponsRate.toFixed(1)}%</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-100">
            {overall.multiCouponsCount} cupons com 2+ itens
          </p>
        </Card>

        {/* CONCENTRAÇÃO NA CAUDA 4+ */}
        <Card className="ri-card bg-white p-4 flex flex-col justify-between border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Concentração 4+</span>
              <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200">Índice</Badge>
            </div>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-black text-amber-600 tracking-tight">{overall.concentrationIndex.toFixed(1)}x</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-100">
            {overall.tailPiecesRate.toFixed(1)}% das peças em 4+
          </p>
        </Card>
      </div>

      {/* 3. MENU DE NAVEGAÇÃO DE ABAS TEMPORAIS E VISÕES */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80">
        <TabButton 
          active={activeTab === "OVERVIEW"} 
          onClick={() => setActiveTab("OVERVIEW")} 
          icon={Layers} 
          label="Estrutura de Cesta" 
        />
        {dailyTrend.length > 1 && (
          <TabButton 
            active={activeTab === "DAILY"} 
            onClick={() => setActiveTab("DAILY")} 
            icon={CalendarDays} 
            label={`Evolução Diária (${dailyTrend.length}d)`} 
          />
        )}
        {daysOfWeek.some(d => d.totalDays > 0) && (
          <TabButton 
            active={activeTab === "WEEKDAYS"} 
            onClick={() => setActiveTab("WEEKDAYS")} 
            icon={Calendar} 
            label="Dias da Semana (Seg-Dom)" 
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
          active={activeTab === "COLLABORATORS"} 
          onClick={() => setActiveTab("COLLABORATORS")} 
          icon={Users} 
          label={`Colaboradores (${collaborators.length})`} 
        />
        <TabButton 
          active={activeTab === "SIMULATOR"} 
          onClick={() => setActiveTab("SIMULATOR")} 
          icon={Calculator} 
          label="Simulador What-If" 
        />
      </div>

      {/* 4. CONTEÚDO DAS ABAS */}

      {/* --- ABA 1: ESTRUTURA DE CESTA (HISTOGRAMA & RAIO-X DA CAUDA) --- */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Histograma de Degraus */}
            <Card className="ri-card lg:col-span-2 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    Distribuição dos Degraus de Atendimento
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Participação de cada quantidade de itens no volume de cupons e peças da loja.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-bold text-slate-700 w-fit">
                  {overall.totalCupons} cupons | {overall.totalItens} peças
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
                        name === "rate" ? "% Cupons" : "% Peças"
                      ]}
                      labelFormatter={(label) => `Cesta: ${label}`}
                      contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px", fontWeight: 700 }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingTop: "10px" }} />
                    <Bar dataKey="rate" name="% dos Cupons" fill="#6366f1" radius={[6, 6, 0, 0]}>
                      {overall.buckets.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BUCKET_COLORS[index % BUCKET_COLORS.length]} />
                      ))}
                    </Bar>
                    <Bar dataKey="piecesRate" name="% das Peças" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Grid dos Degraus */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
                {overall.buckets.map((b, idx) => (
                  <div key={b.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BUCKET_COLORS[idx] }} />
                      <p className="text-[11px] font-black text-slate-800">{b.label}</p>
                    </div>
                    <p className="text-lg font-black text-slate-900">{b.rate.toFixed(1)}%</p>
                    <p className="text-[10px] text-slate-500 font-bold">{b.count} cup ({b.pieces} pçs)</p>
                    <p className="text-[9px] text-indigo-600 font-bold">{formatBRL(b.avgTicket)}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Raio-X de Concentração da Cauda 4+ */}
            <Card className="ri-card p-6 space-y-5 flex flex-col justify-between">
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  Raio-X da Cauda (4+ Itens)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Mede a dependência do PA em relação a compras de grande porte.
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-amber-900">Participação nos Atendimentos</span>
                    <span className="text-sm font-black text-amber-900">{overall.tailCouponsRate.toFixed(1)}% ({overall.deepCouponsCount} cup)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-amber-900">Participação nas Peças</span>
                    <span className="text-sm font-black text-amber-900">{overall.tailPiecesRate.toFixed(1)}% ({overall.piecesIn4Plus} pçs)</span>
                  </div>
                  <div className="pt-2 border-t border-amber-200/60 flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-amber-800">Índice de Concentração</span>
                    <span className="text-xl font-black text-amber-900">{overall.concentrationIndex.toFixed(2)}x</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Profundidade quando há 2+ itens: <strong>{overall.avgDeepBasketPieces.toFixed(2)} peças/cupom</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Impacto da cauda 4+ no PA: <strong>+{(overall.paReal - overall.paOperacional1to3).toFixed(2)} no PA total</strong></span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 font-medium leading-snug">
                {overall.concentrationIndex > 3.5 ? (
                  <p className="text-amber-800 font-bold">
                    ⚠️ Atenção: A cauda de 4+ itens tem peso desproporcional ({overall.concentrationIndex.toFixed(1)}x). Se removermos essas compras, o PA cai de {overall.paReal.toFixed(2)} para {overall.paOperacional1to3.toFixed(2)}.
                  </p>
                ) : (
                  <p className="text-emerald-800 font-bold">
                    ✅ Boa sustentação: A distribuição de peças entre os atendimentos está equilibrada com baixa dependência de outliers ({overall.concentrationIndex.toFixed(1)}x).
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* --- ABA 2: EVOLUÇÃO DIÁRIA --- */}
      {activeTab === "DAILY" && (
        <div className="space-y-6">
          <Card className="ri-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-indigo-600" />
                  Evolução Temporal do PA e Distribuição Dia a Dia
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Acompanhe a curva diária de PA Real vs PA Mediano vs PA Base 1–3 e a taxa de 1 item.
                </p>
              </div>
            </div>

            {/* Gráfico de Linhas Temporal */}
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
                  <Line yAxisId="left" type="monotone" dataKey="paReal" name="PA Real" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line yAxisId="left" type="monotone" dataKey="paMediano" name="PA Mediano" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                  <Line yAxisId="left" type="monotone" dataKey="paOperacional1to3" name="PA Base 1–3" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="unitRate" name="% Cupons 1 Item" stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela Dia a Dia */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-10">
                    <TableHead className="text-[10px] font-black uppercase text-slate-600">Data / Dia</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Cupons</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">PA Real</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">PA Mediano</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">PA Base 1–3</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 1 Item</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 2+ Itens</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% Peças 4+</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Diagnóstico do Dia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyTrend.map(d => (
                    <TableRow key={d.date} className="h-12 hover:bg-slate-50/80">
                      <TableCell className="font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            d.isWeekendDay ? "bg-amber-500" : "bg-indigo-500"
                          )} />
                          <span>{d.dayLabel}</span>
                          <span className="text-xs text-slate-400 font-normal">({d.weekdayShort})</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{d.totalCupons}</TableCell>
                      <TableCell className="text-center font-black text-slate-900">{d.paReal.toFixed(2)}</TableCell>
                      <TableCell className="text-center font-bold text-indigo-600">{d.paMediano.toFixed(1)}</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{d.paOperacional1to3.toFixed(2)}</TableCell>
                      <TableCell className="text-center font-bold text-rose-600">{d.unitRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-center font-bold text-emerald-600">{d.multiCouponsRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-center font-bold text-amber-600">{d.tailPiecesRate.toFixed(1)}%</TableCell>
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

      {/* --- ABA 3: DIAS DA SEMANA (SEG A DOM) --- */}
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
                  Descubra quais dias da semana têm maior agregação de itens e onde os cupons de 1 item mais pesam.
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
                          <span>Mediana:</span>
                          <span className="text-indigo-600">{dow.metrics.paMediano.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-600 font-bold">
                          <span>% 1 Item:</span>
                          <span className="text-rose-600">{dow.metrics.unitRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-600 font-bold">
                          <span>% 2+:</span>
                          <span className="text-emerald-600">{dow.metrics.multiCouponsRate.toFixed(1)}%</span>
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

      {/* --- ABA 4: DIAS ÚTEIS VS FIM DE SEMANA --- */}
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

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">PA Real</span>
                    <p className="text-2xl font-black text-slate-900">{weekdayVsWeekend.weekdays.paReal.toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">PA Mediano</span>
                    <p className="text-2xl font-black text-indigo-600">{weekdayVsWeekend.weekdays.paMediano.toFixed(1)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">PA Base 1–3</span>
                    <p className="text-2xl font-black text-slate-800">{weekdayVsWeekend.weekdays.paOperacional1to3.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 text-xs font-bold text-slate-700">
                  <div className="flex justify-between">
                    <span>Taxa de Cupons 1 Item:</span>
                    <span className="text-rose-600 font-black">{weekdayVsWeekend.weekdays.unitRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxa de Venda Adicional (2+):</span>
                    <span className="text-emerald-600 font-black">{weekdayVsWeekend.weekdays.multiCouponsRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Concentração de Peças em 4+:</span>
                    <span className="text-amber-600 font-black">{weekdayVsWeekend.weekdays.tailPiecesRate.toFixed(1)}%</span>
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

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">PA Real</span>
                    <p className="text-2xl font-black text-amber-950">{weekdayVsWeekend.weekends.paReal.toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">PA Mediano</span>
                    <p className="text-2xl font-black text-indigo-600">{weekdayVsWeekend.weekends.paMediano.toFixed(1)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">PA Base 1–3</span>
                    <p className="text-2xl font-black text-slate-800">{weekdayVsWeekend.weekends.paOperacional1to3.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 text-xs font-bold text-slate-700">
                  <div className="flex justify-between">
                    <span>Taxa de Cupons 1 Item:</span>
                    <span className="text-rose-600 font-black">{weekdayVsWeekend.weekends.unitRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxa de Venda Adicional (2+):</span>
                    <span className="text-emerald-600 font-black">{weekdayVsWeekend.weekends.multiCouponsRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Concentração de Peças em 4+:</span>
                    <span className="text-amber-600 font-black">{weekdayVsWeekend.weekends.tailPiecesRate.toFixed(1)}%</span>
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

      {/* --- ABA 5: SEMANA A SEMANA (WoW) --- */}
      {activeTab === "WEEKLY" && (
        <div className="space-y-6">
          <Card className="ri-card p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-indigo-600" />
                Comparativo Semana a Semana (Week-over-Week)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Evolução da conversão de cesta ao longo das semanas do mês.
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
                      <span className="text-xs text-slate-500 font-bold">PA Mediano:</span>
                      <span className="text-sm font-black text-indigo-600">{w.metrics.paMediano.toFixed(1)}</span>
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

      {/* --- ABA 6: COLABORADORES --- */}
      {activeTab === "COLLABORATORS" && (
        <div className="space-y-6">
          <Card className="ri-card p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Qualidade e Sustentação da Cesta por Colaborador
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Avalie a consistência de cada vendedor sem a distorção de compras isoladas.
                </p>
              </div>

              {/* Filtros e Busca */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input 
                    placeholder="Buscar colaborador..." 
                    className="pl-9 h-9 text-xs rounded-xl border-slate-200" 
                    value={colabSearch} 
                    onChange={e => setColabSearch(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* Tabela de Colaboradores */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-10">
                    <TableHead className="text-[10px] font-black uppercase text-slate-600">Colaborador</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Cupons</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">PA Real</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">PA Mediano</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">PA Base 1–3</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 1 Item</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 2+ Itens</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 3+ Itens</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% Peças 4+</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Diagnóstico</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCollaborators.map(c => (
                    <TableRow key={c.name} className="h-12 hover:bg-slate-50/80 cursor-pointer" onClick={() => setSelectedColab(c.name)}>
                      <TableCell className="font-black text-slate-900 uppercase text-xs">
                        {c.name}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{c.totalCupons}</TableCell>
                      <TableCell className="text-center font-black text-slate-900">{c.paReal.toFixed(2)}</TableCell>
                      <TableCell className="text-center font-bold text-indigo-600">{c.paMediano.toFixed(1)}</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{c.paOperacional1to3.toFixed(2)}</TableCell>
                      <TableCell className="text-center font-bold text-rose-600">{c.unitRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-center font-bold text-emerald-600">{c.multiCouponsRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{c.threePlusRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-center font-bold text-amber-600">{c.tailPiecesRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[9px] font-bold uppercase", DIAGNOSTIC_BADGES[c.diagnostic.type])}>
                          {c.diagnostic.badgeLabel}
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

      {/* --- ABA 7: SIMULADOR TÁTICO WHAT-IF --- */}
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
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: any; 
  label: string; 
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
    </Button>
  );
}
