"use client";

import React, { useState, useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Target, 
  TrendingDown, 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Layers, 
  Activity, 
  Lightbulb, 
  BarChart3, 
  Smartphone, 
  Store,
  ArrowRight,
  Settings2,
  AlertTriangle,
  Zap,
  Percent,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface GapAnalysisProps {
  data: DetailedSaleRow[];
}

export function GapAnalysis({ data }: GapAnalysisProps) {
  // State para as metas
  const [metaVenda, setMetaVenda] = useState<number>(100000);
  const [metaCupons, setMetaCupons] = useState<number>(500);
  const [metaPA, setMetaPA] = useState<number>(2.5);

  // State para simulações
  const [simulAddCupom2, setSimulAddCupom2] = useState<number>(10); // +10%
  const [simulAddCupom3, setSimulAddCupom3] = useState<number>(5); // +5%

  const activeSales = useMemo(() => data.filter(s => !s.is_cancelada && s.tpNF === 1 && !s.is_devolucao), [data]);

  const metrics = useMemo(() => {
    let sales = 0;
    let items = 0;
    const cupons = activeSales.length;

    const hourDistribution: Record<number, number> = {};
    const itemsDistribution = {
      "1": 0,
      "2": 0,
      "3+": 0
    };

    const channelStats = {
      fisico: { sales: 0, items: 0, cupons: 0 },
      digital: { sales: 0, items: 0, cupons: 0 }
    };

    const ticketRanges = {
      baixo: 0, // < 50
      medio: 0, // 50 - 150
      alto: 0   // > 150
    };

    activeSales.forEach(s => {
      const v = parseFloat(s.vNF);
      const i = parseFloat(s.itens_qtd);
      sales += v;
      items += i;

      // Hours
      const hourMatch = s.dhEmi.match(/T(\d{2}):/);
      if (hourMatch) {
        const h = parseInt(hourMatch[1], 10);
        hourDistribution[h] = (hourDistribution[h] || 0) + 1;
      }

      // Items distribution
      if (i === 1) itemsDistribution["1"]++;
      else if (i === 2) itemsDistribution["2"]++;
      else if (i >= 3) itemsDistribution["3+"]++;

      // Ticket Ranges
      if (v < 50) ticketRanges.baixo++;
      else if (v <= 150) ticketRanges.medio++;
      else ticketRanges.alto++;

      // Channels
      const isDigital = s.canal === "RETIRADA_ONLINE" || s.canal === "DELIVERY";
      if (isDigital) {
        channelStats.digital.sales += v;
        channelStats.digital.items += i;
        channelStats.digital.cupons++;
      } else {
        channelStats.fisico.sales += v;
        channelStats.fisico.items += i;
        channelStats.fisico.cupons++;
      }
    });

    const tkm = cupons > 0 ? sales / cupons : 0;
    const pa = cupons > 0 ? items / cupons : 0;
    const pm = items > 0 ? sales / items : 0;

    return {
      sales,
      items,
      cupons,
      tkm,
      pa,
      pm,
      hourDistribution,
      itemsDistribution,
      channelStats,
      ticketRanges
    };
  }, [activeSales]);

  const gapAnalysis = useMemo(() => {
    const metaTKM = metaCupons > 0 ? metaVenda / metaCupons : 0;
    const metaPM = metaPA > 0 ? metaTKM / metaPA : 0;

    const gapTotal = metrics.sales - metaVenda;
    const gapPerc = metaVenda > 0 ? (gapTotal / metaVenda) * 100 : 0;

    const impactVolume = (metrics.cupons - metaCupons) * metaTKM;
    const impactPA = ((metrics.pa - metaPA) * metaPM) * metrics.cupons;
    const impactPreco = ((metrics.pm - metaPM) * metrics.pa) * metrics.cupons;

    return {
      metaTKM,
      metaPM,
      gapTotal,
      gapPerc,
      impactVolume,
      impactPA,
      impactPreco
    };
  }, [metrics, metaVenda, metaCupons, metaPA]);

  const simAnalysis = useMemo(() => {
    // Simul 1: Ajuste de PA
    // Retirar da base de 1 item e jogar para 2 e 3 itens
    const base1 = metrics.itemsDistribution["1"];
    const move2 = Math.round(metrics.cupons * (simulAddCupom2 / 100));
    const move3 = Math.round(metrics.cupons * (simulAddCupom3 / 100));
    
    // We assume PM (Preço Médio) remains constant per item.
    // If we add items, we add sales.
    // Moving from 1 item to 2 items means adding 1 item per coupon moved.
    // Moving from 1 item to 3 items means adding 2 items per coupon moved.
    const addedItems2 = move2 * 1; 
    const addedItems3 = move3 * 2; 

    const newItems = metrics.items + addedItems2 + addedItems3;
    const newPA = metrics.cupons > 0 ? newItems / metrics.cupons : 0;
    const newSales = newItems * metrics.pm;

    // Simul 2: Remover Digital
    const sFisico = metrics.channelStats.fisico;
    const paFisico = sFisico.cupons > 0 ? sFisico.items / sFisico.cupons : 0;

    return {
      ajustePA: {
        newPA,
        newSales,
        salesGain: newSales - metrics.sales
      },
      semDigital: {
        sales: sFisico.sales,
        pa: paFisico,
        cupons: sFisico.cupons
      }
    };
  }, [metrics, simulAddCupom2, simulAddCupom3]);

  const diagnostic = useMemo(() => {
    const impacts = [
      { name: "Volume (Fluxo/Cupons)", val: gapAnalysis.impactVolume },
      { name: "Profundidade (PA)", val: gapAnalysis.impactPA },
      { name: "Valor (Ticket/Preço)", val: gapAnalysis.impactPreco }
    ];
    impacts.sort((a, b) => a.val - b.val); // lowest (most negative) first

    const mainProblem = impacts[0].val < 0 ? impacts[0] : null;

    let textMainCause = "";
    let actionPlan = [];

    const perc1Item = metrics.cupons > 0 ? (metrics.itemsDistribution["1"] / metrics.cupons) * 100 : 0;
    const digitalShare = metrics.cupons > 0 ? (metrics.channelStats.digital.cupons / metrics.cupons) * 100 : 0;

    if (mainProblem?.name.includes("Volume")) {
      textMainCause = "O fluxo de clientes convertidos está abaixo do esperado.";
      actionPlan = [
        "Revisar vitrine e comunicação visual da loja para atrair fluxo.",
        "Avaliar horários de vale e remanejar equipe para abordagem mais ativa na porta.",
        "Ativar base de clientes VIP via WhatsApp com ofertas exclusivas."
      ];
    } else if (mainProblem?.name.includes("Profundidade")) {
      textMainCause = `Alta concentração de cupons com apenas 1 item (${perc1Item.toFixed(1)}%).`;
      actionPlan = [
        "Reforçar Venda Sugestiva (SLP) no caixa e na esteira.",
        "Treinar equipe para oferecer itens complementares (pilhas, acessórios) em 100% dos atendimentos.",
        "Criar desafio relâmpago para a equipe focado em cupons com 2+ itens."
      ];
    } else {
      textMainCause = "Mix de produtos vendidos está concentrado em itens de menor valor agregado.";
      actionPlan = [
        "Direcionar a demonstração para produtos de curva A e maior ticket.",
        "Reduzir descontos agressivos se não houver contrapartida em volume.",
        "Garantir ruptura zero nos produtos formadores de ticket da loja."
      ];
    }

    return {
      mainProblem,
      textMainCause,
      actionPlan,
      perc1Item,
      digitalShare
    };
  }, [gapAnalysis, metrics]);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatNum = (val: number) => val.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  if (activeSales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Activity className="w-12 h-12 mb-4 text-slate-300" />
        <p className="font-medium">Nenhum dado disponível para análise de GAP.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      
      {/* Configuration Bar */}
      <Card className="ri-card border-indigo-100 bg-indigo-50/30 overflow-hidden shrink-0">
        <div className="p-4 border-b border-indigo-100/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-sm">
              <Target className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Metas do Período</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Ajuste os valores para base de cálculo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase text-indigo-600 tracking-widest">Meta de Venda (R$)</Label>
              <Input 
                type="number" 
                value={metaVenda} 
                onChange={(e) => setMetaVenda(Number(e.target.value))}
                className="h-8 text-xs font-bold w-32 bg-white border-indigo-100"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase text-indigo-600 tracking-widest">Meta Cupons</Label>
              <Input 
                type="number" 
                value={metaCupons} 
                onChange={(e) => setMetaCupons(Number(e.target.value))}
                className="h-8 text-xs font-bold w-24 bg-white border-indigo-100"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase text-indigo-600 tracking-widest">Meta PA</Label>
              <Input 
                type="number" 
                step="0.1"
                value={metaPA} 
                onChange={(e) => setMetaPA(Number(e.target.value))}
                className="h-8 text-xs font-bold w-20 bg-white border-indigo-100"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Bloco 1: Resumo Executivo do GAP */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card className="ri-card border-slate-200 md:col-span-5 overflow-hidden flex flex-col relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 blur-[50px] -mr-10 -mt-10 rounded-full" />
          <div className="p-5 border-b border-slate-100 relative z-10 flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg text-white",
              gapAnalysis.gapTotal >= 0 ? "bg-emerald-500" : "bg-rose-500"
            )}>
              {gapAnalysis.gapTotal >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Resultado vs Meta</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resumo Executivo do GAP</p>
            </div>
          </div>
          <CardContent className="p-6 flex-1 flex flex-col justify-center relative z-10 space-y-6">
            <div className="flex items-end justify-between">
               <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Venda Atual</p>
                 <p className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{formatBRL(metrics.sales)}</p>
               </div>
               <div className="text-right">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Meta</p>
                 <p className="text-xl font-bold text-slate-500 tracking-tighter leading-none">{formatBRL(metaVenda)}</p>
               </div>
            </div>

            <div className={cn(
              "p-4 rounded-2xl flex items-center justify-between border",
              gapAnalysis.gapTotal >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
            )}>
               <div>
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-widest mb-1",
                    gapAnalysis.gapTotal >= 0 ? "text-emerald-600" : "text-rose-600"
                  )}>GAP Absoluto</p>
                  <p className={cn(
                    "text-2xl font-black tracking-tighter leading-none",
                    gapAnalysis.gapTotal >= 0 ? "text-emerald-700" : "text-rose-700"
                  )}>{formatBRL(gapAnalysis.gapTotal)}</p>
               </div>
               <div className="text-right">
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-widest mb-1",
                    gapAnalysis.gapTotal >= 0 ? "text-emerald-600" : "text-rose-600"
                  )}>Variação</p>
                  <p className={cn(
                    "text-2xl font-black tracking-tighter leading-none",
                    gapAnalysis.gapTotal >= 0 ? "text-emerald-700" : "text-rose-700"
                  )}>{gapAnalysis.gapPerc > 0 && '+'}{gapAnalysis.gapPerc.toFixed(1)}%</p>
               </div>
            </div>
          </CardContent>
        </Card>

        <Card className="ri-card border-slate-200 md:col-span-7 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
             <Layers className="w-5 h-5 text-indigo-500" />
             <div>
               <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Decomposição do GAP</h3>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">De onde vem a diferença</p>
             </div>
          </div>
          <CardContent className="p-6 flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ImpactCard title="Impacto de Cupons" subtitle="Volume" val={gapAnalysis.impactVolume} icon={Users} />
            <ImpactCard title="Impacto de PA" subtitle="Profundidade" val={gapAnalysis.impactPA} icon={ShoppingBag} />
            <ImpactCard title="Impacto de Preço" subtitle="TKM / Preço Médio" val={gapAnalysis.impactPreco} icon={DollarSign} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bloco 2: Volume */}
        <Card className="ri-card border-slate-200 overflow-hidden">
           <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Diagnóstico de Volume</h3>
              <Users className="w-4 h-4 text-slate-400" />
           </div>
           <CardContent className="p-5 space-y-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Cupons Realizados</p>
                  <p className="text-3xl font-black text-slate-800 leading-none">{metrics.cupons}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Meta</p>
                  <p className="text-xl font-bold text-slate-500 leading-none">{metaCupons}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 pt-2 border-t border-slate-100">Performance</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-600">Atingimento de Volume</span>
                  <span className={cn("font-black", metrics.cupons >= metaCupons ? "text-emerald-600" : "text-rose-600")}>
                    {metaCupons > 0 ? ((metrics.cupons / metaCupons)*100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-4 p-3 bg-indigo-50 rounded-xl text-xs font-medium text-indigo-700">
                  <Lightbulb className="w-4 h-4 shrink-0 text-indigo-500" />
                  <p>{gapAnalysis.impactVolume < 0 ? "O volume está retendo o potencial de faturamento geral." : "Volume saudável contribuindo positivamente para o fechamento."}</p>
                </div>
              </div>
           </CardContent>
        </Card>

        {/* Bloco 3: Profundidade (PA) */}
        <Card className="ri-card border-slate-200 overflow-hidden relative">
           <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Diagnóstico de Profundidade</h3>
              <ShoppingBag className="w-4 h-4 text-slate-400" />
           </div>
           <CardContent className="p-5 space-y-5">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">PA Atual</p>
                  <p className="text-3xl font-black text-slate-800 leading-none">{metrics.pa.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Meta</p>
                  <p className="text-xl font-bold text-slate-500 leading-none">{metaPA.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Distribuição da Cesta</p>
                 <ProgressRow label="1 item" val={metrics.itemsDistribution["1"]} total={metrics.cupons} color="bg-rose-500" />
                 <ProgressRow label="2 itens" val={metrics.itemsDistribution["2"]} total={metrics.cupons} color="bg-amber-500" />
                 <ProgressRow label="3+ itens" val={metrics.itemsDistribution["3+"]} total={metrics.cupons} color="bg-emerald-500" />
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-4">
                 <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">PA Físico</p>
                    <p className="text-sm font-black text-slate-700 flex items-center gap-1">
                      <Store className="w-3 h-3 text-slate-400" />
                      {metrics.channelStats.fisico.cupons > 0 ? (metrics.channelStats.fisico.items / metrics.channelStats.fisico.cupons).toFixed(2) : "0.00"}
                    </p>
                 </div>
                 <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">PA Digital</p>
                    <p className="text-sm font-black text-sky-600 flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-sky-400" />
                      {metrics.channelStats.digital.cupons > 0 ? (metrics.channelStats.digital.items / metrics.channelStats.digital.cupons).toFixed(2) : "0.00"}
                    </p>
                 </div>
              </div>
           </CardContent>
        </Card>

        {/* Bloco 4: Valor (TKM) */}
        <Card className="ri-card border-slate-200 overflow-hidden">
           <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Diagnóstico de Valor</h3>
              <DollarSign className="w-4 h-4 text-slate-400" />
           </div>
           <CardContent className="p-5 space-y-6">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Ticket Médio</p>
                  <p className="text-3xl font-black text-slate-800 leading-none">{formatBRL(metrics.tkm)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Preço Médio / Item</p>
                  <p className="text-xl font-bold text-indigo-600 leading-none">{formatBRL(metrics.pm)}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Faixas de Ticket</p>
                 <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                       <span className="font-bold text-slate-600">Ticket Baixo (&lt; R$ 50)</span>
                       <span className="font-black text-slate-800">{((metrics.ticketRanges.baixo / metrics.cupons)*100 || 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="font-bold text-slate-600">Ticket Médio (R$ 50 - 150)</span>
                       <span className="font-black text-slate-800">{((metrics.ticketRanges.medio / metrics.cupons)*100 || 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="font-bold text-slate-600">Ticket Alto (&gt; R$ 150)</span>
                       <span className="font-black text-slate-800">{((metrics.ticketRanges.alto / metrics.cupons)*100 || 0).toFixed(1)}%</span>
                    </div>
                 </div>
                 {metrics.tkm > gapAnalysis.metaTKM && gapAnalysis.impactPA < 0 && (
                    <div className="mt-2 text-[10px] font-bold text-amber-600 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      Ticket sustentado por precificação. Cuidado com o mix muito caro reduzindo o número de itens na cesta.
                    </div>
                 )}
              </div>
           </CardContent>
        </Card>
      </div>

      {/* Bloco 5: Simulações (Diferencial) */}
      <Card className="ri-card border-slate-200 overflow-hidden bg-gradient-to-br from-indigo-900 to-slate-900 text-white">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                  <Settings2 className="w-5 h-5 text-indigo-300" />
               </div>
               <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-white">Simulador Estratégico</h3>
                  <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest">O que acontece se mudarmos o cenário?</p>
               </div>
            </div>
        </div>
        <CardContent className="p-6">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Simulação: Ajuste de PA */}
              <div className="space-y-6">
                 <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-indigo-200 mb-4 flex items-center gap-2">
                       <Activity className="w-4 h-4" />
                       Cenário 1: Conversão de Cesta
                    </h4>
                    <div className="space-y-6 px-4">
                       <div className="space-y-3">
                          <div className="flex justify-between items-center">
                             <Label className="text-xs font-bold text-slate-300">Aumentar cupons com 2 itens em:</Label>
                             <span className="text-sm font-black text-white">+{simulAddCupom2}%</span>
                          </div>
                          <Slider 
                            value={[simulAddCupom2]} 
                            max={50} step={1} 
                            onValueChange={(v: number[]) => setSimulAddCupom2(v[0])}
                            className="py-2"
                          />
                       </div>
                       <div className="space-y-3">
                          <div className="flex justify-between items-center">
                             <Label className="text-xs font-bold text-slate-300">Aumentar cupons com 3+ itens em:</Label>
                             <span className="text-sm font-black text-white">+{simulAddCupom3}%</span>
                          </div>
                          <Slider 
                            value={[simulAddCupom3]} 
                            max={50} step={1} 
                            onValueChange={(v: number[]) => setSimulAddCupom3(v[0])}
                            className="py-2"
                          />
                       </div>
                    </div>
                 </div>
                 
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Novo PA Projetado</p>
                       <p className="text-2xl font-black text-white">{simAnalysis.ajustePA.newPA.toFixed(2)}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-indigo-400" />
                    <div className="text-right">
                       <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Ganho Estimado</p>
                       <p className="text-2xl font-black text-emerald-400">+{formatBRL(simAnalysis.ajustePA.salesGain)}</p>
                    </div>
                 </div>
              </div>

              {/* Simulação: Sem Digital */}
              <div className="space-y-6 lg:border-l lg:border-white/10 lg:pl-8 flex flex-col">
                 <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-indigo-200 mb-4 flex items-center gap-2">
                       <Store className="w-4 h-4" />
                       Cenário 2: Resultado Estrutural (Sem Digital)
                    </h4>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">
                       Isola o resultado apenas da loja física, removendo as vendas de Pickup e Delivery que distorcem o PA (pois geralmente possuem apenas 1 item).
                    </p>
                 </div>

                 <div className="mt-auto grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                       <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">PA Físico Ajustado</p>
                       <div className="flex items-center gap-3">
                         <p className="text-3xl font-black text-white">{simAnalysis.semDigital.pa.toFixed(2)}</p>
                         <span className={cn(
                           "text-xs font-bold px-2 py-0.5 rounded-full",
                           simAnalysis.semDigital.pa > metrics.pa ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-300"
                         )}>
                            vs {metrics.pa.toFixed(2)}
                         </span>
                       </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center">
                       <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Venda Física Real</p>
                       <p className="text-xl font-black text-white">{formatBRL(simAnalysis.semDigital.sales)}</p>
                    </div>
                 </div>
              </div>

           </div>
        </CardContent>
      </Card>

      {/* Blocos 8 e 9: Conclusão Automatizada e Plano de Ação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Card className="ri-card border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 bg-indigo-600 text-white flex items-center gap-3">
               <Activity className="w-5 h-5" />
               <h3 className="text-sm font-black uppercase tracking-widest">Sintese Diagnóstica</h3>
            </div>
            <CardContent className="p-6 space-y-6">
               <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Principal Ofensor do Resultado</p>
                  <p className="text-2xl font-black text-slate-800 tracking-tight">
                    {diagnostic.mainProblem?.name.split(' (')[0] || "N/A"}
                  </p>
               </div>
               <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Causa Raiz Identificada</p>
                  <p className="text-sm font-bold text-slate-600 leading-relaxed border-l-2 border-indigo-400 pl-3">
                    {diagnostic.textMainCause}
                  </p>
               </div>
               <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fator Estrutural</p>
                  <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                     <Smartphone className="w-4 h-4 text-sky-500" />
                     Canal digital representa {diagnostic.digitalShare.toFixed(1)}% das operações.
                  </p>
               </div>
               <div className="p-4 bg-rose-50 rounded-2xl flex justify-between items-center border border-rose-100">
                  <span className="text-xs font-black uppercase tracking-widest text-rose-500">Impacto Estimado</span>
                  <span className="text-xl font-black text-rose-700">{formatBRL(diagnostic.mainProblem?.val || 0)}</span>
               </div>
            </CardContent>
         </Card>

         <Card className="ri-card border-slate-200 overflow-hidden bg-slate-50">
            <div className="p-5 border-b border-slate-200 flex items-center gap-3 bg-white">
               <Target className="w-5 h-5 text-emerald-500" />
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Plano de Ação Sugerido</h3>
            </div>
            <CardContent className="p-6">
               <ul className="space-y-4">
                 {diagnostic.actionPlan.map((action, idx) => (
                   <li key={idx} className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 items-start">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black shrink-0">
                         {idx + 1}
                      </div>
                      <p className="text-sm font-bold text-slate-700 pt-1.5">{action}</p>
                   </li>
                 ))}
               </ul>
            </CardContent>
         </Card>
      </div>

    </div>
  );
}

function ImpactCard({ title, subtitle, val, icon: Icon }: any) {
  const formatBRL = (v: number) => Math.abs(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const isPos = val >= 0;

  return (
    <div className={cn(
      "p-4 rounded-2xl border",
      isPos ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"
    )}>
       <div className="flex justify-between items-start mb-4">
          <div className={cn(
            "p-2 rounded-lg",
            isPos ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
          )}>
             <Icon className="w-4 h-4" />
          </div>
       </div>
       <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{subtitle}</p>
          <p className="text-xs font-bold text-slate-700 mb-2">{title}</p>
          <p className={cn(
            "text-xl font-black tracking-tighter",
            isPos ? "text-emerald-700" : "text-rose-700"
          )}>
             {isPos ? "+" : "-"}{formatBRL(val)}
          </p>
       </div>
    </div>
  );
}

function ProgressRow({ label, val, total, color }: any) {
  const perc = total > 0 ? (val / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
       <div className="flex justify-between items-end">
          <span className="text-xs font-bold text-slate-600">{label}</span>
          <span className="text-xs font-black text-slate-800">{perc.toFixed(1)}% <span className="text-[9px] text-slate-400 font-bold ml-1">({val})</span></span>
       </div>
       <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
             initial={{ width: 0 }}
             animate={{ width: `${perc}%` }}
             transition={{ duration: 1 }}
             className={cn("h-full", color)}
          />
       </div>
    </div>
  );
}
