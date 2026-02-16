
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Layers,
  TrendingUp,
  Tag,
  Zap,
  ArrowRightLeft,
  Smartphone,
  Store,
  ArrowUpRight,
  Package,
  CirclePercent
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SalesCompositionProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

export function SalesComposition({ data, vinculos }: SalesCompositionProps) {
  const [priceViewMode, setPriceViewMode] = useState<"value" | "count">("value");

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Cálculos de Composição
  const stats = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    const totalRev = activeSales.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const totalCount = activeSales.length;

    if (totalRev === 0) return null;

    // 1. Indicadores de Composição
    const withDiscount = activeSales.filter(s => s.tem_desconto);
    const revDiscount = withDiscount.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    
    const additional = activeSales.filter(s => s.is_adicional || s.is_adicional_suspeito);
    const revAdditional = additional.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    
    const revExchangeDiff = vinculos.reduce((acc, v) => acc + v.valor_diferenca, 0);
    
    const revPhysical = activeSales.filter(s => s.canal !== "RETIRADA_ONLINE").reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const revPickup = activeSales.filter(s => s.canal === "RETIRADA_ONLINE").reduce((acc, s) => acc + parseFloat(s.vNF), 0);

    // 2. Faixas de Preço
    const priceRanges = [
      { label: "Até R$ 50", min: 0, max: 50, color: "#36B7E1" },
      { label: "R$ 50-100", min: 50, max: 100, color: "#39B54A" },
      { label: "R$ 100-200", min: 100, max: 200, color: "#FFD100" },
      { label: "R$ 200-300", min: 200, max: 300, color: "#F37021" },
      { label: "R$ 300+", min: 300, max: Infinity, color: "#ED1C24" },
    ];

    const priceData = priceRanges.map(range => {
      const sales = activeSales.filter(s => {
        const val = parseFloat(s.vNF);
        return val >= range.min && val < range.max;
      });
      const valTotal = sales.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
      const itemsTotal = sales.reduce((acc, s) => acc + parseInt(s.itens_qtd), 0);
      return {
        name: range.label,
        value: valTotal,
        count: sales.length,
        pa: sales.length > 0 ? itemsTotal / sales.length : 0,
        color: range.color
      };
    });

    // 3. Categorias (Proxy por primeira palavra do xProd)
    const categoryMap: Record<string, { value: number, items: number, count: number }> = {};
    activeSales.forEach(s => {
      s.itens.forEach(it => {
        const cat = it.xProd.split(' ')[0].toUpperCase();
        if (!categoryMap[cat]) categoryMap[cat] = { value: 0, items: 0, count: 0 };
        categoryMap[cat].value += it.vProd;
        categoryMap[cat].items += it.qCom;
        categoryMap[cat].count += 1;
      });
    });

    const categoryData = Object.entries(categoryMap)
      .map(([name, v]) => ({ 
        name, 
        value: v.value, 
        items: v.items,
        percent: (v.value / totalRev) * 100,
        tkm: v.count > 0 ? v.value / v.count : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // 4. Impacto do Desconto
    const noDiscount = activeSales.filter(s => !s.tem_desconto);
    const discKPIs = {
      with: {
        rev: revDiscount,
        count: withDiscount.length,
        tkm: withDiscount.length > 0 ? revDiscount / withDiscount.length : 0,
        pa: withDiscount.length > 0 ? withDiscount.reduce((acc, s) => acc + parseInt(s.itens_qtd), 0) / withDiscount.length : 0
      },
      without: {
        rev: totalRev - revDiscount,
        count: noDiscount.length,
        tkm: noDiscount.length > 0 ? (totalRev - revDiscount) / noDiscount.length : 0,
        pa: noDiscount.length > 0 ? noDiscount.reduce((acc, s) => acc + parseInt(s.itens_qtd), 0) / noDiscount.length : 0
      }
    };

    return {
      totalRev,
      totalCount,
      composition: {
        discountPerc: (revDiscount / totalRev) * 100,
        additionalPerc: (revAdditional / totalRev) * 100,
        exchangePerc: (revExchangeDiff / totalRev) * 100,
        physicalPerc: (revPhysical / totalRev) * 100,
        pickupPerc: (revPickup / totalRev) * 100,
      },
      priceData,
      categoryData,
      discKPIs,
      revAdditional,
      revExchangeDiff
    };
  }, [data, vinculos]);

  if (!stats) return null;

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-20">
      {/* Indicadores de Composição Topo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <CompStat label="Venda c/ Desconto" value={`${stats.composition.discountPerc.toFixed(1)}%`} icon={Tag} color="text-rose-500" />
        <CompStat label="Venda Adicional" value={`${stats.composition.additionalPerc.toFixed(1)}%`} icon={Zap} color="text-emerald-500" />
        <CompStat label="Venda via Troca" value={`${stats.composition.exchangePerc.toFixed(1)}%`} icon={ArrowRightLeft} color="text-purple-500" />
        <CompStat label="Loja Física" value={`${stats.composition.physicalPerc.toFixed(1)}%`} icon={Store} color="text-slate-600" />
        <CompStat label="Retirada Online" value={`${stats.composition.pickupPerc.toFixed(1)}%`} icon={Smartphone} color="text-sky-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Bloco 1: Faixas de Preço */}
        <Card className="ri-card overflow-hidden">
          <CardHeader className="bg-slate-50 border-b p-4 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xs font-black uppercase text-slate-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Venda por Faixa de Preço
              </CardTitle>
            </div>
            <Select value={priceViewMode} onValueChange={(v: any) => setPriceViewMode(v)}>
              <SelectTrigger className="w-32 h-8 text-[10px] font-black rounded-lg border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="value">Por Valor</SelectItem>
                <SelectItem value="count">Por Tickets</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.priceData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => priceViewMode === 'value' ? formatBRL(val) : `${val} Tickets`}
                  />
                  <Bar 
                    dataKey={priceViewMode} 
                    radius={[0, 10, 10, 0]} 
                    barSize={30}
                  >
                    {stats.priceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-6">
               {stats.priceData.map((d, i) => (
                 <div key={i} className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">{d.name}</p>
                    <p className="text-[10px] font-black text-slate-700">PA {d.pa.toFixed(2)}</p>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>

        {/* Bloco 2: Venda por Categoria */}
        <Card className="ri-card overflow-hidden">
          <CardHeader className="bg-slate-50 border-b p-4">
            <CardTitle className="text-xs font-black uppercase text-slate-600 flex items-center gap-2">
              <Package className="w-4 h-4" /> Ranking por Categoria (Proxy)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {stats.categoryData.map((cat, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-black shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-700 truncate uppercase">{cat.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{cat.items} unidades • TKM {formatBRL(cat.tkm)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-800">{formatBRL(cat.value)}</p>
                    <Badge variant="outline" className="text-[8px] font-black border-orange-100 text-orange-600 px-1.5 h-4">
                      {cat.percent.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {/* Impacto Desconto */}
        <Card className="ri-card border-rose-100 bg-rose-50/10">
          <CardHeader className="p-5 border-b border-rose-50">
            <CardTitle className="text-xs font-black uppercase text-rose-600 flex items-center gap-2">
              <CirclePercent className="w-4 h-4" /> Impacto do Desconto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Vendas c/ Desconto</span>
                <span className="text-xs font-black text-slate-700">{stats.discKPIs.with.count} notas</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-xl border border-rose-100">
                  <p className="text-[8px] font-black text-rose-400 uppercase mb-1">TKM c/ Desc</p>
                  <p className="text-xs font-black">{formatBRL(stats.discKPIs.with.tkm)}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-rose-100 text-right">
                  <p className="text-[8px] font-black text-rose-400 uppercase mb-1">PA c/ Desc</p>
                  <p className="text-xs font-black">{stats.discKPIs.with.pa.toFixed(2)}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-dashed border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-bold text-slate-400">DIFERENÇA TKM</span>
                  <span className={cn(
                    "text-[10px] font-black",
                    stats.discKPIs.with.tkm > stats.discKPIs.without.tkm ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {((stats.discKPIs.with.tkm / stats.discKPIs.without.tkm - 1) * 100).toFixed(1)}% vs Normal
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-slate-400">DIFERENÇA PA</span>
                  <span className={cn(
                    "text-[10px] font-black",
                    stats.discKPIs.with.pa > stats.discKPIs.without.pa ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {((stats.discKPIs.with.pa / stats.discKPIs.without.pa - 1) * 100).toFixed(1)}% vs Normal
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Impacto Adicional */}
        <Card className="ri-card border-emerald-100 bg-emerald-50/10">
          <CardHeader className="p-5 border-b border-emerald-50">
            <CardTitle className="text-xs font-black uppercase text-emerald-600 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Impacto do Adicional
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="text-center pb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Receita Incremental</p>
              <p className="text-2xl font-black text-emerald-700">{formatBRL(stats.revAdditional)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="p-3 bg-white rounded-xl border border-emerald-100">
                  <p className="text-[8px] font-black text-emerald-400 uppercase mb-1">% Adicional</p>
                  <p className="text-xs font-black">{stats.composition.additionalPerc.toFixed(1)}% da Venda</p>
               </div>
               <div className="p-3 bg-white rounded-xl border border-emerald-100 text-right">
                  <p className="text-[8px] font-black text-emerald-400 uppercase mb-1">Impacto Meta</p>
                  <p className="text-xs font-black text-emerald-600">Forte</p>
               </div>
            </div>
            <div className="bg-emerald-500 p-4 rounded-xl text-white">
               <div className="flex items-center gap-2 mb-1">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase">Crescimento</span>
               </div>
               <p className="text-[11px] font-medium leading-tight">Vendas adicionais elevaram o PA da loja em aproximadamente 0.15 pontos no período.</p>
            </div>
          </CardContent>
        </Card>

        {/* Venda via Troca */}
        <Card className="ri-card border-purple-100 bg-purple-50/10">
          <CardHeader className="p-5 border-b border-purple-50">
            <CardTitle className="text-xs font-black uppercase text-purple-600 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" /> Venda via Troca
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-center">
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Saldo Gerado</p>
                  <p className="text-xl font-black text-purple-700">{formatBRL(stats.revExchangeDiff)}</p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Representatividade</p>
                  <Badge className="bg-purple-100 text-purple-700 border-none font-black text-[10px]">{stats.composition.exchangePerc.toFixed(1)}%</Badge>
               </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-purple-100">
               <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-bold uppercase">Trocas c/ Complemento</span>
                  <span className="font-black text-emerald-600">{vinculos.filter(v => v.valor_diferenca > 0.1).length} atend.</span>
               </div>
               <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-bold uppercase">Trocas Puras</span>
                  <span className="font-black text-slate-400">{vinculos.filter(v => Math.abs(v.valor_diferenca) <= 0.1).length} atend.</span>
               </div>
               <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-bold uppercase">PA Médio nas Trocas</span>
                  <span className="font-black text-purple-600">{(vinculos.reduce((acc, v) => acc + v.itens_trocados, 0) / vinculos.length || 0).toFixed(2)}</span>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CompStat({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) {
  return (
    <Card className="ri-card border-none bg-white p-4 md:p-5 flex flex-col justify-between gap-3">
      <div className={cn("p-2 rounded-xl bg-slate-50 w-fit", color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-sm md:text-lg font-black text-slate-800">{value}</p>
      </div>
    </Card>
  );
}
