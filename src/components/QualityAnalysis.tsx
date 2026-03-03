
"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Boxes, UserCheck, Star, ShoppingBag, ShieldCheck, HelpCircle, Info } from "lucide-react";
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
      
      // Detecção de item 0,01 (proxy de manipulação) - IGNORA ITENS DE CAMPANHA
      if (s.itens.some(it => !it.is_campanha && (it.vProd / it.qCom) <= 0.1)) vendors[v].v001++;
    });

    return Object.values(vendors).map(v => {
      const totalCupons = v.sales.length;
      const paOrganico = totalCupons > 0 ? (v.items - v.v001) / totalCupons : 0;
      const rateAdd = totalCupons > 0 ? (v.additions / totalCupons) * 100 : 0;
      const idenRate = totalCupons > 0 ? (v.sales.filter((s: any) => s.cpf_cnpj_dest).length / totalCupons) * 100 : 0;
      
      // IQ Score (0-100)
      // Peso: PA Orgânico (40%), % Adicional (40%), Fidelização (20%)
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
      {/* Guia Didático */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 border-2 border-emerald-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-emerald-600">
          <Star className="w-6 h-6" />
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">O que é Atendimento de Qualidade?</h1>
        </div>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          Nesta aba, desconsideramos os "atalhos" (como itens de R$ 0,01) e avaliamos a venda real. 
          O <strong>Índice de Qualidade (IQ)</strong> premia quem convence o cliente a levar acessórios (**Cesta Complementar**) e quem identifica o cliente no CPF.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IQ de Atendimento */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ranking IQ por Colaborador</h3>
            <Badge variant="outline" className="text-[9px] font-black uppercase text-emerald-600 border-emerald-100">Auditado</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vendorQuality.map((v, i) => (
              <Card key={i} className="ri-card p-5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase">{v.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Qualidade do Atendimento</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-2xl font-black", v.score > 70 ? "text-emerald-500" : v.score > 40 ? "text-orange-500" : "text-rose-500")}>
                      {v.score.toFixed(0)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t pt-3">
                  <MiniQ label="PA Real" val={v.paOrganico.toFixed(2)} desc="Sem itens 0,01" />
                  <MiniQ label="Upsell" val={`${v.rateAdd.toFixed(0)}%`} desc="Venda Adicional" />
                  <MiniQ label="Identif." val={`${v.idenRate.toFixed(0)}%`} desc="Fidelização" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Complexidade de Cesta */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Como o cliente compra?</h3>
            <HelpCircle className="w-3 h-3 text-slate-300" />
          </div>
          <Card className="ri-card overflow-hidden">
            <CardHeader className="bg-emerald-50/50 border-b p-5">
              <CardTitle className="text-xs font-black uppercase text-emerald-700 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> Anatomia do Ticket
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100 flex gap-3 items-start">
                <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic">
                  "A <strong>Cesta Complementar</strong> é o objetivo de toda loja Ri Happy. Ela indica que o vendedor ouviu o cliente e sugeriu algo que faz sentido."
                </p>
              </div>

              <BasketItem 
                label="Cesta de Valor (Complementar)" 
                desc="Venda consultiva: brinquedo + pilha/extra." 
                val={basketComplexity.comp} 
                total={activeSales.length} 
                color="bg-emerald-500" 
              />
              <BasketItem 
                label="Cesta de Volume (Homogênea)" 
                desc="Repetição de itens iguais ou brinde." 
                val={basketComplexity.homo} 
                total={activeSales.length} 
                color="bg-orange-400" 
              />
              <BasketItem 
                label="Venda de 1 Item (Oportunidade)" 
                desc="Cliente levou apenas o planejado." 
                val={basketComplexity.single} 
                total={activeSales.length} 
                color="bg-rose-400" 
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniQ({ label, val, desc }: any) {
  return (
    <div className="text-center group">
      <p className="text-[7px] font-black text-slate-400 uppercase leading-none">{label}</p>
      <p className="text-[11px] font-black text-slate-700 mt-0.5">{val}</p>
      <p className="text-[6px] font-bold text-slate-300 uppercase mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">{desc}</p>
    </div>
  );
}

function BasketItem({ label, desc, val, total, color }: any) {
  const perc = total > 0 ? (val / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end">
        <div className="min-w-0">
          <p className="text-[10px] font-black text-slate-700 uppercase truncate">{label}</p>
          <p className="text-[8px] font-medium text-slate-400 leading-tight">{desc}</p>
        </div>
        <span className="text-xs font-black text-slate-800 ml-2">{perc.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full transition-all duration-1000", color)} style={{ width: `${perc}%` }} />
      </div>
    </div>
  );
}
