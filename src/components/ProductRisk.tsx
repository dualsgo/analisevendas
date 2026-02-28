
"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  ShieldAlert, 
  TrendingUp, 
  Target,
  AlertTriangle,
  Boxes,
  PieChart as PieChartIcon,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductRiskProps {
  data: DetailedSaleRow[];
}

export function ProductRisk({ data }: ProductRiskProps) {
  const analytics = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    const totalRev = activeSales.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const products: Record<string, { name: string, rev: number, qty: number }> = {};

    activeSales.forEach(s => {
      s.itens.forEach(it => {
        if (!products[it.cProd]) products[it.cProd] = { name: it.xProd, rev: 0, qty: 0 };
        products[it.cProd].rev += it.vProd;
        products[it.cProd].qty += it.qCom;
      });
    });

    const sorted = Object.entries(products)
      .map(([id, p]) => ({ id, ...p, perc: (p.rev / totalRev) * 100 }))
      .sort((a, b) => b.rev - a.rev);

    const top10Rev = sorted.slice(0, 10).reduce((acc, p) => acc + p.rev, 0);
    const concentration = (top10Rev / totalRev) * 100;

    return { sorted, concentration, totalRev };
  }, [data]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[2rem] p-6 border-2 border-rose-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="bg-rose-500 p-4 rounded-3xl text-white shadow-lg shrink-0">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="flex-1 space-y-1">
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-800 italic">Risco Comercial de Mix</h1>
          <p className="text-sm text-slate-500 font-medium">
            Quanto do seu faturamento depende de poucos produtos? Se o seu Top 1 SKU acabar hoje, qual o tamanho do buraco no seu caixa?
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Termômetro de Concentração */}
        <Card className="ri-card border-none bg-white shadow-xl flex flex-col overflow-hidden">
          <CardHeader className="bg-rose-50/50 border-b p-6">
            <CardTitle className="text-xs font-black uppercase text-rose-700 flex items-center justify-between">
              <span>Dependência de SKUs</span>
              <PieChartIcon className="w-4 h-4 text-rose-300" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
               <div className={cn(
                 "w-32 h-32 rounded-full border-8 flex items-center justify-center transition-all duration-1000",
                 analytics.concentration > 40 ? "border-rose-500 shadow-rose-100 shadow-2xl" : "border-emerald-500"
               )}>
                  <p className="text-3xl font-black text-slate-800">{analytics.concentration.toFixed(0)}%</p>
               </div>
               <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full border shadow-sm text-[8px] font-black uppercase">Concentração Top 10</div>
            </div>
            
            <div className="space-y-2">
               <p className="text-sm font-black text-slate-700 uppercase">
                 {analytics.concentration > 40 ? "ALTO RISCO DE ESTOQUE" : "MIX SAUDÁVEL E DISTRIBUÍDO"}
               </p>
               <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                 {analytics.concentration > 40 
                   ? "O seu resultado está 'pendurado' em apenas 10 produtos. Qualquer quebra de estoque nestes itens será fatal para sua meta."
                   : "Sua venda está bem distribuída entre muitos produtos. A falta de um item específico não compromete o dia."}
               </p>
            </div>
          </CardContent>
        </Card>

        {/* Ranking de Dependência */}
        <Card className="ri-card border-none bg-white shadow-xl lg:col-span-2">
          <CardHeader className="bg-slate-900 text-white p-6">
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Boxes className="w-4 h-4 text-rose-400" /> Ranking de Exposição (Top SKUs)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {analytics.sorted.slice(0, 8).map((p, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">#{i+1}</div>
                    <div className="min-w-0 pr-4">
                      <p className="text-xs font-black text-slate-700 uppercase truncate">{p.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Cód: {p.id} • {p.qty} unidades</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-800">{p.rev.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <Badge variant="outline" className="text-[8px] font-black border-none bg-slate-100 text-slate-500 h-4">{p.perc.toFixed(1)}% do caixa</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
