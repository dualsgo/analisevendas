
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Info, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, getHours } from "date-fns";

interface PriceProfileProps {
  data: DetailedSaleRow[];
}

const FAIXAS = [
  { id: "F1", label: "R$0–50",    min: 0,   max: 50,   color: "#94a3b8", badge: "text-slate-600 bg-slate-100" },
  { id: "F2", label: "R$51–150",  min: 51,  max: 150,  color: "#22c55e", badge: "text-emerald-700 bg-emerald-100" },
  { id: "F3", label: "R$151–300", min: 151, max: 300,  color: "#f59e0b", badge: "text-amber-700 bg-amber-100" },
  { id: "F4", label: "R$301–500", min: 301, max: 500,  color: "#f97316", badge: "text-orange-700 bg-orange-100" },
  { id: "F5", label: "R$500+",    min: 501, max: Infinity, color: "#ef4444", badge: "text-rose-700 bg-rose-100" },
];

function getFaixa(precoUnit: number) {
  return FAIXAS.find(f => precoUnit >= f.min && precoUnit <= f.max) || FAIXAS[FAIXAS.length - 1];
}

function getPrecoUnitMedio(itens: DetailedSaleRow["itens"]): number | null {
  if (!itens || itens.length === 0) return null;
  const totalQtd = itens.reduce((a, i) => a + (i.qCom || 0), 0);
  const totalVal = itens.reduce((a, i) => a + (i.vProd || 0), 0);
  if (totalQtd <= 0) return null;
  return totalVal / totalQtd;
}

type SectionId = "heatmap" | "ranking" | "horario";

