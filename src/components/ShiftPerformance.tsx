"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Clock, 
  Info, 
  Search, 
  Timer, 
  Users, 
  LayoutGrid, 
  ArrowRightLeft, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Sparkles,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, format, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getShiftForDate, getShiftLabels, isSundayOrHoliday } from "@/lib/shift-utils";
import { 
  PeriodFilterConfig, 
  resolvePeriodDates, 
  aggregatePeriodShiftData, 
  comparePeriods,
  MetricVariation,
  ShiftComparisonResult
} from "@/lib/shift-comparison";
import { ShiftComparisonSelector } from "@/components/ShiftComparisonSelector";

interface ShiftPerformanceProps {
  data: DetailedSaleRow[];
}

export function ShiftPerformance({ data }: ShiftPerformanceProps) {
  // Navigation & Mode
  const [comparisonMode, setComparisonMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"cards" | "variacao" | "mapa">("cards");

  // Standard Mode Filter
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [heatmapMetric, setHeatmapMetric] = useState<"vNF" | "tkm" | "pa">("vNF");

  const sales = useMemo(() =>
    data.filter(r => !r.is_cancelada && r.tpNF === 1 && !r.is_devolucao && r.dhEmi),
    [data]
  );

  const uniqueDays = useMemo(() => {
    const daysSet = new Set<string>();
    sales.forEach(s => {
      try {
        const d = format(parseISO(s.dhEmi), "yyyy-MM-dd");
        daysSet.add(d);
      } catch {}
    });
    return Array.from(daysSet).sort();
  }, [sales]);

  // Available distinct months
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    uniqueDays.forEach((d) => {
      if (d.length >= 7) monthsSet.add(d.substring(0, 7));
    });
    return Array.from(monthsSet).sort().reverse();
  }, [uniqueDays]);

  // Comparison configs
  const [configA, setConfigA] = useState<PeriodFilterConfig>(() => ({
    id: "A",
    label: "Período A",
    month: availableMonths[0] || "all",
    weekdays: [],
    useCustomDays: false,
  }));

  const [configB, setConfigB] = useState<PeriodFilterConfig>(() => ({
    id: "B",
    label: "Período B",
    month: availableMonths.length > 1 ? availableMonths[1] : availableMonths[0] || "all",
    weekdays: [],
    useCustomDays: false,
  }));

  // Resolve target dates for A and B
  const resolvedDatesA = useMemo(() => {
    return resolvePeriodDates(uniqueDays, configA);
  }, [uniqueDays, configA]);

  const resolvedDatesB = useMemo(() => {
    return resolvePeriodDates(uniqueDays, configB);
  }, [uniqueDays, configB]);

  // Comparison metrics engine
  const comparisonResult: ShiftComparisonResult = useMemo(() => {
    const setA = new Set(resolvedDatesA);
    const setB = new Set(resolvedDatesB);
    const aggA = aggregatePeriodShiftData(sales, setA);
    const aggB = aggregatePeriodShiftData(sales, setB);
    return comparePeriods(aggA, aggB);
  }, [sales, resolvedDatesA, resolvedDatesB]);

  // Standard Mode Sales
  const filteredSales = useMemo(() => {
    if (!selectedDay) return sales;
    return sales.filter(s => {
      try {
        return format(parseISO(s.dhEmi), "yyyy-MM-dd") === selectedDay;
      } catch {
        return false;
      }
    });
  }, [sales, selectedDay]);

  // Standard Mode Metrics
  const { shiftMetrics, employeeMetrics, dailyMetrics } = useMemo(() => {
    let mode: "consolidated" | "weekday" | "sunday_holiday" = "consolidated";
    if (selectedDay) {
      mode = isSundayOrHoliday(selectedDay) ? "sunday_holiday" : "weekday";
    }
    const labels = getShiftLabels(mode);

    const turnos = {
      manha: { id: "manha", nome: labels.manha, cupons: 0, vNF: 0, desconto: 0, cpf: 0, vendedores: new Set<string>(), itens: 0 },
      tarde: { id: "tarde", nome: labels.tarde, cupons: 0, vNF: 0, desconto: 0, cpf: 0, vendedores: new Set<string>(), itens: 0 },
      noite: { id: "noite", nome: labels.noite, cupons: 0, vNF: 0, desconto: 0, cpf: 0, vendedores: new Set<string>(), itens: 0 }
    };

    type EmpMetrics = { cupons: number; vNF: number; itens: number; };
    const empData: Record<string, { manha: EmpMetrics; tarde: EmpMetrics; noite: EmpMetrics; total: EmpMetrics }> = {};
    const dailyShiftData: Record<string, { manha: EmpMetrics; tarde: EmpMetrics; noite: EmpMetrics; total: EmpMetrics }> = {};

    for (const s of filteredSales) {
      const d = parseISO(s.dhEmi);
      const turno = getShiftForDate(d);
      
      const bucket = turnos[turno];
      bucket.cupons++;
      bucket.vNF += parseFloat(s.vNF) || 0;
      if (parseFloat(s.desconto_total) > 0) bucket.desconto++;
      if (s.cpf_cnpj_dest) bucket.cpf++;
      
      const vend = s.vendedor || "DESCONHECIDO";
      if (vend !== "COLABORADOR NÃO IDENTIFICADO") {
        bucket.vendedores.add(vend);
      }
      
      const qItens = parseFloat(s.itens_qtd) || 0;
      bucket.itens += qItens;

      const dStr = format(d, "yyyy-MM-dd");
      if (!dailyShiftData[dStr]) {
        dailyShiftData[dStr] = {
            manha: { cupons: 0, vNF: 0, itens: 0 },
            tarde: { cupons: 0, vNF: 0, itens: 0 },
            noite: { cupons: 0, vNF: 0, itens: 0 },
            total: { cupons: 0, vNF: 0, itens: 0 }
        };
      }
      dailyShiftData[dStr][turno].cupons++;
      dailyShiftData[dStr][turno].vNF += parseFloat(s.vNF) || 0;
      dailyShiftData[dStr][turno].itens += qItens;
      dailyShiftData[dStr].total.cupons++;
      dailyShiftData[dStr].total.vNF += parseFloat(s.vNF) || 0;
      dailyShiftData[dStr].total.itens += qItens;

      if (vend !== "COLABORADOR NÃO IDENTIFICADO") {
        if (!empData[vend]) {
          empData[vend] = {
            manha: { cupons: 0, vNF: 0, itens: 0 },
            tarde: { cupons: 0, vNF: 0, itens: 0 },
            noite: { cupons: 0, vNF: 0, itens: 0 },
            total: { cupons: 0, vNF: 0, itens: 0 }
          };
        }
        
        empData[vend][turno].cupons++;
        empData[vend][turno].vNF += parseFloat(s.vNF) || 0;
        empData[vend][turno].itens += qItens;

        empData[vend].total.cupons++;
        empData[vend].total.vNF += parseFloat(s.vNF) || 0;
        empData[vend].total.itens += qItens;
      }
    }
    
    const fmtTurno = (t: typeof turnos.manha) => ({
      ...t,
      tkm: t.cupons > 0 ? t.vNF / t.cupons : 0,
      pa: t.cupons > 0 ? t.itens / t.cupons : 0,
      pm: t.itens > 0 ? t.vNF / t.itens : 0,
      pDesconto: t.cupons > 0 ? (t.desconto / t.cupons) * 100 : 0,
      pCpf: t.cupons > 0 ? (t.cpf / t.cupons) * 100 : 0,
      tamanhoEq: t.vendedores.size
    });

    const shiftData = [fmtTurno(turnos.manha), fmtTurno(turnos.tarde), fmtTurno(turnos.noite)];
    const totalCupons = shiftData.reduce((acc, t) => acc + t.cupons, 0);

    const empList = Object.entries(empData).map(([nome, data]) => ({ nome, ...data })).sort((a, b) => b.total.vNF - a.total.vNF);
    const dailyList = Object.entries(dailyShiftData).map(([data, metrics]) => ({ data, ...metrics })).sort((a, b) => a.data.localeCompare(b.data));

    return { shiftMetrics: shiftData, totalCupons, employeeMetrics: empList, dailyMetrics: dailyList };
  }, [filteredSales, selectedDay]);

  const fmtBRL = (v?: number | string | null) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getMetricValue = (metrics: { cupons: number; vNF: number; itens: number; }, metric: "vNF" | "tkm" | "pa") => {
    if (!metrics || metrics.cupons === 0) return 0;
    if (metric === "vNF") return metrics.vNF;
    if (metric === "tkm") return metrics.vNF / metrics.cupons;
    if (metric === "pa") return metrics.itens / metrics.cupons;
    return 0;
  };

  const getStats = (list: any[], key: "manha" | "tarde" | "noite") => {
    let min = Infinity, max = -Infinity;
    list.forEach(item => {
      const v = getMetricValue(item[key], heatmapMetric);
      if (v > 0) { min = Math.min(min, v); max = Math.max(max, v); }
    });
    if (min === Infinity) min = 0;
    return { min, max };
  };

  const empStats = {
    manha: getStats(employeeMetrics, "manha"),
    tarde: getStats(employeeMetrics, "tarde"),
    noite: getStats(employeeMetrics, "noite"),
  };

  const dailyStats = {
    manha: getStats(dailyMetrics, "manha"),
    tarde: getStats(dailyMetrics, "tarde"),
    noite: getStats(dailyMetrics, "noite"),
  };

  const getHeatmapColor = (val: number, min: number, max: number) => {
    if (!val || val === 0) return "bg-slate-50 text-slate-300 border-slate-200";
    if (min === max) return "bg-emerald-500 text-white border-emerald-600";
    
    const ratio = (val - min) / (max - min);
    if (ratio < 0.2) return "bg-rose-500 text-white border-rose-600";
    if (ratio < 0.4) return "bg-rose-200 text-rose-900 border-rose-300";
    if (ratio < 0.6) return "bg-amber-100 text-amber-900 border-amber-200";
    if (ratio < 0.8) return "bg-emerald-200 text-emerald-900 border-emerald-300";
    return "bg-emerald-500 text-white border-emerald-600";
  };

  const fmtMetric = (val: number, metric: "vNF" | "tkm" | "pa") => {
    if (val === 0) return "-";
    if (metric === "vNF" || metric === "tkm") return fmtBRL(val);
    return val.toFixed(2);
  };

  // Helper Badge for variations
  const renderVariationBadge = (variation: MetricVariation, isCurrency = false, isInt = false) => {
    if (variation.isNeutral) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
          <Minus className="w-2.5 h-2.5" /> 0.0%
        </span>
      );
    }

    if (variation.isPositive) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
          <TrendingUp className="w-3 h-3 text-emerald-600" />
          <span>+{variation.pct.toFixed(1)}%</span>
          <span className="text-[9px] font-semibold text-emerald-700 ml-0.5 opacity-80">
            ({isCurrency ? `+${fmtBRL(variation.diff)}` : isInt ? `+${variation.diff.toFixed(0)}` : `+${variation.diff.toFixed(2)}`})
          </span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
        <TrendingDown className="w-3 h-3 text-rose-600" />
        <span>{variation.pct.toFixed(1)}%</span>
        <span className="text-[9px] font-semibold text-rose-700 ml-0.5 opacity-80">
          ({isCurrency ? fmtBRL(variation.diff) : isInt ? variation.diff.toFixed(0) : variation.diff.toFixed(2)})
        </span>
      </span>
    );
  };

  // Quick swap handler
  const handleSwapPeriods = () => {
    const tempA = { ...configA, id: "A" as const };
    const tempB = { ...configB, id: "B" as const };
    setConfigA({ ...tempB, id: "A" });
    setConfigB({ ...tempA, id: "B" });
  };

  const handleResetPeriods = () => {
    setConfigA({
      id: "A",
      label: "Período A",
      month: availableMonths[0] || "all",
      weekdays: [],
      useCustomDays: false,
    });
    setConfigB({
      id: "B",
      label: "Período B",
      month: availableMonths.length > 1 ? availableMonths[1] : availableMonths[0] || "all",
      weekdays: [],
      useCustomDays: false,
    });
  };

  // Best performing shift in comparison
  const shiftHighlights = useMemo(() => {
    if (!comparisonMode) return null;
    const entries = [
      { id: "manha", nome: "Manhã", diff: comparisonResult.shifts.manha.vNF.diff, pct: comparisonResult.shifts.manha.vNF.pct },
      { id: "tarde", nome: "Tarde", diff: comparisonResult.shifts.tarde.vNF.diff, pct: comparisonResult.shifts.tarde.vNF.pct },
      { id: "noite", nome: "Noite", diff: comparisonResult.shifts.noite.vNF.diff, pct: comparisonResult.shifts.noite.vNF.pct },
    ];
    entries.sort((a, b) => b.pct - a.pct);
    const topShift = entries[0];

    // Best employee growth in absolute sales
    const empByGain = [...comparisonResult.employeeComparison]
      .filter(e => e.totalVNF.valA > 0 || e.totalVNF.valB > 0)
      .sort((a, b) => b.totalVNF.diff - a.totalVNF.diff);
    const topEmployee = empByGain.length > 0 ? empByGain[0] : null;

    return { topShift, topEmployee };
  }, [comparisonMode, comparisonResult]);

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
        <Clock className="w-16 h-16 opacity-30" />
        <p className="text-sm font-bold uppercase tracking-widest">Carregue XMLs para analisar os turnos</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-24">
      {/* Header com gradiente e alternador de Modo Comparação */}
      <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[100px] -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-4">
            <div className="bg-white/10 p-3.5 rounded-2xl w-fit shadow-inner">
              <Timer className="w-8 h-8 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">
                  Desempenho por Turno
                </h2>
                {comparisonMode && (
                  <Badge className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white border-0 font-black text-[10px] tracking-wider uppercase shadow-md">
                    Modo Comparação Ativo
                  </Badge>
                )}
              </div>
              <p className="text-indigo-200 text-xs md:text-sm font-medium mt-1 max-w-2xl">
                Avalie o ritmo de vendas por janelas de horário (Manhã, Tarde e Noite) ou compare o impacto entre diferentes dias e meses
              </p>
            </div>
          </div>

          {/* Toggle Principal: Modo Padrão vs Modo Comparação */}
          <div className="flex items-center bg-black/30 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md self-start lg:self-auto shadow-lg">
            <button
              type="button"
              onClick={() => {
                setComparisonMode(false);
                setActiveTab("cards");
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2",
                !comparisonMode
                  ? "bg-white text-indigo-950 shadow-md scale-100"
                  : "text-indigo-200 hover:text-white hover:bg-white/5"
              )}
            >
              <Clock className="w-4 h-4" />
              <span>Visão Normal</span>
            </button>

            <button
              type="button"
              onClick={() => setComparisonMode(true)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 relative",
                comparisonMode
                  ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20 scale-100"
                  : "text-indigo-200 hover:text-white hover:bg-white/5"
              )}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Comparar Períodos</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            </button>
          </div>
        </div>
      </div>

      {/* ÁREA DE CONTROLES: CONFORME O MODO ATIVO */}
      {!comparisonMode ? (
        /* Filtros Modo Normal */
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filtrar por Dia:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setSelectedDay(null)} 
                className={cn("px-3 py-1.5 rounded-full text-xs font-black transition-all", selectedDay === null ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
              >
                CONSOLIDADO
              </button>
              {uniqueDays.map((d) => {
                const isSpecial = isSundayOrHoliday(d);
                return (
                  <button 
                    key={d} 
                    onClick={() => setSelectedDay(prev => prev === d ? null : d)} 
                    className={cn("px-3 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5", selectedDay === d ? "bg-indigo-500 text-white shadow-md shadow-indigo-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
                  >
                    <span>{format(parseISO(d), "dd/MM (EEE)", { locale: ptBR }).toUpperCase()}</span>
                    {isSpecial && (
                      <span className={cn("text-[9px] font-black px-1 rounded", selectedDay === d ? "bg-white/25 text-white" : "bg-amber-100 text-amber-800")}>
                        {getDay(parseISO(d)) === 0 ? "DOM" : "FER"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shrink-0">
            <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>
              {selectedDay 
                ? (isSundayOrHoliday(selectedDay) ? "Dom/Feriado: 12h às 21h (3 turnos de 3h)" : "Seg a Sáb: 10h às 22h (3 turnos de 4h)")
                : "Turnos iguais: Seg–Sáb (4h/turno) | Dom e Feriados (3h/turno)"}
            </span>
          </div>
        </div>
      ) : (
        /* Painel Avançado de Comparação */
        <ShiftComparisonSelector
          allDates={uniqueDays}
          configA={configA}
          configB={configB}
          onChangeA={setConfigA}
          onChangeB={setConfigB}
          resolvedDatesA={resolvedDatesA}
          resolvedDatesB={resolvedDatesB}
          onSwap={handleSwapPeriods}
          onReset={handleResetPeriods}
        />
      )}

      {/* SUB-NAVEGAÇÃO POR ABAS (Cards, Variação de Turnos, Mapa de Calor) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("cards")}
            className={cn(
              "px-4 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5",
              activeTab === "cards"
                ? "bg-white text-indigo-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{comparisonMode ? "Cards Comparativos" : "Visão Geral"}</span>
          </button>

          {comparisonMode && (
            <button
              type="button"
              onClick={() => setActiveTab("variacao")}
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5",
                activeTab === "variacao"
                  ? "bg-white text-indigo-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Variação de Turnos</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("mapa")}
            className={cn(
              "px-4 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5",
              activeTab === "mapa"
                ? "bg-white text-indigo-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Mapa de Calor</span>
          </button>
        </div>

        {comparisonMode && shiftHighlights && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Maior salto percentual: <strong className="font-black text-emerald-950 uppercase">{shiftHighlights.topShift.nome}</strong> (+{shiftHighlights.topShift.pct.toFixed(1)}%)
              </span>
            </div>
            {shiftHighlights.topEmployee && shiftHighlights.topEmployee.totalVNF.diff > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-bold text-indigo-800">
                <Award className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>
                  Maior ganho colaborador: <strong className="font-black text-indigo-950">{shiftHighlights.topEmployee.nome}</strong> (+{fmtBRL(shiftHighlights.topEmployee.totalVNF.diff)})
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONTEÚDO PRINCIPAL DE ACORDO COM A ABA E MODO */}

      {/* TAB 1: CARDS / VISÃO GERAL */}
      {activeTab === "cards" && (
        <div className="space-y-6">
          {!comparisonMode ? (
            /* CARDS MODO NORMAL */
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Visão Geral da Loja</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {shiftMetrics.map((turno) => {
                  const perc = shiftMetrics.reduce((acc, t) => acc + t.cupons, 0) > 0 
                    ? (turno.cupons / shiftMetrics.reduce((acc, t) => acc + t.cupons, 0)) * 100 
                    : 0;
                  return (
                    <div key={turno.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-black text-indigo-900 text-sm uppercase">{turno.nome}</h3>
                        <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 shadow-none font-black text-[10px]">{turno.tamanhoEq} Vends.</Badge>
                      </div>
                      
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Faturamento</p>
                          <p className="text-2xl font-black text-slate-800">{fmtBRL(turno.vNF)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cupons</p>
                          <p className="text-xl font-black text-slate-600">{turno.cupons}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-50 p-2.5 rounded-xl text-center">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">TKM</p>
                          <p className="text-xs font-black text-indigo-700">{fmtBRL(turno.tkm)}</p>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl text-center">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">PA</p>
                          <p className="text-xs font-black text-emerald-600">{turno.pa.toFixed(2)}</p>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl text-center">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">PM</p>
                          <p className="text-xs font-black text-amber-600">{fmtBRL(turno.pm)}</p>
                        </div>
                      </div>

                      <div className="bg-indigo-900/5 p-3 rounded-xl border border-indigo-100/50 mt-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-black text-indigo-700 uppercase tracking-tighter">Representatividade</p>
                          <span className="text-[10px] font-black text-indigo-600">{perc.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${perc}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* CARDS MODO COMPARAÇÃO: LADO A LADO A vs B COM VARIAÇÕES */
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    Comparativo Direto por Turno (Período A vs Período B)
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-indigo-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" /> Período A ({resolvedDatesA.length} dias)
                  </span>
                  <span className="flex items-center gap-1.5 text-violet-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-600 inline-block" /> Período B ({resolvedDatesB.length} dias)
                  </span>
                </div>
              </div>

              {/* Grid dos 3 Turnos + Card Consolidado da Loja */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {(["manha", "tarde", "noite"] as const).map((shiftKey) => {
                  const shiftName = shiftKey === "manha" ? "Manhã" : shiftKey === "tarde" ? "Tarde" : "Noite";
                  const shiftTime = shiftKey === "manha" ? "10h às 14h (Dom/Fer: 12h-15h)" : shiftKey === "tarde" ? "14h às 18h (Dom/Fer: 15h-18h)" : "18h às 22h (Dom/Fer: 18h-21h)";
                  const sA = comparisonResult.periodA.shifts[shiftKey];
                  const sB = comparisonResult.periodB.shifts[shiftKey];
                  const varShift = comparisonResult.shifts[shiftKey];

                  return (
                    <div
                      key={shiftKey}
                      className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
                    >
                      {/* Top Bar do Card */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="font-black text-indigo-950 text-base uppercase tracking-tight">
                            Turno da {shiftName}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-medium">{shiftTime}</span>
                        </div>
                        {renderVariationBadge(varShift.vNF, true)}
                      </div>

                      {/* Faturamento A vs B */}
                      <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100 space-y-2">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex justify-between">
                          <span>Faturamento</span>
                          <span>Variação</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 items-center">
                          {/* Período A */}
                          <div className="border-l-2 border-indigo-600 pl-2">
                            <span className="text-[10px] font-black text-indigo-600 block uppercase">Período A</span>
                            <span className="text-lg font-black text-slate-800">{fmtBRL(sA.vNF)}</span>
                            <span className="text-[10px] text-slate-400 block font-semibold">{sA.cupons} cupons</span>
                          </div>

                          {/* Período B */}
                          <div className="border-l-2 border-violet-600 pl-2">
                            <span className="text-[10px] font-black text-violet-600 block uppercase">Período B</span>
                            <span className="text-lg font-black text-slate-800">{fmtBRL(sB.vNF)}</span>
                            <span className="text-[10px] text-slate-400 block font-semibold">{sB.cupons} cupons</span>
                          </div>
                        </div>
                      </div>

                      {/* Métricas Secundárias (TKM e PA) lado a lado */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* TKM */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase">TKM (Ticket Médio)</p>
                          <div className="flex items-center justify-center gap-1.5 mt-1 text-xs font-black">
                            <span className="text-indigo-700">{fmtBRL(sA.tkm)}</span>
                            <span className="text-slate-300">vs</span>
                            <span className="text-violet-700">{fmtBRL(sB.tkm)}</span>
                          </div>
                          <div className="mt-1 flex justify-center">
                            {renderVariationBadge(varShift.tkm, true)}
                          </div>
                        </div>

                        {/* PA */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase">P.A. (Peças/Cupom)</p>
                          <div className="flex items-center justify-center gap-1.5 mt-1 text-xs font-black">
                            <span className="text-indigo-700">{sA.pa.toFixed(2)}</span>
                            <span className="text-slate-300">vs</span>
                            <span className="text-violet-700">{sB.pa.toFixed(2)}</span>
                          </div>
                          <div className="mt-1 flex justify-center">
                            {renderVariationBadge(varShift.pa, false)}
                          </div>
                        </div>
                      </div>

                      {/* Equipe / Colaboradores */}
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 bg-indigo-50/40 px-3 py-1.5 rounded-xl border border-indigo-100/60">
                        <span>Equipe no Turno:</span>
                        <div className="flex gap-2">
                          <span className="text-indigo-700 font-black">A: {sA.tamanhoEq} vends</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-violet-700 font-black">B: {sB.tamanhoEq} vends</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Card Resumo Total da Loja */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-indigo-300">
                      Total Consolidado da Loja
                    </span>
                    <Badge className="bg-white/10 text-white border-white/20 font-black text-[9px] shadow-none">
                      3 Turnos Somados
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-3 mt-2">
                    <span className="text-2xl md:text-3xl font-black">{fmtBRL(comparisonResult.periodA.total.vNF)}</span>
                    <span className="text-xs text-indigo-200">em A ({comparisonResult.periodA.total.cupons} cupons)</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-300">
                    <span>Comparado a {fmtBRL(comparisonResult.periodB.total.vNF)} em B</span>
                    <span>•</span>
                    <span className="font-semibold">{comparisonResult.periodB.total.cupons} cupons</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="bg-white/10 p-3 rounded-2xl border border-white/10 text-center min-w-[120px]">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200 block">Variação Vendas</span>
                    <div className="mt-1">
                      {renderVariationBadge(comparisonResult.total.vNF, true)}
                    </div>
                  </div>

                  <div className="bg-white/10 p-3 rounded-2xl border border-white/10 text-center min-w-[110px]">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200 block">Variação Cupons</span>
                    <div className="mt-1">
                      {renderVariationBadge(comparisonResult.total.cupons, false, true)}
                    </div>
                  </div>

                  <div className="bg-white/10 p-3 rounded-2xl border border-white/10 text-center min-w-[110px]">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200 block">Variação TKM</span>
                    <div className="mt-1">
                      {renderVariationBadge(comparisonResult.total.tkm, true)}
                    </div>
                  </div>

                  <div className="bg-white/10 p-3 rounded-2xl border border-white/10 text-center min-w-[90px]">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200 block">Variação P.A.</span>
                    <div className="mt-1">
                      {renderVariationBadge(comparisonResult.total.pa, false)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TABELA DE COLABORADORES (Visão Padrão) */}
          <div className="space-y-3 mt-8">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Desempenho por Colaborador</h3>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <Info className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase">Identifique quem brilha em cada horário e quem costuma dobrar turnos.</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="p-4 bg-slate-50 border-b border-r text-slate-600 font-black uppercase text-[10px] tracking-widest w-48 sticky left-0 z-10 shadow-[1px_0_0_#e2e8f0]">Colaborador</th>
                      <th className="p-4 bg-indigo-50/50 border-b border-r text-indigo-800 font-black uppercase text-[10px] tracking-widest text-center" colSpan={3}>
                        Manhã
                        <span className="text-[8px] font-medium opacity-75 block lowercase">
                          {selectedDay && isSundayOrHoliday(selectedDay) ? "(12h às 15h)" : selectedDay ? "(10h às 14h)" : "(10h-14h | Dom: 12h-15h)"}
                        </span>
                      </th>
                      <th className="p-4 bg-sky-50/50 border-b border-r text-sky-800 font-black uppercase text-[10px] tracking-widest text-center" colSpan={3}>
                        Tarde
                        <span className="text-[8px] font-medium opacity-75 block lowercase">
                          {selectedDay && isSundayOrHoliday(selectedDay) ? "(15h às 18h)" : selectedDay ? "(14h às 18h)" : "(14h-18h | Dom: 15h-18h)"}
                        </span>
                      </th>
                      <th className="p-4 bg-violet-50/50 border-b border-r text-violet-800 font-black uppercase text-[10px] tracking-widest text-center" colSpan={3}>
                        Noite
                        <span className="text-[8px] font-medium opacity-75 block lowercase">
                          {selectedDay && isSundayOrHoliday(selectedDay) ? "(18h às 21h)" : selectedDay ? "(18h às 22h)" : "(18h-22h | Dom: 18h-21h)"}
                        </span>
                      </th>
                      <th className="p-4 bg-slate-100 border-b text-slate-800 font-black uppercase text-[10px] tracking-widest text-center" colSpan={3}>Total</th>
                    </tr>
                    <tr>
                      <th className="p-2 border-b border-r bg-white sticky left-0 z-10 shadow-[1px_0_0_#e2e8f0]"></th>
                      {/* Manha */}
                      <th className="p-2 border-b bg-indigo-50/20 text-slate-500 font-bold text-[9px] uppercase text-center border-l">Vendas</th>
                      <th className="p-2 border-b bg-indigo-50/20 text-slate-500 font-bold text-[9px] uppercase text-center">TKM</th>
                      <th className="p-2 border-b border-r bg-indigo-50/20 text-slate-500 font-bold text-[9px] uppercase text-center">PA</th>
                      {/* Tarde */}
                      <th className="p-2 border-b bg-sky-50/20 text-slate-500 font-bold text-[9px] uppercase text-center border-l">Vendas</th>
                      <th className="p-2 border-b bg-sky-50/20 text-slate-500 font-bold text-[9px] uppercase text-center">TKM</th>
                      <th className="p-2 border-b border-r bg-sky-50/20 text-slate-500 font-bold text-[9px] uppercase text-center">PA</th>
                      {/* Noite */}
                      <th className="p-2 border-b bg-violet-50/20 text-slate-500 font-bold text-[9px] uppercase text-center border-l">Vendas</th>
                      <th className="p-2 border-b bg-violet-50/20 text-slate-500 font-bold text-[9px] uppercase text-center">TKM</th>
                      <th className="p-2 border-b border-r bg-violet-50/20 text-slate-500 font-bold text-[9px] uppercase text-center">PA</th>
                      {/* Total */}
                      <th className="p-2 border-b bg-slate-50 text-slate-600 font-black text-[9px] uppercase text-center border-l">Faturamento</th>
                      <th className="p-2 border-b bg-slate-50 text-slate-600 font-black text-[9px] uppercase text-center">TKM</th>
                      <th className="p-2 border-b bg-slate-50 text-slate-600 font-black text-[9px] uppercase text-center">PA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employeeMetrics.map((emp) => {
                      const safeCalc = (v: number, c: number) => c > 0 ? v / c : 0;
                      const renderCell = (metrics: typeof emp.manha, isTotal = false) => {
                        const hasData = metrics.cupons > 0;
                        if (!hasData) {
                          return (
                            <>
                              <td className={cn("p-3 text-center border-l text-slate-300 align-middle", isTotal && "bg-slate-50/50")}>-</td>
                              <td className={cn("p-3 text-center text-slate-300 align-middle", isTotal && "bg-slate-50/50")}>-</td>
                              <td className={cn("p-3 text-center border-r text-slate-300 align-middle", isTotal && "bg-slate-50/50")}>-</td>
                            </>
                          );
                        }
                        const tkm = safeCalc(metrics.vNF, metrics.cupons);
                        const pa = safeCalc(metrics.itens, metrics.cupons);

                        if (isTotal) {
                          return (
                            <>
                              <td className="p-3 text-center border-l bg-slate-50/50 align-middle">
                                <span className="font-black text-slate-800">{fmtBRL(metrics.vNF)}</span>
                                <span className="text-[9px] text-slate-500 font-bold block mt-0.5">{metrics.cupons} cp | {metrics.itens.toFixed(0)} it</span>
                              </td>
                              <td className="p-3 text-center font-bold text-slate-600 bg-slate-50/50 align-middle text-xs">{fmtBRL(tkm)}</td>
                              <td className="p-3 text-center font-bold text-slate-600 bg-slate-50/50 align-middle text-xs">{pa.toFixed(2)}</td>
                            </>
                          );
                        }

                        return (
                          <>
                            <td className="p-3 text-center border-l align-middle">
                              <span className="font-bold text-slate-700">{fmtBRL(metrics.vNF)}</span>
                              <span className="text-[9px] text-slate-400 block mt-0.5">{metrics.cupons} cp | {metrics.itens.toFixed(0)} it</span>
                            </td>
                            <td className="p-3 text-center text-xs font-bold text-slate-600 align-middle">{fmtBRL(tkm)}</td>
                            <td className="p-3 text-center text-xs font-bold text-slate-600 border-r align-middle">{pa.toFixed(2)}</td>
                          </>
                        );
                      };

                      return (
                        <tr key={emp.nome} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-black text-xs text-slate-700 border-r sticky left-0 bg-white shadow-[1px_0_0_#e2e8f0] group-hover:bg-slate-50 z-10">{emp.nome}</td>
                          {renderCell(emp.manha)}
                          {renderCell(emp.tarde)}
                          {renderCell(emp.noite)}
                          {renderCell(emp.total, true)}
                        </tr>
                      );
                    })}
                    {employeeMetrics.length === 0 && (
                      <tr>
                        <td colSpan={13} className="p-8 text-center text-slate-400 font-medium">
                          Nenhum dado encontrado para o filtro selecionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VARIAÇÃO DE TURNOS (Exclusivo da Análise Comparativa) */}
      {activeTab === "variacao" && comparisonMode && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Tabela de Variação dos Turnos da Loja */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden p-5 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">
                  Matriz de Variação de Performance da Loja por Turno
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                  Valores consolidados no Período A contra o Período B com deltas em Reais, Cupons e Índices
                </p>
              </div>
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-black uppercase w-fit">
                Fórmula: ((A - B) / B) * 100
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="p-3 font-black text-slate-600 uppercase text-[10px] tracking-wider">Turno</th>
                    <th className="p-3 font-black text-slate-600 uppercase text-[10px] tracking-wider text-center" colSpan={3}>Faturamento (R$)</th>
                    <th className="p-3 font-black text-slate-600 uppercase text-[10px] tracking-wider text-center border-l" colSpan={3}>Cupons</th>
                    <th className="p-3 font-black text-slate-600 uppercase text-[10px] tracking-wider text-center border-l" colSpan={3}>Ticket Médio (TKM)</th>
                    <th className="p-3 font-black text-slate-600 uppercase text-[10px] tracking-wider text-center border-l" colSpan={3}>P.A. (Peças/Cupom)</th>
                  </tr>
                  <tr className="border-b border-slate-200 bg-slate-50/30 text-[9px] text-slate-400 font-bold uppercase">
                    <th className="p-2"></th>
                    <th className="p-2 text-center text-indigo-700">Período A</th>
                    <th className="p-2 text-center text-violet-700">Período B</th>
                    <th className="p-2 text-center text-slate-700">Variação %</th>
                    <th className="p-2 text-center text-indigo-700 border-l">A</th>
                    <th className="p-2 text-center text-violet-700">B</th>
                    <th className="p-2 text-center text-slate-700">Variação %</th>
                    <th className="p-2 text-center text-indigo-700 border-l">A</th>
                    <th className="p-2 text-center text-violet-700">B</th>
                    <th className="p-2 text-center text-slate-700">Variação %</th>
                    <th className="p-2 text-center text-indigo-700 border-l">A</th>
                    <th className="p-2 text-center text-violet-700">B</th>
                    <th className="p-2 text-center text-slate-700">Variação %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(["manha", "tarde", "noite"] as const).map((sKey) => {
                    const sName = sKey === "manha" ? "Manhã" : sKey === "tarde" ? "Tarde" : "Noite";
                    const sA = comparisonResult.periodA.shifts[sKey];
                    const sB = comparisonResult.periodB.shifts[sKey];
                    const v = comparisonResult.shifts[sKey];

                    return (
                      <tr key={sKey} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-black text-xs text-indigo-900 uppercase">
                          {sName}
                        </td>
                        {/* Faturamento */}
                        <td className="p-3 text-center font-bold text-slate-700">{fmtBRL(sA.vNF)}</td>
                        <td className="p-3 text-center font-bold text-slate-500">{fmtBRL(sB.vNF)}</td>
                        <td className="p-3 text-center">{renderVariationBadge(v.vNF, true)}</td>
                        {/* Cupons */}
                        <td className="p-3 text-center font-bold text-slate-700 border-l">{sA.cupons}</td>
                        <td className="p-3 text-center font-bold text-slate-500">{sB.cupons}</td>
                        <td className="p-3 text-center">{renderVariationBadge(v.cupons, false, true)}</td>
                        {/* TKM */}
                        <td className="p-3 text-center font-bold text-slate-700 border-l">{fmtBRL(sA.tkm)}</td>
                        <td className="p-3 text-center font-bold text-slate-500">{fmtBRL(sB.tkm)}</td>
                        <td className="p-3 text-center">{renderVariationBadge(v.tkm, true)}</td>
                        {/* PA */}
                        <td className="p-3 text-center font-bold text-slate-700 border-l">{sA.pa.toFixed(2)}</td>
                        <td className="p-3 text-center font-bold text-slate-500">{sB.pa.toFixed(2)}</td>
                        <td className="p-3 text-center">{renderVariationBadge(v.pa, false)}</td>
                      </tr>
                    );
                  })}
                  {/* Linha Total Loja */}
                  <tr className="bg-slate-50/90 font-black border-t-2 border-slate-300">
                    <td className="p-3 text-xs uppercase text-slate-900 font-black">Total Loja</td>
                    {/* Faturamento */}
                    <td className="p-3 text-center text-slate-900 font-black">{fmtBRL(comparisonResult.periodA.total.vNF)}</td>
                    <td className="p-3 text-center text-slate-600 font-bold">{fmtBRL(comparisonResult.periodB.total.vNF)}</td>
                    <td className="p-3 text-center">{renderVariationBadge(comparisonResult.total.vNF, true)}</td>
                    {/* Cupons */}
                    <td className="p-3 text-center text-slate-900 font-black border-l">{comparisonResult.periodA.total.cupons}</td>
                    <td className="p-3 text-center text-slate-600 font-bold">{comparisonResult.periodB.total.cupons}</td>
                    <td className="p-3 text-center">{renderVariationBadge(comparisonResult.total.cupons, false, true)}</td>
                    {/* TKM */}
                    <td className="p-3 text-center text-slate-900 font-black border-l">{fmtBRL(comparisonResult.periodA.total.tkm)}</td>
                    <td className="p-3 text-center text-slate-600 font-bold">{fmtBRL(comparisonResult.periodB.total.tkm)}</td>
                    <td className="p-3 text-center">{renderVariationBadge(comparisonResult.total.tkm, true)}</td>
                    {/* PA */}
                    <td className="p-3 text-center text-slate-900 font-black border-l">{comparisonResult.periodA.total.pa.toFixed(2)}</td>
                    <td className="p-3 text-center text-slate-600 font-bold">{comparisonResult.periodB.total.pa.toFixed(2)}</td>
                    <td className="p-3 text-center">{renderVariationBadge(comparisonResult.total.pa, false)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabela de Variação por Colaborador */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden p-5 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">
                  Variação de Desempenho por Colaborador
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                  Evolução individual entre os períodos selecionados no consolidado e por turno
                </p>
              </div>
              <span className="text-xs text-slate-500 font-bold">
                {comparisonResult.employeeComparison.length} colaboradores analisados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="p-3 font-black text-slate-600 uppercase text-[10px] tracking-wider w-44 sticky left-0 bg-slate-50 z-10 shadow-[1px_0_0_#e2e8f0]">
                      Colaborador
                    </th>
                    <th className="p-3 font-black text-slate-600 uppercase text-[10px] tracking-wider text-center" colSpan={3}>
                      Faturamento Total
                    </th>
                    <th className="p-3 font-black text-slate-600 uppercase text-[10px] tracking-wider text-center border-l" colSpan={2}>
                      Cupons Total
                    </th>
                    <th className="p-3 font-black text-indigo-800 uppercase text-[10px] tracking-wider text-center border-l" colSpan={2}>
                      Manhã (Variação)
                    </th>
                    <th className="p-3 font-black text-sky-800 uppercase text-[10px] tracking-wider text-center border-l" colSpan={2}>
                      Tarde (Variação)
                    </th>
                    <th className="p-3 font-black text-violet-800 uppercase text-[10px] tracking-wider text-center border-l" colSpan={2}>
                      Noite (Variação)
                    </th>
                  </tr>
                  <tr className="border-b border-slate-200 bg-slate-50/30 text-[9px] text-slate-400 font-bold uppercase">
                    <th className="p-2 sticky left-0 bg-white z-10 shadow-[1px_0_0_#e2e8f0]"></th>
                    <th className="p-2 text-center text-indigo-700">Período A</th>
                    <th className="p-2 text-center text-violet-700">Período B</th>
                    <th className="p-2 text-center text-slate-700">Variação %</th>
                    <th className="p-2 text-center text-slate-600 border-l">A vs B</th>
                    <th className="p-2 text-center text-slate-700">Var %</th>
                    <th className="p-2 text-center text-indigo-700 border-l">Vendas</th>
                    <th className="p-2 text-center text-indigo-700">Var %</th>
                    <th className="p-2 text-center text-sky-700 border-l">Vendas</th>
                    <th className="p-2 text-center text-sky-700">Var %</th>
                    <th className="p-2 text-center text-violet-700 border-l">Vendas</th>
                    <th className="p-2 text-center text-violet-700">Var %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonResult.employeeComparison.map((emp) => {
                    return (
                      <tr key={emp.nome} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-black text-xs text-slate-800 sticky left-0 bg-white z-10 shadow-[1px_0_0_#e2e8f0]">
                          {emp.nome}
                        </td>
                        {/* Faturamento Total */}
                        <td className="p-3 text-center font-bold text-slate-800">{fmtBRL(emp.totalVNF.valA)}</td>
                        <td className="p-3 text-center font-medium text-slate-500">{fmtBRL(emp.totalVNF.valB)}</td>
                        <td className="p-3 text-center">{renderVariationBadge(emp.totalVNF, true)}</td>
                        {/* Cupons */}
                        <td className="p-3 text-center text-slate-700 font-semibold border-l">
                          {emp.totalCupons.valA} <span className="text-slate-300">/</span> {emp.totalCupons.valB}
                        </td>
                        <td className="p-3 text-center">{renderVariationBadge(emp.totalCupons, false, true)}</td>
                        {/* Manhã */}
                        <td className="p-3 text-center font-bold text-slate-700 border-l">{fmtBRL(emp.byShift.manha.vNF.valA)}</td>
                        <td className="p-3 text-center">{renderVariationBadge(emp.byShift.manha.vNF, true)}</td>
                        {/* Tarde */}
                        <td className="p-3 text-center font-bold text-slate-700 border-l">{fmtBRL(emp.byShift.tarde.vNF.valA)}</td>
                        <td className="p-3 text-center">{renderVariationBadge(emp.byShift.tarde.vNF, true)}</td>
                        {/* Noite */}
                        <td className="p-3 text-center font-bold text-slate-700 border-l">{fmtBRL(emp.byShift.noite.vNF.valA)}</td>
                        <td className="p-3 text-center">{renderVariationBadge(emp.byShift.noite.vNF, true)}</td>
                      </tr>
                    );
                  })}
                  {comparisonResult.employeeComparison.length === 0 && (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-slate-400 font-medium">
                        Nenhum colaborador encontrado com dados para os períodos selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MAPA DE CALOR */}
      {activeTab === "mapa" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
            <div>
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-black text-slate-700 uppercase tracking-widest">Mapa de Calor (Feedback)</h3>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-1">Identifique padrões de desempenho visualmente. Verde indica alta performance no turno, vermelho indica necessidade de ajuste.</p>
            </div>
            
            <div className="flex bg-slate-100 p-1.5 rounded-xl self-start md:self-auto border border-slate-200 shadow-inner">
              <button onClick={() => setHeatmapMetric("vNF")} className={cn("px-4 py-1.5 text-xs font-black uppercase rounded-lg transition-all", heatmapMetric === "vNF" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:text-slate-700")}>Faturamento</button>
              <button onClick={() => setHeatmapMetric("tkm")} className={cn("px-4 py-1.5 text-xs font-black uppercase rounded-lg transition-all", heatmapMetric === "tkm" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:text-slate-700")}>TKM</button>
              <button onClick={() => setHeatmapMetric("pa")} className={cn("px-4 py-1.5 text-xs font-black uppercase rounded-lg transition-all", heatmapMetric === "pa" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:text-slate-700")}>P.A.</button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* General Heatmap */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 overflow-hidden flex flex-col">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Geral da Loja (Por Dia)</h4>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm border-collapse min-w-[400px]">
                  <thead>
                    <tr>
                      <th className="p-2 border-b text-slate-500 font-bold uppercase text-[10px]">Data</th>
                      <th className="p-2 border-b text-center text-slate-500 font-bold uppercase text-[10px]">Manhã</th>
                      <th className="p-2 border-b text-center text-slate-500 font-bold uppercase text-[10px]">Tarde</th>
                      <th className="p-2 border-b text-center text-slate-500 font-bold uppercase text-[10px]">Noite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyMetrics.map((d) => {
                      const mVal = getMetricValue(d.manha, heatmapMetric);
                      const tVal = getMetricValue(d.tarde, heatmapMetric);
                      const nVal = getMetricValue(d.noite, heatmapMetric);
                      return (
                        <tr key={d.data} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2 font-bold text-xs text-slate-600 border-b border-r">
                            <div className="flex items-center gap-1.5">
                              <span>{format(parseISO(d.data), "dd/MM (EEE)", { locale: ptBR }).toUpperCase()}</span>
                              {isSundayOrHoliday(d.data) && (
                                <span className="text-[8px] font-black px-1 py-0.5 rounded bg-amber-100 text-amber-800">
                                  {getDay(parseISO(d.data)) === 0 ? "DOM" : "FER"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={cn("p-2 text-center text-xs font-bold border-b border-r transition-colors", getHeatmapColor(mVal, dailyStats.manha.min, dailyStats.manha.max))}>
                            {fmtMetric(mVal, heatmapMetric)}
                          </td>
                          <td className={cn("p-2 text-center text-xs font-bold border-b border-r transition-colors", getHeatmapColor(tVal, dailyStats.tarde.min, dailyStats.tarde.max))}>
                            {fmtMetric(tVal, heatmapMetric)}
                          </td>
                          <td className={cn("p-2 text-center text-xs font-bold border-b transition-colors", getHeatmapColor(nVal, dailyStats.noite.min, dailyStats.noite.max))}>
                            {fmtMetric(nVal, heatmapMetric)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Employee Heatmap */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 overflow-hidden flex flex-col">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Colaboradores</h4>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm border-collapse min-w-[400px]">
                  <thead>
                    <tr>
                      <th className="p-2 border-b text-slate-500 font-bold uppercase text-[10px] sticky left-0 bg-white shadow-[1px_0_0_#e2e8f0] z-10">Colaborador</th>
                      <th className="p-2 border-b text-center text-slate-500 font-bold uppercase text-[10px]">Manhã</th>
                      <th className="p-2 border-b text-center text-slate-500 font-bold uppercase text-[10px]">Tarde</th>
                      <th className="p-2 border-b text-center text-slate-500 font-bold uppercase text-[10px]">Noite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeMetrics.map((emp) => {
                      const mVal = getMetricValue(emp.manha, heatmapMetric);
                      const tVal = getMetricValue(emp.tarde, heatmapMetric);
                      const nVal = getMetricValue(emp.noite, heatmapMetric);
                      return (
                        <tr key={emp.nome} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2 font-black text-[11px] text-slate-700 border-b border-r sticky left-0 bg-white shadow-[1px_0_0_#e2e8f0] z-10">
                            {emp.nome.length > 18 ? emp.nome.substring(0, 18) + '...' : emp.nome}
                          </td>
                          <td className={cn("p-2 text-center text-xs font-bold border-b border-r transition-colors", getHeatmapColor(mVal, empStats.manha.min, empStats.manha.max))}>
                            {fmtMetric(mVal, heatmapMetric)}
                          </td>
                          <td className={cn("p-2 text-center text-xs font-bold border-b border-r transition-colors", getHeatmapColor(tVal, empStats.tarde.min, empStats.tarde.max))}>
                            {fmtMetric(tVal, heatmapMetric)}
                          </td>
                          <td className={cn("p-2 text-center text-xs font-bold border-b transition-colors", getHeatmapColor(nVal, empStats.noite.min, empStats.noite.max))}>
                            {fmtMetric(nVal, heatmapMetric)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter mt-4 justify-end bg-slate-50 p-2 rounded-xl w-fit ml-auto border border-slate-100">
            <span className="text-slate-400 mr-1">Legenda (relativo ao turno):</span>
            <div className="flex items-center"><div className="w-3 h-3 bg-rose-500 rounded-sm mr-1 border border-rose-600"></div> Baixo</div>
            <div className="flex items-center ml-1"><div className="w-3 h-3 bg-amber-100 rounded-sm mr-1 border border-amber-200"></div> Médio</div>
            <div className="flex items-center ml-1"><div className="w-3 h-3 bg-emerald-500 rounded-sm mr-1 border border-emerald-600"></div> Alto</div>
          </div>
        </div>
      )}
    </div>
  );
}
