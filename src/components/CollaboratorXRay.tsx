"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  Cell, 
  AreaChart, 
  Area
} from "recharts";
import { 
  UserCheck, 
  TrendingUp, 
  Search, 
  Clock, 
  Calendar as CalendarIcon, 
  ShoppingBag, 
  Sparkles, 
  ArrowRightLeft, 
  DollarSign, 
  Users, 
  Lightbulb,
  CheckCircle2, 
  Package,
  Layers
} from "lucide-react";
import { parseISO, getHours, getDay } from "date-fns";
import { cn } from "@/lib/utils";

interface CollaboratorXRayProps {
  data: DetailedSaleRow[];
  vinculos?: VinculoTroca[];
}

const DAYS_NAME = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CollaboratorXRay({ data = [], vinculos = [] }: CollaboratorXRayProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string>("");

  // Vendas válidas ativas de saída
  const activeSales = useMemo(() => {
    return data.filter(s => s.tpNF === 1 && !s.is_cancelada);
  }, [data]);

  // Lista de todos os colaboradores ativos com estatísticas resumidas
  const vendorSummaryList = useMemo(() => {
    const map = new Map<string, { name: string; venda: number; cupons: number; itens: number }>();
    
    activeSales.forEach(s => {
      const v = s.vendedor?.trim() || "NÃO IDENTIFICADO";
      const val = parseFloat(s.vNF) || 0;
      const itens = parseFloat(s.itens_qtd) || 0;
      
      const current = map.get(v) || { name: v, venda: 0, cupons: 0, itens: 0 };
      current.venda += val;
      current.cupons += 1;
      current.itens += itens;
      map.set(v, current);
    });

    return Array.from(map.values())
      .filter(v => v.name !== "NÃO IDENTIFICADO")
      .sort((a, b) => b.venda - a.venda);
  }, [activeSales]);

  // Seleção padrão do primeiro vendedor se nenhum estiver selecionado
  React.useEffect(() => {
    if (!selectedVendor && vendorSummaryList.length > 0) {
      setSelectedVendor(vendorSummaryList[0].name);
    }
  }, [vendorSummaryList, selectedVendor]);

  // Métricas Globais da Loja (Benchmarking)
  const storeMetrics = useMemo(() => {
    const totalVenda = activeSales.reduce((acc, s) => acc + (parseFloat(s.vNF) || 0), 0);
    const totalCupons = activeSales.length;
    const totalItens = activeSales.reduce((acc, s) => acc + (parseFloat(s.itens_qtd) || 0), 0);
    const totalCPF = activeSales.filter(s => s.cpf_cnpj_dest && s.cpf_cnpj_dest.trim() !== "").length;
    const totalDesconto = activeSales.reduce((acc, s) => acc + (parseFloat(s.desconto_total) || 0), 0);

    const numVendors = vendorSummaryList.length || 1;
    const topVendor = vendorSummaryList[0] || { name: "N/A", venda: 0, cupons: 0, itens: 0 };

    const topVendorSales = activeSales.filter(s => (s.vendedor?.trim() || "") === topVendor.name);
    const topVendorCPF = topVendorSales.filter(s => s.cpf_cnpj_dest && s.cpf_cnpj_dest.trim() !== "").length;

    return {
      totalVenda,
      totalCupons,
      totalItens,
      avgVendaPerVendor: totalVenda / numVendors,
      avgCuponsPerVendor: totalCupons / numVendors,
      tkmLoja: totalCupons > 0 ? totalVenda / totalCupons : 0,
      paLoja: totalCupons > 0 ? totalItens / totalCupons : 0,
      cpfRateLoja: totalCupons > 0 ? (totalCPF / totalCupons) * 100 : 0,
      descontoRateLoja: totalVenda > 0 ? (totalDesconto / (totalVenda + totalDesconto)) * 100 : 0,
      
      // Top performer metrics
      topVendorName: topVendor.name,
      topVendorTkm: topVendor.cupons > 0 ? topVendor.venda / topVendor.cupons : 0,
      topVendorPa: topVendor.cupons > 0 ? topVendor.itens / topVendor.cupons : 0,
      topVendorCpfRate: topVendor.cupons > 0 ? (topVendorCPF / topVendor.cupons) * 100 : 0,
    };
  }, [activeSales, vendorSummaryList]);

  // Vendas do Colaborador Selecionado
  const vendorSales = useMemo(() => {
    if (!selectedVendor) return [];
    return activeSales.filter(s => (s.vendedor?.trim() || "") === selectedVendor);
  }, [activeSales, selectedVendor]);

  // Vínculos de Troca do Colaborador Selecionado
  const vendorVinculos = useMemo(() => {
    if (!selectedVendor || !vinculos) return [];
    return vinculos.filter(v => (v.vendedor?.trim() || "") === selectedVendor);
  }, [vinculos, selectedVendor]);

  // Métricas Consolidadas do Colaborador Selecionado
  const vendorMetrics = useMemo(() => {
    if (vendorSales.length === 0) {
      return {
        vendaTotal: 0,
        cuponsTotal: 0,
        itensTotal: 0,
        tkm: 0,
        pa: 0,
        cpfRate: 0,
        descontoTotal: 0,
        descontoPercent: 0,
        vendasComDescontoCount: 0,
        shareLoja: 0,
        trocasCount: 0,
        trocasValorDiferenca: 0,
        trocasPositivasCount: 0,
        trocasSecasCount: 0,
        trocasScoreMedio: 0,
        precoMedioItem: 0
      };
    }

    const vendaTotal = vendorSales.reduce((acc, s) => acc + (parseFloat(s.vNF) || 0), 0);
    const cuponsTotal = vendorSales.length;
    const itensTotal = vendorSales.reduce((acc, s) => acc + (parseFloat(s.itens_qtd) || 0), 0);
    const cpfCount = vendorSales.filter(s => s.cpf_cnpj_dest && s.cpf_cnpj_dest.trim() !== "").length;
    
    const descontoTotal = vendorSales.reduce((acc, s) => acc + (parseFloat(s.desconto_total) || 0), 0);
    const vendasComDescontoCount = vendorSales.filter(s => (parseFloat(s.desconto_total) || 0) > 0.05).length;
    
    const tkm = cuponsTotal > 0 ? vendaTotal / cuponsTotal : 0;
    const pa = cuponsTotal > 0 ? itensTotal / cuponsTotal : 0;
    const cpfRate = cuponsTotal > 0 ? (cpfCount / cuponsTotal) * 100 : 0;
    const descontoPercent = (vendaTotal + descontoTotal) > 0 ? (descontoTotal / (vendaTotal + descontoTotal)) * 100 : 0;
    const shareLoja = storeMetrics.totalVenda > 0 ? (vendaTotal / storeMetrics.totalVenda) * 100 : 0;
    const precoMedioItem = itensTotal > 0 ? vendaTotal / itensTotal : 0;

    // Dados de Troca
    const trocasCount = vendorVinculos.length;
    const trocasValorDiferenca = vendorVinculos.reduce((acc, v) => acc + v.valor_diferenca, 0);
    const trocasPositivasCount = vendorVinculos.filter(v => v.valor_diferenca > 0.05).length;
    const trocasSecasCount = vendorVinculos.filter(v => v.valor_diferenca <= 0.05).length;
    const trocasScoreMedio = trocasCount > 0 
      ? vendorVinculos.reduce((acc, v) => acc + (v.score_qualidade || 0), 0) / trocasCount 
      : 0;

    return {
      vendaTotal,
      cuponsTotal,
      itensTotal,
      tkm,
      pa,
      cpfRate,
      descontoTotal,
      descontoPercent,
      vendasComDescontoCount,
      shareLoja,
      trocasCount,
      trocasValorDiferenca,
      trocasPositivasCount,
      trocasSecasCount,
      trocasScoreMedio,
      precoMedioItem
    };
  }, [vendorSales, vendorVinculos, storeMetrics.totalVenda]);

  // Distribuição de Cesta de Compras (Cupons por número de itens)
  const basketBreakdown = useMemo(() => {
    let count1 = 0; // Mono-item
    let count2 = 0; // 2 Itens
    let count34 = 0; // 3-4 Itens
    let count5plus = 0; // 5+ Itens

    vendorSales.forEach(s => {
      const q = parseFloat(s.itens_qtd) || 0;
      if (q <= 1) count1++;
      else if (q === 2) count2++;
      else if (q >= 3 && q <= 4) count34++;
      else count5plus++;
    });

    const total = vendorSales.length || 1;

    return [
      { name: "1 Item (Mono-item)", count: count1, percent: (count1 / total) * 100, color: "#f43f5e", tip: "Oportunidade imediata de venda sugestiva" },
      { name: "2 Itens", count: count2, percent: (count2 / total) * 100, color: "#f59e0b", tip: "Conversão básica de adicional efetuada" },
      { name: "3 a 4 Itens", count: count34, percent: (count34 / total) * 100, color: "#3b82f6", tip: "Boa profundidade de cesta" },
      { name: "5+ Itens (Super Cestas)", count: count5plus, percent: (count5plus / total) * 100, color: "#10b981", tip: "Excelente recomendação e cross-selling" },
    ];
  }, [vendorSales]);

  // Análise por Horário do Dia (08h às 22h)
  const hourlyData = useMemo(() => {
    const hoursMap: Record<number, { hour: string; faturamento: number; cupons: number; itens: number }> = {};
    for (let h = 8; h <= 21; h++) {
      hoursMap[h] = { hour: `${h.toString().padStart(2, '0')}h`, faturamento: 0, cupons: 0, itens: 0 };
    }

    vendorSales.forEach(s => {
      if (!s.dhEmi) return;
      try {
        const d = parseISO(s.dhEmi);
        const h = getHours(d);
        if (hoursMap[h]) {
          hoursMap[h].faturamento += parseFloat(s.vNF) || 0;
          hoursMap[h].cupons += 1;
          hoursMap[h].itens += parseFloat(s.itens_qtd) || 0;
        }
      } catch (e) {}
    });

    return Object.values(hoursMap);
  }, [vendorSales]);

  // Hora de Ouro & Hora de Maior PA
  const peakHoursInfo = useMemo(() => {
    let topHourFat = hourlyData[0];
    let topHourPA = hourlyData[0];
    let maxFat = -1;
    let maxPA = -1;

    hourlyData.forEach(h => {
      if (h.faturamento > maxFat) {
        maxFat = h.faturamento;
        topHourFat = h;
      }
      const pa = h.cupons > 0 ? h.itens / h.cupons : 0;
      if (pa > maxPA && h.cupons >= 2) {
        maxPA = pa;
        topHourPA = h;
      }
    });

    return {
      goldHour: topHourFat ? topHourFat.hour : "N/A",
      goldHourFat: maxFat > 0 ? maxFat : 0,
      bestPaHour: topHourPA ? topHourPA.hour : "N/A",
      bestPaValue: maxPA > 0 ? maxPA : 0,
    };
  }, [hourlyData]);

  // Análise por Dia da Semana
  const weeklyData = useMemo(() => {
    const daysArr = DAYS_SHORT.map((day, idx) => ({
      day,
      fullName: DAYS_NAME[idx],
      faturamento: 0,
      cupons: 0,
      itens: 0,
    }));

    vendorSales.forEach(s => {
      if (!s.dhEmi) return;
      try {
        const d = parseISO(s.dhEmi);
        const dayIdx = getDay(d);
        if (daysArr[dayIdx]) {
          daysArr[dayIdx].faturamento += parseFloat(s.vNF) || 0;
          daysArr[dayIdx].cupons += 1;
          daysArr[dayIdx].itens += parseFloat(s.itens_qtd) || 0;
        }
      } catch (e) {}
    });

    return daysArr;
  }, [vendorSales]);

  // Top 5 Produtos mais vendidos pelo colaborador
  const topProducts = useMemo(() => {
    const itemsMap = new Map<string, { code: string; name: string; qtd: number; valor: number }>();
    
    vendorSales.forEach(s => {
      s.itens?.forEach(item => {
        if (!item.cProd) return;
        const code = item.cProd;
        const name = item.xProd || "Produto sem descrição";
        const q = item.qCom || 1;
        const v = item.vProd || 0;

        const curr = itemsMap.get(code) || { code, name, qtd: 0, valor: 0 };
        curr.qtd += q;
        curr.valor += v;
        itemsMap.set(code, curr);
      });
    });

    return Array.from(itemsMap.values())
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [vendorSales]);

  // Projeção Financeira de Oportunidade (Ganho em R$)
  const financialProjections = useMemo(() => {
    const { cuponsTotal, tkm, pa, precoMedioItem } = vendorMetrics;
    const { tkmLoja, paLoja, topVendorTkm } = storeMetrics;

    // 1. Ganho se o TKM atingisse a Média da Loja
    const deltaTkmLoja = Math.max(0, tkmLoja - tkm);
    const ganhoTkmLoja = deltaTkmLoja * cuponsTotal;

    // 2. Ganho se o TKM atingisse o Top Performer
    const deltaTkmTop = Math.max(0, topVendorTkm - tkm);
    const ganhoTkmTop = deltaTkmTop * cuponsTotal;

    // 3. Peças e Faturamento Adicional se o PA atingisse a Média da Loja
    const deltaPaLoja = Math.max(0, paLoja - pa);
    const pecasAdicionaisLoja = deltaPaLoja * cuponsTotal;
    const ganhoPaLoja = pecasAdicionaisLoja * precoMedioItem;

    // 4. Ganho convertendo 30% dos cupons mono-item (1 item) para 2 itens
    const monoItemCount = basketBreakdown[0].count;
    const monoConvertedCount = Math.round(monoItemCount * 0.3);
    const ganhoConversaoMono = monoConvertedCount * precoMedioItem;

    // Potencial Total de Ganho Combinado Realista
    const potencialTotal = Math.max(ganhoTkmLoja, ganhoPaLoja) + ganhoConversaoMono;

    return {
      ganhoTkmLoja,
      ganhoTkmTop,
      pecasAdicionaisLoja: Math.round(pecasAdicionaisLoja),
      ganhoPaLoja,
      monoConvertedCount,
      ganhoConversaoMono,
      potencialTotal
    };
  }, [vendorMetrics, storeMetrics, basketBreakdown]);

  // Perfil Comportamental Diagnóstico
  const behavioralDiagnosis = useMemo(() => {
    const { tkm, pa, cpfRate, descontoPercent, trocasCount, trocasPositivasCount } = vendorMetrics;
    const { tkmLoja, paLoja, cpfRateLoja } = storeMetrics;
    const monoPercent = basketBreakdown[0].percent;

    let perfilTitle = "Atendente Padrão";
    let perfilDesc = "Desempenho equilibrado na média geral da equipe.";
    let badgeColor = "bg-blue-50 text-blue-700 border-blue-200";

    if (pa >= paLoja * 1.15 && monoPercent < 35) {
      perfilTitle = "Especialista em Cross-Selling";
      perfilDesc = "Excelente capacidade de vender itens adicionais e montar cestas completas.";
      badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (tkm >= tkmLoja * 1.2) {
      perfilTitle = "Fechador de Alto Valor";
      perfilDesc = "Foco em produtos de ticket elevado e vendas de maior margem.";
      badgeColor = "bg-purple-50 text-purple-700 border-purple-200";
    } else if (monoPercent >= 55) {
      perfilTitle = "Atendente de Transação Única";
      perfilDesc = "Alto índice de cupons de 1 item. Necessita de estímulo para venda sugestiva.";
      badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
    } else if (trocasCount > 5 && (trocasPositivasCount / trocasCount) >= 0.6) {
      perfilTitle = "Campeão de Upsell em Trocas";
      perfilDesc = "Transforma trocas simples em oportunidade de vendas adicionais de valor.";
      badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
    }

    // Ações recomendadas de treinamento
    const recommendations: string[] = [];
    if (monoPercent > 40) {
      recommendations.push("Oferecer treinamento prático em Venda Sugestiva (SLP) para reduzir os cupons de 1 item.");
    }
    if (cpfRate < cpfRateLoja) {
      recommendations.push(`Reforçar a abordagem no caixa para aumentar o cadastro de CPF (Atual: ${cpfRate.toFixed(1)}% vs Média: ${cpfRateLoja.toFixed(1)}%).`);
    }
    if (pa < paLoja) {
      recommendations.push(`Trabalhar técnicas de cross-selling no balcão para elevar o PA da média de ${pa.toFixed(2)} para ${paLoja.toFixed(2)}.`);
    }
    if (descontoPercent > storeMetrics.descontoRateLoja * 1.3) {
      recommendations.push("Monitorar concessão excessiva de descontos e orientar sobre valor percebido.");
    }

    if (recommendations.length === 0) {
      recommendations.push("Manter o excelente padrão de atendimento e servir como referência para a equipe.");
    }

    return {
      perfilTitle,
      perfilDesc,
      badgeColor,
      recommendations
    };
  }, [vendorMetrics, storeMetrics, basketBreakdown]);

  return (
    <div className="space-y-6 pb-12">
      {/* SELETOR SUPERIOR DE COLABORADOR */}
      <Card className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-none shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
        <CardContent className="p-6 md:p-8 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                Diagnóstico Individual 360°
              </div>
              <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-white tracking-tight">
                Raio-X do Colaborador
              </h2>
              <p className="text-slate-300 text-xs md:text-sm max-w-xl font-medium">
                Selecione um colaborador para explorar o perfil completo de produtividade, ritmia de horário, análise de cesta e potencial financeiro.
              </p>
            </div>

            {/* SELETOR COM BUSCA */}
            <div className="w-full lg:w-80 space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Colaborador Selecionado:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="w-full bg-slate-800/90 text-white border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  {vendorSummaryList.map(v => (
                    <option key={v.name} value={v.name}>
                      {v.name} • {v.venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({v.cupons} cupons)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HEADER DE INDICADORES DO COLABORADOR COM COMPARATIVO (BENCHMARKING) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: VENDA TOTAL & SHARE */}
        <Card className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs hover:shadow-md transition-all">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faturamento Total</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-headline font-extrabold text-slate-900">
                {vendorMetrics.vendaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                <span>Participação na Loja:</span>
                <span className="font-bold text-indigo-600">{vendorMetrics.shareLoja.toFixed(1)}%</span>
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex items-center justify-between">
              <span>Média da Loja:</span>
              <span className="font-bold text-slate-700">{storeMetrics.avgVendaPerVendor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: TICKET MÉDIO (TKM) VS LOJA E LÍDER */}
        <Card className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs hover:shadow-md transition-all">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket Médio (TKM)</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-headline font-extrabold text-slate-900">
                  {vendorMetrics.tkm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h3>
                {vendorMetrics.tkm >= storeMetrics.tkmLoja ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                    + {(((vendorMetrics.tkm - storeMetrics.tkmLoja) / (storeMetrics.tkmLoja || 1)) * 100).toFixed(0)}% vs Média
                  </Badge>
                ) : (
                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                    {(((vendorMetrics.tkm - storeMetrics.tkmLoja) / (storeMetrics.tkmLoja || 1)) * 100).toFixed(0)}% vs Média
                  </Badge>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                {vendorMetrics.cuponsTotal} atendimentos realizados
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex items-center justify-between">
              <span>Líder da Loja:</span>
              <span className="font-bold text-slate-700">{storeMetrics.topVendorTkm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: PEÇAS POR ATENDIMENTO (PA) */}
        <Card className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs hover:shadow-md transition-all">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Peças por Atendimento (PA)</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-headline font-extrabold text-slate-900">
                  {vendorMetrics.pa.toFixed(2)}
                </h3>
                {vendorMetrics.pa >= storeMetrics.paLoja ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                    Acima da Média ({storeMetrics.paLoja.toFixed(2)})
                  </Badge>
                ) : (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                    Abaixo da Média ({storeMetrics.paLoja.toFixed(2)})
                  </Badge>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Total de {vendorMetrics.itensTotal} itens vendidos
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex items-center justify-between">
              <span>Líder da Loja:</span>
              <span className="font-bold text-slate-700">{storeMetrics.topVendorPa.toFixed(2)} PA</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: CAPTURA DE CPF & FIDELIDADE */}
        <Card className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs hover:shadow-md transition-all">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Captura de CPF</span>
              <div className="p-2 bg-violet-50 text-violet-600 rounded-xl">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-headline font-extrabold text-slate-900">
                  {vendorMetrics.cpfRate.toFixed(1)}%
                </h3>
                <span className="text-xs font-semibold text-slate-500">dos cupons</span>
              </div>
              <Progress value={vendorMetrics.cpfRate} className="h-2 mt-2 bg-slate-100" />
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex items-center justify-between">
              <span>Média da Loja:</span>
              <span className="font-bold text-slate-700">{storeMetrics.cpfRateLoja.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BLOCO DE GANHO DE OPORTUNIDADE FINANCEIRA PROJETADA */}
      <Card className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white border-none shadow-lg overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold uppercase tracking-wider border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Potencial Financeiro Destravável
              </div>
              <h3 className="text-xl md:text-2xl font-headline font-extrabold text-white">
                Projeção de Faturamento Adicional
              </h3>
              <p className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed">
                Estimativa financeira calculada com base na equiparação das métricas do colaborador ({selectedVendor}) aos padrões da loja e conversão de cupons mono-item.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-right min-w-[280px]">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block mb-1">
                Ganho Potencial Combinado
              </span>
              <div className="text-3xl md:text-4xl font-headline font-extrabold text-emerald-400">
                + {financialProjections.potencialTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <span className="text-[11px] font-medium text-slate-300 block mt-1">
                Com a mesma quantidade de clientes atendidos
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Se TKM atingisse a Média da Loja:</span>
              <p className="text-lg font-bold text-white">
                + {financialProjections.ganhoTkmLoja.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                (Diferença de TKM: R$ {Math.max(0, storeMetrics.tkmLoja - vendorMetrics.tkm).toFixed(2)})
              </span>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Se PA atingisse a Média da Loja:</span>
              <p className="text-lg font-bold text-white">
                + {financialProjections.ganhoPaLoja.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                (+ {financialProjections.pecasAdicionaisLoja} peças vendidas nos mesmos cupons)
              </span>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Convertendo 30% dos Cupons 1 Item:</span>
              <p className="text-lg font-bold text-white">
                + {financialProjections.ganhoConversaoMono.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                ({financialProjections.monoConvertedCount} atendimentos de 1 item transformados em 2 itens)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 1: DISTRIBUIÇÃO DA CESTA DE COMPRAS & QUALIDADE DE TROCAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* DISTRIBUIÇÃO DE ITENS POR CUPOM (MONO-ITEM VS SUPER CESTAS) */}
        <Card className="lg:col-span-7 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <CardHeader>
            <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Distribuição do Tamanho de Cesta (Cupons por Qtd de Itens)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Análise de profundidade de atendimento do colaborador e penetração de vendas adicionais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {basketBreakdown.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 block truncate">{item.name}</span>
                  <div className="text-xl font-headline font-extrabold text-slate-900">
                    {item.count} <span className="text-xs font-semibold text-slate-400">({item.percent.toFixed(1)}%)</span>
                  </div>
                  <Progress value={item.percent} className="h-1.5 bg-slate-200" />
                </div>
              ))}
            </div>

            {/* GRÁFICO RECHARTS DE BARRA DE CESTA */}
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={basketBreakdown} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fontWeight: 600 }} />
                  <RechartsTooltip 
                    formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Proporção']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  />
                  <Bar dataKey="percent" radius={[0, 8, 8, 0]} barSize={24}>
                    {basketBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ANÁLISE DETALHADA E QUALIDADE DE TROCAS */}
        <Card className="lg:col-span-5 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <CardHeader>
            <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-amber-600" />
              Qualidade & Desempenho em Trocas
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Métricas de conversão de trocas em vendas adicionais (Upsell).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-amber-800 tracking-wider">Total de Trocas</span>
                <h4 className="text-2xl font-headline font-extrabold text-amber-900 mt-0.5">
                  {vendorMetrics.trocasCount} trocas
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold uppercase text-amber-800 tracking-wider">Diferença Gerada (R$)</span>
                <h4 className={cn("text-xl font-headline font-extrabold mt-0.5", vendorMetrics.trocasValorDiferenca >= 0 ? "text-emerald-700" : "text-rose-700")}>
                  {vendorMetrics.trocasValorDiferenca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h4>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Trocas com Diferença Positiva (Upsell):
                </span>
                <span className="font-extrabold text-slate-900">
                  {vendorMetrics.trocasPositivasCount} ({vendorMetrics.trocasCount > 0 ? ((vendorMetrics.trocasPositivasCount / vendorMetrics.trocasCount) * 100).toFixed(0) : 0}%)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  Trocas Secas (Sem Ganho Adicional):
                </span>
                <span className="font-extrabold text-slate-900">
                  {vendorMetrics.trocasSecasCount} ({vendorMetrics.trocasCount > 0 ? ((vendorMetrics.trocasSecasCount / vendorMetrics.trocasCount) * 100).toFixed(0) : 0}%)
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">Score de Qualidade das Trocas:</span>
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold">
                  {vendorMetrics.trocasScoreMedio > 0 ? `${vendorMetrics.trocasScoreMedio.toFixed(1)} / 100` : "Sem trocas registradas"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO 2: RITMIA TEMPORAL (HORÁRIOS E DIAS MAIS PRODUTIVOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GRÁFICO POR HORA DO DIA */}
        <Card className="lg:col-span-8 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                Vendas por Horário do Dia (08h às 21h)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Curva de produtividade horária do colaborador selecionado.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Hora de Ouro (Maior Venda):</span>
                <span className="font-extrabold text-indigo-700">{peakHoursInfo.goldHour} ({peakHoursInfo.goldHourFat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} />
                  <RechartsTooltip 
                    formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Faturamento']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  />
                  <Area type="monotone" dataKey="faturamento" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorFaturamento)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* VENDAS POR DIA DA SEMANA */}
        <Card className="lg:col-span-4 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <CardHeader>
            <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600" />
              Desempenho por Dia da Semana
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Distribuição semanal de faturamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 10 }} />
                  <RechartsTooltip 
                    formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Faturamento']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  />
                  <Bar dataKey="faturamento" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO 3: TOP PRODUTOS MAIS VENDIDOS & DIAGNÓSTICO COMPORTAMENTAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* TOP 5 PRODUTOS DO COLABORADOR */}
        <Card className="lg:col-span-6 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <CardHeader>
            <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-violet-600" />
              Top 5 Produtos Mais Vendidos pelo Colaborador
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Itens com maior representatividade nas vendas individuais de {selectedVendor}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.map((p, idx) => (
                <div key={p.code} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between hover:bg-slate-100/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 font-headline font-extrabold flex items-center justify-center text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</h5>
                      <span className="text-[11px] font-semibold text-slate-400">Cód: {p.code} • {p.qtd} unidades</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-slate-900 block">
                      {p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              ))}
              {topProducts.length === 0 && (
                <p className="text-xs font-semibold text-slate-400 text-center py-6">
                  Nenhum produto registrado no período.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* DIAGNÓSTICO COMPORTAMENTAL & RECOMENDAÇÕES DE TREINAMENTO */}
        <Card className="lg:col-span-6 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <CardHeader>
            <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-indigo-600" />
              Diagnóstico Comportamental & Plano de Treinamento
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Análise inteligente de perfil e ações direcionadas para o desenvolvimento do colaborador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* BADGE DE PERFIL CALCULADO */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-indigo-800 tracking-wider">Perfil Calculado:</span>
                <Badge className={cn("font-bold text-xs px-3 py-0.5", behavioralDiagnosis.badgeColor)}>
                  {behavioralDiagnosis.perfilTitle}
                </Badge>
              </div>
              <p className="text-xs font-semibold text-indigo-900 leading-relaxed pt-1">
                {behavioralDiagnosis.perfilDesc}
              </p>
            </div>

            {/* RECOMENDAÇÕES PRÁTICAS */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Recomendações Práticas de Ação:
              </h5>
              <div className="space-y-2">
                {behavioralDiagnosis.recommendations.map((rec, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs font-medium text-slate-700 flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
