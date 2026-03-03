
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
  HelpCircle,
  Zap,
  Info
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="ri-card flex flex-col overflow-hidden">
          <CardHeader className="bg-rose-50/50 border-b p-6">
            <CardTitle className="text-xs font-black uppercase text-rose-700 flex items-center justify-between">
              <span>Vulnerabilidade de Mix</span>
              <PieChartIcon className="w-4 h-4 text-rose-300" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
               <div className={cn("w-32 h-32 rounded-full border-8 flex items-center justify-center transition-all duration-1000", analytics.concentration > 40 ? "border-rose-500 shadow-rose-100 shadow-2xl" : "border-emerald-500")}>
                  <p className="text-3xl font-black text-slate-800">{analytics.concentration.toFixed(0)}%</p>
               </div>
               <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full border shadow-sm text-[8px] font-black uppercase">Peso Top 10</div>
            </div>
            <div className="space-y-4 pt-4 border-t w-full">
               <div className="flex items-center gap-2 text-rose-600 justify-center">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase">Diagnóstico de Risco</span>
               </div>
               <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">
                 {analytics.concentration > 40 
                   ? `ALTA DEPENDÊNCIA: 10 produtos carregam ${analytics.concentration.toFixed(0)}% do seu faturamento. Se houver quebra de estoque nestes itens, sua loja terá um "apagão" de vendas. Recomendado: Diversificar oferta ativa.` 
                   : "MIX SAUDÁVEL: Seu faturamento está bem distribuído. A falta de um item específico não compromete a meta do dia."}
               </p>
            </div>
          </CardContent>
        </Card>

        <Card className="ri-card lg:col-span-2 flex flex-col">
          <CardHeader className="bg-slate-900 text-white p-6">
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Boxes className="w-4 h-4 text-rose-400" /> Ranking de Exposição (Top SKUs)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="divide-y divide-slate-50">
              {analytics.sorted.slice(0, 6).map((p, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">#{i+1}</div>
                    <div className="min-w-0 pr-4">
                      <p className="text-xs font-black text-slate-700 uppercase truncate">{p.name}</p>
                      <p className="text-[9px] font-bold text-slate-400">Cód: {p.id} • {p.qty} unid.</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-800">{p.rev.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <Badge variant="outline" className="text-[8px] font-black border-none bg-slate-100 text-slate-500">{p.perc.toFixed(1)}% do total</Badge>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 bg-slate-50 border-t flex items-start gap-4">
               <Zap className="w-5 h-5 text-orange-500 shrink-0 mt-1" />
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Gargalo de Curadoria</p>
                  <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic">
                    "Identificamos que os produtos acima dominam a jornada de venda. Se eles estiverem em locais de difícil acesso ou com etiquetas erradas, o impacto no faturamento é imediato."
                  </p>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
