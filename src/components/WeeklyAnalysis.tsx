"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow, Item } from "@/lib/types";
import { parseISO, startOfWeek, endOfWeek, format, getISOWeek, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { fadeIn, slideUp } from "@/lib/animations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, CalendarDays, FilterX, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WeeklyAnalysisProps {
  data: DetailedSaleRow[];
}

interface ItemDefinition {
  cProd: string;
  xProd: string;
  count: number;
}

export function WeeklyAnalysis({ data }: WeeklyAnalysisProps) {
  // Extract all unique items
  const allItems = useMemo(() => {
    const map = new Map<string, ItemDefinition>();
    data.filter(r => r.tpNF === 1 && !r.is_cancelada).forEach(r => {
      r.itens?.forEach(item => {
        const existing = map.get(item.cProd);
        if (existing) {
          existing.count += item.qCom;
        } else {
          map.set(item.cProd, { cProd: item.cProd, xProd: item.xProd, count: item.qCom });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
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
          rows: []
        });
      }

      // Apply Expurgo
      let finalVenda = 0;
      let finalItens = 0;
      let hasValidItems = false;

      row.itens?.forEach(item => {
        if (!excludedCProds.has(item.cProd)) {
          finalVenda += (item.vProd - item.vDesc);
          finalItens += item.qCom;
          hasValidItems = true;
        }
      });

      // Se a nota não tem itens válidos ou valor zerou, pula.
      if (hasValidItems && finalVenda > 0) {
        weeksMap.get(weekKey).rows.push({
          ...row,
          _exp_vNF: finalVenda,
          _exp_itens: finalItens
        });
      }
    });

    const weeksArray = Array.from(weeksMap.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    // Calculate metrics for each week
    return weeksArray.map(week => {
      const calcChannelMetrics = (rows: any[]) => {
        const vendas = rows.reduce((acc, r) => acc + r._exp_vNF, 0);
        const cupons = rows.length;
        const itens = rows.reduce((acc, r) => acc + r._exp_itens, 0);
        return {
          vendas,
          cupons,
          itens,
          tkm: cupons > 0 ? vendas / cupons : 0,
          pa: cupons > 0 ? itens / cupons : 0,
          pm: itens > 0 ? vendas / itens : 0
        };
      };

      const rows = week.rows;
      const fisica = rows.filter((r: any) => r.canal === "LOJA_FISICA" && !r.is_troca);
      const online = rows.filter((r: any) => r.canal === "RETIRADA_ONLINE");
      const adicional = rows.filter((r: any) => r.canal === "RETIRADA_ADICIONAL");
      
      const vendsMap = new Map<string, any>();
      rows.forEach((r: any) => {
        const v = r.vendedor || "NÃO IDENTIFICADO";
        if (!vendsMap.has(v)) vendsMap.set(v, { vendedor: v, vendas: 0, cupons: 0, itens: 0 });
        const curr = vendsMap.get(v);
        curr.vendas += r._exp_vNF;
        curr.cupons += 1;
        curr.itens += r._exp_itens;
      });

      const vendedores = Array.from(vendsMap.values()).map(v => ({
        ...v,
        pa: v.cupons > 0 ? v.itens / v.cupons : 0,
        tkm: v.cupons > 0 ? v.vendas / v.cupons : 0
      })).sort((a, b) => b.vendas - a.vendas);

      return {
        weekLabel: week.weekLabel,
        total: calcChannelMetrics(rows),
        fisica: calcChannelMetrics(fisica),
        online: calcChannelMetrics(online),
        adicional: calcChannelMetrics(adicional),
        vendedores
      };
    });
  }, [data, excludedCProds]);

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatNum = (val: number) => val.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

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
                {filteredItemsList.map(item => (
                  <div key={item.cProd} className="flex items-start space-x-2 bg-white p-2 border border-slate-100 rounded-lg hover:border-indigo-200 transition-colors">
                    <Checkbox 
                      id={`item-${item.cProd}`} 
                      checked={!excludedCProds.has(item.cProd)}
                      onCheckedChange={() => toggleItem(item.cProd)}
                    />
                    <div className="grid gap-1.5 leading-none cursor-pointer flex-1" onClick={() => toggleItem(item.cProd)}>
                      <label className="text-xs font-bold text-slate-700 leading-tight uppercase line-clamp-1 cursor-pointer">
                        {item.xProd}
                      </label>
                      <p className="text-[10px] text-slate-500 font-medium">Cod: {item.cProd} • Qtd: {item.count}</p>
                    </div>
                  </div>
                ))}
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

      {/* TEXT-FRIENDLY TABLES FOR LLM COPYING */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-600" />
            <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tight">Análise Semanal Consolidada</CardTitle>
          </div>
          <p className="text-xs text-slate-500 font-medium">Os dados abaixo estão formatados para facilitar a cópia e colagem em planilhas ou prompts de IA.</p>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-black tracking-wider">
              <tr>
                <th className="p-3 border-b border-r border-slate-200 whitespace-nowrap">Semana</th>
                <th colSpan={6} className="p-3 border-b border-r border-slate-200 text-center bg-indigo-50/50">Total Consolidado</th>
                <th colSpan={6} className="p-3 border-b border-r border-slate-200 text-center bg-sky-50/50">Loja Física</th>
                <th colSpan={6} className="p-3 border-b border-r border-slate-200 text-center bg-emerald-50/50">Online (Pickup/Delivery)</th>
                <th colSpan={6} className="p-3 border-b border-slate-200 text-center bg-rose-50/50">Adicionais de Balcão</th>
              </tr>
              <tr className="bg-white">
                <th className="p-2 border-b border-r border-slate-200"></th>
                {/* Total */}
                <th className="p-2 border-b border-slate-200 text-right">Venda</th>
                <th className="p-2 border-b border-slate-200 text-right">Cupons</th>
                <th className="p-2 border-b border-slate-200 text-right">Peças</th>
                <th className="p-2 border-b border-slate-200 text-right">PA</th>
                <th className="p-2 border-b border-slate-200 text-right">TKM</th>
                <th className="p-2 border-b border-r border-slate-200 text-right">PM</th>
                {/* Física */}
                <th className="p-2 border-b border-slate-200 text-right">Venda</th>
                <th className="p-2 border-b border-slate-200 text-right">Cupons</th>
                <th className="p-2 border-b border-slate-200 text-right">Peças</th>
                <th className="p-2 border-b border-slate-200 text-right">PA</th>
                <th className="p-2 border-b border-slate-200 text-right">TKM</th>
                <th className="p-2 border-b border-r border-slate-200 text-right">PM</th>
                {/* Online */}
                <th className="p-2 border-b border-slate-200 text-right">Venda</th>
                <th className="p-2 border-b border-slate-200 text-right">Cupons</th>
                <th className="p-2 border-b border-slate-200 text-right">Peças</th>
                <th className="p-2 border-b border-slate-200 text-right">PA</th>
                <th className="p-2 border-b border-slate-200 text-right">TKM</th>
                <th className="p-2 border-b border-r border-slate-200 text-right">PM</th>
                {/* Adicionais */}
                <th className="p-2 border-b border-slate-200 text-right">Venda</th>
                <th className="p-2 border-b border-slate-200 text-right">Cupons</th>
                <th className="p-2 border-b border-slate-200 text-right">Peças</th>
                <th className="p-2 border-b border-slate-200 text-right">PA</th>
                <th className="p-2 border-b border-slate-200 text-right">TKM</th>
                <th className="p-2 border-b border-slate-200 text-right">PM</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {weeklyData.map((week, index) => (
                <tr key={week.weekLabel} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2 border-b border-r border-slate-200 font-bold text-xs whitespace-nowrap">{week.weekLabel}</td>
                  
                  {/* Total */}
                  <td className="p-2 border-b border-slate-200 text-right font-medium text-slate-800">{formatCurrency(week.total.vendas)}</td>
                  <td className="p-2 border-b border-slate-200 text-right text-slate-600">{week.total.cupons}</td>
                  <td className="p-2 border-b border-slate-200 text-right text-slate-600">{week.total.itens}</td>
                  <td className="p-2 border-b border-slate-200 text-right font-bold text-indigo-600">{formatNum(week.total.pa)}</td>
                  <td className="p-2 border-b border-slate-200 text-right text-slate-600">{formatCurrency(week.total.tkm)}</td>
                  <td className="p-2 border-b border-r border-slate-200 text-right text-slate-600">{formatCurrency(week.total.pm)}</td>
                  
                  {/* Física */}
                  <td className="p-2 border-b border-slate-200 text-right font-medium text-slate-800">{formatCurrency(week.fisica.vendas)}</td>
                  <td className="p-2 border-b border-slate-200 text-right text-slate-600">{week.fisica.cupons}</td>
                  <td className="p-2 border-b border-slate-200 text-right text-slate-600">{week.fisica.itens}</td>
                  <td className="p-2 border-b border-slate-200 text-right font-bold text-indigo-600">{formatNum(week.fisica.pa)}</td>
                  <td className="p-2 border-b border-slate-200 text-right text-slate-600">{formatCurrency(week.fisica.tkm)}</td>
                  <td className="p-2 border-b border-r border-slate-200 text-right text-slate-600">{formatCurrency(week.fisica.pm)}</td>

                  {/* Online */}
                  <td className="p-2 border-b border-slate-200 text-right font-medium text-slate-800">{formatCurrency(week.online.vendas)}</td>
                  <td className="p-2 border-b border-slate-200 text-right text-slate-600">{week.online.cupons}</td>
                  <td className="p-2 border-b border-slate-200 text-right text-slate-600">{week.online.itens}</td>
                  <td className="p-2 border-b border-slate-200 text-right font-bold text-indigo-600">{formatNum(week.online.pa)}</td>
                  <td className="p-2 border-b border-slate-200 text-right text-slate-600">{formatCurrency(week.online.tkm)}</td>
                  <td className="p-2 border-b border-r border-slate-200 text-right text-slate-600">{formatCurrency(week.online.pm)}</td>

                  {/* Adicionais */}
                  <td className="p-2 border-b border-slate-200 text-right font-medium text-slate-800">{formatCurrency(week.adicional.vendas)}</td>
                  <td className="p-2 border-b border-slate-200 text-right text-slate-600">{week.adicional.cupons}</td>
                  <td className="p-2 border-b border-slate-200 text-right text-slate-600">{week.adicional.itens}</td>
                  <td className="p-2 border-b border-slate-200 text-right font-bold text-indigo-600">{formatNum(week.adicional.pa)}</td>
                  <td className="p-2 border-b border-slate-200 text-right text-slate-600">{formatCurrency(week.adicional.tkm)}</td>
                  <td className="p-2 border-b border-slate-200 text-right text-slate-600">{formatCurrency(week.adicional.pm)}</td>
                </tr>
              ))}
              {weeklyData.length === 0 && (
                <tr>
                  <td colSpan={25} className="p-8 text-center text-slate-400 font-medium">Nenhum dado válido para exibição.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

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
                  const pickupCups = week.online.cupons;
                  const adicCups = week.adicional.cupons;
                  const conversao = pickupCups > 0 ? (adicCups / pickupCups) * 100 : 0;
                  const recMedia = pickupCups > 0 ? week.adicional.vendas / pickupCups : 0;
                  return (
                    <tr key={week.weekLabel} className="border-b border-slate-100 hover:bg-slate-50">
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
                  <React.Fragment key={week.weekLabel}>
                    <tr className="bg-slate-50 border-y border-slate-200">
                      <td colSpan={4} className="p-2 font-black text-xs text-indigo-600">{week.weekLabel}</td>
                    </tr>
                    {week.vendedores.map(v => (
                      <tr key={`${week.weekLabel}-${v.vendedor}`} className="border-b border-slate-50 hover:bg-slate-50">
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
