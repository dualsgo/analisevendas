"use client";

import React, { useState, useMemo, useEffect } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from "recharts";
import {
  Zap,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Users,
  Eye
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface RealtimeImpactPanelProps {
  data: DetailedSaleRow[];
}

const VENDOR_COLORS = [
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#06b6d4", // Cyan
  "#8b5cf6", // Violet
  "#f97316", // Orange
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#3b82f6", // Blue
  "#a855f7", // Purple
];

interface TimelinePoint {
  index: number;
  time: string;
  timeStr: string;
  vendedor: string;
  vNF: number;
  itens_qtd: number;
  chave: string;
  isTargetVendor: boolean;
  
  // Accumulated store metrics up to this coupon
  storeCupons: number;
  storeItens: number;
  storeVenda: number;
  storePA: number;
  storeTKM: number;

  // Accumulated vendor metrics up to this coupon (for target vendor)
  vendorCupons: number;
  vendorItens: number;
  vendorVenda: number;
  vendorPA: number;
  vendorTKM: number;

  // Delta caused by this specific coupon
  vendorPaDelta: number;
  storePaDelta: number;
  vendorTkmDelta: number;
  storeTkmDelta: number;

  isMonoItem: boolean;
  impactType: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  [key: string]: any;
}

export function RealtimeImpactPanel({ data }: RealtimeImpactPanelProps) {
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [viewAllCollaborators, setViewAllCollaborators] = useState<boolean>(true);
  const [metricMode, setMetricMode] = useState<"pa" | "tkm">("pa");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // ms per step
  const [filterSearch, setFilterSearch] = useState<string>("");

  const formatBRL = (val?: number | string | null) => (Number(val) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatNum = (val?: number | string | null, precision = 2) => (Number(val) || 0).toLocaleString("pt-BR", { minimumFractionDigits: precision, maximumFractionDigits: precision });

  // List of unique vendors
  const vendors = useMemo(() => {
    const set = new Set<string>();
    data.forEach(s => {
      if (s.vendedor && s.vendedor.trim() !== "") {
        set.add(s.vendedor.trim());
      }
    });
    return Array.from(set).sort();
  }, [data]);

  // Color map for vendors
  const vendorColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    vendors.forEach((v, idx) => {
      map[v] = VENDOR_COLORS[idx % VENDOR_COLORS.length];
    });
    return map;
  }, [vendors]);

  // Set default selected vendor when vendors list loads
  useEffect(() => {
    if (vendors.length > 0 && selectedVendor === "all") {
      setSelectedVendor("all");
    }
  }, [vendors, selectedVendor]);

  // Process chronological timeline of all valid coupons
  const timeline = useMemo(() => {
    const validSales = data
      .filter(s => !s.is_cancelada && s.tpNF === 1)
      .sort((a, b) => {
        const da = new Date(a.dhEmi).getTime();
        const db = new Date(b.dhEmi).getTime();
        return da - db;
      });

    let storeCupons = 0;
    let storeItens = 0;
    let storeVenda = 0;

    let prevStorePA = 0;
    let prevStoreTKM = 0;

    const vendorAcc: Record<string, { cupons: number; itens: number; venda: number; prevPA: number; prevTKM: number }> = {};

    vendors.forEach(v => {
      vendorAcc[v] = { cupons: 0, itens: 0, venda: 0, prevPA: 0, prevTKM: 0 };
    });

    const points: TimelinePoint[] = [];

    validSales.forEach((s, idx) => {
      const v = s.vendedor?.trim() || "OUTROS";
      const vNF = parseFloat(s.vNF) || 0;
      const itens_qtd = parseFloat(s.itens_qtd) || 0;
      const dh = parseISO(s.dhEmi);
      const timeStr = !isNaN(dh.getTime()) ? format(dh, "HH:mm:ss") : `Cupom ${idx + 1}`;

      // Update Store Accumulator
      storeCupons += 1;
      storeItens += itens_qtd;
      storeVenda += vNF;

      const currentStorePA = storeCupons > 0 ? storeItens / storeCupons : 0;
      const currentStoreTKM = storeCupons > 0 ? storeVenda / storeCupons : 0;
      const storePaDelta = idx > 0 ? currentStorePA - prevStorePA : 0;
      const storeTkmDelta = idx > 0 ? currentStoreTKM - prevStoreTKM : 0;

      prevStorePA = currentStorePA;
      prevStoreTKM = currentStoreTKM;

      // Update Vendor Accumulator
      if (!vendorAcc[v]) {
        vendorAcc[v] = { cupons: 0, itens: 0, venda: 0, prevPA: 0, prevTKM: 0 };
      }

      const vAcc = vendorAcc[v];
      vAcc.cupons += 1;
      vAcc.itens += itens_qtd;
      vAcc.venda += vNF;

      const currentVendorPA = vAcc.cupons > 0 ? vAcc.itens / vAcc.cupons : 0;
      const currentVendorTKM = vAcc.cupons > 0 ? vAcc.venda / vAcc.cupons : 0;
      const vendorPaDelta = vAcc.cupons > 1 ? currentVendorPA - vAcc.prevPA : 0;
      const vendorTkmDelta = vAcc.cupons > 1 ? currentVendorTKM - vAcc.prevTKM : 0;

      vAcc.prevPA = currentVendorPA;
      vAcc.prevTKM = currentVendorTKM;

      const isMonoItem = itens_qtd <= 1;
      const impactType = itens_qtd >= 2 ? "POSITIVE" : (itens_qtd <= 1 ? "NEGATIVE" : "NEUTRAL");

      const point: TimelinePoint = {
        index: idx,
        time: timeStr,
        timeStr,
        vendedor: v,
        vNF,
        itens_qtd,
        chave: s.chave || `c-${idx}`,
        isTargetVendor: selectedVendor === "all" || v === selectedVendor,
        storeCupons,
        storeItens,
        storeVenda,
        storePA: parseFloat(currentStorePA.toFixed(2)),
        storeTKM: parseFloat(currentStoreTKM.toFixed(2)),
        vendorCupons: vAcc.cupons,
        vendorItens: vAcc.itens,
        vendorVenda: vAcc.venda,
        vendorPA: parseFloat(currentVendorPA.toFixed(2)),
        vendorTKM: parseFloat(currentVendorTKM.toFixed(2)),
        vendorPaDelta,
        storePaDelta,
        vendorTkmDelta,
        storeTkmDelta,
        isMonoItem,
        impactType
      };

      // Add snapshot of ALL vendor metrics up to this timestamp for multi-line comparison
      vendors.forEach(vendKey => {
        const acc = vendorAcc[vendKey];
        if (acc && acc.cupons > 0) {
          point[`pa_${vendKey}`] = parseFloat((acc.itens / acc.cupons).toFixed(2));
          point[`tkm_${vendKey}`] = parseFloat((acc.venda / acc.cupons).toFixed(2));
        }
      });

      points.push(point);
    });

    return points;
  }, [data, vendors, selectedVendor]);

  // Handle Playback Animation Timer
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= timeline.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, timeline.length, playbackSpeed]);

  // Points to display in chart based on current playback step
  const activeTimelinePoints = useMemo(() => {
    if (currentStepIndex < 0) return timeline;
    return timeline.slice(0, currentStepIndex + 1);
  }, [timeline, currentStepIndex]);

  // Current active coupon details
  const activePoint = useMemo(() => {
    if (timeline.length === 0) return null;
    if (currentStepIndex < 0) return timeline[timeline.length - 1];
    return timeline[Math.min(currentStepIndex, timeline.length - 1)];
  }, [timeline, currentStepIndex]);

  // Filtered timeline points for selected vendor
  const vendorPoints = useMemo(() => {
    if (selectedVendor === "all") return timeline;
    return timeline.filter(p => p.vendedor === selectedVendor);
  }, [timeline, selectedVendor]);

  // Search filtered points for the bottom log
  const logPoints = useMemo(() => {
    let list = selectedVendor === "all" ? timeline : vendorPoints;
    if (filterSearch.trim() !== "") {
      const query = filterSearch.toLowerCase();
      list = list.filter(p => p.vendedor.toLowerCase().includes(query) || p.timeStr.includes(query));
    }
    return list;
  }, [timeline, vendorPoints, selectedVendor, filterSearch]);

  const targetVendorName = selectedVendor === "all" ? "Loja Consolidada" : selectedVendor;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16">
      {/* HEADER CONTROL BAR */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 md:p-6 shadow-xl border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 text-indigo-400 p-3 rounded-2xl border border-indigo-500/30">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white">
                Impacto em Tempo Real (Atendimento a Atendimento)
              </h2>
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5">
                Simulação Atendimento a Atendimento
              </Badge>
            </div>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              Visualize a curva acumulada de todos os colaboradores simultaneamente e meça o impacto de cada atendimento na loja.
            </p>
          </div>
        </div>

        {/* SELECTOR CONTROLS */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* TOGGLE ALL COLLABORATORS LINES */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewAllCollaborators(!viewAllCollaborators)}
            className={cn(
              "h-9 px-3 text-xs font-bold rounded-xl gap-2 border transition-all",
              viewAllCollaborators ? "bg-indigo-600 text-white border-indigo-500 font-black shadow-sm" : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white"
            )}
          >
            <Users className="w-4 h-4" />
            <span>{viewAllCollaborators ? "Todas as Linhas Ativas" : "Exibir Todos os Vendedores"}</span>
          </Button>

          {/* VENDOR SELECTOR */}
          <div className="flex flex-col gap-1 flex-1 sm:flex-initial">
            <Select value={selectedVendor} onValueChange={(val) => { setSelectedVendor(val); setCurrentStepIndex(-1); }}>
              <SelectTrigger className="w-full sm:w-48 bg-slate-950 border-slate-700 text-white text-xs font-bold h-9">
                <SelectValue placeholder="Selecione o Colaborador" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 text-white border-slate-800">
                <SelectItem value="all" className="text-xs font-bold text-indigo-400">🌐 Visão Consolidada Loja</SelectItem>
                {vendors.map(v => (
                  <SelectItem key={v} value={v} className="text-xs font-bold">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: vendorColorMap[v] }} />
                      {v}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* METRIC MODE TOGGLE */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMetricMode("pa")}
                className={cn("h-7 px-3 text-xs font-black rounded-lg transition-colors", metricMode === "pa" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white")}
              >
                PA (Itens)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMetricMode("tkm")}
                className={cn("h-7 px-3 text-xs font-black rounded-lg transition-colors", metricMode === "tkm" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white")}
              >
                TKM (R$)
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* PLAYBACK CONTROLLER & LIVE DASHBOARD CARDS */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* PLAYER CONTROL CARD */}
        <Card className="xl:col-span-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">Cronograma de Vendas</span>
            </div>
            <Badge className="bg-slate-100 text-slate-700 font-black text-[10px]">
              {currentStepIndex >= 0 ? `${currentStepIndex + 1} / ${timeline.length}` : `Todos os ${timeline.length} Cupons`}
            </Badge>
          </div>

          {/* SIMULATION PLAYER CONTROLS */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setIsPlaying(false); setCurrentStepIndex(0); }}
                title="Reiniciar Simulação"
                className="h-8 w-8 p-0 rounded-lg border-slate-200 text-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className={cn("h-9 px-5 font-black text-xs rounded-xl gap-1.5 shadow-sm text-white", isPlaying ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700")}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? "Pausar" : "Simular Tempo Real"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStepIndex(prev => Math.min(prev + 1, timeline.length - 1));
                }}
                title="Próximo Cupom"
                className="h-8 w-8 p-0 rounded-lg border-slate-200 text-slate-700"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* SPEED SELECTOR */}
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pt-1">
              <span>Velocidade:</span>
              <div className="flex items-center gap-1">
                {[
                  { label: "1x", speed: 1200 },
                  { label: "2x", speed: 600 },
                  { label: "5x", speed: 200 }
                ].map(s => (
                  <button
                    key={s.label}
                    onClick={() => setPlaybackSpeed(s.speed)}
                    className={cn("px-2 py-0.5 rounded text-[9px] font-black transition-colors", playbackSpeed === s.speed ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200")}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ACTIVE POINT DETAILED SUMMARY */}
          {activePoint ? (
            <div className={cn("p-3.5 rounded-xl border space-y-2 transition-all", activePoint.impactType === "POSITIVE" ? "bg-emerald-50/70 border-emerald-200" : activePoint.impactType === "NEGATIVE" ? "bg-rose-50/70 border-rose-200" : "bg-slate-50 border-slate-200")}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {activePoint.timeStr}
                </span>
                <Badge className={cn("text-[9px] font-black uppercase px-2 py-0.5 border-none", activePoint.impactType === "POSITIVE" ? "bg-emerald-500 text-white" : activePoint.impactType === "NEGATIVE" ? "bg-rose-500 text-white" : "bg-slate-500 text-white")}>
                  {activePoint.impactType === "POSITIVE" ? "Puxou p/ Cima" : activePoint.impactType === "NEGATIVE" ? "Puxou p/ Baixo" : "Neutro"}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-slate-800 pt-1">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Vendedor</p>
                  <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: vendorColorMap[activePoint.vendedor] || '#6366f1' }} />
                    {activePoint.vendedor}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Atendimento</p>
                  <p className="text-xs font-black text-slate-900">{activePoint.itens_qtd} item(s) • {formatBRL(activePoint.vNF)}</p>
                </div>
              </div>

              {/* DELTA SUMMARY */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
                <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                  <span className="text-[8px] font-bold text-slate-400 uppercase block">PA Colaborador</span>
                  <span className={cn("text-xs font-black flex items-center justify-center gap-0.5", activePoint.vendorPaDelta > 0 ? "text-emerald-600" : activePoint.vendorPaDelta < 0 ? "text-rose-600" : "text-slate-700")}>
                    {activePoint.vendorPaDelta > 0 ? <ArrowUpRight className="w-3 h-3 text-emerald-600" /> : activePoint.vendorPaDelta < 0 ? <ArrowDownRight className="w-3 h-3 text-rose-600" /> : null}
                    {formatNum(activePoint.vendorPA)} ({activePoint.vendorPaDelta >= 0 ? "+" : ""}{formatNum(activePoint.vendorPaDelta)})
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                  <span className="text-[8px] font-bold text-slate-400 uppercase block">PA Loja Consolidado</span>
                  <span className={cn("text-xs font-black flex items-center justify-center gap-0.5", activePoint.storePaDelta > 0 ? "text-emerald-600" : activePoint.storePaDelta < 0 ? "text-rose-600" : "text-slate-700")}>
                    {activePoint.storePaDelta > 0 ? <ArrowUpRight className="w-3 h-3 text-emerald-600" /> : activePoint.storePaDelta < 0 ? <ArrowDownRight className="w-3 h-3 text-rose-600" /> : null}
                    {formatNum(activePoint.storePA)} ({activePoint.storePaDelta >= 0 ? "+" : ""}{formatNum(activePoint.storePaDelta)})
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 font-medium italic">
              Nenhum cupom selecionado no momento.
            </div>
          )}
        </Card>

        {/* METRICS OVERVIEW SCORE CARDS */}
        <div className="xl:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* VENDOR PA SCORE */}
          <Card className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">PA Acumulado ({targetVendorName})</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-900">{formatNum(activePoint?.vendorPA || 0)}</span>
              <span className="text-xs font-bold text-slate-400">itens/cupom</span>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] font-bold text-slate-500 flex items-center justify-between">
              <span>Cupons: {activePoint?.vendorCupons || 0}</span>
              <span>Itens: {activePoint?.vendorItens || 0}</span>
            </div>
          </Card>

          {/* STORE PA SCORE */}
          <Card className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">PA Acumulado (Loja Consolidada)</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-indigo-700">{formatNum(activePoint?.storePA || 0)}</span>
              <span className="text-xs font-bold text-slate-400">itens/cupom</span>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] font-bold text-slate-500 flex items-center justify-between">
              <span>Cupons: {activePoint?.storeCupons || 0}</span>
              <span>Itens: {activePoint?.storeItens || 0}</span>
            </div>
          </Card>

          {/* VENDOR TKM SCORE */}
          <Card className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">TKM Acumulado ({targetVendorName})</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-xl md:text-2xl font-black text-slate-900">{formatBRL(activePoint?.vendorTKM || 0)}</span>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] font-bold text-slate-500 flex items-center justify-between">
              <span>Venda: {formatBRL(activePoint?.vendorVenda || 0)}</span>
            </div>
          </Card>

          {/* STORE TKM SCORE */}
          <Card className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">TKM Acumulado (Loja Consolidada)</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-xl md:text-2xl font-black text-indigo-700">{formatBRL(activePoint?.storeTKM || 0)}</span>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] font-bold text-slate-500 flex items-center justify-between">
              <span>Venda Total: {formatBRL(activePoint?.storeVenda || 0)}</span>
            </div>
          </Card>
        </div>
      </div>

      {/* CHRONOLOGICAL IMPACT CHART */}
      <Card className="bg-white border border-slate-200/80 p-5 md:p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">
                Evolução Cronológica: {metricMode === "pa" ? "PA (Peças por Atendimento)" : "Ticket Médio (TKM)"}
              </h3>
              <p className="text-[10px] font-semibold text-slate-400">
                Linha Roxa Destaque = Loja Consolidada • Linhas Coloridas = Colaboradores da Loja
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-slate-100 text-slate-700 font-black text-[10px]">
              {activeTimelinePoints.length} atendimentos na curva
            </Badge>
          </div>
        </div>

        {/* RECHARTS TIME-SERIES MULTI-LINE CHART */}
        <div className="h-96 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activeTimelinePoints} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="timeStr" 
                stroke="#94a3b8" 
                tick={{ fontSize: 10, fontWeight: 700 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#94a3b8" 
                tick={{ fontSize: 10, fontWeight: 700 }}
                domain={metricMode === "pa" ? [0, 'auto'] : [0, 'auto']}
                tickFormatter={(val) => metricMode === "tkm" ? `R$ ${val ?? 0}` : Number(val || 0).toFixed(1)}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const dataPoint = payload[0].payload as TimelinePoint;
                    return (
                      <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-800 text-xs space-y-2 max-w-xs sm:max-w-sm">
                        <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between gap-4">
                          <span className="font-mono font-bold text-indigo-300">🕒 {dataPoint.timeStr}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{dataPoint.vendedor}</span>
                        </div>
                        <p className="text-slate-300 text-[11px]">
                          🛒 Atendimento: <strong className="text-white">{dataPoint.itens_qtd} item(s)</strong> ({formatBRL(dataPoint.vNF)})
                        </p>
                        <div className="pt-1 space-y-1 max-h-48 overflow-y-auto pr-1">
                          <div className="text-indigo-400 font-extrabold flex items-center justify-between text-xs border-b border-slate-800/80 pb-1">
                            <span>🏬 Loja Consolidada:</span>
                            <span>{metricMode === "pa" ? formatNum(dataPoint.storePA) : formatBRL(dataPoint.storeTKM)}</span>
                          </div>
                          {vendors.map(v => {
                            const val = metricMode === "pa" ? (dataPoint as any)[`pa_${v}`] : (dataPoint as any)[`tkm_${v}`];
                            if (val === undefined || val === null) return null;
                            const color = vendorColorMap[v] || "#10b981";
                            const isCurrentVendor = dataPoint.vendedor === v;
                            return (
                              <div key={v} className={cn("flex items-center justify-between text-[11px] font-bold py-0.5", isCurrentVendor ? "bg-slate-800/80 px-1.5 py-1 rounded border border-indigo-500/30" : "")}>
                                <span className="flex items-center gap-1.5" style={{ color }}>
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                  {v}:
                                </span>
                                <span className="text-white">
                                  {metricMode === "pa" ? formatNum(val) : formatBRL(val)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '12px' }} />
              
              {/* Reference line for target PA of 1.75 or TKM 150 */}
              <ReferenceLine 
                y={metricMode === "pa" ? 1.75 : 150} 
                stroke="#e11d48" 
                strokeDasharray="4 4" 
                label={{ value: metricMode === "pa" ? "Meta PA (1.75)" : "Meta TKM (R$ 150)", fill: '#e11d48', fontSize: 10, fontWeight: 800 }} 
              />

              {/* Line 1: Store Cumulative */}
              <Line 
                type="monotone" 
                dataKey={metricMode === "pa" ? "storePA" : "storeTKM"} 
                name="Loja Consolidada" 
                stroke="#6366f1" 
                strokeWidth={4} 
                dot={false}
                activeDot={{ r: 7, fill: "#6366f1" }}
              />

              {/* Lines for each Collaborator */}
              {vendors.map(v => {
                const isSelected = selectedVendor === v;
                const shouldRender = viewAllCollaborators || selectedVendor === "all" || isSelected;
                if (!shouldRender) return null;

                const color = vendorColorMap[v] || "#10b981";
                const dataKey = metricMode === "pa" ? `pa_${v}` : `tkm_${v}`;

                return (
                  <Line
                    key={v}
                    type="monotone"
                    dataKey={dataKey}
                    name={v}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : (selectedVendor === "all" || viewAllCollaborators ? 2 : 1)}
                    strokeOpacity={selectedVendor !== "all" && !isSelected && viewAllCollaborators ? 0.4 : 1}
                    connectNulls
                    dot={isSelected ? (props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload.vendedor === v) {
                        const isMono = payload.isMonoItem;
                        return (
                          <circle 
                            key={props.key} 
                            cx={cx} 
                            cy={cy} 
                            r={4} 
                            fill={isMono ? "#ef4444" : color} 
                            stroke="#ffffff" 
                            strokeWidth={1.5} 
                          />
                        );
                      }
                      return <React.Fragment key={props.key} />;
                    } : false}
                    activeDot={{ r: 5, fill: color }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* CHRONOLOGICAL LOG OF ALL TRANSACTIONS */}
      <Card className="bg-white border border-slate-200/80 p-5 md:p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">
              Feed Cronológico de Atendimentos do Dia
            </h3>
            <p className="text-[10px] font-semibold text-slate-400">
              Acompanhamento de cada cupom com tags de impacto no PA/TKM
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              type="text"
              placeholder="Buscar por vendedor ou horário..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="bg-slate-50 border-slate-200 text-xs h-8 w-full sm:w-64 font-bold"
            />
          </div>
        </div>

        {/* LOG TABLE */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-900 text-white font-black text-[9px] uppercase sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Horário</th>
                <th className="py-2.5 px-3">Vendedor</th>
                <th className="py-2.5 px-3 text-center">Itens</th>
                <th className="py-2.5 px-3 text-right">Valor Venda</th>
                <th className="py-2.5 px-3 text-center">PA Colaborador</th>
                <th className="py-2.5 px-3 text-center">PA Loja</th>
                <th className="py-2.5 px-3 text-center">Impacto no PA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {logPoints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                    Nenhum atendimento localizado para os filtros informados.
                  </td>
                </tr>
              ) : (
                logPoints.map((pt) => {
                  const isPositive = pt.itens_qtd >= 2;
                  const isNegative = pt.itens_qtd <= 1;
                  const vendorColor = vendorColorMap[pt.vendedor] || "#6366f1";

                  return (
                    <tr 
                      key={pt.chave + pt.index}
                      onClick={() => setCurrentStepIndex(pt.index)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-slate-100/70",
                        currentStepIndex === pt.index ? "bg-indigo-50/80 font-black border-l-4 border-l-indigo-600" : ""
                      )}
                    >
                      <td className="py-2 px-3 font-mono font-bold text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{pt.timeStr}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 uppercase whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: vendorColor }} />
                          <span>{pt.vendedor}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center font-bold">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-black", pt.itens_qtd >= 2 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
                          {pt.itens_qtd} item(s)
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-black text-slate-800 whitespace-nowrap">
                        {formatBRL(pt.vNF)}
                      </td>
                      <td className="py-2 px-3 text-center font-bold whitespace-nowrap">
                        <span className="text-slate-900">{formatNum(pt.vendorPA)}</span>
                        {pt.vendorPaDelta !== 0 && (
                          <span className={cn("text-[9px] font-black ml-1", pt.vendorPaDelta > 0 ? "text-emerald-600" : "text-rose-600")}>
                            ({pt.vendorPaDelta >= 0 ? "+" : ""}{formatNum(pt.vendorPaDelta)})
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-indigo-700 whitespace-nowrap">
                        {formatNum(pt.storePA)}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {isPositive ? (
                          <Badge className="bg-emerald-500 text-white font-black text-[9px] uppercase px-2 py-0.5 border-none gap-1">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Impulsionou PA (+{pt.itens_qtd} itens)</span>
                          </Badge>
                        ) : isNegative ? (
                          <Badge className="bg-rose-500 text-white font-black text-[9px] uppercase px-2 py-0.5 border-none gap-1">
                            <ArrowDownRight className="w-3 h-3" />
                            <span>Puxou p/ Baixo (Mono-item)</span>
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-200 text-slate-700 font-black text-[9px] uppercase px-2 py-0.5 border-none">
                            Neutro
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
