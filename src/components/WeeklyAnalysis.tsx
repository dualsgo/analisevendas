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
import { Search, CalendarDays, FilterX, TrendingUp, ChevronDown, ChevronUp, Layers } from "lucide-react";
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
  const [includeOmniInTotal, setIncludeOmniInTotal] = useState(true);

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
  const { weeklyData, consolidatedGeneral } = useMemo(() => {
    const weeksMap = new Map<string, any>();
    const allBaseRows: any[] = [];
    const allExpRows: any[] = [];

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
        const r = { ...row, _vNF: baseVenda, _itens: baseItens };
        weekObj.baseRows.push(r);
        allBaseRows.push(r);
      }
      if (hasExpItems && expVenda > 0) {
        const r = { ...row, _vNF: expVenda, _itens: expItens };
        weekObj.expRows.push(r);
        allExpRows.push(r);
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

    const filterTotal = (r: any) => includeOmniInTotal ? true : (r.canal !== "RETIRADA_ONLINE" && r.canal !== "RETIRADA_ADICIONAL");
    const filterFisica = (r: any) => r.canal === "LOJA_FISICA" && !r.is_troca;
    const filterOnline = (r: any) => r.canal === "RETIRADA_ONLINE";
    const filterAdic = (r: any) => r.canal === "RETIRADA_ADICIONAL";
    
    const buildChannels = (bRows: any[], eRows: any[]) => {
      const baseList = [
        {
          id: 'total',
          title: includeOmniInTotal ? "Total Consolidado" : "Total (Sem Omni)",
          bgHeader: "bg-indigo-50 text-indigo-800 border-indigo-100",
          base: calcMetrics(bRows.filter(filterTotal)),
          exp: calcMetrics(eRows.filter(filterTotal))
        },
        {
          id: 'fisica',
          title: "Loja Física",
          bgHeader: "bg-sky-50 text-sky-800 border-sky-100",
          base: calcMetrics(bRows.filter(filterFisica)),
          exp: calcMetrics(eRows.filter(filterFisica))
        }
      ];

      if (includeOmniInTotal) {
        return [
          ...baseList,
          {
            id: 'online',
            title: "Retirada (Pickup)",
            bgHeader: "bg-emerald-50 text-emerald-800 border-emerald-100",
            base: calcMetrics(bRows.filter(filterOnline)),
            exp: calcMetrics(eRows.filter(filterOnline))
          },
          {
            id: 'adic',
            title: "Adicionais de Balcão",
            bgHeader: "bg-rose-50 text-rose-800 border-rose-100",
            base: calcMetrics(bRows.filter(filterAdic)),
            exp: calcMetrics(eRows.filter(filterAdic))
          }
        ];
      } else {
        return [
          ...baseList,
          {
            id: 'troca',
            title: "Diferença de Troca",
            bgHeader: "bg-orange-50 text-orange-800 border-orange-100",
            base: calcMetrics(bRows.filter(r => r.is_troca)),
            exp: calcMetrics(eRows.filter(r => r.is_troca))
          },
          {
            id: 'delivery',
            title: "Delivery (Ifood/Rappi)",
            bgHeader: "bg-purple-50 text-purple-800 border-purple-100",
            base: calcMetrics(bRows.filter(r => r.canal === "DELIVERY")),
            exp: calcMetrics(eRows.filter(r => r.canal === "DELIVERY"))
          }
        ];
      }
    };

    const weeklyDataFormatted = weeksArray.map(week => {
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

    return { weeklyData: weeklyDataFormatted, consolidatedGeneral };
  }, [data, excludedCProds, includeOmniInTotal]);

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Análise Expurgada Consolidada</h2>
          </div>
          
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
            <Button 
              variant={includeOmniInTotal ? "default" : "ghost"} 
              size="sm" 
              className={cn("text-[10px] font-black uppercase tracking-wider px-4", includeOmniInTotal && "bg-indigo-600 shadow-sm")}
              onClick={() => setIncludeOmniInTotal(true)}
            >
              Com Omni
            </Button>
            <Button 
              variant={!includeOmniInTotal ? "default" : "ghost"} 
              size="sm" 
              className={cn("text-[10px] font-black uppercase tracking-wider px-4", !includeOmniInTotal && "bg-rose-600 text-white shadow-sm hover:bg-rose-700 hover:text-white")}
              onClick={() => setIncludeOmniInTotal(false)}
            >
              Sem Omni
            </Button>
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
