"use client";

import React, { useMemo, useState, useEffect } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { 
  Flame, X, Search, Calendar, Trophy, Zap, AlertCircle, 
  Share2, ChevronDown, ChevronRight, Hash, Receipt, 
  TrendingUp, Users, Smartphone, Store
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, format, min, max } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface UnmissableOffersAnalysisProps {
  data: DetailedSaleRow[];
}

const COLORS = ["#f97316", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

export function UnmissableOffersAnalysis({ data }: UnmissableOffersAnalysisProps) {
  const [inputCodes, setInputCodes] = useState("");
  const [activeCodes, setActiveCodes] = useState<string[]>([]);
  const { toast } = useToast();

  const [expandedColab, setExpandedColab] = useState<string | null>(null);
  const [expandedColabDay, setExpandedColabDay] = useState<string | null>(null);
  
  // 0 = Dom, 1 = Seg, ... 6 = Sáb. Default: Quinta(4) a Domingo(0)
  const [selectedDays, setSelectedDays] = useState<number[]>([4, 5, 6, 0]);
  
  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("unmissableOffersCodes");
    if (saved) {
      setInputCodes(saved);
      processCodes(saved);
    }
  }, []);

  const processCodes = (raw: string) => {
    const codes = raw
      .split(/[\n,;]+/)
      .map(c => c.trim().toUpperCase())
      .filter(c => c.length > 0);
    const unique = Array.from(new Set(codes));
    setActiveCodes(unique);
    localStorage.setItem("unmissableOffersCodes", raw);
    setExpandedColab(null);
    setExpandedColabDay(null);
  };

  const handleApply = () => {
    processCodes(inputCodes);
  };

  const clearCodes = () => {
    setInputCodes("");
    setActiveCodes([]);
    localStorage.removeItem("unmissableOffersCodes");
  };

  const sales = useMemo(() => {
    return data.filter(r => {
      if (r.is_cancelada || r.tpNF !== 1 || r.is_devolucao || !r.itens || r.itens.length === 0) return false;
      const d = parseISO(r.dhEmi);
      if (isNaN(d.getTime())) return true; // keep if invalid date just in case
      return selectedDays.includes(d.getDay());
    });
  }, [data, selectedDays]);

  const analysisPeriod = useMemo(() => {
    if (sales.length === 0) return "Período Indefinido";
    const dates = sales.map(r => parseISO(r.dhEmi)).filter(d => !isNaN(d.getTime()));
    if (dates.length === 0) return "Período Indefinido";
    const start = min(dates);
    const end = max(dates);
    return `${format(start, "dd/MM/yy")} a ${format(end, "dd/MM/yy")}`;
  }, [sales]);

  // Main calculations
  const analysisData = useMemo(() => {
    if (activeCodes.length === 0) return null;

    let totalFaturamentoGeral = 0;
    let totalPecasGeral = 0;
    let totalCuponsGeral = sales.length;

    let totalFaturamentoOfertas = 0;
    let totalPecasOfertas = 0;
    let totalFaturamentoSemOfertas = 0;
    let totalPecasSemOfertas = 0;
    
    // Vendas que contem alguma das ofertas
    const salesWithOffer: DetailedSaleRow[] = [];
    
    const itemsStats: Record<string, { qtd: number; valor: number; nome: string; numVendas: number }> = {};
    activeCodes.forEach(c => itemsStats[c] = { qtd: 0, valor: 0, nome: "Desconhecido", numVendas: 0 });

    type ColabStats = {
      vendasTotais: number;
      fatTotal: number;
      pecasTotal: number;
      fatSemOfertas: number;
      pecasSemOfertas: number;
      ofertasVendidas: number;
      fatOfertas: number;
      cuponsComOferta: number;
      dias: Record<string, {
        dateStr: string;
        vendasTotais: number;
        fatTotal: number;
        ofertasVendidas: number;
        fatOfertas: number;
        cupons: DetailedSaleRow[];
      }>;
    };

    const colabMap: Record<string, ColabStats> = {};

    for (const s of sales) {
      const vend = s.vendedor || "DESCONHECIDO";
      if (vend === "COLABORADOR NÃO IDENTIFICADO") continue;

      if (!colabMap[vend]) {
        colabMap[vend] = {
          vendasTotais: 0, fatTotal: 0, pecasTotal: 0, 
          fatSemOfertas: 0, pecasSemOfertas: 0, 
          ofertasVendidas: 0, fatOfertas: 0, cuponsComOferta: 0, dias: {}
        };
      }

      const cMap = colabMap[vend];
      cMap.vendasTotais++;
      
      const vNF = parseFloat(s.vNF);
      totalFaturamentoGeral += vNF;
      cMap.fatTotal += vNF;
      
      let temOferta = false;
      let fatOfertasNaNota = 0;
      let pecasOfertasNaNota = 0;
      let fatNaoOfertasNaNota = 0;
      let pecasNaoOfertasNaNota = 0;

      const dateStrKey = s.dhEmi.split('T')[0];
      const parsedDate = parseISO(s.dhEmi);
      const displayDate = !isNaN(parsedDate.getTime()) ? format(parsedDate, "dd/MM") : dateStrKey;

      if (!cMap.dias[dateStrKey]) {
        cMap.dias[dateStrKey] = { dateStr: displayDate, vendasTotais: 0, fatTotal: 0, ofertasVendidas: 0, fatOfertas: 0, cupons: [] };
      }
      
      const dMap = cMap.dias[dateStrKey];
      dMap.vendasTotais++;
      dMap.fatTotal += vNF;
      dMap.cupons.push(s);

      const matchedCodes = new Set<string>();

      for (const item of s.itens) {
        const itemCode = item.cProd?.toUpperCase() || "";
        const itemName = item.xProd?.toUpperCase() || "";
        const vProd = item.vProd || 0;
        const qCom = item.qCom || 1;

        totalPecasGeral += qCom;
        cMap.pecasTotal += qCom;

        const codeMatch = activeCodes.find(c => itemCode.includes(c) || itemName.includes(c));
        
        if (codeMatch) {
          temOferta = true;
          fatOfertasNaNota += vProd;
          pecasOfertasNaNota += qCom;
          
          matchedCodes.add(codeMatch);
          itemsStats[codeMatch].qtd += qCom;
          itemsStats[codeMatch].valor += vProd;
          if (itemsStats[codeMatch].nome === "Desconhecido") itemsStats[codeMatch].nome = itemName;
        } else {
          fatNaoOfertasNaNota += vProd;
          pecasNaoOfertasNaNota += qCom;
        }
      }

      if (temOferta) {
        salesWithOffer.push(s);
        cMap.cuponsComOferta++;
        cMap.ofertasVendidas += pecasOfertasNaNota;
        cMap.fatOfertas += fatOfertasNaNota;
        dMap.ofertasVendidas += pecasOfertasNaNota;
        dMap.fatOfertas += fatOfertasNaNota;
        
        totalFaturamentoOfertas += fatOfertasNaNota;
        totalPecasOfertas += pecasOfertasNaNota;
        
        matchedCodes.forEach(c => itemsStats[c].numVendas++);
      }

      totalFaturamentoSemOfertas += fatNaoOfertasNaNota;
      totalPecasSemOfertas += pecasNaoOfertasNaNota;
      
      cMap.fatSemOfertas += fatNaoOfertasNaNota;
      cMap.pecasSemOfertas += pecasNaoOfertasNaNota;
    }

    const itemsArr = Object.entries(itemsStats)
      .map(([code, stats]) => ({ code, ...stats }))
      .sort((a, b) => b.qtd - a.qtd);

    const colabArr = Object.entries(colabMap)
      .map(([nome, stats]) => ({ nome, ...stats }))
      .sort((a, b) => b.ofertasVendidas - a.ofertasVendidas);

    return {
      salesWithOffer,
      itemsArr,
      colabArr,
      global: {
        totalFaturamentoGeral,
        totalPecasGeral,
        totalCuponsGeral,
        totalFaturamentoOfertas,
        totalPecasOfertas,
        totalFaturamentoSemOfertas,
        totalPecasSemOfertas
      }
    };
  }, [sales, activeCodes]);

  const generateWhatsappText = () => {
    if (!analysisData || analysisData.itemsArr.length === 0) return;
    
    let text = `🚨 *FECHAMENTO - OFERTAS IMPERDÍVEIS* 🚨\n`;
    text += `*Período:* ${analysisPeriod}\n\n`;

    const totalVendidas = analysisData.colabArr.reduce((acc, c) => acc + c.ofertasVendidas, 0);
    const fatTotalOfertas = analysisData.colabArr.reduce((acc, c) => acc + c.fatOfertas, 0);

    text += `*Total:* ${totalVendidas} peças vendidas destas ofertas\n`;
    text += `*Faturamento:* ${fmtBRL(fatTotalOfertas)}\n\n`;

    text += `🏆 *TOP 3 VENDEDORES*\n`;
    const topColab = analysisData.colabArr.slice(0, 3);
    const medals = ["🥇", "🥈", "🥉"];
    topColab.forEach((c, i) => {
      text += `${medals[i]} ${c.nome.split(" ")[0]}: ${c.ofertasVendidas} pçs (${fmtBRL(c.fatOfertas)})\n`;
    });

    text += `\n📦 *TOP PRODUTOS*\n`;
    const topItems = analysisData.itemsArr.filter(i => i.qtd > 0).slice(0, 5);
    const numIcons = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
    topItems.forEach((it, i) => {
      text += `${numIcons[i]} ${it.nome} - ${it.qtd} pçs\n`;
    });

    text += `\n🚀 *Bora acelerar o ritmo!*`;

    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado para a área de transferência",
      description: "Cole no WhatsApp para compartilhar os resultados com a equipe.",
    });
  };

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (activeCodes.length === 0 || !analysisData) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500 pb-20">
        <Header activeCodes={activeCodes} inputCodes={inputCodes} setInputCodes={setInputCodes} handleApply={handleApply} clearCodes={clearCodes} selectedDays={selectedDays} setSelectedDays={setSelectedDays} />
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
          <Zap className="w-16 h-16 opacity-30 text-rose-500" />
          <p className="text-sm font-bold uppercase tracking-widest text-center px-4">
            Insira os códigos acima para iniciar a análise detalhada das ofertas
          </p>
        </div>
      </div>
    );
  }

  const g = analysisData.global;
  const fatOfertas = g.totalFaturamentoOfertas;
  const pecasOfertas = g.totalPecasOfertas;
  const cuponsOfertas = analysisData.salesWithOffer.length;
  const participacao = g.totalFaturamentoGeral > 0 ? (fatOfertas / g.totalFaturamentoGeral) * 100 : 0;

  const tkmGeral = g.totalCuponsGeral > 0 ? g.totalFaturamentoGeral / g.totalCuponsGeral : 0;
  const paGeral = g.totalCuponsGeral > 0 ? g.totalPecasGeral / g.totalCuponsGeral : 0;
  
  // Recalculate 'Sem Ofertas' properly by subtracting the actual offer value from the invoice net total
  const fatRealSemOfertas = Math.max(0, g.totalFaturamentoGeral - fatOfertas);
  const pecasRealSemOfertas = Math.max(0, g.totalPecasGeral - pecasOfertas);

  const tkmSemOfertas = g.totalCuponsGeral > 0 ? fatRealSemOfertas / g.totalCuponsGeral : 0;
  const paSemOfertas = g.totalCuponsGeral > 0 ? pecasRealSemOfertas / g.totalCuponsGeral : 0;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      <Header activeCodes={activeCodes} inputCodes={inputCodes} setInputCodes={setInputCodes} handleApply={handleApply} clearCodes={clearCodes} selectedDays={selectedDays} setSelectedDays={setSelectedDays} />
      
      {/* Botão WhatsApp Export */}
      <div className="flex justify-end">
        <button
          onClick={generateWhatsappText}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-xs px-5 py-3 rounded-2xl transition-all shadow-sm shadow-emerald-200 flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          Copiar Resumo para WhatsApp
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Geral */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Store className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="font-black text-sm uppercase text-slate-700 tracking-wider">Resultado Consolidado</h3>
            </div>
            <Badge variant="outline" className="text-rose-500 border-rose-200 bg-rose-50 font-black uppercase">
              {participacao.toFixed(1)}% Partic.
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1 bg-slate-50 p-4 rounded-2xl flex flex-col justify-center border border-slate-100/50">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Ofertas</span>
              <p className="text-2xl font-black text-rose-600">{pecasOfertas} <span className="text-xs text-slate-400 font-bold">pç</span></p>
            </div>
            <div className="space-y-1 bg-slate-50 p-4 rounded-2xl flex flex-col justify-center border border-slate-100/50">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Faturamento</span>
              <p className="text-xl font-black text-emerald-600">{fmtBRL(fatOfertas)}</p>
            </div>
            <div className="space-y-1 bg-slate-50 p-4 rounded-2xl flex flex-col justify-center border border-slate-100/50">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Cupons</span>
              <p className="text-xl font-black text-slate-800">{cuponsOfertas}</p>
            </div>
          </div>
        </div>

        {/* Card Impacto Comparativo */}
        <div className="bg-slate-900 rounded-[2rem] p-6 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 blur-[50px] -mr-10 -mt-10" />
          <div className="relative z-10 flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/20 rounded-xl">
                <TrendingUp className="w-5 h-5 text-sky-400" />
              </div>
              <h3 className="font-black text-sm uppercase text-white tracking-wider">Impacto das Ofertas</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-y-4 gap-x-4 relative z-10">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">TKM (C/ Ofertas)</span>
              <p className="text-xl font-black text-emerald-400">{fmtBRL(tkmGeral)}</p>
              <div className="mt-3 pt-3 border-t border-white/5">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Sem ofertas: <span className="text-rose-400">{fmtBRL(tkmSemOfertas)}</span></span>
              </div>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">P.A. (C/ Ofertas)</span>
              <p className="text-xl font-black text-emerald-400">{paGeral.toFixed(2)} <span className="text-xs text-emerald-400/50">pç</span></p>
              <div className="mt-3 pt-3 border-t border-white/5">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Sem ofertas: <span className="text-rose-400">{paSemOfertas.toFixed(2)}</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Itens */}
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden lg:col-span-1 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg"><Zap className="w-4 h-4" /></div>
            <h3 className="font-black text-sm uppercase text-slate-700">Resumo por Código</h3>
          </div>
          <div className="p-2 flex-1 overflow-y-auto max-h-[500px]">
            {analysisData.itemsArr.map((item) => (
              <div key={item.code} className="p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors rounded-xl">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1 min-w-0 pr-2">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full mb-1 inline-block">
                      {item.code}
                    </span>
                    <p className="text-xs font-black text-slate-700 truncate" title={item.nome}>{item.nome}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-rose-600">{item.qtd} pç</p>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] font-bold text-slate-400">{item.numVendas} cupons</span>
                  <span className="text-[10px] font-black text-emerald-600">{fmtBRL(item.valor)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detalhes Colaboradores */}
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden lg:col-span-2">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><Users className="w-4 h-4" /></div>
              <h3 className="font-black text-sm uppercase text-slate-700">Detalhamento por Colaborador</h3>
            </div>
            <Badge variant="outline" className="text-[9px] uppercase font-bold text-slate-400 border-slate-200 bg-white">Clique para expandir</Badge>
          </div>
          <div className="p-2 overflow-y-auto max-h-[700px] space-y-2">
            {analysisData.colabArr.map((c, i) => {
              const maxQtdColab = analysisData.colabArr[0]?.ofertasVendidas || 1;
              const isExpanded = expandedColab === c.nome;

              const paColab = c.vendasTotais > 0 ? c.pecasTotal / c.vendasTotais : 0;
              const paSemOfertasColab = c.vendasTotais > 0 ? c.pecasSemOfertas / c.vendasTotais : 0;
              
              const tkmColab = c.vendasTotais > 0 ? c.fatTotal / c.vendasTotais : 0;
              const tkmSemOfertasColab = c.vendasTotais > 0 ? c.fatSemOfertas / c.vendasTotais : 0;

              return (
                <div key={c.nome} className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                  {/* Cabeçalho Colaborador */}
                  <div 
                    onClick={() => setExpandedColab(isExpanded ? null : c.nome)}
                    className={cn(
                      "flex flex-col md:flex-row md:items-center gap-3 p-3 cursor-pointer transition-colors",
                      isExpanded ? "bg-indigo-50/50" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3 w-full md:w-auto md:flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-700 truncate">{c.nome}</p>
                        <div className="flex items-center gap-2 mt-1 w-32 md:w-48">
                          <Progress value={(c.ofertasVendidas / maxQtdColab) * 100} className="h-1.5 flex-1 bg-slate-200" 
                            style={{ "--progress-color": COLORS[i % COLORS.length] } as React.CSSProperties} />
                        </div>
                      </div>
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />}
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 ml-10 md:ml-0">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ofertas</p>
                        <p className="text-base font-black text-rose-600">{c.ofertasVendidas} pçs</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Faturamento</p>
                        <p className="text-sm font-black text-emerald-600">{fmtBRL(c.fatOfertas)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Detalhamento Expandido do Colaborador */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
                      {/* KPIs Comparativos do Colaborador */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">TKM Geral</p>
                          <p className="text-sm font-black text-slate-800">{fmtBRL(tkmColab)}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">TKM (Sem Ofertas)</p>
                          <p className="text-sm font-black text-rose-500">{fmtBRL(tkmSemOfertasColab)}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">P.A. Geral</p>
                          <p className="text-sm font-black text-slate-800">{paColab.toFixed(2)}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">P.A. (Sem Ofertas)</p>
                          <p className="text-sm font-black text-rose-500">{paSemOfertasColab.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Lista de Dias onde vendeu oferta */}
                      <div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Dias com vendas de oferta
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(c.dias)
                            .filter(([_, d]) => d.ofertasVendidas > 0)
                            .sort((a, b) => a[0].localeCompare(b[0]))
                            .map(([key, d]) => {
                              const isDayExpanded = expandedColabDay === `${c.nome}-${key}`;
                              return (
                                <div key={key} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                  <div 
                                    onClick={() => setExpandedColabDay(isDayExpanded ? null : `${c.nome}-${key}`)}
                                    className="p-2 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      {isDayExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                      <span className="text-xs font-bold text-slate-700">{d.dateStr}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs">
                                      <span className="font-bold text-rose-500">{d.ofertasVendidas} pçs</span>
                                      <span className="font-bold text-emerald-600 hidden md:inline">{fmtBRL(d.fatOfertas)}</span>
                                    </div>
                                  </div>
                                  
                                  {isDayExpanded && (
                                    <div className="bg-slate-100 p-2 border-t border-slate-200 flex flex-col gap-2">
                                      {d.cupons.filter(cupom => cupom.itens.some(it => activeCodes.some(code => (it.cProd?.toUpperCase().includes(code) || it.xProd?.toUpperCase().includes(code))))).map(cupom => {
                                        const itensOferta = cupom.itens.filter(it => activeCodes.some(code => (it.cProd?.toUpperCase().includes(code) || it.xProd?.toUpperCase().includes(code))));
                                        return (
                                          <div key={cupom.chave} className="bg-white p-2 rounded border border-slate-200 text-xs shadow-sm">
                                            <div className="flex justify-between items-center mb-1 border-b border-slate-50 pb-1">
                                              <span className="font-black text-slate-600 flex items-center gap-1"><Receipt className="w-3 h-3 text-slate-400"/> NF {cupom.nf}</span>
                                              <span className="font-bold text-slate-500">{cupom.dhEmi.split('T')[1].substring(0,5)}</span>
                                            </div>
                                            {itensOferta.map((it, idx) => (
                                              <div key={idx} className="flex justify-between items-center py-0.5">
                                                <span className="text-[10px] font-medium text-slate-600 truncate flex-1 pr-2">{it.xProd}</span>
                                                <span className="font-bold text-rose-600 shrink-0">{it.qCom} pç</span>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ activeCodes, inputCodes, setInputCodes, handleApply, clearCodes, selectedDays, setSelectedDays }: any) {
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return (
    <div className="bg-gradient-to-br from-rose-600 via-rose-500 to-orange-500 rounded-[2.5rem] p-8 text-white relative shadow-2xl">
      <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 blur-[120px] -mr-20 -mt-20" />
      </div>
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
            <Flame className="w-10 h-10 text-white" />
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black tracking-tighter uppercase italic">Ofertas Imperdíveis</h2>
            <p className="text-rose-100 font-medium text-sm mt-1 max-w-md mb-4">
              Monitore a conversão de produtos estratégicos de alto impacto por colaborador.
            </p>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map(day => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedDays((prev: number[]) => prev.filter(d => d !== day));
                      } else {
                        setSelectedDays((prev: number[]) => [...prev, day].sort());
                      }
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border",
                      isSelected ? "bg-white text-rose-600 border-white shadow-sm shadow-rose-900/20" : "bg-white/10 text-white/50 border-white/20 hover:bg-white/20 hover:text-white"
                    )}
                  >
                    {dayNames[day]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="w-full md:w-[450px]">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 w-full flex gap-3 items-stretch shadow-inner">
            <textarea
              value={inputCodes}
              onChange={e => setInputCodes(e.target.value)}
              placeholder="Ex: 12345, 67890..."
              className="w-full bg-transparent text-white placeholder:text-rose-200 p-2 text-sm font-bold focus:outline-none resize-none custom-scrollbar"
              rows={2}
            />
            <div className="flex flex-col gap-2 shrink-0 justify-center">
              <button
                onClick={handleApply}
                className="bg-white hover:bg-rose-50 text-rose-600 font-black uppercase text-xs px-4 py-2 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 h-full"
              >
                <Search className="w-4 h-4" />
                Analisar
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {activeCodes.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2 relative z-10">
          <Badge 
            variant="outline" 
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer px-3 py-1.5 rounded-xl gap-2 transition-colors"
            onClick={clearCodes}
          >
            <X className="w-3 h-3" /> Limpar Análise
          </Badge>
          {activeCodes.map((code: string) => (
            <Badge key={code} className="bg-orange-500/80 backdrop-blur-md text-white px-3 py-1.5 rounded-xl border border-orange-400/30">
              <span className="font-black text-[10px]">{code}</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
