"use client";

import React, { useMemo } from "react";
import { 
  CollaboratorBasketMetric, 
  BasketQualityMetrics, 
  OutlierCoupon 
} from "@/lib/basket-quality-analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Target, 
  Users, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Layers, 
  ShieldCheck, 
  Receipt, 
  Eye, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Calculator
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CollaboratorDetailModalProps {
  collaborator: CollaboratorBasketMetric | null;
  storeOverall: BasketQualityMetrics;
  open: boolean;
  onClose: () => void;
  onInspectCoupon: (coupon: OutlierCoupon) => void;
}

const BUCKET_COLOR_MAP: Record<string, string> = {
  "1": "#ef4444",
  "2": "#3b82f6",
  "3": "#10b981",
  "4-5": "#8b5cf6",
  "6-9": "#f59e0b",
  "10+": "#d946ef"
};

export function CollaboratorDetailModal({
  collaborator,
  storeOverall,
  open,
  onClose,
  onInspectCoupon
}: CollaboratorDetailModalProps) {
  if (!collaborator) return null;

  const [roleType, setRoleType] = React.useState<"SALAO" | "MULTITAREFA">("SALAO");
  const [copiedFeedback, setCopiedFeedback] = React.useState(false);

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const c = collaborator;
  const avgPrice = c.totalItens > 0 
    ? c.totalVenda / c.totalItens 
    : storeOverall.totalItens > 0 
    ? storeOverall.totalVenda / storeOverall.totalItens 
    : 45;

  // Metas Calibradas por Perfil de Função
  const targetUnitRate = roleType === "MULTITAREFA" ? 60.0 : 55.0;
  const targetTwoItemsRate = roleType === "MULTITAREFA" ? 25.0 : 28.0;

  // 1. SIMULAÇÃO 1: BASE NA META (Ajustada pelo Perfil: 55% Salão vs 60% Multitarefa)
  const metaSimulation = useMemo(() => {
    const isAboveTarget = c.unitRate > targetUnitRate;
    const excessRate = Math.max(0, c.unitRate - targetUnitRate);
    const maxAllowed1ItemCoupons = Math.floor(c.totalCupons * (targetUnitRate / 100));
    const couponsToConvert = Math.max(0, c.unitCount - maxAllowed1ItemCoupons);
    const missingPieces = couponsToConvert * 1;
    const projectedTotalPieces = c.totalItens + missingPieces;
    const projectedPA = c.totalCupons > 0 ? projectedTotalPieces / c.totalCupons : 0;
    const deltaPA = projectedPA - c.paReal;
    const extraRevenue = missingPieces * avgPrice;

    return {
      isAboveTarget,
      targetUnitRate,
      excessRate,
      couponsToConvert,
      missingPieces,
      projectedPA,
      deltaPA,
      extraRevenue
    };
  }, [c, targetUnitRate, avgPrice]);

  // 2. SIMULAÇÃO 2: BASE NA MÉDIA CONSOLIDADA DA EQUIPE DA LOJA
  const teamSimulation = useMemo(() => {
    const teamUnitRate = storeOverall.unitRate; // ex: 56.8%
    const isAboveTeam = c.unitRate > teamUnitRate;
    const excessVsTeam = Math.max(0, c.unitRate - teamUnitRate);
    const allowedByTeamRate = Math.floor(c.totalCupons * (teamUnitRate / 100));
    const couponsToConvertTeam = Math.max(0, c.unitCount - allowedByTeamRate);
    const missingPiecesTeam = couponsToConvertTeam * 1;
    const projectedTotalPiecesTeam = c.totalItens + missingPiecesTeam;
    const projectedPATeam = c.totalCupons > 0 ? projectedTotalPiecesTeam / c.totalCupons : 0;
    const deltaPATeam = projectedPATeam - c.paReal;
    const extraRevenueTeam = missingPiecesTeam * avgPrice;

    return {
      isAboveTeam,
      teamUnitRate,
      excessVsTeam,
      couponsToConvertTeam,
      missingPiecesTeam,
      projectedPATeam,
      deltaPATeam,
      extraRevenueTeam
    };
  }, [c, storeOverall, avgPrice]);

  // Gerador de Roteiro de Feedback 1-on-1 Humanizado e Justo
  const handleCopyFeedbackScript = () => {
    const text = roleType === "MULTITAREFA" 
      ? `ROTEIRO DE FEEDBACK 1-ON-1 - COLABORADOR MULTITAREFA (CAIXA / APOIO / RETIRADA)
Colaborador(a): ${c.name}
Data: ${new Date().toLocaleDateString("pt-BR")}

🎯 CRITÉRIOS DE JUSTIÇA AVALIATIVA:
Por atuar em operações de caixa, pacote, reposição e atendimento rápido, sua meta é ajustada para a rotina de checkout:
- Meta Justa de 1 Item (Monopeça): até 60.0% (Realizado: ${c.unitRate.toFixed(1)}%)
- Meta Justa de 2 Itens (2º Item de Impulso / P1 no Caixa): a partir de 25.0% (Realizado: ${c.twoItemsRate.toFixed(1)}%)
- Cestas 3+ Itens: Bônus de oportunidade (Realizado: ${c.threePlusRate.toFixed(1)}%)

📋 PONTOS PARA A CONVERSA COM O GESTOR:
1. Volume e Atendimentos: Você atendeu ${c.totalCupons} clientes e movimentou ${c.totalItens} peças (R$ ${c.totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).
2. Conversão de Caixa (2º Item): ${c.twoItemsRate >= 25 ? `✓ Parabéns! Excelente disciplina ao oferecer itens de impulso no checkout (${c.twoItemsRate.toFixed(1)}% ≥ 25%).` : `⚠️ Oportunidade: Sua taxa de 2 itens está em ${c.twoItemsRate.toFixed(1)}%. Vamos reforçar a oferta de produtos de balcão (meias, acessórios, P1) para o cliente não sair com 1 peça só.`}
3. PA Real: ${c.paReal.toFixed(2)} peças/cupom.`
      : `ROTEIRO DE FEEDBACK 1-ON-1 - VENDEDOR DE SALÃO (VENDA ASSISTIDA)
Colaborador(a): ${c.name}
Data: ${new Date().toLocaleDateString("pt-BR")}

🎯 CRITÉRIOS DE SALÃO (VENDA CONSULTIVA):
- Meta de 1 Item (Monopeça): até 55.0% (Realizado: ${c.unitRate.toFixed(1)}%)
- Meta de 2 Itens (Venda Casada): a partir de 28.0% (Realizado: ${c.twoItemsRate.toFixed(1)}%)
- Meta de Cestas Profundas (3+ Itens): a partir de 17.0% (Realizado: ${c.threePlusRate.toFixed(1)}%)

📋 PONTOS PARA A CONVERSA COM O GESTOR:
1. Desempenho Geral: ${c.totalCupons} cupons | ${c.totalItens} peças | PA: ${c.paReal.toFixed(2)}.
2. Controle de Monopeça: ${c.unitRate <= 55 ? `✓ Ótimo controle de monopeça (${c.unitRate.toFixed(1)}% ≤ 55%).` : `⚠️ Atenção à monopeça (${c.unitRate.toFixed(1)}% > 55%). Levar sempre 2 a 3 peças ao provador.`}
3. Cestas Profundas (3+): ${c.threePlusRate >= 17 ? `✓ Excelente atuação em looks completos (${c.threePlusRate.toFixed(1)}%).` : `⚠️ Oportunidade em cross-selling de calçados e acessórios para fechar compras com 3+ peças.`}`;

    navigator.clipboard.writeText(text);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl border border-slate-200">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-sm">
                {c.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-lg font-black uppercase text-slate-900 flex items-center gap-2 flex-wrap">
                  {c.name}
                  <Badge className={cn("text-[10px] font-black uppercase shadow-xs", c.profileBadgeColor)}>
                    {c.profileLabel}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  Diagnóstico completo de produtividade, sustentação de cesta e verificação justa por perfil de função.
                </DialogDescription>
              </div>
            </div>

            {/* SELETOR DE PERFIL DE ATUAÇÃO (JUSTIÇA AVALIATIVA) */}
            <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRoleType("SALAO")}
                className={cn(
                  "h-7 text-[11px] font-black rounded-xl px-2.5 transition-all",
                  roleType === "SALAO" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                🛍️ Vendedor de Salão
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRoleType("MULTITAREFA")}
                className={cn(
                  "h-7 text-[11px] font-black rounded-xl px-2.5 transition-all",
                  roleType === "MULTITAREFA" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                ⚡ Multitarefa / Caixa
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* BANNER INFORMATIVO DE JUSTIÇA QUANDO MULTITAREFA */}
          {roleType === "MULTITAREFA" && (
            <div className="bg-purple-50 p-3.5 rounded-2xl border border-purple-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-purple-900">
                <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
                <div>
                  <strong className="font-black uppercase text-[11px]">Avaliação Ponderada para Multitarefa / Caixa:</strong>
                  <p className="text-[11px] text-purple-800">
                    Metas ajustadas para giro rápido de balcão: <strong>Monopeça tolerante até 60.0%</strong> e foco na <strong>conversão do 2º item no checkout (≥ 25.0%)</strong>. Cestas 3+ são tratadas como bônus.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 1. CARDS DE KPIS DO COLABORADOR */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400">Atendimentos</span>
              <p className="text-2xl font-black text-slate-900">{c.totalCupons}</p>
              <span className="text-[10px] text-slate-500 font-bold">{c.totalItens} peças</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400">PA Real Oficial</span>
              <p className="text-2xl font-black text-slate-900">{c.paReal.toFixed(2)}</p>
              <span className="text-[10px] text-slate-500 font-bold">peças/cupom</span>
            </div>

            <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 text-center space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-800">PA Sustentado</span>
              <p className="text-2xl font-black text-emerald-700">{c.paSustentadoSemAnomalias.toFixed(2)}</p>
              <span className="text-[10px] text-emerald-800 font-bold">Base 1 a 5 peças</span>
            </div>

            <div className={cn(
              "p-3.5 rounded-2xl border text-center space-y-1",
              c.unitRate <= targetUnitRate ? "bg-emerald-50/70 border-emerald-200" : "bg-rose-50/70 border-rose-200"
            )}>
              <span className="text-[10px] font-black uppercase text-slate-500">% 1 Item (Monopeça)</span>
              <p className={cn("text-2xl font-black", c.unitRate <= targetUnitRate ? "text-emerald-700" : "text-rose-700")}>
                {c.unitRate.toFixed(1)}%
              </p>
              <span className="text-[10px] font-bold text-slate-600">Meta: ≤ {targetUnitRate.toFixed(0)}%</span>
            </div>

            <div className={cn(
              "p-3.5 rounded-2xl border text-center space-y-1",
              c.twoItemsRate >= targetTwoItemsRate ? "bg-emerald-50/70 border-emerald-200" : "bg-amber-50/70 border-amber-200"
            )}>
              <span className="text-[10px] font-black uppercase text-slate-500">% 2 Itens (Casada)</span>
              <p className={cn("text-2xl font-black", c.twoItemsRate >= targetTwoItemsRate ? "text-emerald-700" : "text-amber-700")}>
                {c.twoItemsRate.toFixed(1)}%
              </p>
              <span className="text-[10px] font-bold text-slate-600">Meta: ≥ {targetTwoItemsRate.toFixed(0)}%</span>
            </div>
          </div>

          {/* 2. DUPLO CARD DE SIMULAÇÃO DE GAP: META vs MÉDIA DA EQUIPE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-indigo-600" />
                Simulador de Conversão & Potencial de Alavancagem (GAP Analysis)
              </h4>
              <Badge variant="outline" className="text-[9px] font-bold uppercase border-indigo-200 text-indigo-700">
                {roleType === "MULTITAREFA" ? "Meta Ajustada Multitarefa" : "Meta Padrão Salão"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CENÁRIO 1: ALINHAMENTO À META */}
              <div className={cn(
                "p-5 rounded-3xl border space-y-4 shadow-xs",
                metaSimulation.isAboveTarget ? "bg-amber-50/70 border-amber-200" : "bg-emerald-50/70 border-emerald-200"
              )}>
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-xs font-black uppercase text-slate-900">
                      1. Cenário: Atingimento da Meta (≤ {targetUnitRate.toFixed(0)}%)
                    </span>
                  </div>
                  <Badge className={metaSimulation.isAboveTarget ? "bg-amber-600 text-white text-[9px]" : "bg-emerald-600 text-white text-[9px]"}>
                    {metaSimulation.isAboveTarget ? `GAP: +${metaSimulation.excessRate.toFixed(1)}%` : "✓ Na Meta"}
                  </Badge>
                </div>

                {metaSimulation.isAboveTarget ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                      O colaborador operou com <strong>{c.unitRate.toFixed(1)}% de atendimentos unitários</strong> (acima do teto de {targetUnitRate.toFixed(0)}%).
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200">
                        <span className="text-[9px] font-bold uppercase text-slate-400">Cupons a Converter (1 → 2)</span>
                        <p className="text-xl font-black text-amber-900">+{metaSimulation.couponsToConvert} cup</p>
                        <span className="text-[9px] text-amber-700 font-bold">+{metaSimulation.missingPieces} peças</span>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200">
                        <span className="text-[9px] font-bold uppercase text-slate-400">Novo PA Projetado</span>
                        <p className="text-xl font-black text-indigo-700">{metaSimulation.projectedPA.toFixed(2)}</p>
                        <span className="text-[9px] text-emerald-600 font-bold">+{metaSimulation.deltaPA.toFixed(2)} PA</span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-amber-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Faturamento Extra Estimado:</span>
                      <span className="text-sm font-black text-emerald-700">+{formatBRL(metaSimulation.extraRevenue)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="text-xs font-black text-emerald-900 uppercase">Excelente Disciplina de Balcão</p>
                    <p className="text-[11px] text-slate-600">
                      O colaborador já opera rigorosamente dentro da meta de monopeça ({c.unitRate.toFixed(1)}% ≤ {targetUnitRate.toFixed(0)}%).
                    </p>
                  </div>
                )}
              </div>

              {/* CENÁRIO 2: ALINHAMENTO À MÉDIA CONSOLIDADA DA LOJA */}
              <div className={cn(
                "p-5 rounded-3xl border space-y-4 shadow-xs",
                teamSimulation.isAboveTeam ? "bg-purple-50/70 border-purple-200" : "bg-indigo-50/70 border-indigo-200"
              )}>
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="text-xs font-black uppercase text-slate-900">
                      2. Cenário: Nivelamento à Média da Loja ({teamSimulation.teamUnitRate.toFixed(1)}%)
                    </span>
                  </div>
                  <Badge className={teamSimulation.isAboveTeam ? "bg-purple-600 text-white text-[9px]" : "bg-indigo-600 text-white text-[9px]"}>
                    {teamSimulation.isAboveTeam ? `GAP vs Colegas: +${teamSimulation.excessVsTeam.toFixed(1)}%` : "Acima da Média"}
                  </Badge>
                </div>

                {teamSimulation.isAboveTeam ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                      Se o colaborador tivesse performado na <strong>média da equipe da loja ({teamSimulation.teamUnitRate.toFixed(1)}%)</strong>:
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-white/90 p-2.5 rounded-xl border border-purple-200">
                        <span className="text-[9px] font-bold uppercase text-slate-400">Cupons Perdidos vs Média</span>
                        <p className="text-xl font-black text-purple-900">+{teamSimulation.couponsToConvertTeam} cup</p>
                        <span className="text-[9px] text-purple-700 font-bold">+{teamSimulation.missingPiecesTeam} peças</span>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-xl border border-purple-200">
                        <span className="text-[9px] font-bold uppercase text-slate-400">PA Alinhado à Equipe</span>
                        <p className="text-xl font-black text-indigo-700">{teamSimulation.projectedPATeam.toFixed(2)}</p>
                        <span className="text-[9px] text-emerald-600 font-bold">+{teamSimulation.deltaPATeam.toFixed(2)} PA</span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-purple-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Ganho Potencial vs Padrão da Loja:</span>
                      <span className="text-sm font-black text-emerald-700">+{formatBRL(teamSimulation.extraRevenueTeam)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-1">
                    <Sparkles className="w-8 h-8 text-indigo-600 mx-auto" />
                    <p className="text-xs font-black text-indigo-900 uppercase">Desempenho Superior à Média</p>
                    <p className="text-[11px] text-slate-600">
                      O colaborador converte melhor que a média geral dos colegas da loja ({c.unitRate.toFixed(1)}% vs {teamSimulation.teamUnitRate.toFixed(1)}% da loja).
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. QUADRO DE ROTEIRO DE FEEDBACK 1-ON-1 HUMANIZADO */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-3xl border border-indigo-900 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <div>
                  <h4 className="text-xs font-black uppercase text-white">
                    Roteiro de Feedback 1-on-1 ({roleType === "MULTITAREFA" ? "Perfil Multitarefa" : "Vendedor de Salão"})
                  </h4>
                  <p className="text-[11px] text-indigo-300 font-medium">
                    Guia de alinhamento com critérios justos para o gestor conversar diretamente com o colaborador.
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={handleCopyFeedbackScript}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm h-8 gap-1.5 shrink-0"
              >
                {copiedFeedback ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Roteiro Copiado!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Copiar Roteiro 1-on-1</span>
                  </>
                )}
              </Button>
            </div>

            <div className="bg-white/10 p-3.5 rounded-2xl border border-white/10 text-xs leading-relaxed space-y-1.5 font-mono text-slate-200">
              <p>• <strong>Critério:</strong> {roleType === "MULTITAREFA" ? "Foco em 2º item no caixa (P1/meias/acessórios), monopeça tolerante até 60%." : "Construção de look completo no salão (cross-selling), monopeça até 55%."}</p>
              <p>• <strong>Conversão de 2 Itens:</strong> {c.twoItemsRate.toFixed(1)}% (Meta: ≥ {targetTwoItemsRate.toFixed(0)}%) → {c.twoItemsRate >= targetTwoItemsRate ? "✓ Parabéns pelo resultado!" : "⚠️ Oportunidade de alinhamento na abordagem."}</p>
              <p>• <strong>Monopeça Real:</strong> {c.unitRate.toFixed(1)}% (Teto Justo: ≤ {targetUnitRate.toFixed(0)}%).</p>
            </div>
          </div>

          {/* 3. DISTRIBUIÇÃO DAS 6 FAIXAS DE ATENDIMENTO */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              Distribuição Granular de Cestas do Colaborador
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
              {c.buckets.map(b => (
                <div key={b.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BUCKET_COLOR_MAP[b.id] }} />
                    <span className="text-[10px] font-black uppercase text-slate-800">{b.label}</span>
                  </div>
                  <p className="text-xl font-black text-slate-900">{b.rate.toFixed(1)}%</p>
                  <span className="text-[9px] text-slate-400 font-bold block">{b.count} cup ({b.pieces} pçs)</span>
                  <span className="text-[9px] text-slate-600 font-semibold block">{formatBRL(b.revenue)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. MAIOR CUPOM DO COLABORADOR COM BOTÃO DE INSPEÇÃO */}
          {c.topCouponDetails && (
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-black uppercase text-slate-900">
                    Maior Cupom Emitido pelo Vendedor: {c.topCouponDetails.itens_qtd} Peças ({formatBRL(c.topCouponDetails.vNF)})
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => onInspectCoupon(c.topCouponDetails!)}
                  className="h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Inspecionar Cupom & Lista de Itens
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-700 gap-2">
                <div>
                  <strong>NF:</strong> #{c.topCouponDetails.nf} | <strong>Data:</strong> {c.topCouponDetails.dateLabel} às {c.topCouponDetails.timeLabel}
                </div>
                <div>
                  <strong>Preço Médio por Peça:</strong> {formatBRL(c.topCouponDetails.avgPrice)}
                </div>
              </div>

              {/* Prévia dos primeiros itens */}
              {c.topCouponDetails.itensSample.length > 0 && (
                <div className="bg-white p-3 rounded-2xl border border-slate-200 text-xs space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Prévia dos Produtos Vendidos:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {c.topCouponDetails.itensSample.slice(0, 5).map((it, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px] font-medium bg-slate-50">
                        {it.qCom}x {it.xProd} ({formatBRL(it.vProd)})
                      </Badge>
                    ))}
                    {c.topCouponDetails.itensSample.length > 5 && (
                      <span className="text-[10px] text-slate-400 font-bold self-center">
                        +{c.topCouponDetails.itensSample.length - 5} outros itens...
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 pt-4 mt-4">
          <Button 
            variant="default" 
            onClick={onClose}
            className="h-9 px-6 rounded-xl font-bold text-xs bg-slate-900 text-white hover:bg-slate-800"
          >
            Fechar Detalhes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
