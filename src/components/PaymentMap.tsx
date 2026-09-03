
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from "recharts";
import { CreditCard, Info, ChevronDown, ChevronUp, TrendingDown, Wallet, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, getHours } from "date-fns";

interface PaymentMapProps {
  data: DetailedSaleRow[];
}

const TPAG_LABELS: Record<string, { label: string; color: string; short: string }> = {
  "01": { label: "Dinheiro",       color: "#22c55e", short: "Din" },
  "02": { label: "Cheque",         color: "#a3a3a3", short: "Chq" },
  "03": { label: "Crédito",        color: "#6366f1", short: "Cré" },
  "04": { label: "Débito",         color: "#3b82f6", short: "Déb" },
  "05": { label: "Crédito Loja",   color: "#8b5cf6", short: "CL"  },
  "10": { label: "Vale Alim.",     color: "#f59e0b", short: "VA"  },
  "13": { label: "PIX",            color: "#10b981", short: "PIX" },
  "15": { label: "Boleto",         color: "#f97316", short: "Bol" },
  "99": { label: "Outros",         color: "#94a3b8", short: "Out" },
};

const SECTION_IDS = ["geral", "colaborador", "desconto", "temporal"] as const;
type SectionId = typeof SECTION_IDS[number];

export function PaymentMap({ data }: PaymentMapProps) {
  const [openSection, setOpenSection] = useState<SectionId>("geral");

  const sales = useMemo(() =>
    data.filter(r => !r.is_cancelada && r.tpNF === 1 && !r.is_devolucao && r.pagamentos_detalhe?.length),
    [data]
  );

  // ── Visão geral ────────────────────────────────────────────────────────────
  const geralData = useMemo(() => {
    const totals: Record<string, { valor: number; cupons: number }> = {};
    let grandTotal = 0;
    for (const s of sales) {
      for (const p of (s.pagamentos_detalhe || [])) {
        const key = p.tPag || "99";
        if (!totals[key]) totals[key] = { valor: 0, cupons: 0 };
        totals[key].valor += p.vPag || 0;
        grandTotal += p.vPag || 0;
      }
      // conta cupons pela forma dominante
      const dom = (s.pagamentos_detalhe || []).reduce((a, b) => (b.vPag || 0) > (a.vPag || 0) ? b : a, { tPag: "99", vPag: 0 });
      if (!totals[dom.tPag || "99"]) totals[dom.tPag || "99"] = { valor: 0, cupons: 0 };
      totals[dom.tPag || "99"].cupons++;
    }
    return Object.entries(totals)
      .map(([tPag, v]) => ({
        tPag,
        label: TPAG_LABELS[tPag]?.label || "Outros",
        color: TPAG_LABELS[tPag]?.color || "#94a3b8",
        valor: v.valor,
        pctValor: grandTotal > 0 ? (v.valor / grandTotal) * 100 : 0,
        cupons: v.cupons,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [sales]);

  // ── Por colaborador ──────────────────────────────────────────────────────
  const colaboradorData = useMemo(() => {
    const byVend: Record<string, Record<string, number>> = {};
    for (const s of sales) {
      const vend = s.vendedor || "DESCONHECIDO";
      if (!byVend[vend]) byVend[vend] = {};
      let total = 0;
      for (const p of (s.pagamentos_detalhe || [])) {
        const key = p.tPag || "99";
        byVend[vend][key] = (byVend[vend][key] || 0) + (p.vPag || 0);
        total += p.vPag || 0;
      }
    }
    const formas = geralData.slice(0, 5).map(g => g.tPag); // top 5 formas
    return Object.entries(byVend)
      .filter(([n]) => n !== "COLABORADOR NÃO IDENTIFICADO")
      .map(([nome, formMap]) => {
        const total = Object.values(formMap).reduce((a, b) => a + b, 0);
        return {
          nome,
          total,
          formas: formas.map(f => ({
            tPag: f,
            pct: total > 0 ? (formMap[f] || 0) / total * 100 : 0,
          })),
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [sales, geralData]);

  // ── Desconto × pagamento ─────────────────────────────────────────────────
  const descontoData = useMemo(() => {
    const byForm: Record<string, { totalDesc: number; cuponsDesc: number; total: number }> = {};
    for (const s of sales) {
      const dom = (s.pagamentos_detalhe || []).reduce((a, b) => (b.vPag || 0) > (a.vPag || 0) ? b : a, { tPag: "99", vPag: 0 });
      const key = dom.tPag || "99";
      if (!byForm[key]) byForm[key] = { totalDesc: 0, cuponsDesc: 0, total: 0 };
      byForm[key].total++;
      const desc = parseFloat(s.desconto_total) || 0;
      if (desc > 0) {
        byForm[key].totalDesc += desc;
        byForm[key].cuponsDesc++;
      }
    }
    return geralData
      .filter(g => byForm[g.tPag])
      .map(g => ({
        tPag: g.tPag,
        label: g.label,
        color: g.color,
        pctDesc: byForm[g.tPag].total > 0 ? (byForm[g.tPag].cuponsDesc / byForm[g.tPag].total) * 100 : 0,
        descMedio: byForm[g.tPag].cuponsDesc > 0 ? byForm[g.tPag].totalDesc / byForm[g.tPag].cuponsDesc : 0,
      }))
      .sort((a, b) => b.pctDesc - a.pctDesc);
  }, [sales, geralData]);

  // ── Por horário ─────────────────────────────────────────────────────────
  const temporalData = useMemo(() => {
    const byHour: Record<number, Record<string, number>> = {};
    for (let h = 9; h <= 21; h++) byHour[h] = {};
    for (const s of sales) {
      try {
        const h = getHours(parseISO(s.dhEmi));
        if (h < 9 || h > 21) continue;
        for (const p of (s.pagamentos_detalhe || [])) {
          const key = p.tPag || "99";
          byHour[h][key] = (byHour[h][key] || 0) + (p.vPag || 0);
        }
      } catch { /* skip */ }
    }
    const topFormas = geralData.slice(0, 4).map(g => g.tPag);
    return Object.entries(byHour).map(([h, formMap]) => {
      const total = Object.values(formMap).reduce((a, b) => a + b, 0);
      const entry: Record<string, number | string> = { hora: `${h}h` };
      for (const f of topFormas) {
        entry[TPAG_LABELS[f]?.short || f] = total > 0 ? Math.round((formMap[f] || 0) / total * 100) : 0;
      }
      return entry;
    });
  }, [sales, geralData]);

  const topFormasLabels = geralData.slice(0, 4).map(g => ({
    key: TPAG_LABELS[g.tPag]?.short || g.tPag,
    color: g.color,
  }));

  const sections = [
    { id: "geral" as SectionId,        label: "Distribuição Geral",          icon: Wallet },
    { id: "colaborador" as SectionId,  label: "Por Colaborador",             icon: CreditCard },
    { id: "desconto" as SectionId,     label: "Desconto por Forma",          icon: TrendingDown },
    { id: "temporal" as SectionId,     label: "Padrão por Horário",          icon: Clock },
  ];

  const fmtBRL = (v?: number | string | null) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
        <CreditCard className="w-16 h-16 opacity-30" />
        <p className="text-sm font-bold uppercase tracking-widest">Carregue XMLs para analisar as formas de pagamento</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-700 to-indigo-600 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
          <div className="bg-white/10 p-3 rounded-2xl w-fit">
            <CreditCard className="w-8 h-8 text-indigo-200" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Formas de Pagamento</h2>
            <p className="text-indigo-200 text-sm font-medium mt-1">Distribuição, correlação com desconto e padrão temporal</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {geralData.slice(0, 3).map(g => (
              <div key={g.tPag} className="bg-white/10 px-4 py-2 rounded-2xl text-center">
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{g.label}</p>
                <p className="text-lg font-black">{g.pctValor.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sections */}
      {sections.map(({ id, label, icon: Icon }) => (
        <div key={id} className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <button
            onClick={() => setOpenSection(prev => prev === id ? "geral" : id)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50">
                <Icon className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="font-black text-slate-700 uppercase tracking-tight text-sm">{label}</span>
            </div>
            {openSection === id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSection === id && (
            <div className="px-5 pb-6 border-t border-slate-100 pt-5 space-y-5">

              {/* ── Geral ── */}
              {id === "geral" && (
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-indigo-700 font-medium">
                      Baseado na forma de pagamento dominante por nota (maior valor pago). Total: <strong>{sales.length}</strong> notas analisadas.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {geralData.map((g, i) => (
                      <div key={g.tPag} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <span className="text-xs font-black text-slate-400 w-4">{i + 1}</span>
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                        <span className="text-sm font-bold text-slate-700 w-28">{g.label}</span>
                        <div className="flex-1">
                          <Progress value={g.pctValor} className="h-2" />
                        </div>
                        <span className="text-sm font-black text-slate-700 w-14 text-right">{g.pctValor.toFixed(1)}%</span>
                        <span className="text-xs text-slate-400 w-28 text-right">{fmtBRL(g.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Por colaborador ── */}
              {id === "colaborador" && (
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-indigo-700 font-medium">
                      % do faturamento de cada colaborador por forma de pagamento. Top 5 formas mais relevantes.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left p-2 font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                          {geralData.slice(0, 5).map(g => (
                            <th key={g.tPag} className="text-center p-2 font-black uppercase tracking-widest" style={{ color: g.color }}>{g.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {colaboradorData.map((c, i) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="p-2 font-bold text-slate-700">{c.nome}</td>
                            {c.formas.map((f, j) => {
                              const intensity = f.pct;
                              const bg = intensity > 60 ? "scale-110" : "";
                              return (
                                <td key={j} className="p-2 text-center">
                                  <span className={cn(
                                    "inline-block px-2 py-0.5 rounded-lg font-black text-[11px] transition-all",
                                    intensity > 50 ? "text-white" : "text-slate-600 bg-slate-100",
                                    bg
                                  )}
                                    style={intensity > 50 ? { backgroundColor: geralData.find(g => g.tPag === f.tPag)?.color } : {}}
                                  >
                                    {f.pct.toFixed(0)}%
                                  </span>
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

              {/* ── Desconto ── */}
              {id === "desconto" && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">
                      % de notas com desconto e desconto médio por forma de pagamento dominante.
                      Dinheiro/PIX com desconto alto pode indicar combinação de troco.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {descontoData.map((d, i) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-xl flex items-center gap-4">
                        <div className="w-3 h-10 rounded-full" style={{ backgroundColor: d.color }} />
                        <div className="flex-1">
                          <p className="text-sm font-black text-slate-700">{d.label}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={d.pctDesc} className="h-1.5 flex-1" />
                            <span className="text-xs font-black text-slate-600 w-12 text-right">{d.pctDesc.toFixed(1)}%</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">das notas com desconto</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Desconto médio</p>
                          <p className="text-base font-black text-rose-600">{fmtBRL(d.descMedio)}</p>
                        </div>
                        {d.pctDesc > 30 && (
                          <Badge className="bg-amber-100 text-amber-700 border-none text-[10px] font-black">ATENÇÃO</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Temporal ── */}
              {id === "temporal" && (
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-indigo-700 font-medium">
                      Mix das 4 formas principais por hora do dia (% do faturamento).
                    </p>
                  </div>
                  <div className="flex gap-4 flex-wrap mb-2">
                    {topFormasLabels.map(f => (
                      <div key={f.key} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }} />
                        <span className="text-xs font-bold text-slate-500">{f.key}</span>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={temporalData} margin={{ top: 0, right: 8, bottom: 0, left: 0 }} stackOffset="expand">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="hora" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={28} tickFormatter={v => `${Math.round(v * 100)}%`} />
                      <Tooltip
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", fontSize: 12 }}
                        formatter={(v: number) => [`${v}%`]}
                      />
                      {topFormasLabels.map(f => (
                        <Bar key={f.key} dataKey={f.key} stackId="a" fill={f.color} radius={[0, 0, 0, 0]} isAnimationActive={false} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

            </div>
          )}
        </div>
      ))}
    </div>
  );
}
