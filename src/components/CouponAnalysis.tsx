
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

  const analytics = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    
    const fisica = activeSales.filter(s => s.canal === "LOJA_FISICA" && !s.is_troca);
    const pickup = activeSales.filter(s => s.canal === "RETIRADA_ONLINE");

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

      rows.forEach(s => {
        const qtd = parseInt(s.itens_qtd);
        if (qtd === 1) { ranges[0].count++; ranges[0].rows.push(s); }
        else if (qtd === 2) { ranges[1].count++; ranges[1].rows.push(s); }
        else if (qtd === 3) { ranges[2].count++; ranges[2].rows.push(s); }
        else if (qtd === 4) { ranges[3].count++; ranges[3].rows.push(s); }
        else if (qtd === 5) { ranges[4].count++; ranges[4].rows.push(s); }
        else if (qtd >= 6) { ranges[5].count++; ranges[5].rows.push(s); }
      });

      const processedRanges = ranges.map(r => {
        const rate = total > 0 ? (r.count / total) * 100 : 0;
        
        // Price Dissection for this specific item range
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

          // For Top 3
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

      return { total, ranges: processedRanges };
    };

    const fisicaStats = getItemStats(fisica);
    const globalStats = getItemStats(activeSales);

    // Vendor specific stats
    const filteredFisica = selectedVendor === "TODOS" 
      ? fisica 
      : fisica.filter(s => (s.vendedor || "OUTROS") === selectedVendor);
    
    const vendorFisicaStats = getItemStats(filteredFisica);

    // List of vendors for the selector
    const vendors = Array.from(new Set(fisica.map(s => s.vendedor || "OUTROS"))).sort();

    const vendorMap: Record<string, { total: number, oneItem: number }> = {};
    fisica.forEach(s => {
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

    const impact = globalStats.ranges[0].rate - fisicaStats.ranges[0].rate;

    return {
      fisicaStats,
      globalStats,
      vendorFisicaStats,
      vendorRanking,
      vendors,
      impact
    };
  }, [data, selectedVendor]);

  const currentRangeData = analytics.vendorFisicaStats.ranges.find(r => r.id === selectedRange) || analytics.vendorFisicaStats.ranges[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Item Ranges Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {analytics.vendorFisicaStats.ranges.map((range) => (
          <button
            key={range.id}
            onClick={() => setSelectedRange(range.id)}
            className={cn(
              "ri-card p-4 flex flex-col items-center justify-center text-center transition-all border-2",
              selectedRange === range.id 
                ? "bg-indigo-600 border-indigo-400 text-white shadow-lg scale-105 z-10" 
                : "bg-white border-transparent hover:border-indigo-100 text-slate-600"
            )}
          >
            <p className="text-[10px] font-black uppercase opacity-70 tracking-widest leading-none mb-1">{range.label}</p>
            <p className="text-2xl font-black leading-none">{range.rate.toFixed(1)}%</p>
            <p className="text-[9px] font-bold mt-1 opacity-60">{range.count} cupons</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Dissection */}
        <Card className="ri-card">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Dissecação: {currentRangeData.label}
                </CardTitle>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Faixas de Preço a cada R$ 50</p>
              </div>
              
              <select 
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="text-[10px] font-bold uppercase bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="TODOS">Todas Vendas (Física)</option>
                {analytics.vendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between mb-2">
               <p className="text-[10px] font-black text-slate-400 border-b-2 border-slate-100 pb-1">
                 {selectedVendor === "TODOS" ? "VISÃO GERAL DA LOJA" : `ANÁLISE INDIVIDUAL: ${selectedVendor}`}
               </p>
               <Badge className="bg-slate-100 text-slate-600 font-black text-[9px] hover:bg-slate-200">
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
                      <p className="text-[9px] font-bold text-slate-400">{range.count} Cupons encontrados</p>
                    </div>
                    <span className="text-xs font-black text-slate-800">{perc.toFixed(1)}%</span>
                  </div>
                  <Progress value={perc} className="h-2 bg-slate-100" />
                </div>
              );
            })}
            
            {currentRangeData.id === 1 && (
              <div className="pt-4 border-t border-dashed mt-6">
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium text-amber-800 leading-relaxed italic">
                    <strong>Insight:</strong> Cupons de 1 item com ticket acima de R$ 100 representam a maior falha de "venda sugestiva".
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products and Collaborators */}
        <div className="space-y-6">
          {/* Top 3 Items for this range */}
          <Card className="ri-card overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-6">
              <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" /> Top 3 Itens NESTA FAIXA: {currentRangeData.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {currentRangeData.topProducts.length > 0 ? (
                <div className="space-y-3">
                  {currentRangeData.topProducts.map((p, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs">
                        {i + 1}º
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-slate-800 uppercase truncate">{p.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{p.count} UNIDADES NESTA FAIXA</p>
                      </div>
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-black text-[10px]">
                        {currentRangeData.count > 0 ? ((p.count / currentRangeData.count) * 100).toFixed(0) : 0}% PRESENÇA
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 italic text-xs">
                  Nenhum item identificado nesta faixa.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collaborator Rank */}
          <Card className="ri-card">
            <CardHeader className="bg-indigo-600 text-white p-6">
              <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-200" /> Rank Vulnerabilidade (1 Item)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 scrollbar-hide">
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
                      <h4 className="text-[11px] font-black text-slate-800 uppercase truncate">
                         {v.name}
                      </h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{v.oneItem} de {v.total} cupons</p>
                    </div>
                    <span className={cn(
                      "text-sm font-black",
                      v.rate > 40 ? "text-rose-600" : (v.rate > 25 ? "text-amber-500" : "text-emerald-600")
                    )}>
                      {v.rate.toFixed(1)}%
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Impact Detail */}
      <Card className="ri-card bg-indigo-600 text-white overflow-hidden border-none">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Search className="w-32 h-32" />
        </div>
        <CardContent className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-white/30">
             <TrendingDown className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
              Impacto do Pickup no Consolidado
            </h2>
            <p className="text-indigo-100 text-sm md:text-base font-medium max-w-2xl leading-relaxed">
              O Pickup Online, por ser de item único, altera a percepção do P.A. (Peças por Atendimento) real da loja física.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
               <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                  <p className="text-[9px] font-black uppercase opacity-70">Taxa 1-Item Loja</p>
                  <p className="text-xl font-black">{analytics.fisicaStats.ranges[0].rate.toFixed(1)}%</p>
               </div>
               <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                  <p className="text-[9px] font-black uppercase opacity-70">Taxa 1-Item Geral</p>
                  <p className="text-xl font-black">{analytics.globalStats.ranges[0].rate.toFixed(1)}%</p>
               </div>
               <div className="bg-emerald-400/20 px-4 py-2 rounded-xl border border-emerald-400/30 flex items-center gap-3">
                    <div className="text-left">
                       <p className="text-[9px] font-black uppercase text-emerald-300">Diferencial</p>
                       <p className="text-xl font-black text-emerald-400">{analytics.impact > 0 ? "+" : ""}{analytics.impact.toFixed(1)}%</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
               </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({ title, icon: Icon, count, rate, color, accent }: any) {
  return (
    <Card className="ri-card border-none bg-white p-6 flex flex-col justify-between overflow-hidden relative">
      <div className={cn("absolute top-0 left-0 w-1 h-full", accent)} />
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-slate-50 rounded-2xl">
          <Icon className={cn("w-6 h-6", color)} />
        </div>
        <Badge variant="outline" className="border-slate-200 text-slate-400 font-bold text-[10px] uppercase">Absoluto: {count}</Badge>
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <p className={cn("text-4xl font-black tracking-tight", color)}>{rate.toFixed(1)}%</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase">Cupons com 1 Item</p>
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
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-2xl", isNegative ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600")}>
          <TrendingDown className="w-6 h-6" />
        </div>
        <div className="text-right">
           <span className={cn("text-[10px] font-black uppercase", isNegative ? "text-rose-600" : "text-emerald-600")}>Consolidado</span>
           <p className="text-2xl font-black text-slate-800 leading-none">{globalRate.toFixed(1)}%</p>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Impacto Omni</p>
        <div className="flex items-center gap-2">
          <span className={cn("text-2xl font-black", isNegative ? "text-rose-600" : "text-emerald-600")}>
            {impact > 0 ? "+" : ""}{impact.toFixed(1)}%
          </span>
          <p className="text-[10px] font-bold text-slate-500 uppercase flex-1 leading-tight">
             influência na taxa unitária
          </p>
        </div>
      </div>
    </Card>
  );
}
