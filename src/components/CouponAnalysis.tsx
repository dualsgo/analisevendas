
"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ShoppingBag, 
  Smartphone, 
  Store, 
  Users, 
  TrendingDown, 
  Target,
  AlertTriangle,
  Flame,
  MousePointer2,
  DollarSign,
  Search,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CouponAnalysisProps {
  data: DetailedSaleRow[];
}

export function CouponAnalysis({ data }: CouponAnalysisProps) {
  const [selectedVendor, setSelectedVendor] = React.useState("TODOS");
  const [selectedRange, setSelectedRange] = React.useState<number | string>(1);
  const [selectedChannel, setSelectedChannel] = React.useState<"FISICA" | "DIGITAL" | "ADICIONAIS">("FISICA");

  const analytics = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    
    const fisica = activeSales.filter(s => s.canal === "LOJA_FISICA" && !s.is_troca);
    const digital = activeSales.filter(s => s.canal === "RETIRADA_ONLINE" || s.canal === "DELIVERY");
    const adicionais = activeSales.filter(s => s.is_adicional);

    const getItemStats = (rows: DetailedSaleRow[]) => {
      const total = rows.length;
      
      const ranges = [
        { id: 1, label: "1 Item", count: 0, rows: [] as DetailedSaleRow[] },
        { id: 2, label: "2 Itens", count: 0, rows: [] as DetailedSaleRow[] },
        { id: 3, label: "3 Itens", count: 0, rows: [] as DetailedSaleRow[] },
        { id: 4, label: "4 Itens", count: 0, rows: [] as DetailedSaleRow[] },
        { id: 5, label: "5 Itens", count: 0, rows: [] as DetailedSaleRow[] },
        { id: "6+", label: "6+ Itens", count: 0, rows: [] as DetailedSaleRow[] },
      ];

      let totalItems = 0;
      rows.forEach(s => {
        const qtd = parseInt(s.itens_qtd);
        totalItems += qtd;
        if (qtd === 1) { ranges[0].count++; ranges[0].rows.push(s); }
        else if (qtd === 2) { ranges[1].count++; ranges[1].rows.push(s); }
        else if (qtd === 3) { ranges[2].count++; ranges[2].rows.push(s); }
        else if (qtd === 4) { ranges[3].count++; ranges[3].rows.push(s); }
        else if (qtd === 5) { ranges[4].count++; ranges[4].rows.push(s); }
        else if (qtd >= 6) { ranges[5].count++; ranges[5].rows.push(s); }
      });

      const pa = total > 0 ? (totalItems / total) : 0;

      const processedRanges = ranges.map(r => {
        const rate = total > 0 ? (r.count / total) * 100 : 0;
        
        const priceRanges = [
          { label: "Até R$ 50", min: 0, max: 50, count: 0 },
          { label: "R$ 50 - 100", min: 50, max: 100, count: 0 },
          { label: "R$ 100 - 150", min: 100, max: 150, count: 0 },
          { label: "R$ 150 - 200", min: 150, max: 200, count: 0 },
          { label: "R$ 200 - 250", min: 200, max: 250, count: 0 },
          { label: "R$ 250 - 300", min: 250, max: 300, count: 0 },
          { label: "R$ 300+", min: 300, max: Infinity, count: 0 },
        ];

        const productFrequency: Record<string, { name: string, count: number }> = {};

        r.rows.forEach(s => {
          const val = parseFloat(s.vNF);
          const pRange = priceRanges.find(pr => val >= pr.min && val < pr.max);
          if (pRange) pRange.count++;

          s.itens.forEach(item => {
            const key = item.cProd;
            if (!productFrequency[key]) productFrequency[key] = { name: item.xProd, count: 0 };
            productFrequency[key].count += item.qCom;
          });
        });

        const topProducts = Object.values(productFrequency)
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        return { ...r, rate, priceRanges, topProducts };
      });

      return { total, ranges: processedRanges, pa };
    };

    const fisicaStats = getItemStats(fisica);
    const digitalStats = getItemStats(digital);
    const adicionaisStats = getItemStats(adicionais);
    const globalStats = getItemStats(activeSales);

    // Dynamic stats based on selected channel
    const currentChannelRows = 
      selectedChannel === "FISICA" ? fisica :
      selectedChannel === "DIGITAL" ? digital :
      adicionais;

    const channelSummaryStats = getItemStats(currentChannelRows);
    
    // Vendor specific stats for the SELECTED channel
    const filteredRows = selectedVendor === "TODOS" 
      ? currentChannelRows 
      : currentChannelRows.filter(s => (s.vendedor || "OUTROS") === selectedVendor);
    
    const detailedStats = getItemStats(filteredRows);
    const vendors = Array.from(new Set(currentChannelRows.map(s => s.vendedor || "OUTROS"))).sort();

    const vendorMap: Record<string, { total: number, oneItem: number }> = {};
    currentChannelRows.forEach(s => {
      const v = s.vendedor || "OUTROS";
      if (!vendorMap[v]) vendorMap[v] = { total: 0, oneItem: 0 };
      vendorMap[v].total++;
      if (parseInt(s.itens_qtd) === 1) vendorMap[v].oneItem++;
    });

    const vendorRanking = Object.entries(vendorMap).map(([name, stats]) => ({
      name,
      ...stats,
      rate: stats.total > 0 ? (stats.oneItem / stats.total) * 100 : 0
    })).sort((a, b) => b.rate - a.rate);

    // Breakdown per specific channel for impact analysis (Fixed reference)
    const channelImpact = [
      { id: "fisica", label: "Loja Física", stats: fisicaStats, color: "bg-slate-500", icon: Store },
      { id: "pickup", label: "Pickup Online", stats: getItemStats(activeSales.filter(s => s.canal === "RETIRADA_ONLINE")), color: "bg-sky-500", icon: Smartphone },
      { id: "delivery", label: "Delivery (iFood/Rappi)", stats: getItemStats(activeSales.filter(s => s.canal === "DELIVERY")), color: "bg-rose-500", icon: ShoppingBag },
      { id: "adicionais", label: "Vendas Adicionais", stats: adicionaisStats, color: "bg-emerald-500", icon: Target },
    ].map(c => ({
      ...c,
      oneItemRate: c.stats.ranges[0].rate,
      total: c.stats.total,
      weight: activeSales.length > 0 ? (c.stats.total / activeSales.length) * 100 : 0
    })).sort((a, b) => b.oneItemRate - a.oneItemRate);

    const impact = globalStats.ranges[0].rate - fisicaStats.ranges[0].rate;

    return {
      fisicaStats,
      digitalStats,
      adicionaisStats,
      globalStats,
      detailedStats,
      vendorRanking,
      vendors,
      channelImpact,
      impact
    };
  }, [data, selectedVendor, selectedChannel]);

  const currentRangeData = analytics.detailedStats.ranges.find(r => r.id === selectedRange) || analytics.detailedStats.ranges[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Comparativo de Impacto por Canal */}
      <Card className="ri-card border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-900 text-white p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2 tracking-widest">
                <Target className="w-5 h-5 text-indigo-400" /> % Cupons Unitários por Canal
              </CardTitle>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Identificando o maior impacto negativo no consolidado</p>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20">
               <p className="text-[9px] font-black uppercase opacity-60">Taxa Global de Unitários</p>
               <p className="text-xl font-black text-indigo-300">{analytics.globalStats.ranges[0].rate.toFixed(1)}%</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x border-b">
            {analytics.channelImpact.map((c, i) => (
              <div key={i} className="p-6 transition-colors hover:bg-slate-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("p-2 rounded-xl text-white", c.color)}>
                    <c.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-slate-800 uppercase leading-none">{c.label}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{c.total} cupons ({c.weight.toFixed(1)}% do total)</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Taxa Unitária</span>
                    <span className={cn(
                      "text-2xl font-black",
                      c.oneItemRate > 60 ? "text-rose-600" : (c.oneItemRate > 30 ? "text-amber-500" : "text-emerald-600")
                    )}>
                      {c.oneItemRate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={c.oneItemRate} 
                    className={cn(
                      "h-2",
                      c.oneItemRate > 60 ? "[&>div]:bg-rose-500" : (c.oneItemRate > 30 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500")
                    )} 
                  />
                  <p className="text-[8px] font-bold text-slate-400 uppercase italic">
                    {c.oneItemRate > 60 ? "CRÍTICO: Impacto Negativo Auto" : (c.oneItemRate > 30 ? "MODERADO: Impacto no Consolidado" : "SAUDÁVEL: Baixa influência")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Section */}
      <Card className="ri-card border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-900 border-b p-0">
          <div className="flex flex-col md:flex-row">
            <button 
              onClick={() => { setSelectedChannel("FISICA"); setSelectedVendor("TODOS"); }}
              className={cn(
                "flex-1 p-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 md:border-b-0 md:border-r border-white/10",
                selectedChannel === "FISICA" ? "bg-indigo-600 text-white border-indigo-400" : "text-slate-400 hover:bg-white/5"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Store className="w-4 h-4" /> Análise Loja Física
              </div>
            </button>
            <button 
              onClick={() => { setSelectedChannel("DIGITAL"); setSelectedVendor("TODOS"); }}
              className={cn(
                "flex-1 p-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 md:border-b-0 md:border-r border-white/10",
                selectedChannel === "DIGITAL" ? "bg-sky-600 text-white border-sky-400" : "text-slate-400 hover:bg-white/5"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Smartphone className="w-4 h-4" /> Análise Digital (Pickup/Deliv)
              </div>
            </button>
            <button 
              onClick={() => { setSelectedChannel("ADICIONAIS"); setSelectedVendor("TODOS"); }}
              className={cn(
                "flex-1 p-4 text-[10px] font-black uppercase tracking-widest transition-all border-white/10",
                selectedChannel === "ADICIONAIS" ? "bg-emerald-600 text-white border-emerald-400" : "text-slate-400 hover:bg-white/5"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Target className="w-4 h-4" /> Vendas Adicionais
              </div>
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <CardTitle className="text-xs font-black uppercase flex items-center gap-2 tracking-widest text-slate-800">
                <ShoppingBag className="w-4 h-4 text-indigo-500" /> Distribuição de Itens por Cupom
              </CardTitle>
              <p className="text-[10px] text-slate-400 font-bold uppercase">
                Analisando: {selectedChannel === "FISICA" ? "Loja Física" : selectedChannel === "DIGITAL" ? "Operação Digital" : "Vendas Adicionais"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {analytics.detailedStats.ranges.map((range) => (
              <button
                key={range.id}
                onClick={() => setSelectedRange(range.id)}
                className={cn(
                  "p-4 flex flex-col items-center justify-center text-center transition-all border-2 rounded-2xl",
                  selectedRange === range.id 
                    ? "bg-slate-900 border-slate-700 text-white shadow-lg scale-105 z-10" 
                    : "bg-slate-50 border-transparent hover:border-slate-200 text-slate-600"
                )}
              >
                <p className="text-[9px] font-black uppercase opacity-70 tracking-widest leading-none mb-1">{range.label}</p>
                <p className="text-2xl font-black leading-none">{range.rate.toFixed(1)}%</p>
                <p className="text-[8px] font-bold mt-1 opacity-60 uppercase">{range.count} cupons</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Dissection */}
        <Card className="ri-card">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Dissecação: {currentRangeData.label}
                </CardTitle>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Faixas de Preço (Incrementos de R$ 50)</p>
              </div>
              
              <select 
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="text-[10px] font-bold uppercase bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="TODOS">Consolidado ({selectedChannel})</option>
                {analytics.vendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between mb-2">
               <p className="text-[10px] font-black text-slate-400 border-b-2 border-slate-100 pb-1 uppercase">
                 {selectedVendor === "TODOS" ? `Visão Total ${selectedChannel}` : `Vendedor: ${selectedVendor}`}
               </p>
               <Badge className="bg-indigo-50 text-indigo-600 font-black text-[9px]">
                 {currentRangeData.count} CUPONS NESTA FAIXA
               </Badge>
            </div>

            {currentRangeData.priceRanges.map((range, i) => {
              const perc = currentRangeData.count > 0 
                ? (range.count / currentRangeData.count) * 100 
                : 0;
              return (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-slate-700 uppercase">{range.label}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{range.count} ocorrências</p>
                    </div>
                    <span className="text-xs font-black text-slate-800">{perc.toFixed(1)}%</span>
                  </div>
                  <Progress value={perc} className="h-2 bg-slate-100" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Top Products and Collaborators */}
        <div className="space-y-6">
          {/* Top 3 Items for this range */}
          <Card className="ri-card overflow-hidden">
            <CardHeader className="bg-indigo-900 text-white p-6">
              <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" /> Top 3 Itens NESTA FAIXA: {currentRangeData.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {currentRangeData.topProducts.length > 0 ? (
                <div className="space-y-3">
                  {currentRangeData.topProducts.map((p, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-white border-2 border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">
                        {i + 1}º
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-slate-800 uppercase truncate">{p.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{p.count} un. vendidas</p>
                      </div>
                      <div className="text-right shrink-0">
                         <span className="text-xs font-black text-indigo-600">
                           {((p.count / currentRangeData.count) * 100).toFixed(0)}%
                         </span>
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Presença</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-300 italic text-xs uppercase font-bold tracking-widest">
                  Sem dados para exibição
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collaborator Rank */}
          <Card className="ri-card">
            <CardHeader className="bg-slate-900 text-white p-6">
              <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" /> Vulnerabilidade (Cupons 1 Item)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 scrollbar-hide">
                {analytics.vendorRanking.map((v, i) => (
                  <button 
                    key={i} 
                    onClick={() => setSelectedVendor(v.name)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group",
                      selectedVendor === v.name 
                        ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                        : "bg-slate-50 border-slate-100 hover:border-indigo-200 hover:bg-white"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[10px] font-black text-slate-800 uppercase truncate">
                         {v.name}
                      </h4>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">{v.oneItem} unitários de {v.total}</p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "text-sm font-black",
                        v.rate > 40 ? "text-rose-600" : (v.rate > 25 ? "text-amber-500" : "text-emerald-600")
                      )}>
                        {v.rate.toFixed(1)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Seção de Resumo de Impacto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="ri-card bg-indigo-900 text-white overflow-hidden border-none p-8">
           <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
                <TrendingDown className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black uppercase tracking-tight">Incerteza Digital</h3>
                <p className="text-indigo-200 text-xs leading-relaxed">
                  As vendas originadas no site (Pickup) ou Delivery possuem uma taxa natural de 1 item próxima de 100%. Ao consolidar os dados, elas inflam artificialmente o indicador de falha da equipe.
                </p>
                <div className="pt-4 flex gap-4">
                  <div className="bg-white/10 px-3 py-2 rounded-xl">
                    <p className="text-[9px] font-bold opacity-60 uppercase">Impacto Real no %</p>
                    <p className="text-xl font-black">{analytics.impact > 0 ? "+" : ""}{analytics.impact.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
           </div>
        </Card>

        <Card className="ri-card bg-emerald-900 text-white overflow-hidden border-none p-8">
           <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
                <Target className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black uppercase tracking-tight">Oportunidade (Adicionais)</h3>
                <p className="text-emerald-200 text-xs leading-relaxed">
                  As vendas adicionais (quando o cliente retira um pickup e compra algo mais) são o contra-ponto. O objetivo é manter o P.A. de adicionais acima de 2.0.
                </p>
                <div className="pt-4 flex gap-4">
                  <div className="bg-white/10 px-3 py-2 rounded-xl">
                    <p className="text-[9px] font-bold opacity-60 uppercase">P.A. Adicionais</p>
                    <p className="text-xl font-black text-emerald-400">{analytics.adicionaisStats.pa.toFixed(2)}</p>
                  </div>
                  <div className="bg-white/10 px-3 py-2 rounded-xl">
                    <p className="text-[9px] font-bold opacity-60 uppercase">Unitários em Adicionais</p>
                    <p className="text-xl font-black text-rose-300">{analytics.adicionaisStats.ranges[0].rate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
           </div>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, icon: Icon, count, rate, pa, color, accent, subtitle }: any) {
  return (
    <Card className="ri-card border-none bg-white p-6 flex flex-col justify-between overflow-hidden relative group hover:shadow-xl transition-all">
      <div className={cn("absolute top-0 left-0 w-1.5 h-full", accent)} />
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform">
          <Icon className={cn("w-6 h-6", color)} />
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{subtitle}</p>
          <p className={cn("text-2xl font-black leading-none", color)}>{rate.toFixed(1)}%</p>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <div className="flex items-baseline gap-2">
           <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">P.A. {pa?.toFixed(2)}</p>
           <span className="text-[10px] text-slate-300 font-bold uppercase">· {count} cupons</span>
        </div>
      </div>
    </Card>
  );
}

function ImpactCard({ impact, globalRate }: any) {
  const isNegative = impact > 0;
  return (
    <Card className={cn(
      "ri-card border-none p-6 flex flex-col justify-between relative overflow-hidden",
      isNegative ? "bg-rose-50/50" : "bg-emerald-50/50"
    )}>
      <div className="flex justify-between items-start mb-6">
        <div className={cn("p-3 rounded-2xl", isNegative ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600")}>
          <TrendingDown className="w-6 h-6" />
        </div>
        <div className="text-right">
           <span className={cn("text-[9px] font-black uppercase tracking-widest leading-none", isNegative ? "text-rose-600" : "text-emerald-600")}>Unitários Total</span>
           <p className="text-2xl font-black text-slate-800 leading-none">{globalRate.toFixed(1)}%</p>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Impacto Digital</p>
        <div className="flex items-center gap-2">
          <span className={cn("text-2xl font-black", isNegative ? "text-rose-600" : "text-emerald-600")}>
            {impact > 0 ? "+" : ""}{impact.toFixed(1)}%
          </span>
          <p className="text-[9px] font-bold text-slate-500 uppercase flex-1 leading-tight tracking-tighter">
             de inflação artificial no indicador
          </p>
        </div>
      </div>
    </Card>
  );
}

