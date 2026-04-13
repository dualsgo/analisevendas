
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
  TrendingUp, Info, Flame, UserX, Timer, ChevronDown, ChevronUp
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

const SECTION_IDS = ["concorrencia", "turnos", "almoco", "ritmo", "ondas", "morto", "qualidade"] as const;
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
    const gargalo = { vNF: 0, cupons: 0, desconto: 0, cpf: 0 };
    const normal = { vNF: 0, cupons: 0, desconto: 0, cpf: 0 };
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
    }
    const safe = (n: number, d: number) => d > 0 ? +(n / d).toFixed(2) : 0;
    return {
      gargalo: {
        tkm: safe(gargalo.vNF, gargalo.cupons),
        pDesconto: gargalo.cupons > 0 ? +((gargalo.desconto / gargalo.cupons) * 100).toFixed(1) : 0,
        pCpf: gargalo.cupons > 0 ? +((gargalo.cpf / gargalo.cupons) * 100).toFixed(1) : 0,
        cupons: gargalo.cupons,
      },
      normal: {
        tkm: safe(normal.vNF, normal.cupons),
        pDesconto: normal.cupons > 0 ? +((normal.desconto / normal.cupons) * 100).toFixed(1) : 0,
        pCpf: normal.cupons > 0 ? +((normal.cpf / normal.cupons) * 100).toFixed(1) : 0,
        cupons: normal.cupons,
      },
    };
  }, [sales, slotData, limiarGargalo]);

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
                       <span className="flex items-center gap-1.5 text-emerald-600 font-black"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Saudável (< {limiarGargalo.toFixed(1)}x)</span>
                       <span className="flex items-center gap-1.5 text-orange-500 font-black"><div className="w-2 h-2 rounded-full bg-orange-500"/> Alerta (> {limiarGargalo.toFixed(1)}x)</span>
                       <span className="flex items-center gap-1.5 text-red-600 font-black"><div className="w-2 h-2 rounded-full bg-red-600"/> Crítico (> {(limiarGargalo * 1.3).toFixed(1)}x)</span>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <QualCard
                      label="Ticket Médio (TKM)"
                      gargalo={fmtBRL(qualidadeComparacao.gargalo.tkm)}
                      normal={fmtBRL(qualidadeComparacao.normal.tkm)}
                      delta={qualidadeComparacao.gargalo.tkm - qualidadeComparacao.normal.tkm}
                      isCurrency
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
