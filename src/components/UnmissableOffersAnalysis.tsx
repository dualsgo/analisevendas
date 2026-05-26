"use client";

import React, { useMemo, useState, useEffect } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Flame, Info, Save, X, Search, Calendar, Trophy, Zap, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, getDay, format } from "date-fns";

interface UnmissableOffersAnalysisProps {
  data: DetailedSaleRow[];
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const COLORS = ["#f97316", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

export function UnmissableOffersAnalysis({ data }: UnmissableOffersAnalysisProps) {
  const [inputCodes, setInputCodes] = useState("");
  const [activeCodes, setActiveCodes] = useState<string[]>([]);
  
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
  };

  const handleApply = () => {
    processCodes(inputCodes);
  };

  const clearCodes = () => {
    setInputCodes("");
    setActiveCodes([]);
    localStorage.removeItem("unmissableOffersCodes");
  };

  // Base sales
  const sales = useMemo(() =>
    data.filter(r => !r.is_cancelada && r.tpNF === 1 && !r.is_devolucao && r.itens?.length > 0),
  [data]);

  // Filter sales that contain ANY of the active codes
  const filteredSalesData = useMemo(() => {
    if (activeCodes.length === 0) return { sales: [], totalGeralVendas: 0, itemsStats: [] };

    let totalGeral = 0;
    const matchingSales: DetailedSaleRow[] = [];
    
    // To track how each specific code is performing
    const statsByCode: Record<string, { qtd: number; valor: number; nome: string; numVendas: number }> = {};
    activeCodes.forEach(c => statsByCode[c] = { qtd: 0, valor: 0, nome: "Desconhecido", numVendas: 0 });

    for (const s of sales) {
      totalGeral += parseFloat(s.vNF);
      
      let saleHasMatch = false;
      const matchedItemsInSale = new Set<string>();

      for (const item of s.itens) {
        const itemCode = item.cProd?.toUpperCase() || "";
        const itemName = item.xProd?.toUpperCase() || "";
        
        const matchedCode = activeCodes.find(c => itemCode.includes(c) || itemName.includes(c));
        
        if (matchedCode) {
          saleHasMatch = true;
          matchedItemsInSale.add(matchedCode);
          
          statsByCode[matchedCode].qtd += item.qCom || 1;
          statsByCode[matchedCode].valor += item.vProd || 0;
          if (statsByCode[matchedCode].nome === "Desconhecido") {
            statsByCode[matchedCode].nome = item.xProd;
          }
        }
      }

      if (saleHasMatch) {
        matchingSales.push(s);
        matchedItemsInSale.forEach(c => statsByCode[c].numVendas++);
      }
    }

    const itemsStats = Object.entries(statsByCode)
      .map(([code, stats]) => ({ code, ...stats }))
      .sort((a, b) => b.qtd - a.qtd);

    return {
      sales: matchingSales,
      totalGeralVendas: totalGeral,
      itemsStats
    };
  }, [sales, activeCodes]);

  const matchingSales = filteredSalesData.sales;
  const itemsStats = filteredSalesData.itemsStats;

  const kpis = useMemo(() => {
    const totalVendas = matchingSales.length;
    const faturamento = matchingSales.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    
    // Items just from the unmissable offers inside those sales
    let qtdItensImperdiveis = 0;
    let fatItensImperdiveis = 0;
    
    for (const s of matchingSales) {
      for (const item of s.itens) {
        const itemCode = item.cProd?.toUpperCase() || "";
        const itemName = item.xProd?.toUpperCase() || "";
        if (activeCodes.some(c => itemCode.includes(c) || itemName.includes(c))) {
          qtdItensImperdiveis += item.qCom || 1;
          fatItensImperdiveis += item.vProd || 0;
        }
      }
    }

    const tkm = totalVendas > 0 ? faturamento / totalVendas : 0;
    const participacao = filteredSalesData.totalGeralVendas > 0 
      ? (faturamento / filteredSalesData.totalGeralVendas) * 100 
      : 0;

    return { totalVendas, faturamento, tkm, participacao, qtdItensImperdiveis, fatItensImperdiveis };
  }, [matchingSales, activeCodes, filteredSalesData.totalGeralVendas]);

  // Colaborador performance
  const colabPerformance = useMemo(() => {
    const map: Record<string, { vendas: number; qtdItens: number; fatItens: number; fatTotal: number }> = {};
    for (const s of matchingSales) {
      const vend = s.vendedor || "DESCONHECIDO";
      if (vend === "COLABORADOR NÃO IDENTIFICADO") continue;
      if (!map[vend]) map[vend] = { vendas: 0, qtdItens: 0, fatItens: 0, fatTotal: 0 };
      
      map[vend].vendas++;
      map[vend].fatTotal += parseFloat(s.vNF);
      
      for (const item of s.itens) {
        const itemCode = item.cProd?.toUpperCase() || "";
        const itemName = item.xProd?.toUpperCase() || "";
        if (activeCodes.some(c => itemCode.includes(c) || itemName.includes(c))) {
          map[vend].qtdItens += item.qCom || 1;
          map[vend].fatItens += item.vProd || 0;
        }
      }
    }
    
    return Object.entries(map)
      .map(([nome, stats]) => ({ nome, ...stats }))
      .sort((a, b) => b.qtdItens - a.qtdItens);
  }, [matchingSales, activeCodes]);

  const maxQtdColab = colabPerformance[0]?.qtdItens || 1;

  // Day performance
  const dayPerformance = useMemo(() => {
    const map: Record<string, { vendas: number; qtdItens: number; fatItens: number; dateStr: string }> = {};
    
    for (const s of matchingSales) {
      const date = parseISO(s.dhEmi);
      if (isNaN(date.getTime())) continue;
      
      const key = format(date, "yyyy-MM-dd");
      if (!map[key]) map[key] = { vendas: 0, qtdItens: 0, fatItens: 0, dateStr: format(date, "dd/MM") };
      
      map[key].vendas++;
      
      for (const item of s.itens) {
        const itemCode = item.cProd?.toUpperCase() || "";
        const itemName = item.xProd?.toUpperCase() || "";
        if (activeCodes.some(c => itemCode.includes(c) || itemName.includes(c))) {
          map[key].qtdItens += item.qCom || 1;
          map[key].fatItens += item.vProd || 0;
        }
      }
    }
    
    return Object.values(map).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [matchingSales, activeCodes]);

  const maxQtdDay = [...dayPerformance].sort((a, b) => b.qtdItens - a.qtdItens)[0]?.qtdItens || 1;

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-rose-600 to-pink-500 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start gap-6">
          <div className="bg-white/10 p-4 rounded-3xl shrink-0">
            <Flame className="w-10 h-10 text-rose-200" />
          </div>
          <div className="flex-1 w-full">
            <h2 className="text-2xl md:text-4xl font-black tracking-tighter uppercase mb-2">Ofertas Imperdíveis</h2>
            <p className="text-rose-100 text-sm font-medium mb-6 max-w-xl">
              Monitore produtos de alto impacto. Insira os códigos (separados por vírgula ou linha) e analise a performance de vendas, conversão por colaborador e ritmo diário.
            </p>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 w-full max-w-2xl flex gap-3 items-stretch">
              <textarea
                value={inputCodes}
                onChange={e => setInputCodes(e.target.value)}
                placeholder="Ex: 12345, 67890, 11223..."
                className="w-full bg-white/90 text-slate-800 rounded-xl p-3 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                rows={3}
              />
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={handleApply}
                  className="bg-white text-rose-600 hover:bg-rose-50 font-black uppercase text-xs px-4 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 h-full"
                >
                  <Search className="w-4 h-4" />
                  Analisar
                </button>
                {activeCodes.length > 0 && (
                  <button
                    onClick={clearCodes}
                    className="bg-rose-700/50 hover:bg-rose-700 text-white font-bold uppercase text-[10px] px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    <X className="w-3 h-3" /> Limpar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeCodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
          <Zap className="w-16 h-16 opacity-30 text-rose-500" />
          <p className="text-sm font-bold uppercase tracking-widest text-center px-4">
            Insira os códigos acima para iniciar a análise das ofertas
          </p>
        </div>
      ) : matchingSales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
          <AlertCircle className="w-16 h-16 opacity-30 text-slate-400" />
          <p className="text-sm font-bold uppercase tracking-widest text-center px-4">
            Nenhuma venda encontrada para os códigos informados
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Peças Vendidas</span>
              <span className="text-3xl font-black text-slate-800">{kpis.qtdItensImperdiveis}</span>
              <span className="text-xs text-rose-500 font-bold mt-1">Nestas Ofertas</span>
            </div>
            <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fat. das Ofertas</span>
              <span className="text-2xl md:text-3xl font-black text-emerald-600">{fmtBRL(kpis.fatItensImperdiveis)}</span>
            </div>
            <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cupons c/ Oferta</span>
              <span className="text-3xl font-black text-indigo-600">{kpis.totalVendas}</span>
              <span className="text-xs text-indigo-400 font-bold mt-1">
                {kpis.participacao.toFixed(1)}% do faturamento total
              </span>
            </div>
            <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">TKM dos Cupons</span>
              <span className="text-2xl md:text-3xl font-black text-sky-600">{fmtBRL(kpis.tkm)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Items Break Down */}
            <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden lg:col-span-1 flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg"><Zap className="w-4 h-4" /></div>
                <h3 className="font-black text-sm uppercase text-slate-700">Resumo por Código</h3>
              </div>
              <div className="p-2 flex-1 overflow-y-auto max-h-[400px]">
                {itemsStats.map((item, i) => (
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

            {/* Colaboradores Performance */}
            <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden lg:col-span-2">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><Trophy className="w-4 h-4" /></div>
                <h3 className="font-black text-sm uppercase text-slate-700">Performance da Equipe</h3>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                {colabPerformance.map((c, i) => (
                  <div key={c.nome} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-700 truncate">{c.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={(c.qtdItens / maxQtdColab) * 100} className="h-1.5 flex-1 bg-slate-200" 
                          style={{ "--progress-color": COLORS[i % COLORS.length] } as React.CSSProperties} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-indigo-600">{c.qtdItens} pç</p>
                      <p className="text-[10px] text-slate-400">{c.vendas} cupons</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
          </div>

          {/* Diário */}
          <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Calendar className="w-4 h-4" /></div>
              <h3 className="font-black text-sm uppercase text-slate-700">Ritmo Diário</h3>
            </div>
            <div className="p-6">
               <div className="flex items-end gap-2 h-40 w-full overflow-x-auto pb-2">
                 {dayPerformance.map((d, i) => {
                   const heightPct = Math.max((d.qtdItens / maxQtdDay) * 100, 5);
                   return (
                     <div key={d.dateStr} className="flex flex-col items-center flex-1 min-w-[40px] group">
                       <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md font-bold whitespace-nowrap z-10">
                         {d.qtdItens} peças<br/>{fmtBRL(d.fatItens)}
                       </div>
                       <div 
                         className="w-full max-w-[30px] bg-rose-500 rounded-t-md transition-all duration-500 group-hover:bg-rose-400"
                         style={{ height: `${heightPct}%` }}
                       />
                       <span className="text-[9px] font-bold text-slate-400 mt-2">{d.dateStr}</span>
                     </div>
                   );
                 })}
               </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
