
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from "recharts";
import { Users, Info, ChevronDown, ChevronUp, Star, UserCheck, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, differenceInDays } from "date-fns";

interface CustomerLoyaltyProps {
  data: DetailedSaleRow[];
}

const TIERS = [
  { id: "diamond", label: "💎 Diamante", color: "#6366f1", bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
  { id: "gold",    label: "🥇 Ouro",     color: "#f59e0b", bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700"  },
  { id: "silver",  label: "🥈 Prata",    color: "#94a3b8", bg: "bg-slate-100", border: "border-slate-200",  text: "text-slate-700"  },
  { id: "bronze",  label: "🥉 Bronze",   color: "#b45309", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
];

function getTier(v: number) {
  if (v >= 7) return TIERS[0];
  if (v >= 4) return TIERS[1];
  if (v >= 2) return TIERS[2];
  return TIERS[3];
}

function maskCpf(cpf: string) {
  const d = cpf.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}.***.***-${d.slice(-2)}`;
  return cpf.slice(0, 4) + "***";
}

type SectionId = "piramide" | "top" | "colaboradores" | "retorno";

export function CustomerLoyalty({ data }: CustomerLoyaltyProps) {
  const [openSection, setOpenSection] = useState<SectionId>("piramide");

  const sales = useMemo(() =>
    data.filter(r => !r.is_cancelada && r.tpNF === 1 && !r.is_devolucao && r.cpf_cnpj_dest?.trim().length > 3),
    [data]
  );

  const clientesByCpf = useMemo(() => {
    const map: Record<string, { cpf: string; nome: string; totalGasto: number; visitas: number; timestamps: number[]; vendedores: Set<string> }> = {};
    for (const s of sales) {
      const cpf = s.cpf_cnpj_dest.trim();
      if (!map[cpf]) map[cpf] = { cpf, nome: s.nome_dest || "", totalGasto: 0, visitas: 0, timestamps: [], vendedores: new Set() };
      map[cpf].totalGasto += parseFloat(s.vNF) || 0;
      map[cpf].visitas++;
      try { map[cpf].timestamps.push(parseISO(s.dhEmi).getTime()); } catch { /* skip */ }
      if (s.vendedor) map[cpf].vendedores.add(s.vendedor);
    }
    return Object.values(map).map(c => {
      const sorted = c.timestamps.sort((a, b) => a - b);
      const deltas = sorted.slice(1).map((t, i) => differenceInDays(t, sorted[i]));
      const intervaloMedio = deltas.length > 0 ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null;
      return { ...c, tier: getTier(c.visitas), intervaloMedio };
    });
  }, [sales]);

  const totalClientes = clientesByCpf.length;
  const totalFaturamento = clientesByCpf.reduce((a, c) => a + c.totalGasto, 0);

  const piramide = useMemo(() => TIERS.map(tier => {
    const clientes = clientesByCpf.filter(c => c.tier.id === tier.id);
    const fat = clientes.reduce((a, c) => a + c.totalGasto, 0);
    return {
      ...tier,
      qtd: clientes.length,
      pctQtd: totalClientes > 0 ? (clientes.length / totalClientes) * 100 : 0,
      faturamento: fat,
      pctFat: totalFaturamento > 0 ? (fat / totalFaturamento) * 100 : 0,
      tkm: clientes.length > 0 ? fat / clientes.length : 0,
    };
  }), [clientesByCpf, totalClientes, totalFaturamento]);

  const topClientes = useMemo(() =>
    [...clientesByCpf].sort((a, b) => b.totalGasto - a.totalGasto).slice(0, 20),
    [clientesByCpf]
  );

  const colaboradoresFidelizacao = useMemo(() => {
    const byVend: Record<string, { recorrentes: number; total: number }> = {};
    for (const c of clientesByCpf) {
      for (const vend of c.vendedores) {
        if (!byVend[vend]) byVend[vend] = { recorrentes: 0, total: 0 };
        byVend[vend].total++;
        if (c.visitas > 1) byVend[vend].recorrentes++;
      }
    }
    return Object.entries(byVend)
      .filter(([n]) => n !== "COLABORADOR NÃO IDENTIFICADO")
      .map(([nome, v]) => ({ nome, ...v, pct: v.total > 0 ? (v.recorrentes / v.total) * 100 : 0 }))
      .sort((a, b) => b.recorrentes - a.recorrentes).slice(0, 10);
  }, [clientesByCpf]);

  const retornoHist = useMemo(() => {
    const bins: Record<string, number> = { "1–7d": 0, "8–15d": 0, "16–30d": 0, "31–60d": 0, "61–90d": 0, "90+d": 0 };
    for (const c of clientesByCpf) {
      if (c.intervaloMedio === null) continue;
      const d = c.intervaloMedio;
      if (d <= 7) bins["1–7d"]++;
      else if (d <= 15) bins["8–15d"]++;
      else if (d <= 30) bins["16–30d"]++;
      else if (d <= 60) bins["31–60d"]++;
      else if (d <= 90) bins["61–90d"]++;
      else bins["90+d"]++;
    }
    return Object.entries(bins).map(([label, count]) => ({ label, count }));
  }, [clientesByCpf]);

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const recorrentes = clientesByCpf.filter(c => c.visitas > 1).length;

  const sections = [
    { id: "piramide" as SectionId, label: "Pirâmide de Clientes", icon: BarChart2 },
    { id: "top" as SectionId, label: "Top 20 Clientes", icon: Star },
    { id: "colaboradores" as SectionId, label: "Fidelização por Colaborador", icon: UserCheck },
    { id: "retorno" as SectionId, label: "Intervalo de Retorno", icon: Users },
  ];

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
        <Users className="w-16 h-16 opacity-30" />
        <p className="text-sm font-bold uppercase tracking-widest">Carregue XMLs com CPF para analisar fidelidade</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-600 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
          <div className="bg-white/10 p-3 rounded-2xl w-fit"><Users className="w-8 h-8 text-emerald-200" /></div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Fidelidade & Recorrência</h2>
            <p className="text-emerald-200 text-sm font-medium mt-1">Análise de clientes por CPF — quem volta, quem fideliza</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Clientes únicos", value: totalClientes.toLocaleString("pt-BR") },
              { label: "Recorrentes", value: String(recorrentes) },
            ].map(s => (
              <div key={s.label} className="bg-white/10 px-4 py-2 rounded-2xl text-center">
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{s.label}</p>
                <p className="text-lg font-black">{s.value}</p>
              </div>
            ))}
            <div className="bg-emerald-500 px-4 py-2 rounded-2xl text-center">
              <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Taxa retorno</p>
              <p className="text-lg font-black">{totalClientes > 0 ? ((recorrentes / totalClientes) * 100).toFixed(1) : 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {sections.map(({ id, label, icon: Icon }) => (
        <div key={id} className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <button onClick={() => setOpenSection(prev => prev === id ? "piramide" : id)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50"><Icon className="w-5 h-5 text-emerald-600" /></div>
              <span className="font-black text-slate-700 uppercase tracking-tight text-sm">{label}</span>
            </div>
            {openSection === id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSection === id && (
            <div className="px-5 pb-6 border-t border-slate-100 pt-5 space-y-4">
              {id === "piramide" && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-700 font-medium">Bronze = 1 visita · Prata = 2–3 · Ouro = 4–6 · Diamante = 7+</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {piramide.map(tier => (
                      <div key={tier.id} className={cn("p-4 rounded-2xl border", tier.bg, tier.border)}>
                        <div className="flex items-center justify-between mb-3">
                          <span className={cn("text-sm font-black", tier.text)}>{tier.label}</span>
                          <Badge className="border-none text-[10px] font-black" style={{ backgroundColor: tier.color, color: "white" }}>
                            {tier.pctQtd.toFixed(1)}% clientes
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Qtd</p><p className={cn("text-xl font-black", tier.text)}>{tier.qtd}</p></div>
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Fat. %</p><p className="text-sm font-black text-slate-700">{tier.pctFat.toFixed(1)}%</p></div>
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">TKM</p><p className="text-sm font-black text-slate-700">{fmtBRL(tier.tkm)}</p></div>
                        </div>
                        <Progress value={tier.pctFat} className="h-1.5 mt-3" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {id === "top" && (
                <div className="space-y-2">
                  {topClientes.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs font-black text-slate-400 w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-700 truncate">{c.nome ? c.nome.split(" ").slice(0, 2).join(" ") : maskCpf(c.cpf)}</p>
                        <p className="text-[10px] text-slate-400">{maskCpf(c.cpf)}</p>
                      </div>
                      <Badge className="border-none text-[10px] font-black" style={{ backgroundColor: c.tier.color, color: "white" }}>
                        {c.tier.label.split(" ")[0]}
                      </Badge>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-700">{fmtBRL(c.totalGasto)}</p>
                        <p className="text-[10px] text-slate-400">{c.visitas}× visita{c.visitas > 1 ? "s" : ""}{c.intervaloMedio ? ` · a cada ${c.intervaloMedio}d` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {id === "colaboradores" && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-700 font-medium">Clientes que retornaram (2+ visitas) associados a cada colaborador.</p>
                  </div>
                  {colaboradoresFidelizacao.map((c, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-black text-slate-700">{c.nome}</span>
                        <span className="text-xs text-slate-400">{c.total} clientes únicos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={c.pct} className="h-2 flex-1 bg-slate-200" />
                        <span className="text-xs font-black text-emerald-700 w-10 text-right">{c.pct.toFixed(0)}%</span>
                        <span className="text-[10px] text-slate-400 w-24">{c.recorrentes} recorrentes</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {id === "retorno" && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-700 font-medium">Intervalo médio de retorno (somente clientes com 2+ visitas).</p>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={retornoHist} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={28} />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", fontSize: 12 }} />
                      <Bar dataKey="count" name="Clientes" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                        {retornoHist.map((_, i) => (
                          <Cell key={i} fill={["#10b981","#34d399","#6ee7b7","#a7f3d0","#d1fae5","#94a3b8"][i]} />
                        ))}
                      </Bar>
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
