"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { parseISO, startOfWeek, endOfWeek, format, getISOWeek, isValid, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { fadeIn } from "@/lib/animations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, CalendarDays, FilterX, TrendingUp, ChevronDown, ChevronUp, Layers, LineChart as LineChartIcon, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, LabelList } from "recharts";

interface WeeklyAnalysisProps {
  data: DetailedSaleRow[];
}

interface ItemDefinition {
  cProd: string;
  xProd: string;
  count: number;
  cupons: number;
  value: number;
  perc: number;
}

export function WeeklyAnalysis({ data }: WeeklyAnalysisProps) {
  // Extract all unique items with their total values for impact calculation
  const { allItems, grandTotal } = useMemo(() => {
    const map = new Map<string, ItemDefinition>();
    let total = 0;
    data.filter(r => r.tpNF === 1 && !r.is_cancelada).forEach(r => {
      const seenInCupom = new Set<string>();
      r.itens?.forEach(item => {
        const val = item.vProd - item.vDesc;
        total += val;
        const existing = map.get(item.cProd);
        if (existing) {
          existing.count += item.qCom;
          existing.value += val;
          if (!seenInCupom.has(item.cProd)) {
            existing.cupons += 1;
            seenInCupom.add(item.cProd);
          }
        } else {
          seenInCupom.add(item.cProd);
          map.set(item.cProd, { cProd: item.cProd, xProd: item.xProd, count: item.qCom, cupons: 1, value: val, perc: 0 });
        }
      });
    });
    const items = Array.from(map.values()).map(i => ({
      ...i,
      perc: total > 0 ? (i.value / total) * 100 : 0
    })).sort((a, b) => b.value - a.value);
    return { allItems: items, grandTotal: total };
  }, [data]);

  const [excludedCProds, setExcludedCProds] = useState<Set<string>>(new Set());
  const [simulatedAdditions, setSimulatedAdditions] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpurgoOpen, setIsExpurgoOpen] = useState(false);
  const [includeOmniInTotal, setIncludeOmniInTotal] = useState(true);
  const [activeChartMetric, setActiveChartMetric] = useState<'vendas' | 'cupons' | 'itens' | 'pa' | 'tkm' | 'pm'>('vendas');
  const [forceGroupingMode, setForceGroupingMode] = useState<'AUTO' | 'DAY' | 'WEEKDAY' | 'WEEK' | 'MONTH'>('AUTO');
  const [filterWeekday, setFilterWeekday] = useState<number | 'ALL'>('ALL');

  const toggleItem = (cProd: string) => {
    setExcludedCProds(prev => {
      const next = new Set(prev);
      if (next.has(cProd)) next.delete(cProd);
      else next.add(cProd);
      return next;
    });
  };

  const selectAll = () => setExcludedCProds(new Set());
  const deselectAll = () => setExcludedCProds(new Set(allItems.map(i => i.cProd)));

  const filteredItemsList = allItems.filter(item => 
    item.cProd.includes(searchTerm) || item.xProd.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatNum = (val: number) => val.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  // Process data per week with exclusions and simulations applied
  const { weeklyData, consolidatedGeneral, groupingMode, diffDays } = useMemo(() => {
    const weeksMap = new Map<string, any>();
    const allBaseRows: any[] = [];
    const allExpRows: any[] = [];
    const periodTotalCount: Record<string, number> = {};

    const validRows = data.filter(r => r.tpNF === 1 && !r.is_cancelada).filter(r => {
      if (filterWeekday === 'ALL') return true;
      const d = parseISO(r.dhEmi);
      if (!isValid(d)) return false;
      return d.getDay() === filterWeekday;
    });
    
    // Determine Dynamic Grouping (Day, Week, Month)
    let minDate = new Date("2100-01-01");
    let maxDate = new Date("2000-01-01");
    
    validRows.forEach(r => {
      const d = parseISO(r.dhEmi);
      if (isValid(d)) {
        if (d < minDate) minDate = d;
        if (d > maxDate) maxDate = d;
      }
    });

    const diffD = Math.max(1, differenceInDays(maxDate, minDate));
    
    let mode = "WEEK";
    if (forceGroupingMode === 'AUTO') {
      if (diffD <= 14) mode = "DAY";
      else if (diffD <= 60) mode = "WEEK";
      else mode = "MONTH";
    } else {
      mode = forceGroupingMode;
    }

    // Pass 1: Group real rows into dynamic periods and calculate base distributions
    validRows.forEach(row => {
      const date = parseISO(row.dhEmi);
      if (!isValid(date)) return;

      let groupLabel = "";
      let groupKey = "";

      if (mode === "DAY") {
        groupLabel = format(date, "dd/MMM", { locale: ptBR });
        groupKey = format(date, "yyyy-MM-dd");
      } else if (mode === "WEEKDAY") {
        const dayName = format(date, "EEEE", { locale: ptBR }).split('-')[0].toUpperCase();
        const dayIdx = date.getDay();
        groupLabel = dayName;
        // Make Monday first (1), Sunday last (0 becomes 7) for sorting if desired, but 0-6 works fine.
        const sortIdx = dayIdx === 0 ? 7 : dayIdx; 
        groupKey = `${sortIdx}-${dayName}`;
      } else if (mode === "WEEK") {
        const weekNum = getISOWeek(date);
        const sOfWeek = startOfWeek(date, { weekStartsOn: 1 });
        const eOfWeek = endOfWeek(date, { weekStartsOn: 1 });
        groupLabel = `Sem. ${weekNum} (${format(sOfWeek, 'dd/MM')} a ${format(eOfWeek, 'dd/MM')})`;
        groupKey = `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
      } else {
        groupLabel = format(date, "MMM/yyyy", { locale: ptBR }).toUpperCase();
        groupKey = format(date, "yyyy-MM");
      }

      if (!weeksMap.has(groupKey)) {
        weeksMap.set(groupKey, {
          weekKey: groupKey,
          weekLabel: groupLabel,
          sortKey: groupKey,
          baseRows: [],
          expRows: [],
          simBaseCount: {}
        });
      }

      const weekObj = weeksMap.get(groupKey);

      let baseVenda = 0;
      let baseItens = 0;
      let expVenda = 0;
      let expItens = 0;
      let hasBaseItems = false;
      let hasExpItems = false;

      row.itens?.forEach(item => {
        const val = item.vProd - item.vDesc;
        baseVenda += val;
        baseItens += item.qCom;
        hasBaseItems = true;
        
        // Track for proportional distribution of simulation
        weekObj.simBaseCount[item.cProd] = (weekObj.simBaseCount[item.cProd] || 0) + item.qCom;
        periodTotalCount[item.cProd] = (periodTotalCount[item.cProd] || 0) + item.qCom;

        if (!excludedCProds.has(item.cProd)) {
          expVenda += val;
          expItens += item.qCom;
          hasExpItems = true;
        }
      });

      if (hasBaseItems && baseVenda > 0) {
        const r = { ...row, _vNF: baseVenda, _itens: baseItens, _cupons: 1 };
        weekObj.baseRows.push(r);
        allBaseRows.push(r);
      }
      if (hasExpItems && expVenda > 0) {
        const r = { ...row, _vNF: expVenda, _itens: expItens, _cupons: 1 };
        weekObj.expRows.push(r);
        allExpRows.push(r);
      }
    });

    // Pass 2: Inject simulated additions proportionally
    const simCProds = Object.keys(simulatedAdditions).filter(k => simulatedAdditions[k] > 0);
    if (simCProds.length > 0 && weeksMap.size > 0) {
      weeksMap.forEach(week => {
        simCProds.forEach(cProd => {
          const totalSimQty = simulatedAdditions[cProd];
          const totalInPeriod = periodTotalCount[cProd] || 0;
          let addQty = 0;
          
          if (totalInPeriod > 0) {
            addQty = totalSimQty * ((week.simBaseCount[cProd] || 0) / totalInPeriod);
          } else {
            addQty = totalSimQty / weeksMap.size;
          }

          if (addQty > 0) {
            const itemInfo = allItems.find(i => i.cProd === cProd);
            if (itemInfo) {
              const pa = itemInfo.cupons > 0 ? itemInfo.count / itemInfo.cupons : 1;
              const pm = itemInfo.count > 0 ? itemInfo.value / itemInfo.count : 0;
              const addCupons = addQty / pa;
              const addVenda = addQty * pm;

              const fakeRow = {
                canal: "LOJA_FISICA",
                is_troca: false,
                _vNF: addVenda,
                _itens: addQty,
                _cupons: addCupons,
                vendedor: "PROJEÇÃO (SIMULADOR)"
              };
              week.expRows.push(fakeRow);
              allExpRows.push(fakeRow);
            }
          }
        });
      });
    }

    const weeksArray = Array.from(weeksMap.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    const calcMetrics = (rows: any[]) => {
      const vendas = rows.reduce((acc, r) => acc + r._vNF, 0);
      const cupons = rows.reduce((acc, r) => acc + (r._cupons !== undefined ? r._cupons : 1), 0);
      const itens = rows.reduce((acc, r) => acc + r._itens, 0);
      return {
        vendas, cupons, itens,
        tkm: cupons > 0 ? vendas / cupons : 0,
        pa: cupons > 0 ? itens / cupons : 0,
        pm: itens > 0 ? vendas / itens : 0
      };
    };

    const filterTotal = (r: any) => includeOmniInTotal ? true : (r.canal !== "RETIRADA_ONLINE" && r.canal !== "RETIRADA_ADICIONAL");
    const filterFisica = (r: any) => r.canal === "LOJA_FISICA" && !r.is_troca;
    const filterOnline = (r: any) => r.canal === "RETIRADA_ONLINE";
    const filterAdic = (r: any) => r.canal === "RETIRADA_ADICIONAL";
    const filterTroca = (r: any) => r.is_troca;
    
    const buildChannels = (bRows: any[], eRows: any[]) => [
      {
        id: 'total',
        title: includeOmniInTotal ? "Total Consolidado" : "Total (Sem Omni)",
        bgHeader: "bg-indigo-50 text-indigo-800 border-indigo-100",
        base: calcMetrics(bRows.filter(filterTotal)),
        exp: calcMetrics(eRows.filter(filterTotal))
      },
      {
        id: 'fisica',
        title: "Loja Física (+ Proj.)",
        bgHeader: "bg-sky-50 text-sky-800 border-sky-100",
        base: calcMetrics(bRows.filter(filterFisica)), 
        exp: calcMetrics(eRows.filter(filterFisica))
      },
      includeOmniInTotal ? {
        id: 'online',
        title: "Retirada (Pickup)",
        bgHeader: "bg-emerald-50 text-emerald-800 border-emerald-100",
        base: calcMetrics(bRows.filter(filterOnline)),
        exp: calcMetrics(eRows.filter(filterOnline))
      } : {
        id: 'troca',
        title: "Diferença Troca",
        bgHeader: "bg-orange-50 text-orange-800 border-orange-100",
        base: calcMetrics(bRows.filter(filterTroca)),
        exp: calcMetrics(eRows.filter(filterTroca))
      },
      {
        id: 'adic',
        title: "Adicionais de Balcão",
        bgHeader: "bg-rose-50 text-rose-800 border-rose-100",
        base: calcMetrics(bRows.filter(filterAdic)),
        exp: calcMetrics(eRows.filter(filterAdic))
      }
    ];

    const weeklyDataFormatted = weeksArray.map(week => {
      const vendsMap = new Map<string, any>();
      week.expRows.forEach((r: any) => {
        const v = r.vendedor || "NÃO IDENTIFICADO";
        if (!vendsMap.has(v)) vendsMap.set(v, { vendedor: v, vendas: 0, cupons: 0, itens: 0 });
        const curr = vendsMap.get(v);
        curr.vendas += r._vNF;
        curr.cupons += (r._cupons !== undefined ? r._cupons : 1);
        curr.itens += r._itens;
      });
      const vendedores = Array.from(vendsMap.values()).map(v => ({
        ...v,
        pa: v.cupons > 0 ? v.itens / v.cupons : 0,
        tkm: v.cupons > 0 ? v.vendas / v.cupons : 0
      })).sort((a, b) => b.vendas - a.vendas);

      return {
        weekLabel: week.weekLabel,
        weekKey: week.weekKey,
        channels: buildChannels(week.baseRows, week.expRows),
        onlineExp: calcMetrics(week.expRows.filter(filterOnline)),
        adicExp: calcMetrics(week.expRows.filter(filterAdic)),
        vendedores
      };
    });

    const consolidatedGeneral = {
      weekLabel: "CONSOLIDADO GERAL",
      weekKey: "consolidated_general",
      channels: buildChannels(allBaseRows, allExpRows)
    };

    return { weeklyData: weeklyDataFormatted, consolidatedGeneral, groupingMode: mode, diffDays: diffD };
  }, [data, excludedCProds, simulatedAdditions, includeOmniInTotal, allItems, forceGroupingMode, filterWeekday]);

  const hasExclusions = excludedCProds.size > 0 || Object.values(simulatedAdditions).some(v => v > 0);

  const { chartData, avgBase } = useMemo(() => {
    const data = weeklyData.map(w => {
      const totalChannel = w.channels.find((c: any) => c.id === 'total');
      if (!totalChannel) return { name: w.weekLabel, base: 0, proj: 0 };
      return {
        name: w.weekLabel,
        base: totalChannel.base[activeChartMetric] || 0,
        proj: totalChannel.exp[activeChartMetric] || 0
      };
    });
    
    const sum = data.reduce((acc, curr) => acc + curr.base, 0);
    const avg = data.length > 0 ? sum / data.length : 0;
    
    return { chartData: data, avgBase: avg };
  }, [weeklyData, activeChartMetric]);

  const metricsOptions = [
    { id: 'vendas', label: 'Faturamento' },
    { id: 'cupons', label: 'Cupons' },
    { id: 'itens', label: 'Peças' },
    { id: 'pa', label: 'P.A.' },
    { id: 'tkm', label: 'TKM' },
    { id: 'pm', label: 'P.M.' }
  ] as const;

  const isCurrency = activeChartMetric === 'vendas' || activeChartMetric === 'tkm' || activeChartMetric === 'pm';
  const formatChartYAxis = (val: number) => {
    if (isCurrency) {
      if (val >= 1000) return `R$ ${(val/1000).toFixed(0)}k`;
      return `R$ ${val}`;
    }
    return val.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  };
  const formatChartTooltip = (val: number) => {
    if (isCurrency) return formatCurrency(val);
    return formatNum(val);
  };

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tight">Simulador de Cenários</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsExpurgoOpen(!isExpurgoOpen)} className="text-xs uppercase font-bold text-slate-500">
              {isExpurgoOpen ? "Ocultar Painel" : "Configurar Simulação"}
              {isExpurgoOpen ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </CardHeader>
        {isExpurgoOpen && (
          <CardContent className="pt-4">
            {/* O conteúdo do painel permanece intocado aqui, mantendo a busca e os inputs */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <Input 
                    placeholder="Buscar código ou nome do item..." 
                    className="pl-9 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={selectAll} className="text-xs font-bold uppercase">Marcar Todos (Base)</Button>
                <Button variant="outline" size="sm" onClick={deselectAll} className="text-xs font-bold uppercase text-rose-600">Expurgar Todos</Button>
                <Button variant="outline" size="sm" onClick={() => setSimulatedAdditions({})} className="text-xs font-bold uppercase text-slate-500">Zerar Simulação</Button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 max-h-80 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredItemsList.map(item => {
                  const isExcluded = excludedCProds.has(item.cProd);
                  const simVal = simulatedAdditions[item.cProd] || 0;
                  const pa = item.cupons > 0 ? item.count / item.cupons : 0;
                  const pm = item.count > 0 ? item.value / item.count : 0;
                  
                  return (
                    <div key={item.cProd} className={cn(
                      "flex flex-col p-3 border rounded-lg transition-colors bg-white shadow-sm",
                      isExcluded ? "bg-rose-50/30 border-rose-200" : "border-slate-100 hover:border-indigo-200"
                    )}>
                      <div className="flex items-start gap-2">
                        <Checkbox 
                          id={`item-${item.cProd}`} 
                          checked={!isExcluded}
                          onCheckedChange={() => toggleItem(item.cProd)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 grid gap-1.5 leading-none">
                          <label htmlFor={`item-${item.cProd}`} className="text-xs font-bold text-slate-700 leading-tight uppercase line-clamp-1 cursor-pointer">
                            {item.xProd}
                          </label>
                          <div className="flex flex-col gap-1.5 mt-1">
                            <p className="text-[9px] text-slate-500 font-medium">
                              Cod: {item.cProd} • Qtd: {item.count} • P.A: <span className="font-bold text-slate-700">{pa.toFixed(2)}</span> • P.M: <span className="font-bold text-slate-700">{formatCurrency(pm)}</span>
                            </p>
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className={cn(
                                "text-[9px] font-black uppercase px-1.5 py-0",
                                isExcluded ? "text-rose-600 border-rose-200 bg-rose-50" : "text-amber-600 border-amber-200 bg-amber-50"
                              )}>
                                Base: {formatCurrency(item.value)} ({item.perc.toFixed(1)}%)
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {!isExcluded && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest shrink-0">Proj. +</span>
                          <div className="flex items-center gap-1.5 flex-1">
                            <Input 
                              type="number"
                              min="0"
                              className="h-7 text-xs px-2 py-0 border-indigo-100 focus-visible:ring-indigo-500 bg-indigo-50/30 font-bold"
                              value={simVal === 0 ? '' : simVal}
                              placeholder="0"
                              onChange={(e) => {
                                 const v = Math.max(0, parseInt(e.target.value) || 0);
                                 setSimulatedAdditions(prev => ({...prev, [item.cProd]: v}));
                              }}
                            />
                            <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] font-bold text-indigo-600 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100" onClick={() => setSimulatedAdditions(prev => ({...prev, [item.cProd]: simVal + 10}))}>+10</Button>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] font-bold text-indigo-600 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100" onClick={() => setSimulatedAdditions(prev => ({...prev, [item.cProd]: simVal + 50}))}>+50</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredItemsList.length === 0 && (
                  <div className="col-span-full text-center py-4 text-slate-400 text-sm">Nenhum item encontrado.</div>
                )}
              </div>
              <div className="flex items-center justify-end gap-4 text-[10px] uppercase font-bold tracking-widest">
                <span className="text-slate-400">{excludedCProds.size} Itens Expurgados</span>
                <span className="text-indigo-600 border-l border-slate-200 pl-4">{Object.values(simulatedAdditions).filter(v => v > 0).length} Itens com Projeção</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      <Card className="ri-card border-none shadow-xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-tight">Evolução do Cenário ({groupingMode})</CardTitle>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Base Realizada vs Projeção What-If</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'vendas', label: 'Fat.' },
              { id: 'cupons', label: 'Tickets' },
              { id: 'itens', label: 'Peças' },
              { id: 'tkm', label: 'TKM' },
              { id: 'pa', label: 'P.A.' },
              { id: 'pm', label: 'P.M.' },
            ].map(m => (
              <Button
                key={m.id}
                variant={activeChartMetric === m.id ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "text-[10px] font-black uppercase tracking-wider h-7 px-3 rounded-full transition-all",
                  activeChartMetric === m.id 
                    ? "bg-indigo-600 shadow-md shadow-indigo-200" 
                    : "text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                )}
                onClick={() => setActiveChartMetric(m.id as any)}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {chartData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }}
                    dy={10}
                    height={50}
                    interval={groupingMode === 'DAY' ? 0 : 'preserveStartEnd'}
                    angle={groupingMode === 'DAY' && chartData.length > 7 ? -45 : 0}
                    textAnchor={groupingMode === 'DAY' && chartData.length > 7 ? 'end' : 'middle'}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    tickFormatter={formatChartYAxis}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                    labelStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}
                    formatter={(value: any, name: any) => [formatChartTooltip(Number(value)), name === 'base' ? 'Realizado' : 'Projetado']}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}
                    formatter={(value) => value === 'base' ? 'Base Realizada' : 'Projeção (What-If)'}
                  />
                  
                  <ReferenceLine 
                    y={avgBase} 
                    stroke="#94a3b8" 
                    strokeDasharray="3 3" 
                    opacity={0.5} 
                    label={{ position: 'insideTopLeft', value: 'MÉDIA', fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} 
                  />

                  <Line 
                    type="monotone" 
                    dataKey="base" 
                    stroke="#94a3b8" 
                    strokeWidth={3} 
                    dot={{ r: 3, fill: '#94a3b8', strokeWidth: 0 }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name="base"
                  >
                    {chartData.length <= 15 && <LabelList dataKey="base" position="top" formatter={formatChartTooltip} style={{ fontSize: '9px', fontWeight: 900, fill: '#64748b' }} offset={10} />}
                  </Line>
                  {hasExclusions && (
                    <Line 
                      type="monotone" 
                      dataKey="proj" 
                      stroke="#4f46e5" 
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={{ r: 4, fill: '#4f46e5', strokeWidth: 0 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      name="proj"
                      animationDuration={1500}
                    >
                      {chartData.length <= 15 && <LabelList dataKey="proj" position="bottom" formatter={formatChartTooltip} style={{ fontSize: '9px', fontWeight: 900, fill: '#4f46e5' }} offset={10} />}
                    </Line>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-400 font-bold text-sm">
              Nenhum dado válido no período.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Análise Consolidada (Cenário)</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn("text-xs font-bold px-3 py-1.5 h-auto uppercase", forceGroupingMode === 'AUTO' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                onClick={() => setForceGroupingMode('AUTO')}
              >Auto</Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn("text-xs font-bold px-3 py-1.5 h-auto uppercase", forceGroupingMode === 'DAY' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                onClick={() => setForceGroupingMode('DAY')}
              >Dias</Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn("text-xs font-bold px-3 py-1.5 h-auto uppercase", forceGroupingMode === 'WEEKDAY' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                onClick={() => setForceGroupingMode('WEEKDAY')}
              >Dias da Sem.</Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn("text-xs font-bold px-3 py-1.5 h-auto uppercase", forceGroupingMode === 'WEEK' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                onClick={() => setForceGroupingMode('WEEK')}
              >Semanas</Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn("text-xs font-bold px-3 py-1.5 h-auto uppercase", forceGroupingMode === 'MONTH' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                onClick={() => setForceGroupingMode('MONTH')}
              >Meses</Button>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
              <select 
                className="bg-transparent text-xs font-bold text-slate-600 outline-none px-2 py-1 uppercase cursor-pointer"
                value={filterWeekday}
                onChange={(e) => setFilterWeekday(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              >
                <option value="ALL">Todos os Dias</option>
                <option value={0}>Domingos</option>
                <option value={1}>Segundas</option>
                <option value={2}>Terças</option>
                <option value={3}>Quartas</option>
                <option value={4}>Quintas</option>
                <option value={5}>Sextas</option>
                <option value={6}>Sábados</option>
              </select>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
              <Button 
                variant={includeOmniInTotal ? "default" : "ghost"} 
                size="sm" 
                className={cn("text-xs font-bold px-3 py-1.5 h-auto uppercase", includeOmniInTotal ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}
                onClick={() => setIncludeOmniInTotal(true)}
              >Com Omni</Button>
              <Button 
                variant={!includeOmniInTotal ? "default" : "ghost"} 
                size="sm" 
                className={cn("text-xs font-bold px-3 py-1.5 h-auto uppercase", !includeOmniInTotal ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}
                onClick={() => setIncludeOmniInTotal(false)}
              >Sem Omni</Button>
            </div>
          </div>
        </div>

        {/* Consolidado Geral */}
        <Card className="shadow-lg border-indigo-200 overflow-hidden ring-1 ring-indigo-50">
          <CardHeader className="bg-indigo-600 text-white py-3 px-4">
            <CardTitle className="text-base font-black uppercase tracking-widest text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-200" />
              {consolidatedGeneral.weekLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 bg-white overflow-hidden">
            <WeekTable week={consolidatedGeneral} hasExclusions={hasExclusions} />
          </CardContent>
        </Card>

        {/* Semanas Individuais */}
        {weeklyData.map(week => (
          <Card key={week.weekKey} className="shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-800 text-white py-3 px-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-100">
                {week.weekLabel}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 bg-white overflow-hidden">
               <WeekTable week={week} hasExclusions={hasExclusions} />
            </CardContent>
          </Card>
        ))}

        {weeklyData.length === 0 && (
          <div className="p-8 text-center text-slate-400 font-medium bg-white rounded-xl border border-slate-200">
            Nenhum dado válido para exibição.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-200">
            <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Taxa de Conversão: Pickup p/ Adicional
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-black tracking-wider">
                <tr>
                  <th className="p-3 border-b border-slate-200">Semana</th>
                  <th className="p-3 border-b border-slate-200 text-right">Cupons Pickup</th>
                  <th className="p-3 border-b border-slate-200 text-right">Cupons Adic.</th>
                  <th className="p-3 border-b border-slate-200 text-right">% Conversão</th>
                  <th className="p-3 border-b border-slate-200 text-right">Receita Adic. Média / Pickup</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {weeklyData.map(week => {
                  const pickupCups = week.onlineExp.cupons;
                  const adicCups = week.adicExp.cupons;
                  const conversao = pickupCups > 0 ? (adicCups / pickupCups) * 100 : 0;
                  const recMedia = pickupCups > 0 ? week.adicExp.vendas / pickupCups : 0;
                  return (
                    <tr key={week.weekKey} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-bold text-xs">{week.weekLabel}</td>
                      <td className="p-3 text-right">{pickupCups}</td>
                      <td className="p-3 text-right">{adicCups}</td>
                      <td className="p-3 text-right font-black text-indigo-600">{formatNum(conversao)}%</td>
                      <td className="p-3 text-right font-black text-emerald-600">{formatCurrency(recMedia)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-200">
            <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tight">
              Ranking de Vendedores (Por Semana)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto max-h-[400px]">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-black tracking-wider sticky top-0 shadow-sm">
                <tr>
                  <th className="p-3 border-b border-slate-200">Semana / Vendedor</th>
                  <th className="p-3 border-b border-slate-200 text-right">Venda (Projetado)</th>
                  <th className="p-3 border-b border-slate-200 text-right">P.A.</th>
                  <th className="p-3 border-b border-slate-200 text-right">TKM</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {weeklyData.map(week => (
                  <React.Fragment key={week.weekKey}>
                    <tr className="bg-slate-50 border-y border-slate-200">
                      <td colSpan={4} className="p-2 font-black text-xs text-indigo-600">{week.weekLabel}</td>
                    </tr>
                    {week.vendedores.map((v: any) => (
                      <tr key={`${week.weekKey}-${v.vendedor}`} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="p-2 pl-4 text-xs font-bold text-slate-700">{v.vendedor}</td>
                        <td className="p-2 text-right font-medium">{formatCurrency(v.vendas)}</td>
                        <td className="p-2 text-right font-bold text-sky-600">{formatNum(v.pa)}</td>
                        <td className="p-2 text-right text-slate-600">{formatCurrency(v.tkm)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

// Sub-component for rendering the horizontal table per week
function WeekTable({ week, hasExclusions }: { week: any, hasExclusions: boolean }) {
  const metrics = [
    { id: 'vendas', label: 'Venda', type: 'currency' },
    { id: 'cupons', label: 'Cupons', type: 'number' },
    { id: 'itens', label: 'Peças', type: 'number' },
    { id: 'pa', label: 'P.A.', type: 'decimal' },
    { id: 'tkm', label: 'TKM', type: 'currency' },
    { id: 'pm', label: 'P.M.', type: 'currency' },
  ];

  const formatVal = (val: number, type: string) => {
    if (type === 'currency') return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (type === 'decimal') return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val.toLocaleString('pt-BR');
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm min-w-[700px] md:min-w-full">
        <thead>
          <tr>
            <th className="p-2 border-b border-r bg-slate-50 uppercase text-[10px] font-black text-slate-500 w-28 align-middle">Indicador</th>
            {week.channels.map((ch: any) => (
               <th key={ch.id} colSpan={hasExclusions ? 3 : 1} className={cn("p-2 border-b border-r text-center uppercase text-[10px] font-black tracking-wider", ch.bgHeader)}>
                 {ch.title}
               </th>
            ))}
          </tr>
          {hasExclusions && (
            <tr>
              <th className="p-2 border-b border-r bg-slate-50"></th>
              {week.channels.map((ch: any) => (
                <React.Fragment key={`${ch.id}-sub`}>
                  <th className="p-2 border-b border-r bg-slate-50 text-[9px] uppercase text-center font-bold text-slate-500 w-24">Real.</th>
                  <th className="p-2 border-b border-r bg-indigo-50/50 text-[9px] uppercase text-center font-black text-indigo-700 w-24">Proj.</th>
                  <th className="p-2 border-b border-r bg-slate-50 text-[9px] uppercase text-center font-bold text-slate-400 w-20">Var.</th>
                </React.Fragment>
              ))}
            </tr>
          )}
        </thead>
        <tbody className="bg-white">
          {metrics.map(m => (
            <tr key={m.id} className="hover:bg-slate-50/50 border-b last:border-0 group">
              <td className="p-2.5 border-r font-black text-xs text-slate-700 bg-slate-50/30 uppercase tracking-tight">{m.label}</td>
              {week.channels.map((ch: any) => {
                const baseVal = ch.base[m.id as keyof typeof ch.base];
                const expVal = ch.exp[m.id as keyof typeof ch.exp];
                const diff = expVal - baseVal;
                const perc = baseVal > 0 ? (diff / baseVal) * 100 : 0;
                
                if (!hasExclusions) {
                  return (
                    <td key={ch.id} className="p-2.5 border-r text-center font-black text-slate-800">
                      {formatVal(baseVal, m.type)}
                    </td>
                  );
                }

                return (
                  <React.Fragment key={ch.id}>
                    <td className="p-2.5 border-r text-center text-xs font-medium text-slate-400 line-through decoration-slate-300">
                      {formatVal(baseVal, m.type)}
                    </td>
                    <td className="p-2.5 border-r text-center text-xs font-black text-slate-800 bg-indigo-50/30 group-hover:bg-indigo-50/50 transition-colors">
                      {formatVal(expVal, m.type)}
                    </td>
                    <td className="p-2.5 border-r text-center">
                       {diff !== 0 ? (
                         <div className="flex flex-col items-center gap-0.5">
                           <span className={cn(
                             "text-[9px] font-black tracking-tight",
                             diff > 0 ? "text-emerald-600" : "text-rose-600"
                           )}>
                             {diff > 0 ? '+' : ''}{formatVal(diff, m.type)}
                           </span>
                           <Badge variant="outline" className={cn(
                             "text-[8px] px-1 py-0 border shadow-sm", 
                             diff > 0 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200"
                           )}>
                             {diff > 0 ? '+' : ''}{perc.toFixed(1)}%
                           </Badge>
                         </div>
                       ) : (
                         <span className="text-[10px] text-slate-300 font-medium">-</span>
                       )}
                    </td>
                  </React.Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
