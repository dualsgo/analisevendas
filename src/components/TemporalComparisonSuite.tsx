"use client";

import React, { useState, useMemo } from "react";
import { 
  FullBasketQualityReport, 
  WeekComparisonMetric, 
  MonthComparisonMetric, 
  DayOfWeekDetailedEvolution,
  BasketQualityMetrics
} from "@/lib/basket-quality-analytics";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from "recharts";
import { 
  CalendarRange, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Scale, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  Layers, 
  Sparkles,
  BarChart3,
  CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TemporalComparisonSuiteProps {
  report: FullBasketQualityReport;
}

type ComparisonMode = "WOW" | "MOM" | "DOW_EVOLUTION" | "CUSTOM_PAIR";

export function TemporalComparisonSuite({ report }: TemporalComparisonSuiteProps) {
  const [mode, setMode] = useState<ComparisonMode>("WOW");
  const [selectedDowIndex, setSelectedDowIndex] = useState<number>(1); // 1 = Segunda por padrão
  
  const { weeklyComparison = [], monthlyComparison = [], dayOfWeekEvolution = [], daysOfWeek = [] } = report;

  // Seleção de períodos para o Comparador A vs B
  const [periodAType, setPeriodAType] = useState<"WEEK" | "MONTH">("WEEK");
  const [periodAIndex, setPeriodAIndex] = useState<number>(0);
  const [periodBIndex, setPeriodBIndex] = useState<number>(
    weeklyComparison.length > 1 ? weeklyComparison.length - 1 : 0
  );

  // 1. CÁLCULO DE DELTAS SEMANA A SEMANA (WoW)
  const weeklyWithDeltas = useMemo(() => {
    return weeklyComparison.map((w, idx) => {
      if (idx === 0) {
        return {
          ...w,
          deltaPA: 0,
          deltaPASustentado: 0,
          deltaUnitRate: 0,
          deltaTwoItemsRate: 0,
          deltaThreePlusRate: 0,
          deltaRevenue: 0,
          deltaCoupons: 0,
          verdict: "BASE" as const
        };
      }
      const prev = weeklyComparison[idx - 1].metrics;
      const curr = w.metrics;

      const deltaPA = curr.paReal - prev.paReal;
      const deltaPASustentado = curr.paOperacional1to5 - prev.paOperacional1to5;
      const deltaUnitRate = curr.unitRate - prev.unitRate; // Queda de unitRate é POSITIVA
      const deltaTwoItemsRate = curr.twoItemsRate - prev.twoItemsRate; // Aumento de 2 itens é POSITIVO
      const deltaThreePlusRate = curr.threePlusRate - prev.threePlusRate;
      const deltaRevenue = curr.totalVenda - prev.totalVenda;
      const deltaCoupons = curr.totalCupons - prev.totalCupons;

      // Classificação de Evolução
      let verdict: "MELHORA" | "OURO" | "ESTAVEL" | "ATENCAO" = "ESTAVEL";
      if (curr.unitRate <= 50 && curr.twoItemsRate >= 30) {
        verdict = "OURO";
      } else if (deltaUnitRate <= -2.0 || deltaTwoItemsRate >= 1.5 || deltaPASustentado >= 0.08) {
        verdict = "MELHORA";
      } else if (deltaUnitRate >= 3.0 || deltaTwoItemsRate <= -2.0 || deltaPASustentado <= -0.08) {
        verdict = "ATENCAO";
      }

      return {
        ...w,
        deltaPA,
        deltaPASustentado,
        deltaUnitRate,
        deltaTwoItemsRate,
        deltaThreePlusRate,
        deltaRevenue,
        deltaCoupons,
        verdict
      };
    });
  }, [weeklyComparison]);

  // 2. CÁLCULO DE DELTAS MÊS A MÊS (MoM)
  const monthlyWithDeltas = useMemo(() => {
    return monthlyComparison.map((m, idx) => {
      if (idx === 0) {
        return {
          ...m,
          deltaPA: 0,
          deltaPASustentado: 0,
          deltaUnitRate: 0,
          deltaTwoItemsRate: 0,
          deltaThreePlusRate: 0,
          deltaRevenue: 0,
          deltaCoupons: 0,
          verdict: "BASE" as const
        };
      }
      const prev = monthlyComparison[idx - 1].metrics;
      const curr = m.metrics;

      const deltaPA = curr.paReal - prev.paReal;
      const deltaPASustentado = curr.paOperacional1to5 - prev.paOperacional1to5;
      const deltaUnitRate = curr.unitRate - prev.unitRate;
      const deltaTwoItemsRate = curr.twoItemsRate - prev.twoItemsRate;
      const deltaThreePlusRate = curr.threePlusRate - prev.threePlusRate;
      const deltaRevenue = curr.totalVenda - prev.totalVenda;
      const deltaCoupons = curr.totalCupons - prev.totalCupons;

      let verdict: "MELHORA" | "OURO" | "ESTAVEL" | "ATENCAO" = "ESTAVEL";
      if (curr.unitRate <= 50 && curr.twoItemsRate >= 30) {
        verdict = "OURO";
      } else if (deltaUnitRate <= -1.5 || deltaTwoItemsRate >= 1.0 || deltaPASustentado >= 0.05) {
        verdict = "MELHORA";
      } else if (deltaUnitRate >= 2.5 || deltaTwoItemsRate <= -1.5 || deltaPASustentado <= -0.05) {
        verdict = "ATENCAO";
      }

      return {
        ...m,
        deltaPA,
        deltaPASustentado,
        deltaUnitRate,
        deltaTwoItemsRate,
        deltaThreePlusRate,
        deltaRevenue,
        deltaCoupons,
        verdict
      };
    });
  }, [monthlyComparison]);

  // 3. EVOLUÇÃO DO DIA DA SEMANA ESCOLHIDO (Ex: Todas as Segundas-feiras)
  const activeDowEvolution = useMemo(() => {
    return dayOfWeekEvolution.find(d => d.dayIndex === selectedDowIndex) || dayOfWeekEvolution[0];
  }, [dayOfWeekEvolution, selectedDowIndex]);

  const activeDowOccurrencesWithDeltas = useMemo(() => {
    if (!activeDowEvolution) return [];
    return activeDowEvolution.occurrences.map((occ, idx, arr) => {
      if (idx === 0) {
        return {
          ...occ,
          deltaPA: 0,
          deltaUnitRate: 0,
          deltaTwoItemsRate: 0
        };
      }
      const prev = arr[idx - 1].metrics;
      const curr = occ.metrics;
      return {
        ...occ,
        deltaPA: curr.paReal - prev.paReal,
        deltaUnitRate: curr.unitRate - prev.unitRate,
        deltaTwoItemsRate: curr.twoItemsRate - prev.twoItemsRate
      };
    });
  }, [activeDowEvolution]);

  // 4. COMPARADOR A vs B
  const pairComparison = useMemo(() => {
    let itemA: { label: string; metrics: BasketQualityMetrics } | null = null;
    let itemB: { label: string; metrics: BasketQualityMetrics } | null = null;

    if (periodAType === "WEEK") {
      if (weeklyComparison[periodAIndex]) {
        itemA = {
          label: `${weeklyComparison[periodAIndex].weekKey} (${weeklyComparison[periodAIndex].dateRangeLabel})`,
          metrics: weeklyComparison[periodAIndex].metrics
        };
      }
      if (weeklyComparison[periodBIndex]) {
        itemB = {
          label: `${weeklyComparison[periodBIndex].weekKey} (${weeklyComparison[periodBIndex].dateRangeLabel})`,
          metrics: weeklyComparison[periodBIndex].metrics
        };
      }
    } else {
      if (monthlyComparison[periodAIndex]) {
        itemA = {
          label: monthlyComparison[periodAIndex].monthLabel,
          metrics: monthlyComparison[periodAIndex].metrics
        };
      }
      if (monthlyComparison[periodBIndex]) {
        itemB = {
          label: monthlyComparison[periodBIndex].monthLabel,
          metrics: monthlyComparison[periodBIndex].metrics
        };
      }
    }

    if (!itemA || !itemB) return null;

    const mA = itemA.metrics;
    const mB = itemB.metrics;

    return {
      periodA: itemA,
      periodB: itemB,
      deltaPA: mB.paReal - mA.paReal,
      deltaPASustentado: mB.paOperacional1to5 - mA.paOperacional1to5,
      deltaUnitRate: mB.unitRate - mA.unitRate,
      deltaTwoItemsRate: mB.twoItemsRate - mA.twoItemsRate,
      deltaThreePlusRate: mB.threePlusRate - mA.threePlusRate,
      deltaRevenue: mB.totalVenda - mA.totalVenda,
      pctRevenueDiff: mA.totalVenda > 0 ? ((mB.totalVenda - mA.totalVenda) / mA.totalVenda) * 100 : 0,
      deltaCoupons: mB.totalCupons - mA.totalCupons,
      pctCouponsDiff: mA.totalCupons > 0 ? ((mB.totalCupons - mA.totalCupons) / mA.totalCupons) * 100 : 0
    };
  }, [periodAType, periodAIndex, periodBIndex, weeklyComparison, monthlyComparison]);

  const formatDeltaPercent = (val: number, invertSentiment = false) => {
    if (Math.abs(val) < 0.05) {
      return (
        <span className="inline-flex items-center text-slate-400 font-bold text-xs gap-0.5">
          <Minus className="w-3 h-3" /> 0.0%
        </span>
      );
    }
    const isPositive = val > 0;
    // Para taxa de 1 item, queda (val < 0) é BOA (verde) e aumento (val > 0) é RUIM (vermelho)
    const isGood = invertSentiment ? !isPositive : isPositive;

    return (
      <span className={cn(
        "inline-flex items-center font-black text-xs gap-0.5",
        isGood ? "text-emerald-600" : "text-rose-600"
      )}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isPositive ? `+${val.toFixed(1)}%` : `${val.toFixed(1)}%`}
      </span>
    );
  };

  const formatDeltaPA = (val: number) => {
    if (Math.abs(val) < 0.01) {
      return (
        <span className="inline-flex items-center text-slate-400 font-bold text-xs gap-0.5">
          <Minus className="w-3 h-3" /> 0.00
        </span>
      );
    }
    const isPositive = val > 0;
    return (
      <span className={cn(
        "inline-flex items-center font-black text-xs gap-0.5",
        isPositive ? "text-emerald-600" : "text-rose-600"
      )}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isPositive ? `+${val.toFixed(2)}` : val.toFixed(2)}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. SELETOR DE MODO DE COMPARAÇÃO TEMPORAL */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-tight">
              Análise Temporal de Variação & Comparativos (Δ)
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              Avalie se a loja e as equipes estão melhorando ou regredindo a sustentação das cestas ao longo do tempo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={mode === "WOW" ? "default" : "outline"}
            onClick={() => setMode("WOW")}
            className={cn("h-8 text-xs font-bold rounded-xl", mode === "WOW" && "bg-indigo-600 text-white")}
          >
            <CalendarRange className="w-3.5 h-3.5 mr-1" />
            Semana a Semana (WoW)
          </Button>

          <Button
            size="sm"
            variant={mode === "MOM" ? "default" : "outline"}
            onClick={() => setMode("MOM")}
            className={cn("h-8 text-xs font-bold rounded-xl", mode === "MOM" && "bg-indigo-600 text-white")}
          >
            <Calendar className="w-3.5 h-3.5 mr-1" />
            Mês a Mês (MoM)
          </Button>

          <Button
            size="sm"
            variant={mode === "DOW_EVOLUTION" ? "default" : "outline"}
            onClick={() => setMode("DOW_EVOLUTION")}
            className={cn("h-8 text-xs font-bold rounded-xl", mode === "DOW_EVOLUTION" && "bg-indigo-600 text-white")}
          >
            <CalendarDays className="w-3.5 h-3.5 mr-1" />
            Dia vs Dia da Semana
          </Button>

          <Button
            size="sm"
            variant={mode === "CUSTOM_PAIR" ? "default" : "outline"}
            onClick={() => setMode("CUSTOM_PAIR")}
            className={cn("h-8 text-xs font-bold rounded-xl", mode === "CUSTOM_PAIR" && "bg-indigo-600 text-white")}
          >
            <Scale className="w-3.5 h-3.5 mr-1" />
            Comparador A vs B
          </Button>
        </div>
      </div>

      {/* 2. MODO: SEMANA A SEMANA (WoW) */}
      {mode === "WOW" && (
        <div className="space-y-6">
          <Card className="ri-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <CalendarRange className="w-5 h-5 text-indigo-600" />
                  Evolução Semana a Semana (Week-over-Week) & Variações (Δ)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Acompanhe a variação do PA e a contração da monopeça (1 item) semana após semana.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-bold border-slate-200">
                {weeklyComparison.length} semanas registradas
              </Badge>
            </div>

            {/* Gráfico de Tendência WoW */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyWithDeltas} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="weekKey" tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
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
                  <Line yAxisId="left" type="monotone" dataKey="metrics.paReal" name="PA Real" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                  <Line yAxisId="left" type="monotone" dataKey="metrics.paOperacional1to5" name="PA Sustentado" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="metrics.unitRate" name="% 1 Item (Meta ≤ 55%)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="metrics.twoItemsRate" name="% 2 Itens (Meta ≥ 28%)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela Semana a Semana com Deltas */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-10">
                    <TableHead className="text-[10px] font-black uppercase text-slate-600">Semana</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Cupons</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">PA Real</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-emerald-700 text-center">PA Sustentado</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Δ PA Sust.</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 1 Item (≤ 55%)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Δ % 1 Item</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 2 Itens (≥ 28%)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Δ % 2 Itens</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Diagnóstico / Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklyWithDeltas.map((w, idx) => (
                    <TableRow key={w.weekKey} className="h-12 hover:bg-slate-50/80">
                      <TableCell className="font-black text-slate-900 text-xs">
                        <div>
                          <span>{w.weekKey}</span>
                          <span className="text-[10px] text-slate-400 font-normal ml-1.5">({w.dateRangeLabel})</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{w.metrics.totalCupons}</TableCell>
                      <TableCell className="text-center font-black text-slate-900 text-sm">{w.metrics.paReal.toFixed(2)}</TableCell>
                      <TableCell className="text-center font-black text-emerald-700 text-sm">{w.metrics.paOperacional1to5.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        {idx === 0 ? <span className="text-slate-400 text-xs font-semibold">Base</span> : formatDeltaPA(w.deltaPASustentado)}
                      </TableCell>
                      <TableCell className={cn("text-center font-bold text-xs", w.metrics.unitRate <= 55 ? "text-emerald-700" : "text-rose-600")}>
                        {w.metrics.unitRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        {idx === 0 ? <span className="text-slate-400 text-xs font-semibold">Base</span> : formatDeltaPercent(w.deltaUnitRate, true)}
                      </TableCell>
                      <TableCell className={cn("text-center font-bold text-xs", w.metrics.twoItemsRate >= 28 ? "text-emerald-700" : "text-amber-600")}>
                        {w.metrics.twoItemsRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        {idx === 0 ? <span className="text-slate-400 text-xs font-semibold">Base</span> : formatDeltaPercent(w.deltaTwoItemsRate, false)}
                      </TableCell>
                      <TableCell className="text-center">
                        {w.verdict === "OURO" ? (
                          <Badge className="bg-emerald-600 text-white text-[9px] font-black uppercase">★ Padrão Ouro</Badge>
                        ) : w.verdict === "MELHORA" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold uppercase">▲ Em Evolução</Badge>
                        ) : w.verdict === "ATENCAO" ? (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[9px] font-bold uppercase">▼ Recuo / Atenção</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[9px] font-bold uppercase">Estável</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* 3. MODO: MÊS A MÊS (MoM) */}
      {mode === "MOM" && (
        <div className="space-y-6">
          <Card className="ri-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  Evolução Mês a Mês (Month-over-Month) & Variações (Δ)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Audite o desempenho acumulado de cada mês com diagnóstico de aderência às metas da loja.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-bold border-slate-200">
                {monthlyComparison.length} meses analisados
              </Badge>
            </div>

            {/* Gráfico MoM */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyWithDeltas} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="monthShort" tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    formatter={(val: any, name: string) => [
                      `${Number(val).toFixed(1)}%`,
                      name
                    ]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px", fontWeight: 700 }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingTop: "10px" }} />
                  <Bar dataKey="metrics.unitRate" name="% 1 Item (Meta ≤ 55%)" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="metrics.twoItemsRate" name="% 2 Itens (Meta ≥ 28%)" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="metrics.threePlusRate" name="% 3+ Itens (Meta ≥ 17%)" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela MoM com Deltas */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-10">
                    <TableHead className="text-[10px] font-black uppercase text-slate-600">Mês</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Cupons</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">PA Real</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-emerald-700 text-center">PA Sustentado</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Δ PA Sust.</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 1 Item (≤ 55%)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Δ % 1 Item</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 2 Itens (≥ 28%)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Δ % 2 Itens</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Faturamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyWithDeltas.map((m, idx) => (
                    <TableRow key={m.monthKey} className="h-12 hover:bg-slate-50/80">
                      <TableCell className="font-black text-slate-900 text-xs">
                        {m.monthLabel}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{(m.metrics.totalCupons ?? 0).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-center font-black text-slate-900 text-sm">{(m.metrics.paReal ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-center font-black text-emerald-700 text-sm">{(m.metrics.paOperacional1to5 ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        {idx === 0 ? <span className="text-slate-400 text-xs font-semibold">Base</span> : formatDeltaPA(m.deltaPASustentado)}
                      </TableCell>
                      <TableCell className={cn("text-center font-bold text-xs", m.metrics.unitRate <= 55 ? "text-emerald-700" : "text-rose-600")}>
                        {(m.metrics.unitRate ?? 0).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        {idx === 0 ? <span className="text-slate-400 text-xs font-semibold">Base</span> : formatDeltaPercent(m.deltaUnitRate, true)}
                      </TableCell>
                      <TableCell className={cn("text-center font-bold text-xs", m.metrics.twoItemsRate >= 28 ? "text-emerald-700" : "text-amber-600")}>
                        {(m.metrics.twoItemsRate ?? 0).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        {idx === 0 ? <span className="text-slate-400 text-xs font-semibold">Base</span> : formatDeltaPercent(m.deltaTwoItemsRate, false)}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700 text-xs">
                        R$ {(m.metrics.totalVenda ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* 4. MODO: DIA DA SEMANA VS DIA DA SEMANA (Ex: Segundas vs Segundas) */}
      {mode === "DOW_EVOLUTION" && (
        <div className="space-y-6">
          <Card className="ri-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-indigo-600" />
                  Evolução Histórica por Dia da Semana Específico
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Compare as ocorrências de um mesmo dia da semana (ex: todas as segundas ou todos os sábados) para ver a curva de aprendizado.
                </p>
              </div>

              {/* Seletor de Dia da Semana */}
              <div className="flex flex-wrap items-center gap-1">
                {daysOfWeek.map(dow => (
                  <Button
                    key={dow.dayIndex}
                    size="sm"
                    variant={selectedDowIndex === dow.dayIndex ? "default" : "outline"}
                    onClick={() => setSelectedDowIndex(dow.dayIndex)}
                    className={cn(
                      "h-8 text-xs font-bold rounded-xl",
                      selectedDowIndex === dow.dayIndex && "bg-indigo-600 text-white"
                    )}
                  >
                    {dow.dayShort} ({dow.totalDays}d)
                  </Button>
                ))}
              </div>
            </div>

            {/* Resumo do Dia Selecionado */}
            {activeDowEvolution && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Total de {activeDowEvolution.dayName}s</span>
                  <p className="text-2xl font-black text-slate-900">{activeDowEvolution.totalDays} dias</p>
                  <p className="text-[10px] text-slate-500">{activeDowEvolution.aggregateMetrics.totalCupons} cupons no total</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">PA Médio Acumulado</span>
                  <p className="text-2xl font-black text-indigo-600">{activeDowEvolution.aggregateMetrics.paReal.toFixed(2)}</p>
                  <p className="text-[10px] text-emerald-600 font-bold">Sustentado: {activeDowEvolution.aggregateMetrics.paOperacional1to5.toFixed(2)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">% 1 Item Médio</span>
                  <p className={cn("text-2xl font-black", activeDowEvolution.aggregateMetrics.unitRate <= 55 ? "text-emerald-600" : "text-rose-600")}>
                    {activeDowEvolution.aggregateMetrics.unitRate.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-slate-500">Meta: ≤ 55%</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">% 2 Itens Médio</span>
                  <p className={cn("text-2xl font-black", activeDowEvolution.aggregateMetrics.twoItemsRate >= 28 ? "text-emerald-600" : "text-amber-600")}>
                    {activeDowEvolution.aggregateMetrics.twoItemsRate.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-slate-500">Meta: ≥ 28%</p>
                </div>
              </div>
            )}

            {/* Tabela de Ocorrências com Deltas */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-10">
                    <TableHead className="text-[10px] font-black uppercase text-slate-600">Data ({activeDowEvolution?.dayName})</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Cupons</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">PA Real</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Δ vs Anterior</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 1 Item (≤ 55%)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Δ % 1 Item</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 2 Itens (≥ 28%)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Δ % 2 Itens</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Faturamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeDowOccurrencesWithDeltas.map((occ, idx) => (
                    <TableRow key={occ.date} className="h-11 hover:bg-slate-50/80">
                      <TableCell className="font-bold text-slate-900 text-xs">
                        {occ.dateFormatted}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{occ.metrics.totalCupons}</TableCell>
                      <TableCell className="text-center font-black text-slate-900 text-sm">{occ.metrics.paReal.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        {idx === 0 ? <span className="text-slate-400 text-xs font-semibold">Base</span> : formatDeltaPA(occ.deltaPA)}
                      </TableCell>
                      <TableCell className={cn("text-center font-bold text-xs", occ.metrics.unitRate <= 55 ? "text-emerald-700" : "text-rose-600")}>
                        {occ.metrics.unitRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        {idx === 0 ? <span className="text-slate-400 text-xs font-semibold">Base</span> : formatDeltaPercent(occ.deltaUnitRate, true)}
                      </TableCell>
                      <TableCell className={cn("text-center font-bold text-xs", occ.metrics.twoItemsRate >= 28 ? "text-emerald-700" : "text-amber-600")}>
                        {occ.metrics.twoItemsRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        {idx === 0 ? <span className="text-slate-400 text-xs font-semibold">Base</span> : formatDeltaPercent(occ.deltaTwoItemsRate, false)}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700 text-xs">
                        R$ {(occ.metrics.totalVenda ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* 5. MODO: COMPARADOR DIRETO A vs B */}
      {mode === "CUSTOM_PAIR" && (
        <div className="space-y-6">
          <Card className="ri-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Scale className="w-5 h-5 text-indigo-600" />
                  Comparador Direto Lado a Lado: Período A vs Período B
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Selecione dois períodos arbitrários para comparar o avanço das métricas de sustentação e receita.
                </p>
              </div>

              {/* Seletor de Tipo de Comparação */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={periodAType === "WEEK" ? "default" : "outline"}
                  onClick={() => setPeriodAType("WEEK")}
                  className={cn("h-8 text-xs font-bold rounded-xl", periodAType === "WEEK" && "bg-indigo-600 text-white")}
                >
                  Comparar Semanas
                </Button>
                <Button
                  size="sm"
                  variant={periodAType === "MONTH" ? "default" : "outline"}
                  onClick={() => setPeriodAType("MONTH")}
                  className={cn("h-8 text-xs font-bold rounded-xl", periodAType === "MONTH" && "bg-indigo-600 text-white")}
                >
                  Comparar Meses
                </Button>
              </div>
            </div>

            {/* Seletores de Período A e B */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-xs font-black uppercase text-indigo-700">Período A (Base):</label>
                <select
                  value={periodAIndex}
                  onChange={(e) => setPeriodAIndex(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                >
                  {periodAType === "WEEK"
                    ? weeklyComparison.map((w, idx) => (
                        <option key={w.weekKey} value={idx}>
                          {w.weekKey} ({w.dateRangeLabel})
                        </option>
                      ))
                    : monthlyComparison.map((m, idx) => (
                        <option key={m.monthKey} value={idx}>
                          {m.monthLabel}
                        </option>
                      ))}
                </select>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-xs font-black uppercase text-emerald-700">Período B (Comparativo):</label>
                <select
                  value={periodBIndex}
                  onChange={(e) => setPeriodBIndex(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                >
                  {periodAType === "WEEK"
                    ? weeklyComparison.map((w, idx) => (
                        <option key={w.weekKey} value={idx}>
                          {w.weekKey} ({w.dateRangeLabel})
                        </option>
                      ))
                    : monthlyComparison.map((m, idx) => (
                        <option key={m.monthKey} value={idx}>
                          {m.monthLabel}
                        </option>
                      ))}
                </select>
              </div>
            </div>

            {/* Painel de Resultados do Comparador A vs B */}
            {pairComparison && (
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="h-10">
                      <TableHead className="text-[10px] font-black uppercase text-slate-600">Métrica</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-indigo-700 text-center">
                        Período A ({pairComparison.periodA.label})
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-emerald-700 text-center">
                        Período B ({pairComparison.periodB.label})
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-700 text-center">
                        Variação Absoluta (Δ)
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-700 text-center">
                        Status / Impacto
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="h-12 hover:bg-slate-50/80">
                      <TableCell className="font-black text-slate-900 text-xs">PA Real Oficial</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{pairComparison.periodA.metrics.paReal.toFixed(2)}</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 text-sm">{pairComparison.periodB.metrics.paReal.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{formatDeltaPA(pairComparison.deltaPA)}</TableCell>
                      <TableCell className="text-center">
                        {pairComparison.deltaPA >= 0.05 ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold uppercase">▲ Crescimento</Badge>
                        ) : pairComparison.deltaPA <= -0.05 ? (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[9px] font-bold uppercase">▼ Queda</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[9px] font-bold uppercase">Estável</Badge>
                        )}
                      </TableCell>
                    </TableRow>

                    <TableRow className="h-12 hover:bg-slate-50/80">
                      <TableCell className="font-black text-slate-900 text-xs">PA Sustentado (Sem 6+)</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{pairComparison.periodA.metrics.paOperacional1to5.toFixed(2)}</TableCell>
                      <TableCell className="text-center font-bold text-emerald-700 text-sm">{pairComparison.periodB.metrics.paOperacional1to5.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{formatDeltaPA(pairComparison.deltaPASustentado)}</TableCell>
                      <TableCell className="text-center">
                        {pairComparison.deltaPASustentado >= 0.05 ? (
                          <Badge className="bg-emerald-600 text-white text-[9px] font-black uppercase">▲ Ganho Sustentável</Badge>
                        ) : pairComparison.deltaPASustentado <= -0.05 ? (
                          <Badge className="bg-rose-600 text-white text-[9px] font-black uppercase">▼ Perda de Base</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[9px] font-bold uppercase">Estável</Badge>
                        )}
                      </TableCell>
                    </TableRow>

                    <TableRow className="h-12 hover:bg-slate-50/80">
                      <TableCell className="font-black text-slate-900 text-xs">% 1 Item (Monopeça)</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{pairComparison.periodA.metrics.unitRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 text-sm">{pairComparison.periodB.metrics.unitRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-center">{formatDeltaPercent(pairComparison.deltaUnitRate, true)}</TableCell>
                      <TableCell className="text-center">
                        {pairComparison.deltaUnitRate <= -1.5 ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold uppercase">✓ Redução da Monopeça</Badge>
                        ) : pairComparison.deltaUnitRate >= 1.5 ? (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[9px] font-bold uppercase">⚠ Aumento da Monopeça</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[9px] font-bold uppercase">Estável</Badge>
                        )}
                      </TableCell>
                    </TableRow>

                    <TableRow className="h-12 hover:bg-slate-50/80">
                      <TableCell className="font-black text-slate-900 text-xs">% 2 Itens (Venda Casada)</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{pairComparison.periodA.metrics.twoItemsRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 text-sm">{pairComparison.periodB.metrics.twoItemsRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-center">{formatDeltaPercent(pairComparison.deltaTwoItemsRate, false)}</TableCell>
                      <TableCell className="text-center">
                        {pairComparison.deltaTwoItemsRate >= 1.5 ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold uppercase">✓ Conversão Ampliada</Badge>
                        ) : pairComparison.deltaTwoItemsRate <= -1.5 ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] font-bold uppercase">▼ Queda de Casada</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[9px] font-bold uppercase">Estável</Badge>
                        )}
                      </TableCell>
                    </TableRow>

                    <TableRow className="h-12 hover:bg-slate-50/80">
                      <TableCell className="font-black text-slate-900 text-xs">Total Cupons (Atendimentos)</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{pairComparison.periodA.metrics.totalCupons}</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 text-sm">{pairComparison.periodB.metrics.totalCupons}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn("font-bold text-xs", pairComparison.deltaCoupons >= 0 ? "text-emerald-600" : "text-rose-600")}>
                          {pairComparison.deltaCoupons >= 0 ? `+${pairComparison.deltaCoupons}` : pairComparison.deltaCoupons} ({pairComparison.pctCouponsDiff >= 0 ? `+${pairComparison.pctCouponsDiff.toFixed(1)}%` : `${pairComparison.pctCouponsDiff.toFixed(1)}%`})
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[9px] font-bold">Volume</Badge>
                      </TableCell>
                    </TableRow>

                    <TableRow className="h-12 hover:bg-slate-50/80">
                      <TableCell className="font-black text-slate-900 text-xs">Faturamento Líquido</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">R$ {(pairComparison.periodA.metrics.totalVenda ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 text-sm">R$ {(pairComparison.periodB.metrics.totalVenda ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn("font-bold text-xs", pairComparison.deltaRevenue >= 0 ? "text-emerald-600" : "text-rose-600")}>
                          {pairComparison.deltaRevenue >= 0 ? `+R$ ${(pairComparison.deltaRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : `-R$ ${(Math.abs(pairComparison.deltaRevenue) ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} ({pairComparison.pctRevenueDiff >= 0 ? `+${(pairComparison.pctRevenueDiff ?? 0).toFixed(1)}%` : `${(pairComparison.pctRevenueDiff ?? 0).toFixed(1)}%`})
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[9px] font-bold">Receita</Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
