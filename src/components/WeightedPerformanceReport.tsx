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
  EscalaStore
} from "@/lib/escalaProcessor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Settings2, 
  TrendingUp, 
  Target, 
  Users, 
  Scale, 
  Trash2, 
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Award,
  Layers,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AnalysisHelp } from "./AnalysisHelp";

interface WeightedPerformanceReportProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

export interface PositionGoalConfig {
  P1: number;
  P2: number;
  P3: number;
  DIG: number;
  DEFAULT: number;
}

const DEFAULT_POSITION_METAS: PositionGoalConfig = {
  P1: 1.60,
  P2: 1.55,
  P3: 1.80,
  DIG: 1.75,
  DEFAULT: 1.75
};

export function WeightedPerformanceReport({ data = [], vinculos = [] }: WeightedPerformanceReportProps) {
  const [escalaStore, setEscalaStore] = useState<EscalaStore | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedColab, setSelectedColab] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [customMetas, setCustomMetas] = useState<PositionGoalConfig>(DEFAULT_POSITION_METAS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load saved store on mount
  useEffect(() => {
    const saved = loadSavedEscalaStore();
    if (saved) {
      setEscalaStore(saved);
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

  // Group sales data by vendor
  const processedData = useMemo(() => {
    const saidas = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    const vendorMap: Record<string, {
      name: string;
      totalCupons: number;
      totalItens: number;
      totalVenda: number;
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

      // If position meta not standard, fallback to DEFAULT
      const metaPos = customMetas[posKey as keyof PositionGoalConfig] ?? customMetas.DEFAULT;

      const cupons = 1;
      const itens = parseFloat(sale.itens_qtd || "0");
      const venda = parseFloat(sale.vNF || "0");

      vendorMap[v].totalCupons += cupons;
      vendorMap[v].totalItens += itens;
      vendorMap[v].totalVenda += venda;

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

      // Daily details tracking
      let dayDetail = vendorMap[v].dailyDetails.find(d => d.date === saleDate);
      if (!dayDetail) {
        dayDetail = { date: saleDate, posicao: posKey, cupons: 0, itens: 0, venda: 0 };
        vendorMap[v].dailyDetails.push(dayDetail);
      }
      dayDetail.cupons += cupons;
      dayDetail.itens += itens;
      dayDetail.venda += venda;
    });

    // Calculate individual weighted targets
    const results = Object.values(vendorMap).map(v => {
      let totalPecasEsperadas = 0;

      Object.entries(v.byPosition).forEach(([pos, data]) => {
        const metaPos = customMetas[pos as keyof PositionGoalConfig] ?? customMetas.DEFAULT;
        data.metaPosicao = metaPos;
        data.pecasEsperadas = data.cupons * metaPos;
        totalPecasEsperadas += data.pecasEsperadas;
      });

      const paRealizado = v.totalCupons > 0 ? v.totalItens / v.totalCupons : 0;
      const metaPonderadaPA = v.totalCupons > 0 ? totalPecasEsperadas / v.totalCupons : customMetas.DEFAULT;
      const atingimentoPct = metaPonderadaPA > 0 ? (paRealizado / metaPonderadaPA) * 100 : 0;

      // Fixed store meta comparison (1.75)
      const metaFixaLoja = 1.75;
      const atingimentoMetaFixa = (paRealizado / metaFixaLoja) * 100;

      const isBateuPonderada = paRealizado >= metaPonderadaPA;
      const isBateuFixa = paRealizado >= metaFixaLoja;

      return {
        ...v,
        paRealizado,
        metaPonderadaPA,
        totalPecasEsperadas,
        atingimentoPct,
        metaFixaLoja,
        atingimentoMetaFixa,
        isBateuPonderada,
        isBateuFixa,
        // DIVERGÊNCIA: Bateu ponderada mas não bateria a fixa, ou vice-versa
        justicaHighlight: isBateuPonderada && !isBateuFixa ? "JUSTIÇA_POSITIVA" : (!isBateuPonderada && isBateuFixa ? "ALERTA_AJUSTE" : "NEUTRO")
      };
    });

    return results.sort((a, b) => b.totalVenda - a.totalVenda);
  }, [data, escalaStore, customMetas]);

  // Filtered vendors by search
  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return processedData;
    return processedData.filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [processedData, searchTerm]);

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
              Calcula a meta de PA de cada colaborador com base na quantidade real de atendimentos realizados nas posições escaladas (<strong className="text-amber-300">P1, P2, P3</strong>).
            </p>
          </div>

          {/* ESCALA IMPORT ACTIONS */}
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
                Em vez de exigir uma meta fixa (ex: 1.75 PA) de um colaborador que passou parte do mês no Caixa (P1) e parte no Salão (P3), calculamos a meta pelas <strong>oportunidades efetivas</strong> que ele teve:
              </p>
              <div className="mt-2 text-[11px] font-mono bg-white/80 border border-slate-200 p-2 rounded-xl text-slate-800 font-semibold inline-block">
                Meta Individual = Σ (Atendimentos na Posição × Meta da Posição) ÷ Total de Atendimentos
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-xs text-center shrink-0 w-full md:w-auto">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Metas Padrão Vigentes</p>
            <div className="flex items-center justify-center gap-3 mt-1.5">
              <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                P1 (Caixa): {customMetas.P1.toFixed(2)}
              </span>
              <span className="text-xs font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                P2 (Porta): {customMetas.P2.toFixed(2)}
              </span>
              <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                P3 (Salão): {customMetas.P3.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm p-4 bg-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total de Atendimentos</p>
          <p className="text-2xl font-black text-slate-900">{storeSummary.totalCupons.toLocaleString()}</p>
          <p className="text-[10px] font-semibold text-slate-500 mt-1">{storeSummary.totalItens.toLocaleString()} peças vendidas</p>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm p-4 bg-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">PA Realizado da Loja</p>
          <p className="text-2xl font-black text-indigo-600">{formatNum(storeSummary.storePaRealizado)}</p>
          <p className="text-[10px] font-semibold text-slate-500 mt-1">Média consolidada</p>
        </Card>

        <Card className="rounded-2xl border-indigo-200 bg-indigo-50/50 shadow-sm p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700 mb-1">Meta Loja Ponderada</p>
          <p className="text-2xl font-black text-indigo-900">{formatNum(storeSummary.storeMetaPonderada)}</p>
          <p className="text-[10px] font-semibold text-indigo-600 mt-1">
            {formatNum(storeSummary.storeAtingimento, 1)}% de atingimento
          </p>
        </Card>

        <Card className="rounded-2xl border-emerald-200 bg-emerald-50/50 shadow-sm p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1">Acima da Meta Ponderada</p>
          <p className="text-2xl font-black text-emerald-800">
            {storeSummary.countAcimaMeta} / {storeSummary.countTotal}
          </p>
          <p className="text-[10px] font-semibold text-emerald-600 mt-1">
            {storeSummary.countTotal > 0 ? Math.round((storeSummary.countAcimaMeta / storeSummary.countTotal) * 100) : 0}% da equipe atingiu
          </p>
        </Card>
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Input 
            type="text" 
            placeholder="Buscar colaborador..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-10 rounded-2xl bg-white border-slate-200 text-xs font-bold placeholder:text-slate-400"
          />
          <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>

        {!escalaStore && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl font-medium flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Sem arquivo de escala importado. Importe o arquivo JSON do RH Escala para habilitar o mapeamento por dia e posição.</span>
          </div>
        )}
      </div>

      {/* COLLABORATOR TABLE LIST */}
      <div className="space-y-3">
        {filteredResults.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">Nenhum colaborador encontrado.</p>
          </div>
        ) : (
          filteredResults.map(v => {
            const isExpanded = selectedColab === v.name;
            const p1 = v.byPosition["P1"];
            const p2 = v.byPosition["P2"];
            const p3 = v.byPosition["P3"];

            return (
              <Card 
                key={v.name}
                className={cn(
                  "rounded-3xl border transition-all overflow-hidden",
                  v.isBateuPonderada 
                    ? "border-emerald-200/80 bg-white hover:border-emerald-300 shadow-sm" 
                    : "border-rose-200/80 bg-white hover:border-rose-300 shadow-sm"
                )}
              >
                <div className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                  
                  {/* LEFT: NAME & POSITION PILLS */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">
                        {v.name}
                      </h3>

                      {/* STATUS BADGE */}
                      {v.isBateuPonderada ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Bateu a Meta ({formatNum(v.atingimentoPct, 1)}%)</span>
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>Abaixo da Meta ({formatNum(v.atingimentoPct, 1)}%)</span>
                        </Badge>
                      )}

                      {/* JUSTIÇA HIGHLIGHT BADGE */}
                      {v.justicaHighlight === "JUSTIÇA_POSITIVA" && (
                        <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[9px] uppercase px-2 py-0.5 rounded-full shadow-xs" title="Superou a meta ponderada, embora ficasse abaixo da meta fixa rígida de 1,75.">
                          🏆 Justiça de Oportunidade
                        </Badge>
                      )}
                    </div>

                    {/* ATENDIMENTOS DISTRIBUTION PER POSITION */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {p1 && p1.cupons > 0 && (
                        <span className="text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          P1 Caixa: <strong>{p1.cupons} atend.</strong> ({Math.round((p1.cupons / v.totalCupons) * 100)}%)
                        </span>
                      )}
                      {p2 && p2.cupons > 0 && (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          P2 Porta: <strong>{p2.cupons} atend.</strong> ({Math.round((p2.cupons / v.totalCupons) * 100)}%)
                        </span>
                      )}
                      {p3 && p3.cupons > 0 && (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          P3 Salão: <strong>{p3.cupons} atend.</strong> ({Math.round((p3.cupons / v.totalCupons) * 100)}%)
                        </span>
                      )}
                      {Object.entries(v.byPosition).map(([pos, data]) => {
                        if (["P1", "P2", "P3"].includes(pos) || data.cupons === 0) return null;
                        return (
                          <span key={pos} className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-xl">
                            {pos}: <strong>{data.cupons} atend.</strong>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* RIGHT: COMPARISON NUMBERS */}
                  <div className="flex flex-wrap items-center gap-6 sm:gap-8 shrink-0 w-full lg:w-auto justify-between lg:justify-end">
                    
                    {/* TOTAL ATENDIMENTOS & ITENS */}
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase text-slate-400">Atendimentos</p>
                      <p className="text-lg font-black text-slate-800">{v.totalCupons}</p>
                      <p className="text-[9px] font-semibold text-slate-500">{v.totalItens} pcs</p>
                    </div>

                    {/* META INDIVIDUAL PONDERADA */}
                    <div className="text-center bg-indigo-50/70 border border-indigo-100 p-2 px-3 rounded-2xl">
                      <p className="text-[10px] font-black uppercase text-indigo-600">Meta Ponderada</p>
                      <p className="text-xl font-black text-indigo-900">{formatNum(v.metaPonderadaPA)} PA</p>
                      <p className="text-[9px] font-bold text-indigo-500">{formatNum(v.totalPecasEsperadas, 0)} pcs esp.</p>
                    </div>

                    {/* PA REALIZADO */}
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase text-slate-400">PA Realizado</p>
                      <p className={cn(
                        "text-xl font-black",
                        v.isBateuPonderada ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {formatNum(v.paRealizado)}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400">
                        {v.isBateuPonderada ? "▲ Acima" : "▼ Abaixo"}
                      </p>
                    </div>

                    {/* TOGGLE EXPAND DETAILS */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedColab(isExpanded ? null : v.name)}
                      className="rounded-2xl h-10 px-3 text-slate-500 font-bold text-xs gap-1.5"
                    >
                      <span>{isExpanded ? "Ocultar" : "Detalhar"}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* EXPANDABLE DETAILS */}
                {isExpanded && (
                  <div className="bg-slate-50 border-t border-slate-200/80 p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* CALCULATION BREAKDOWN TABLE */}
                      <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                        <h4 className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-indigo-500" />
                          <span>Cálculo Detalhado por Posição</span>
                        </h4>

                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[9px] tracking-wider">
                              <tr>
                                <th className="p-2.5 rounded-l-xl">Posição Escalada</th>
                                <th className="p-2.5 text-right">Atendimentos</th>
                                <th className="p-2.5 text-right">Meta PA</th>
                                <th className="p-2.5 text-right">Peças Esperadas</th>
                                <th className="p-2.5 text-right rounded-r-xl">Peças Vendidas</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {Object.entries(v.byPosition).map(([pos, data]) => {
                                if (data.cupons === 0) return null;
                                return (
                                  <tr key={pos} className="hover:bg-slate-50">
                                    <td className="p-2.5 font-bold uppercase text-slate-800">
                                      {pos === "P1" ? "P1 — Caixa" : pos === "P2" ? "P2 — Porta" : pos === "P3" ? "P3 — Salão" : pos}
                                    </td>
                                    <td className="p-2.5 text-right font-bold">{data.cupons}</td>
                                    <td className="p-2.5 text-right text-indigo-600 font-bold">{formatNum(data.metaPosicao)}</td>
                                    <td className="p-2.5 text-right text-slate-700 font-bold">{formatNum(data.pecasEsperadas, 1)}</td>
                                    <td className="p-2.5 text-right text-emerald-700 font-bold">{data.itens}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-slate-50 font-black text-slate-900 border-t border-slate-200">
                              <tr>
                                <td className="p-2.5 uppercase">TOTAL / PONDERADA</td>
                                <td className="p-2.5 text-right">{v.totalCupons}</td>
                                <td className="p-2.5 text-right text-indigo-700">{formatNum(v.metaPonderadaPA)} PA</td>
                                <td className="p-2.5 text-right">{formatNum(v.totalPecasEsperadas, 1)}</td>
                                <td className="p-2.5 text-right text-emerald-800">{v.totalItens}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>

                      {/* FAIRNESS COMPARISON CARD */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                            <Scale className="w-4 h-4 text-amber-500" />
                            <span>Impacto da Avaliação de Justiça</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                            Comparação entre a Meta Rígida de Loja (1,75) e a Meta Ajustada às Posições reais:
                          </p>

                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="font-bold text-slate-500">Meta Fixa Loja:</span>
                              <span className="font-black text-slate-700">1,75 PA ({formatNum(v.atingimentoMetaFixa, 1)}%)</span>
                            </div>
                            <div className="flex items-center justify-between text-xs p-2 bg-indigo-50 rounded-xl border border-indigo-100">
                              <span className="font-bold text-indigo-700">Meta Ponderada:</span>
                              <span className="font-black text-indigo-900">{formatNum(v.metaPonderadaPA)} PA ({formatNum(v.atingimentoPct, 1)}%)</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          {v.isBateuPonderada ? (
                            <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 leading-snug">
                              ✅ O colaborador atingiu o resultado esperado considerando a distribuição real de posições em que atuou.
                            </p>
                          ) : (
                            <p className="text-[11px] font-bold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-100 leading-snug">
                              ⚠️ O colaborador ficou abaixo das expectativas para a combinação de posições em que trabalhou.
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
