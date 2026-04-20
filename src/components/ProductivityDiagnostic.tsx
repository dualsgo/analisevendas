"use client";

import React, { useMemo, useState, useCallback } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  LineChart,
  Line,
  Legend,
  ComposedChart,
  Area,
} from "recharts";
import {
  Activity,
  Users,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Info,
  Timer,
  ChevronDown,
  ChevronUp,
  Zap,
  ShoppingBag,
  Printer,
  CreditCard,
  Gift,
  Gauge,
  BarChart3,
  Brain,
  Target,
  Clock,
  UserCheck,
  Layers,
  ArrowRight,
  CircleAlert,
  ShieldCheck,
  Flame,
  UserCog,
  X,
  Package,
  User,
  Search,
  Cpu,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseISO,
  getDay,
  getHours,
  getMinutes,
  format,
  differenceInMinutes,
  differenceInSeconds,
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProductivityDiagnosticProps {
  data: DetailedSaleRow[];
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ────────────────────────────────────────────────────────────────────────────
// ── BurstEvent type (shared)
type BurstEvent = {
  vendor: string;
  day: string;
  sales: DetailedSaleRow[];
  avgInterval: number;
  avgPA: number;
  totalValue: number;
  burstSize: number;
  startTime: string;
  endTime: string;
};

export function ProductivityDiagnostic({ data }: ProductivityDiagnosticProps) {
  const [openSection, setOpenSection] = useState<string>("visao_geral");
  const [expandedVendorBurst, setExpandedVendorBurst] = useState<string | null>(null);
  const [selectedBurst, setSelectedBurst] = useState<BurstEvent | null>(null);

  const sales = useMemo(
    () => data.filter((r) => !r.is_cancelada && r.tpNF === 1 && !r.is_devolucao && r.dhEmi && r.vendedor),
    [data]
  );

  // ── 1. ANÁLISE DE RAJADA (Burst Detection) ─────────────────────────────────
  // Identifica quando um colaborador emite muitas NFs em intervalo curto
  // Indica que ele está apenas "batendo boleto" em sequência
  const burstAnalysis = useMemo(() => {
    const byVendorDay: Record<string, Record<string, DetailedSaleRow[]>> = {};

    sales.forEach((s) => {
      const v = s.vendedor || "OUTROS";
      const day = s.dhEmi.split("T")[0];
      if (!byVendorDay[v]) byVendorDay[v] = {};
      if (!byVendorDay[v][day]) byVendorDay[v][day] = [];
      byVendorDay[v][day].push(s);
    });


    const bursts: BurstEvent[] = [];
    const vendorBurstStats: Record<string, { bursts: number; totalSales: number; salesInBurst: number }> = {};

    Object.entries(byVendorDay).forEach(([vendor, days]) => {
      if (!vendorBurstStats[vendor]) vendorBurstStats[vendor] = { bursts: 0, totalSales: 0, salesInBurst: 0 };

      Object.entries(days).forEach(([day, daySales]) => {
        const sorted = daySales.sort((a, b) => a.dhEmi.localeCompare(b.dhEmi));
        vendorBurstStats[vendor].totalSales += sorted.length;

        // Sliding window: detecta sequências de 3+ vendas com intervalo médio < 5 min
        let windowStart = 0;
        while (windowStart < sorted.length) {
          let windowEnd = windowStart;
          const windowSales: DetailedSaleRow[] = [sorted[windowStart]];

          while (windowEnd + 1 < sorted.length) {
            const t1 = parseISO(sorted[windowEnd].dhEmi);
            const t2 = parseISO(sorted[windowEnd + 1].dhEmi);
            const diff = Math.abs(differenceInMinutes(t1, t2));

            if (diff <= 5) {
              windowEnd++;
              windowSales.push(sorted[windowEnd]);
            } else {
              break;
            }
          }

          if (windowSales.length >= 3) {
            const intervals: number[] = [];
            for (let i = 1; i < windowSales.length; i++) {
              intervals.push(
                Math.abs(
                  differenceInSeconds(
                    parseISO(windowSales[i - 1].dhEmi),
                    parseISO(windowSales[i].dhEmi)
                  )
                ) / 60
              );
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const avgPA =
              windowSales.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0) / windowSales.length;
            const totalValue = windowSales.reduce((acc, s) => acc + (parseFloat(s.vNF) || 0), 0);

            bursts.push({
              vendor,
              day,
              sales: windowSales,
              avgInterval: +avgInterval.toFixed(1),
              avgPA: +avgPA.toFixed(2),
              totalValue,
              burstSize: windowSales.length,
              startTime: format(parseISO(windowSales[0].dhEmi), "HH:mm"),
              endTime: format(parseISO(windowSales[windowSales.length - 1].dhEmi), "HH:mm"),
            });

            vendorBurstStats[vendor].bursts++;
            vendorBurstStats[vendor].salesInBurst += windowSales.length;

            windowStart = windowEnd + 1;
          } else {
            windowStart++;
          }
        }
      });
    });

    // Comparar PA dentro vs fora das rajadas
    const salesInBurstIds = new Set<string>();
    bursts.forEach((b) => b.sales.forEach((s) => salesInBurstIds.add(s.chave)));

    const inBurst = sales.filter((s) => salesInBurstIds.has(s.chave));
    const outBurst = sales.filter((s) => !salesInBurstIds.has(s.chave));

    const paInBurst =
      inBurst.length > 0
        ? inBurst.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0) / inBurst.length
        : 0;
    const paOutBurst =
      outBurst.length > 0
        ? outBurst.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0) / outBurst.length
        : 0;

    const tkmInBurst =
      inBurst.length > 0
        ? inBurst.reduce((acc, s) => acc + (parseFloat(s.vNF) || 0), 0) / inBurst.length
        : 0;
    const tkmOutBurst =
      outBurst.length > 0
        ? outBurst.reduce((acc, s) => acc + (parseFloat(s.vNF) || 0), 0) / outBurst.length
        : 0;

    const cpfInBurst =
      inBurst.length > 0
        ? (inBurst.filter((s) => s.cpf_cnpj_dest).length / inBurst.length) * 100
        : 0;
    const cpfOutBurst =
      outBurst.length > 0
        ? (outBurst.filter((s) => s.cpf_cnpj_dest).length / outBurst.length) * 100
        : 0;

    // ── 1.1 ANÁLISE DE RAJADA EM GRUPO (Sincronismo de Caixas) ───────────────
    const teamBursts: { day: string, window: string, sales: DetailedSaleRow[], vendorCount: number }[] = [];
    const salesByDay: Record<string, DetailedSaleRow[]> = {};
    sales.forEach(s => {
      const day = s.dhEmi.split("T")[0];
      if (!salesByDay[day]) salesByDay[day] = [];
      salesByDay[day].push(s);
    });

    Object.entries(salesByDay).forEach(([day, daySales]) => {
      const sorted = daySales.sort((a, b) => a.dhEmi.localeCompare(b.dhEmi));
      let windowStart = 0;
      while (windowStart < sorted.length) {
        let windowEnd = windowStart;
        const windowSales: DetailedSaleRow[] = [sorted[windowStart]];
        const vendors = new Set([sorted[windowStart].vendedor]);

        while (windowEnd + 1 < sorted.length) {
          const t1 = parseISO(sorted[windowEnd].dhEmi);
          const t2 = parseISO(sorted[windowEnd + 1].dhEmi);
          const diff = Math.abs(differenceInMinutes(t1, t2));

          if (diff <= 3) { // Janela curta de 3 min para sincronismo
            windowEnd++;
            windowSales.push(sorted[windowEnd]);
            vendors.add(sorted[windowEnd].vendedor);
          } else {
            break;
          }
        }

        if (windowSales.length >= 8 && vendors.size >= 2) {
          teamBursts.push({
            day,
            window: `${format(parseISO(windowSales[0].dhEmi), "HH:mm")} - ${format(parseISO(windowSales[windowSales.length-1].dhEmi), "HH:mm")}`,
            sales: windowSales,
            vendorCount: vendors.size
          });
          windowStart = windowEnd + 1;
        } else {
          windowStart++;
        }
      }
    });

    const vendorRanking = Object.entries(vendorBurstStats)
      .map(([name, stats]) => ({
        name,
        bursts: stats.bursts,
        totalSales: stats.totalSales,
        salesInBurst: stats.salesInBurst,
        burstRate: stats.totalSales > 0 ? (stats.salesInBurst / stats.totalSales) * 100 : 0,
      }))
      .filter((v) => v.bursts > 0)
      .sort((a, b) => b.burstRate - a.burstRate);

    // ── 1.2 CLASSIFICAÇÃO POR POSIÇÕES OPERACIONAIS ────────────────────────
    const positionClassification = {
      pos2: [] as typeof vendorRanking,
      hybrid: [] as typeof vendorRanking,
      pos3: [] as typeof vendorRanking
    };

    vendorRanking.forEach(v => {
      if (v.burstRate > 20) positionClassification.pos3.push(v);
      else if (v.burstRate >= 10) positionClassification.hybrid.push(v);
      else positionClassification.pos2.push(v);
    });

    // ── 1.3 SUGESTÃO DE ALOCAÇÃO POR PERFIL (ENGINE) ────────────────────────
    // Cálculos locais para evitar ReferenceError
    const totalVNF = sales.reduce((acc, s) => acc + (parseFloat(s.vNF) || 0), 0);
    const totalCupons = sales.length;
    const totalItens = sales.reduce((acc, s) => acc + (parseFloat(s.itens_qtd) || 0), 0);
    const vnfThreshold = totalCupons > 0 ? totalVNF / (Object.keys(vendorBurstStats).length || 1) : 0;
    const paThreshold = totalCupons > 0 ? totalItens / totalCupons : 0;

    const allocationSuggestions = vendorRanking.map(v => {
      // Usar a melhor métrica disponível (global ou closing)
      const pa = v.salesInBurst > 0 ? v.salesInBurst / v.bursts : v.totalSales > 0 ? v.totalSales / 1 : 0; // fallback
      // Na verdade, vamos usar os dados do ranking que já tem bursts etc.
      // Vou buscar o PA global desse vendedor para ser mais justo
      const vendorSales = sales.filter(s => s.vendedor === v.name);
      const avgPA = vendorSales.length > 0 ? vendorSales.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0) / vendorSales.length : 0;
      const totalVNF = vendorSales.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
      
      let suggestion = "Acompanhamento";
      let reasoning = "";
      let targetPos = "";

      if (totalVNF >= vnfThreshold && avgPA >= paThreshold) {
        suggestion = "Alta Performance (Venda Direta)";
        reasoning = "Entrega volume com qualidade de PA. Deve ficar no meio de loja capturando vendas complexas.";
        targetPos = "P2";
      } else if (totalVNF < vnfThreshold && avgPA < paThreshold) {
        suggestion = "Recepção / Direcionamento";
        reasoning = "Baixo volume e PA. Perfil ideal para triagem na entrada e organização sem travar o caixa.";
        targetPos = "P1";
      } else if (totalVNF < vnfThreshold && avgPA >= paThreshold) {
        suggestion = "Apoio / Conversão de Balcão";
        reasoning = "Consegue aumentar o PA mesmo em vendas menores. Ideal para apoio no caixa/embrulho fazendo cross-sell.";
        targetPos = "P3";
      } else {
        suggestion = "Fluxo / Finalização Rápida";
        reasoning = "Garante o faturamento mas perde PA. Ideal para momentos de alta rajada no caixa para manter a vazão.";
        targetPos = "P3";
      }

      return { name: v.name, suggestion, reasoning, targetPos, pa: avgPA, vnf: totalVNF };
    }).sort((a,b) => b.vnf - a.vnf);

    return {
      bursts,
      totalBursts: bursts.length,
      totalSalesInBurst: inBurst.length,
      percentInBurst: sales.length > 0 ? (inBurst.length / sales.length) * 100 : 0,
      paInBurst,
      paOutBurst,
      paDelta: paOutBurst - paInBurst,
      tkmInBurst,
      tkmOutBurst,
      tkmDelta: tkmOutBurst - tkmInBurst,
      cpfInBurst,
      cpfOutBurst,
      cpfDelta: cpfOutBurst - cpfInBurst,
      vendorRanking,
      teamBursts: teamBursts.sort((a,b) => b.day.localeCompare(a.day)).slice(0, 10),
      positionClassification,
      allocationSuggestions
    };
  }, [sales]);

  // ── 2. ÍNDICE DE ATENDIMENTO CONSULTIVO vs TRANSACIONAL ──────────────────
  const consultiveIndex = useMemo(() => {
    // Para cada venda, calcular score de "consultividade"
    // Critérios positivos: PA >= 2, tem CPF, tem desconto negociado, TKM alto
    // Critérios negativos: PA=1, sem CPF, intervalo curto com venda anterior

    const byVendor: Record<string, { consultive: number; transactional: number; total: number }> = {};
    const byHour: Record<number, { consultive: number; transactional: number; total: number }> = {};
    const byDay: Record<number, { consultive: number; transactional: number; total: number }> = {};

    const vendorTimestamps: Record<string, number[]> = {};
    sales.forEach((s) => {
      const v = s.vendedor || "OUTROS";
      if (!vendorTimestamps[v]) vendorTimestamps[v] = [];
      try {
        vendorTimestamps[v].push(parseISO(s.dhEmi).getTime());
      } catch {}
    });

    // Sort timestamps
    Object.values(vendorTimestamps).forEach((ts) => ts.sort((a, b) => a - b));

    sales.forEach((s) => {
      const v = s.vendedor || "OUTROS";
      const pa = parseFloat(s.itens_qtd) || 0;
      const vNF = parseFloat(s.vNF) || 0;
      const hasCpf = !!s.cpf_cnpj_dest;
      const hasDiscount = parseFloat(s.desconto_total) > 0;

      // Check interval to previous sale of same vendor
      const ts = vendorTimestamps[v];
      let timeToPrev = 999;
      if (ts) {
        const idx = ts.indexOf(parseISO(s.dhEmi).getTime());
        if (idx > 0) {
          timeToPrev = (ts[idx] - ts[idx - 1]) / 60000; // minutos
        }
      }

      // Score: 0 = totalmente transacional, 100 = totalmente consultivo
      let score = 50; // base
      if (pa >= 3) score += 20;
      else if (pa >= 2) score += 10;
      else if (pa === 1) score -= 15;

      if (hasCpf) score += 10;
      else score -= 5;

      if (vNF > 150) score += 10;
      else if (vNF < 30) score -= 10;

      if (timeToPrev < 3) score -= 20;
      else if (timeToPrev < 5) score -= 10;
      else if (timeToPrev > 20) score += 5;

      score = Math.max(0, Math.min(100, score));
      const isConsultive = score >= 55;

      if (!byVendor[v]) byVendor[v] = { consultive: 0, transactional: 0, total: 0 };
      byVendor[v].total++;
      if (isConsultive) byVendor[v].consultive++;
      else byVendor[v].transactional++;

      try {
        const d = parseISO(s.dhEmi);
        const h = getHours(d);
        const dow = getDay(d);

        if (!byHour[h]) byHour[h] = { consultive: 0, transactional: 0, total: 0 };
        byHour[h].total++;
        if (isConsultive) byHour[h].consultive++;
        else byHour[h].transactional++;

        if (!byDay[dow]) byDay[dow] = { consultive: 0, transactional: 0, total: 0 };
        byDay[dow].total++;
        if (isConsultive) byDay[dow].consultive++;
        else byDay[dow].transactional++;
      } catch {}
    });

    const vendorData = Object.entries(byVendor)
      .map(([name, stats]) => ({
        name,
        ...stats,
        consultiveRate: stats.total > 0 ? (stats.consultive / stats.total) * 100 : 0,
      }))
      .sort((a, b) => b.consultiveRate - a.consultiveRate);

    const hourData = Array.from({ length: 13 }, (_, i) => {
      const h = i + 9;
      const stats = byHour[h] || { consultive: 0, transactional: 0, total: 0 };
      return {
        hour: `${h}h`,
        ...stats,
        consultiveRate: stats.total > 0 ? +((stats.consultive / stats.total) * 100).toFixed(1) : 0,
      };
    });

    const dayData = DAYS.map((label, i) => {
      const stats = byDay[i] || { consultive: 0, transactional: 0, total: 0 };
      return {
        label,
        ...stats,
        consultiveRate: stats.total > 0 ? +((stats.consultive / stats.total) * 100).toFixed(1) : 0,
      };
    });

    const globalConsultive = sales.length > 0
      ? Object.values(byVendor).reduce((acc, v) => acc + v.consultive, 0)
      : 0;
    const globalRate = sales.length > 0 ? (globalConsultive / sales.length) * 100 : 0;

    return {
      vendorData,
      hourData,
      dayData,
      globalRate,
      globalConsultive,
      globalTransactional: sales.length - globalConsultive,
    };
  }, [sales]);

  // ── 3. ANÁLISE DE SOBRECARGA POR SOBREPOSIÇÃO ─────────────────────────────
  // Quantos colaboradores estão atendendo ao mesmo tempo vs demanda
  const overlapAnalysis = useMemo(() => {
    const SLOT_MIN = 15; // slots de 15 min
    const byDaySlot: Record<
      string,
      Record<string, { vendedores: Set<string>; cupons: number; itens: number; vNF: number; cpf: number }>
    > = {};

    sales.forEach((s) => {
      const day = s.dhEmi.split("T")[0];
      try {
        const d = parseISO(s.dhEmi);
        const h = getHours(d);
        const m = getMinutes(d);
        if (h < 9 || h >= 22) return;
        const slotIdx = Math.floor(((h - 9) * 60 + m) / SLOT_MIN);
        const slotH = 9 + Math.floor((slotIdx * SLOT_MIN) / 60);
        const slotM = (slotIdx * SLOT_MIN) % 60;
        const slot = `${String(slotH).padStart(2, "0")}:${String(slotM).padStart(2, "0")}`;

        if (!byDaySlot[day]) byDaySlot[day] = {};
        if (!byDaySlot[day][slot])
          byDaySlot[day][slot] = { vendedores: new Set(), cupons: 0, itens: 0, vNF: 0, cpf: 0 };

        const cell = byDaySlot[day][slot];
        cell.vendedores.add(s.vendedor || "DESCONHECIDO");
        cell.cupons++;
        cell.itens += parseFloat(s.itens_qtd) || 0;
        cell.vNF += parseFloat(s.vNF) || 0;
        if (s.cpf_cnpj_dest) cell.cpf++;
      } catch {}
    });

    // Agregar por slot (média de todos os dias)
    const slotAgg: Record<
      string,
      { totalCupons: number; totalVend: number; totalItens: number; totalvNF: number; totalCpf: number; days: number }
    > = {};

    Object.values(byDaySlot).forEach((slots) => {
      Object.entries(slots).forEach(([slot, v]) => {
        if (!slotAgg[slot])
          slotAgg[slot] = { totalCupons: 0, totalVend: 0, totalItens: 0, totalvNF: 0, totalCpf: 0, days: 0 };
        slotAgg[slot].totalCupons += v.cupons;
        slotAgg[slot].totalVend += v.vendedores.size;
        slotAgg[slot].totalItens += v.itens;
        slotAgg[slot].totalvNF += v.vNF;
        slotAgg[slot].totalCpf += v.cpf;
        slotAgg[slot].days++;
      });
    });

    const timeline = Object.entries(slotAgg)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slot, v]) => {
        const avgCupons = v.days > 0 ? +(v.totalCupons / v.days).toFixed(1) : 0;
        const avgVend = v.days > 0 ? +(v.totalVend / v.days).toFixed(1) : 0;
        const pressure = avgVend > 0 ? +(avgCupons / avgVend).toFixed(2) : 0;
        const avgPA = v.totalCupons > 0 ? +(v.totalItens / v.totalCupons).toFixed(2) : 0;
        const avgTKM = v.totalCupons > 0 ? +(v.totalvNF / v.totalCupons).toFixed(0) : 0;
        const cpfRate = v.totalCupons > 0 ? +((v.totalCpf / v.totalCupons) * 100).toFixed(1) : 0;

        return {
          slot,
          cupons: avgCupons,
          colaboradores: avgVend,
          pressure,
          pa: avgPA,
          tkm: avgTKM,
          cpfRate,
        };
      });

    // PA vs Pressão: correlação
    const pressurePA = timeline
      .filter((t) => t.cupons > 0)
      .map((t) => ({
        slot: t.slot,
        pressure: t.pressure,
        pa: t.pa,
        tkm: t.tkm,
        cpfRate: t.cpfRate,
        cupons: t.cupons,
      }));

    return { timeline, pressurePA };
  }, [sales]);

  // ── 4. DIAGNÓSTICO DA JORNADA FÍSICA ───────────────────────────────────────
  // Análise de limitações físicas: POS, NF, balcão, embrulho
  const physicalJourney = useMemo(() => {
    // Análise por colaborador: tempo entre vendas para estimar deslocamento
    const byVendor: Record<string, DetailedSaleRow[]> = {};
    sales.forEach((s) => {
      const v = s.vendedor || "OUTROS";
      if (!byVendor[v]) byVendor[v] = [];
      byVendor[v].push(s);
    });

    const vendorJourney = Object.entries(byVendor).map(([name, vendorSales]) => {
      const sorted = vendorSales.sort((a, b) => a.dhEmi.localeCompare(b.dhEmi));

      // Calcular intervalos entre vendas
      const intervals: number[] = [];
      const shortIntervals: number[] = []; // < 3 min (suspeita de "só boleto")
      const mediumIntervals: number[] = []; // 3-15 min (atendimento rápido ou POS + NF)
      const longIntervals: number[] = []; // > 15 min (atendimento consultivo)

      for (let i = 1; i < sorted.length; i++) {
        const diff = Math.abs(
          differenceInMinutes(parseISO(sorted[i - 1].dhEmi), parseISO(sorted[i].dhEmi))
        );
        if (diff > 0 && diff <= 120) {
          intervals.push(diff);
          if (diff < 3) shortIntervals.push(diff);
          else if (diff <= 15) mediumIntervals.push(diff);
          else longIntervals.push(diff);
        }
      }

      // Vendas com 1 item: proxy de "checkout rápido"
      const singleItemSales = vendorSales.filter((s) => parseFloat(s.itens_qtd) === 1);
      const multiItemSales = vendorSales.filter((s) => parseFloat(s.itens_qtd) > 1);

      const avgPASingle = 1;
      const avgPAMulti =
        multiItemSales.length > 0
          ? multiItemSales.reduce((a, s) => a + parseFloat(s.itens_qtd), 0) / multiItemSales.length
          : 0;

      return {
        name,
        totalSales: vendorSales.length,
        shortCount: shortIntervals.length,
        mediumCount: mediumIntervals.length,
        longCount: longIntervals.length,
        shortPct: intervals.length > 0 ? (shortIntervals.length / intervals.length) * 100 : 0,
        mediumPct: intervals.length > 0 ? (mediumIntervals.length / intervals.length) * 100 : 0,
        longPct: intervals.length > 0 ? (longIntervals.length / intervals.length) * 100 : 0,
        singleItemPct: vendorSales.length > 0 ? (singleItemSales.length / vendorSales.length) * 100 : 0,
        avgPAMulti,
        medianInterval:
          intervals.length > 0
            ? intervals.slice().sort((a, b) => a - b)[Math.floor(intervals.length / 2)]
            : 0,
      };
    });

    return vendorJourney.sort((a, b) => b.shortPct - a.shortPct);
  }, [sales]);

  // ── 5. CAPACIDADE VS DEMANDA ──────────────────────────────────────────────
  const capacityAnalysis = useMemo(() => {
    // Estimar capacidade ideal: se cada atendimento consultivo leva ~12 min (POS + NF + conversa)
    // e cada transacional leva ~3 min
    const CONSULTIVE_TIME = 12; // minutos
    const TRANSACTIONAL_TIME = 3; // minutos

    // Por slot de 30 min, calcular demanda vs capacidade
    const SLOT_MIN = 30;
    const byDaySlot: Record<string, Record<string, { vendedores: Set<string>; cupons: number; pa1: number; paMulti: number }>> = {};

    sales.forEach((s) => {
      const day = s.dhEmi.split("T")[0];
      try {
        const d = parseISO(s.dhEmi);
        const h = getHours(d);
        const m = getMinutes(d);
        if (h < 9 || h >= 22) return;
        const slotIdx = Math.floor(((h - 9) * 60 + m) / SLOT_MIN);
        const slotH = 9 + Math.floor((slotIdx * SLOT_MIN) / 60);
        const slotM = (slotIdx * SLOT_MIN) % 60;
        const slot = `${String(slotH).padStart(2, "0")}:${String(slotM).padStart(2, "0")}`;

        if (!byDaySlot[day]) byDaySlot[day] = {};
        if (!byDaySlot[day][slot])
          byDaySlot[day][slot] = { vendedores: new Set(), cupons: 0, pa1: 0, paMulti: 0 };

        const cell = byDaySlot[day][slot];
        cell.vendedores.add(s.vendedor || "DESCONHECIDO");
        cell.cupons++;
        if (parseFloat(s.itens_qtd) === 1) cell.pa1++;
        else cell.paMulti++;
      } catch {}
    });

    const slotCapacity: Record<string, { demandMin: number; capacityMin: number; gap: number; count: number }> = {};

    Object.values(byDaySlot).forEach((slots) => {
      Object.entries(slots).forEach(([slot, v]) => {
        if (!slotCapacity[slot]) slotCapacity[slot] = { demandMin: 0, capacityMin: 0, gap: 0, count: 0 };

        // Demanda em minutos: vendas PA=1 são transacionais, PA>1 são mais consultivas
        const demandaMinutos = v.pa1 * TRANSACTIONAL_TIME + v.paMulti * CONSULTIVE_TIME;
        // Capacidade: vendedores × 30 min (slot) mas com overhead de deslocamento POS/NF (~20%)
        const capacidadeMinutos = v.vendedores.size * SLOT_MIN * 0.8; // 80% eficiência

        slotCapacity[slot].demandMin += demandaMinutos;
        slotCapacity[slot].capacityMin += capacidadeMinutos;
        slotCapacity[slot].count++;
      });
    });

    const capacityTimeline = Object.entries(slotCapacity)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slot, v]) => ({
        slot,
        demanda: v.count > 0 ? +(v.demandMin / v.count).toFixed(0) : 0,
        capacidade: v.count > 0 ? +(v.capacityMin / v.count).toFixed(0) : 0,
        utilizacao:
          v.capacityMin > 0 ? +((v.demandMin / v.capacityMin) * 100).toFixed(0) : 0,
      }));

    const avgUtilization =
      capacityTimeline.length > 0
        ? capacityTimeline.reduce((a, c) => a + c.utilizacao, 0) / capacityTimeline.length
        : 0;

    const overloadedSlots = capacityTimeline.filter((s) => s.utilizacao > 100);

    return { capacityTimeline, avgUtilization, overloadedSlots };
  }, [sales]);

  // ── 6. DESEMPENHO INDIVIDUAL: PICO vs FORA DE PICO ────────────────────────
  // Compara indicadores de cada colaborador em slots sob pressão vs slots normais
  const peakPerformance = useMemo(() => {
    // Primeiro: calcular pressão de cada slot por dia (cupons/vendedores)
    const SLOT_MIN = 30;
    const slotPressure: Record<string, Record<string, { cupons: number; vendedores: Set<string> }>> = {};

    sales.forEach((s) => {
      const day = s.dhEmi.split("T")[0];
      try {
        const d = parseISO(s.dhEmi);
        const h = getHours(d);
        const m = getMinutes(d);
        if (h < 9 || h >= 22) return;
        const slotIdx = Math.floor(((h - 9) * 60 + m) / SLOT_MIN);
        const slotH = 9 + Math.floor((slotIdx * SLOT_MIN) / 60);
        const slotM = (slotIdx * SLOT_MIN) % 60;
        const slot = `${String(slotH).padStart(2, "0")}:${String(slotM).padStart(2, "0")}`;
        const key = `${day}_${slot}`;

        if (!slotPressure[day]) slotPressure[day] = {};
        if (!slotPressure[day][slot]) slotPressure[day][slot] = { cupons: 0, vendedores: new Set() };
        slotPressure[day][slot].cupons++;
        slotPressure[day][slot].vendedores.add(s.vendedor || "DESCONHECIDO");
      } catch {}
    });

    // Calcular limiar de pressão (média + 0.5*stddev)
    const allPressures: number[] = [];
    Object.values(slotPressure).forEach((daySlots) => {
      Object.values(daySlots).forEach((v) => {
        if (v.vendedores.size > 0) {
          allPressures.push(v.cupons / v.vendedores.size);
        }
      });
    });
    const avgPressure = allPressures.length > 0 ? allPressures.reduce((a, b) => a + b, 0) / allPressures.length : 1;
    const stdPressure = allPressures.length > 1
      ? Math.sqrt(allPressures.map((p) => (p - avgPressure) ** 2).reduce((a, b) => a + b, 0) / allPressures.length)
      : 0;
    const pressureThreshold = avgPressure + stdPressure * 0.5;

    // Classificar cada venda como "pico" ou "normal"
    type VendorPeakStats = {
      peak: { vendas: number; itens: number; vNF: number; cpf: number; desconto: number; pa1: number };
      normal: { vendas: number; itens: number; vNF: number; cpf: number; desconto: number; pa1: number };
    };

    const vendorPeakMap: Record<string, VendorPeakStats> = {};

    // Para gráfico por hora: acumular indicadores separados
    const hourPeak: Record<number, { vendas: number; itens: number; vNF: number; cpf: number }> = {};
    const hourNormal: Record<number, { vendas: number; itens: number; vNF: number; cpf: number }> = {};

    sales.forEach((s) => {
      const v = s.vendedor || "OUTROS";
      const day = s.dhEmi.split("T")[0];
      try {
        const d = parseISO(s.dhEmi);
        const h = getHours(d);
        const m = getMinutes(d);
        if (h < 9 || h >= 22) return;
        const slotIdx = Math.floor(((h - 9) * 60 + m) / SLOT_MIN);
        const slotH = 9 + Math.floor((slotIdx * SLOT_MIN) / 60);
        const slotM = (slotIdx * SLOT_MIN) % 60;
        const slot = `${String(slotH).padStart(2, "0")}:${String(slotM).padStart(2, "0")}`;

        const cell = slotPressure[day]?.[slot];
        if (!cell) return;
        const pressure = cell.vendedores.size > 0 ? cell.cupons / cell.vendedores.size : 0;
        const isPeak = pressure >= pressureThreshold;

        if (!vendorPeakMap[v]) {
          vendorPeakMap[v] = {
            peak: { vendas: 0, itens: 0, vNF: 0, cpf: 0, desconto: 0, pa1: 0 },
            normal: { vendas: 0, itens: 0, vNF: 0, cpf: 0, desconto: 0, pa1: 0 },
          };
        }

        const bucket = isPeak ? vendorPeakMap[v].peak : vendorPeakMap[v].normal;
        bucket.vendas++;
        bucket.itens += parseFloat(s.itens_qtd) || 0;
        bucket.vNF += parseFloat(s.vNF) || 0;
        if (s.cpf_cnpj_dest) bucket.cpf++;
        if (parseFloat(s.desconto_total) > 0) bucket.desconto++;
        if (parseFloat(s.itens_qtd) === 1) bucket.pa1++;

        // Hora
        const hourBucket = isPeak ? hourPeak : hourNormal;
        if (!hourBucket[h]) hourBucket[h] = { vendas: 0, itens: 0, vNF: 0, cpf: 0 };
        hourBucket[h].vendas++;
        hourBucket[h].itens += parseFloat(s.itens_qtd) || 0;
        hourBucket[h].vNF += parseFloat(s.vNF) || 0;
        if (s.cpf_cnpj_dest) hourBucket[h].cpf++;
      } catch {}
    });

    // Construir ranking de colaboradores
    const vendorComparison = Object.entries(vendorPeakMap)
      .map(([name, stats]) => {
        const p = stats.peak;
        const n = stats.normal;
        const paPeak = p.vendas > 0 ? p.itens / p.vendas : 0;
        const paNormal = n.vendas > 0 ? n.itens / n.vendas : 0;
        const tkmPeak = p.vendas > 0 ? p.vNF / p.vendas : 0;
        const tkmNormal = n.vendas > 0 ? n.vNF / n.vendas : 0;
        const cpfPeak = p.vendas > 0 ? (p.cpf / p.vendas) * 100 : 0;
        const cpfNormal = n.vendas > 0 ? (n.cpf / n.vendas) * 100 : 0;
        const pa1PctPeak = p.vendas > 0 ? (p.pa1 / p.vendas) * 100 : 0;
        const pa1PctNormal = n.vendas > 0 ? (n.pa1 / n.vendas) * 100 : 0;
        const descPctPeak = p.vendas > 0 ? (p.desconto / p.vendas) * 100 : 0;
        const descPctNormal = n.vendas > 0 ? (n.desconto / n.vendas) * 100 : 0;

        return {
          name,
          peakSales: p.vendas,
          normalSales: n.vendas,
          paPeak: +paPeak.toFixed(2),
          paNormal: +paNormal.toFixed(2),
          paDelta: +(paNormal - paPeak).toFixed(2),
          tkmPeak: +tkmPeak.toFixed(2),
          tkmNormal: +tkmNormal.toFixed(2),
          tkmDelta: +(tkmNormal - tkmPeak).toFixed(2),
          cpfPeak: +cpfPeak.toFixed(1),
          cpfNormal: +cpfNormal.toFixed(1),
          cpfDelta: +(cpfNormal - cpfPeak).toFixed(1),
          pa1PctPeak: +pa1PctPeak.toFixed(0),
          pa1PctNormal: +pa1PctNormal.toFixed(0),
          descPctPeak: +descPctPeak.toFixed(1),
          descPctNormal: +descPctNormal.toFixed(1),
        };
      })
      .filter((v) => v.peakSales >= 3 && v.normalSales >= 3) // mínimo de vendas para ser significativo
      .sort((a, b) => b.paDelta - a.paDelta); // quem mais sofre no pico

    // Construir gráfico por hora
    const hourComparison = Array.from({ length: 13 }, (_, i) => {
      const h = i + 9;
      const pk = hourPeak[h] || { vendas: 0, itens: 0, vNF: 0, cpf: 0 };
      const nm = hourNormal[h] || { vendas: 0, itens: 0, vNF: 0, cpf: 0 };
      return {
        hour: `${h}h`,
        paPico: pk.vendas > 0 ? +(pk.itens / pk.vendas).toFixed(2) : 0,
        paNormal: nm.vendas > 0 ? +(nm.itens / nm.vendas).toFixed(2) : 0,
        tkmPico: pk.vendas > 0 ? +(pk.vNF / pk.vendas).toFixed(0) : 0,
        tkmNormal: nm.vendas > 0 ? +(nm.vNF / nm.vendas).toFixed(0) : 0,
        vendasPico: pk.vendas,
        vendasNormal: nm.vendas,
      };
    });

    // Totais globais pico vs normal
    const totalPeak = { vendas: 0, itens: 0, vNF: 0, cpf: 0, pa1: 0 };
    const totalNormal = { vendas: 0, itens: 0, vNF: 0, cpf: 0, pa1: 0 };
    Object.values(vendorPeakMap).forEach((stats) => {
      totalPeak.vendas += stats.peak.vendas;
      totalPeak.itens += stats.peak.itens;
      totalPeak.vNF += stats.peak.vNF;
      totalPeak.cpf += stats.peak.cpf;
      totalPeak.pa1 += stats.peak.pa1;
      totalNormal.vendas += stats.normal.vendas;
      totalNormal.itens += stats.normal.itens;
      totalNormal.vNF += stats.normal.vNF;
      totalNormal.cpf += stats.normal.cpf;
      totalNormal.pa1 += stats.normal.pa1;
    });

    return {
      vendorComparison,
      hourComparison,
      pressureThreshold: +pressureThreshold.toFixed(2),
      totalPeak,
      totalNormal,
    };
  }, [sales]);

  // ── 7. DIAGNÓSTICO FINAL ──────────────────────────────────────────────────
  const diagnostic = useMemo(() => {
    const burstPct = burstAnalysis.percentInBurst;
    const consultiveRate = consultiveIndex.globalRate;
    const avgUtilization = capacityAnalysis.avgUtilization;

    let diagnosis: "critico" | "alerta" | "saudavel";
    let title: string;
    let description: string;
    const recommendations: string[] = [];

    if (burstPct > 30 && consultiveRate < 40) {
      diagnosis = "critico";
      title = "Operação em Modo Transacional";
      description = `A equipe está operando majoritariamente como "batedora de boleto". ${burstPct.toFixed(0)}% das vendas ocorrem em rajadas (3+ vendas em ≤5 min), e apenas ${consultiveRate.toFixed(0)}% dos atendimentos são consultivos. A limitação física (POS, NF, balcão) está forçando os colaboradores a empilharem finalizações.`;
    } else if (burstPct > 15 || consultiveRate < 55) {
      diagnosis = "alerta";
      title = "Pressão Sobre Atendimento Consultivo";
      description = `Há sinais de sobrecarga operacional. ${burstPct.toFixed(0)}% das vendas estão em rajadas e a taxa consultiva é de ${consultiveRate.toFixed(0)}%. Em horários de pico, a equipe prioriza a finalização rápida ao invés do atendimento completo.`;
    } else {
      diagnosis = "saudavel";
      title = "Equipe em Ritmo Consultivo";
      description = `A operação mostra bom equilíbrio. Apenas ${burstPct.toFixed(0)}% das vendas estão em rajada e ${consultiveRate.toFixed(0)}% dos atendimentos são consultivos. A equipe consegue atender ponta-a-ponta na maioria dos casos.`;
    }

    // Recomendações baseadas nos dados
    if (burstPct > 15)
      recommendations.push(
        "Distribuir melhor a fila de finalização: quando possível, escalonar um colaborador fixo para caixa nos horários de pico identificados."
      );

    if (burstAnalysis.paDelta > 0.5)
      recommendations.push(
        `O PA cai ${burstAnalysis.paDelta.toFixed(2)} itens durante rajadas. Treinar a venda sugestiva mesmo na finalização rápida (SLP de balcão).`
      );

    if (burstAnalysis.cpfDelta > 10)
      recommendations.push(
        `O cadastro de CPF cai ${burstAnalysis.cpfDelta.toFixed(0)}pp durante rajadas. Simplificar o fluxo de identificação do cliente no POS.`
      );

    if (capacityAnalysis.overloadedSlots.length > 3)
      recommendations.push(
        `${capacityAnalysis.overloadedSlots.length} slots operam acima de 100% da capacidade. Considerar reforço nessas janelas ou redistribuir tarefas não-venda (separação, organização) para fora do pico.`
      );

    const highBurstVendors = burstAnalysis.vendorRanking.filter((v) => v.burstRate > 30);
    if (highBurstVendors.length > 0)
      recommendations.push(
        `${highBurstVendors.map((v) => v.name).join(", ")} concentram rajadas. Verificar se estão posicionados fixamente no balcão/caixa ou se estão sendo direcionados para lá por acúmulo.`
      );

    if (avgUtilization > 85)
      recommendations.push(
        "A utilização média está acima de 85%. Considerar POS adicional ou checkout mobile para descentralizar a finalização."
      );

    if (recommendations.length === 0)
      recommendations.push("Manter o ritmo atual e acompanhar semanalmente.");

    return { diagnosis, title, description, recommendations };
  }, [burstAnalysis, consultiveIndex, capacityAnalysis]);

  const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const sections = [
    {
      id: "visao_geral",
      label: "Visão Geral Consultivo vs Transacional",
      icon: Brain,
      color: "text-indigo-600",
    },
    {
      id: "rajadas",
      label: "Detecção de Rajadas (Burst)",
      icon: Flame,
      color: "text-rose-600",
    },
    {
      id: "pressao_pa",
      label: "Pressão × Qualidade do Atendimento",
      icon: Gauge,
      color: "text-amber-600",
    },
    {
      id: "jornada_fisica",
      label: "Jornada Física do Colaborador",
      icon: Timer,
      color: "text-purple-600",
    },
    {
      id: "capacidade",
      label: "Capacidade vs Demanda Real",
      icon: BarChart3,
      color: "text-sky-600",
    },
    {
      id: "desempenho_pico",
      label: "Desempenho no Pico vs Fora do Pico",
      icon: UserCog,
      color: "text-teal-600",
    },
    {
      id: "posicoes",
      label: "Estrutura de Posições (GPD)",
      icon: Layers,
      color: "text-indigo-500",
    },
  ];

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
        <Brain className="w-16 h-16 opacity-30" />
        <p className="text-sm font-bold uppercase tracking-widest">
          Carregue XMLs para analisar a produtividade
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      {/* ═══════════════════════════════════════════════════════════════════════
          HERO HEADER COM DIAGNÓSTICO
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className={cn(
          "rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl",
          diagnostic.diagnosis === "critico"
            ? "bg-gradient-to-br from-rose-700 to-rose-900"
            : diagnostic.diagnosis === "alerta"
            ? "bg-gradient-to-br from-amber-600 to-amber-800"
            : "bg-gradient-to-br from-emerald-700 to-emerald-900"
        )}
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 blur-[80px] -mr-24 -mt-24" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 blur-[60px] -ml-16 -mb-16" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div
              className={cn(
                "p-4 rounded-2xl w-fit shrink-0",
                diagnostic.diagnosis === "critico"
                  ? "bg-rose-500/30"
                  : diagnostic.diagnosis === "alerta"
                  ? "bg-amber-500/30"
                  : "bg-emerald-500/30"
              )}
            >
              {diagnostic.diagnosis === "critico" ? (
                <AlertTriangle className="w-8 h-8" />
              ) : diagnostic.diagnosis === "alerta" ? (
                <CircleAlert className="w-8 h-8" />
              ) : (
                <ShieldCheck className="w-8 h-8" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge
                  className={cn(
                    "text-[10px] font-black uppercase tracking-widest border-none",
                    diagnostic.diagnosis === "critico"
                      ? "bg-rose-400/30 text-rose-100"
                      : diagnostic.diagnosis === "alerta"
                      ? "bg-amber-400/30 text-amber-100"
                      : "bg-emerald-400/30 text-emerald-100"
                  )}
                >
                  {diagnostic.diagnosis === "critico"
                    ? "ATENÇÃO CRÍTICA"
                    : diagnostic.diagnosis === "alerta"
                    ? "ALERTA OPERACIONAL"
                    : "OPERAÇÃO SAUDÁVEL"}
                </Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">
                {diagnostic.title}
              </h2>
              <p className="text-white/80 text-sm font-medium mt-2 leading-relaxed max-w-3xl">
                {diagnostic.description}
              </p>
            </div>
          </div>

          {/* KPIs rápidos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <HeroStat
              label="Taxa Consultiva"
              value={`${consultiveIndex.globalRate.toFixed(0)}%`}
              icon={<Brain className="w-4 h-4" />}
            />
            <HeroStat
              label="Vendas em Rajada"
              value={`${burstAnalysis.percentInBurst.toFixed(0)}%`}
              icon={<Flame className="w-4 h-4" />}
            />
            <HeroStat
              label="PA Consultivo"
              value={burstAnalysis.paOutBurst.toFixed(2)}
              icon={<ShoppingBag className="w-4 h-4" />}
            />
            <HeroStat
              label="PA em Rajada"
              value={burstAnalysis.paInBurst.toFixed(2)}
              icon={<TrendingDown className="w-4 h-4" />}
              isAlert={burstAnalysis.paDelta > 0.3}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          CONTEXTO OPERACIONAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <ContextCard
          icon={<CreditCard className="w-5 h-5 text-sky-600" />}
          title="POS Móvel"
          desc="O pagamento requer POS móvel. Quando múltiplos clientes pagam ao mesmo tempo, forma-se fila no equipamento."
          impact="Empilha finalizações no mesmo colaborador"
          color="bg-sky-50 border-sky-100"
        />
        <ContextCard
          icon={<Printer className="w-5 h-5 text-violet-600" />}
          title="Impressão de NF"
          desc="A NF precisa ser impressa em equipamento separado. Após o pagamento, o colaborador precisa se deslocar."
          impact="Adiciona ~1-2 min por atendimento finalizado"
          color="bg-violet-50 border-violet-100"
        />
        <ContextCard
          icon={<Gift className="w-5 h-5 text-pink-600" />}
          title="Embrulho p/ Presente"
          desc="Nem sempre há alguém fixo. O mesmo colaborador que vendeu pode embalar, adicionando mais tempo ao ciclo."
          impact="Ponta-a-ponta pode ultrapassar 15 min"
          color="bg-pink-50 border-pink-100"
        />
        <ContextCard
          icon={<Target className="w-5 h-5 text-amber-600" />}
          title="Balcão = Caixa"
          desc="Sem checkout separado, o cliente vai direto ao balcão para pagar. Perde-se a oportunidade de cross-sell na pista."
          impact="Reduz conversão e oportunidade de PA++"
          color="bg-amber-50 border-amber-100"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SEÇÕES EXPANSÍVEIS
      ═══════════════════════════════════════════════════════════════════════ */}
      {sections.map(({ id, label, icon: Icon, color }) => (
        <div
          key={id}
          className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden"
        >
          <button
            onClick={() => setOpenSection((prev) => (prev === id ? "" : id))}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100">
                <Icon className={cn("w-5 h-5", color)} />
              </div>
              <span className="font-black text-slate-700 uppercase tracking-tight text-sm">
                {label}
              </span>
            </div>
            {openSection === id ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSection === id && (
            <div className="px-5 pb-6 space-y-5 border-t border-slate-100 pt-5">
              {/* ── VISÃO GERAL CONSULTIVO vs TRANSACIONAL ── */}
              {id === "visao_geral" && (
                <div className="space-y-6">
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-indigo-800 font-black uppercase tracking-tight mb-1">
                          O que é Atendimento Consultivo vs Transacional?
                        </p>
                        <p className="text-[11px] text-indigo-700 leading-relaxed">
                          <strong>Consultivo:</strong> O colaborador apresenta opções, sugere
                          complementos, negocia e identifica o cliente. Resulta em PA ≥ 2, TKM
                          maior e CPF cadastrado.
                          <br />
                          <strong>Transacional:</strong> O colaborador apenas finaliza (passa no POS,
                          imprime NF). Típico quando a fila acumula e ele precisa "despachar" o
                          balcão.
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-indigo-100 text-[10px] text-indigo-600 font-bold">
                      O score considera: PA, TKM, CPF, intervalo entre vendas e presença de
                      desconto negociado.
                    </div>
                  </div>

                  {/* Gauge visual */}
                  <div className="bg-slate-900 rounded-2xl p-6 text-white">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-1 w-full">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                          Índice de Atendimento Consultivo
                        </p>
                        <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-1000",
                              consultiveIndex.globalRate >= 60
                                ? "bg-emerald-500"
                                : consultiveIndex.globalRate >= 40
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            )}
                            style={{ width: `${Math.min(consultiveIndex.globalRate, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-500">
                          <span>Transacional</span>
                          <span>Consultivo</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl p-5 min-w-[180px]">
                        <p className="text-5xl font-black">
                          {consultiveIndex.globalRate.toFixed(0)}%
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          Taxa Consultiva Global
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                          Atendimentos Consultivos
                        </p>
                        <p className="text-2xl font-black text-emerald-400">
                          {consultiveIndex.globalConsultive}
                        </p>
                      </div>
                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-center">
                        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">
                          Atendimentos Transacionais
                        </p>
                        <p className="text-2xl font-black text-rose-400">
                          {consultiveIndex.globalTransactional}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Por colaborador */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      🏆 Ranking Consultivo por Colaborador
                    </p>
                    <div className="space-y-2">
                      {consultiveIndex.vendorData.slice(0, 12).map((v, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                        >
                          <span className="text-sm font-black text-slate-300 w-6 text-right">
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black text-slate-700 uppercase">
                                {v.name}
                              </span>
                              <span
                                className={cn(
                                  "text-xs font-black",
                                  v.consultiveRate >= 60
                                    ? "text-emerald-600"
                                    : v.consultiveRate >= 40
                                    ? "text-amber-600"
                                    : "text-rose-600"
                                )}
                              >
                                {v.consultiveRate.toFixed(0)}% consultivo
                              </span>
                            </div>
                            <div className="flex h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full transition-all"
                                style={{ width: `${v.consultiveRate}%` }}
                              />
                              <div
                                className="bg-rose-400 h-full transition-all"
                                style={{ width: `${100 - v.consultiveRate}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                            {v.total} vendas
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Por hora */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      📊 Taxa Consultiva por Horário
                    </p>
                    <ResponsiveContainer width="100%" height={250}>
                      <ComposedChart data={consultiveIndex.hourData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          domain={[0, "auto"]}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          domain={[0, 100]}
                          unit="%"
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                            fontSize: 11,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar
                          yAxisId="left"
                          dataKey="consultive"
                          name="Consultivos"
                          fill="#22c55e"
                          radius={[4, 4, 0, 0]}
                          stackId="a"
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="transactional"
                          name="Transacionais"
                          fill="#f43f5e"
                          radius={[4, 4, 0, 0]}
                          stackId="a"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="consultiveRate"
                          name="% Consultivo"
                          stroke="#6366f1"
                          strokeWidth={2}
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ── DETECÇÃO DE RAJADAS ── */}
              {id === "rajadas" && (
                <div className="space-y-6">
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl space-y-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-rose-800 font-black uppercase tracking-tight mb-1">
                          O que é uma Rajada?
                        </p>
                        <p className="text-[11px] text-rose-700 leading-relaxed">
                          Uma rajada ocorre quando o mesmo colaborador emite{" "}
                          <strong>3 ou mais notas fiscais em sequência com menos de 5 minutos de intervalo</strong>.
                          Isso sugere que ele está posicionado no balcão/caixa apenas finalizando
                          pagamentos (POS → NF) sem tempo para atendimento consultivo.
                          O cliente chega ao balcão já decidido e o colaborador apenas "bate o boleto".
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Impacto comparativo */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <CompareCard
                      label="PA (Peças/Atend.)"
                      inBurst={burstAnalysis.paInBurst.toFixed(2)}
                      outBurst={burstAnalysis.paOutBurst.toFixed(2)}
                      delta={-burstAnalysis.paDelta}
                      isNegativeBad
                    />
                    <CompareCard
                      label="Ticket Médio (TKM)"
                      inBurst={fmtBRL(burstAnalysis.tkmInBurst)}
                      outBurst={fmtBRL(burstAnalysis.tkmOutBurst)}
                      delta={-burstAnalysis.tkmDelta}
                      isNegativeBad
                      isCurrency
                    />
                    <CompareCard
                      label="% CPF Identificado"
                      inBurst={`${burstAnalysis.cpfInBurst.toFixed(1)}%`}
                      outBurst={`${burstAnalysis.cpfOutBurst.toFixed(1)}%`}
                      delta={-burstAnalysis.cpfDelta}
                      isNegativeBad
                    />
                  </div>

                  {/* Ranking de quem mais opera em rajada */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      Colaboradores com maior % de vendas em rajada
                    </p>
                    <div className="space-y-2">
                      {burstAnalysis.vendorRanking.slice(0, 10).map((v, i) => (
                        <div key={i} className="animate-in fade-in slide-in-from-top-1">
                          <button
                            onClick={() => setExpandedVendorBurst(expandedVendorBurst === v.name ? null : v.name)}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                              v.burstRate > 30
                                ? "bg-rose-50 border-rose-100"
                                : v.burstRate > 15
                                ? "bg-amber-50 border-amber-100"
                                : "bg-slate-50 border-slate-100",
                              expandedVendorBurst === v.name && "ring-2 ring-indigo-500 ring-offset-2"
                            )}
                          >
                            <span className="text-xs font-black text-slate-700 flex-1 uppercase">
                              {v.name}
                            </span>
                            <div className="w-32">
                              <Progress
                                value={Math.min(v.burstRate, 100)}
                                className={cn(
                                  "h-2",
                                  v.burstRate > 30
                                    ? "[&>div]:bg-rose-500"
                                    : v.burstRate > 15
                                    ? "[&>div]:bg-amber-500"
                                    : "[&>div]:bg-slate-400"
                                )}
                              />
                            </div>
                            <span
                              className={cn(
                                "text-xs font-black w-16 text-right",
                                v.burstRate > 30
                                  ? "text-rose-600"
                                  : v.burstRate > 15
                                  ? "text-amber-600"
                                  : "text-slate-500"
                              )}
                            >
                              {v.burstRate.toFixed(0)}%
                            </span>
                          </button>

                          {expandedVendorBurst === v.name && (
                            <div className="mt-2 p-4 bg-white rounded-xl border border-slate-200 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                               <p className="text-[10px] font-black uppercase text-slate-400">Rajadas de {v.name} — clique para detalhar</p>
                               <div className="space-y-2">
                                  {burstAnalysis.bursts
                                    .filter(b => b.vendor === v.name)
                                    .sort((a, b) => b.day.localeCompare(a.day))
                                    .slice(0, 8)
                                    .map((b, idx) => {
                                      const pa1Pct = b.sales.filter(s => parseFloat(s.itens_qtd) === 1).length / b.sales.length * 100;
                                      const hasAllSingle = pa1Pct === 100;
                                      return (
                                        <button
                                          key={idx}
                                          onClick={() => setSelectedBurst(b)}
                                          className={cn(
                                            "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all hover:shadow-sm hover:scale-[1.01]",
                                            hasAllSingle
                                              ? "bg-rose-50 border-rose-200 hover:border-rose-400"
                                              : "bg-slate-50 border-slate-200 hover:border-indigo-300"
                                          )}
                                        >
                                          <div className="text-[10px]">
                                            <p className="font-black text-slate-700">{format(parseISO(b.day), "dd/MM (EEE)", { locale: ptBR })}</p>
                                            <p className="text-slate-400">{b.startTime} → {b.endTime}</p>
                                          </div>
                                          <div className="flex gap-2 items-center">
                                            <Badge variant="outline" className="text-[9px] border-indigo-100 text-indigo-600">{b.burstSize} NFs</Badge>
                                            <Badge variant="outline" className={cn("text-[9px]", b.avgPA < 1.5 ? "border-rose-200 text-rose-600" : "border-emerald-200 text-emerald-600")}>PA {b.avgPA}</Badge>
                                            {hasAllSingle && <Badge className="bg-rose-500 text-white text-[8px] border-none">⚠ FILA</Badge>}
                                            <ArrowRight className="w-3 h-3 text-slate-300" />
                                          </div>
                                        </button>
                                      );
                                    })}
                               </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Últimas rajadas detectadas */}
                  <div className="pb-4 border-b border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      💥 Últimas Rajadas Detectadas — clique para ver detalhe
                    </p>
                    <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
                      {burstAnalysis.bursts
                        .sort((a, b) => b.day.localeCompare(a.day))
                        .slice(0, 20)
                        .map((b, i) => {
                          const pa1Pct = b.sales.filter(s => parseFloat(s.itens_qtd) === 1).length / b.sales.length * 100;
                          const allSingle = pa1Pct === 100;
                          const hasCpf = b.sales.some(s => !!s.cpf_cnpj_dest);
                          return (
                            <button
                              key={i}
                              onClick={() => setSelectedBurst(b)}
                              className={cn(
                                "w-full p-3 rounded-xl flex items-center justify-between text-left transition-all hover:shadow-md hover:scale-[1.005]",
                                allSingle
                                  ? "bg-rose-50 border border-rose-200 hover:border-rose-400"
                                  : "bg-white border border-slate-100 hover:border-indigo-300"
                              )}
                            >
                              <div className="space-y-1">
                                <p className="text-xs font-black text-slate-800 uppercase">
                                  {b.vendor}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold">
                                  {format(parseISO(b.day), "dd/MM (EEE)", { locale: ptBR })} •{" "}
                                  {b.startTime}–{b.endTime}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {allSingle && (
                                  <Badge className="bg-rose-500 text-white text-[8px] font-black border-none">
                                    ⚠ POSSÍVEL FILA
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-black border-indigo-100 text-indigo-600"
                                >
                                  {b.burstSize} NFs
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-black border-slate-100 text-slate-500"
                                >
                                  ~{b.avgInterval}min
                                </Badge>
                                <Badge
                                  className={cn(
                                    "text-[9px] font-black border-none",
                                    b.avgPA < 1.5 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                                  )}
                                >
                                  PA {b.avgPA}
                                </Badge>
                                <ArrowRight className="w-3 h-3 text-slate-300" />
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Rajadas de Grupo (Sincronismo) */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                       <Users className="w-3 h-3 text-indigo-500" /> Sincronismo de Caixas (Team Bursts)
                    </p>
                    <div className="space-y-3">
                       {burstAnalysis.teamBursts.length > 0 ? (
                          burstAnalysis.teamBursts.map((tb, idx) => (
                             <div key={idx} className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                   <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-black text-indigo-700 uppercase">Pico de Grupo</span>
                                      <Badge className="bg-white text-indigo-700 border-indigo-200 text-[9px] font-black">
                                         {tb.vendorCount} OPERADORES ATIVOS
                                      </Badge>
                                   </div>
                                   <p className="text-[10px] text-indigo-500 font-bold">
                                      {format(parseISO(tb.day), "dd/MM (EEE)", { locale: ptBR })} • {tb.window}
                                   </p>
                                </div>
                                <div className="flex items-center gap-3">
                                   <div className="text-right">
                                      <p className="text-[9px] font-black text-slate-400 uppercase">Fluxo Total</p>
                                      <p className="text-sm font-black text-slate-700">{tb.sales.length} NOTAS</p>
                                   </div>
                                   <div className="bg-indigo-200/50 w-px h-8" />
                                   <div className="text-right">
                                      <p className="text-[9px] font-black text-slate-400 uppercase">Intensidade</p>
                                      <p className="text-sm font-black text-indigo-600">{(tb.sales.length / 3).toFixed(1)} cup/min</p>
                                   </div>
                                </div>
                             </div>
                          ))
                       ) : (
                          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                             <p className="text-[10px] font-bold text-slate-400 uppercase">Nenhum pico de grupo detectado</p>
                          </div>
                       )}
                    </div>
                  </div>
                </div>
              )}

               {/* ── ESTRUTURA DE POSIÇÕES (GPD) ── */}
               {id === "posicoes" && (
                 <div className="space-y-8">
                   <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                     <div className="flex items-start gap-2">
                       <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                       <div>
                         <p className="text-xs text-indigo-800 font-black uppercase tracking-tight mb-1">
                           Mecânica de Posições Operacionais
                         </p>
                         <p className="text-[11px] text-indigo-700 leading-relaxed">
                           A separação por posições organiza a equipe pelo papel predominante no fluxo da jornada do cliente. 
                           A classificação é automática baseada no <strong>% de Rajada</strong>: maior exposição ao caixa gera maior rajada e menor PA estrutural.
                         </p>
                       </div>
                     </div>
                   </div>

                   {/* Recomendação de Alocação Inteligente */}
                   <div className="space-y-4">
                     <div className="flex items-center gap-2 mb-2">
                        <UserCheck className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-black uppercase text-slate-700 tracking-tight">Sugestão de Alocação por Performance</h4>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {burstAnalysis.allocationSuggestions.slice(0, 8).map((s, i) => (
                           <div key={i} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-start gap-4 hover:shadow-md transition-all">
                              <div className={cn(
                                 "p-2 rounded-xl shrink-0 mt-1",
                                 s.targetPos === "P1" ? "bg-slate-200" :
                                 s.targetPos === "P2" ? "bg-emerald-100" : "bg-indigo-100"
                              )}>
                                 {s.targetPos === "P2" ? <Target className="w-4 h-4 text-emerald-600" /> : <Users className="w-4 h-4 text-slate-600" />}
                              </div>
                              <div className="space-y-1">
                                 <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-800 uppercase">{s.name}</span>
                                    <Badge variant="outline" className="text-[8px] font-black border-slate-200 text-slate-500">{s.targetPos}</Badge>
                                 </div>
                                 <p className="text-[10px] font-black text-indigo-600 leading-none">{s.suggestion}</p>
                                 <p className="text-[9px] text-slate-500 leading-tight italic">{s.reasoning}</p>
                                 <div className="flex gap-3 pt-1">
                                    <span className="text-[8px] font-bold text-slate-400">PA: {s.pa.toFixed(2)}</span>
                                    <span className="text-[8px] font-bold text-slate-400">VENDA: {fmtBRL(s.vnf)}</span>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                   </div>

                   {/* Posição 2: Atendimento Consultivo */}
                   <div className="space-y-4">
                     <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                        <div className="flex items-center gap-2">
                           <div className="p-1.5 bg-emerald-100 rounded-lg">
                              <Target className="w-3 h-3 text-emerald-600" />
                           </div>
                           <h3 className="text-xs font-black uppercase text-emerald-700 tracking-wider">Posição 2 – Atendimento Consultivo</h3>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-black">RAJADA {"<"} 10%</Badge>
                     </div>
                     <p className="text-[10px] text-slate-500 font-medium italic">Foco em sondagem, demonstração e aumento de PA antes do fechamento.</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {burstAnalysis.positionClassification.pos2.map((v, i) => (
                           <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-emerald-200 transition-all">
                              <p className="text-sm font-black text-slate-800 uppercase mb-2">{v.name}</p>
                              <div className="flex justify-between items-end">
                                 <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase">Rajada</p>
                                    <p className="text-xs font-black text-emerald-600">{v.burstRate.toFixed(1)}%</p>
                                 </div>
                                 <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-black">PERFIL CONSULTOR</Badge>
                              </div>
                           </div>
                        ))}
                        {burstAnalysis.positionClassification.pos2.length === 0 && (
                           <p className="text-[10px] text-slate-400 italic">Nenhum colaborador nesta posição no período.</p>
                        )}
                     </div>
                   </div>

                   {/* Perfil Híbrido: Transição */}
                   <div className="space-y-4">
                     <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                        <div className="flex items-center gap-2">
                           <div className="p-1.5 bg-amber-100 rounded-lg">
                              <Activity className="w-3 h-3 text-amber-600" />
                           </div>
                           <h3 className="text-xs font-black uppercase text-amber-700 tracking-wider">Perfil Híbrido – Transição</h3>
                        </div>
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-black">RAJADA 10% – 20%</Badge>
                     </div>
                     <p className="text-[10px] text-slate-500 font-medium italic">Alternam entre venda e operação. Maior oportunidade de ganho de execução.</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {burstAnalysis.positionClassification.hybrid.map((v, i) => (
                           <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-amber-200 transition-all">
                              <p className="text-sm font-black text-slate-800 uppercase mb-2">{v.name}</p>
                              <div className="flex justify-between items-end">
                                 <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase">Rajada</p>
                                    <p className="text-xs font-black text-amber-600">{v.burstRate.toFixed(1)}%</p>
                                 </div>
                                 <Badge className="bg-amber-500/10 text-amber-600 border-none text-[9px] font-black">TRANSICAO</Badge>
                              </div>
                           </div>
                        ))}
                     </div>
                   </div>

                   {/* Posição 3: Finalização (Caixa) */}
                   <div className="space-y-4">
                     <div className="flex items-center justify-between border-b border-rose-100 pb-2">
                        <div className="flex items-center gap-2">
                           <div className="p-1.5 bg-rose-100 rounded-lg">
                              <CreditCard className="w-3 h-3 text-rose-600" />
                           </div>
                           <h3 className="text-xs font-black uppercase text-rose-700 tracking-wider">Posição 3 – Finalização (Caixa)</h3>
                        </div>
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-black">RAJADA {">"} 20%</Badge>
                     </div>
                     <p className="text-[10px] text-slate-500 font-medium italic">Forte volume e exposição operacional. O PA é impactado estruturalmente.</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {burstAnalysis.positionClassification.pos3.map((v, i) => (
                           <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-rose-200 transition-all">
                              <p className="text-sm font-black text-slate-800 uppercase mb-2">{v.name}</p>
                              <div className="flex justify-between items-end">
                                 <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase">Rajada</p>
                                    <p className="text-xs font-black text-rose-600">{v.burstRate.toFixed(1)}%</p>
                                 </div>
                                 <Badge className="bg-rose-500/10 text-rose-600 border-none text-[9px] font-black">OPERACIONAL</Badge>
                              </div>
                           </div>
                        ))}
                     </div>
                   </div>

                   {/* Resumo Estratégico GPD */}
                   <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[100px] -mr-32 -mt-32" />
                      <div className="relative z-10 space-y-4">
                         <h4 className="text-xl font-black uppercase text-indigo-400">Síntese Estratégica</h4>
                         <p className="text-xs text-slate-400 leading-relaxed font-medium">
                            A performance não é uniforme. Colaboradores na <strong>Posição 3</strong> (Caixa) não devem ser comparados em PA diretamente com a <strong>Posição 2</strong> sem descontar o impacto da rajada. Se um híbrido subir para a Posição 2 e não aumentar seu PA, o problema é execução; se o PA subir, o problema anterior era puramente estrutural.
                         </p>
                      </div>
                   </div>
                 </div>
               )}

              {/* ── PRESSÃO × QUALIDADE ── */}
              {id === "pressao_pa" && (
                <div className="space-y-6">
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-amber-800 font-black uppercase tracking-tight mb-1">
                          Como a sobrecarga impacta a qualidade?
                        </p>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                          Quando muitos clientes chegam ao balcão simultaneamente, o colaborador entra em modo "despacho":
                          finaliza rápido, não oferece adicionais, pula CPF, não sugere embrulho.
                          O gráfico abaixo mostra como o <strong>PA</strong> e o <strong>% CPF</strong> se comportam conforme
                          a pressão de atendimentos sobe em cada janela de 15 min.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      PA vs Pressão por Slot de 15 min
                    </p>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={overlapAnalysis.timeline}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="slot" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={3} />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          domain={[0, "auto"]}
                          label={{
                            value: "PA",
                            angle: -90,
                            position: "insideLeft",
                            style: { fontSize: 10, fill: "#94a3b8" },
                          }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          domain={[0, "auto"]}
                          label={{
                            value: "Pressão",
                            angle: 90,
                            position: "insideRight",
                            style: { fontSize: 10, fill: "#94a3b8" },
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                            fontSize: 11,
                          }}
                          formatter={(value: number, name: string) => {
                            if (name === "PA") return [value.toFixed(2), "PA"];
                            if (name === "Pressão") return [value.toFixed(2) + "x", "Pressão"];
                            return [value, name];
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="pressure"
                          name="Pressão"
                          fill="#fef3c7"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          fillOpacity={0.4}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="pa"
                          name="PA"
                          stroke="#6366f1"
                          strokeWidth={3}
                          dot={{ r: 3 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-slate-400 font-medium italic mt-2 text-center">
                      Observe como o PA tende a cair nos horários de maior pressão (picos da
                      área amarela)
                    </p>
                  </div>

                  {/* Tabela de períodos críticos */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      Slots onde a pressão degrada mais a qualidade
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="p-3 text-left font-black text-slate-500 uppercase text-[10px]">
                              Slot
                            </th>
                            <th className="p-3 text-center font-black text-slate-500 uppercase text-[10px]">
                              Cupons/slot
                            </th>
                            <th className="p-3 text-center font-black text-slate-500 uppercase text-[10px]">
                              Pressão
                            </th>
                            <th className="p-3 text-center font-black text-slate-500 uppercase text-[10px]">
                              PA
                            </th>
                            <th className="p-3 text-center font-black text-slate-500 uppercase text-[10px]">
                              % CPF
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {overlapAnalysis.timeline
                            .filter((t) => t.pressure > 1.5)
                            .sort((a, b) => b.pressure - a.pressure)
                            .slice(0, 10)
                            .map((t, i) => (
                              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                <td className="p-3 font-black text-sm text-slate-700">{t.slot}</td>
                                <td className="p-3 text-center font-bold text-slate-600">
                                  {t.cupons}
                                </td>
                                <td className="p-3 text-center">
                                  <Badge
                                    className={cn(
                                      "text-[10px] font-black border-none",
                                      t.pressure > 2.5
                                        ? "bg-rose-100 text-rose-700"
                                        : t.pressure > 1.8
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-emerald-100 text-emerald-700"
                                    )}
                                  >
                                    {t.pressure.toFixed(1)}x
                                  </Badge>
                                </td>
                                <td className="p-3 text-center font-black text-indigo-600">
                                  {t.pa}
                                </td>
                                <td className="p-3 text-center font-bold text-slate-600">
                                  {t.cpfRate}%
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── JORNADA FÍSICA ── */}
              {id === "jornada_fisica" && (
                <div className="space-y-6">
                  <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-purple-800 font-black uppercase tracking-tight mb-1">
                          Perfil de Intervalos entre Vendas
                        </p>
                        <p className="text-[11px] text-purple-700 leading-relaxed">
                          Analisa o tempo entre uma finalização e outra de cada colaborador.
                          <br />
                          <strong className="text-rose-600">{"<"} 3 min (Curto)</strong>: Provavelmente
                          apenas finalizando no balcão. Sem tempo para consultoria.
                          <br />
                          <strong className="text-amber-600">3–15 min (Médio)</strong>: Atendimento
                          rápido com POS + NF ou cliente decidido + finalização.
                          <br />
                          <strong className="text-emerald-600">{"> "}15 min (Longo)</strong>: Atendimento
                          consultivo completo (apresentação + negociação + POS + NF + embrulho).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {physicalJourney.map((v, i) => (
                      <div
                        key={i}
                        className={cn(
                          "p-4 rounded-xl border",
                          v.shortPct > 40
                            ? "bg-rose-50 border-rose-100"
                            : v.shortPct > 20
                            ? "bg-amber-50 border-amber-100"
                            : "bg-slate-50 border-slate-100"
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-700 uppercase">
                              {v.name}
                            </span>
                            {v.shortPct > 40 && (
                              <Badge className="bg-rose-100 text-rose-700 border-none text-[9px] font-black">
                                ALTA RAJADA
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {v.totalSales} vendas • Mediana {v.medianInterval} min
                          </span>
                        </div>
                        {/* Barra empilhada de intervalos */}
                        <div className="flex h-4 rounded-full overflow-hidden bg-slate-200 mb-2">
                          <div
                            className="bg-rose-500 h-full transition-all"
                            style={{ width: `${v.shortPct}%` }}
                            title={`< 3 min: ${v.shortPct.toFixed(0)}%`}
                          />
                          <div
                            className="bg-amber-400 h-full transition-all"
                            style={{ width: `${v.mediumPct}%` }}
                            title={`3-15 min: ${v.mediumPct.toFixed(0)}%`}
                          />
                          <div
                            className="bg-emerald-500 h-full transition-all"
                            style={{ width: `${v.longPct}%` }}
                            title={`> 15 min: ${v.longPct.toFixed(0)}%`}
                          />
                        </div>
                        <div className="flex gap-4 text-[10px] font-bold">
                          <span className="text-rose-600">
                            Curto: {v.shortPct.toFixed(0)}% ({v.shortCount})
                          </span>
                          <span className="text-amber-600">
                            Médio: {v.mediumPct.toFixed(0)}% ({v.mediumCount})
                          </span>
                          <span className="text-emerald-600">
                            Longo: {v.longPct.toFixed(0)}% ({v.longCount})
                          </span>
                          <span className="text-slate-400 ml-auto">
                            PA=1: {v.singleItemPct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── CAPACIDADE VS DEMANDA ── */}
              {id === "capacidade" && (
                <div className="space-y-6">
                  <div className="p-4 bg-sky-50 border border-sky-100 rounded-xl">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-sky-800 font-black uppercase tracking-tight mb-1">
                          Estimativa de Capacidade
                        </p>
                        <p className="text-[11px] text-sky-700 leading-relaxed">
                          Estima quantos minutos de trabalho a equipe precisa em cada slot vs
                          quantos minutos estão disponíveis (colaboradores × 30 min × 80% eficiência).
                          Um atendimento transacional (PA=1) consome ~3 min; um consultivo consome
                          ~12 min (POS + NF + conversa + possível embrulho).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Utilização geral */}
                  <div className="bg-slate-900 rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Utilização Média da Equipe
                        </p>
                        <p className="text-4xl font-black">
                          {capacityAnalysis.avgUtilization.toFixed(0)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Slots Sobrecarregados
                        </p>
                        <p className="text-2xl font-black text-rose-400">
                          {capacityAnalysis.overloadedSlots.length}
                        </p>
                      </div>
                    </div>
                    <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          capacityAnalysis.avgUtilization > 100
                            ? "bg-rose-500"
                            : capacityAnalysis.avgUtilization > 80
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        )}
                        style={{
                          width: `${Math.min(capacityAnalysis.avgUtilization, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-500">
                      <span>0%</span>
                      <span>Ideal: 70-85%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Gráfico de capacidade vs demanda */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      Demanda vs Capacidade por Slot (30 min)
                    </p>
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={capacityAnalysis.capacityTimeline}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="slot" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={1} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} unit=" min" />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                            fontSize: 11,
                          }}
                          formatter={(v: number, name: string) => [
                            `${v} min`,
                            name,
                          ]}
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar
                          dataKey="demanda"
                          name="Demanda (min)"
                          radius={[4, 4, 0, 0]}
                        >
                          {capacityAnalysis.capacityTimeline.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={
                                entry.utilizacao > 100
                                  ? "#ef4444"
                                  : entry.utilizacao > 80
                                  ? "#f59e0b"
                                  : "#22c55e"
                              }
                            />
                          ))}
                        </Bar>
                        <Line
                          type="stepAfter"
                          dataKey="capacidade"
                          name="Capacidade (min)"
                          stroke="#6366f1"
                          strokeWidth={2}
                          strokeDasharray="5 3"
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-slate-400 font-medium italic mt-2 text-center">
                      Barras vermelhas = demanda superior à capacidade. Linha pontilhada = capacidade
                      disponível.
                    </p>
                  </div>
                </div>
              )}

              {/* ── DESEMPENHO PICO VS FORA DE PICO ── */}
              {id === "desempenho_pico" && (
                <div className="space-y-6">
                  <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl space-y-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-teal-800 font-black uppercase tracking-tight mb-1">
                          O que é esta análise?
                        </p>
                        <p className="text-[11px] text-teal-700 leading-relaxed">
                          Compara os indicadores <strong>individuais</strong> de cada colaborador em dois cenários distintos:
                          slots de <strong className="text-rose-600">alta pressão</strong> (quando a razão cupons/vendedores ultrapassa {peakPerformance.pressureThreshold}x)
                          vs slots de <strong className="text-emerald-600">fluxo normal</strong>.
                          Isso revela quanto cada pessoa perde de qualidade quando o balcão está lotado e ele precisa
                          apenas finalizar ao invés de atender consultivamente.
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-teal-100 flex flex-wrap gap-4 text-[10px] font-bold">
                      <span className="text-teal-600">Limiar de pressão: {peakPerformance.pressureThreshold}x</span>
                      <span className="text-rose-500">Vendas em pico: {peakPerformance.totalPeak.vendas}</span>
                      <span className="text-emerald-600">Vendas fora do pico: {peakPerformance.totalNormal.vendas}</span>
                    </div>
                  </div>

                  {/* KPIs globais Pico vs Normal */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <PeakCompareKPI
                      label="PA"
                      peakVal={peakPerformance.totalPeak.vendas > 0 ? (peakPerformance.totalPeak.itens / peakPerformance.totalPeak.vendas).toFixed(2) : "0"}
                      normalVal={peakPerformance.totalNormal.vendas > 0 ? (peakPerformance.totalNormal.itens / peakPerformance.totalNormal.vendas).toFixed(2) : "0"}
                    />
                    <PeakCompareKPI
                      label="TKM"
                      peakVal={peakPerformance.totalPeak.vendas > 0 ? (peakPerformance.totalPeak.vNF / peakPerformance.totalPeak.vendas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0"}
                      normalVal={peakPerformance.totalNormal.vendas > 0 ? (peakPerformance.totalNormal.vNF / peakPerformance.totalNormal.vendas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0"}
                    />
                    <PeakCompareKPI
                      label="% CPF"
                      peakVal={peakPerformance.totalPeak.vendas > 0 ? ((peakPerformance.totalPeak.cpf / peakPerformance.totalPeak.vendas) * 100).toFixed(0) + "%" : "0%"}
                      normalVal={peakPerformance.totalNormal.vendas > 0 ? ((peakPerformance.totalNormal.cpf / peakPerformance.totalNormal.vendas) * 100).toFixed(0) + "%" : "0%"}
                    />
                    <PeakCompareKPI
                      label="% PA=1"
                      peakVal={peakPerformance.totalPeak.vendas > 0 ? ((peakPerformance.totalPeak.pa1 / peakPerformance.totalPeak.vendas) * 100).toFixed(0) + "%" : "0%"}
                      normalVal={peakPerformance.totalNormal.vendas > 0 ? ((peakPerformance.totalNormal.pa1 / peakPerformance.totalNormal.vendas) * 100).toFixed(0) + "%" : "0%"}
                      invertColors
                    />
                  </div>

                  {/* Gráfico: PA Pico vs Normal por hora */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      📊 PA por Horário — Pico vs Fluxo Normal
                    </p>
                    <ResponsiveContainer width="100%" height={260}>
                      <ComposedChart data={peakPerformance.hourComparison}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} domain={[0, "auto"]} />
                        <Tooltip
                          contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", fontSize: 11 }}
                          formatter={(v: number, name: string) => {
                            if (name.includes("PA")) return [v.toFixed(2), name];
                            return [v, name];
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="vendasPico" name="Volume Pico" fill="#fecaca" radius={[4, 4, 0, 0]} opacity={0.5} />
                        <Bar dataKey="vendasNormal" name="Volume Normal" fill="#bbf7d0" radius={[4, 4, 0, 0]} opacity={0.5} />
                        <Line type="monotone" dataKey="paPico" name="PA no Pico" stroke="#ef4444" strokeWidth={3} dot={{ r: 3, fill: "#ef4444" }} />
                        <Line type="monotone" dataKey="paNormal" name="PA Normal" stroke="#22c55e" strokeWidth={3} dot={{ r: 3, fill: "#22c55e" }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-slate-400 font-medium italic mt-2 text-center">
                      Barras = volume de vendas (opaco). Linhas = PA médio no período. Quanto maior a distância entre as linhas, maior o impacto da pressão.
                    </p>
                  </div>

                  {/* Tabela individual por colaborador */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      👤 Comparativo Individual — Quem mais perde qualidade no pico?
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-900 text-white">
                            <th className="p-3 text-left font-black uppercase text-[10px] tracking-wider rounded-tl-xl">Colaborador</th>
                            <th className="p-3 text-center font-black uppercase text-[10px] tracking-wider" colSpan={2}>PA</th>
                            <th className="p-3 text-center font-black uppercase text-[10px] tracking-wider" colSpan={2}>TKM</th>
                            <th className="p-3 text-center font-black uppercase text-[10px] tracking-wider" colSpan={2}>% CPF</th>
                            <th className="p-3 text-center font-black uppercase text-[10px] tracking-wider" colSpan={2}>% PA=1</th>
                            <th className="p-3 text-center font-black uppercase text-[10px] tracking-wider rounded-tr-xl">Vendas</th>
                          </tr>
                          <tr className="bg-slate-100">
                            <th className="p-2"></th>
                            <th className="p-2 text-center text-[9px] font-bold text-rose-500">Pico</th>
                            <th className="p-2 text-center text-[9px] font-bold text-emerald-600">Normal</th>
                            <th className="p-2 text-center text-[9px] font-bold text-rose-500">Pico</th>
                            <th className="p-2 text-center text-[9px] font-bold text-emerald-600">Normal</th>
                            <th className="p-2 text-center text-[9px] font-bold text-rose-500">Pico</th>
                            <th className="p-2 text-center text-[9px] font-bold text-emerald-600">Normal</th>
                            <th className="p-2 text-center text-[9px] font-bold text-rose-500">Pico</th>
                            <th className="p-2 text-center text-[9px] font-bold text-emerald-600">Normal</th>
                            <th className="p-2 text-center text-[9px] font-bold text-slate-500">P / N</th>
                          </tr>
                        </thead>
                        <tbody>
                          {peakPerformance.vendorComparison.map((v, i) => (
                            <tr key={i} className={cn(
                              "border-b border-slate-50 hover:bg-slate-50 transition-colors",
                              v.paDelta > 0.5 && "bg-rose-50/50"
                            )}>
                              <td className="p-3 font-black text-slate-700 uppercase text-xs">
                                <div className="flex items-center gap-2">
                                  {v.name}
                                  {v.paDelta > 0.5 && (
                                    <Badge className="bg-rose-100 text-rose-700 border-none text-[8px] font-black">
                                      -{v.paDelta} PA
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <span className={cn("font-black", v.paPeak < v.paNormal ? "text-rose-600" : "text-slate-700")}>
                                  {v.paPeak}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className="font-black text-emerald-600">{v.paNormal}</span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={cn("font-bold", v.tkmPeak < v.tkmNormal ? "text-rose-500" : "text-slate-600")}>
                                  {v.tkmPeak.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className="font-bold text-emerald-600">{v.tkmNormal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={cn("font-bold", v.cpfPeak < v.cpfNormal ? "text-rose-500" : "text-slate-600")}>
                                  {v.cpfPeak}%
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className="font-bold text-emerald-600">{v.cpfNormal}%</span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={cn("font-bold", v.pa1PctPeak > v.pa1PctNormal ? "text-rose-500" : "text-slate-600")}>
                                  {v.pa1PctPeak}%
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className="font-bold text-emerald-600">{v.pa1PctNormal}%</span>
                              </td>
                              <td className="p-3 text-center text-[10px] font-bold text-slate-400">
                                {v.peakSales} / {v.normalSales}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {peakPerformance.vendorComparison.length === 0 && (
                      <div className="py-8 text-center text-slate-400 text-sm font-bold">
                        Dados insuficientes para comparação (mínimo 3 vendas em cada cenário).
                      </div>
                    )}
                  </div>

                  {/* Cards individuais detalhados para os que mais perdem */}
                  {peakPerformance.vendorComparison.filter(v => v.paDelta > 0.3).length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                        ⚠️ Colaboradores com maior impacto no pico (ΔPA {'>'} 0.3)
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {peakPerformance.vendorComparison.filter(v => v.paDelta > 0.3).slice(0, 6).map((v, i) => (
                          <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                              <span className="font-black uppercase text-sm tracking-tight">{v.name}</span>
                              <Badge className="bg-rose-500/20 text-rose-300 border-none text-[9px] font-black">
                                Perde {v.paDelta} PA no pico
                              </Badge>
                            </div>
                            <div className="p-4 space-y-3">
                              {/* Mini barras comparativas */}
                              <VendorMetricBar label="PA" peakVal={v.paPeak} normalVal={v.paNormal} maxVal={Math.max(v.paPeak, v.paNormal) * 1.2 || 3} />
                              <VendorMetricBar label="TKM" peakVal={v.tkmPeak} normalVal={v.tkmNormal} maxVal={Math.max(v.tkmPeak, v.tkmNormal) * 1.2 || 200} isCurrency />
                              <VendorMetricBar label="CPF" peakVal={v.cpfPeak} normalVal={v.cpfNormal} maxVal={100} suffix="%" />

                              <div className="pt-3 border-t border-slate-50 grid grid-cols-2 gap-3 text-center">
                                <div>
                                  <p className="text-[9px] font-bold text-rose-400 uppercase">No Pico</p>
                                  <p className="text-lg font-black text-slate-700">{v.peakSales}</p>
                                  <p className="text-[9px] text-slate-400 font-bold">vendas • {v.pa1PctPeak}% PA=1</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-emerald-500 uppercase">Fora do Pico</p>
                                  <p className="text-lg font-black text-slate-700">{v.normalSales}</p>
                                  <p className="text-[9px] text-slate-400 font-bold">vendas • {v.pa1PctNormal}% PA=1</p>
                                </div>
                              </div>

                              {/* Interpretação */}
                              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                                <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                                  {v.paDelta > 0.8
                                    ? `${v.name} perde muita qualidade sob pressão. No pico, o PA cai ${v.paDelta} itens e o % sem CPF sobe. Provavelmente está preso no balcão finalizando e não consegue oferecer adicionais.`
                                    : v.cpfDelta > 15
                                    ? `${v.name} mantém razoável o PA, mas o cadastro de CPF cai ${v.cpfDelta.toFixed(0)}pp no pico. A pressa na finalização faz pular a identificação.`
                                    : `${v.name} apresenta queda moderada no pico. Há espaço para melhoria na venda sugestiva durante a finalização rápida.`
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* ═══════════════════════════════════════════════════════════════════════
          PLANO DE AÇÃO
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight">
              Plano de Ação Recomendado
            </h3>
            <p className="text-slate-400 text-xs font-medium">
              Baseado na análise dos padrões detectados e nas limitações físicas da operação.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {diagnostic.recommendations.map((rec, i) => (
            <div
              key={i}
              className="flex gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl items-start hover:bg-white/10 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-black shrink-0 text-sm">
                {i + 1}
              </div>
              <p className="text-sm font-medium text-slate-200 pt-1">{rec}</p>
            </div>
          ))}
        </div>
      </div>
    </div>

      {/* ═══ MODAL DE DETALHE DA RAJADA ═══ */}
      {selectedBurst && (
        <BurstDetailModal
          burst={selectedBurst}
          onClose={() => setSelectedBurst(null)}
        />
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MODAL DE DETALHE DA RAJADA
// ────────────────────────────────────────────────────────────────────────────

function BurstDetailModal({
  burst,
  onClose,
}: {
  burst: {
    vendor: string;
    day: string;
    sales: DetailedSaleRow[];
    avgInterval: number;
    avgPA: number;
    totalValue: number;
    burstSize: number;
    startTime: string;
    endTime: string;
  };
  onClose: () => void;
}) {
  const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Ordenar vendas por horário
  const sortedSales = [...burst.sales].sort((a, b) => a.dhEmi.localeCompare(b.dhEmi));

  // Heurística: é fila de autoatendimento?
  // Critérios para identificar "atendimento de fila" vs consultivo:
  //   - Intervalo < 2 min entre NFs
  //   - PA = 1 (item único)
  //   - Sem CPF cadastrado
  //   - Valor baixo (< R$80)
  const classifySale = (s: DetailedSaleRow, prevSale: DetailedSaleRow | null) => {
    const pa = parseFloat(s.itens_qtd) || 0;
    const vNF = parseFloat(s.vNF) || 0;
    const hasCpf = !!s.cpf_cnpj_dest;
    const hasDiscount = parseFloat(s.desconto_total) > 0;
    const isDigital = s.is_retirada_online || s.is_adicional;

    let intervalSec = null as number | null;
    if (prevSale) {
      intervalSec = Math.abs(
        (parseISO(s.dhEmi).getTime() - parseISO(prevSale.dhEmi).getTime()) / 1000
      );
    }

    let score = 0; // 0 = fila/transacional, positivo = consultivo
    if (pa >= 3) score += 3;
    else if (pa >= 2) score += 2;
    else score -= 2; // PA=1 é forte indicativo de fila

    if (hasCpf) score += 2;
    if (hasDiscount) score += 1;
    if (vNF > 120) score += 2;
    else if (vNF < 50) score -= 1;
    if (isDigital) score += 2; // retirada digital: justificado ser PA=1

    if (intervalSec !== null) {
      if (intervalSec < 90) score -= 3; // < 1.5 min: quase impossível ser consultivo
      else if (intervalSec < 180) score -= 1;
    }

    const label = score >= 2
      ? "consultivo"
      : score >= 0
      ? "misto"
      : "fila";

    return { score, label, intervalSec };
  };

  // Estatísticas da rajada
  const totalVal = sortedSales.reduce((a, s) => a + (parseFloat(s.vNF) || 0), 0);
  const avgPA = sortedSales.reduce((a, s) => a + (parseFloat(s.itens_qtd) || 0), 0) / sortedSales.length;
  const cpfCount = sortedSales.filter(s => !!s.cpf_cnpj_dest).length;
  const pa1Count = sortedSales.filter(s => parseFloat(s.itens_qtd) === 1).length;

  const classifiedSales = sortedSales.map((s, idx) => ({
    sale: s,
    classif: classifySale(s, idx > 0 ? sortedSales[idx - 1] : null),
  }));

  const filaCount = classifiedSales.filter(c => c.classif.label === "fila").length;
  const consultiveCount = classifiedSales.filter(c => c.classif.label === "consultivo").length;
  const overallLabel = filaCount > consultiveCount * 1.5
    ? "fila"
    : consultiveCount >= filaCount
    ? "consultivo"
    : "misto";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-t-[2rem] md:rounded-[2rem] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 duration-300 md:mx-4">
        {/* Header */}
        <div className={cn(
          "px-6 pt-6 pb-4 rounded-t-[2rem] text-white",
          overallLabel === "fila"
            ? "bg-gradient-to-br from-rose-600 to-rose-800"
            : overallLabel === "consultivo"
            ? "bg-gradient-to-br from-emerald-600 to-emerald-800"
            : "bg-gradient-to-br from-amber-600 to-amber-800"
        )}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {overallLabel === "fila" ? (
                  <Badge className="bg-white/20 text-white border-none text-[9px] font-black">⚠ POSSÍVEL FILA DE AUTOATENDIMENTO</Badge>
                ) : overallLabel === "consultivo" ? (
                  <Badge className="bg-white/20 text-white border-none text-[9px] font-black">✓ ATENDIMENTO CONSULTIVO</Badge>
                ) : (
                  <Badge className="bg-white/20 text-white border-none text-[9px] font-black">⚡ PADRÃO MISTO</Badge>
                )}
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">{burst.vendor}</h2>
              <p className="text-white/70 text-xs font-bold">
                {format(parseISO(burst.day), "dd/MM/yyyy (EEEE)", { locale: ptBR })} • {burst.startTime} → {burst.endTime}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* KPIs rápidos */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-[8px] font-black uppercase text-white/60">NFs</p>
              <p className="text-xl font-black">{sortedSales.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-[8px] font-black uppercase text-white/60">PA Médio</p>
              <p className="text-xl font-black">{avgPA.toFixed(2)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-[8px] font-black uppercase text-white/60">TKM</p>
              <p className="text-xl font-black">{fmtBRL(totalVal / sortedSales.length)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-[8px] font-black uppercase text-white/60">CPF</p>
              <p className="text-xl font-black">{cpfCount}/{sortedSales.length}</p>
            </div>
          </div>

          {/* Barra de classificação */}
          <div className="mt-3 flex gap-2 items-center">
            <span className="text-[9px] font-black text-white/60 uppercase">Qualidade da Rajada:</span>
            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden flex">
              <div className="bg-emerald-400 h-full transition-all" style={{ width: `${(consultiveCount / sortedSales.length) * 100}%` }} />
              <div className="bg-amber-400 h-full transition-all" style={{ width: `${(classifiedSales.filter(c => c.classif.label === 'misto').length / sortedSales.length) * 100}%` }} />
              <div className="bg-rose-400 h-full transition-all" style={{ width: `${(filaCount / sortedSales.length) * 100}%` }} />
            </div>
            <span className="text-[9px] font-bold text-white/70">{filaCount} fila • {consultiveCount} consul.</span>
          </div>
        </div>

        {/* Aviso contextual */}
        {overallLabel === "fila" && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
            <div className="flex items-start gap-2">
              <CircleAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-rose-700 font-medium leading-relaxed">
                <strong>Padrão de fila identificado.</strong> A maioria das NFs desta rajada tem PA=1, intervalo baixo e sem CPF —
                características típicas de clientes que vieram do autoatendimento/fila e precisaram ser atendidos pelo colaborador
                apenas para finalizar (POS + NF). Não houve oportunidade de atendimento consultivo.
              </p>
            </div>
          </div>
        )}

        {/* Lista de NFs com detalhe */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 mt-3 space-y-3">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">
            Atendimentos Detalhados · {sortedSales.length} NFs
          </p>
          {classifiedSales.map(({ sale: s, classif }, idx) => {
            const pa = parseFloat(s.itens_qtd) || 0;
            const vNF = parseFloat(s.vNF) || 0;
            const hasCpf = !!s.cpf_cnpj_dest;
            const isDigital = s.is_retirada_online || s.is_adicional;
            const hasDiscount = parseFloat(s.desconto_total) > 0;

            return (
              <div
                key={idx}
                className={cn(
                  "rounded-xl border overflow-hidden",
                  classif.label === "fila"
                    ? "border-rose-200 bg-rose-50/30"
                    : classif.label === "consultivo"
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-amber-200 bg-amber-50/30"
                )}
              >
                {/* NF Header */}
                <div className={cn(
                  "flex items-center justify-between px-4 py-2.5",
                  classif.label === "fila"
                    ? "bg-rose-100/60"
                    : classif.label === "consultivo"
                    ? "bg-emerald-100/60"
                    : "bg-amber-100/60"
                )}>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center text-white",
                      classif.label === "fila" ? "bg-rose-500" : classif.label === "consultivo" ? "bg-emerald-500" : "bg-amber-500"
                    )}>{idx + 1}</span>
                    <div>
                      <p className="text-xs font-black text-slate-800">
                        {format(parseISO(s.dhEmi), "HH:mm:ss")}
                        {classif.intervalSec !== null && (
                          <span className={cn(
                            "ml-2 text-[9px] font-bold",
                            classif.intervalSec < 90 ? "text-rose-500" : classif.intervalSec < 180 ? "text-amber-500" : "text-slate-400"
                          )}>
                            (+{classif.intervalSec < 60
                              ? `${Math.round(classif.intervalSec)}s`
                              : `${(classif.intervalSec / 60).toFixed(1)}min`})
                          </span>
                        )}
                      </p>
                      <p className="text-[9px] text-slate-500 font-medium">NF {s.nf}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDigital && <Badge className="bg-indigo-500 text-white text-[8px] border-none h-4 px-1.5">DIGITAL</Badge>}
                    {classif.label === "fila" && <Badge className="bg-rose-500 text-white text-[8px] border-none h-4 px-1.5">FILA</Badge>}
                    {classif.label === "consultivo" && <Badge className="bg-emerald-600 text-white text-[8px] border-none h-4 px-1.5">CONSULTIVO</Badge>}
                    {classif.label === "misto" && <Badge className="bg-amber-500 text-white text-[8px] border-none h-4 px-1.5">MISTO</Badge>}
                  </div>
                </div>

                {/* Indicadores */}
                <div className="grid grid-cols-4 divide-x divide-slate-200 border-b border-slate-200">
                  <div className="px-3 py-2 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">PA</p>
                    <p className={cn("text-sm font-black", pa === 1 ? "text-rose-600" : pa >= 3 ? "text-emerald-600" : "text-amber-600")}>
                      {pa}
                    </p>
                  </div>
                  <div className="px-3 py-2 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">TKM</p>
                    <p className="text-sm font-black text-slate-700">{fmtBRL(vNF)}</p>
                  </div>
                  <div className="px-3 py-2 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">CPF</p>
                    <p className={cn("text-sm font-black", hasCpf ? "text-emerald-600" : "text-slate-300")}>
                      {hasCpf ? (
                        <span title={s.cpf_cnpj_dest} className="flex items-center justify-center">
                          <User className="w-3 h-3" />
                        </span>
                      ) : "—"}
                    </p>
                  </div>
                  <div className="px-3 py-2 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Desc.</p>
                    <p className={cn("text-sm font-black", hasDiscount ? "text-indigo-600" : "text-slate-300")}>
                      {hasDiscount
                        ? `${parseFloat(s.percentual_desconto).toFixed(0)}%`
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Itens */}
                {s.itens && s.itens.length > 0 ? (
                  <div className="px-4 py-2.5 space-y-1">
                    {s.itens.map((item, iIdx) => (
                      <div key={iIdx} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Package className="w-3 h-3 text-slate-300 shrink-0" />
                          <span className="text-[10px] text-slate-600 font-medium truncate">{item.xProd}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[9px] font-bold text-slate-400">x{item.qCom}</span>
                          <span className="text-[10px] font-black text-slate-700">
                            {item.vProd.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                          {item.vDesc > 0 && (
                            <span className="text-[8px] font-black text-indigo-500">
                              -{item.vDesc.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-2 text-[10px] text-slate-400 italic">Itens não disponíveis</div>
                )}
              </div>
            );
          })}

          {/* Resumo final */}
          <div className="mt-4 p-4 bg-slate-900 text-white rounded-2xl">
            <p className="text-[9px] font-black uppercase text-slate-400 mb-3">Resumo da Rajada</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-[8px] text-slate-400 font-bold">Total Faturado</p>
                <p className="text-sm font-black text-white">{fmtBRL(totalVal)}</p>
              </div>
              <div>
                <p className="text-[8px] text-slate-400 font-bold">PA Médio</p>
                <p className={cn("text-sm font-black", avgPA < 1.5 ? "text-rose-400" : "text-emerald-400")}>{avgPA.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[8px] text-slate-400 font-bold">Identificação CPF</p>
                <p className={cn("text-sm font-black", cpfCount === 0 ? "text-rose-400" : "text-emerald-400")}>{cpfCount}/{sortedSales.length}</p>
              </div>
              <div>
                <p className="text-[8px] text-slate-400 font-bold">Itens PA=1</p>
                <p className={cn("text-sm font-black", pa1Count === sortedSales.length ? "text-rose-400" : "text-amber-400")}>{pa1Count}/{sortedSales.length}</p>
              </div>
            </div>
            <div className={cn(
              "mt-3 p-3 rounded-xl border text-[10px] leading-relaxed font-medium",
              overallLabel === "fila"
                ? "bg-rose-900/40 border-rose-700/50 text-rose-200"
                : overallLabel === "consultivo"
                ? "bg-emerald-900/40 border-emerald-700/50 text-emerald-200"
                : "bg-amber-900/30 border-amber-700/50 text-amber-200"
            )}>
              {overallLabel === "fila" && (
                <>Esta rajada apresenta forte padrão de <strong>finalização de fila</strong>: média {avgPA.toFixed(1)} itens/NF, {pa1Count} NFs com 1 item,
                apenas {cpfCount} CPFs de {sortedSales.length} clientes. O colaborador estava provavelmente no balcão
                apenas finalizando pagamentos de clientes que vieram da fila (autoatendimento forçado pela operação sem caixa tradicional).</>
              )}
              {overallLabel === "consultivo" && (
                <>Padrão <strong>consultivo identificado</strong>: apesar do volume, o colaborador manteve PA {avgPA.toFixed(1)} e
                identificou {cpfCount} de {sortedSales.length} clientes com CPF. Os produtos mostram variedade, indicando
                atendimento ativo com sugestão.</>
              )}
              {overallLabel === "misto" && (
                <>Padrão <strong>misto</strong>: ajuda de fila alternada com atendimento consultivo. {filaCount} atendimentos
                têm características de fila e {consultiveCount} mantiveram qualidade consultiva.</>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ────────────────────────────────────────────────────────────────────────────

function HeroStat({
  label,
  value,
  icon,
  isAlert,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  isAlert?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-white/10 border border-white/15 rounded-2xl p-4 flex items-center gap-3",
        isAlert && "bg-rose-500/20 border-rose-400/30"
      )}
    >
      <div className="p-2 bg-white/10 rounded-xl">{icon}</div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-white/50">{label}</p>
        <p className={cn("text-xl font-black", isAlert ? "text-rose-300" : "text-white")}>
          {value}
        </p>
      </div>
    </div>
  );
}

function ContextCard({
  icon,
  title,
  desc,
  impact,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  impact: string;
  color: string;
}) {
  return (
    <div className={cn("p-5 rounded-2xl border space-y-3", color)}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white rounded-xl shadow-sm">{icon}</div>
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{title}</h4>
      </div>
      <p className="text-[11px] text-slate-600 leading-relaxed font-medium">{desc}</p>
      <div className="flex items-center gap-2 pt-2 border-t border-black/5">
        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
        <p className="text-[10px] font-bold text-slate-500 italic">{impact}</p>
      </div>
    </div>
  );
}

function CompareCard({
  label,
  inBurst,
  outBurst,
  delta,
  isNegativeBad,
  isCurrency,
}: {
  label: string;
  inBurst: string;
  outBurst: string;
  delta: number;
  isNegativeBad?: boolean;
  isCurrency?: boolean;
}) {
  const isBad = isNegativeBad ? delta < 0 : delta > 0;
  const absDelta = Math.abs(delta);
  const fmtDelta = isCurrency
    ? absDelta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : absDelta.toFixed(1) + (label.includes("%") ? "pp" : "");

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-4 shadow-sm">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-rose-400 uppercase">Em Rajada</p>
          <p className="text-xl font-black text-rose-600">{inBurst}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-emerald-400 uppercase">Ritmo Normal</p>
          <p className="text-xl font-black text-emerald-600">{outBurst}</p>
        </div>
      </div>
      <div
        className={cn(
          "p-3 rounded-xl flex items-center gap-2",
          isBad ? "bg-rose-50 border border-rose-100" : "bg-emerald-50 border border-emerald-100"
        )}
      >
        {isBad ? (
          <TrendingDown className="w-4 h-4 text-rose-500" />
        ) : (
          <TrendingUp className="w-4 h-4 text-emerald-500" />
        )}
        <p
          className={cn(
            "text-[10px] font-black uppercase",
            isBad ? "text-rose-700" : "text-emerald-700"
          )}
        >
          {isBad ? "Perda" : "Ganho"} de {fmtDelta}
        </p>
      </div>
    </div>
  );
}

function PeakCompareKPI({
  label,
  peakVal,
  normalVal,
  invertColors,
}: {
  label: string;
  peakVal: string;
  normalVal: string;
  invertColors?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-2">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <p className="text-[8px] font-bold text-rose-400 uppercase">Pico</p>
          <p className={cn("text-lg font-black", invertColors ? "text-rose-600" : "text-rose-600")}>
            {peakVal}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[8px] font-bold text-emerald-500 uppercase">Normal</p>
          <p className="text-lg font-black text-emerald-600">{normalVal}</p>
        </div>
      </div>
    </div>
  );
}

function VendorMetricBar({
  label,
  peakVal,
  normalVal,
  maxVal,
  isCurrency,
  suffix,
}: {
  label: string;
  peakVal: number;
  normalVal: number;
  maxVal: number;
  isCurrency?: boolean;
  suffix?: string;
}) {
  const fmtVal = (v: number) => {
    if (isCurrency) return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    return v.toFixed(suffix ? 0 : 2) + (suffix || "");
  };
  const peakPct = maxVal > 0 ? Math.min((peakVal / maxVal) * 100, 100) : 0;
  const normalPct = maxVal > 0 ? Math.min((normalVal / maxVal) * 100, 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{label}</span>
        <div className="flex gap-3 text-[10px] font-bold">
          <span className="text-rose-500">{fmtVal(peakVal)}</span>
          <span className="text-slate-300">vs</span>
          <span className="text-emerald-600">{fmtVal(normalVal)}</span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-bold text-rose-400 w-6">P</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-rose-400 rounded-full transition-all" style={{ width: `${peakPct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-bold text-emerald-500 w-6">N</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${normalPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

