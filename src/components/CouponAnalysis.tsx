
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

  const analytics = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    
    const fisica = activeSales.filter(s => s.canal === "LOJA_FISICA" && !s.is_troca);
    const pickup = activeSales.filter(s => s.canal === "RETIRADA_ONLINE");

    const get1ItemStats = (rows: DetailedSaleRow[]) => {
      const total = rows.length;
      const oneItemRows = rows.filter(s => parseInt(s.itens_qtd) === 1);
      const oneItemCount = oneItemRows.length;
      const oneItemRate = total > 0 ? (oneItemCount / total) * 100 : 0;
      
      const priceRanges = [
        { label: "Até R$ 50", min: 0, max: 50, count: 0 },
        { label: "R$ 50 - 100", min: 50, max: 100, count: 0 },
        { label: "R$ 100 - 200", min: 100, max: 200, count: 0 },
        { label: "R$ 200+", min: 200, max: Infinity, count: 0 },
      ];

      oneItemRows.forEach(s => {
        const val = parseFloat(s.vNF);
        const range = priceRanges.find(r => val >= r.min && val < r.max);
        if (range) range.count++;
      });

      return { total, oneItemCount, oneItemRate, priceRanges, oneItemRows };
    };

    const fisicaStats = get1ItemStats(fisica);
    const pickupStats = get1ItemStats(pickup);
    const globalStats = get1ItemStats(activeSales);

    // Vendor specific stats for the price dissection
    const filteredFisica = selectedVendor === "TODOS" 
      ? fisica 
      : fisica.filter(s => (s.vendedor || "OUTROS") === selectedVendor);
    
    const vendorFisicaStats = get1ItemStats(filteredFisica);

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

    const impact = globalStats.oneItemRate - fisicaStats.oneItemRate;

    return {
      fisicaStats,
      pickupStats,
      globalStats,
      vendorFisicaStats,
      vendorRanking,
      vendors,
      impact
    };
  }, [data, selectedVendor]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard 
          title="Loja Física" 
          icon={Store} 
          count={analytics.fisicaStats.oneItemCount} 
          rate={analytics.fisicaStats.oneItemRate} 
          color="text-slate-600"
          accent="bg-slate-500"
        />
        <StatsCard 
          title="Pickup (Online)" 
          icon={Smartphone} 
          count={analytics.pickupStats.oneItemCount} 
          rate={analytics.pickupStats.oneItemRate} 
          color="text-sky-600"
          accent="bg-sky-500"
        />
        <ImpactCard 
          impact={analytics.impact} 
          globalRate={analytics.globalStats.oneItemRate}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Dissection */}
        <Card className="ri-card">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Dissecação por Faixa de Preço
              </CardTitle>
              
              <select 
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="text-[10px] font-bold uppercase bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="TODOS">Todos Colaboradores</option>
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
                 {analytics.vendorFisicaStats.oneItemCount} CUPONS
               </Badge>
            </div>

            {analytics.vendorFisicaStats.priceRanges.map((range, i) => {
              const perc = analytics.vendorFisicaStats.oneItemCount > 0 
                ? (range.count / analytics.vendorFisicaStats.oneItemCount) * 100 
                : 0;
              return (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-slate-700 uppercase">{range.label}</p>
                      <p className="text-[9px] font-bold text-slate-400">{range.count} Cupons de 1 item</p>
                    </div>
                    <span className="text-xs font-black text-slate-800">{perc.toFixed(1)}%</span>
                  </div>
                  <Progress value={perc} className="h-2 bg-slate-100" />
                </div>
              );
            })}
            
            <div className="pt-4 border-t border-dashed mt-6">
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium text-amber-800 leading-relaxed italic">
                  <strong>Insight:</strong> Cupons de 1 item com ticket acima de R$ 100 representam a maior falha de "venda sugestiva". O cliente já está gastando um valor alto, e a equipe não conseguiu adicionar nem um item de menor valor (meias, acessórios).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collaborator Breakdown */}
        <Card className="ri-card">
          <CardHeader className="bg-slate-900 text-white p-6">
            <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" /> Rank de Vulnerabilidade (Cupons 1 Item)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
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
                    <h4 className="text-[11px] font-black text-slate-800 uppercase truncate flex items-center gap-2">
                       {v.name}
                       {selectedVendor === v.name && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />}
                    </h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{v.oneItem} de {v.total} cupons</p>
                  </div>
                  <div className="text-right ml-4">
                    <span className={cn(
                      "text-sm font-black",
                      v.rate > 40 ? "text-rose-600" : (v.rate > 25 ? "text-amber-500" : "text-emerald-600")
                    )}>
                      {v.rate.toFixed(1)}%
                    </span>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Taxa Unitária</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
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
              Impacto do Pickup no Consolidado 1-Item
            </h2>
            <p className="text-indigo-100 text-sm md:text-base font-medium max-w-2xl leading-relaxed">
              O Pickup Online, por sua natureza de conveniência, tende a ser de item único. Ao consolidar os dados, ele {analytics.impact > 0 ? "Aumenta" : "Reduz"} a taxa de unitários da loja em <strong>{Math.abs(analytics.impact).toFixed(1)} pontos percentuais</strong>.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
               <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                  <p className="text-[9px] font-black uppercase opacity-70">Taxa Loja Física</p>
                  <p className="text-xl font-black">{analytics.fisicaStats.oneItemRate.toFixed(1)}%</p>
               </div>
               <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                  <p className="text-[9px] font-black uppercase opacity-70">Taxa Consolidada</p>
                  <p className="text-xl font-black">{analytics.globalStats.oneItemRate.toFixed(1)}%</p>
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
  const isNegative = impact > 0; // Usually more 1-item coupons is "negative" for P.A.
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
             influência na taxa unitária geral
          </p>
        </div>
      </div>
    </Card>
  );
}
