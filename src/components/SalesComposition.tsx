
"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tag,
  Zap,
  Smartphone,
  TrendingUp,
  Scale,
  MinusCircle,
  Info,
  BookOpen,
  HelpCircle,
  Lightbulb
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

    // Pickup Conversion
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
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
      
      {/* CABEÇALHO DIDÁTICO */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 border-2 border-slate-50 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-orange-500">
          <BookOpen className="w-6 h-6" />
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">O que é a Composição de Vendas?</h1>
        </div>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          Esta página "fatia" o faturamento total da sua loja para revelar o que está impulsionando o crescimento. 
          Analisamos como o comportamento do cliente muda quando ele recebe um **incentivo** (Desconto) ou quando a equipe realiza uma **venda sugerida** (Adicional). 
          O objetivo é saber se essas estratégias estão de fato aumentando o valor que entra no caixa ou apenas reduzindo a sua margem de lucro.
        </p>
      </div>

      {/* QUADRO 1 - ESTRATÉGIA DE DESCONTO */}
      <section className="space-y-6">
        <div className="px-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-rose-100 rounded-xl text-rose-600"><Tag className="w-5 h-5" /></div>
            <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">1. Análise da Estratégia de Descontos</h2>
          </div>
          <p className="text-xs text-slate-400 font-black uppercase tracking-widest pl-12">O desconto está puxando volume ou apenas reduzindo a margem?</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card: Participação */}
          <Card className="ri-card border-none bg-white overflow-hidden shadow-xl">
            <CardHeader className="bg-rose-50/50 border-b border-rose-100 p-5">
              <CardTitle className="text-xs font-black uppercase text-rose-700 flex items-center justify-between">
                <span>Dependência do Desconto</span>
                <HelpCircle className="w-4 h-4 text-rose-300" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="space-y-1 mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase">Explicação Didática</p>
                <p className="text-[11px] text-slate-500 italic">"Se a barra de faturamento for muito maior que a de volume, você está usando descontos em produtos caros."</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <ComparisonMetric 
                  label="Em Volume (Cupons)" 
                  description="Quantos clientes levaram desconto em cada 100 vendas."
                  valA={stats.discount.with.countPerc} 
                  valB={stats.discount.without.countPerc} 
                  labelA="COM DESC." 
                  labelB="SEM DESC." 
                  suffix="%" 
                />
                <ComparisonMetric 
                  label="Em Faturamento (R$)" 
                  description="Quanto do dinheiro total veio de vendas com desconto."
                  valA={stats.discount.with.revPerc} 
                  valB={stats.discount.without.revPerc} 
                  labelA="COM DESC." 
                  labelB="SEM DESC." 
                  suffix="%" 
                />
              </div>
              <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Investimento Real</p>
                  <p className="text-2xl font-black text-rose-600">{formatBRL(stats.discount.totalValue)}</p>
                  <p className="text-[9px] font-bold text-slate-400">Total de margem cedida no período</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-rose-600 border-rose-200 font-black px-3 py-1">
                    {stats.discount.with.revPerc.toFixed(1)}% do Faturamento
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Comparativo de Eficiência */}
          <Card className="ri-card border-none bg-white overflow-hidden shadow-xl">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-5">
              <CardTitle className="text-xs font-black uppercase text-slate-600">Eficiência de Conversão: Valeu a pena?</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <MetricComparisonBlock 
                  label="Ticket Médio (TKM)" 
                  desc="Valor médio gasto por cliente."
                  valWith={stats.discount.with.tkm} 
                  valWithout={stats.discount.without.tkm} 
                  isCurrency 
                  color="rose"
                />
                <MetricComparisonBlock 
                  label="Peças por Atendimento (PA)" 
                  desc="Média de itens por cupom."
                  valWith={stats.discount.with.pa} 
                  valWithout={stats.discount.without.pa} 
                  color="rose"
                />
              </div>
              
              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 space-y-3">
                <div className="flex items-center gap-2 text-amber-700">
                  <Lightbulb className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Diagnóstico Ri Happy</span>
                </div>
                <p className="text-[11px] font-medium text-amber-800 leading-relaxed">
                  {stats.discount.with.tkm > stats.discount.without.tkm 
                    ? "O desconto está sendo ESTRATÉGICO: Ele está ajudando a fechar vendas maiores que a média orgânica da loja. Você está 'comprando' faturamento de alto valor." 
                    : "Atenção: O desconto está CANIBALIZANDO sua margem. Clientes que levam desconto estão gastando menos que quem não leva. O incentivo não está convertendo em tickets maiores."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* QUADRO 2 - ESTRATÉGIA DE ADICIONAL */}
      <section className="space-y-6">
        <div className="px-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600"><Zap className="w-5 h-5" /></div>
            <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">2. Impacto da Incrementalidade (Adicional)</h2>
          </div>
          <p className="text-xs text-slate-400 font-black uppercase tracking-widest pl-12">A estratégia de Upsell está de fato aumentando a venda?</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card: Participação e Adoção */}
          <Card className="ri-card border-none bg-white overflow-hidden shadow-xl">
            <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 p-5">
              <CardTitle className="text-xs font-black uppercase text-emerald-700 flex items-center justify-between">
                <span>Participação e Crescimento</span>
                <Badge className="bg-emerald-100 text-emerald-700 border-none font-black">INCREMENTAL</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="space-y-1 mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase">O que este gráfico mostra?</p>
                <p className="text-[11px] text-slate-500 italic">"Mostra quanto da sua operação é focada em vender itens extras além do que o cliente já pretendia levar."</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <ComparisonMetric 
                  label="Volume de Adicionais" 
                  description="Frequência com que o 'item extra' acontece."
                  valA={stats.additional.with.countPerc} 
                  valB={stats.additional.without.countPerc} 
                  labelA="COM ADIC." 
                  labelB="S/ ADIC." 
                  suffix="%" 
                />
                <ComparisonMetric 
                  label="Impacto Faturamento" 
                  description="O peso dessa estratégia no valor final do dia."
                  valA={stats.additional.with.revPerc} 
                  valB={stats.additional.without.revPerc} 
                  labelA="COM ADIC." 
                  labelB="S/ ADIC." 
                  suffix="%" 
                />
              </div>
              <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-sky-500" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conversão Pickup</p>
                    <p className="text-xl font-black text-slate-700">{stats.additional.convPickup.toFixed(1)}%</p>
                    <p className="text-[9px] font-bold text-slate-400">Clientes do site que levaram algo na loja</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-emerald-500 text-white border-none font-black px-4 py-2">
                    {(stats.additional.with.revPerc / stats.additional.with.countPerc || 0).toFixed(1)}x Impacto Positivo
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Alavancagem */}
          <Card className="ri-card border-none bg-white overflow-hidden shadow-xl">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-5">
              <CardTitle className="text-xs font-black uppercase text-slate-600">Alavancagem de Venda: O poder do 1+1</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <MetricComparisonBlock 
                  label="Ticket Médio (TKM)" 
                  desc="Valor gasto quando convencemos o cliente a levar mais."
                  valWith={stats.additional.with.tkm} 
                  valWithout={stats.additional.without.tkm} 
                  isCurrency 
                  color="emerald"
                />
                <MetricComparisonBlock 
                  label="Peças por Atendimento (PA)" 
                  desc="Aumento real na quantidade de brinquedos vendidos."
                  valWith={stats.additional.with.pa} 
                  valWithout={stats.additional.without.pa} 
                  color="emerald"
                />
              </div>
              
              <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Lightbulb className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Diagnóstico Estratégico</span>
                </div>
                <p className="text-[11px] font-medium text-emerald-800 leading-relaxed">
                  {stats.additional.with.tkm > stats.additional.without.tkm * 1.2
                    ? `Fantástico! Quando sua equipe vincula um adicional, o cliente gasta em média ${((stats.additional.with.tkm / stats.additional.without.tkm - 1) * 100).toFixed(0)}% a mais do que a venda comum. Isso é faturamento "puro" entrando na loja.` 
                    : "Atenção: O adicional está acontecendo, mas com itens de valor muito baixo. Foque em oferecer produtos complementares de maior valor agregado (acessórios, baterias ou colecionáveis de maior ticket)."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FOOTER EXPLICATIVO */}
      <div className="flex items-center justify-center gap-4 py-8 border-t border-slate-100">
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <Info className="w-4 h-4" />
          Dados baseados em análise de comportamento de compra (Etapa 2 do Motor de Inteligência)
        </div>
      </div>

    </div>
  );
}

function ComparisonMetric({ label, description, valA, valB, labelA, labelB, suffix }: any) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{label}</p>
      <p className="text-[9px] text-slate-400 font-medium leading-tight mb-2">{description}</p>
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

function MetricComparisonBlock({ label, desc, valWith, valWithout, isCurrency = false, color }: any) {
  const diffPerc = valWithout > 0 ? (valWith / valWithout - 1) * 100 : 0;
  const isPositive = diffPerc > 0;
  const format = (v: number) => isCurrency ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : v.toFixed(2);

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none">{label}</p>
      <p className="text-[9px] text-slate-400 font-medium leading-tight">{desc}</p>
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-slate-400 uppercase">Com Alavanca</p>
            <p className={cn("text-xl font-black", color === 'rose' ? "text-rose-600" : "text-emerald-600")}>{format(valWith)}</p>
          </div>
          <div className={cn(
            "flex flex-col items-center justify-center px-3 py-1 rounded-full border-2 min-w-[60px]",
            isPositive ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"
          )}>
            <span className="text-[10px] font-black leading-none">{isPositive ? '+' : ''}{diffPerc.toFixed(0)}%</span>
            <span className="text-[7px] font-bold uppercase mt-0.5">Ganho</span>
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
