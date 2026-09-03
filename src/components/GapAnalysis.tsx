"use client";

import React, { useState, useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  ShoppingBag, 
  DollarSign, 
  Activity, 
  Smartphone, 
  Store,
  ArrowRight,
  Settings2,
  AlertTriangle,
  Users,
  Target
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProductivityAnalysisProps {
  data: DetailedSaleRow[];
}

export function GapAnalysis({ data }: ProductivityAnalysisProps) {
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

  const simAnalysis = useMemo(() => {
    const move2 = Math.round(metrics.cupons * (simulAddCupom2 / 100));
    const move3 = Math.round(metrics.cupons * (simulAddCupom3 / 100));
    
    const addedItems2 = move2 * 1; 
    const addedItems3 = move3 * 2; 

    const newItems = metrics.items + addedItems2 + addedItems3;
    const newPA = metrics.cupons > 0 ? newItems / metrics.cupons : 0;
    const newSales = newItems * metrics.pm;

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
    const perc1Item = metrics.cupons > 0 ? (metrics.itemsDistribution["1"] / metrics.cupons) * 100 : 0;
    const digitalShare = metrics.cupons > 0 ? (metrics.channelStats.digital.cupons / metrics.cupons) * 100 : 0;

    let mainProblemName = "";
    let textMainCause = "";
    let actionPlan: string[] = [];

    if (perc1Item > 40) {
      mainProblemName = "Profundidade (PA Baixo)";
      textMainCause = `Alta concentração de cupons com apenas 1 item (${perc1Item.toFixed(1)}%). Oportunidade gigante de vendas adicionais em balcão.`;
      actionPlan = [
        "Reforçar Venda Sugestiva (SLP) no caixa e na esteira.",
        "Treinar equipe para oferecer itens complementares (pilhas, embalagens, utilitários) em 100% dos atendimentos.",
        "Criar dinâmica relâmpago para a equipe focada na pulverização (cestas com 2+ itens)."
      ];
    } else if (metrics.pm < 50) {
      mainProblemName = "Valor Nominal (Ticket/Preço Médio Acanhado)";
      textMainCause = `O mix escoado pela operação está altamente concentrado em itens de menor valor agregado bruto (Preço Médio do item não passa de R$ ${metrics.pm.toFixed(2)}).`;
      actionPlan = [
        "Direcionar urgentemente a demonstração passiva para produtos de curva A e maior ticket isolado.",
        "Reduzir descontos agressivos na base de volume se não houver contrapartida escalonada.",
        "Garantir exposição primária nos produtos formadores de ticket que sustentam a loja."
      ];
    } else {
      mainProblemName = "Tração Orgânica (Volume de Cupons e Conversão)";
      textMainCause = "Com a base matricial de PA e Preço Médio saudáveis para a categoria, a alavanca principal de crescimento passa a ser unicamente a atração de volume e conversão de porta para tráfego.";
      actionPlan = [
        "Revisar vitrine e a comunicação visual em frente de loja de modo agressivo para pescar o fluxo.",
        "Avaliar horários de vale ou extrema ociosidade e remanejar a linha de frente para abordagem externa proativa.",
        "Acionar lista de transmissão ou ações clienteling (VIP/WhatsApp) ofertando novidades âncora."
      ];
    }

    return {
      mainProblemName,
      textMainCause,
      actionPlan,
      perc1Item,
      digitalShare
    };
  }, [metrics]);

  const formatBRL = (val?: number | string | null) => (Number(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (activeSales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Activity className="w-12 h-12 mb-4 text-slate-300" />
        <p className="font-medium">Nenhum dado disponível para análise de Produtividade.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      
      {/* Bloco 1: Raio-X Geral */}
      <Card className="ri-card border-slate-200 overflow-hidden relative bg-indigo-600 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[50px] rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="p-6 md:px-8 md:py-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
           <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                 <Target className="w-3.5 h-3.5" />
                 Raio-X da Operação
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-1">
                 {formatBRL(metrics.sales)}
              </h2>
              <p className="text-indigo-200 font-bold uppercase text-xs tracking-widest">Faturamento Realizado</p>
           </div>
           
           <div className="grid grid-cols-3 gap-4 md:gap-6 w-full md:w-auto">
              <div className="flex flex-col items-center justify-center p-4 bg-white/10 rounded-2xl border border-white/5">
                 <Users className="w-5 h-5 text-indigo-300 mb-2" />
                 <p className="text-2xl font-black leading-none mb-1">{metrics.cupons}</p>
                 <p className="text-[9px] font-bold uppercase text-indigo-200 tracking-widest">Cupons Base</p>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-white/10 rounded-2xl border border-white/5">
                 <ShoppingBag className="w-5 h-5 text-indigo-300 mb-2" />
                 <p className="text-2xl font-black leading-none mb-1">{metrics.pa.toFixed(2)}</p>
                 <p className="text-[9px] font-bold uppercase text-indigo-200 tracking-widest">P.A. Global</p>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-white/10 rounded-2xl border border-white/5">
                 <DollarSign className="w-5 h-5 text-indigo-300 mb-2" />
                 <p className="text-2xl font-black leading-none mb-1">{formatBRL(metrics.tkm)}</p>
                 <p className="text-[9px] font-bold uppercase text-indigo-200 tracking-widest">TKM</p>
              </div>
           </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bloco 2: Volume */}
        <Card className="ri-card border-slate-200 overflow-hidden">
           <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Diagnóstico de Volume</h3>
              <Users className="w-4 h-4 text-slate-400" />
           </div>
           <CardContent className="p-5 space-y-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total de Atendimentos</p>
                <p className="text-4xl font-black text-slate-800 leading-none">{metrics.cupons}</p>
              </div>
              
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 pt-2 border-t border-slate-100">Distribuição por Canal Escoado</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-600 flex items-center gap-1.5"><Store className="w-3.5 h-3.5 text-slate-400"/> Balcão</span>
                  <span className="font-black text-slate-800">{metrics.channelStats.fisico.cupons} cf</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-600 flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-sky-500"/> Retirada/Delivery</span>
                  <span className="font-black text-sky-600">{metrics.channelStats.digital.cupons} cf</span>
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
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">PA Operado</p>
                <p className="text-4xl font-black text-slate-800 leading-none">{metrics.pa.toFixed(2)}</p>
              </div>
              
              <div className="space-y-2">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tração na Cesta</p>
                 <ProgressRow label="Somente 1 item" val={metrics.itemsDistribution["1"]} total={metrics.cupons} color="bg-rose-500" />
                 <ProgressRow label="2 itens" val={metrics.itemsDistribution["2"]} total={metrics.cupons} color="bg-amber-500" />
                 <ProgressRow label="3+ itens" val={metrics.itemsDistribution["3+"]} total={metrics.cupons} color="bg-emerald-500" />
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-4">
                 <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">PA Físico (Balcão)</p>
                    <p className="text-sm font-black text-slate-700 flex items-center gap-1">
                      <Store className="w-3 h-3 text-slate-400" />
                      {metrics.channelStats.fisico.cupons > 0 ? (metrics.channelStats.fisico.items / metrics.channelStats.fisico.cupons).toFixed(2) : "0.00"}
                    </p>
                 </div>
                 <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">PA Digital (Web)</p>
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
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Ticket Médio (TKM)</p>
                  <p className="text-3xl font-black text-slate-800 leading-none">{formatBRL(metrics.tkm)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Preço M. / Item</p>
                  <p className="text-xl font-bold text-indigo-600 leading-none">{formatBRL(metrics.pm)}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Giro nas Faixas de Ticket</p>
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
                 {metrics.tkm > 150 && diagnostic.perc1Item > 50 && (
                    <div className="mt-2 text-[10px] font-bold text-amber-600 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      Atenção: Ticket sustentado por extrema precificação isolada, mas com baixa conversão paralela.
                    </div>
                 )}
              </div>
           </CardContent>
        </Card>
      </div>

      {/* Bloco 5: Simulações (Diferencial) */}
      <Card className="ri-card border-slate-200 overflow-hidden bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                  <Settings2 className="w-5 h-5 text-indigo-300" />
               </div>
               <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-white">Laboratório de Produtividade</h3>
                  <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest">Descubra o ganho orgânico calibrando seu cenário real</p>
               </div>
            </div>
        </div>
        <CardContent className="p-6 md:p-8">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
              
              {/* Simulação: Ajuste de PA */}
              <div className="space-y-6">
                 <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-indigo-200 mb-4 flex items-center gap-2">
                       <Activity className="w-4 h-4" />
                       Cenário 1: Conversão e Profundidade (Equipe)
                    </h4>
                    <div className="space-y-6 px-1">
                       <div className="space-y-3">
                          <div className="flex justify-between items-center">
                             <Label className="text-xs font-bold text-slate-300">Esforço em convencer p/ 2 itens (+%)</Label>
                             <span className="text-sm font-black text-white px-2 py-1 bg-white/10 rounded-md">+{simulAddCupom2}%</span>
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
                             <Label className="text-xs font-bold text-slate-300">Esforço em pulverizações de 3+ itens (+%)</Label>
                             <span className="text-sm font-black text-white px-2 py-1 bg-white/10 rounded-md">+{simulAddCupom3}%</span>
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
                 
                 <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between shadow-inner">
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Novo PA Projetado</p>
                       <p className="text-3xl font-black text-white">{simAnalysis.ajustePA.newPA.toFixed(2)}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-indigo-400 opacity-50" />
                    <div className="text-right">
                       <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Ganho Faturamento</p>
                       <p className="text-3xl font-black text-emerald-400">+{formatBRL(simAnalysis.ajustePA.salesGain)}</p>
                    </div>
                 </div>
              </div>

              {/* Simulação: Sem Digital */}
              <div className="space-y-6 lg:border-l lg:border-white/10 lg:pl-10 flex flex-col">
                 <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-indigo-200 mb-4 flex items-center gap-2">
                       <Store className="w-4 h-4" />
                       Cenário 2: Visão Balcão Raiz
                    </h4>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">
                       Isola a purificação orgânica de balcão físico local. Remove todos os cupons sujos provindos de Pickup ou Delivery que arrastam o seu PA estatístico para baixo devido ao limite do canal digital em gerar vendas adjacentes.
                    </p>
                 </div>

                 <div className="mt-auto space-y-4">
                    {/* Consolidado Geral */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-white/5 pb-2">1. Cenário Consolidado Geral (Com Omni)</p>
                       <div className="grid grid-cols-3 gap-2">
                         <div>
                           <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Vendas Totais</p>
                           <p className="text-sm font-black text-slate-300">{formatBRL(metrics.sales)}</p>
                         </div>
                         <div>
                           <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Total Cupons</p>
                           <p className="text-sm font-black text-slate-300">{metrics.cupons}</p>
                         </div>
                         <div>
                           <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">P.A. Global</p>
                           <p className="text-sm font-black text-slate-300">{metrics.pa.toFixed(2)}</p>
                         </div>
                       </div>
                    </div>

                    {/* Visão Balcão Raiz (Expurgado) */}
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-3"><Store className="w-12 h-12 text-indigo-500/10" /></div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-3 border-b border-indigo-500/10 pb-2 relative z-10">2. Cenário Balcão Raiz (Expurgado / Só Loja Física)</p>
                       <div className="grid grid-cols-3 gap-2 relative z-10">
                         <div>
                           <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">Vendas (Balcão)</p>
                           <p className="text-base font-black text-white">{formatBRL(simAnalysis.semDigital.sales)}</p>
                         </div>
                         <div>
                           <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">Cupons Físicos</p>
                           <p className="text-base font-black text-white">{simAnalysis.semDigital.cupons}</p>
                         </div>
                         <div>
                           <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">P.A. Real da Loja</p>
                           <p className="text-lg font-black text-emerald-400">{simAnalysis.semDigital.pa.toFixed(2)}</p>
                         </div>
                       </div>
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
               <h3 className="text-sm font-black uppercase tracking-widest">Auto-Diagnóstico de Contexto</h3>
            </div>
            <CardContent className="p-6 space-y-7">
               <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ponto Fraco (Vulnerabilidade da Bateria Geral)</p>
                  <p className="text-2xl font-black text-slate-800 tracking-tight">
                    {diagnostic.mainProblemName}
                  </p>
               </div>
               <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Leitura de Causa Raiz pelo Engine</p>
                  <p className="text-sm font-bold text-slate-600 leading-relaxed border-l-2 border-indigo-400 pl-3">
                    {diagnostic.textMainCause}
                  </p>
               </div>
               <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fator Oculto (Peso Digital)</p>
                  <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                     <Smartphone className="w-4 h-4 text-sky-500" />
                     Os canais OMNI perfazem {diagnostic.digitalShare.toFixed(1)}% das operações dessa base analisável.
                  </p>
               </div>
            </CardContent>
         </Card>

         <Card className="ri-card border-slate-200 overflow-hidden bg-slate-50">
            <div className="p-5 border-b border-slate-200 flex items-center gap-3 bg-white">
               <Target className="w-5 h-5 text-emerald-500" />
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Cure o Gap: Rotina Operacional (Sugerida)</h3>
            </div>
            <CardContent className="p-6">
               <ul className="space-y-4">
                 {diagnostic.actionPlan.map((action, idx) => (
                   <li key={idx} className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 items-start hover:bg-slate-50 transition-colors">
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

function ProgressRow({ label, val, total, color }: { label: string, val: number, total: number, color: string }) {
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
