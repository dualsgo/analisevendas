
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShoppingCart, Info, ChevronDown, ChevronUp, Trophy, Store, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, getDay } from "date-fns";

interface ItemRankingProps {
  data: DetailedSaleRow[];
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const COLORS = ["#f97316", "#6366f1", "#10b981", "#f59e0b", "#ef4444"];

type SectionId = "colaborador" | "loja" | "dia";

export function ItemRanking({ data }: ItemRankingProps) {
  const [openSection, setOpenSection] = useState<SectionId>("colaborador");
  const [topN, setTopN] = useState(3);
  const [selectedVend, setSelectedVend] = useState<string | null>(null);

  const sales = useMemo(() =>
    data.filter(r => !r.is_cancelada && r.tpNF === 1 && !r.is_devolucao && r.itens?.length > 0),
    [data]
  );

  // ── Por colaborador: top N itens ─────────────────────────────────────────
  const colaboradorRanking = useMemo(() => {
    const byVend: Record<string, Record<string, { qtd: number; valor: number; nome: string }>> = {};
    for (const s of sales) {
      const vend = s.vendedor || "DESCONHECIDO";
      if (vend === "COLABORADOR NÃO IDENTIFICADO") continue;
      if (!byVend[vend]) byVend[vend] = {};
      for (const item of s.itens) {
        const key = item.cProd || item.xProd;
        if (!byVend[vend][key]) byVend[vend][key] = { qtd: 0, valor: 0, nome: item.xProd };
        byVend[vend][key].qtd += item.qCom || 1;
        byVend[vend][key].valor += item.vProd || 0;
      }
    }
    return Object.entries(byVend).map(([nome, produtos]) => {
      const sorted = Object.entries(produtos)
        .map(([cProd, v]) => ({ cProd, ...v }))
        .sort((a, b) => b.qtd - a.qtd);
      const totalVendas = sales.filter(s => s.vendedor === nome).length;
      return { nome, top: sorted.slice(0, topN), totalProdutos: sorted.length, totalVendas };
    }).sort((a, b) => b.totalVendas - a.totalVendas);
  }, [sales, topN]);

  const vendedores = colaboradorRanking.map(c => c.nome);

  // ── Ranking geral da loja ─────────────────────────────────────────────────
  const lojaRanking = useMemo(() => {
    const map: Record<string, { qtd: number; valor: number; nome: string; vendedores: Set<string> }> = {};
    for (const s of sales) {
      for (const item of s.itens) {
        const key = item.cProd || item.xProd;
        if (!map[key]) map[key] = { qtd: 0, valor: 0, nome: item.xProd, vendedores: new Set() };
        map[key].qtd += item.qCom || 1;
        map[key].valor += item.vProd || 0;
        if (s.vendedor) map[key].vendedores.add(s.vendedor);
      }
    }
    return Object.values(map)
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 20)
      .map(p => ({ ...p, vendedores: p.vendedores.size }));
  }, [sales]);

  const maxQtdLoja = lojaRanking[0]?.qtd || 1;

  // ── Por dia da semana ─────────────────────────────────────────────────────
  const diaRanking = useMemo(() => {
    const byDow: Record<number, Record<string, { qtd: number; nome: string }>> = {};
    for (let d = 0; d < 7; d++) byDow[d] = {};
    for (const s of sales) {
      try {
        const dow = getDay(parseISO(s.dhEmi));
        for (const item of s.itens) {
          const key = item.cProd || item.xProd;
          if (!byDow[dow][key]) byDow[dow][key] = { qtd: 0, nome: item.xProd };
          byDow[dow][key].qtd += item.qCom || 1;
        }
      } catch { /* skip */ }
    }
    return DAYS.map((label, dow) => {
      const sorted = Object.values(byDow[dow]).sort((a, b) => b.qtd - a.qtd);
      return { label, top3: sorted.slice(0, 3) };
    });
  }, [sales]);

  const sections = [
    { id: "colaborador" as SectionId, label: "Top Itens por Colaborador", icon: Trophy },
    { id: "loja" as SectionId,        label: "Ranking Geral da Loja",     icon: Store },
    { id: "dia" as SectionId,         label: "Mais Vendido por Dia",      icon: Calendar },
  ];

