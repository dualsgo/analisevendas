
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
  Tag,
  Zap,
  ArrowRightLeft,
  Smartphone,
  Store,
  TrendingUp,
  Package,
  CirclePercent,
  TrendingDown,
  Scale,
  MinusCircle,
  PlusCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SalesCompositionProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

export function SalesComposition({ data, vinculos }: SalesCompositionProps) {
  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const stats = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    const totalRev = activeSales.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const totalCount = activeSales.length;

    if (totalRev === 0) return null;

    // --- SEGMENTAÇÃO DESCONTO ---
    const withDiscount = activeSales.filter(s => s.tem_desconto);
    const withoutDiscount = activeSales.filter(s => !s.tem_desconto);
    
    const discRev = withDiscount.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const discValue = withDiscount.reduce((acc, s) => acc + parseFloat(s.desconto_total), 0);
    const discItems = withDiscount.reduce((acc, s) => acc + parseInt(s.itens_qtd), 0);
    
    const noDiscRev = withoutDiscount.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const noDiscItems = withoutDiscount.reduce((acc, s) => acc + parseInt(s.itens_qtd), 0);

    // --- SEGMENTAÇÃO ADICIONAL ---
    const withAdd = activeSales.filter(s => s.is_adicional || s.is_adicional_suspeito);
    const withoutAdd = activeSales.filter(s => !(s.is_adicional || s.is_adicional_suspeito));
    
    const addRev = withAdd.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const addItems = withAdd.reduce((acc, s) => acc + parseInt(s.itens_qtd), 0);
    
    const noAddRev = withoutAdd.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const noAddItems = withoutAdd.reduce((acc, s) => acc + parseInt(s.itens_qtd), 0);

    // Pickup Conversion (Composição)
    const pickups = activeSales.filter(s => s.canal === "RETIRADA_ONLINE");
    const convPickup = pickups.length > 0 ? (withAdd.filter(s => s.chave_retirada_associada).length / pickups.length) * 100 : 0;

    return {
      totalRev,
      totalCount,
      discount: {
        totalValue: discValue,
        with: {
          countPerc: (withDiscount.length / totalCount) * 100,
          revPerc: (discRev / totalRev) * 100,
          tkm: withDiscount.length > 0 ? discRev / withDiscount.length : 0,
          pa: withDiscount.length > 0 ? discItems / withDiscount.length : 0,
        },
        without: {
          countPerc: (withoutDiscount.length / totalCount) * 100,
          revPerc: (noDiscRev / totalRev) * 100,
          tkm: withoutDiscount.length > 0 ? noDiscRev / withoutDiscount.length : 0,
          pa: withoutDiscount.length > 0 ? noDiscItems / withoutDiscount.length : 0,
        }
      },
      additional: {
        convPickup,
        with: {
          countPerc: (withAdd.length / totalCount) * 100,
          revPerc: (addRev / totalRev) * 100,
          tkm: withAdd.length > 0 ? addRev / withAdd.length : 0,
          pa: withAdd.length > 0 ? addItems / withAdd.length : 0,
        },
        without: {
          countPerc: (withoutAdd.length / totalCount) * 100,
          revPerc: (noAddRev / totalRev) * 100,
          tkm: withoutAdd.length > 0 ? noAddRev / withoutAdd.length : 0,
          pa: withoutAdd.length > 0 ? noAddItems / withoutAdd.length : 0,
        }
      }
    };
  }, [data]);

  if (!stats) return null;

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500 pb-20">
      
      {/* QUADRO 1 - IMPACTO DO DESCONTO */}
      <section className="space-y-4">
        <div className="px-2">
          <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-xl text-rose-600"><Tag className="w-5 h-5" /></div>
            Impacto do Desconto
          </h2>
          <p className="text-xs text-slate-400 font-bold uppercase mt-1">O desconto está puxando volume ou apenas reduzindo a margem?</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="ri-card border-none bg-white overflow-hidden shadow-xl">
            <CardHeader className="bg-rose-50/50 border-b border-rose-100 p-5">
              <CardTitle className="text-xs font-black uppercase text-rose-700 flex items-center justify-between">
                <span>Participação e Dependência</span>
                <Badge className="bg-rose-100 text-rose-700 border-none font-black">ESTRUTURAL</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <ComparisonMetric 
                  label="Participação no Volume" 
                  valA={stats.discount.with.countPerc} 
                  valB={stats.discount.without.countPerc} 
                  labelA="COM DESC" 
                  labelB="SEM DESC" 
                  suffix="%" 
                />
                <ComparisonMetric 
                  label="Participação no Faturamento" 
                  valA={stats.discount.with.revPerc} 
                  valB={stats.discount.without.revPerc} 
                  labelA="COM DESC" 
                  labelB="SEM DESC" 
                  suffix="%" 
                />
              </div>
              <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Investimento em Desconto</p>
                  <p className="text-2xl font-black text-rose-600">{formatBRL(stats.discount.totalValue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Impacto Faturamento</p>
                  <Badge variant="outline" className="text-rose-600 border-rose-200 font-black">
                    {stats.discount.with.revPerc.toFixed(1)}% do Total
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="ri-card border-none bg-white overflow-hidden shadow-xl">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-5">
              <CardTitle className="text-xs font-black uppercase text-slate-600">Eficiência de Conversão (Comparativo)</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <MetricComparisonBlock 
                  label="Ticket Médio (TKM)" 
                  valWith={stats.discount.with.tkm} 
                  valWithout={stats.discount.without.tkm} 
                  isCurrency 
                  color="rose"
                />
                <MetricComparisonBlock 
                  label="Peças por Atendimento (PA)" 
                  valWith={stats.discount.with.pa} 
                  valWithout={stats.discount.without.pa} 
                  color="rose"
                />
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl flex items-start gap-3">
                <Scale className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                  {stats.discount.with.tkm > stats.discount.without.tkm 
                    ? "O desconto está sendo estratégico: viabiliza tickets maiores que a média orgânica da loja." 
                    : "Atenção: Vendas com desconto estão abaixo da média orgânica, indicando possível canibalização de margem em tickets pequenos."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* QUADRO 2 - IMPACTO DO ADICIONAL */}
      <section className="space-y-4">
        <div className="px-2">
          <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600"><Zap className="w-5 h-5" /></div>
            Impacto do Adicional
          </h2>
          <p className="text-xs text-slate-400 font-bold uppercase mt-1">A estratégia de incrementalidade está realmente aumentando a venda?</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="ri-card border-none bg-white overflow-hidden shadow-xl">
            <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 p-5">
              <CardTitle className="text-xs font-black uppercase text-emerald-700 flex items-center justify-between">
                <span>Participação e Adoção</span>
                <Badge className="bg-emerald-100 text-emerald-700 border-none font-black">CRESCIMENTO</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <ComparisonMetric 
                  label="Participação no Volume" 
                  valA={stats.additional.with.countPerc} 
                  valB={stats.additional.without.countPerc} 
                  labelA="C/ ADICIONAL" 
                  labelB="S/ ADICIONAL" 
                  suffix="%" 
                />
                <ComparisonMetric 
                  label="Participação no Faturamento" 
                  valA={stats.additional.with.revPerc} 
                  valB={stats.additional.without.revPerc} 
                  labelA="C/ ADICIONAL" 
                  labelB="S/ ADICIONAL" 
                  suffix="%" 
                />
              </div>
              <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-sky-500" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conversão Pickup</p>
                    <p className="text-lg font-black text-slate-700">{stats.additional.convPickup.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Poder do Adicional</p>
                  <Badge className="bg-emerald-500 text-white border-none font-black">
                    {(stats.additional.with.revPerc / stats.additional.with.countPerc || 0).toFixed(1)}x Impacto
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="ri-card border-none bg-white overflow-hidden shadow-xl">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-5">
              <CardTitle className="text-xs font-black uppercase text-slate-600">Alavancagem de Venda (Comparativo)</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <MetricComparisonBlock 
                  label="Ticket Médio (TKM)" 
                  valWith={stats.additional.with.tkm} 
                  valWithout={stats.additional.without.tkm} 
                  isCurrency 
                  color="emerald"
                />
                <MetricComparisonBlock 
                  label="Peças por Atendimento (PA)" 
                  valWith={stats.additional.with.pa} 
                  valWithout={stats.additional.without.pa} 
                  color="emerald"
                />
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl flex items-start gap-3 border border-emerald-100">
                <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium text-emerald-700 leading-relaxed">
                  {stats.additional.with.tkm > stats.additional.without.tkm * 1.2
                    ? `O adicional está turbinando a venda: o ticket médio cresce ${((stats.additional.with.tkm / stats.additional.without.tkm - 1) * 100).toFixed(0)}% quando o cliente leva mais de um item planejado.` 
                    : "O adicional está sendo realizado, mas com itens de baixo valor (impulso). Focar em aumentar o valor agregado do item complementar."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

    </div>
  );
}

function ComparisonMetric({ label, valA, valB, labelA, labelB, suffix }: any) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-[9px] font-black text-slate-500">{labelA}</span>
          <span className="text-sm font-black text-slate-800">{valA.toFixed(1)}{suffix}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
          <div className="bg-orange-500 h-full transition-all" style={{ width: `${valA}%` }} />
        </div>
        <div className="flex justify-between items-end opacity-50">
          <span className="text-[9px] font-black text-slate-400">{labelB}</span>
          <span className="text-[11px] font-black text-slate-500">{valB.toFixed(1)}{suffix}</span>
        </div>
      </div>
    </div>
  );
}

function MetricComparisonBlock({ label, valWith, valWithout, isCurrency = false, color }: any) {
  const diffPerc = valWithout > 0 ? (valWith / valWithout - 1) * 100 : 0;
  const isPositive = diffPerc > 0;
  const format = (v: number) => isCurrency ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : v.toFixed(2);

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-slate-400 uppercase">Com Alavanca</p>
            <p className={cn("text-xl font-black", color === 'rose' ? "text-rose-600" : "text-emerald-600")}>{format(valWith)}</p>
          </div>
          <div className={cn(
            "flex flex-col items-center justify-center px-3 py-1 rounded-full border-2",
            isPositive ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"
          )}>
            <span className="text-[10px] font-black leading-none">{isPositive ? '+' : ''}{diffPerc.toFixed(0)}%</span>
            <span className="text-[7px] font-bold uppercase mt-0.5">Variação</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 py-3 border-t border-dashed border-slate-100 opacity-60">
          <div className="p-1.5 bg-slate-100 rounded-lg"><MinusCircle className="w-3 h-3 text-slate-400" /></div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase">Sem Alavanca (Orgânico)</p>
            <p className="text-xs font-black text-slate-600">{format(valWithout)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
