"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Boxes, UserCheck, Star, ShoppingBag, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface QualityAnalysisProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

export function QualityAnalysis({ data, vinculos }: QualityAnalysisProps) {
  const activeSales = useMemo(() => data.filter(s => !s.is_cancelada && s.tpNF === 1), [data]);

  const vendorQuality = useMemo(() => {
    const vendors: Record<string, any> = {};
    
    activeSales.forEach(s => {
      const v = s.vendedor || "OUTROS";
      if (!vendors[v]) vendors[v] = { name: v, sales: [], additions: 0, items: 0, v001: 0 };
      vendors[v].sales.push(s);
      if (s.is_adicional || s.is_adicional_suspeito) vendors[v].additions++;
      vendors[v].items += parseInt(s.itens_qtd);
      
      // Detecção de item 0,01 (proxy de manipulação)
      if (s.itens.some(it => (it.vProd / it.qCom) <= 0.1)) vendors[v].v001++;
    });

    return Object.values(vendors).map(v => {
      const totalCupons = v.sales.length;
      const paOrganico = totalCupons > 0 ? (v.items - v.v001) / totalCupons : 0;
      const rateAdd = totalCupons > 0 ? (v.additions / totalCupons) * 100 : 0;
      
      // IQ Score (0-100)
      // Peso: PA Orgânico (40%), % Adicional (40%), Fidelização (20%)
      const idenRate = totalCupons > 0 ? (v.sales.filter((s: any) => s.cpf_cnpj_dest).length / totalCupons) * 100 : 0;
      const score = (Math.min(paOrganico / 2.5, 1) * 40) + (Math.min(rateAdd / 20, 1) * 40) + (Math.min(idenRate / 90, 1) * 20);

      return { ...v, paOrganico, rateAdd, idenRate, score };
    }).sort((a, b) => b.score - a.score);
  }, [activeSales]);

  const basketComplexity = useMemo(() => {
    const types = { homo: 0, comp: 0, single: 0 };
    activeSales.forEach(s => {
      const uniqueCodes = new Set(s.itens.map(i => i.cProd)).size;
      const totalQty = parseInt(s.itens_qtd);
      
      if (totalQty === 1) types.single++;
      else if (uniqueCodes === 1 && totalQty > 1) types.homo++;
      else if (uniqueCodes > 1) types.comp++;
    });
    return types;
  }, [activeSales]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IQ de Atendimento */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Índice de Qualidade (IQ) por Colaborador</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vendorQuality.map((v, i) => (
              <Card key={i} className="ri-card border-none bg-white p-5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase">{v.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">IQ Atendimento</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-xl font-black", v.score > 70 ? "text-emerald-500" : v.score > 40 ? "text-orange-500" : "text-rose-500")}>
                      {v.score.toFixed(0)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t pt-3">
                  <MiniQ label="PA Real" val={v.paOrganico.toFixed(2)} />
                  <MiniQ label="Adic." val={`${v.rateAdd.toFixed(0)}%`} />
                  <MiniQ label="Ident." val={`${v.idenRate.toFixed(0)}%`} />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Complexidade de Cesta */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Mix de Venda (Cesta)</h3>
          <Card className="ri-card border-none bg-white overflow-hidden shadow-xl">
            <CardHeader className="bg-emerald-50/50 border-b p-5">
              <CardTitle className="text-xs font-black uppercase text-emerald-700 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> Qualidade do Ticket
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <BasketItem label="Cesta Complementar" desc="Venda de produto + acessório/extra." val={basketComplexity.comp} total={activeSales.length} color="bg-emerald-500" />
              <BasketItem label="Cesta Homogênea" desc="Repetição de itens iguais." val={basketComplexity.homo} total={activeSales.length} color="bg-orange-400" />
              <BasketItem label="Venda de 1 Item" desc="Sem venda sugestiva." val={basketComplexity.single} total={activeSales.length} color="bg-rose-400" />
              
              <div className="bg-slate-50 p-4 rounded-xl mt-4">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Insight Técnico</p>
                <p className="text-[10px] text-slate-600 font-medium">
                  Vendas complementares indicam argumentação estruturada. Vendas homogêneas indicam volume, mas pouco esforço consultivo.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniQ({ label, val }: any) {
  return (
    <div className="text-center">
      <p className="text-[7px] font-black text-slate-400 uppercase">{label}</p>
      <p className="text-[10px] font-black text-slate-700">{val}</p>
    </div>
  );
}

function BasketItem({ label, desc, val, total, color }: any) {
  const perc = total > 0 ? (val / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-black text-slate-700 uppercase">{label}</p>
          <p className="text-[8px] font-medium text-slate-400">{desc}</p>
        </div>
        <span className="text-xs font-black text-slate-800">{perc.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full", color)} style={{ width: `${perc}%` }} />
      </div>
    </div>
  );
}
