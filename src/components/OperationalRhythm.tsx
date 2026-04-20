
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  Line, CartesianGrid, Cell, ReferenceLine
} from "recharts";
import {
  Activity, Users, AlertTriangle, Zap, TrendingDown,
  TrendingUp, Info, Flame, UserX, Timer, ChevronDown, ChevronUp,
  Brain, Target, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, getDay, getHours, getMinutes, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OperationalRhythmProps {
  data: DetailedSaleRow[];
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const SLOT_MINUTES = 30;
const SLOTS_PER_DAY = Math.ceil((22 - 9) * 60 / SLOT_MINUTES); // 09h–22h = 26 slots

function toSlotKey(dhEmi: string): string | null {
  try {
    const d = parseISO(dhEmi);
    const h = getHours(d);
    const m = getMinutes(d);
    if (h < 9 || h >= 22) return null;
    const slotIndex = Math.floor(((h - 9) * 60 + m) / SLOT_MINUTES);
    return `${String(h).padStart(2, "0")}:${String(Math.floor(m / SLOT_MINUTES) * SLOT_MINUTES).padStart(2, "0")}`;
  } catch { return null; }
}

function toDayKey(dhEmi: string): string | null {
  try { return format(parseISO(dhEmi), "yyyy-MM-dd"); } catch { return null; }
}

const SECTION_IDS = ["concorrencia", "turnos", "almoco", "ritmo", "ondas", "morto", "qualidade", "causa_raiz", "isolamento"] as const;
type SectionId = typeof SECTION_IDS[number];

export function OperationalRhythm({ data }: OperationalRhythmProps) {
  const [openSection, setOpenSection] = useState<SectionId>("concorrencia");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);

  const sales = useMemo(() =>
    data.filter(r => !r.is_cancelada && r.tpNF === 1 && !r.is_devolucao && r.dhEmi),
    [data]
  );

  // ── Core: slot data ──────────────────────────────────────────────────────────
  const slotData = useMemo(() => {
    // Map: dayKey → slotKey → { cupons, vendedores, vNF, desconto, cpf, sales }
    const byDaySlot: Record<string, Record<string, {
      cupons: number; vendedores: Set<string>; vNF: number;
      comDesconto: number; comCpf: number;
      vendas: DetailedSaleRow[];
    }>> = {};

    for (const s of sales) {
      const day = toDayKey(s.dhEmi);
      const slot = toSlotKey(s.dhEmi);
      if (!day || !slot) continue;
      if (!byDaySlot[day]) byDaySlot[day] = {};
      if (!byDaySlot[day][slot]) byDaySlot[day][slot] = { 
        cupons: 0, 
        vendedores: new Set(), 
        vNF: 0, 
        comDesconto: 0, 
        comCpf: 0,
        vendas: [] 
      };
      const cell = byDaySlot[day][slot];
      cell.cupons++;
      cell.vendedores.add(s.vendedor || "DESCONHECIDO");
      cell.vNF += parseFloat(s.vNF) || 0;
      if (parseFloat(s.desconto_total) > 0) cell.comDesconto++;
      if (s.cpf_cnpj_dest) cell.comCpf++;
      cell.vendas.push(s);
    }
    return byDaySlot;
  }, [sales]);

  const days = useMemo(() => Object.keys(slotData).sort(), [slotData]);

  // ── 1. Concorrência: slots agregados ────────────────────────────────────────
  const concorrenciaTimeline = useMemo(() => {
    // slots de 15min nas horas do dia, agregado de todos os dias (ou dia filtrado)
    const filtDays = selectedDay !== null
      ? days.filter(d => getDay(parseISO(d)) === selectedDay)
      : days;

    const slotMap: Record<string, { totalCupons: number; totalVend: number; count: number; maxConc: number }> = {};
    for (const day of filtDays) {
      const slots = slotData[day] || {};
      for (const [slot, v] of Object.entries(slots)) {
        if (!slotMap[slot]) slotMap[slot] = { totalCupons: 0, totalVend: 0, count: 0, maxConc: 0 };
        slotMap[slot].totalCupons += v.cupons;
        slotMap[slot].totalVend += v.vendedores.size;
        slotMap[slot].count++;
        if (v.vendedores.size > slotMap[slot].maxConc) slotMap[slot].maxConc = v.vendedores.size;
      }
    }
    return Object.entries(slotMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slot, v]) => ({
        slot,
        cupons: v.count > 0 ? +(v.totalCupons / v.count).toFixed(1) : 0,
        colaboradores: v.count > 0 ? +(v.totalVend / v.count).toFixed(1) : 0,
        pressao: v.totalVend > 0 ? +(v.totalCupons / v.totalVend).toFixed(2) : 0,
        maxConc: v.maxConc,
      }));
  }, [slotData, days, selectedDay]);

  const pressaoMedia = useMemo(() => {
    const vals = concorrenciaTimeline.map(s => s.pressao).filter(p => p > 0);
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [concorrenciaTimeline]);

  const pressaoStddev = useMemo(() => {
    const vals = concorrenciaTimeline.map(s => s.pressao).filter(p => p > 0);
    if (vals.length < 2) return 0;
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.sqrt(vals.map(v => (v - m) ** 2).reduce((a, b) => a + b, 0) / vals.length);
  }, [concorrenciaTimeline]);

  const limiarGargalo = pressaoMedia + pressaoStddev;

  const topSlots = useMemo(() =>
    [...concorrenciaTimeline]
      .filter(s => s.pressao > limiarGargalo)
      .sort((a, b) => b.pressao - a.pressao)
      .slice(0, 5),
    [concorrenciaTimeline, limiarGargalo]
  );

  // ── 2. Ritmo individual ──────────────────────────────────────────────────────
  const ritmoColaboradores = useMemo(() => {
    const byVend: Record<string, number[]> = {};
    for (const s of sales) {
      if (!s.vendedor || s.vendedor === "COLABORADOR NÃO IDENTIFICADO") continue;
      if (!byVend[s.vendedor]) byVend[s.vendedor] = [];
      try { byVend[s.vendedor].push(parseISO(s.dhEmi).getTime()); } catch { /* skip */ }
    }
    return Object.entries(byVend).map(([nome, ts]) => {
      const sorted = ts.sort((a, b) => a - b);
      const deltas = sorted.slice(1).map((t, i) => (t - sorted[i]) / 60000); // em minutos
      const posDeltas = deltas.filter(d => d >= 1 && d <= 120); // ignora sobreposições e outliers > 2h
      if (posDeltas.length < 2) return null;
      const median = posDeltas.slice().sort((a, b) => a - b)[Math.floor(posDeltas.length / 2)];
      const mean = posDeltas.reduce((a, b) => a + b, 0) / posDeltas.length;
      const stddev = Math.sqrt(posDeltas.map(d => (d - mean) ** 2).reduce((a, b) => a + b, 0) / posDeltas.length);
      const maxGap = Math.max(...posDeltas);
      return { nome, mediana: +median.toFixed(0), desvio: +stddev.toFixed(0), maxGap: +maxGap.toFixed(0), nVendas: sorted.length };
    }).filter(Boolean).sort((a, b) => a!.mediana - b!.mediana) as { nome: string; mediana: number; desvio: number; maxGap: number; nVendas: number }[];
  }, [sales]);

  const medianaGeral = useMemo(() => {
    const vals = ritmoColaboradores.map(r => r.mediana);
    if (!vals.length) return 0;
    const s = vals.slice().sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }, [ritmoColaboradores]);

  const expandedSlotDetails = useMemo(() => {
    if (!expandedSlot) return null;
    
    const filtDays = selectedDay !== null
      ? days.filter(d => getDay(parseISO(d)) === selectedDay)
      : days;
      
    const details: { day: string, sales: DetailedSaleRow[] }[] = [];
    for (const day of filtDays) {
      const slotInfo = slotData[day]?.[expandedSlot];
      if (slotInfo && slotInfo.vendas.length > 0) {
        details.push({ day, sales: slotInfo.vendas });
      }
    }
    return details.sort((a, b) => b.day.localeCompare(a.day));
  }, [expandedSlot, slotData, days, selectedDay]);

  // ── 3. Ondas recorrentes: heatmap dia-semana × hora ────────────────────────
  const ondasHeatmap = useMemo(() => {
    const map: Record<number, Record<string, { sum: number; count: number }>> = {};
    for (let d = 0; d < 7; d++) map[d] = {};
    for (const day of days) {
      const dow = getDay(parseISO(day));
      const slots = slotData[day] || {};
      for (const [slot, v] of Object.entries(slots)) {
        const hour = slot.split(":")[0];
        if (!map[dow][hour]) map[dow][hour] = { sum: 0, count: 0 };
        map[dow][hour].sum += v.vendedores.size;
        map[dow][hour].count++;
      }
    }
    const hours = Array.from({ length: 13 }, (_, i) => String(i + 9).padStart(2, "0"));
    return { map, hours };
  }, [slotData, days]);

  const maxOnda = useMemo(() => {
    let max = 0;
    for (let d = 0; d < 7; d++) {
      for (const v of Object.values(ondasHeatmap.map[d])) {
        const avg = v.count > 0 ? v.sum / v.count : 0;
        if (avg > max) max = avg;
      }
    }
    return max || 1;
  }, [ondasHeatmap]);

  // ── 4. Tempo morto em pico ──────────────────────────────────────────────────
  const tempoMorto = useMemo(() => {
    const ausencias: Record<string, number> = {};
    for (const day of days) {
      const slots = slotData[day];
      const todosVendedores = new Set<string>();
      for (const v of Object.values(slots)) v.vendedores.forEach(x => todosVendedores.add(x));
      for (const [slot, v] of Object.entries(slots)) {
        const pressao = v.cupons / (v.vendedores.size || 1);
        if (pressao <= limiarGargalo) continue;
        // quem estava ativo nesse dia mas NÃO vendeu nesse slot?
        for (const vend of todosVendedores) {
          if (!v.vendedores.has(vend)) {
            ausencias[vend] = (ausencias[vend] || 0) + 1;
          }
        }
      }
    }
    return Object.entries(ausencias)
      .map(([nome, ausencias]) => ({ nome, ausencias }))
      .sort((a, b) => b.ausencias - a.ausencias)
      .slice(0, 10);
  }, [slotData, days, limiarGargalo]);

  // ── 5. Qualidade nos gargalos ──────────────────────────────────────────────
  const qualidadeComparacao = useMemo(() => {
    const gargalo = { vNF: 0, cupons: 0, desconto: 0, cpf: 0, itens: 0 };
    const normal = { vNF: 0, cupons: 0, desconto: 0, cpf: 0, itens: 0 };
    for (const s of sales) {
      const slot = toSlotKey(s.dhEmi);
      const day = toDayKey(s.dhEmi);
      if (!slot || !day) continue;
      const cell = slotData[day]?.[slot];
      if (!cell) continue;
      const pressao = cell.cupons / (cell.vendedores.size || 1);
      const bucket = pressao > limiarGargalo ? gargalo : normal;
      bucket.cupons++;
      bucket.vNF += parseFloat(s.vNF) || 0;
      if (parseFloat(s.desconto_total) > 0) bucket.desconto++;
      if (s.cpf_cnpj_dest) bucket.cpf++;
      bucket.itens += parseFloat(s.itens_qtd) || 0;
    }
    const safe = (n: number, d: number) => d > 0 ? +(n / d).toFixed(2) : 0;
    return {
      gargalo: {
        tkm: safe(gargalo.vNF, gargalo.cupons),
        pa: safe(gargalo.itens, gargalo.cupons),
        pDesconto: gargalo.cupons > 0 ? +((gargalo.desconto / gargalo.cupons) * 100).toFixed(1) : 0,
        pCpf: gargalo.cupons > 0 ? +((gargalo.cpf / gargalo.cupons) * 100).toFixed(1) : 0,
        cupons: gargalo.cupons,
      },
      normal: {
        tkm: safe(normal.vNF, normal.cupons),
        pa: safe(normal.itens, normal.cupons),
        pDesconto: normal.cupons > 0 ? +((normal.desconto / normal.cupons) * 100).toFixed(1) : 0,
        pCpf: normal.cupons > 0 ? +((normal.cpf / normal.cupons) * 100).toFixed(1) : 0,
        cupons: normal.cupons,
      },
    };
  }, [sales, slotData, limiarGargalo]);

  // ── 6. Diagnóstico de Causa-Raiz por Colaborador ──────────────────────────
  // Divide o desempenho de cada colaborador em 3 níveis de pressão:
  //   GARGALO (> limiar): pressão alta, colaborador sobrecarregado
  //   MÉDIO (0.7x–1x limiar): pressão moderada
  //   LIVRE (<0.7x limiar): ritmo livre, sem pressão
  // Se PA/TKM cai só no gargalo → PRESSÃO OPERACIONAL (causa externa)
  // Se PA/TKM é baixo até no ritmo livre → HABILIDADE/ENGAJAMENTO (causa interna)
  const causaRaizDiagnostico = useMemo(() => {
    type Bucket = { cupons: number; vNF: number; itens: number; cpf: number };
    const byVendor: Record<string, { gargalo: Bucket; medio: Bucket; livre: Bucket }> = {};

    for (const s of sales) {
      if (!s.vendedor || s.vendedor === "COLABORADOR NÃO IDENTIFICADO") continue;
      const slot = toSlotKey(s.dhEmi);
      const day = toDayKey(s.dhEmi);
      if (!slot || !day) continue;
      const cell = slotData[day]?.[slot];
      if (!cell) continue;

      const pressao = cell.cupons / (cell.vendedores.size || 1);
      const limMedio = limiarGargalo * 0.7;

      const nivel: "gargalo" | "medio" | "livre" =
        pressao > limiarGargalo ? "gargalo" :
        pressao > limMedio ? "medio" : "livre";

      if (!byVendor[s.vendedor]) {
        byVendor[s.vendedor] = {
          gargalo: { cupons: 0, vNF: 0, itens: 0, cpf: 0 },
          medio: { cupons: 0, vNF: 0, itens: 0, cpf: 0 },
          livre: { cupons: 0, vNF: 0, itens: 0, cpf: 0 },
        };
      }

      const bucket = byVendor[s.vendedor][nivel];
      bucket.cupons++;
      bucket.vNF += parseFloat(s.vNF) || 0;
      bucket.itens += parseFloat(s.itens_qtd) || 0;
      if (s.cpf_cnpj_dest) bucket.cpf++;
    }

    const safe = (n: number, d: number) => d > 0 ? n / d : null as null | number;

    return Object.entries(byVendor)
      .map(([nome, buckets]) => {
        const g = buckets.gargalo;
        const m = buckets.medio;
        const l = buckets.livre;

        const paGargalo = safe(g.itens, g.cupons);
        const paMedio = safe(m.itens, m.cupons);
        const paLivre = safe(l.itens, l.cupons);

        const tkmGargalo = safe(g.vNF, g.cupons);
        const tkmMedio = safe(m.vNF, m.cupons);
        const tkmLivre = safe(l.vNF, l.cupons);

        const cpfGargalo = g.cupons > 0 ? (g.cpf / g.cupons) * 100 : null;
        const cpfLivre = l.cupons > 0 ? (l.cpf / l.cupons) * 100 : null;

        // Causa-raiz: comparar PA/TKM no livre vs gargalo
        // Se no ritmo livre já é baixo → causa interna
        // Global PA (todos os níveis combinados)
        const totalCupons = g.cupons + m.cupons + l.cupons;
        const totalItens = g.itens + m.itens + l.itens;
        const paGlobal = totalCupons > 0 ? totalItens / totalCupons : 0;

        // Determinar causa–raiz
        let causaLabel: "pressao" | "misto" | "interno" | "desconhecido" = "desconhecido";
        let causaScore = 0; // positivo = mais pressao, negativo = mais interno
        let causaRazao = "";

        if (paLivre !== null && paGargalo !== null) {
          const deltaPressao = paLivre - paGargalo; // quanto cai no gargalo
          const paLivreRelGlobal = paLivre / (paGlobal || 1);

          if (deltaPressao > 0.5 && paLivreRelGlobal >= 0.9) {
            // Boa performance no livre, queda no gargalo → pressão operacional
            causaLabel = "pressao";
            causaScore = deltaPressao;
            causaRazao = `PA cai ${deltaPressao.toFixed(1)} pts no gargalo mas fica em ${paLivre.toFixed(1)} no ritmo livre.`;
          } else if (paLivreRelGlobal < 0.8 && paLivre < 1.8) {
            // Baixo até no livre → causa interna
            causaLabel = "interno";
            causaScore = -(1 - paLivreRelGlobal);
            causaRazao = `PA de ${paLivre.toFixed(1)} mesmo no ritmo livre (sem pressão de fila).`;
          } else {
            causaLabel = "misto";
            causaRazao = `VA livre: PA ${paLivre.toFixed(1)}, em gargalo: PA ${paGargalo.toFixed(1)}.`;
          }
        } else if (paGlobal < 1.5) {
          causaLabel = "interno";
          causaRazao = "Poucos dados por nível de pressão, mas PA global abaixo de 1.5.";
        }

        return {
          nome,
          totalCupons,
          paGlobal: +paGlobal.toFixed(2),
          paGargalo: paGargalo !== null ? +paGargalo.toFixed(2) : null,
          paMedio: paMedio !== null ? +paMedio.toFixed(2) : null,
          paLivre: paLivre !== null ? +paLivre.toFixed(2) : null,
          tkmGargalo: tkmGargalo !== null ? +tkmGargalo.toFixed(2) : null,
          tkmMedio: tkmMedio !== null ? +tkmMedio.toFixed(2) : null,
          tkmLivre: tkmLivre !== null ? +tkmLivre.toFixed(2) : null,
          cpfGargalo: cpfGargalo !== null ? +cpfGargalo.toFixed(1) : null,
          cpfLivre: cpfLivre !== null ? +cpfLivre.toFixed(1) : null,
          cuponsGargalo: g.cupons,
          cuponsLivre: l.cupons,
          causaLabel,
          causaScore,
          causaRazao,
        };
      })
      .filter(v => v.totalCupons >= 5)
      .sort((a, b) => {
        // Ordenar: internos primeiro (mais actionable), depois mistos, depois pressão
        const order = { interno: 0, misto: 1, pressao: 2, desconhecido: 3 };
        return order[a.causaLabel] - order[b.causaLabel];
      });
  }, [sales, slotData, limiarGargalo]);

  // ── 7a. Dispersão de PA entre colaboradores no mesmo slot ──────────────────────
  // Se dois colaboradores dividem o mesmo slot/horário e um faz PA 3 e outro PA 1,
  // o ambiente não explica a diferença — isola o fator humano.
  const paDispersao = useMemo(() => {
    const slotVendorPA: Record<string, Record<string, { itens: number; cupons: number }>> = {};

    for (const s of sales) {
      if (!s.vendedor || s.vendedor === "COLABORADOR NÃO IDENTIFICADO") continue;
      const slot = toSlotKey(s.dhEmi);
      const day = toDayKey(s.dhEmi);
      if (!slot || !day) continue;
      const key = `${day}||${slot}`;
      if (!slotVendorPA[key]) slotVendorPA[key] = {};
      if (!slotVendorPA[key][s.vendedor]) slotVendorPA[key][s.vendedor] = { itens: 0, cupons: 0 };
      slotVendorPA[key][s.vendedor].itens += parseFloat(s.itens_qtd) || 0;
      slotVendorPA[key][s.vendedor].cupons++;
    }

    type SlotDispersao = { key: string; day: string; slot: string; vendors: { nome: string; pa: number; cupons: number }[]; maxPA: number; minPA: number; delta: number; pressao: number; };
    const dispersaoSlots: SlotDispersao[] = [];

    for (const [key, vendors] of Object.entries(slotVendorPA)) {
      const parts = key.split('||');
      const day = parts[0];
      const slot = parts[1];
      const cell = slotData[day]?.[slot];
      const pressao = cell ? cell.cupons / (cell.vendedores.size || 1) : 0;

      const vendorList = Object.entries(vendors)
        .filter(([, v]) => v.cupons >= 2)
        .map(([nome, v]) => ({ nome, pa: v.cupons > 0 ? v.itens / v.cupons : 0, cupons: v.cupons }));

      if (vendorList.length < 2) continue;
      const pas = vendorList.map(v => v.pa);
      const maxPA = Math.max(...pas);
      const minPA = Math.min(...pas);
      const delta = maxPA - minPA;
      if (delta >= 0.7) {
        dispersaoSlots.push({
          key, day, slot,
          vendors: vendorList.sort((a, b) => b.pa - a.pa),
          maxPA: +maxPA.toFixed(2), minPA: +minPA.toFixed(2),
          delta: +delta.toFixed(2), pressao: +pressao.toFixed(2),
        });
      }
    }

    // Por colaborador: quantas vezes foi o "mais baixo" num slot compartilhado
    const vendorLow: Record<string, { low: number; total: number; deltaTotal: number }> = {};
    for (const s of dispersaoSlots) {
      const lowestVendor = s.vendors[s.vendors.length - 1];
      const highestVendor = s.vendors[0];
      for (const v of s.vendors) {
        if (!vendorLow[v.nome]) vendorLow[v.nome] = { low: 0, total: 0, deltaTotal: 0 };
        vendorLow[v.nome].total++;
        vendorLow[v.nome].deltaTotal += s.delta;
        if (v.nome === lowestVendor.nome) vendorLow[v.nome].low++;
      }
    }

    const vendorDispersao = Object.entries(vendorLow)
      .map(([nome, s]) => ({ nome, lowRate: s.total > 0 ? (s.low / s.total) * 100 : 0, lowCount: s.low, total: s.total }))
      .filter(v => v.total >= 3)
      .sort((a, b) => b.lowRate - a.lowRate);

    return {
      dispersaoSlots: dispersaoSlots.sort((a, b) => b.delta - a.delta).slice(0, 15),
      vendorDispersao,
      totalSlots: dispersaoSlots.length,
      highPressureDispersao: dispersaoSlots.filter(s => s.pressao > limiarGargalo).length,
      lowPressureDispersao: dispersaoSlots.filter(s => s.pressao <= limiarGargalo).length,
    };
  }, [sales, slotData, limiarGargalo]);

  // ── 7b. Correlação tamanho da equipe × PA médio do dia ─────────────────────────
  const correlacaoEquipePa = useMemo(() => {
    const byDay: Record<string, { teamSize: number; totalItens: number; cupons: number; vNF: number }> = {};

    for (const day of days) {
      const daySlots = slotData[day];
      if (!daySlots) continue;
      const allVendors = new Set<string>();
      let cupons = 0; let itens = 0; let vNF = 0;
      for (const slot of Object.values(daySlots)) {
        slot.vendedores.forEach(v => allVendors.add(v));
        cupons += slot.cupons;
        vNF += slot.vNF;
        slot.vendas.forEach(s => { itens += parseFloat(s.itens_qtd) || 0; });
      }
      if (cupons >= 3) byDay[day] = { teamSize: allVendors.size, totalItens: itens, cupons, vNF };
    }

    const points = Object.entries(byDay).map(([day, v]) => ({
      day,
      teamSize: v.teamSize,
      pa: +(v.totalItens / v.cupons).toFixed(2),
      tkm: +(v.vNF / v.cupons).toFixed(2),
      cupons: v.cupons,
    }));

    // Agrupar por tamanho de equipe
    const bySize: Record<number, { totalPA: number; count: number; totalTKM: number }> = {};
    for (const p of points) {
      if (!bySize[p.teamSize]) bySize[p.teamSize] = { totalPA: 0, count: 0, totalTKM: 0 };
      bySize[p.teamSize].totalPA += p.pa;
      bySize[p.teamSize].totalTKM += p.tkm;
      bySize[p.teamSize].count++;
    }
    const teamSizeGroups = Object.entries(bySize)
      .map(([size, v]) => ({ teamSize: parseInt(size), avgPA: +(v.totalPA / v.count).toFixed(2), avgTKM: +(v.totalTKM / v.count).toFixed(2), dias: v.count }))
      .sort((a, b) => a.teamSize - b.teamSize);

    // Correlação de Pearson equipe x PA
    const n = points.length;
    let correlation = 0;
    if (n >= 3) {
      const mx = points.reduce((a, b) => a + b.teamSize, 0) / n;
      const my = points.reduce((a, b) => a + b.pa, 0) / n;
      const num = points.reduce((s, p) => s + (p.teamSize - mx) * (p.pa - my), 0);
      const dx = Math.sqrt(points.reduce((s, p) => s + (p.teamSize - mx) ** 2, 0));
      const dy = Math.sqrt(points.reduce((s, p) => s + (p.pa - my) ** 2, 0));
      correlation = dx > 0 && dy > 0 ? +(num / (dx * dy)).toFixed(2) : 0;
    }

    // Dias com equipe reduzida (abaixo da mediana)
    const sizes = points.map(p => p.teamSize).sort((a, b) => a - b);
    const medianSize = sizes[Math.floor(sizes.length / 2)] || 1;
    const diasReduzida = points.filter(p => p.teamSize < medianSize);
    const diasNormal = points.filter(p => p.teamSize >= medianSize);
    const paReduzida = diasReduzida.length > 0 ? diasReduzida.reduce((a, p) => a + p.pa, 0) / diasReduzida.length : 0;
    const paNormal = diasNormal.length > 0 ? diasNormal.reduce((a, p) => a + p.pa, 0) / diasNormal.length : 0;

    return { teamSizeGroups, correlation, medianSize, paReduzida: +paReduzida.toFixed(2), paNormal: +paNormal.toFixed(2), points: points.slice(0, 30) };
  }, [sales, slotData, days]);

  // ── 7c. Consistência intra-colaborador (variação de PA por dia vs pressão) ──────
  const consistenciaColaborador = useMemo(() => {
    type DayBucket = { itens: number; cupons: number; pressaoTotal: number; slots: number };
    const byVendorDay: Record<string, Record<string, DayBucket>> = {};

    for (const s of sales) {
      if (!s.vendedor || s.vendedor === "COLABORADOR NÃO IDENTIFICADO") continue;
      const slot = toSlotKey(s.dhEmi);
      const day = toDayKey(s.dhEmi);
      if (!slot || !day) continue;
      const cell = slotData[day]?.[slot];
      const pressao = cell ? cell.cupons / (cell.vendedores.size || 1) : 0;
      if (!byVendorDay[s.vendedor]) byVendorDay[s.vendedor] = {};
      if (!byVendorDay[s.vendedor][day]) byVendorDay[s.vendedor][day] = { itens: 0, cupons: 0, pressaoTotal: 0, slots: 0 };
      byVendorDay[s.vendedor][day].itens += parseFloat(s.itens_qtd) || 0;
      byVendorDay[s.vendedor][day].cupons++;
      byVendorDay[s.vendedor][day].pressaoTotal += pressao;
      byVendorDay[s.vendedor][day].slots++;
    }

    type PerfilType = "pressionado" | "inconsistente" | "consistente_alto" | "consistente_baixo";

    return Object.entries(byVendorDay).map(([nome, dayMap]) => {
      const dayPoints = Object.entries(dayMap)
        .filter(([, v]) => v.cupons >= 3)
        .map(([day, v]) => ({
          day,
          pa: v.itens / v.cupons,
          pressao: v.slots > 0 ? v.pressaoTotal / v.slots : 0,
          cupons: v.cupons,
        }));

      if (dayPoints.length < 3) return null;

      const pas = dayPoints.map(d => d.pa);
      const meanPA = pas.reduce((a, b) => a + b, 0) / pas.length;
      const stdPA = Math.sqrt(pas.map(p => (p - meanPA) ** 2).reduce((a, b) => a + b, 0) / pas.length);
      const minPA = Math.min(...pas);
      const maxPA = Math.max(...pas);

      // Correlação pressão do dia × PA do dia (negativa = pressão derruba PA)
      const pressoes = dayPoints.map(d => d.pressao);
      const meanP = pressoes.reduce((a, b) => a + b, 0) / pressoes.length;
      const num = dayPoints.reduce((s, d) => s + (d.pressao - meanP) * (d.pa - meanPA), 0);
      const dp = Math.sqrt(pressoes.reduce((s, p) => s + (p - meanP) ** 2, 0));
      const dpa = Math.sqrt(pas.reduce((s, p) => s + (p - meanPA) ** 2, 0));
      const corrPressaoPA = dp > 0 && dpa > 0 ? +(num / (dp * dpa)).toFixed(2) : 0;

      let perfil: PerfilType;
      if (corrPressaoPA < -0.4) perfil = "pressionado";
      else if (stdPA > 0.7 && corrPressaoPA > -0.2) perfil = "inconsistente";
      else if (meanPA >= 2.5) perfil = "consistente_alto";
      else perfil = "consistente_baixo";

      return { nome, meanPA: +meanPA.toFixed(2), stdPA: +stdPA.toFixed(2), minPA: +minPA.toFixed(2), maxPA: +maxPA.toFixed(2), corrPressaoPA, perfil, diasAnalisados: dayPoints.length, dayPoints };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null && v.diasAnalisados >= 3)
    .sort((a, b) => {
      const order: Record<PerfilType, number> = { inconsistente: 0, consistente_baixo: 1, pressionado: 2, consistente_alto: 3 };
      return order[a.perfil] - order[b.perfil];
    });
  }, [sales, slotData]);

  const SLP_CODES = ['5135238', '5135269', '5135270', '5135273', '5146458', '5146469', '5146470', '5146471', '5146472', '5146473', '5146474', '5146475', '5146476', '5146501', '5146504', '5146505', '5141894', '5141895', '5141896', '5141897', '5141898', '5141899', '5141900', '5141902', '5141903', '5141904', '5141905', '5141907', '5141909', '5141910', '5141911', '5141912', '5141913', '5141914', '5141915', '5141916', '5141917', '5141920', '5141949', '5141978', '5140469', '5140475', '5140476', '5140477', '5140478', '5140479', '5146477', '5146478', '5146502', '5146503'];
  const SOCIAL_CODES = ['5057181', '5055875', '5135601', '5129270', '5129271', '5129247', '5129262', '5122642', '5122641', '5135612', '5122639', '5122638', '5133676', '5113644', '5113641', '5113642', '5113643', '5129267', '5129255', '5143422', '5139528', '5143423', '5145833', '5139527', '5147797', '5147796', '5145834', '5079753', '5079752', '5106673', '5106671', '5106674', '5106672', '5088519', '5097336', '5097335', '5011918', '5136558'];
  const BARALHO_CODES = ['5147797', '5147796'];
  const SACOLA_CODES = ['5133676', '5113644'];

  // ── 6. Comparação de Turnos ───────────────────────────────────────────────
  const turnosComparacao = useMemo(() => {
    const turnos = {
      manha: { id: "manha", nome: "Manhã (10h às 13h40)", cupons: 0, vNF: 0, desconto: 0, cpf: 0, vendedores: new Set<string>(), itens: 0, isAdicional: 0, isRetirada: 0, SLP: 0 },
      tarde: { id: "tarde", nome: "Tarde (13h40 às 18h20)", cupons: 0, vNF: 0, desconto: 0, cpf: 0, vendedores: new Set<string>(), itens: 0, isAdicional: 0, isRetirada: 0, SLP: 0 },
      noite: { id: "noite", nome: "Noite (18h20 às 22h)", cupons: 0, vNF: 0, desconto: 0, cpf: 0, vendedores: new Set<string>(), itens: 0, isAdicional: 0, isRetirada: 0, SLP: 0 }
    };
    
    for (const s of sales) {
      if (!s.dhEmi) continue;
      const d = parseISO(s.dhEmi);
      const h = getHours(d);
      const m = getMinutes(d);
      
      let turno: keyof typeof turnos;
      if (h < 13 || (h === 13 && m < 40)) {
        turno = "manha";
      } else if (h < 18 || (h === 18 && m < 20)) {
        turno = "tarde";
      } else {
        turno = "noite";
      }
      
      const bucket = turnos[turno];
      bucket.cupons++;
      bucket.vNF += parseFloat(s.vNF) || 0;
      if (parseFloat(s.desconto_total) > 0) bucket.desconto++;
      if (s.cpf_cnpj_dest) bucket.cpf++;
      if (s.vendedor && s.vendedor !== "COLABORADOR NÃO IDENTIFICADO") bucket.vendedores.add(s.vendedor);
      
      const qItens = parseFloat(s.itens_qtd) || 0;
      bucket.itens += qItens;
      if (s.is_adicional) bucket.isAdicional++;
      const isRetirada = s.is_retirada_online || Object.values(s.itens).some(i => i.xProd.toLowerCase().includes("sacola") && !SACOLA_CODES.includes(i.cProd));
      if (isRetirada) bucket.isRetirada++;
      
      // Contabiliza SLP e Social usando os códigos oficiais
      Object.values(s.itens).forEach(item => {
        if (SLP_CODES.includes(item.cProd) || SOCIAL_CODES.includes(item.cProd)) {
           bucket.SLP += item.qCom;
        }
      });
    }
    
    const fmt = (t: typeof turnos.manha) => ({
      ...t,
      tkm: t.cupons > 0 ? t.vNF / t.cupons : 0,
      pa: t.cupons > 0 ? t.itens / t.cupons : 0, // Peças por Atendimento
      pDesconto: t.cupons > 0 ? (t.desconto / t.cupons) * 100 : 0,
      pCpf: t.cupons > 0 ? (t.cpf / t.cupons) * 100 : 0,
      tamanhoEq: t.vendedores.size
    });
    
    return [fmt(turnos.manha), fmt(turnos.tarde), fmt(turnos.noite)];
  }, [sales]);

  // ── 7. Sugestão de Almoço (12h30 às 17h) ──────────────────────────────────
  const sugestoesAlmoco = useMemo(() => {
    const janelas: { slotInicio: string, slotFim: string, pressaoMedia: number, avgCupons: number }[] = [];
    const tlMap = new Map(concorrenciaTimeline.map(s => [s.slot, s]));
    
    const possibleStarts = [
      "12:30", "12:45", "13:00", "13:15", "13:30", "13:45", 
      "14:00", "14:15", "14:30", "14:45", "15:00", "15:15", 
      "15:30", "15:45", "16:00"
    ];
    
    for (const start of possibleStarts) {
      const parts = start.split(":");
      const h = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      
      const endH = h + 1;
      const endStr = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      
      let totalPressao = 0;
      let totalCupons = 0;
      let validSlots = 0;
      
      for(let step=0; step<2; step++) {
        let curM = m + (step * 30);
        let curH = h + Math.floor(curM / 60);
        curM = curM % 60;
        const curSlot = `${String(curH).padStart(2, '0')}:${String(curM).padStart(2, '0')}`;
        
        const cell = tlMap.get(curSlot);
        if (cell) {
          totalPressao += cell.pressao;
          totalCupons += cell.cupons;
          validSlots++;
        }
      }
      
      if (validSlots === 2) {
        janelas.push({
          slotInicio: start,
          slotFim: endStr,
          pressaoMedia: +(totalPressao / 2).toFixed(2),
          avgCupons: +(totalCupons / 2).toFixed(1)
        });
      }
    }
    
    return janelas.sort((a, b) => a.pressaoMedia - b.pressaoMedia).slice(0, 5);
  }, [concorrenciaTimeline]);

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getBarColor = (pressao: number) => {
    if (pressao > limiarGargalo * 1.3) return "#ef4444";
    if (pressao > limiarGargalo) return "#f97316";
    return "#22c55e";
  };

  const sections: { id: SectionId; label: string; icon: React.ElementType; color: string }[] = [
    { id: "concorrencia", label: "Concorrência de Atendimentos", icon: Users, color: "text-blue-600" },
    { id: "turnos", label: "Comparativo de Desempenho por Turno", icon: Activity, color: "text-indigo-600" },
    { id: "almoco", label: "Sugestão de Horários de Almoço", icon: Timer, color: "text-emerald-600" },
    { id: "ritmo", label: "Ritmo Individual por Colaborador", icon: Timer, color: "text-purple-600" },
    { id: "ondas", label: "Ondas de Demanda Recorrentes", icon: Flame, color: "text-orange-500" },
    { id: "morto", label: "Ausências em Horário de Pico", icon: UserX, color: "text-rose-600" },
    { id: "qualidade", label: "Impacto do Gargalo na Qualidade", icon: TrendingDown, color: "text-amber-600" },
    { id: "causa_raiz", label: "Diagnóstico de Causa-Raiz por Colaborador", icon: Brain, color: "text-violet-600" },
    { id: "isolamento", label: "Isolar Causa: Pressão × Equipe × Fator Humano", icon: Target, color: "text-indigo-600" },
  ];

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
        <Activity className="w-16 h-16 opacity-30" />
        <p className="text-sm font-bold uppercase tracking-widest">Carregue XMLs para analisar o ritmo operacional</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
          <div className="bg-white/10 p-3 rounded-2xl w-fit">
            <Activity className="w-8 h-8 text-orange-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Ritmo Operacional</h2>
            <p className="text-slate-300 text-sm font-medium mt-1">
              Análise de concorrência, ritmo e gargalos com base nos timestamps dos XMLs
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Stat label="Total de Vendas" value={String(sales.length)} />
            <Stat label="Dias Analisados" value={String(days.length)} />
            <Stat 
              label="Limiar de Gargalo" 
              value={`${limiarGargalo.toFixed(1)}x`} 
              highlight 
              tooltip="Indica o ponto onde a equipe começa a perder qualidade por excesso de atendimentos simultâneos."
            />
          </div>
        </div>
        
        {/* Nova seção de Insights Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
          <QuickInsight 
            icon={Users} 
            title="Concorrência" 
            desc="Mede quantos clientes cada vendedor atende ao mesmo tempo." 
            impact="Impacta no TKM e na satisfação do cliente." 
          />
          <QuickInsight 
            icon={Timer} 
            title="Ritmo" 
            desc="O tempo médio entre uma venda e outra de cada vendedor." 
            impact="Revela agilidade ou possíveis ociosidades." 
          />
          <QuickInsight 
            icon={TrendingDown} 
            title="Gargalos" 
            desc="Momentos onde a demanda supera a capacidade da equipe." 
            impact="Causa perda de PA e cadastros de CPF." 
          />
          <QuickInsight 
            icon={Zap} 
            title="Ondas" 
            desc="Padrões recorrentes de fluxo por dia e hora." 
            impact="Essencial para planejar escalas e folgas." 
          />
        </div>
      </div>

      {/* Sections */}
      {sections.map(({ id, label, icon: Icon, color }) => (
        <div key={id} className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <button
            onClick={() => setOpenSection(prev => prev === id ? "concorrencia" : id)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl bg-slate-100", color.replace("text", "text"))}>
                <Icon className={cn("w-5 h-5", color)} />
              </div>
              <span className="font-black text-slate-700 uppercase tracking-tight text-sm">{label}</span>
            </div>
            {openSection === id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSection === id && (
            <div className="px-5 pb-6 space-y-5 border-t border-slate-100 pt-5">

              {/* ── 1. Concorrência ── */}
              {id === "concorrencia" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filtrar por dia:</span>
                    <button onClick={() => setSelectedDay(null)} className={cn("px-3 py-1 rounded-full text-xs font-bold transition-all", selectedDay === null ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>Todos</button>
                    {DAYS.map((d, i) => (
                      <button key={d} onClick={() => setSelectedDay(prev => prev === i ? null : i)} className={cn("px-3 py-1 rounded-full text-xs font-bold transition-all", selectedDay === i ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>{d}</button>
                    ))}
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs text-blue-800 font-black uppercase tracking-tight">O que é a Pressão de Atendimento?</p>
                        <p className="text-[11px] text-blue-700 leading-relaxed">
                          É a relação entre o volume de cupons e a quantidade de vendedores ativos. 
                          Se a pressão é <strong>2.0</strong>, significa que cada vendedor está cuidando de 2 atendimentos simultaneamente no caixa/pista.
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-blue-100 flex flex-wrap gap-x-4 gap-y-1 text-[10px] items-center">
                       <span className="text-slate-500 font-bold uppercase">Legenda:</span>
                       <span className="flex items-center gap-1.5 text-emerald-600 font-black"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/> {'Saudável (<'} {limiarGargalo.toFixed(1)}{'x)'}</span>
                       <span className="flex items-center gap-1.5 text-orange-500 font-black"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block"/> {'Alerta (>'} {limiarGargalo.toFixed(1)}{'x)'}</span>
                       <span className="flex items-center gap-1.5 text-red-600 font-black"><span className="w-2 h-2 rounded-full bg-red-600 inline-block"/> {'Crítico (>'} {(limiarGargalo * 1.3).toFixed(1)}{'x)'}</span>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={concorrenciaTimeline} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="slot" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={3} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={28} />
                      <Tooltip
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", fontSize: 12 }}
                        formatter={(v: number, name: string) => [v, name === "cupons" ? "Cupons/slot (média)" : name === "colaboradores" ? "Colaboradores ativos" : "Pressão"]}
                      />
                      <Bar dataKey="cupons" name="cupons" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                        {concorrenciaTimeline.map((entry, i) => (
                          <Cell key={i} fill={getBarColor(entry.pressao)} />
                        ))}
                      </Bar>
                      <Line type="monotone" dataKey="colaboradores" stroke="#6366f1" strokeWidth={2} dot={false} name="colaboradores" />
                      <ReferenceLine y={limiarGargalo} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Gargalo", position: "insideRight", fontSize: 10, fill: "#ef4444" }} />
                    </BarChart>
                  </ResponsiveContainer>

                  {topSlots.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">⚠️ Slots mais críticos</p>
                        <p className="text-[10px] text-slate-400 font-bold italic">Clique para ver detalhes por colaborador</p>
                      </div>
                      <div className="space-y-2">
                        {topSlots.map((s, i) => (
                          <div key={i} className="flex flex-col gap-2">
                            <button 
                              onClick={() => setExpandedSlot(prev => prev === s.slot ? null : s.slot)}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                                expandedSlot === s.slot 
                                  ? "bg-rose-100 border-rose-300 ring-2 ring-rose-200" 
                                  : "bg-rose-50 border-rose-100 hover:bg-rose-100/50"
                              )}
                            >
                              <span className="text-sm font-black text-rose-700 w-12">{s.slot}</span>
                              <div className="flex-1">
                                <Progress value={Math.min((s.pressao / (limiarGargalo * 2)) * 100, 100)} className="h-2 bg-rose-100" />
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black text-rose-700">{s.pressao.toFixed(1)}x</span>
                                <span className="text-[10px] text-rose-400 ml-1">pressão</span>
                              </div>
                              <Badge className={cn("text-[10px] font-black border-none", s.pressao > limiarGargalo * 1.3 ? "bg-red-600 text-white" : "bg-orange-500 text-white")}>
                                {s.pressao > limiarGargalo * 1.3 ? "CRÍTICO" : "ALTO"}
                              </Badge>
                              {expandedSlot === s.slot ? <ChevronUp className="w-4 h-4 text-rose-400" /> : <ChevronDown className="w-4 h-4 text-rose-400" />}
                            </button>

                            {/* Details forexpanded slot */}
                            {expandedSlot === s.slot && expandedSlotDetails && (
                              <div className="mx-2 p-4 bg-white rounded-xl border border-rose-200 shadow-inner space-y-4 animate-in slide-in-from-top-2 duration-300">
                                {expandedSlotDetails.map((dayGroup, idx) => (
                                  <div key={idx} className="space-y-2">
                                    <div className="flex items-center gap-2 border-b border-slate-100 pb-1">
                                      <div className="w-2 h-2 rounded-full bg-rose-400" />
                                      <span className="text-[10px] font-black text-slate-500 uppercase">
                                        {format(parseISO(dayGroup.day), "dd/MM (EEEE)", { locale: ptBR })}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-1">
                                      {dayGroup.sales.sort((a, b) => a.dhEmi.localeCompare(b.dhEmi)).map((sale, sIdx) => (
                                        <div key={sIdx} className="flex items-center justify-between py-1 px-2 hover:bg-slate-50 rounded-lg text-[11px]">
                                          <div className="flex items-center gap-3">
                                            <span className="font-bold text-slate-400">{format(parseISO(sale.dhEmi), "HH:mm:ss")}</span>
                                            <span className="font-black text-slate-700 uppercase">{sale.vendedor || "DESCONHECIDO"}</span>
                                          </div>
                                          <span className="font-bold text-emerald-600">{fmtBRL(parseFloat(sale.vNF))}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── 1.5. Comparativo de Turnos ── */}
              {id === "turnos" && (
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-indigo-700 font-medium">
                      O desempenho de cada turno revela onde a loja converte melhor, ajudando a ajustar metas ou alocar os vendedores mais ágeis no momento certo.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {turnosComparacao.map((turno) => (
                      <div key={turno.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <h3 className="font-black text-slate-700 text-sm uppercase">{turno.nome}</h3>
                          <Badge className="bg-white text-slate-600 border-slate-200 shadow-sm text-[9px]">{turno.tamanhoEq} Vends.</Badge>
                        </div>
                        
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Faturamento</p>
                            <p className="text-xl font-black text-indigo-600">{fmtBRL(turno.vNF)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cupons</p>
                            <p className="text-lg font-black text-slate-700">{turno.cupons}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div className="bg-white p-2 border border-slate-100 rounded-lg shadow-sm">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Ticket M. (TKM)</p>
                            <p className="text-sm font-black text-slate-700">{fmtBRL(turno.tkm)}</p>
                          </div>
                          <div className="bg-white p-2 border border-slate-100 rounded-lg shadow-sm">
                             <p className="text-[9px] font-bold text-slate-400 uppercase">Peças/Atend. (PA)</p>
                            <p className="text-sm font-black text-slate-700">{turno.pa.toFixed(1)} itens</p>
                          </div>
                        </div>

                        <div className="bg-indigo-900/5 p-2 rounded-lg border border-indigo-100">
                          <p className="text-[9px] font-black text-indigo-700 uppercase tracking-tighter mb-1">Impacto no Fluxo</p>
                          <p className="text-[10px] text-slate-600 leading-tight">
                            Este turno representa <strong>{((turno.cupons / (turnosComparacao.reduce((a,b) => a+b.cupons, 0) || 1)) * 100).toFixed(0)}%</strong> do movimento diário.
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-100">
                          <div>
                            <p className="text-[9px] font-bold text-emerald-500 uppercase">Adicionais</p>
                            <p className="text-xs font-black text-slate-700">{turno.isAdicional}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-indigo-400 uppercase">Retiradas</p>
                            <p className="text-xs font-black text-slate-700">{turno.isRetirada}</p>
                          </div>
                           <div>
                            <p className="text-[9px] font-bold text-rose-400 uppercase">SLP/Social</p>
                            <p className="text-xs font-black text-slate-700">{turno.SLP}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 1.6. Sugestão de Almoço ── */}
              {id === "almoco" && (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-800 font-medium">
                      Os horários abaixo representam os momentos de menor pressão por atendimento entre 12h30 e 17h, ideais para janelas de almoço de 1 hora sem comprometer as vendas.
                    </p>
                  </div>
                  
                  {sugestoesAlmoco.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-sm font-bold">Sem dados suficientes para horários neste período.</div>
                  ) : (
                    <div className="space-y-3">
                      {sugestoesAlmoco.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-4 bg-white border border-emerald-100 p-4 rounded-xl shadow-sm relative overflow-hidden">
                          {idx === 0 && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />}
                          <div className="flex flex-col items-center justify-center bg-emerald-50 text-emerald-700 rounded-lg p-3 w-24 shrink-0">
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Melhor</span>
                            <span className="text-lg font-black">{idx + 1}º</span>
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">
                              {s.slotInicio} às {s.slotFim}
                            </h3>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" /> 
                                Pressão: <span className={s.pressaoMedia < 1.0 ? "text-emerald-600" : "text-amber-600"}>{s.pressaoMedia}x</span>
                              </span>
                              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <Activity className="w-3.5 h-3.5" /> 
                                Fluxo médio: <span className="text-slate-700">{s.avgCupons} cupons</span>
                              </span>
                            </div>
                          </div>
                          
                          {idx === 0 && (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-sm shrink-0">RECOMENDADO</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── 2. Ritmo individual ── */}
              {id === "ritmo" && (
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-purple-700 font-medium">
                      <strong>Entenda o Ritmo:</strong> Mede o tempo de "fôlego" entre vendas. 
                      Intervalos muito curtos (abaixo de 5 min) podem indicar cupons divididos. 
                      Intervalos muito longos em horários de pico podem indicar dificuldade na abordagem ou ociosidade.
                    </p>
                    <div className="mt-2 pt-2 border-t border-purple-100 text-[10px] text-purple-600 font-bold uppercase flex gap-4">
                       <span>Média Equipe: {medianaGeral} min</span>
                    </div>
                  </div>
                  {ritmoColaboradores.map((r, i) => {
                    const isLento = r.mediana > medianaGeral * 1.5;
                    const isIrregular = r.desvio > r.mediana;
                    return (
                      <div key={i} className={cn("p-4 rounded-xl border", isLento ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100")}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className={cn("text-sm font-black", isLento ? "text-rose-700" : "text-slate-700")}>{r.nome}</span>
                            <div className="flex gap-2 mt-1">
                              {isLento && <Badge className="bg-rose-100 text-rose-700 border-none text-[10px] font-black">RITMO BAIXO</Badge>}
                              {isIrregular && <Badge className="bg-amber-100 text-amber-700 border-none text-[10px] font-black">IRREGULAR</Badge>}
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 font-bold">{r.nVendas} vendas</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <RitmoStat label="Mediana" value={`${r.mediana} min`} color={isLento ? "text-rose-600" : "text-purple-600"} />
                          <RitmoStat label="Desvio" value={`±${r.desvio} min`} color={isIrregular ? "text-amber-600" : "text-slate-500"} />
                          <RitmoStat label="Maior Gap" value={`${r.maxGap} min`} color={r.maxGap > 45 ? "text-rose-500" : "text-slate-500"} />
                        </div>
                        <div className="mt-2">
                          <Progress value={Math.min((r.mediana / (medianaGeral * 2.5)) * 100, 100)} className="h-1.5 bg-slate-200" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── 3. Ondas recorrentes ── */}
              {id === "ondas" && (
                <div className="space-y-3">
                  <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-orange-700 font-medium">
                      Média de colaboradores simultâneos por hora e dia da semana. Células mais escuras = mais atendimentos ocorrendo ao mesmo tempo.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 text-slate-400 font-bold text-left w-12">Hora</th>
                          {DAYS.map(d => <th key={d} className="p-2 text-slate-500 font-black">{d}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {ondasHeatmap.hours.map(hour => (
                          <tr key={hour}>
                            <td className="p-1 text-slate-400 font-bold text-left">{hour}h</td>
                            {[0, 1, 2, 3, 4, 5, 6].map(dow => {
                              const cell = ondasHeatmap.map[dow][hour];
                              const avg = cell && cell.count > 0 ? cell.sum / cell.count : 0;
                              const intensity = avg / maxOnda;
                              const bg = intensity > 0.8 ? "bg-red-500 text-white" :
                                intensity > 0.6 ? "bg-orange-400 text-white" :
                                intensity > 0.4 ? "bg-amber-300 text-amber-900" :
                                intensity > 0.2 ? "bg-yellow-100 text-yellow-800" :
                                avg > 0 ? "bg-slate-100 text-slate-500" : "bg-white text-slate-200";
                              return (
                                <td key={dow} className={cn("p-1.5 rounded-lg m-0.5 font-bold transition-all", bg)} title={`${DAYS[dow]} ${hour}h: ${avg.toFixed(1)} col. simultâneos`}>
                                  {avg > 0 ? avg.toFixed(1) : "·"}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── 4. Tempo morto ── */}
              {id === "morto" && (
                <div className="space-y-3">
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-rose-700 font-medium">
                      Contagem de vezes que o colaborador estava ativo no dia mas <strong>não registrou venda</strong> durante um slot de gargalo.
                      Pode indicar pausa estratégica, dificuldade ou ociosidade. Use como ponto de conversa, não acusação.
                    </p>
                  </div>
                  {tempoMorto.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-bold">Nenhuma ausência em pico detectada</p>
                    </div>
                  ) : tempoMorto.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-sm font-black text-slate-700 flex-1">{t.nome}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min((t.ausencias / (tempoMorto[0]?.ausencias || 1)) * 100, 100)} className="h-2 w-24 bg-slate-200" />
                        <span className="text-xs font-black text-rose-600 w-16 text-right">{t.ausencias}× ausente</span>
                      </div>
                      <Badge className={cn("text-[10px] font-black border-none", t.ausencias > 10 ? "bg-rose-600 text-white" : t.ausencias > 5 ? "bg-orange-400 text-white" : "bg-slate-200 text-slate-600")}>
                        {t.ausencias > 10 ? "ALTO" : t.ausencias > 5 ? "MÉDIO" : "BAIXO"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* ── 5. Impacto na qualidade ── */}
              {id === "qualidade" && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">
                      <strong>Evidência de Pressão:</strong> Quando a loja está cheia (Gargalo), os indicadores costumam cair porque o atendimento fica apressado. 
                      Se o seu <strong>TKM</strong> cai muito no gargalo, você está perdendo vendas de maior valor por falta de tempo para argumentar.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <QualCard
                      label="Ticket Médio (TKM)"
                      gargalo={fmtBRL(qualidadeComparacao.gargalo.tkm)}
                      normal={fmtBRL(qualidadeComparacao.normal.tkm)}
                      delta={qualidadeComparacao.gargalo.tkm - qualidadeComparacao.normal.tkm}
                      isCurrency
                    />
                    <QualCard
                      label="PA (Peças/Atend.)"
                      gargalo={qualidadeComparacao.gargalo.pa.toFixed(2)}
                      normal={qualidadeComparacao.normal.pa.toFixed(2)}
                      delta={qualidadeComparacao.gargalo.pa - qualidadeComparacao.normal.pa}
                    />
                    <QualCard
                      label="% de Desconto Aplicado"
                      gargalo={`${qualidadeComparacao.gargalo.pDesconto}%`}
                      normal={`${qualidadeComparacao.normal.pDesconto}%`}
                      delta={qualidadeComparacao.gargalo.pDesconto - qualidadeComparacao.normal.pDesconto}
                      inverseColor
                    />
                    <QualCard
                      label="% CPF Identificado"
                      gargalo={`${qualidadeComparacao.gargalo.pCpf}%`}
                      normal={`${qualidadeComparacao.normal.pCpf}%`}
                      delta={qualidadeComparacao.gargalo.pCpf - qualidadeComparacao.normal.pCpf}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendas em Gargalo</p>
                      <p className="text-2xl font-black text-rose-600">{qualidadeComparacao.gargalo.cupons}</p>
                      <p className="text-[10px] text-slate-400">{sales.length > 0 ? ((qualidadeComparacao.gargalo.cupons / sales.length) * 100).toFixed(1) : 0}% do total</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendas em Horário Normal</p>
                      <p className="text-2xl font-black text-emerald-600">{qualidadeComparacao.normal.cupons}</p>
                      <p className="text-[10px] text-slate-400">{sales.length > 0 ? ((qualidadeComparacao.normal.cupons / sales.length) * 100).toFixed(1) : 0}% do total</p>
                    </div>
                  </div>
                </div>
              )}
              {/* ── Causa-Raiz ── */}
              {id === "causa_raiz" && (
                <div className="space-y-4">
                  <div className="p-4 bg-violet-50 border border-violet-100 rounded-xl flex items-start gap-2">
                    <Brain className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-violet-800 font-black uppercase tracking-tight mb-1">
                        Como lemos a Causa-Raiz?
                      </p>
                      <p className="text-[11px] text-violet-700 leading-relaxed">
                        Cada colaborador é avaliado em <strong>3 contextos de pressão</strong>:
                        {" "}<span className="text-rose-600 font-black">Gargalo</span> (alta demanda),
                        {" "}<span className="text-amber-600 font-black">Moderado</span> e
                        {" "}<span className="text-emerald-600 font-black">Ritmo Livre</span> (baixa pressão).
                        {" "}Se PA/TKM é bom no livre mas cai no gargalo → <strong>causa operacional</strong> (estrutural).
                        {" "}Se PA/TKM é baixo mesmo no ritmo livre → <strong>causa comportamental</strong> (habilidade/engajamento).
                      </p>
                    </div>
                  </div>

                  {/* Legendas de causa */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-100">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span className="text-[10px] font-black text-rose-700 uppercase">Causa Operacional</span>
                      <span className="text-[10px] text-rose-500">— queda só no gargalo, bom no livre</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-[10px] font-black text-amber-700 uppercase">Padrão Misto</span>
                      <span className="text-[10px] text-amber-500">— pressão contribui mas não é único fator</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 border border-violet-100">
                      <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                      <span className="text-[10px] font-black text-violet-700 uppercase">Causa Interna</span>
                      <span className="text-[10px] text-violet-500">— baixo desempenho mesmo sem pressão</span>
                    </div>
                  </div>

                  {/* Cards por colaborador */}
                  <div className="space-y-3">
                    {causaRaizDiagnostico.length === 0 ? (
                      <div className="py-10 text-center text-slate-400">
                        <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-bold">Dados insuficientes para diagnóstico</p>
                      </div>
                    ) : causaRaizDiagnostico.map((v, i) => {
                      const causaConfig = {
                        pressao: { bg: "bg-rose-50 border-rose-200", badge: "bg-rose-100 text-rose-700", label: "PRESSÃO OPERACIONAL", icon: "🏭" },
                        misto:   { bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-700", label: "PADRÃO MISTO", icon: "⚡" },
                        interno: { bg: "bg-violet-50 border-violet-200", badge: "bg-violet-100 text-violet-700", label: "CAUSA INTERNA", icon: "💡" },
                        desconhecido: { bg: "bg-slate-50 border-slate-200", badge: "bg-slate-100 text-slate-500", label: "SEM DADOS", icon: "❓" },
                      }[v.causaLabel];

                      return (
                        <div key={i} className={cn("rounded-2xl border p-4 space-y-4 transition-all hover:shadow-sm", causaConfig.bg)}>
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-black text-slate-800 uppercase">{v.nome}</span>
                                <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full", causaConfig.badge)}>
                                  {causaConfig.icon} {causaConfig.label}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium italic leading-snug max-w-lg">{v.causaRazao}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[8px] font-black text-slate-400 uppercase">Total</p>
                              <p className="text-sm font-black text-slate-600">{v.totalCupons} NFs</p>
                            </div>
                          </div>

                          {/* Grid de PA por nível de pressão */}
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">PA (Peças/Atend.) por Nível de Pressão</p>
                            <div className="grid grid-cols-3 gap-2">
                              {/* GARGALO */}
                              <div className="text-center p-3 bg-rose-100/60 rounded-xl">
                                <p className="text-[8px] font-black text-rose-500 uppercase mb-1">Gargalo</p>
                                <p className={cn("text-xl font-black", v.paGargalo !== null ? (v.paGargalo < 1.5 ? "text-rose-600" : v.paGargalo >= 2.5 ? "text-emerald-600" : "text-amber-600") : "text-slate-300")}>
                                  {v.paGargalo !== null ? v.paGargalo.toFixed(1) : "—"}
                                </p>
                                <p className="text-[8px] text-rose-400 font-bold">{v.cuponsGargalo} NFs</p>
                              </div>
                              {/* MÉDIO */}
                              <div className="text-center p-3 bg-amber-100/60 rounded-xl">
                                <p className="text-[8px] font-black text-amber-600 uppercase mb-1">Moderado</p>
                                <p className={cn("text-xl font-black", v.paMedio !== null ? (v.paMedio < 1.5 ? "text-rose-600" : v.paMedio >= 2.5 ? "text-emerald-600" : "text-amber-600") : "text-slate-300")}>
                                  {v.paMedio !== null ? v.paMedio.toFixed(1) : "—"}
                                </p>
                              </div>
                              {/* LIVRE */}
                              <div className="text-center p-3 bg-emerald-100/60 rounded-xl">
                                <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Ritmo Livre</p>
                                <p className={cn("text-xl font-black", v.paLivre !== null ? (v.paLivre < 1.5 ? "text-rose-600" : v.paLivre >= 2.5 ? "text-emerald-600" : "text-amber-600") : "text-slate-300")}>
                                  {v.paLivre !== null ? v.paLivre.toFixed(1) : "—"}
                                </p>
                                <p className="text-[8px] text-emerald-500 font-bold">{v.cuponsLivre} NFs</p>
                              </div>
                            </div>

                            {/* Barra visual PA Livre → Gargalo */}
                            {v.paLivre !== null && v.paGargalo !== null && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[9px] text-emerald-600 font-black w-8 text-right">{v.paLivre.toFixed(1)}</span>
                                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden relative">
                                  <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-rose-500 rounded-full"
                                    style={{ width: `${Math.min((v.paLivre / 5) * 100, 100)}%` }}
                                  />
                                  <div
                                    className="absolute top-0 h-full bg-rose-500/30 rounded-r-full border-l-2 border-rose-500"
                                    style={{
                                      left: `${Math.min((v.paGargalo / 5) * 100, 100)}%`,
                                      width: `${Math.max(0, Math.min((v.paLivre / 5) * 100 - (v.paGargalo / 5) * 100, 100))}%`
                                    }}
                                  />
                                </div>
                                <span className="text-[9px] text-rose-500 font-black w-8">{v.paGargalo.toFixed(1)}</span>
                              </div>
                            )}
                          </div>

                          {/* TKM por nível */}
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-black/5">
                            <div className="text-center">
                              <p className="text-[8px] font-black text-slate-400 uppercase">TKM Gargalo</p>
                              <p className="text-xs font-black text-rose-500">{v.tkmGargalo !== null ? fmtBRL(v.tkmGargalo) : "—"}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[8px] font-black text-slate-400 uppercase">TKM Moderado</p>
                              <p className="text-xs font-black text-amber-600">{v.tkmMedio !== null ? fmtBRL(v.tkmMedio) : "—"}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[8px] font-black text-slate-400 uppercase">TKM Livre</p>
                              <p className="text-xs font-black text-emerald-600">{v.tkmLivre !== null ? fmtBRL(v.tkmLivre) : "—"}</p>
                            </div>
                          </div>

                          {/* CPF por contexto */}
                          {(v.cpfGargalo !== null || v.cpfLivre !== null) && (
                            <div className="flex gap-4 pt-1 border-t border-black/5 text-[10px]">
                              <span className="text-slate-400 font-bold">CPF:</span>
                              {v.cpfGargalo !== null && <span>Gargalo: <strong className="text-rose-600">{v.cpfGargalo.toFixed(0)}%</strong></span>}
                              {v.cpfLivre !== null && <span>Livre: <strong className="text-emerald-600">{v.cpfLivre.toFixed(0)}%</strong></span>}
                            </div>
                          )}

                          {/* Recomendação contextual */}
                          <div className={cn(
                            "p-3 rounded-xl border text-[10px] font-medium leading-relaxed",
                            v.causaLabel === "pressao" ? "bg-rose-900/5 border-rose-200 text-rose-700" :
                            v.causaLabel === "interno" ? "bg-violet-900/5 border-violet-200 text-violet-700" :
                            "bg-amber-900/5 border-amber-200 text-amber-700"
                          )}>
                            <div className="flex items-start gap-2">
                              <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
                              {v.causaLabel === "pressao" && (
                                <span>Este colaborador tem potencial técnico — <strong>a queda vem da carga operacional</strong>. Prioridade: reposicioná-lo fora do balcão nos horários de gargalo para que possa fazer atendimento consultivo.</span>
                              )}
                              {v.causaLabel === "interno" && (
                                <span>O desempenho é consistentemente baixo <strong>independente da pressão</strong>. Requer capacitação ativa, acompanhamento de atendimento ou revisão de engajamento (meta, feedback, desafios técnicos).</span>
                              )}
                              {v.causaLabel === "misto" && (
                                <span>Há impacto operacional mas o PA livre também tem espaço de melhora. Ação dupla: <strong>reduzir exposição ao gargalo</strong> e trabalhar consultividade no ritmo livre.</span>
                              )}
                              {v.causaLabel === "desconhecido" && (
                                <span>Dados insuficientes por nível de pressão. Acompanhar por mais dias para diagnóstico conclusivo.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Isolamento de Causa ── */}
              {id === "isolamento" && (
                <div className="space-y-8">
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-3">
                    <Target className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-indigo-800 uppercase tracking-tight mb-1">Como usar este painel</p>
                      <p className="text-[11px] text-indigo-700 leading-relaxed">
                        Três lentes para separar o que é <strong>estrutural</strong> (pressão, equipe reduzida)
                        do que é <strong>comportamental</strong> (habilidade, engajamento). Use as três em conjunto para uma conclusão mais robusta.
                      </p>
                    </div>
                  </div>

                  {/* LENTE 1: Dispersão entre pares */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Lente 1 — Dispersão entre Pares no Mesmo Slot</p>
                        <p className="text-[10px] text-slate-400">Se dois colaboradores dividem o mesmo horário e um vai muito melhor, o ambiente não explica — é fator humano.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Slots c/ Dispersão</p>
                        <p className="text-2xl font-black text-slate-700">{paDispersao.totalSlots}</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                        <p className="text-[9px] font-black text-amber-500 uppercase">Sob Pressão</p>
                        <p className="text-2xl font-black text-amber-600">{paDispersao.highPressureDispersao}</p>
                        <p className="text-[8px] text-amber-400">ambíguo</p>
                      </div>
                      <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-center">
                        <p className="text-[9px] font-black text-violet-500 uppercase">Ritmo Livre</p>
                        <p className="text-2xl font-black text-violet-600">{paDispersao.lowPressureDispersao}</p>
                        <p className="text-[8px] text-violet-400">⚠ forte sinal humano</p>
                      </div>
                    </div>
                    {paDispersao.vendorDispersao.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quem sistematicamente fica abaixo dos colegas no mesmo horário</p>
                        {paDispersao.vendorDispersao.slice(0, 6).map((v, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                            <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", v.lowRate > 70 ? "bg-rose-500" : v.lowRate > 40 ? "bg-amber-400" : "bg-slate-300")} />
                            <span className="text-sm font-black text-slate-700 flex-1 uppercase">{v.nome}</span>
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full", v.lowRate > 70 ? "bg-rose-500" : v.lowRate > 40 ? "bg-amber-400" : "bg-slate-400")} style={{ width: `${v.lowRate}%` }} />
                            </div>
                            <span className={cn("text-sm font-black w-10 text-right", v.lowRate > 70 ? "text-rose-600" : v.lowRate > 40 ? "text-amber-600" : "text-slate-500")}>{v.lowRate.toFixed(0)}%</span>
                            <span className="text-[10px] text-slate-400">{v.lowCount}/{v.total}</span>
                            {v.lowRate > 60 && <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">CONSISTENTE</span>}
                          </div>
                        ))}
                        {paDispersao.vendorDispersao[0]?.lowRate > 60 && (
                          <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl text-[10px] text-violet-700 flex items-start gap-2">
                            <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>Colaboradores que ficam consistentemente abaixo no mesmo horário são candidatos diretos a acompanhamento de técnica de venda.</span>
                          </div>
                        )}
                      </div>
                    )}
                    {paDispersao.totalSlots === 0 && <p className="py-4 text-center text-slate-400 text-sm">Poucos slots em simultaneidade — aguardar mais dados.</p>}
                  </div>

                  {/* LENTE 2: Equipe × PA */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <Activity className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Lente 2 — Tamanho da Equipe × PA do Dia</p>
                        <p className="text-[10px] text-slate-400">Se dias com menos pessoas têm PA bem menor, o problema é de escala. Se não há correlação, outro fator explica.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 bg-slate-50 border border-slate-100 rounded-xl p-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-3">PA médio por tamanho de equipe</p>
                        <div className="space-y-2">
                          {correlacaoEquipePa.teamSizeGroups.map((g, i) => {
                            const maxPA = Math.max(...correlacaoEquipePa.teamSizeGroups.map(x => x.avgPA), 1);
                            return (
                              <div key={i} className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-500 w-20 shrink-0">{g.teamSize}p ({g.dias}d)</span>
                                <div className="flex-1 h-6 bg-slate-200 rounded-lg overflow-hidden">
                                  <div className={cn("h-full rounded-lg flex items-center pl-2", g.avgPA >= 2.5 ? "bg-emerald-400" : g.avgPA >= 1.8 ? "bg-amber-400" : "bg-rose-400")} style={{ width: `${Math.max((g.avgPA / maxPA) * 100, 12)}%` }}>
                                    <span className="text-[9px] font-black text-white">PA {g.avgPA.toFixed(1)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className={cn("rounded-xl p-3 text-center border flex-1", correlacaoEquipePa.correlation > 0.4 ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200")}>
                          <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Correlação Pearson</p>
                          <p className={cn("text-3xl font-black", correlacaoEquipePa.correlation > 0.4 ? "text-blue-600" : "text-slate-500")}>{correlacaoEquipePa.correlation > 0 ? "+" : ""}{correlacaoEquipePa.correlation}</p>
                          <p className="text-[8px] text-slate-400 mt-1">{correlacaoEquipePa.correlation > 0.5 ? "Escala explica muito" : correlacaoEquipePa.correlation > 0.2 ? "Impacto moderado" : "Pouco impacto da escala"}</p>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-2 text-center"><p className="text-[8px] font-black text-rose-400 uppercase">PA equipe reduzida</p><p className="text-xl font-black text-rose-500">{correlacaoEquipePa.paReduzida.toFixed(1)}</p></div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2 text-center"><p className="text-[8px] font-black text-emerald-500 uppercase">PA equipe normal</p><p className="text-xl font-black text-emerald-600">{correlacaoEquipePa.paNormal.toFixed(1)}</p></div>
                      </div>
                    </div>
                    <div className={cn("p-3 rounded-xl border text-[10px] leading-relaxed flex items-start gap-2", correlacaoEquipePa.correlation > 0.4 ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-600")}>
                      <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{correlacaoEquipePa.correlation > 0.4 ? <><strong>Alta correlação: escala impacta diretamente o PA.</strong> Garantir escala mínima nos picos e revisar política de folgas.</> : correlacaoEquipePa.correlation > 0.2 ? <>Correlação moderada — a equipe contribui mas não explica sozinha. Combine com as outras lentes.</> : <><strong>Tamanho da equipe não explica a variação de PA.</strong> O resultado oscila independente de quantas pessoas estão — fator humano é o candidato principal.</>}</span>
                    </div>
                  </div>

                  {/* LENTE 3: Consistência individual */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Lente 3 — Consistência Individual por Dia</p>
                        <p className="text-[10px] text-slate-400">Alta variação de PA entre dias sem correlação com pressão = engajamento irregular.</p>
                      </div>
                    </div>
                    {consistenciaColaborador.length === 0 ? (
                      <p className="py-6 text-center text-slate-400 text-sm font-bold">Dados insuficientes — necessário ≥3 dias por colaborador.</p>
                    ) : (
                      <div className="space-y-3">
                        {consistenciaColaborador.map((c, i) => {
                          const cfg = {
                            inconsistente:     { bg: "bg-amber-50 border-amber-200",     badge: "bg-amber-100 text-amber-700",     icon: "⚡", label: "INCONSISTENTE",      desc: "PA varia muito entre dias sem relação com pressão — engajamento irregular." },
                            consistente_baixo: { bg: "bg-violet-50 border-violet-200",   badge: "bg-violet-100 text-violet-700",   icon: "💡", label: "BAIXO CONSTANTE",    desc: "PA consistentemente baixo — padrão estabelecido, requer desenvolvimento ativo." },
                            pressionado:       { bg: "bg-rose-50 border-rose-200",       badge: "bg-rose-100 text-rose-700",       icon: "🏭", label: "SENSÍVEL À PRESSÃO",  desc: "PA cai nos dias de maior pressão — a operação está impactando diretamente." },
                            consistente_alto:  { bg: "bg-emerald-50 border-emerald-200", badge: "bg-emerald-100 text-emerald-700", icon: "⭐", label: "CONSISTENTE ALTO",    desc: "Mantém PA estável independente da pressão — referência de atendimento consultivo." },
                          }[c.perfil];
                          return (
                            <div key={i} className={cn("rounded-2xl border p-4 space-y-3 hover:shadow-sm transition-all", cfg.bg)}>
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-sm font-black text-slate-800 uppercase">{c.nome}</span>
                                    <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full", cfg.badge)}>{cfg.icon} {cfg.label}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 italic">{cfg.desc}</p>
                                </div>
                                <span className="text-[9px] text-slate-400 shrink-0">{c.diasAnalisados} dias</span>
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { label: "PA Médio", value: c.meanPA.toFixed(1), color: c.meanPA >= 2.5 ? "text-emerald-600" : c.meanPA >= 1.8 ? "text-amber-600" : "text-rose-600" },
                                  { label: "Desvio", value: `±${c.stdPA.toFixed(1)}`, color: c.stdPA > 0.7 ? "text-amber-600" : "text-slate-500" },
                                  { label: "Min→Max", value: `${c.minPA.toFixed(1)}→${c.maxPA.toFixed(1)}`, color: "text-slate-600" },
                                  { label: "Corr×Pressão", value: `${c.corrPressaoPA > 0 ? "+" : ""}${c.corrPressaoPA}`, color: c.corrPressaoPA < -0.4 ? "text-rose-600" : "text-slate-500" },
                                ].map((m, mi) => (
                                  <div key={mi} className="text-center bg-white/70 rounded-xl p-2 border border-white">
                                    <p className="text-[8px] font-black text-slate-400 uppercase">{m.label}</p>
                                    <p className={cn("text-sm font-black", m.color)}>{m.value}</p>
                                  </div>
                                ))}
                              </div>
                              <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">PA por dia (últimos {Math.min(c.dayPoints.length, 15)})</p>
                                <div className="flex items-end gap-0.5 h-8">
                                  {c.dayPoints.slice(-15).map((d, di) => {
                                    const maxPa = Math.max(...c.dayPoints.map(x => x.pa), 1);
                                    return <div key={di} className={cn("flex-1 rounded-sm min-h-[3px]", d.pa >= 2.5 ? "bg-emerald-400" : d.pa >= 1.8 ? "bg-amber-400" : "bg-rose-400")} style={{ height: `${Math.max((d.pa / maxPa) * 100, 8)}%` }} title={`${d.day}: PA ${d.pa.toFixed(1)}`} />;
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      ))}
    </div>
  );
}


function Stat({ label, value, highlight, tooltip }: { label: string; value: string; highlight?: boolean; tooltip?: string }) {
  return (
    <div className={cn("bg-white/10 px-4 py-2 rounded-2xl border border-white/20 transition-all hover:bg-white/15 cursor-help", highlight && "bg-orange-500/20 border-orange-500/40")}>
      <p className="text-[10px] font-black uppercase text-white/60 tracking-widest leading-none mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <p className={cn("text-xl font-black", highlight ? "text-orange-400" : "text-white")}>{value}</p>
        {tooltip && (
          <div className="group relative">
            <Info className="w-3 h-3 text-white/30" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-[10px] font-bold text-white rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-2xl border border-white/10">
              {tooltip}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickInsight({ icon: Icon, title, desc, impact }: { icon: any, title: string, desc: string, impact: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="p-2 bg-white/10 rounded-xl shrink-0">
        <Icon className="w-4 h-4 text-orange-400" />
      </div>
      <div className="space-y-0.5">
        <h4 className="text-[11px] font-black text-white uppercase tracking-tight">{title}</h4>
        <p className="text-[10px] text-slate-300 leading-tight">{desc}</p>
        <p className="text-[9px] text-indigo-300 font-bold italic leading-tight">impacto: {impact}</p>
      </div>
    </div>
  );
}

function RitmoStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{label}</span>
      <span className={cn("text-sm font-black", color)}>{value}</span>
    </div>
  );
}

function QualCard({ label, gargalo, normal, delta, isCurrency, inverseColor }: {
  label: string; gargalo: string; normal: string; delta: number; isCurrency?: boolean; inverseColor?: boolean;
}) {
  const isBad = inverseColor ? delta > 0 : delta < 0;
  const absDelta = Math.abs(delta);
  const fmtDelta = isCurrency 
    ? absDelta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) 
    : absDelta.toFixed(1) + (typeof gargalo === "string" && gargalo.includes("%") ? "pp" : "");

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-4 shadow-sm group hover:shadow-md transition-all">
      <div className="flex items-center justify-between border-b border-slate-50 pb-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-rose-400 uppercase">Em Gargalo</p>
          <p className="text-xl font-black text-rose-600">{gargalo}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-emerald-400 uppercase">Fluxo Normal</p>
          <p className="text-xl font-black text-emerald-600">{normal}</p>
        </div>
      </div>

      <div className={cn("mt-4 p-3 rounded-xl flex items-center gap-3", isBad ? "bg-rose-50 border border-rose-100" : "bg-emerald-50 border border-emerald-100")}>
        {isBad ? <TrendingDown className="w-5 h-5 text-rose-500" /> : <TrendingUp className="w-5 h-5 text-emerald-500" />}
        <div className="flex-1">
          <p className={cn("text-[10px] font-black uppercase", isBad ? "text-rose-700" : "text-emerald-700")}>
            {isBad ? "Perda de Qualidade" : "Desempenho Estável"}
          </p>
          <p className={cn("text-xs font-bold", isBad ? "text-rose-600" : "text-emerald-600")}>
            {isBad ? "Queda de" : "Ganho de"} {fmtDelta} comparado ao normal
          </p>
        </div>
      </div>
    </div>
  );
}
