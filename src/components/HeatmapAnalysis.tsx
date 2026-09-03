"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Flame, 
  Clock, 
  Users, 
  TrendingUp, 
  ShoppingBag, 
  Info, 
  Calendar, 
  Sigma, 
  Package, 
  Layers, 
  DollarSign, 
  Sparkles,
  Trophy,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, getHours, getDay, format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HeatmapAnalysisProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

export type HeatmapCategory = 'sales' | 'pickup' | 'exchanges';
export type HeatmapMetric = 'items' | 'value' | 'count' | 'pa';
export type HeatmapGrouping = 'day' | 'date' | 'vendor';

interface CellMetrics {
  items: number;
  value: number;
  count: number;
}

// Inicia às 09:00 e vai até 22:00 (14 colunas de hora)
const HOURS = Array.from({ length: 14 }, (_, i) => i + 9); 
const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function HeatmapAnalysis({ data }: HeatmapAnalysisProps) {
  const [category, setCategory] = useState<HeatmapCategory>('sales');
  const [metric, setMetric] = useState<HeatmapMetric>('items');
  const [grouping, setGrouping] = useState<HeatmapGrouping>('day');
  const [showSecondary, setShowSecondary] = useState<boolean>(true);

  // Helper para extrair quantidade de peças/itens
  const getSaleItemCount = (s: DetailedSaleRow): number => {
    let count = 0;
    if (s.itens && s.itens.length > 0) {
      count = s.itens.reduce((acc, it) => acc + (Number(it.qCom) || 0), 0);
    }
    if (count === 0 && s.itens_qtd) {
      const parsed = parseFloat(s.itens_qtd);
      if (!isNaN(parsed) && parsed > 0) count = parsed;
    }
    return count;
  };

  const heatmapData = useMemo(() => {
    let filtered: DetailedSaleRow[] = [];
    
    if (category === 'sales') {
      filtered = data.filter(s => s.tpNF === 1 && !s.is_cancelada);
    } else if (category === 'pickup') {
      filtered = data.filter(s => (s.canal === "RETIRADA_ONLINE" || s.canal === "RETIRADA_ADICIONAL" || s.is_adicional) && !s.is_cancelada);
    } else if (category === 'exchanges') {
      filtered = data.filter(s => s.is_troca && !s.is_cancelada);
    }

    const grid: Record<string, Record<number, CellMetrics>> = {};
    const rowKeys = new Set<string>();
    const rowDateMap: Record<string, Date> = {};

    let totalItemsOverall = 0;
    let totalValueOverall = 0;
    let totalCountOverall = 0;

    filtered.forEach(item => {
      if (!item.dhEmi) return;
      const date = parseISO(item.dhEmi);
      if (!isValid(date)) return;
      const hour = getHours(date);
      if (hour < 9 || hour > 22) return;

      let rowKey = "";
      if (grouping === 'day') {
        rowKey = DAYS[getDay(date)];
      } else if (grouping === 'date') {
        rowKey = format(date, "dd/MM (EEE)", { locale: ptBR });
        if (!rowDateMap[rowKey]) {
          rowDateMap[rowKey] = date;
        }
      } else {
        rowKey = item.vendedor || "OUTROS";
      }

      rowKeys.add(rowKey);

      if (!grid[rowKey]) grid[rowKey] = {};
      if (!grid[rowKey][hour]) {
        grid[rowKey][hour] = { items: 0, value: 0, count: 0 };
      }

      const itemCount = getSaleItemCount(item);
      const val = parseFloat(item.vNF || "0") || 0;

      grid[rowKey][hour].items += itemCount;
      grid[rowKey][hour].value += val;
      grid[rowKey][hour].count += 1;

      totalItemsOverall += itemCount;
      totalValueOverall += val;
      totalCountOverall += 1;
    });

    const getMetricVal = (m?: CellMetrics, met: HeatmapMetric = metric): number => {
      if (!m) return 0;
      switch (met) {
        case 'items': return m.items;
        case 'value': return m.value;
        case 'count': return m.count;
        case 'pa': return m.count > 0 ? (m.items / m.count) : 0;
      }
    };

    // Totais de Linha
    const rowTotals: Record<string, CellMetrics> = {};
    Object.keys(grid).forEach(rowKey => {
      rowTotals[rowKey] = { items: 0, value: 0, count: 0 };
      HOURS.forEach(h => {
        const c = grid[rowKey]?.[h];
        if (c) {
          rowTotals[rowKey].items += c.items;
          rowTotals[rowKey].value += c.value;
          rowTotals[rowKey].count += c.count;
        }
      });
    });

    // Ordenação das linhas
    let sortedRowKeys: string[] = [];
    if (grouping === 'day') {
      sortedRowKeys = DAYS.filter(d => rowKeys.has(d));
    } else if (grouping === 'date') {
      sortedRowKeys = Array.from(rowKeys).sort((a, b) => {
        const dateA = rowDateMap[a]?.getTime() || 0;
        const dateB = rowDateMap[b]?.getTime() || 0;
        return dateA - dateB;
      });
    } else {
      sortedRowKeys = Array.from(rowKeys).sort((a, b) => {
        const valA = getMetricVal(rowTotals[a]);
        const valB = getMetricVal(rowTotals[b]);
        return valB - valA;
      });
    }

    // Totais de Coluna (Horas)
    const hourTotals: Record<number, CellMetrics> = {};
    HOURS.forEach(h => {
      hourTotals[h] = { items: 0, value: 0, count: 0 };
      sortedRowKeys.forEach(rowKey => {
        const c = grid[rowKey]?.[h];
        if (c) {
          hourTotals[h].items += c.items;
          hourTotals[h].value += c.value;
          hourTotals[h].count += c.count;
        }
      });
    });

    // Máximo valor para a escala do mapa de calor e pico
    let maxVal = 0;
    let peakCell = { rowKey: "", hour: 0, items: 0, value: 0, count: 0, metricVal: 0 };
    let activeHoursCount = 0;

    sortedRowKeys.forEach(rowKey => {
      HOURS.forEach(h => {
        const c = grid[rowKey]?.[h];
        if (c && c.count > 0) {
          activeHoursCount++;
          const val = getMetricVal(c);
          if (val > maxVal) maxVal = val;
          if (val > peakCell.metricVal) {
            peakCell = {
              rowKey,
              hour: h,
              items: c.items,
              value: c.value,
              count: c.count,
              metricVal: val
            };
          }
        }
      });
    });

    const grandTotal: CellMetrics = {
      items: totalItemsOverall,
      value: totalValueOverall,
      count: totalCountOverall
    };

    return { 
      grid, 
      sortedRowKeys, 
      maxVal, 
      hourTotals, 
      rowTotals, 
      grandTotal,
      peakCell,
      activeHoursCount,
      getMetricVal
    };
  }, [data, category, metric, grouping]);

  const getColor = (value: number, max: number) => {
    if (!value || value === 0) return "bg-slate-50 text-slate-300";
    const intensity = max > 0 ? value / max : 0;
    if (intensity > 0.8) return "bg-orange-600 text-white font-black shadow-inner";
    if (intensity > 0.6) return "bg-orange-500 text-white font-bold";
    if (intensity > 0.4) return "bg-orange-400 text-white font-semibold";
    if (intensity > 0.2) return "bg-orange-200 text-orange-950 font-medium";
    return "bg-orange-100 text-orange-800";
  };

  const formatBRL = (val?: number | string | null) => 
    (Number(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  const formatMetricDisplay = (val: number, met: HeatmapMetric) => {
    if (met === 'value') return formatBRL(val);
    if (met === 'items') return Math.round(val).toLocaleString('pt-BR');
    if (met === 'count') return Math.round(val).toLocaleString('pt-BR');
    if (met === 'pa') return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return String(val);
  };

  const formatCompact = (val: number, met: HeatmapMetric) => {
    if (met === 'value') {
      if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `R$ ${(val / 1000).toFixed(1)}k`;
      return `R$ ${Math.round(val)}`;
    }
    if (met === 'items' || met === 'count') {
      if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
      return Math.round(val).toLocaleString('pt-BR');
    }
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const avgItemsPerHour = heatmapData.activeHoursCount > 0
    ? (heatmapData.grandTotal.items / heatmapData.activeHoursCount).toFixed(1)
    : "0";

  const overallPA = heatmapData.grandTotal.count > 0
    ? (heatmapData.grandTotal.items / heatmapData.grandTotal.count).toFixed(2)
    : "0,00";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Banner Principal */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 border-2 border-orange-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-4 rounded-3xl text-white shadow-lg shadow-orange-200 shrink-0">
          <Flame className="w-8 h-8 animate-pulse" />
        </div>
        <div className="flex-1 space-y-1 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-800 italic">
              Mapa de Calor Operacional
            </h1>
            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border border-orange-200 font-bold text-[10px] uppercase">
              Peças & Itens por Hora
            </Badge>
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Analise o fluxo de peças, itens e faturamento hora a hora por dia da semana ou colaborador. Identifique picos de demanda física para organizar escalas e abastecimento.
          </p>
        </div>
      </div>

      {/* KPI Cards de Resumo Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Peças */}
        <Card className="ri-card border-orange-100/80 bg-gradient-to-br from-white to-orange-50/30">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-md shadow-orange-200 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                Total de Peças / Itens
              </span>
              <span className="text-xl font-black text-slate-800 tracking-tight block">
                {heatmapData.grandTotal.items.toLocaleString('pt-BR')} <span className="text-xs font-bold text-orange-600">pçs</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                Em {heatmapData.grandTotal.count.toLocaleString('pt-BR')} cupons
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Pico Horário de Peças */}
        <Card className="ri-card border-orange-100/80 bg-gradient-to-br from-white to-amber-50/30">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-200 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                Pico Máximo na Grade
              </span>
              <span className="text-xl font-black text-slate-800 tracking-tight block truncate">
                {heatmapData.peakCell.hour > 0 
                  ? `${heatmapData.peakCell.items.toLocaleString('pt-BR')} pçs` 
                  : "---"}
              </span>
              <span className="text-[10px] text-amber-700 font-bold block truncate">
                {heatmapData.peakCell.hour > 0 
                  ? `${heatmapData.peakCell.rowKey} às ${heatmapData.peakCell.hour}h` 
                  : "Sem dados"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Média de Peças / Hora */}
        <Card className="ri-card border-orange-100/80 bg-gradient-to-br from-white to-blue-50/30">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-md shadow-blue-200 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                Média Peças / Hora Ativa
              </span>
              <span className="text-xl font-black text-slate-800 tracking-tight block">
                {avgItemsPerHour} <span className="text-xs font-bold text-blue-600">pçs/h</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                {heatmapData.activeHoursCount} faixas horárias ativas
              </span>
            </div>
          </CardContent>
        </Card>

        {/* P.A. Médio Geral */}
        <Card className="ri-card border-orange-100/80 bg-gradient-to-br from-white to-emerald-50/30">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-md shadow-emerald-200 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                P.A. Médio Geral
              </span>
              <span className="text-xl font-black text-slate-800 tracking-tight block">
                {overallPA} <span className="text-xs font-bold text-emerald-600">itens/cup</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                Faturamento: {formatBRL(heatmapData.grandTotal.value)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Painel de Configurações */}
        <Card className="ri-card shadow-sm lg:col-span-1 h-fit">
          <CardHeader className="bg-slate-50/50 border-b p-4">
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" /> Configurar Visão
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Categoria */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 px-1">Categoria de Análise</label>
              <Select value={category} onValueChange={(v: HeatmapCategory) => setCategory(v)}>
                <SelectTrigger className="rounded-xl h-10 border-slate-100 font-bold text-xs uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales" className="text-xs">Vendas Gerais</SelectItem>
                  <SelectItem value="pickup" className="text-xs">Pickups & Adicionais</SelectItem>
                  <SelectItem value="exchanges" className="text-xs">Trocas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Métrica de Intensidade */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 px-1">Métrica Principal</label>
              <Select value={metric} onValueChange={(v: HeatmapMetric) => setMetric(v)}>
                <SelectTrigger className="rounded-xl h-10 border-slate-100 font-bold text-xs uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="items" className="text-xs font-bold text-orange-600">
                    📦 Quantidade de Peças / Itens
                  </SelectItem>
                  <SelectItem value="value" className="text-xs">
                    💰 Faturamento (R$)
                  </SelectItem>
                  <SelectItem value="count" className="text-xs">
                    🧾 Quantidade de Cupons
                  </SelectItem>
                  <SelectItem value="pa" className="text-xs">
                    🎯 P.A. (Peças por Atendimento)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Agrupamento */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 px-1">Agrupamento das Linhas</label>
              <Select value={grouping} onValueChange={(v: HeatmapGrouping) => setGrouping(v)}>
                <SelectTrigger className="rounded-xl h-10 border-slate-100 font-bold text-xs uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day" className="text-xs">Dia da Semana (Consolidado)</SelectItem>
                  <SelectItem value="date" className="text-xs">Data Específica (Dia a Dia)</SelectItem>
                  <SelectItem value="vendor" className="text-xs">Colaborador / Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Alternar Métrica Secundária */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <label htmlFor="show-secondary-switch" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Métrica Secundária
                </label>
                <p className="text-[10px] text-slate-400">Exibir cupons / peças nas células</p>
              </div>
              <Switch
                id="show-secondary-switch"
                checked={showSecondary}
                onCheckedChange={setShowSecondary}
              />
            </div>

            {/* Legenda de Calor */}
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-[9px] font-black text-orange-800 uppercase">Intensidade do Calor</span>
              </div>
              <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-100">
                <div className="flex-1 bg-orange-100" />
                <div className="flex-1 bg-orange-200" />
                <div className="flex-1 bg-orange-400" />
                <div className="flex-1 bg-orange-500" />
                <div className="flex-1 bg-orange-600" />
              </div>
              <div className="flex justify-between mt-1 text-[8px] font-black text-slate-400 uppercase">
                <span>0 ou Menor Fluxo</span>
                <span>Pico Operacional</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grade do Mapa de Calor */}
        <Card className="ri-card lg:col-span-3 overflow-hidden flex flex-col">
          <CardHeader className="bg-slate-900 text-white p-5 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-xl">
                  <Clock className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-widest">
                    Distribuição por Faixa Horária
                  </CardTitle>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                    Horário de Brasília (09h às 22h) • Grade Interativa
                  </p>
                </div>
              </div>

              {/* Botões Rápidos de Alternância de Métrica */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setMetric('items')}
                  className={cn(
                    "px-3 py-1 text-[11px] font-black uppercase rounded-lg transition-all flex items-center gap-1.5",
                    metric === 'items'
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Package className="w-3.5 h-3.5" />
                  Peças / Itens
                </button>
                <button
                  type="button"
                  onClick={() => setMetric('value')}
                  className={cn(
                    "px-3 py-1 text-[11px] font-black uppercase rounded-lg transition-all flex items-center gap-1.5",
                    metric === 'value'
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Faturamento
                </button>
                <button
                  type="button"
                  onClick={() => setMetric('count')}
                  className={cn(
                    "px-3 py-1 text-[11px] font-black uppercase rounded-lg transition-all flex items-center gap-1.5",
                    metric === 'count'
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Cupons
                </button>
                <button
                  type="button"
                  onClick={() => setMetric('pa')}
                  className={cn(
                    "px-3 py-1 text-[11px] font-black uppercase rounded-lg transition-all flex items-center gap-1.5",
                    metric === 'pa'
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  P.A.
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1 overflow-auto">
            <TooltipProvider delayDuration={100}>
              <div className="min-w-[950px]">
                {/* Header Horas + Coluna Total */}
                <div className="flex bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <div className="w-44 md:w-52 p-3.5 shrink-0 border-r border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase">
                      {grouping === 'day' ? 'DIA DA SEMANA' : grouping === 'date' ? 'DATA' : 'COLABORADOR'}
                    </span>
                    <Badge variant="outline" className="text-[8px] font-black text-orange-600 border-orange-200 bg-orange-50">
                      {metric.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex-1 grid grid-cols-15">
                    {HOURS.map(h => (
                      <div key={h} className="p-2.5 text-center border-r border-slate-200 last:border-r-0">
                        <span className="text-[10px] font-black text-slate-600 block">{h}h</span>
                        <span className="text-[8px] font-semibold text-slate-400 uppercase">
                          {h}:00
                        </span>
                      </div>
                    ))}
                    <div className="p-2.5 text-center bg-orange-50/80 border-l border-orange-200">
                      <span className="text-[10px] font-black text-orange-700 uppercase block">Total</span>
                      <span className="text-[8px] font-bold text-orange-500 uppercase">Consol.</span>
                    </div>
                  </div>
                </div>

                {/* Linhas de Dados */}
                <div className="divide-y divide-slate-100">
                  {heatmapData.sortedRowKeys.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase">
                      Nenhum dado encontrado para os filtros selecionados.
                    </div>
                  ) : (
                    heatmapData.sortedRowKeys.map(rowKey => {
                      const rowCellTotal = heatmapData.rowTotals[rowKey];
                      const rowMetricTotal = heatmapData.getMetricVal(rowCellTotal);

                      return (
                        <div key={rowKey} className="flex group hover:bg-slate-50/70 transition-colors">
                          <div className="w-44 md:w-52 p-3.5 shrink-0 border-r border-slate-100 flex items-center justify-between bg-white group-hover:bg-slate-50/90">
                            <span className="text-[11px] font-black text-slate-700 uppercase truncate">
                              {rowKey}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 shrink-0 ml-2">
                              {rowCellTotal.items.toLocaleString('pt-BR')} pçs
                            </span>
                          </div>
                          <div className="flex-1 grid grid-cols-15">
                            {HOURS.map(h => {
                              const cell = heatmapData.grid[rowKey]?.[h];
                              const val = heatmapData.getMetricVal(cell);
                              const colorClass = getColor(val, heatmapData.maxVal);
                              const hasData = cell && cell.count > 0;
                              
                              return (
                                <Tooltip key={h}>
                                  <TooltipTrigger asChild>
                                    <div 
                                      className={cn(
                                        "p-2 h-16 border-r border-slate-100 last:border-r-0 flex flex-col items-center justify-center cursor-pointer transition-all",
                                        colorClass
                                      )}
                                    >
                                      {hasData ? (
                                        <>
                                          <span className="text-[10px] md:text-[11px] font-black leading-none">
                                            {formatMetricDisplay(val, metric)}
                                          </span>
                                          {showSecondary && (
                                            <span className="text-[8px] font-semibold opacity-80 mt-1 leading-none">
                                              {metric === 'items' 
                                                ? `${cell.count} cup` 
                                                : metric === 'value' 
                                                ? `${cell.items} pçs` 
                                                : `${cell.items} pçs`}
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-[9px] font-bold text-slate-300">·</span>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  {hasData && (
                                    <TooltipContent side="top" className="bg-slate-900 text-white p-3.5 rounded-xl border-slate-700 shadow-2xl space-y-2 min-w-[210px]">
                                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 gap-3">
                                        <span className="font-black text-orange-400 text-xs uppercase">{rowKey}</span>
                                        <span className="text-slate-400 text-xs font-mono font-bold">{h}:00 - {h}:59</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                        <div className="text-slate-400 flex items-center gap-1">
                                          <Package className="w-3 h-3 text-orange-400" /> Peças / Itens:
                                        </div>
                                        <div className="font-black text-white text-right">
                                          {cell.items.toLocaleString('pt-BR')} un
                                        </div>

                                        <div className="text-slate-400 flex items-center gap-1">
                                          <DollarSign className="w-3 h-3 text-emerald-400" /> Faturamento:
                                        </div>
                                        <div className="font-bold text-emerald-400 text-right">
                                          {formatBRL(cell.value)}
                                        </div>

                                        <div className="text-slate-400 flex items-center gap-1">
                                          <ShoppingBag className="w-3 h-3 text-blue-400" /> Cupons:
                                        </div>
                                        <div className="font-bold text-white text-right">
                                          {cell.count}
                                        </div>

                                        <div className="text-slate-400 flex items-center gap-1">
                                          <Layers className="w-3 h-3 text-amber-400" /> P.A. Médio:
                                        </div>
                                        <div className="font-bold text-amber-300 text-right">
                                          {(cell.items / cell.count).toFixed(2)}
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              );
                            })}

                            {/* Coluna Total por Linha */}
                            <div className="p-2 h-16 bg-orange-50 border-l border-orange-200 flex flex-col items-center justify-center">
                              <span className="text-[10px] md:text-[11px] font-black text-orange-800 leading-none">
                                {formatMetricDisplay(rowMetricTotal, metric)}
                              </span>
                              {showSecondary && (
                                <span className="text-[8px] font-bold text-orange-600/80 mt-1 leading-none">
                                  {metric === 'items' 
                                    ? `${rowCellTotal.count} cup` 
                                    : `${rowCellTotal.items} pçs`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* RODAPÉ DE TOTAIS CONSOLIDADOS POR HORA */}
                <div className="flex bg-slate-900 text-white border-t-2 border-slate-800 sticky bottom-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.15)]">
                  <div className="w-44 md:w-52 p-3.5 shrink-0 border-r border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sigma className="w-4 h-4 text-orange-400" />
                      <span className="text-[10px] font-black uppercase">Consolidado</span>
                    </div>
                    <span className="text-[8px] font-bold text-orange-400 uppercase">
                      Por Hora
                    </span>
                  </div>
                  <div className="flex-1 grid grid-cols-15">
                    {HOURS.map(h => {
                      const hourCell = heatmapData.hourTotals[h];
                      const val = heatmapData.getMetricVal(hourCell);

                      return (
                        <div 
                          key={h} 
                          className="p-2 h-16 text-center border-r border-slate-800 last:border-r-0 flex flex-col items-center justify-center bg-slate-900"
                        >
                          <span className="text-[8px] font-bold text-orange-400 uppercase mb-0.5 leading-none">{h}h</span>
                          <span className="text-[10px] font-black text-white leading-none">
                            {val > 0 ? formatMetricDisplay(val, metric) : "---"}
                          </span>
                          {showSecondary && val > 0 && (
                            <span className="text-[8px] font-semibold text-slate-400 mt-1 leading-none">
                              {metric === 'items' ? `${hourCell.count}c` : `${hourCell.items}p`}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* Grande Total Consolidado do Período */}
                    <div className="p-2 h-16 text-center border-l-2 border-orange-700 bg-orange-600 flex flex-col items-center justify-center">
                      <span className="text-[8px] font-black text-orange-100 uppercase mb-0.5 leading-none italic">
                        Total Geral
                      </span>
                      <span className="text-[11px] md:text-xs font-black text-white leading-none">
                        {formatMetricDisplay(heatmapData.getMetricVal(heatmapData.grandTotal), metric)}
                      </span>
                      {showSecondary && (
                        <span className="text-[8px] font-bold text-white/90 mt-1 leading-none">
                          {metric === 'items' 
                            ? `${heatmapData.grandTotal.count.toLocaleString('pt-BR')} cup` 
                            : `${heatmapData.grandTotal.items.toLocaleString('pt-BR')} pçs`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TooltipProvider>
          </CardContent>

          {/* Rodapé Informativo */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Base de análise: {data.length.toLocaleString('pt-BR')} notas fiscais • {heatmapData.grandTotal.items.toLocaleString('pt-BR')} peças processadas
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[8px] font-bold text-slate-400 uppercase bg-white">
                Dica: Passe o mouse nas células para ver raio-x detalhado
              </Badge>
              <p className="text-[8px] font-bold text-slate-400 uppercase">Ri Happy Performance</p>
            </div>
          </div>
        </Card>
      </div>

      <style jsx global>{`
        .grid-cols-15 {
          grid-template-columns: repeat(15, minmax(0, 1fr));
        }
      `}</style>
    </div>
  );
}
