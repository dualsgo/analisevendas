"use client";

import React, { useMemo } from "react";
import { FullBasketQualityReport, CollaboratorBasketMetric } from "@/lib/basket-quality-analytics";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { 
  Split, 
  Layers, 
  ShoppingBag, 
  Scale, 
  TrendingUp, 
  Sparkles, 
  Target, 
  ShieldCheck, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Calculator
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MacroBasketSplitAnalysisProps {
  report: FullBasketQualityReport;
  onSelectCollaborator?: (collaborator: CollaboratorBasketMetric) => void;
}

export function MacroBasketSplitAnalysis({ 
  report, 
  onSelectCollaborator 
}: MacroBasketSplitAnalysisProps) {
  const { overall, collaborators } = report;
  const { macroSplit } = overall;
  const { upTo2Items, threePlusItems, paLeverageFrom3Plus } = macroSplit;

  const formatBRL = (val?: number | string | null) =>
    (Number(val) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Dados para Gráfico de Comparação de Macro-Divisão (Cupons, Peças, Receita)
  const comparisonBarData = useMemo(() => [
    {
      metric: "% do Fluxo (Cupons)",
      "Até 2 Itens (1 e 2 pçs)": Number(upTo2Items.cuponsRate.toFixed(1)),
      "De 3 para Cima (3+ pçs)": Number(threePlusItems.cuponsRate.toFixed(1))
    },
    {
      metric: "% do Volume (Peças)",
      "Até 2 Itens (1 e 2 pçs)": Number(upTo2Items.piecesRate.toFixed(1)),
      "De 3 para Cima (3+ pçs)": Number(threePlusItems.piecesRate.toFixed(1))
    },
    {
      metric: "% do Faturamento (R$)",
      "Até 2 Itens (1 e 2 pçs)": Number(upTo2Items.revenueRate.toFixed(1)),
      "De 3 para Cima (3+ pçs)": Number(threePlusItems.revenueRate.toFixed(1))
    }
  ], [upTo2Items, threePlusItems]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. CABEÇALHO EXECUTIVO DA MACRO-DIVISÃO */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-indigo-900/50 shadow-md space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Split className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                Divisão Estratégica da Cesta (Regional)
              </span>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Macro-Cisão de Vendas: Até 2 Itens vs. De 3 para Cima
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Auditoria de representatividade de faturamento, volume de atendimentos e alavancagem de PA para calibração de metas realistas.
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-right shrink-0">
            <span className="text-[10px] font-black uppercase text-indigo-300">Alavanca de PA de 3+ Itens</span>
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-2xl font-black text-emerald-400">+{paLeverageFrom3Plus.toFixed(2)}</span>
              <span className="text-xs font-bold text-slate-300">pontos no PA</span>
            </div>
            <span className="text-[9px] text-slate-300">De {upTo2Items.pa.toFixed(2)} → {overall.paReal.toFixed(2)} PA Geral</span>
          </div>
        </div>
      </div>

      {/* 2. TOP MACRO CARDS: BLOCO ATÉ 2 ITENS vs BLOCO DE 3 PARA CIMA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BLOCO 1: ATÉ 2 ITENS (1 E 2 PEÇAS) */}
        <Card className="ri-card p-6 border-slate-200 bg-white space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm">
                ≤2
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Vendas Até 2 Itens (1 e 2 Peças)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Núcleo de rotina e balcão rápido (Monopeça + 1º Nível de Casada).
                </p>
              </div>
            </div>
            <Badge className="bg-blue-600 text-white font-black text-[10px] uppercase">
              {upTo2Items.cuponsRate.toFixed(1)}% do Fluxo
            </Badge>
          </div>

          {/* KPIs Principais do Bloco Até 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-400">Faturamento Líquido</span>
              <p className="text-lg font-black text-slate-900">{formatBRL(upTo2Items.revenue)}</p>
              <Badge variant="outline" className="text-[9px] font-bold border-blue-200 text-blue-700 bg-blue-50">
                {upTo2Items.revenueRate.toFixed(1)}% da Receita da Loja
              </Badge>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-400">Cupons (Atendimentos)</span>
              <p className="text-lg font-black text-blue-600">{(upTo2Items.cupons ?? 0).toLocaleString("pt-BR")}</p>
              <span className="text-[10px] text-slate-500 font-bold">
                {(upTo2Items.cuponsRate ?? 0).toFixed(1)}% dos clientes
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-0.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-black uppercase text-slate-400">Peças Vendidas</span>
              <p className="text-lg font-black text-slate-900">{(upTo2Items.pieces ?? 0).toLocaleString("pt-BR")}</p>
              <span className="text-[10px] text-slate-500 font-bold">
                {(upTo2Items.piecesRate ?? 0).toFixed(1)}% do total
              </span>
            </div>
          </div>

          {/* Métricas Derivadas: PA, TKM e PM */}
          <div className="grid grid-cols-3 gap-2 bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100 text-center">
            <div>
              <span className="text-[9px] font-black uppercase text-blue-700">PA Real do Bloco</span>
              <p className="text-xl font-black text-blue-900">{upTo2Items.pa.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-blue-700">Ticket Médio (TKM)</span>
              <p className="text-sm font-black text-blue-900">{formatBRL(upTo2Items.tkm)}</p>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-blue-700">Preço Médio Peça</span>
              <p className="text-sm font-black text-blue-900">{formatBRL(upTo2Items.pmMedio)}</p>
            </div>
          </div>

          {/* Subdivisão Interna: 1 Item vs 2 Itens */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Composição Interna do Bloco Até 2 Itens
            </span>

            <div className="space-y-2.5">
              {/* 1 Item */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-rose-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    1 Item (Monopeça): {upTo2Items.oneItem.cuponsRate.toFixed(1)}% dos cupons
                  </span>
                  <span className="text-slate-900 font-black">{formatBRL(upTo2Items.oneItem.revenue)} ({upTo2Items.oneItem.revenueRate.toFixed(1)}% receita)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${upTo2Items.oneItem.cuponsRate}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>{upTo2Items.oneItem.cupons} cupons emitidos</span>
                  <span>{upTo2Items.oneItem.pieces} peças</span>
                </div>
              </div>

              {/* 2 Itens */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-blue-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    2 Itens (Venda Casada): {upTo2Items.twoItems.cuponsRate.toFixed(1)}% dos cupons
                  </span>
                  <span className="text-slate-900 font-black">{formatBRL(upTo2Items.twoItems.revenue)} ({upTo2Items.twoItems.revenueRate.toFixed(1)}% receita)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${upTo2Items.twoItems.cuponsRate}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>{upTo2Items.twoItems.cupons} cupons emitidos</span>
                  <span>{upTo2Items.twoItems.pieces} peças</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* BLOCO 2: DE 3 PARA CIMA (3+ PEÇAS) */}
        <Card className="ri-card p-6 border-slate-200 bg-white space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm">
                3+
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Vendas De 3 para Cima (3+ Peças)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Cestas profundas, combos de look e alto volume de compra.
                </p>
              </div>
            </div>
            <Badge className="bg-purple-600 text-white font-black text-[10px] uppercase">
              {threePlusItems.cuponsRate.toFixed(1)}% do Fluxo
            </Badge>
          </div>

          {/* KPIs Principais do Bloco 3+ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-400">Faturamento Líquido</span>
              <p className="text-lg font-black text-slate-900">{formatBRL(threePlusItems.revenue)}</p>
              <Badge variant="outline" className="text-[9px] font-bold border-purple-200 text-purple-700 bg-purple-50">
                {threePlusItems.revenueRate.toFixed(1)}% da Receita da Loja
              </Badge>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-400">Cupons (Atendimentos)</span>
              <p className="text-lg font-black text-purple-600">{(threePlusItems.cupons ?? 0).toLocaleString("pt-BR")}</p>
              <span className="text-[10px] text-slate-500 font-bold">
                {(threePlusItems.cuponsRate ?? 0).toFixed(1)}% dos clientes
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-0.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-black uppercase text-slate-400">Peças Vendidas</span>
              <p className="text-lg font-black text-slate-900">{(threePlusItems.pieces ?? 0).toLocaleString("pt-BR")}</p>
              <span className="text-[10px] text-slate-500 font-bold">
                {(threePlusItems.piecesRate ?? 0).toFixed(1)}% do total
              </span>
            </div>
          </div>

          {/* Métricas Derivadas: PA, TKM e PM */}
          <div className="grid grid-cols-3 gap-2 bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100 text-center">
            <div>
              <span className="text-[9px] font-black uppercase text-purple-700">PA Real do Bloco</span>
              <p className="text-xl font-black text-purple-900">{threePlusItems.pa.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-purple-700">Ticket Médio (TKM)</span>
              <p className="text-sm font-black text-purple-900">{formatBRL(threePlusItems.tkm)}</p>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-purple-700">Preço Médio Peça</span>
              <p className="text-sm font-black text-purple-900">{formatBRL(threePlusItems.pmMedio)}</p>
            </div>
          </div>

          {/* Subdivisão Interna: 3 Itens vs 4-5 Itens vs 6+ Itens */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Composição Interna do Bloco 3+ Itens
            </span>

            <div className="space-y-2.5">
              {/* 3 Itens */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-indigo-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    3 Itens (Consultiva): {threePlusItems.threeItems.cuponsRate.toFixed(1)}% cupons
                  </span>
                  <span className="text-slate-900 font-black">{formatBRL(threePlusItems.threeItems.revenue)} ({threePlusItems.threeItems.revenueRate.toFixed(1)}% rec.)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${threePlusItems.threeItems.cuponsRate * 3}%` }} />
                </div>
              </div>

              {/* 4-5 Itens */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-purple-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    4 a 5 Itens (Alto Volume): {threePlusItems.fourToFive.cuponsRate.toFixed(1)}% cupons
                  </span>
                  <span className="text-slate-900 font-black">{formatBRL(threePlusItems.fourToFive.revenue)} ({threePlusItems.fourToFive.revenueRate.toFixed(1)}% rec.)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${threePlusItems.fourToFive.cuponsRate * 3}%` }} />
                </div>
              </div>

              {/* 6+ Itens */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-amber-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    6+ Itens (Super Cestas): {threePlusItems.sixPlus.cuponsRate.toFixed(1)}% cupons
                  </span>
                  <span className="text-slate-900 font-black">{formatBRL(threePlusItems.sixPlus.revenue)} ({threePlusItems.sixPlus.revenueRate.toFixed(1)}% rec.)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${threePlusItems.sixPlus.cuponsRate * 3}%` }} />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. QUADRO EXECUTIVO DE ANÁLISE DE REALISMO PARA A REGIONAL */}
      <Card className="ri-card p-6 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 border-indigo-200 space-y-4 shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
          <Target className="w-5 h-5 text-indigo-600" />
          <div>
            <h4 className="text-sm font-black uppercase text-slate-900">
              Parecer Técnico & Realismo de Metas para a Regional
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Por que a regional discute tanto o PA de 2 e o PA de 3, e onde está a verdadeira alavanca da loja.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed text-slate-700">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-black uppercase text-blue-700 block">
              1. Por que o foco em até 2 itens é vital?
            </span>
            <p>
              As vendas de até 2 itens respondem por <strong>{upTo2Items.revenueRate.toFixed(1)}% do faturamento</strong> e <strong>{upTo2Items.cuponsRate.toFixed(1)}% de todos os clientes atendidos</strong>.
            </p>
            <p className="text-[11px] text-slate-500">
              Se a equipe não converter o 2º item no balcão, a monopeça explode e a meta de receita fica comprometida, pois a base da loja vive desse fluxo.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-black uppercase text-purple-700 block">
              2. Qual o real papel de 3+ itens?
            </span>
            <p>
              O bloco de 3+ peças representa <strong>apenas {threePlusItems.cuponsRate.toFixed(1)}% dos atendimentos</strong>, mas entrega <strong>{threePlusItems.revenueRate.toFixed(1)}% da receita</strong> da loja com PA médio de {threePlusItems.pa.toFixed(2)}.
            </p>
            <p className="text-[11px] text-slate-500">
              É este bloco que alavanca o PA geral da loja em <strong>+{paLeverageFrom3Plus.toFixed(2)} pontos</strong> acima do PA do balcão ({upTo2Items.pa.toFixed(2)} → {overall.paReal.toFixed(2)}).
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-black uppercase text-emerald-700 block">
              3. Metas Realistas Recomendadas
            </span>
            <ul className="space-y-1 text-[11px] text-slate-700">
              <li>• <strong>1 Item:</strong> Meta ≤ 55% (Meta Ouro ≤ 50%)</li>
              <li>• <strong>2 Itens:</strong> Meta ≥ 28% (Meta Ouro ≥ 30%)</li>
              <li>• <strong>3+ Itens:</strong> Saldo sustentado de ≥ 17%</li>
            </ul>
            <p className="text-[11px] text-emerald-800 font-bold pt-1 border-t border-slate-100">
              ✓ Equilíbrio comprovado pelo histórico de 8 meses de vendas reais.
            </p>
          </div>
        </div>
      </Card>

      {/* 4. TABELA DE COLABORADORES: PARTICIPAÇÃO ATÉ 2 ITENS VS 3+ ITENS */}
      <Card className="ri-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Participação Macro por Colaborador: Até 2 Itens vs. 3+ Itens
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Veja qual percentual da receita e dos atendimentos de cada vendedor vem de vendas rápidas (≤2) vs vendas profundas (3+).
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="h-10">
                <TableHead className="text-[10px] font-black uppercase text-slate-600">Vendedor</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Cupons Totais</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-blue-700 text-center">% Cupons (≤2)</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-blue-700 text-center">% Receita (≤2)</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-blue-700 text-center">PA (≤2 pçs)</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-purple-700 text-center">% Cupons (3+)</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-purple-700 text-center">% Receita (3+)</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-purple-700 text-center">PA (3+ pçs)</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-emerald-700 text-center">PA Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collaborators.map(c => {
                const cSplit = c.macroSplit;
                return (
                  <TableRow 
                    key={c.name} 
                    className="h-11 hover:bg-slate-50/80 cursor-pointer"
                    onClick={() => onSelectCollaborator && onSelectCollaborator(c)}
                  >
                    <TableCell className="font-black text-slate-900 text-xs uppercase">
                      {c.name}
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-700">{c.totalCupons}</TableCell>
                    
                    {/* Bloco Até 2 Itens */}
                    <TableCell className={cn("text-center font-bold text-xs", cSplit.upTo2Items.cuponsRate > 85 ? "text-rose-600 font-black" : "text-blue-700")}>
                      {cSplit.upTo2Items.cuponsRate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center font-semibold text-xs text-blue-800">
                      {cSplit.upTo2Items.revenueRate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs text-slate-700">
                      {cSplit.upTo2Items.pa.toFixed(2)}
                    </TableCell>

                    {/* Bloco 3+ Itens */}
                    <TableCell className={cn("text-center font-bold text-xs", cSplit.threePlusItems.cuponsRate >= 17 ? "text-purple-700 font-black" : "text-slate-600")}>
                      {cSplit.threePlusItems.cuponsRate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center font-black text-xs text-purple-700">
                      {cSplit.threePlusItems.revenueRate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs text-purple-900">
                      {cSplit.threePlusItems.pa.toFixed(2)}
                    </TableCell>

                    {/* PA Total */}
                    <TableCell className="text-center font-black text-emerald-700 text-sm">
                      {c.paReal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
