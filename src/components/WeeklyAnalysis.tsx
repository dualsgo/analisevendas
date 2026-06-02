"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { parseISO, startOfWeek, endOfWeek, format, getISOWeek, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { fadeIn } from "@/lib/animations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, CalendarDays, FilterX, TrendingUp, ChevronDown, ChevronUp, ArrowDownRight, ArrowUpRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface WeeklyAnalysisProps {
  data: DetailedSaleRow[];
}

interface ItemDefinition {
  cProd: string;
  xProd: string;
  count: number;
  value: number;
  perc: number;
}

export function WeeklyAnalysis({ data }: WeeklyAnalysisProps) {
  // Extract all unique items with their total values for impact calculation
  const { allItems, grandTotal } = useMemo(() => {
    const map = new Map<string, ItemDefinition>();
    let total = 0;
    data.filter(r => r.tpNF === 1 && !r.is_cancelada).forEach(r => {
      r.itens?.forEach(item => {
        const val = item.vProd - item.vDesc;
        total += val;
        const existing = map.get(item.cProd);
        if (existing) {
          existing.count += item.qCom;
          existing.value += val;
        } else {
          map.set(item.cProd, { cProd: item.cProd, xProd: item.xProd, count: item.qCom, value: val, perc: 0 });
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
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpurgoOpen, setIsExpurgoOpen] = useState(false);

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

  // Process data per week with exclusions applied
  const weeklyData = useMemo(() => {
    const weeksMap = new Map<string, any>();

    const validRows = data.filter(r => r.tpNF === 1 && !r.is_cancelada);

    validRows.forEach(row => {
      const date = parseISO(row.dhEmi);
      if (!isValid(date)) return;

      const weekNum = getISOWeek(date);
      const year = date.getFullYear();
      const sOfWeek = startOfWeek(date, { weekStartsOn: 1 });
      const eOfWeek = endOfWeek(date, { weekStartsOn: 1 });
      const weekLabel = `Semana ${weekNum} (${format(sOfWeek, 'dd/MM')} a ${format(eOfWeek, 'dd/MM')})`;
      const weekKey = `${year}-W${weekNum.toString().padStart(2, '0')}`;

      if (!weeksMap.has(weekKey)) {
        weeksMap.set(weekKey, {
          weekKey,
          weekLabel,
          sortKey: weekKey,
          baseRows: [],
          expRows: []
        });
      }

      const weekObj = weeksMap.get(weekKey);

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

        if (!excludedCProds.has(item.cProd)) {
          expVenda += val;
          expItens += item.qCom;
          hasExpItems = true;
        }
      });

      if (hasBaseItems && baseVenda > 0) {
        weekObj.baseRows.push({ ...row, _vNF: baseVenda, _itens: baseItens });
      }
      if (hasExpItems && expVenda > 0) {
        weekObj.expRows.push({ ...row, _vNF: expVenda, _itens: expItens });
      }
    });

    const weeksArray = Array.from(weeksMap.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    const calcMetrics = (rows: any[]) => {
      const vendas = rows.reduce((acc, r) => acc + r._vNF, 0);
      const cupons = rows.length;
      const itens = rows.reduce((acc, r) => acc + r._itens, 0);
      return {
        vendas, cupons, itens,
        tkm: cupons > 0 ? vendas / cupons : 0,
        pa: cupons > 0 ? itens / cupons : 0,
        pm: itens > 0 ? vendas / itens : 0
      };
    };

    return weeksArray.map(week => {
      const getChannelRows = (rows: any[], channelFilter: (r: any) => boolean) => rows.filter(channelFilter);
      
      const filterTotal = (r: any) => true;
      const filterFisica = (r: any) => r.canal === "LOJA_FISICA" && !r.is_troca;
      const filterOnline = (r: any) => r.canal === "RETIRADA_ONLINE";
      const filterAdic = (r: any) => r.canal === "RETIRADA_ADICIONAL";

      // Vendedores (using expRows)
      const vendsMap = new Map<string, any>();
      week.expRows.forEach((r: any) => {
        const v = r.vendedor || "NÃO IDENTIFICADO";
        if (!vendsMap.has(v)) vendsMap.set(v, { vendedor: v, vendas: 0, cupons: 0, itens: 0 });
        const curr = vendsMap.get(v);
        curr.vendas += r._vNF;
        curr.cupons += 1;
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
        channels: [
          {
            id: 'total',
            title: "Total Consolidado",
            colorTheme: "indigo",
            base: calcMetrics(getChannelRows(week.baseRows, filterTotal)),
            exp: calcMetrics(getChannelRows(week.expRows, filterTotal))
          },
          {
            id: 'fisica',
            title: "Loja Física",
            colorTheme: "sky",
            base: calcMetrics(getChannelRows(week.baseRows, filterFisica)),
            exp: calcMetrics(getChannelRows(week.expRows, filterFisica))
          },
          {
            id: 'online',
            title: "Online (Pickup/Delivery)",
            colorTheme: "emerald",
            base: calcMetrics(getChannelRows(week.baseRows, filterOnline)),
            exp: calcMetrics(getChannelRows(week.expRows, filterOnline))
          },
          {
            id: 'adic',
            title: "Adicionais de Balcão",
            colorTheme: "rose",
            base: calcMetrics(getChannelRows(week.baseRows, filterAdic)),
            exp: calcMetrics(getChannelRows(week.expRows, filterAdic))
          }
        ],
        onlineExp: calcMetrics(getChannelRows(week.expRows, filterOnline)),
        adicExp: calcMetrics(getChannelRows(week.expRows, filterAdic)),
        vendedores
      };
    });
  }, [data, excludedCProds]);

  const hasExclusions = excludedCProds.size > 0;

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FilterX className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tight">Expurgo de Itens</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsExpurgoOpen(!isExpurgoOpen)} className="text-xs uppercase font-bold text-slate-500">
              {isExpurgoOpen ? "Ocultar Filtros" : "Mostrar Filtros"}
              {isExpurgoOpen ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </CardHeader>
        {isExpurgoOpen && (
          <CardContent className="pt-4">
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
                <Button variant="outline" size="sm" onClick={selectAll} className="text-xs font-bold uppercase">Marcar Todos (Incluir)</Button>
                <Button variant="outline" size="sm" onClick={deselectAll} className="text-xs font-bold uppercase text-rose-600">Desmarcar Todos (Excluir)</Button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 max-h-64 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredItemsList.map(item => {
                  const isExcluded = excludedCProds.has(item.cProd);
                  return (
                    <div key={item.cProd} className={cn(
                      "flex items-start space-x-2 p-2 border rounded-lg transition-colors cursor-pointer",
                      isExcluded ? "bg-rose-50/50 border-rose-200" : "bg-white border-slate-100 hover:border-indigo-200"
                    )} onClick={() => toggleItem(item.cProd)}>
                      <Checkbox 
                        id={`item-${item.cProd}`} 
                        checked={!isExcluded}
                        onCheckedChange={() => toggleItem(item.cProd)}
                      />
                      <div className="grid gap-1.5 leading-none flex-1">
                        <label className="text-xs font-bold text-slate-700 leading-tight uppercase line-clamp-1 cursor-pointer">
                          {item.xProd}
                        </label>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mt-1">
                          <p className="text-[9px] text-slate-500 font-medium">Cod: {item.cProd} • Qtd: {item.count}</p>
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-black uppercase px-1.5 py-0",
                            isExcluded ? "text-rose-600 border-rose-200 bg-rose-50" : "text-amber-600 border-amber-200 bg-amber-50"
                          )}>
                            Impacto: {formatCurrency(item.value)} ({item.perc.toFixed(2)}%)
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredItemsList.length === 0 && (
                  <div className="col-span-full text-center py-4 text-slate-400 text-sm">Nenhum item encontrado.</div>
                )}
              </div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 text-right">
                {excludedCProds.size} Itens Expurgados
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="space-y-6">
        <div className="flex items-center gap-2 px-1">
          <CalendarDays className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Análise Semanal Consolidada</h2>
        </div>

        {weeklyData.map(week => (
          <Card key={week.weekKey} className="shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-800 text-white py-3 px-4">
              <CardTitle className="text-base font-black uppercase tracking-widest text-slate-100 flex justify-between items-center">
                <span>{week.weekLabel}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 bg-slate-50">
              {week.channels.map(channel => (
                <ChannelCard 
                  key={channel.id}
                  title={channel.title}
                  colorTheme={channel.colorTheme}
                  base={channel.base}
                  exp={channel.exp}
                  hasExclusions={hasExclusions}
                />
              ))}
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
                  <th className="p-3 border-b border-slate-200 text-right">Venda Total</th>
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

// Sub-component for rendering vertical channel cards inside the week
function ChannelCard({ title, colorTheme, base, exp, hasExclusions }: any) {
  const colors: Record<string, string> = {
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-800 shadow-indigo-100",
    sky: "border-sky-200 bg-sky-50 text-sky-800 shadow-sky-100",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-emerald-100",
    rose: "border-rose-200 bg-rose-50 text-rose-800 shadow-rose-100",
  };

  const headerColors: Record<string, string> = {
    indigo: "bg-indigo-100 text-indigo-800",
    sky: "bg-sky-100 text-sky-800",
    emerald: "bg-emerald-100 text-emerald-800",
    rose: "bg-rose-100 text-rose-800",
  };

  return (
    <div className={cn("border rounded-2xl flex flex-col overflow-hidden shadow-sm", colors[colorTheme])}>
      <div className={cn("px-4 py-2 font-black uppercase text-xs tracking-wider border-b border-black/5", headerColors[colorTheme])}>
        {title}
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <MetricRow label="Venda" type="currency" base={base.vendas} exp={exp.vendas} hasExclusions={hasExclusions} />
        <MetricRow label="Cupons" type="number" base={base.cupons} exp={exp.cupons} hasExclusions={hasExclusions} />
        <MetricRow label="Peças" type="number" base={base.itens} exp={exp.itens} hasExclusions={hasExclusions} />
        <MetricRow label="P.A." type="decimal" base={base.pa} exp={exp.pa} hasExclusions={hasExclusions} />
        <MetricRow label="TKM" type="currency" base={base.tkm} exp={exp.tkm} hasExclusions={hasExclusions} />
        <MetricRow label="P.M." type="currency" base={base.pm} exp={exp.pm} hasExclusions={hasExclusions} />
      </div>
    </div>
  );
}

function MetricRow({ label, type, base, exp, hasExclusions }: any) {
  const formatVal = (val: number) => {
    if (type === 'currency') return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (type === 'decimal') return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val.toLocaleString('pt-BR');
  };

  const diff = exp - base;
  const perc = base > 0 ? (diff / base) * 100 : 0;
  
  const isNegative = diff < 0;
  const isPositive = diff > 0;

  return (
    <div className="flex flex-col border-b border-black/5 pb-2 last:border-0 last:pb-0">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">{label}</span>
        <span className="text-sm font-black">{formatVal(exp)}</span>
      </div>
      
      {hasExclusions && (
        <div className="flex justify-between items-center">
          <span className="text-[9px] text-slate-400 line-through font-medium">{formatVal(base)}</span>
          {(isNegative || isPositive) && (
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded",
              isNegative ? "bg-rose-100/80 text-rose-700" : "bg-emerald-100/80 text-emerald-700"
            )}>
              {isNegative ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
              <span>{formatVal(Math.abs(diff))}</span>
              <span>({Math.abs(perc).toFixed(1)}%)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
