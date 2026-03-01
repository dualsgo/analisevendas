
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from "recharts";
import {
  Users, Info, ChevronDown, ChevronUp, Star, UserCheck,
  BarChart2, X, ShoppingBag, ArrowRightLeft, Smartphone, Zap, Store,
  RefreshCw, Package, TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CustomerLoyaltyProps {
  data: DetailedSaleRow[];
  vinculos?: VinculoTroca[];
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

const CANAL_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  LOJA_FISICA:        { label: "Loja Física",    icon: Store,          color: "text-slate-600" },
  RETIRADA_ONLINE:    { label: "Pickup Online",  icon: Smartphone,     color: "text-sky-600"   },
  RETIRADA_ADICIONAL: { label: "Adicional",      icon: Zap,            color: "text-emerald-600" },
  TROCA:              { label: "Troca",           icon: ArrowRightLeft, color: "text-purple-600" },
};

type SectionId = "piramide" | "top" | "colaboradores" | "retorno" | "segmentos";

interface ClienteInfo {
  cpf: string;
  nome: string;
  totalGasto: number;
  visitas: number;
  timestamps: number[];
  vendedores: Set<string>;
  tier: typeof TIERS[number];
  intervaloMedio: number | null;
  notas: DetailedSaleRow[];
  trocas: VinculoTroca[];
  canais: Record<string, number>;
}

export function CustomerLoyalty({ data, vinculos = [] }: CustomerLoyaltyProps) {
  const [openSection, setOpenSection] = useState<SectionId>("piramide");
  const [selectedCliente, setSelectedCliente] = useState<ClienteInfo | null>(null);

  const sales = useMemo(() =>
    data.filter(r => !r.is_cancelada && r.tpNF === 1 && !r.is_devolucao && r.cpf_cnpj_dest?.trim().length > 3),
    [data]
  );

  const clientesByCpf = useMemo(() => {
    const map: Record<string, ClienteInfo> = {};
    for (const s of sales) {
      const cpf = s.cpf_cnpj_dest.trim();
      if (!map[cpf]) map[cpf] = {
        cpf, nome: s.nome_dest || "", totalGasto: 0, visitas: 0,
        timestamps: [], vendedores: new Set(), tier: TIERS[3],
        intervaloMedio: null, notas: [], trocas: [], canais: {},
      };
      const c = map[cpf];
      c.totalGasto += parseFloat(s.vNF) || 0;
      c.visitas++;
      try { c.timestamps.push(parseISO(s.dhEmi).getTime()); } catch { /* skip */ }
      if (s.vendedor) c.vendedores.add(s.vendedor);
      c.notas.push(s);
      // canal
      const canal = s.is_adicional || s.is_adicional_suspeito ? "RETIRADA_ADICIONAL"
        : s.canal === "RETIRADA_ONLINE" ? "RETIRADA_ONLINE"
        : "LOJA_FISICA";
      c.canais[canal] = (c.canais[canal] || 0) + 1;
    }

    // vincular trocas por CPF
    for (const v of vinculos) {
      const cpf = v.cpf_cliente?.trim();
      if (cpf && map[cpf]) {
        map[cpf].trocas.push(v);
        map[cpf].canais["TROCA"] = (map[cpf].canais["TROCA"] || 0) + 1;
      }
    }

    return Object.values(map).map(c => {
      const sorted = [...c.timestamps].sort((a, b) => a - b);
      const deltas = sorted.slice(1).map((t, i) => differenceInDays(t, sorted[i]));
      c.intervaloMedio = deltas.length > 0 ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null;
      c.tier = getTier(c.visitas);
      // sort notes by date desc
      c.notas.sort((a, b) => b.dhEmi.localeCompare(a.dhEmi));
      return c;
    });
  }, [sales, vinculos]);

  const totalClientes = clientesByCpf.length;
  const totalFaturamento = clientesByCpf.reduce((a, c) => a + c.totalGasto, 0);
  const recorrentes = clientesByCpf.filter(c => c.visitas > 1).length;

  const piramide = useMemo(() => TIERS.map(tier => {
    const clientes = clientesByCpf.filter(c => c.tier.id === tier.id);
    const fat = clientes.reduce((a, c) => a + c.totalGasto, 0);
    return {
      ...tier, qtd: clientes.length,
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

  // ── Segmentos de comportamento ───────────────────────────────────────────

  // 1. Top Trocadores — clientes com mais trocas vinculadas
  const topTrocadores = useMemo(() =>
    [...clientesByCpf]
      .filter(c => c.trocas.length > 0)
      .sort((a, b) => b.trocas.length - a.trocas.length)
      .slice(0, 15)
      .map(c => ({
        ...c,
        totalDevolvido: c.trocas.reduce((s, t) => s + t.valor_devolvido, 0),
        totalAdquirido: c.trocas.reduce((s, t) => s + t.valor_trocado, 0),
        saldo: c.trocas.reduce((s, t) => s + t.valor_diferenca, 0),
      })),
    [clientesByCpf]
  );

  // 2. Pickup Recorrente — clientes com 2+ retiradas online
  const pickupRecorrente = useMemo(() =>
    [...clientesByCpf]
      .filter(c => (c.canais["RETIRADA_ONLINE"] || 0) >= 2)
      .sort((a, b) => (b.canais["RETIRADA_ONLINE"] || 0) - (a.canais["RETIRADA_ONLINE"] || 0))
      .slice(0, 15),
    [clientesByCpf]
  );

  // 3. Adicional Frequente — clientes com 1+ adicional
  const adicionalFrequente = useMemo(() =>
    [...clientesByCpf]
      .filter(c => (c.canais["RETIRADA_ADICIONAL"] || 0) >= 1)
      .sort((a, b) => (b.canais["RETIRADA_ADICIONAL"] || 0) - (a.canais["RETIRADA_ADICIONAL"] || 0))
      .slice(0, 15),
    [clientesByCpf]
  );

  // 4. Pós-Troca — clientes que trocaram e ainda assim compraram novamente (comp. convencional após troca)
  const posTroca = useMemo(() => {
    return clientesByCpf
      .filter(c => {
        if (c.trocas.length === 0) return false;
        // tem ao menos uma compra convencional DEPOIS da última troca
        const ultimaTroca = Math.max(...c.trocas.map(t => { try { return parseISO(t.data_saida).getTime(); } catch { return 0; } }));
        return c.notas.some(n => {
          try { return parseISO(n.dhEmi).getTime() > ultimaTroca && !n.is_troca; } catch { return false; }
        });
      })
      .map(c => {
        const ultimaTroca = Math.max(...c.trocas.map(t => { try { return parseISO(t.data_saida).getTime(); } catch { return 0; } }));
        const comprasPosTroca = c.notas.filter(n => { try { return parseISO(n.dhEmi).getTime() > ultimaTroca && !n.is_troca; } catch { return false; } });
        return { ...c, comprasPosTroca: comprasPosTroca.length, gastoPosTroca: comprasPosTroca.reduce((s, n) => s + (parseFloat(n.vNF) || 0), 0) };
      })
      .sort((a, b) => b.comprasPosTroca - a.comprasPosTroca)
      .slice(0, 15);
  }, [clientesByCpf]);

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (s: string) => { try { return format(parseISO(s), "dd/MM/yy HH:mm", { locale: ptBR }); } catch { return s; } };

  const sections = [
    { id: "piramide" as SectionId,   label: "Pirâmide de Clientes",        icon: BarChart2 },
    { id: "top" as SectionId,        label: "Top 20 Clientes",             icon: Star },
    { id: "segmentos" as SectionId,  label: "Segmentos de Comportamento",  icon: TrendingUp },
    { id: "colaboradores" as SectionId, label: "Fidelização por Colaborador", icon: UserCheck },
    { id: "retorno" as SectionId,    label: "Intervalo de Retorno",        icon: Users },
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
    <div className="space-y-4 animate-in fade-in duration-500 pb-20 relative">

      {/* ── Modal de drill-down ───────────────────────────────────────────── */}
      {selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCliente(null)} />
          {/* drawer */}
          <div className="relative z-10 w-full max-w-lg h-full bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
            {/* drawer header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-start justify-between gap-3 z-10">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Histórico do Cliente</p>
                <p className="text-lg font-black text-slate-800 mt-0.5">
                  {selectedCliente.nome ? selectedCliente.nome.split(" ").slice(0, 3).join(" ") : maskCpf(selectedCliente.cpf)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{maskCpf(selectedCliente.cpf)}</p>
              </div>
              <button onClick={() => setSelectedCliente(null)}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors shrink-0">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* resumo rápido */}
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Gasto</p>
                  <p className="text-xl font-black text-emerald-700">{fmtBRL(selectedCliente.totalGasto)}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Visitas</p>
                  <p className="text-xl font-black" style={{ color: selectedCliente.tier.color }}>
                    {selectedCliente.visitas} · {selectedCliente.tier.label}
                  </p>
                </div>
                {selectedCliente.intervaloMedio !== null && (
                  <div className="bg-white rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Retorna a cada</p>
                    <p className="text-xl font-black text-slate-700">{selectedCliente.intervaloMedio} dias</p>
                  </div>
                )}
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">TKM médio</p>
                  <p className="text-xl font-black text-orange-600">
                    {fmtBRL(selectedCliente.totalGasto / Math.max(selectedCliente.visitas, 1))}
                  </p>
                </div>
              </div>

              {/* canais */}
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(selectedCliente.canais).map(([canal, count]) => {
                  const info = CANAL_LABELS[canal] || { label: canal, icon: ShoppingBag, color: "text-slate-500" };
                  const Icon = info.icon;
                  return (
                    <div key={canal} className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-lg px-3 py-1.5">
                      <Icon className={cn("w-3.5 h-3.5", info.color)} />
                      <span className="text-xs font-black text-slate-600">{info.label}</span>
                      <span className="text-xs font-bold text-slate-400">× {count}</span>
                    </div>
                  );
                })}
              </div>

              {/* colaboradores */}
              {selectedCliente.vendedores.size > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {[...selectedCliente.vendedores].map(v => (
                    <Badge key={v} className="bg-slate-100 text-slate-600 border-none text-[10px] font-bold">{v.split(" ")[0]}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* trocas */}
            {selectedCliente.trocas.length > 0 && (
              <div className="p-4 border-b border-slate-100">
                <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-2">
                  🔄 Trocas / Devoluções ({selectedCliente.trocas.length})
                </p>
                <div className="space-y-2">
                  {selectedCliente.trocas.map((t, i) => (
                    <div key={i} className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-purple-700">
                          {fmtDate(t.data_entrada)} → {fmtDate(t.data_saida)}
                        </span>
                        <Badge className="bg-purple-100 text-purple-700 border-none text-[10px] font-black">
                          {t.metodo_vinculo}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-slate-500">
                        <span>Dev. <strong className="text-slate-700">{fmtBRL(t.valor_devolvido)}</strong></span>
                        <span>Novo <strong className="text-slate-700">{fmtBRL(t.valor_trocado)}</strong></span>
                        <span>Δ <strong className={t.valor_diferenca >= 0 ? "text-emerald-600" : "text-rose-600"}>
                          {fmtBRL(t.valor_diferenca)}</strong></span>
                      </div>
                      {t.vendedor && <p className="text-slate-400 mt-0.5">Vendedor: {t.vendedor}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* lista de compras */}
            <div className="p-4 flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                🛍️ Todas as Compras ({selectedCliente.notas.length})
              </p>
              <div className="space-y-2">
                {selectedCliente.notas.map((nota, i) => {
                  const canal = nota.is_adicional || nota.is_adicional_suspeito ? "RETIRADA_ADICIONAL"
                    : nota.canal === "RETIRADA_ONLINE" ? "RETIRADA_ONLINE"
                    : "LOJA_FISICA";
                  const canalInfo = CANAL_LABELS[canal];
                  const CanalIcon = canalInfo.icon;
                  const desc = parseFloat(nota.desconto_total) || 0;
                  return (
                    <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CanalIcon className={cn("w-3.5 h-3.5 shrink-0", canalInfo.color)} />
                            <span className="text-[10px] font-bold text-slate-400">{fmtDate(nota.dhEmi)}</span>
                            {nota.vendedor && (
                              <span className="text-[10px] text-slate-400 truncate">· {nota.vendedor.split(" ")[0]}</span>
                            )}
                          </div>
                          {/* itens resumo */}
                          {nota.itens?.slice(0, 2).map((item, ii) => (
                            <p key={ii} className="text-[11px] text-slate-500 truncate">
                              {item.qCom > 1 ? `${item.qCom}× ` : ""}{item.xProd}
                            </p>
                          ))}
                          {(nota.itens?.length || 0) > 2 && (
                            <p className="text-[10px] text-slate-400">+ {nota.itens.length - 2} itens</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-slate-800">{fmtBRL(parseFloat(nota.vNF) || 0)}</p>
                          <p className="text-[10px] text-slate-400">{nota.itens_qtd} pç</p>
                          {desc > 0 && (
                            <p className="text-[10px] text-rose-500">-{fmtBRL(desc)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-600 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
          <div className="bg-white/10 p-3 rounded-2xl w-fit"><Users className="w-8 h-8 text-emerald-200" /></div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Fidelidade & Recorrência</h2>
            <p className="text-emerald-200 text-sm font-medium mt-1">
              Clique em qualquer cliente para ver histórico completo de compras, trocas e canais
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Clientes únicos", value: totalClientes.toLocaleString("pt-BR") },
              { label: "Recorrentes",     value: String(recorrentes) },
            ].map(s => (
              <div key={s.label} className="bg-white/10 px-4 py-2 rounded-2xl text-center">
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{s.label}</p>
                <p className="text-lg font-black">{s.value}</p>
              </div>
            ))}
            <div className="bg-emerald-500 px-4 py-2 rounded-2xl text-center">
              <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Taxa retorno</p>
              <p className="text-lg font-black">
                {totalClientes > 0 ? ((recorrentes / totalClientes) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sections ───────────────────────────────────────────────────────── */}
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

              {/* Pirâmide */}
              {id === "piramide" && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-700 font-medium">
                      Bronze = 1 visita · Prata = 2–3 · Ouro = 4–6 · Diamante = 7+
                    </p>
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
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Qtd</p>
                            <p className={cn("text-xl font-black", tier.text)}>{tier.qtd}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Fat. %</p>
                            <p className="text-sm font-black text-slate-700">{tier.pctFat.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">TKM</p>
                            <p className="text-sm font-black text-slate-700">{fmtBRL(tier.tkm)}</p>
                          </div>
                        </div>
                        <Progress value={tier.pctFat} className="h-1.5 mt-3" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top 20 — clicável */}
              {id === "top" && (
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-700 font-medium">
                      Clique em qualquer cliente para ver o histórico completo de compras, trocas e canais.
                    </p>
                  </div>
                  {topClientes.map((c, i) => (
                    <button key={i} onClick={() => setSelectedCliente(c)}
                      className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 border border-transparent transition-all text-left group">
                      <span className="text-xs font-black text-slate-400 w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-700 truncate group-hover:text-emerald-700 transition-colors">
                          {c.nome ? c.nome.split(" ").slice(0, 3).join(" ") : maskCpf(c.cpf)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-slate-400">{maskCpf(c.cpf)}</p>
                          {/* canal badges */}
                          {Object.entries(c.canais).map(([canal, count]) => {
                            const info = CANAL_LABELS[canal];
                            if (!info) return null;
                            const CanalIcon = info.icon;
                            return (
                              <span key={canal} className={cn("flex items-center gap-0.5 text-[10px] font-bold", info.color)}>
                                <CanalIcon className="w-3 h-3" /> {count}
                              </span>
                            );
                          })}
                          {c.trocas.length > 0 && (
                            <span className="text-[10px] font-bold text-purple-600 flex items-center gap-0.5">
                              <ArrowRightLeft className="w-3 h-3" /> {c.trocas.length} troca{c.trocas.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge className="border-none text-[10px] font-black" style={{ backgroundColor: c.tier.color, color: "white" }}>
                        {c.tier.label.split(" ")[0]}
                      </Badge>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-emerald-700">{fmtBRL(c.totalGasto)}</p>
                        <p className="text-[10px] text-slate-400">
                          {c.visitas}× visita{c.visitas > 1 ? "s" : ""}
                          {c.intervaloMedio ? ` · a cada ${c.intervaloMedio}d` : ""}
                        </p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 -rotate-90 transition-colors" />
                    </button>
                  ))}
                </div>
              )}

              {/* Segmentos de Comportamento */}
              {id === "segmentos" && (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-700 font-medium">
                      Clientes agrupados por comportamento de compra. Clique em qualquer cliente para ver o histórico completo.
                    </p>
                  </div>

                  {/* Top Trocadores */}
                  <div className="bg-purple-50 border border-purple-100 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2 p-4 pb-2">
                      <RefreshCw className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-black text-purple-700 uppercase tracking-tight">Top Trocadores</span>
                      <Badge className="bg-purple-100 text-purple-700 border-none text-[10px] font-black ml-auto">{topTrocadores.length} clientes</Badge>
                    </div>
                    {topTrocadores.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Nenhuma troca identificada com CPF</p>
                    ) : (
                      <div className="px-4 pb-4 space-y-2">
                        {topTrocadores.map((c, i) => (
                          <button key={i} onClick={() => setSelectedCliente(c)}
                            className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-purple-100 hover:border-purple-300 transition-all text-left group">
                            <span className="text-xs font-black text-purple-300 w-4">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-slate-700 truncate group-hover:text-purple-700">
                                {c.nome ? c.nome.split(" ").slice(0, 2).join(" ") : maskCpf(c.cpf)}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Saldo trocas: <span className={c.saldo >= 0 ? "text-emerald-600 font-black" : "text-rose-600 font-black"}>{fmtBRL(c.saldo)}</span>
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-black text-purple-700">{c.trocas.length} troca{c.trocas.length > 1 ? "s" : ""}</p>
                              <p className="text-[10px] text-slate-400">{fmtBRL(c.totalDevolvido)} → {fmtBRL(c.totalAdquirido)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pickup Recorrente */}
                  <div className="bg-sky-50 border border-sky-100 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2 p-4 pb-2">
                      <Smartphone className="w-4 h-4 text-sky-600" />
                      <span className="text-sm font-black text-sky-700 uppercase tracking-tight">Pickup Recorrente</span>
                      <Badge className="bg-sky-100 text-sky-700 border-none text-[10px] font-black ml-auto">{pickupRecorrente.length} clientes</Badge>
                    </div>
                    {pickupRecorrente.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Nenhum cliente com 2+ retiradas online identificadas</p>
                    ) : (
                      <div className="px-4 pb-4 space-y-2">
                        {pickupRecorrente.map((c, i) => (
                          <button key={i} onClick={() => setSelectedCliente(c)}
                            className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-sky-100 hover:border-sky-300 transition-all text-left group">
                            <span className="text-xs font-black text-sky-300 w-4">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-slate-700 truncate group-hover:text-sky-700">
                                {c.nome ? c.nome.split(" ").slice(0, 2).join(" ") : maskCpf(c.cpf)}
                              </p>
                              <p className="text-[10px] text-slate-400">{c.visitas} visita{c.visitas > 1 ? "s" : ""} no total</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-black text-sky-700">{c.canais["RETIRADA_ONLINE"]}× online</p>
                              {(c.canais["RETIRADA_ADICIONAL"] || 0) > 0 && (
                                <p className="text-[10px] text-emerald-600 font-bold">{c.canais["RETIRADA_ADICIONAL"]}× adicional</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Adicional Frequente */}
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2 p-4 pb-2">
                      <Zap className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-black text-emerald-700 uppercase tracking-tight">Adicional Frequente</span>
                      <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] font-black ml-auto">{adicionalFrequente.length} clientes</Badge>
                    </div>
                    {adicionalFrequente.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Nenhum cliente com adicional identificado com CPF</p>
                    ) : (
                      <div className="px-4 pb-4 space-y-2">
                        {adicionalFrequente.map((c, i) => (
                          <button key={i} onClick={() => setSelectedCliente(c)}
                            className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-emerald-100 hover:border-emerald-300 transition-all text-left group">
                            <span className="text-xs font-black text-emerald-300 w-4">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-slate-700 truncate group-hover:text-emerald-700">
                                {c.nome ? c.nome.split(" ").slice(0, 2).join(" ") : maskCpf(c.cpf)}
                              </p>
                              <p className="text-[10px] text-slate-400">{fmtBRL(c.totalGasto)} total gasto</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-black text-emerald-700">{c.canais["RETIRADA_ADICIONAL"]}× adicional</p>
                              <p className="text-[10px] text-slate-400">{(c.canais["RETIRADA_ONLINE"] || 0)} pickup{(c.canais["RETIRADA_ONLINE"] || 0) !== 1 ? "s" : ""}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pós-Troca */}
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2 p-4 pb-2">
                      <Package className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-black text-amber-700 uppercase tracking-tight">Pós-Troca — Voltaram a Comprar</span>
                      <Badge className="bg-amber-100 text-amber-700 border-none text-[10px] font-black ml-auto">{posTroca.length} clientes</Badge>
                    </div>
                    <div className="px-4 pb-2">
                      <p className="text-[10px] text-amber-600 font-medium">
                        Clientes que realizaram trocas e compraram novamente após a última troca — sinal positivo de retenção.
                      </p>
                    </div>
                    {posTroca.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Nenhum cliente neste perfil identificado</p>
                    ) : (
                      <div className="px-4 pb-4 space-y-2">
                        {posTroca.map((c, i) => (
                          <button key={i} onClick={() => setSelectedCliente(c)}
                            className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-100 hover:border-amber-300 transition-all text-left group">
                            <span className="text-xs font-black text-amber-300 w-4">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-slate-700 truncate group-hover:text-amber-700">
                                {c.nome ? c.nome.split(" ").slice(0, 2).join(" ") : maskCpf(c.cpf)}
                              </p>
                              <p className="text-[10px] text-slate-400">{c.trocas.length} troca{c.trocas.length > 1 ? "s" : ""}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-black text-amber-700">{c.comprasPosTroca} compra{c.comprasPosTroca > 1 ? "s" : ""} pós-troca</p>
                              <p className="text-[10px] text-emerald-600 font-bold">{fmtBRL(c.gastoPosTroca)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Fidelização por colaborador */}
              {id === "colaboradores" && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-700 font-medium">
                      Clientes que retornaram (2+ visitas) associados a cada colaborador.
                    </p>
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

              {/* Intervalo de Retorno */}
              {id === "retorno" && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-700 font-medium">
                      Intervalo médio de retorno (somente clientes com 2+ visitas).
                    </p>
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