export function PriceProfile({ data }: PriceProfileProps) {
  const [openSection, setOpenSection] = useState<SectionId>("heatmap");

  const sales = useMemo(() =>
    data.filter(r => !r.is_cancelada && r.tpNF === 1 && !r.is_devolucao && r.itens?.length > 0),
    [data]
  );

  // Anotar cada nota com faixa de preço unitário médio
  const annotated = useMemo(() =>
    sales.map(s => {
      const preco = getPrecoUnitMedio(s.itens);
      return { ...s, preco, faixa: preco !== null ? getFaixa(preco) : null };
    }).filter(s => s.faixa !== null),
    [sales]
  );

  // ── Heatmap colaborador × faixa ──────────────────────────────────────────
  const heatmapData = useMemo(() => {
    const byVend: Record<string, Record<string, number>> = {};
    for (const s of annotated) {
      const vend = s.vendedor || "DESCONHECIDO";
      if (vend === "COLABORADOR NÃO IDENTIFICADO") continue;
      if (!byVend[vend]) byVend[vend] = {};
      const fId = s.faixa!.id;
      byVend[vend][fId] = (byVend[vend][fId] || 0) + 1;
    }
    return Object.entries(byVend).map(([nome, faixas]) => {
      const total = Object.values(faixas).reduce((a, b) => a + b, 0);
      return {
        nome,
        total,
        faixas: FAIXAS.map(f => ({
          id: f.id,
          count: faixas[f.id] || 0,
          pct: total > 0 ? ((faixas[f.id] || 0) / total) * 100 : 0,
        })),
        pctAlto: total > 0 ? (((faixas["F4"] || 0) + (faixas["F5"] || 0)) / total) * 100 : 0,
      };
    }).sort((a, b) => b.pctAlto - a.pctAlto);
  }, [annotated]);

  // ── Ranking por faixa alta ────────────────────────────────────────────────
  const profileLabel = (pctAlto: number) => {
    if (pctAlto >= 20) return { label: "Premium", color: "text-rose-700 bg-rose-100" };
    if (pctAlto >= 10) return { label: "Mid-High", color: "text-orange-700 bg-orange-100" };
    if (pctAlto >= 5)  return { label: "Mid", color: "text-amber-700 bg-amber-100" };
    return { label: "Volume", color: "text-slate-600 bg-slate-100" };
  };

  // ── Faixa por horário ─────────────────────────────────────────────────────
  const horarioData = useMemo(() => {
    const byHour: Record<number, Record<string, number>> = {};
    for (let h = 9; h <= 21; h++) byHour[h] = {};
    for (const s of annotated) {
      try {
        const h = getHours(parseISO(s.dhEmi));
        if (h < 9 || h > 21) continue;
        const fId = s.faixa!.id;
        byHour[h][fId] = (byHour[h][fId] || 0) + 1;
      } catch { /* skip */ }
    }
    return Object.entries(byHour).map(([h, faixas]) => {
      const total = Object.values(faixas).reduce((a, b) => a + b, 0);
      const dom = total > 0 ? FAIXAS.reduce((best, f) =>
        (faixas[f.id] || 0) > (faixas[best.id] || 0) ? f : best, FAIXAS[0]) : null;
      return {
        hora: `${h}h`,
        total,
        dominante: dom,
        pcts: FAIXAS.map(f => ({ id: f.id, pct: total > 0 ? ((faixas[f.id] || 0) / total) * 100 : 0 })),
      };
    });
  }, [annotated]);

  const sections = [
    { id: "heatmap" as SectionId, label: "Heatmap Colaborador × Faixa", icon: DollarSign },
    { id: "ranking" as SectionId, label: "Ranking por Perfil de Valor", icon: DollarSign },
    { id: "horario" as SectionId, label: "Faixa Dominante por Horário", icon: Clock },
  ];

  if (annotated.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
        <DollarSign className="w-16 h-16 opacity-30" />
        <p className="text-sm font-bold uppercase tracking-widest">Carregue XMLs com itens para analisar perfil de preço</p>
      </div>
    );
  }

  const totalGlobal = annotated.length;
  const pctGlobalAlto = FAIXAS.slice(3).reduce((acc, f) =>
    acc + annotated.filter(s => s.faixa?.id === f.id).length, 0) / totalGlobal * 100;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      <div className="bg-gradient-to-br from-rose-700 to-rose-600 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
          <div className="bg-white/10 p-3 rounded-2xl w-fit"><DollarSign className="w-8 h-8 text-rose-200" /></div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Perfil de Preço</h2>
            <p className="text-rose-200 text-sm font-medium mt-1">Quem vende alto valor? Baseado no preço unitário médio dos itens</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {FAIXAS.map(f => {
              const count = annotated.filter(s => s.faixa?.id === f.id).length;
              const pct = totalGlobal > 0 ? (count / totalGlobal) * 100 : 0;
              return (
                <div key={f.id} className="bg-white/10 px-3 py-2 rounded-2xl text-center">
                  <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{f.label}</p>
                  <p className="text-base font-black">{pct.toFixed(0)}%</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {sections.map(({ id, label, icon: Icon }) => (
        <div key={id} className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <button onClick={() => setOpenSection(prev => prev === id ? "heatmap" : id)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-50"><Icon className="w-5 h-5 text-rose-600" /></div>
              <span className="font-black text-slate-700 uppercase tracking-tight text-sm">{label}</span>
            </div>
            {openSection === id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSection === id && (
            <div className="px-5 pb-6 border-t border-slate-100 pt-5 space-y-4">

              {id === "heatmap" && (
                <div className="space-y-3">
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-rose-700 font-medium">% das notas de cada colaborador por faixa de preço unitário médio (vProd/qCom). Ordenado por % nas faixas altas (F4+F5).</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left p-2 font-black text-slate-400 uppercase">Colaborador</th>
                          {FAIXAS.map(f => (
                            <th key={f.id} className="text-center p-2 font-black text-[11px]" style={{ color: f.color }}>{f.label}</th>
                          ))}
                          <th className="text-center p-2 font-black text-[11px] text-rose-500">F4+F5</th>
                        </tr>
                      </thead>
                      <tbody>
                        {heatmapData.map((row, i) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="p-2 font-bold text-slate-700">{row.nome}</td>
                            {row.faixas.map(f => {
                              const fData = FAIXAS.find(fx => fx.id === f.id)!;
                              const intensity = f.pct;
                              return (
                                <td key={f.id} className="p-1 text-center">
                                  <span className={cn("inline-block px-2 py-0.5 rounded-lg font-black text-[11px]",
                                    intensity > 40 ? "text-white" : "text-slate-500 bg-slate-100"
                                  )}
                                    style={intensity > 40 ? { backgroundColor: fData.color } : {}}
                                  >
                                    {f.pct.toFixed(0)}%
                                  </span>
                                </td>
                              );
                            })}
                            <td className="p-1 text-center">
                              <span className={cn("inline-block px-2 py-0.5 rounded-full font-black text-[11px]",
                                row.pctAlto >= 15 ? "bg-rose-600 text-white" :
                                row.pctAlto >= 8 ? "bg-orange-400 text-white" : "bg-slate-100 text-slate-500"
                              )}>
                                {row.pctAlto.toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {id === "ranking" && (
                <div className="space-y-3">
                  {heatmapData.map((row, i) => {
                    const prof = profileLabel(row.pctAlto);
                    return (
                      <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-400 w-5">{i + 1}</span>
                            <span className="text-sm font-black text-slate-700">{row.nome}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{row.total} notas</span>
                            <Badge className={cn("border-none text-[10px] font-black", prof.color)}>{prof.label}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-1 h-4">
                          {row.faixas.map(f => {
                            const fData = FAIXAS.find(fx => fx.id === f.id)!;
                            return f.pct > 0 ? (
                              <div key={f.id} className="h-full rounded-sm transition-all" title={`${fData.label}: ${f.pct.toFixed(1)}%`}
                                style={{ width: `${f.pct}%`, backgroundColor: fData.color }} />
                            ) : null;
                          })}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {FAIXAS.map(f => {
                            const match = row.faixas.find(ff => ff.id === f.id);
                            if (!match || match.pct === 0) return null;
                            return (
                              <span key={f.id} className="text-[10px] font-bold text-slate-400">
                                <span style={{ color: f.color }}>■</span> {f.label} {match.pct.toFixed(0)}%
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {id === "horario" && (
                <div className="space-y-3">
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-rose-700 font-medium">Faixa de preço dominante em cada slot de hora. Produtos caros tendem a ser vendidos em quais horários?</p>
                  </div>
                  <div className="space-y-2">
                    {horarioData.filter(h => h.total > 0).map((h, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-500 w-8">{h.hora}</span>
                        <div className="flex-1 flex gap-0.5 h-6 rounded-lg overflow-hidden">
                          {h.pcts.map(p => {
                            const fData = FAIXAS.find(f => f.id === p.id)!;
                            return p.pct > 0 ? (
                              <div key={p.id} className="h-full transition-all" title={`${fData.label}: ${p.pct.toFixed(0)}%`}
                                style={{ width: `${p.pct}%`, backgroundColor: fData.color }} />
                            ) : null;
                          })}
                        </div>
                        {h.dominante && (
                          <span className="text-[10px] font-black w-20 text-right" style={{ color: h.dominante.color }}>
                            {h.dominante.label}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 w-16 text-right">{h.total} notas</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 pt-2">
                    {FAIXAS.map(f => (
                      <div key={f.id} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: f.color }} />
                        <span className="text-xs font-bold text-slate-500">{f.label}</span>
                      </div>
                    ))}
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
