"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  DetailedSaleRow, 
  VinculoTroca 
} from "@/lib/types";
import { 
  parseEscalaJson, 
  loadSavedEscalaStore, 
  saveEscalaStore, 
  clearEscalaStore, 
  getPosicaoForColaboradorAndDate,
  EscalaItem,
  EscalaStore,
  PositionGoalConfig,
  DEFAULT_POSITION_METAS,
  POSITION_NAMES,
  loadSavedPositionMetas,
  savePositionMetas
} from "@/lib/escalaProcessor";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Settings2, 
  TrendingUp, 
  Users, 
  Scale, 
  Trash2, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Award,
  Layers,
  Flame,
  Filter,
  ArrowUpDown,
  Calendar,
  BarChart3,
  Zap,
  Check,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface WeightedPerformanceReportProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

export type { PositionGoalConfig };

type StatusFilterType = "ALL" | "HIT" | "MISS" | "JUSTICE";
type SortByType = "venda" | "pa" | "atingimento" | "nome";

export function WeightedPerformanceReport({ data = [], vinculos = [] }: WeightedPerformanceReportProps) {
  const [escalaStore, setEscalaStore] = useState<EscalaStore | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedColab, setSelectedColab] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("ALL");
  const [sortBy, setSortBy] = useState<SortByType>("venda");
  const [customMetas, setCustomMetas] = useState<PositionGoalConfig>(DEFAULT_POSITION_METAS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load saved store and metas on mount
  useEffect(() => {
    const saved = loadSavedEscalaStore();
    if (saved) {
      setEscalaStore(saved);
    }
    const savedMetas = loadSavedPositionMetas();
    if (savedMetas) {
      setCustomMetas(savedMetas);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const { escalas, exportedAt } = parseEscalaJson(content);

        const newStore: EscalaStore = {
          exportedAt,
          importedAt: new Date().toISOString(),
          filename: file.name,
          escalas,
          aliases: escalaStore?.aliases || {}
        };

        saveEscalaStore(newStore);
        setEscalaStore(newStore);
      } catch (err: any) {
        console.error(err);
        setUploadError(err.message || "Erro ao ler arquivo de escala.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setUploadError("Erro ao carregar o arquivo.");
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  const handleClearEscala = () => {
    clearEscalaStore();
    setEscalaStore(null);
  };

  // Group sales data by vendor and analyze per-position yield
  const processedData = useMemo(() => {
    const saidas = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    const vendorMap: Record<string, {
      name: string;
      totalCupons: number;
      totalItens: number;
      totalVenda: number;
      allDaysWorked: Set<string>;
      byPosition: Record<string, {
        cupons: number;
        itens: number;
        venda: number;
        metaPosicao: number;
        pecasEsperadas: number;
        daysWorked: Set<string>;
      }>;
      dailyDetails: Array<{
        date: string;
        posicao: string;
        cupons: number;
        itens: number;
        venda: number;
      }>;
    }> = {};

    saidas.forEach(sale => {
      const v = sale.vendedor ? sale.vendedor.trim() : "OUTROS";
      if (!vendorMap[v]) {
        vendorMap[v] = {
          name: v,
          totalCupons: 0,
          totalItens: 0,
          totalVenda: 0,
          allDaysWorked: new Set<string>(),
          byPosition: {},
          dailyDetails: []
        };
      }

      const saleDate = sale.dhEmi ? sale.dhEmi.split("T")[0] : "";
      let posKey = "DEFAULT";

      if (escalaStore && escalaStore.escalas.length > 0 && saleDate) {
        const foundPos = getPosicaoForColaboradorAndDate(
          escalaStore.escalas,
          v,
          saleDate,
          escalaStore.aliases
        );
        if (foundPos) {
          if (foundPos.startsWith("P1")) posKey = "P1";
          else if (foundPos.startsWith("P2")) posKey = "P2";
          else if (foundPos.startsWith("P3")) posKey = "P3";
          else if (foundPos.startsWith("DIG")) posKey = "DIG";
          else posKey = foundPos;
        }
      }

      const metaPos = customMetas[posKey as keyof PositionGoalConfig] ?? customMetas.DEFAULT;

      const cupons = 1;
      const itens = parseFloat(sale.itens_qtd || "0");
      const venda = parseFloat(sale.vNF || "0");

      vendorMap[v].totalCupons += cupons;
      vendorMap[v].totalItens += itens;
      vendorMap[v].totalVenda += venda;
      if (saleDate) vendorMap[v].allDaysWorked.add(saleDate);

      if (!vendorMap[v].byPosition[posKey]) {
        vendorMap[v].byPosition[posKey] = {
          cupons: 0,
          itens: 0,
          venda: 0,
          metaPosicao: metaPos,
          pecasEsperadas: 0,
          daysWorked: new Set<string>()
        };
      }

      vendorMap[v].byPosition[posKey].cupons += cupons;
      vendorMap[v].byPosition[posKey].itens += itens;
      vendorMap[v].byPosition[posKey].venda += venda;
      if (saleDate) vendorMap[v].byPosition[posKey].daysWorked.add(saleDate);

      let dayDetail = vendorMap[v].dailyDetails.find(d => d.date === saleDate);
      if (!dayDetail) {
        dayDetail = { date: saleDate, posicao: posKey, cupons: 0, itens: 0, venda: 0 };
        vendorMap[v].dailyDetails.push(dayDetail);
      }
      dayDetail.cupons += cupons;
      dayDetail.itens += itens;
      dayDetail.venda += venda;
    });

    // Calculate individual weighted targets & position performance rankings
    const results = Object.values(vendorMap).map(v => {
      let totalPecasEsperadas = 0;

      const positionsList = Object.entries(v.byPosition).map(([pos, posData]) => {
        const metaPos = customMetas[pos as keyof PositionGoalConfig] ?? customMetas.DEFAULT;
        posData.metaPosicao = metaPos;
        posData.pecasEsperadas = posData.cupons * metaPos;
        totalPecasEsperadas += posData.pecasEsperadas;

        const paPosicao = posData.cupons > 0 ? posData.itens / posData.cupons : 0;
        const atingimentoPosicaoPct = metaPos > 0 ? (paPosicao / metaPos) * 100 : 0;

        return {
          posKey: pos,
          posName: POSITION_NAMES[pos] || pos,
          cupons: posData.cupons,
          itens: posData.itens,
          venda: posData.venda,
          metaPosicao: metaPos,
          pecasEsperadas: posData.pecasEsperadas,
          paPosicao,
          atingimentoPosicaoPct,
          daysWorkedCount: posData.daysWorked.size
        };
      });

      // Sort positions by PA descending to identify best performing position ("onde rende mais")
      positionsList.sort((a, b) => b.paPosicao - a.paPosicao);
      const bestPosition = positionsList.length > 0 && positionsList[0].cupons > 0 ? positionsList[0] : null;
      const worstPosition = positionsList.length > 1 && positionsList[positionsList.length - 1].cupons > 0 ? positionsList[positionsList.length - 1] : null;

      const paRealizado = v.totalCupons > 0 ? v.totalItens / v.totalCupons : 0;
      const metaPonderadaPA = v.totalCupons > 0 ? totalPecasEsperadas / v.totalCupons : customMetas.DEFAULT;
      const atingimentoPct = metaPonderadaPA > 0 ? (paRealizado / metaPonderadaPA) * 100 : 0;

      const metaFixaLoja = 1.75;
      const atingimentoMetaFixa = (paRealizado / metaFixaLoja) * 100;

      const isBateuPonderada = paRealizado >= metaPonderadaPA;
      const isBateuFixa = paRealizado >= metaFixaLoja;

      const saldoPecas = v.totalItens - totalPecasEsperadas;
      const diffPA = paRealizado - metaPonderadaPA;

      return {
        ...v,
        positionsList,
        bestPosition,
        worstPosition,
        paRealizado,
        metaPonderadaPA,
        totalPecasEsperadas,
        atingimentoPct,
        metaFixaLoja,
        atingimentoMetaFixa,
        isBateuPonderada,
        isBateuFixa,
        saldoPecas,
        diffPA,
        totalDiasTrabalhados: v.allDaysWorked.size,
        justicaHighlight: isBateuPonderada && !isBateuFixa ? "JUSTIÇA_POSITIVA" : (!isBateuPonderada && isBateuFixa ? "ALERTA_AJUSTE" : "NEUTRO")
      };
    });

    return results;
  }, [data, escalaStore, customMetas]);

  // Counts for tab filters
  const statusCounts = useMemo(() => {
    return {
      all: processedData.length,
      hit: processedData.filter(v => v.isBateuPonderada).length,
      miss: processedData.filter(v => !v.isBateuPonderada).length,
      justice: processedData.filter(v => v.justicaHighlight === "JUSTIÇA_POSITIVA").length,
    };
  }, [processedData]);

  // Filtered & sorted vendor list
  const filteredResults = useMemo(() => {
    let list = processedData;

    if (searchTerm.trim()) {
      list = list.filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (statusFilter === "HIT") {
      list = list.filter(v => v.isBateuPonderada);
    } else if (statusFilter === "MISS") {
      list = list.filter(v => !v.isBateuPonderada);
    } else if (statusFilter === "JUSTICE") {
      list = list.filter(v => v.justicaHighlight === "JUSTIÇA_POSITIVA");
    }

    return [...list].sort((a, b) => {
      if (sortBy === "venda") return b.totalVenda - a.totalVenda;
      if (sortBy === "pa") return b.paRealizado - a.paRealizado;
      if (sortBy === "atingimento") return b.atingimentoPct - a.atingimentoPct;
      if (sortBy === "nome") return a.name.localeCompare(b.name);
      return 0;
    });
  }, [processedData, searchTerm, statusFilter, sortBy]);

  // Overall Store Summary metrics
  const storeSummary = useMemo(() => {
    const totalCupons = processedData.reduce((acc, v) => acc + v.totalCupons, 0);
    const totalItens = processedData.reduce((acc, v) => acc + v.totalItens, 0);
    const totalVenda = processedData.reduce((acc, v) => acc + v.totalVenda, 0);
    const totalPecasEsperadas = processedData.reduce((acc, v) => acc + v.totalPecasEsperadas, 0);

    const storePaRealizado = totalCupons > 0 ? totalItens / totalCupons : 0;
    const storeMetaPonderada = totalCupons > 0 ? totalPecasEsperadas / totalCupons : 1.75;
    const storeAtingimento = storeMetaPonderada > 0 ? (storePaRealizado / storeMetaPonderada) * 100 : 0;

    const countAcimaMeta = processedData.filter(v => v.isBateuPonderada).length;
    const countTotal = processedData.length;

    return {
      totalCupons,
      totalItens,
      totalVenda,
      storePaRealizado,
      storeMetaPonderada,
      storeAtingimento,
      countAcimaMeta,
      countTotal
    };
  }, [processedData]);

  const formatNum = (val: number, decimals = 2) => 
    val.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      
      {/* HEADER BAR & STATUS */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
              <Scale className="w-3.5 h-3.5 text-indigo-400" />
              <span>Avaliação de Performance com Justiça de Oportunidade</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Meta Individual Ponderada por Escala
            </h1>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl mt-1 font-medium leading-relaxed">
              Avalie o desempenho individual justo considerando a função exata (<strong className="text-amber-300">P1 Caixa, P2 Porta, P3 Salão</strong>) em que o colaborador trabalhou cada dia.
            </p>
          </div>

          {/* ESCALA IMPORT ACTIONS & SETTINGS */}
          <div className="flex flex-wrap items-center gap-3">
            {escalaStore ? (
              <div className="flex items-center gap-3 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-2 px-3 shadow-inner">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Escala RH Conectada</span>
                      <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.2 rounded-full font-black">
                        {escalaStore.escalas.length} registros
                      </span>
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium">
                      {escalaStore.filename || "escala_vendas.json"}
                    </p>
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearEscala}
                  className="h-8 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 text-[10px] font-bold uppercase gap-1 rounded-xl"
                  title="Remover arquivo de escala atual"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar</span>
                </Button>
              </div>
            ) : (
              <Label htmlFor="escala-file-input" className="cursor-pointer">
                <div className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase px-4 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-md shadow-indigo-600/30 border border-indigo-400/30">
                  <Upload className="w-4 h-4" />
                  <span>Importar Escala RH (.json)</span>
                </div>
                <input 
                  id="escala-file-input" 
                  type="file" 
                  accept=".json" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </Label>
            )}

            {/* METAS SETTINGS POPOVER */}
            <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs font-bold uppercase rounded-2xl h-11 px-3 gap-2">
                  <Settings2 className="w-4 h-4 text-indigo-400" />
                  <span>Metas Posição</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-slate-900 border-slate-800 text-white p-4 space-y-4 shadow-2xl rounded-2xl" align="end">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400">Ajustar Metas por Posição</h4>
                  <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 items-center gap-2">
                    <Label className="text-xs font-bold text-slate-300">P1 — Caixa:</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={customMetas.P1} 
                      onChange={e => setCustomMetas({...customMetas, P1: parseFloat(e.target.value) || 1.60})}
                      className="h-8 bg-slate-800 border-slate-700 text-white text-xs font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 items-center gap-2">
                    <Label className="text-xs font-bold text-slate-300">P2 — Porta:</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={customMetas.P2} 
                      onChange={e => setCustomMetas({...customMetas, P2: parseFloat(e.target.value) || 1.55})}
                      className="h-8 bg-slate-800 border-slate-700 text-white text-xs font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 items-center gap-2">
                    <Label className="text-xs font-bold text-slate-300">P3 — Salão:</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={customMetas.P3} 
                      onChange={e => setCustomMetas({...customMetas, P3: parseFloat(e.target.value) || 1.80})}
                      className="h-8 bg-slate-800 border-slate-700 text-white text-xs font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 items-center gap-2">
                    <Label className="text-xs font-bold text-slate-300">Digital / Retirada:</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={customMetas.DIG} 
                      onChange={e => setCustomMetas({...customMetas, DIG: parseFloat(e.target.value) || 1.75})}
                      className="h-8 bg-slate-800 border-slate-700 text-white text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <Button 
                    size="sm" 
                    onClick={() => setCustomMetas(DEFAULT_POSITION_METAS)}
                    className="h-7 text-[10px] uppercase font-bold text-slate-400 hover:text-white" 
                    variant="ghost"
                  >
                    Restaurar Padrão
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {uploadError && (
          <div className="mt-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* EXPLANATION CAROUSEL CARD */}
      <Card className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border-amber-200/80 dark:border-amber-900/40 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-slate-900 tracking-tight">
                Como Funciona a Meta Ponderada Por Atendimentos
              </h3>
              <p className="text-xs text-slate-600 font-medium mt-0.5 max-w-3xl leading-relaxed">
                Calculamos a meta individual proporcional aos atendimentos em cada posição (<strong className="text-slate-800">P1 Caixa = {customMetas.P1.toFixed(2)}</strong>, <strong className="text-slate-800">P2 Porta = {customMetas.P2.toFixed(2)}</strong>, <strong className="text-slate-800">P3 Salão = {customMetas.P3.toFixed(2)}</strong>). Descubra também em qual posição cada colaborador obtém o maior rendimento.
              </p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-xs text-center shrink-0 w-full md:w-auto">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Metas Vigentes</p>
            <div className="flex items-center justify-center gap-2.5 mt-1.5">
              <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                P1: {customMetas.P1.toFixed(2)}
              </span>
              <span className="text-xs font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                P2: {customMetas.P2.toFixed(2)}
              </span>
              <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                P3: {customMetas.P3.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm p-4 bg-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Atendimentos</p>
          <p className="text-2xl font-black text-slate-900">{storeSummary.totalCupons.toLocaleString()}</p>
          <p className="text-[10px] font-semibold text-slate-500 mt-1">{storeSummary.totalItens.toLocaleString()} peças vendidas</p>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm p-4 bg-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">PA Realizado da Loja</p>
          <p className="text-2xl font-black text-indigo-600">{formatNum(storeSummary.storePaRealizado)}</p>
          <p className="text-[10px] font-semibold text-slate-500 mt-1">Média geral da equipe</p>
        </Card>

        <Card className="rounded-2xl border-indigo-200 bg-indigo-50/50 shadow-sm p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700 mb-1">Meta Loja Ponderada</p>
          <p className="text-2xl font-black text-indigo-900">{formatNum(storeSummary.storeMetaPonderada)}</p>
          <p className="text-[10px] font-semibold text-indigo-600 mt-1">
            {formatNum(storeSummary.storeAtingimento, 1)}% atingimento global
          </p>
        </Card>

        <Card className="rounded-2xl border-emerald-200 bg-emerald-50/50 shadow-sm p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1">Atingiram Meta Ponderada</p>
          <p className="text-2xl font-black text-emerald-800">
            {storeSummary.countAcimaMeta} / {storeSummary.countTotal}
          </p>
          <p className="text-[10px] font-semibold text-emerald-600 mt-1">
            {storeSummary.countTotal > 0 ? Math.round((storeSummary.countAcimaMeta / storeSummary.countTotal) * 100) : 0}% da equipe atingiu
          </p>
        </Card>
      </div>

      {/* FILTER BUTTONS & SEARCH BAR */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-4">
        
        {/* TOP CONTROLS: TABS & SORT */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          
          {/* STATUS FILTER BUTTONS */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={statusFilter === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("ALL")}
              className={cn(
                "rounded-xl text-xs font-extrabold uppercase h-9 px-3 gap-1.5",
                statusFilter === "ALL" ? "bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <span>Todos</span>
              <span className="bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {statusCounts.all}
              </span>
            </Button>

            <Button
              variant={statusFilter === "HIT" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("HIT")}
              className={cn(
                "rounded-xl text-xs font-extrabold uppercase h-9 px-3 gap-1.5",
                statusFilter === "HIT" 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Atingiram Meta</span>
              <span className="bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {statusCounts.hit}
              </span>
            </Button>

            <Button
              variant={statusFilter === "MISS" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("MISS")}
              className={cn(
                "rounded-xl text-xs font-extrabold uppercase h-9 px-3 gap-1.5",
                statusFilter === "MISS" 
                  ? "bg-rose-600 text-white shadow-sm" 
                  : "border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100"
              )}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Abaixo da Meta</span>
              <span className="bg-rose-200 text-rose-900 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {statusCounts.miss}
              </span>
            </Button>

            {statusCounts.justice > 0 && (
              <Button
                variant={statusFilter === "JUSTICE" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("JUSTICE")}
                className={cn(
                  "rounded-xl text-xs font-extrabold uppercase h-9 px-3 gap-1.5",
                  statusFilter === "JUSTICE" 
                    ? "bg-amber-600 text-white shadow-sm" 
                    : "border-amber-200 text-amber-800 bg-amber-50/50 hover:bg-amber-100"
                )}
              >
                <Scale className="w-3.5 h-3.5 text-amber-500" />
                <span>Justiça de Oportunidade</span>
                <span className="bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                  {statusCounts.justice}
                </span>
              </Button>
            )}
          </div>

          {/* SORT SELECTOR */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              Ordenar por:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortByType)}
              className="bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="venda">Venda Total (R$)</option>
              <option value="pa">PA Realizado</option>
              <option value="atingimento">% Atingimento Meta</option>
              <option value="nome">Nome A-Z</option>
            </select>
          </div>
        </div>

        {/* SEARCH & SCALE WARNING BAR */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full max-w-md">
            <Input 
              type="text" 
              placeholder="Buscar colaborador por nome..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-10 rounded-2xl bg-slate-50 border-slate-200 text-xs font-bold placeholder:text-slate-400"
            />
            <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          {!escalaStore && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl font-medium flex items-center gap-1.5 w-full md:w-auto">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Sem escala importada. Importe o JSON do RH para mapear posições exatas por data.</span>
            </div>
          )}
        </div>
      </div>

      {/* COLLABORATOR CARDS LIST */}
      <div className="space-y-4">
        {filteredResults.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">Nenhum colaborador encontrado com os filtros selecionados.</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { setStatusFilter("ALL"); setSearchTerm(""); }}
              className="mt-3 text-xs font-bold uppercase rounded-xl"
            >
              Limpar Filtros
            </Button>
          </div>
        ) : (
          filteredResults.map(v => {
            const isExpanded = selectedColab === v.name;

            return (
              <Card 
                key={v.name}
                className={cn(
                  "rounded-3xl border transition-all overflow-hidden shadow-sm hover:shadow-md",
                  v.isBateuPonderada 
                    ? "border-emerald-200 bg-white hover:border-emerald-300" 
                    : "border-rose-200 bg-white hover:border-rose-300"
                )}
              >
                {/* MAIN CARD HEADER ROW */}
                <div className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                  
                  {/* LEFT: NAME, STATUS & HIGHEST YIELD BADGE */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">
                        {v.name}
                      </h3>

                      {/* STATUS BADGE */}
                      {v.isBateuPonderada ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Atingiu Meta ({formatNum(v.atingimentoPct, 1)}%)</span>
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>Abaixo da Meta ({formatNum(v.atingimentoPct, 1)}%)</span>
                        </Badge>
                      )}

                      {/* ONDE RENDE MAIS (HIGHEST YIELD POSITION) BADGE */}
                      {v.bestPosition && (
                        <Badge 
                          className="bg-amber-50 text-amber-900 border-amber-300 font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs"
                          title={`Esta é a função onde ${v.name} apresenta o maior rendimento de PA.`}
                        >
                          <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>Maior Rendimento: {v.bestPosition.posName} ({formatNum(v.bestPosition.paPosicao)} PA)</span>
                        </Badge>
                      )}

                      {/* JUSTIÇA HIGHLIGHT BADGE */}
                      {v.justicaHighlight === "JUSTIÇA_POSITIVA" && (
                        <Badge className="bg-indigo-100 text-indigo-900 border-indigo-300 font-bold text-[9px] uppercase px-2 py-0.5 rounded-full" title="Superou a meta ponderada, embora ficasse abaixo da meta fixa rígida de 1,75.">
                          ⚖️ Justiça de Oportunidade
                        </Badge>
                      )}
                    </div>

                    {/* POSITIONS DISTRIBUTION BADGES */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-xl flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span><strong>{v.totalDiasTrabalhados} dias</strong> com venda</span>
                      </span>

                      {v.positionsList.map(pos => (
                        <span key={pos.posKey} className="text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-xl flex items-center gap-1">
                          <span>{pos.posKey}: <strong>{pos.cupons} atend.</strong> ({pos.daysWorkedCount}d)</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* RIGHT: COMPARISON NUMBERS */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 shrink-0 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                    
                    {/* TOTAL ATENDIMENTOS & FATURAMENTO */}
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase text-slate-400">Faturamento</p>
                      <p className="text-base font-black text-slate-900">{formatCurrency(v.totalVenda)}</p>
                      <p className="text-[9px] font-bold text-slate-500">{v.totalCupons} atend. / {v.totalItens} pcs</p>
                    </div>

                    {/* META PONDERADA */}
                    <div className="text-center bg-indigo-50/70 border border-indigo-100 p-2 px-3 rounded-2xl">
                      <p className="text-[10px] font-black uppercase text-indigo-600">Meta Ponderada</p>
                      <p className="text-lg font-black text-indigo-900">{formatNum(v.metaPonderadaPA)} PA</p>
                      <p className="text-[9px] font-bold text-indigo-600">{formatNum(v.totalPecasEsperadas, 1)} pcs esp.</p>
                    </div>

                    {/* PA REALIZADO */}
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase text-slate-400">PA Realizado</p>
                      <p className={cn(
                        "text-lg font-black",
                        v.isBateuPonderada ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {formatNum(v.paRealizado)}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400">
                        {v.isBateuPonderada ? "▲ Acima" : "▼ Abaixo"}
                      </p>
                    </div>

                    {/* SALDO DE PEÇAS */}
                    <div className="text-center bg-slate-50 border border-slate-200/80 p-2 px-3 rounded-2xl">
                      <p className="text-[10px] font-black uppercase text-slate-400">Saldo Peças</p>
                      <p className={cn(
                        "text-base font-black flex items-center justify-center gap-0.5",
                        v.saldoPecas >= 0 ? "text-emerald-700" : "text-rose-700"
                      )}>
                        {v.saldoPecas >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />}
                        <span>{v.saldoPecas >= 0 ? `+${formatNum(v.saldoPecas, 1)}` : formatNum(v.saldoPecas, 1)}</span>
                      </p>
                      <p className="text-[9px] font-bold text-slate-500">vs Esperado</p>
                    </div>

                    {/* TOGGLE EXPAND DETAILS */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedColab(isExpanded ? null : v.name)}
                      className="rounded-2xl h-10 px-3 text-slate-600 font-extrabold text-xs gap-1 hover:bg-slate-100"
                    >
                      <span>{isExpanded ? "Ocultar" : "Detalhar"}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* EXPANDABLE DETAILS PANEL */}
                {isExpanded && (
                  <div className="bg-slate-50/90 border-t border-slate-200 p-5 space-y-6 animate-in slide-in-from-top-2 duration-200">
                    
                    {/* SECTION 1: REGISTRO DE DIAS EM CADA POSIÇÃO */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-indigo-600" />
                          <span>Registro de Dias e Atendimento por Posição</span>
                        </h4>
                        <span className="text-[10px] text-slate-500 font-semibold">Total: {v.totalDiasTrabalhados} dias ativos com vendas</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {v.positionsList.map(pos => {
                          const isBest = v.bestPosition?.posKey === pos.posKey;
                          return (
                            <div 
                              key={pos.posKey}
                              className={cn(
                                "p-3.5 rounded-2xl border bg-white space-y-2 shadow-2xs relative overflow-hidden",
                                isBest ? "border-amber-300 ring-2 ring-amber-400/20" : "border-slate-200"
                              )}
                            >
                              {isBest && (
                                <div className="absolute top-0 right-0 bg-amber-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-bl-xl flex items-center gap-0.5">
                                  <Flame className="w-2.5 h-2.5 fill-white" />
                                  <span>Top Rendimento</span>
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-slate-900">{pos.posName}</span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Dias Atuados</p>
                                  <p className="font-extrabold text-slate-800">{pos.daysWorkedCount} dias</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Atendimentos</p>
                                  <p className="font-extrabold text-slate-800">{pos.cupons} cupons</p>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                <span className="text-[10px] font-bold text-slate-500">PA na Posição:</span>
                                <span className={cn(
                                  "font-black text-xs",
                                  pos.paPosicao >= pos.metaPosicao ? "text-emerald-700" : "text-rose-700"
                                )}>
                                  {formatNum(pos.paPosicao)} <span className="text-[9px] text-slate-400 font-medium">(Meta {formatNum(pos.metaPosicao)})</span>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* SECTION 2: RESULTADO ESPERADO VS REALIZADO NO PERÍODO */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-indigo-600" />
                          <span>Resultado Esperado para o Período vs. Realizado</span>
                        </h4>
                        <Badge variant="outline" className="text-[10px] font-bold uppercase text-slate-600">
                          Balanço Consolidado
                        </Badge>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[9px] tracking-wider">
                            <tr>
                              <th className="p-3 rounded-l-xl">Métrica do Período</th>
                              <th className="p-3 text-right">Resultado Esperado (Meta)</th>
                              <th className="p-3 text-right">Resultado Realizado</th>
                              <th className="p-3 text-right rounded-r-xl">Saldo / Diferença (Gap)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            <tr>
                              <td className="p-3 font-bold uppercase text-slate-900">Total de Atendimentos (Cupons)</td>
                              <td className="p-3 text-right font-bold">{v.totalCupons} cupons</td>
                              <td className="p-3 text-right font-bold text-slate-900">{v.totalCupons} cupons</td>
                              <td className="p-3 text-right font-bold text-slate-400">—</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-bold uppercase text-slate-900">Peças Vendidas (Qtd Itens)</td>
                              <td className="p-3 text-right font-bold text-indigo-700">{formatNum(v.totalPecasEsperadas, 1)} peças</td>
                              <td className="p-3 text-right font-bold text-slate-900">{v.totalItens} peças</td>
                              <td className="p-3 text-right font-bold">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-lg text-xs font-extrabold",
                                  v.saldoPecas >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                )}>
                                  {v.saldoPecas >= 0 ? `+${formatNum(v.saldoPecas, 1)}` : formatNum(v.saldoPecas, 1)} peças
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="p-3 font-bold uppercase text-slate-900">PA (Peças por Atendimento)</td>
                              <td className="p-3 text-right font-bold text-indigo-700">{formatNum(v.metaPonderadaPA)} PA</td>
                              <td className="p-3 text-right font-bold text-slate-900">{formatNum(v.paRealizado)} PA</td>
                              <td className="p-3 text-right font-bold">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-lg text-xs font-extrabold",
                                  v.diffPA >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                )}>
                                  {v.diffPA >= 0 ? `+${formatNum(v.diffPA)}` : formatNum(v.diffPA)} PA
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="p-3 font-bold uppercase text-slate-900">Faturamento Bruto (R$)</td>
                              <td className="p-3 text-right font-bold text-slate-400">—</td>
                              <td className="p-3 text-right font-bold text-emerald-800">{formatCurrency(v.totalVenda)}</td>
                              <td className="p-3 text-right font-bold text-slate-400">—</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SECTION 3: EM QUAL POSIÇÃO O COLABORADOR RENDE MAIS */}
                    <div className="bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-amber-600 fill-amber-600" />
                          <span>Diagnóstico: Em Qual Posição o Colaborador Rende Mais</span>
                        </h4>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase">
                          Ranking de Eficiência por Função
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        
                        {/* PERFORMANCE RANKING BARS */}
                        <div className="md:col-span-2 space-y-3 bg-white/80 p-4 rounded-xl border border-amber-200/50">
                          {v.positionsList.map((pos, idx) => {
                            const isTop = idx === 0;
                            const maxPA = Math.max(...v.positionsList.map(p => p.paPosicao), pos.metaPosicao);
                            const barWidth = maxPA > 0 ? Math.min(100, Math.round((pos.paPosicao / maxPA) * 100)) : 0;

                            return (
                              <div key={pos.posKey} className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-extrabold">
                                  <span className="flex items-center gap-1.5 text-slate-800 uppercase">
                                    {isTop && <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                                    <span>{pos.posName}</span>
                                    <span className="text-[10px] font-medium text-slate-500">({pos.cupons} atend.)</span>
                                  </span>
                                  <span className={cn("font-black", isTop ? "text-amber-700" : "text-slate-700")}>
                                    {formatNum(pos.paPosicao)} PA <span className="text-[10px] text-slate-400 font-normal">(Meta {formatNum(pos.metaPosicao)})</span>
                                  </span>
                                </div>

                                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                  <div 
                                    className={cn(
                                      "h-full rounded-full transition-all duration-500",
                                      isTop ? "bg-amber-500" : pos.paPosicao >= pos.metaPosicao ? "bg-emerald-500" : "bg-indigo-400"
                                    )}
                                    style={{ width: `${barWidth}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* INSIGHT TEXT CARD */}
                        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs space-y-2">
                          <p className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Conclusão Estratégica</p>
                          {v.bestPosition ? (
                            <p className="text-xs text-slate-700 font-medium leading-relaxed">
                              🔥 <strong>{v.name}</strong> obtém seu <strong>máximo rendimento</strong> quando atua em <strong>{v.bestPosition.posName}</strong>, onde atinge <strong>{formatNum(v.bestPosition.paPosicao)} PA</strong> ({formatNum(v.bestPosition.atingimentoPosicaoPct, 1)}% da meta da posição).
                              {v.worstPosition && v.worstPosition.posKey !== v.bestPosition.posKey && (
                                <span className="block mt-1.5 text-slate-500 text-[11px]">
                                  ⚠️ Em contrapartida, em <strong>{v.worstPosition.posName}</strong> seu PA cai para <strong>{formatNum(v.worstPosition.paPosicao)}</strong>.
                                </span>
                              )}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-500 font-medium">
                              Sem atendimentos suficientes registrados para compor o ranking por posição.
                            </p>
                          )}
                        </div>

                      </div>
                    </div>

                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
