
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
  Sparkles,
  Info,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BasketBehaviorProps {
  data: DetailedSaleRow[];
}

export function BasketBehavior({ data }: BasketBehaviorProps) {
  const analytics = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    const totalCount = activeSales.length;

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
      .filter(s => s.total >= 3)
      .sort((a, b) => b.rate - a.rate);

    const anatomy = {
      impulso: activeSales.filter(s => parseFloat(s.vNF) < 50 && parseInt(s.itens_qtd) > 1).length,
      complementar: activeSales.filter(s => parseFloat(s.vNF) >= 100 && parseInt(s.itens_qtd) > 1).length,
      solitaria: activeSales.filter(s => parseInt(s.itens_qtd) === 1).length
    };

    return { accelerators, anatomy, totalCount };
  }, [data]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="ri-card border-none bg-white shadow-xl flex flex-col">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Composição de Atendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-8 flex-1">
            <AnatomyItem label="Cesta Complementar" desc="Vendas de valor (R$ 100+) com mais de 1 item." count={analytics.anatomy.complementar} total={analytics.totalCount} color="bg-emerald-500" />
            <AnatomyItem label="Venda de Impulso" desc="Vendas rápidas (< R$ 50) com mais de 1 item." count={analytics.anatomy.impulso} total={analytics.totalCount} color="bg-sky-500" />
            <AnatomyItem label="Venda Solitária" desc="Oportunidades de 1 único item." count={analytics.anatomy.solitaria} total={analytics.totalCount} color="bg-rose-400" />
            
            <div className="pt-6 border-t border-dashed space-y-4">
               <div className="flex items-center gap-2 text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Gargalo Detectado</span>
               </div>
               <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                 {analytics.anatomy.solitaria > analytics.totalCount * 0.5 
                   ? "Sua loja está com EXCESSO DE VENDAS UNITÁRIAS (50%+). Isso indica que a equipe está atuando apenas como 'tiradora de pedidos'. Faltam itens de checkout (pilhas, SLP) na argumentação final." 
                   : "Distribuição Saudável: A equipe está conseguindo converter a maior parte das intenções de compra em cestas com mais de um produto."}
               </p>
            </div>
          </CardContent>
        </Card>

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analytics.accelerators.slice(0, 6).map((sku, i) => (
                <div key={i} className="group p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-orange-200 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0 pr-4">
                      <p className="text-[10px] font-black text-slate-700 uppercase truncate">{sku.name}</p>
                      <p className="text-[8px] font-bold text-slate-400">Cód: {sku.cProd}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-orange-600">{sku.rate.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-orange-500 transition-all" style={{ width: `${sku.rate}%` }} />
                  </div>
                  <p className="text-[8px] text-slate-400 italic mt-2">"Este item puxa outras vendas {sku.rate.toFixed(0)}% das vezes."</p>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-orange-50 rounded-[2rem] border-2 border-orange-100 flex items-start gap-4">
               <Target className="w-6 h-6 text-orange-500 shrink-0 mt-1" />
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-orange-600 uppercase">Estratégia Sugerida</p>
                  <p className="text-xs font-medium text-orange-800 leading-relaxed italic">
                    Os itens acima são seus maiores aliados. Se um vendedor está com PA baixo, peça para ele focar na oferta desses SKUs específicos no balcão. Eles possuem a maior probabilidade estatística de serem aceitos como "item extra".
                  </p>
               </div>
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
