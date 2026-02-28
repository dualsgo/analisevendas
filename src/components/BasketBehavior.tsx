
"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ShoppingBag, 
  Zap, 
  TrendingUp, 
  Layers, 
  ArrowRight,
  Target,
  Dizzy,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BasketBehaviorProps {
  data: DetailedSaleRow[];
}

export function BasketBehavior({ data }: BasketBehaviorProps) {
  const analytics = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    const totalCount = activeSales.length;

    // 1. Identificação de SKUs Aceleradores (Itens que aparecem em cestas > 1)
    const skuMap: Record<string, { name: string, alone: number, withOthers: number }> = {};
    
    activeSales.forEach(sale => {
      const items = sale.itens;
      const isMulti = items.length > 1 || (items.length === 1 && items[0].qCom > 1);
      
      items.forEach(it => {
        if (!skuMap[it.cProd]) skuMap[it.cProd] = { name: it.xProd, alone: 0, withOthers: 0 };
        if (isMulti) skuMap[it.cProd].withOthers++;
        else skuMap[it.cProd].alone++;
      });
    });

    const accelerators = Object.values(skuMap)
      .map(s => ({
        ...s,
        total: s.alone + s.withOthers,
        rate: s.total > 0 ? (s.withOthers / s.total) * 100 : 0
      }))
      .filter(s => s.total >= 3) // Mínimo de 3 aparições
      .sort((a, b) => b.rate - a.rate);

    // 2. Anatomia da Cesta
    const anatomy = {
      impulso: activeSales.filter(s => parseFloat(s.vNF) < 50 && parseInt(s.itens_qtd) > 1).length,
      complementar: activeSales.filter(s => parseFloat(s.vNF) >= 100 && parseInt(s.itens_qtd) > 1).length,
      solitaria: activeSales.filter(s => parseInt(s.itens_qtd) === 1).length
    };

    return { accelerators, anatomy, totalCount };
  }, [data]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[2rem] p-6 border-2 border-orange-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="bg-orange-500 p-4 rounded-3xl text-white shadow-lg shrink-0">
          <Layers className="w-8 h-8" />
        </div>
        <div className="flex-1 space-y-1">
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-800 italic">Anatomia do Ticket</h1>
          <p className="text-sm text-slate-500 font-medium">
            O que faz o cliente levar mais? Descubra os produtos que "puxam" a cesta e o comportamento real de compra.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Anatomia da Cesta */}
        <Card className="ri-card border-none bg-white shadow-xl flex flex-col">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Composição de Atendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-8 flex-1">
            <AnatomyItem 
              label="Cesta Complementar" 
              desc="Vendas de valor (R$ 100+) com mais de 1 item." 
              count={analytics.anatomy.complementar} 
              total={analytics.totalCount} 
              color="bg-emerald-500"
            />
            <AnatomyItem 
              label="Venda de Impulso" 
              desc="Vendas rápidas (< R$ 50) com mais de 1 item." 
              count={analytics.anatomy.impulso} 
              total={analytics.totalCount} 
              color="bg-sky-500"
            />
            <AnatomyItem 
              label="Venda Solitária" 
              desc="Oportunidades de 1 único item." 
              count={analytics.anatomy.solitaria} 
              total={analytics.totalCount} 
              color="bg-rose-400"
            />
          </CardContent>
        </Card>

        {/* SKUs Aceleradores de PA */}
        <Card className="ri-card border-none bg-white shadow-xl lg:col-span-2">
          <CardHeader className="bg-slate-900 text-white p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-400" /> Aceleradores de P.A.
              </CardTitle>
              <Badge className="bg-orange-500 text-white font-black text-[8px] uppercase px-3 h-5">Top Influenciadores</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {analytics.accelerators.slice(0, 6).map((sku, i) => (
                <div key={i} className="group p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-orange-200 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0 pr-4">
                      <p className="text-xs font-black text-slate-700 uppercase truncate">{sku.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Cód: {sku.cProd} • {sku.total} Vendas</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-orange-600">{sku.rate.toFixed(0)}%</span>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Adesão</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${sku.rate}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-400 italic mt-2">
                    "Em {sku.withOthers} de cada {sku.total} vezes que este item foi vendido, ele veio acompanhado de outros produtos."
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AnatomyItem({ label, desc, count, total, color }: any) {
  const perc = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-black text-slate-700 uppercase">{label}</p>
          <p className="text-[8px] font-medium text-slate-400 leading-tight">{desc}</p>
        </div>
        <span className="text-xs font-black text-slate-800">{perc.toFixed(1)}%</span>
      </div>
      <Progress value={perc} className={cn("h-2 bg-slate-100", color.replace('bg-', 'text-'))} />
    </div>
  );
}
