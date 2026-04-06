
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Info, ChevronDown, ChevronUp, Clock, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, getHours } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PriceProfileProps {
  data: DetailedSaleRow[];
}

interface Faixa {
  id: string;
  label: string;
  min: number;
  max: number;
  color: string;
  badge: string;
}

type SectionId = "heatmap" | "ranking" | "horario";

export function PriceProfile({ data }: PriceProfileProps) {
  const [openSection, setOpenSection] = useState<SectionId>("heatmap");
  const [step, setStep] = useState(30);

  const FAIXAS: Faixa[] = useMemo(() => {
    const s = step;
    const colors = [
      { c: "#94a3b8", b: "text-slate-600 bg-slate-100" },
      { c: "#22c55e", b: "text-emerald-700 bg-emerald-100" },
      { c: "#10b981", b: "text-teal-700 bg-teal-100" },
      { c: "#f59e0b", b: "text-amber-700 bg-amber-100" },
      { c: "#fbbf24", b: "text-yellow-700 bg-yellow-100" },
      { c: "#f97316", b: "text-orange-700 bg-orange-100" },
      { c: "#ef4444", b: "text-rose-700 bg-rose-100" },
      { c: "#ec4899", b: "text-pink-700 bg-pink-100" },
      { c: "#8b5cf6", b: "text-violet-700 bg-violet-100" },
      { c: "#6366f1", b: "text-indigo-700 bg-indigo-100" },
    ];
    
    return [
      { id: "F1",  label: `R$0–${s}`,      min: 0,      max: s,      color: colors[0].c, badge: colors[0].b },
      { id: "F2",  label: `R$${s+1}–${s*2}`,   min: s+1,    max: s*2,    color: colors[1].c, badge: colors[1].b },
      { id: "F3",  label: `R$${s*2+1}–${s*3}`, min: s*2+1,  max: s*3,    color: colors[2].c, badge: colors[2].b },
      { id: "F4",  label: `R$${s*3+1}–${s*4}`, min: s*3+1,  max: s*4,    color: colors[3].c, badge: colors[3].b },
      { id: "F5",  label: `R$${s*4+1}–${s*5}`, min: s*4+1,  max: s*5,    color: colors[4].c, badge: colors[4].b },
      { id: "F6",  label: `R$${s*5+1}–${s*6}`, min: s*5+1,  max: s*6,    color: colors[5].c, badge: colors[5].b },
      { id: "F7",  label: `R$${s*6+1}–${s*8}`, min: s*6+1,  max: s*8,    color: colors[6].c, badge: colors[6].b },
      { id: "F8",  label: `R$${s*8+1}–${s*10}`, min: s*8+1,  max: s*10,   color: colors[7].c, badge: colors[7].b },
      { id: "F9",  label: `R$${s*10+1}–${s*15}`, min: s*10+1, max: s*15,   color: colors[8].c, badge: colors[8].b },
      { id: "F10", label: `R$${s*15}+`,     min: s*15+1, max: Infinity, color: colors[9].c, badge: colors[9].b },
    ];
  }, [step]);

  function getFaixa(precoUnit: number) {
    return FAIXAS.find((f: Faixa) => precoUnit >= f.min && precoUnit <= f.max) || FAIXAS[FAIXAS.length - 1];
  }

  function getPrecoUnitMedio(itens: DetailedSaleRow["itens"]): number | null {
    if (!itens || itens.length === 0) return null;
    const totalQtd = itens.reduce((a, i) => a + (i.qCom || 0), 0);
    const totalVal = itens.reduce((a, i) => a + (i.vProd || 0), 0);
    if (totalQtd <= 0) return null;
    return totalVal / totalQtd;
  }

  const sales = useMemo(() =>
    data.filter(r => !r.is_cancelada && r.tpNF === 1 && !r.is_devolucao && r.itens?.length > 0),
    [data]
  );

  // Anotar cada nota com faixa de preço unitário médio
  const annotated = useMemo(() =>
    sales.map((s: DetailedSaleRow) => {
      const preco = getPrecoUnitMedio(s.itens);
      return { ...s, preco, faixa: preco !== null ? getFaixa(preco) : null };
    }).filter((s: any) => s.faixa !== null),
    [sales, FAIXAS]
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
    return Object.entries(byVend).map(([nome, faixas]: [string, Record<string, number>]) => {
      const total = Object.values(faixas).reduce((a: number, b: number) => a + b, 0);
      const highFaixas = ["F7", "F8", "F9", "F10"];
      const highValueCount = highFaixas.reduce((acc: number, id: string) => acc + (faixas[id] || 0), 0);
      return {
        nome,
        total,
        faixas: FAIXAS.map((f: Faixa) => ({
          id: f.id,
          count: faixas[f.id] || 0,
          pct: total > 0 ? ((faixas[f.id] || 0) / total) * 100 : 0,
        })),
        pctAlto: total > 0 ? (highValueCount / total) * 100 : 0,
      };
    }).sort((a: any, b: any) => b.pctAlto - a.pctAlto);
  }, [annotated, FAIXAS]);

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
    return Object.entries(byHour).map(([h, faixas]: [string, Record<string, number>]) => {
      const total = Object.values(faixas).reduce((a: number, b: number) => a + b, 0);
      const dom = total > 0 ? FAIXAS.reduce((best: Faixa, f: Faixa) =>
        (faixas[f.id] || 0) > (faixas[best.id] || 0) ? f : best, FAIXAS[0]) : null;
      return {
        hora: `${h}h`,
        total,
        dominante: dom,
        pcts: FAIXAS.map((f: Faixa) => {
          const count = faixas[f.id] || 0;
          return {
            id: f.id,
            count,
            pct: total > 0 ? (count / total) * 100 : 0,
          };
        }),
      };
    });
  }, [annotated, FAIXAS]);

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
  const highFaixasIds = ["F7", "F8", "F9", "F10"];
  const pctGlobalAlto = annotated.filter((s: { faixa: Faixa | null }) => highFaixasIds.includes(s.faixa?.id || "")).length / totalGlobal * 100;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      <div className="bg-gradient-to-br from-rose-700 to-rose-600 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
          <div className="bg-white/10 p-3 rounded-2xl w-fit"><DollarSign className="w-8 h-8 text-rose-200" /></div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Perfil de Preço</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-rose-200 text-sm font-medium">Quem vende alto valor? Baseado no preço unitário médio</p>
              <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10 group">
                <Settings2 className="w-3 h-3 text-rose-300" />
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-100">Escala:</span>
                <Select value={step.toString()} onValueChange={(v: string) => setStep(parseInt(v))}>
                  <SelectTrigger className="h-5 bg-transparent border-none text-white font-black text-[10px] p-0 w-auto gap-1 focus:ring-0 hover:text-white transition-colors">
                    <SelectValue placeholder="Step" />
                  </SelectTrigger>
                  <SelectContent className="bg-rose-800 border-rose-700 text-white">
                    <SelectItem value="10" className="text-[10px] uppercase font-black hover:bg-rose-700">R$ 10</SelectItem>
                    <SelectItem value="20" className="text-[10px] uppercase font-black hover:bg-rose-700">R$ 20</SelectItem>
                    <SelectItem value="30" className="text-[10px] uppercase font-black hover:bg-rose-700">R$ 30</SelectItem>
                    <SelectItem value="50" className="text-[10px] uppercase font-black hover:bg-rose-700">R$ 50</SelectItem>
                    <SelectItem value="100" className="text-[10px] uppercase font-black hover:bg-rose-700">R$ 100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {FAIXAS.map((f: Faixa) => {
              const count = annotated.filter((s: any) => s.faixa?.id === f.id).length;
              const pct = totalGlobal > 0 ? (count / totalGlobal) * 100 : 0;
              if (count === 0) return null;
              return (
                <div key={f.id} className="bg-white/10 px-3 py-1.5 rounded-xl text-center min-w-[60px] border border-white/5">
                  <p className="text-[8px] font-bold opacity-70 uppercase tracking-tight mb-0.5 whitespace-nowrap">{f.label}</p>
                  <p className="text-sm font-black leading-none">{count}</p>
                  <p className="text-[8px] font-bold opacity-60 mt-0.5">{pct.toFixed(0)}%</p>
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
                          {FAIXAS.map((f: Faixa) => (
                            <th key={f.id} className="text-center p-1 font-black text-[9px] leading-tight" style={{ color: f.color }}>{f.label}</th>
                          ))}
                          <th className="text-center p-1 font-black text-[9px] text-rose-500 uppercase">Top</th>
                        </tr>
                      </thead>
                      <tbody>
                        {heatmapData.map((row: any, i: number) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="p-2 font-bold text-slate-700">{row.nome}</td>
                            {row.faixas.map((f: { id: string; count: number; pct: number }) => {
                              const fData = FAIXAS.find((fx: Faixa) => fx.id === f.id)!;
                              const intensity = f.pct;
                              return (
                                <td key={f.id} className="p-0.5 text-center">
                                  <span className={cn("inline-block px-1 py-0.5 rounded-lg font-black text-[10px] min-w-[2.2rem]",
                                    intensity > 40 ? "text-white" : "text-slate-500 bg-slate-100"
                                  )}
                                    style={intensity > 40 ? { backgroundColor: fData.color } : {}}
                                  >
                                    <div className="flex flex-col items-center leading-none">
                                      <span>{f.count}</span>
                                      <span className={cn("text-[7px] mt-0.5", intensity > 40 ? "text-white/70" : "text-slate-400")}>{f.pct.toFixed(0)}%</span>
                                    </div>
                                  </span>
                                </td>
                              );
                            })}
                            <td className="p-0.5 text-center">
                              <span className={cn("inline-block px-1.5 py-0.5 rounded-full font-black text-[10px]",
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
                  {heatmapData.map((row: any, i: number) => {
                    const prof = profileLabel(row.pctAlto);
                    return (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 w-4">{i + 1}</span>
                            <span className="text-xs font-black text-slate-700">{row.nome}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">{row.total} notas</span>
                            <Badge className={cn("border-none text-[9px] font-black px-2 py-0", prof.color)}>{prof.label}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-0.5 h-3">
                          {row.faixas.map((f: { id: string; count: number; pct: number }) => {
                            const fData = FAIXAS.find((fx: Faixa) => fx.id === f.id)!;
                            return f.pct > 0 ? (
                              <div key={f.id} className="h-full rounded-sm transition-all" title={`${fData.label}: ${f.pct.toFixed(1)}%`}
                                style={{ width: `${f.pct}%`, backgroundColor: fData.color }} />
                            ) : null;
                          })}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {FAIXAS.map((f: Faixa) => {
                            const match = row.faixas.find((ff: any) => ff.id === f.id);
                            if (!match || match.pct === 0) return null;
                            return (
                              <span key={f.id} className="text-[9px] font-bold text-slate-400 border border-slate-100 px-1.5 py-0.5 rounded-md">
                                <span style={{ color: f.color }}>■</span> {f.label} <span className="text-slate-600">{match.count}</span>
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
                  <div className="space-y-1">
                    {horarioData.filter((h: any) => h.total > 0).map((h: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 w-6">{h.hora}</span>
                        <div className="flex-1 flex gap-0.5 h-4 rounded-md overflow-hidden">
                          {h.pcts.map((p: any) => {
                            const fData = FAIXAS.find((f: Faixa) => f.id === p.id)!;
                            return p.pct > 0 ? (
                              <div key={p.id} className="h-full transition-all" title={`${fData.label}: ${p.count} notas (${p.pct.toFixed(0)}%)`}
                                style={{ width: `${p.pct}%`, backgroundColor: fData.color }} />
                            ) : null;
                          })}
                        </div>
                        {h.dominante && (
                          <span className="text-[9px] font-black w-12 text-right" style={{ color: h.dominante.color }}>
                            {h.dominante.label}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 w-16 text-right">{h.total} notas</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {FAIXAS.filter((f: Faixa) => annotated.some((s: any) => s.faixa?.id === f.id)).map((f: Faixa) => (
                      <div key={f.id} className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                        <span className="text-[9px] font-bold text-slate-500">{f.label}</span>
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