  const fmtBRL = (v?: number | string | null) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
        <ShoppingCart className="w-16 h-16 opacity-30" />
        <p className="text-sm font-bold uppercase tracking-widest">Carregue XMLs para ver o ranking de itens</p>
      </div>
    );
  }

  const displayedVendedores = selectedVend
    ? colaboradorRanking.filter(c => c.nome === selectedVend)
    : colaboradorRanking;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-600 to-orange-500 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
          <div className="bg-white/10 p-3 rounded-2xl w-fit"><ShoppingCart className="w-8 h-8 text-orange-200" /></div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Ranking de Itens</h2>
            <p className="text-orange-100 text-sm font-medium mt-1">
              Top produtos por colaborador, ranking geral da loja e padrão por dia da semana
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Itens únicos", value: lojaRanking.length < 20 ? String(lojaRanking.length) : "20+" },
              { label: "Colaboradores", value: String(colaboradorRanking.length) },
            ].map(s => (
              <div key={s.label} className="bg-white/10 px-4 py-2 rounded-2xl text-center">
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{s.label}</p>
                <p className="text-lg font-black">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sections */}
      {sections.map(({ id, label, icon: Icon }) => (
        <div key={id} className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <button onClick={() => setOpenSection(prev => prev === id ? "colaborador" : id)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-50"><Icon className="w-5 h-5 text-orange-600" /></div>
              <span className="font-black text-slate-700 uppercase tracking-tight text-sm">{label}</span>
            </div>
            {openSection === id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSection === id && (
            <div className="px-5 pb-6 border-t border-slate-100 pt-5 space-y-4">

              {/* ── Por colaborador ── */}
              {id === "colaborador" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top:</span>
                    {[3, 5, 10].map(n => (
                      <button key={n} onClick={() => setTopN(n)}
                        className={cn("px-3 py-1 rounded-full text-xs font-bold transition-all",
                          topN === n ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                        {n} itens
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Filtrar:</span>
                    <button onClick={() => setSelectedVend(null)}
                      className={cn("px-3 py-1 rounded-full text-xs font-bold transition-all",
                        selectedVend === null ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                      Todos
                    </button>
                    {vendedores.slice(0, 8).map(v => (
                      <button key={v} onClick={() => setSelectedVend(prev => prev === v ? null : v)}
                        className={cn("px-3 py-1 rounded-full text-xs font-bold transition-all",
                          selectedVend === v ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                        {v.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                  <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-orange-700 font-medium">
                      Baseado na quantidade de peças vendidas por produto. Clique no colaborador para filtrar.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayedVendedores.map((c, ci) => (
                      <div key={ci} className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-sm font-black text-slate-700">{c.nome}</span>
                          <span className="text-[10px] text-slate-400">{c.totalVendas} vendas · {c.totalProdutos} produtos únicos</span>
                        </div>
                        <div className="p-3 space-y-2">
                          {c.top.map((item, ii) => (
                            <div key={ii} className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                                style={{ backgroundColor: COLORS[ii] || "#94a3b8" }}>
                                {ii + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-slate-700 truncate" title={item.nome}>{item.nome}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Progress value={c.top[0]?.qtd > 0 ? (item.qtd / c.top[0].qtd) * 100 : 0}
                                    className="h-1.5 flex-1 bg-slate-200"
                                    style={{ "--progress-color": COLORS[ii] } as React.CSSProperties} />
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-black text-slate-700">{item.qtd} pç</p>
                                <p className="text-[10px] text-slate-400">{fmtBRL(item.valor)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Ranking geral da loja ── */}
              {id === "loja" && (
                <div className="space-y-2">
                  {lojaRanking.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <span className={cn("text-xs font-black w-5 text-center",
                        i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-600" : "text-slate-300"
                      )}>
                        {i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-700 truncate" title={item.nome}>{item.nome}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={(item.qtd / maxQtdLoja) * 100} className="h-1.5 flex-1 bg-slate-200" />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-orange-600">{item.qtd} pç</p>
                        <p className="text-[10px] text-slate-400">{fmtBRL(item.valor)} · {item.vendedores} colab.</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Por dia ── */}
              {id === "dia" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {diaRanking.filter(d => d.top3.length > 0).map((d, di) => (
                    <div key={di} className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="bg-white px-4 py-3 border-b border-slate-100">
                        <span className="text-sm font-black text-slate-700">{d.label}</span>
                      </div>
                      <div className="p-3 space-y-2">
                        {d.top3.map((item, ii) => (
                          <div key={ii} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0"
                              style={{ backgroundColor: COLORS[ii] }}>
                              {ii + 1}
                            </div>
                            <p className="text-xs font-bold text-slate-600 flex-1 truncate" title={item.nome}>{item.nome}</p>
                            <span className="text-xs font-black text-slate-500">{item.qtd}pç</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
