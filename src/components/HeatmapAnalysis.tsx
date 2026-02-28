
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Flame, 
  Clock, 
  Users, 
  TrendingUp, 
  ShoppingBag, 
  Smartphone, 
  ArrowRightLeft,
  Info,
  Calendar,
  Sigma
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, getHours, getDay } from "date-fns";

interface HeatmapAnalysisProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

type HeatmapCategory = 'sales' | 'pickup' | 'exchanges';
type HeatmapMetric = 'value' | 'count';
type HeatmapGrouping = 'day' | 'vendor';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 às 22:00
const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function HeatmapAnalysis({ data, vinculos }: HeatmapAnalysisProps) {
  const [category, setCategory] = useState<HeatmapCategory>('sales');
  const [metric, setMetric] = useState<HeatmapMetric>('value');
  const [grouping, setGrouping] = useState<HeatmapGrouping>('day');

  const heatmapData = useMemo(() => {
    let filtered: any[] = [];
    
    // 1. Filtragem por Categoria
    if (category === 'sales') {
      filtered = data.filter(s => s.tpNF === 1 && !s.is_cancelada);
    } else if (category === 'pickup') {
      filtered = data.filter(s => (s.canal === "RETIRADA_ONLINE" || s.canal === "RETIRADA_ADICIONAL" || s.is_adicional) && !s.is_cancelada);
    } else if (category === 'exchanges') {
      filtered = data.filter(s => s.is_troca && !s.is_cancelada);
    }

    const grid: Record<string, Record<number, number>> = {};
    const rowKeys = new Set<string>();

    filtered.forEach(item => {
      if (!item.dhEmi) return;
      const date = parseISO(item.dhEmi);
      const hour = getHours(date);
      if (hour < 8 || hour > 22) return;

      const rowKey = grouping === 'day' ? DAYS[getDay(date)] : (item.vendedor || "OUTROS");
      rowKeys.add(rowKey);

      if (!grid[rowKey]) grid[rowKey] = {};
      
      const val = metric === 'value' ? parseFloat(item.vNF || "0") : 1;
      grid[rowKey][hour] = (grid[rowKey][hour] || 0) + val;
    });

    // Ordenação das linhas
    const sortedRowKeys = grouping === 'day' 
      ? DAYS.filter(d => rowKeys.has(d))
      : Array.from(rowKeys).sort((a, b) => {
          const sumA = Object.values(grid[a] || {}).reduce((acc, v) => acc + v, 0);
          const sumB = Object.values(grid[b] || {}).reduce((acc, v) => acc + v, 0);
          return sumB - sumA;
        });

    // Achar o valor máximo para a escala de cores (apenas dados individuais, não o total)
    let maxVal = 0;
    Object.values(grid).forEach(row => {
      Object.values(row).forEach(v => {
        if (v > maxVal) maxVal = v;
      });
    });

    // Calcular Totais por Hora (Rodapé)
    const hourTotals: Record<number, number> = {};
    HOURS.forEach(h => {
      let total = 0;
      sortedRowKeys.forEach(rowKey => {
        total += grid[rowKey]?.[h] || 0;
      });
      hourTotals[h] = total;
    });

    return { grid, sortedRowKeys, maxVal, hourTotals };
  }, [data, category, metric, grouping]);

  const getColor = (value: number, max: number) => {
    if (!value || value === 0) return "bg-slate-50";
    const intensity = value / max;
    if (intensity > 0.8) return "bg-orange-600 text-white";
    if (intensity > 0.6) return "bg-orange-500 text-white";
    if (intensity > 0.4) return "bg-orange-400 text-white";
    if (intensity > 0.2) return "bg-orange-200 text-orange-900";
    return "bg-orange-100 text-orange-800";
  };

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Didático */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 border-2 border-orange-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="bg-orange-500 p-4 rounded-3xl text-white shadow-lg shadow-orange-100 shrink-0">
          <Flame className="w-8 h-8 animate-pulse" />
        </div>
        <div className="flex-1 space-y-1 text-center md:text-left">
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-800 italic">Mapa de Calor Operacional</h1>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Identifique os horários de pico e otimize a escala da sua equipe. As cores mais escuras indicam maior concentração de <strong>{metric === 'value' ? 'Faturamento' : 'Volume de Cupons'}</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controles Laterais */}
        <Card className="ri-card border-none shadow-sm lg:col-span-1 h-fit">
          <CardHeader className="bg-slate-50/50 border-b p-4">
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" /> Configurar Visão
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 px-1">Categoria</label>
              <Select value={category} onValueChange={(v: any) => setCategory(v)}>
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

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 px-1">Métrica de Intensidade</label>
              <Select value={metric} onValueChange={(v: any) => setMetric(v)}>
                <SelectTrigger className="rounded-xl h-10 border-slate-100 font-bold text-xs uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value" className="text-xs">Valor Total (R$)</SelectItem>
                  <SelectItem value="count" className="text-xs">Qtd. Cupons</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 px-1">Agrupamento das Linhas</label>
              <Select value={grouping} onValueChange={(v: any) => setGrouping(v)}>
                <SelectTrigger className="rounded-xl h-10 border-slate-100 font-bold text-xs uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day" className="text-xs">Dia da Semana</SelectItem>
                  <SelectItem value="vendor" className="text-xs">Colaborador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mt-4">
               <div className="flex items-center gap-2 mb-2">
                  <Info className="w-3 h-3 text-orange-500" />
                  <span className="text-[9px] font-black text-orange-800 uppercase">Legenda de Calor</span>
               </div>
               <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100">
                  <div className="flex-1 bg-orange-100" />
                  <div className="flex-1 bg-orange-200" />
                  <div className="flex-1 bg-orange-400" />
                  <div className="flex-1 bg-orange-500" />
                  <div className="flex-1 bg-orange-600" />
               </div>
               <div className="flex justify-between mt-1 text-[8px] font-bold text-slate-400 uppercase">
                  <span>Frio</span>
                  <span>Fogo</span>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Grade do Mapa de Calor */}
        <Card className="ri-card border-none shadow-xl lg:col-span-3 overflow-hidden flex flex-col bg-white">
          <CardHeader className="bg-slate-900 text-white p-6 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-400" />
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-widest">Distribuição por Faixa Horária</CardTitle>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Horário de Brasília (08h - 22h)</p>
                </div>
              </div>
              <Badge className="bg-orange-500 text-white border-none font-black h-6 px-3">
                {grouping === 'day' ? "VISÃO SEMANAL" : "VISÃO POR TIME"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            <div className="min-w-[800px]">
              {/* Header Horas */}
              <div className="flex bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <div className="w-40 md:w-48 p-4 shrink-0 border-r border-slate-100 flex items-center justify-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase">{grouping === 'day' ? 'DIA' : 'COLABORADOR'}</span>
                </div>
                <div className="flex-1 grid grid-cols-15">
                  {HOURS.map(h => (
                    <div key={h} className="p-3 text-center border-r border-slate-100 last:border-r-0">
                      <span className="text-[10px] font-black text-slate-500">{h}h</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Linhas de Dados */}
              <div className="divide-y divide-slate-100">
                {heatmapData.sortedRowKeys.map(rowKey => (
                  <div key={rowKey} className="flex group hover:bg-slate-50/50 transition-colors">
                    <div className="w-40 md:w-48 p-4 shrink-0 border-r border-slate-100 flex items-center bg-white group-hover:bg-slate-50/80">
                      <span className="text-[10px] font-black text-slate-700 uppercase truncate">{rowKey}</span>
                    </div>
                    <div className="flex-1 grid grid-cols-15">
                      {HOURS.map(h => {
                        const val = heatmapData.grid[rowKey]?.[h] || 0;
                        const colorClass = getColor(val, heatmapData.maxVal);
                        
                        return (
                          <div 
                            key={h} 
                            className={cn(
                              "p-3 h-14 border-r border-slate-100 last:border-r-0 flex flex-col items-center justify-center transition-all",
                              colorClass
                            )}
                          >
                            <span className="text-[9px] font-black leading-none">
                              {val > 0 ? (metric === 'value' ? formatBRL(val) : val) : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* RODAPÉ DE TOTAIS CONSOLIDADOS */}
              <div className="flex bg-slate-900 text-white border-t border-slate-800 sticky bottom-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                <div className="w-40 md:w-48 p-4 shrink-0 border-r border-slate-800 flex items-center justify-center gap-2">
                  <Sigma className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-[10px] font-black uppercase">Consolidado</span>
                </div>
                <div className="flex-1 grid grid-cols-15">
                  {HOURS.map(h => {
                    const total = heatmapData.hourTotals[h] || 0;
                    return (
                      <div key={h} className="p-3 h-16 text-center border-r border-slate-800 last:border-r-0 flex flex-col items-center justify-center bg-slate-900">
                        <span className="text-[8px] font-bold text-orange-400 uppercase mb-1 leading-none">{h}h</span>
                        <span className="text-[10px] font-black text-white leading-none">
                          {total > 0 ? (metric === 'value' ? formatBRL(total) : total) : "---"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Base de análise: {data.length} documentos fiscais</span>
             </div>
             <p className="text-[8px] font-bold text-slate-300 uppercase">Uso Interno • Ri Happy Performance</p>
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
