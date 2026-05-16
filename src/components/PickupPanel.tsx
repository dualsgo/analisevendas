"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Smartphone,
  Zap,
  Search,
  Users,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Package,
  User,
  Calendar,
  DollarSign,
  FileText,
  Link2,
  ArrowRightLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemAnim = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

interface PickupPanelProps {
  data: DetailedSaleRow[];
}

interface PickupGroup {
  cpf: string;
  nome: string;
  date: string;
  retiradas: DetailedSaleRow[];
  adicionais: DetailedSaleRow[];
}

const formatBRL = (val: number) =>
  val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PickupPanel({ data }: PickupPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<DetailedSaleRow | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "com_adicional" | "sem_adicional">("all");
  const [viewMode, setViewMode] = useState<"grouped" | "individual">("grouped");

  // Build groups: one group per (CPF, date)
  const groups = useMemo(() => {
    const saidas = data.filter(r => !r.is_cancelada && r.tpNF === 1);
    const retiradas = saidas.filter(r => r.canal === "RETIRADA_ONLINE" || r.is_retirada_online);
    
    // Qualquer venda que NÃO seja retirada (inclui vendas físicas normais, com ou sem desconto)
    const outrasVendasNoDia = saidas.filter(r => r.canal !== "RETIRADA_ONLINE" && !r.is_retirada_online);

    const groupMap = new Map<string, PickupGroup>();

    // Primeiro, criamos os grupos baseados nas retiradas encontradas
    retiradas.forEach(r => {
      const dateStr = r.dhEmi ? r.dhEmi.split("T")[0] : "unknown";
      const cpf = r.cpf_cnpj_dest || "__sem_cpf__" + r.chave;
      // Chave do grupo: CPF + Data da Retirada (para manter o agrupamento por dia da operação de retirada)
      const groupKey = `${cpf}__${dateStr}`;
      
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          cpf,
          nome: r.nome_dest || "Consumidor",
          date: dateStr,
          retiradas: [],
          adicionais: [],
        });
      }
      groupMap.get(groupKey)!.retiradas.push(r);
    });

    // Depois, percorremos todas as outras vendas e as vinculamos aos grupos
    outrasVendasNoDia.forEach(v => {
      // 1. Se a venda já foi marcada como adicional pelo processador, usamos o vínculo explícito
      if (v.is_adicional && v.chave_retirada_associada && v.data_retirada_associada) {
        const cpf = v.cpf_cnpj_dest;
        const dateRef = v.data_retirada_associada.split("T")[0];
        const groupKey = `${cpf}__${dateRef}`;

        if (groupMap.has(groupKey)) {
          const group = groupMap.get(groupKey)!;
          if (!group.adicionais.some(a => a.chave === v.chave)) {
            group.adicionais.push(v);
          }
          return;
        }
      }

      // 2. Fallback: Se não tem flag mas é no mesmo dia e CPF (Vínculo implícito)
      if (v.cpf_cnpj_dest) {
        const dateStr = v.dhEmi ? v.dhEmi.split("T")[0] : "unknown";
        const groupKey = `${v.cpf_cnpj_dest}__${dateStr}`;

        if (groupMap.has(groupKey)) {
          const group = groupMap.get(groupKey)!;
          if (!group.adicionais.some(a => a.chave === v.chave)) {
            group.adicionais.push(v);
          }
        }
      }
    });

    // Filtro Final: Só mostramos no painel se houver de fato uma retirada
    return Array.from(groupMap.values())
      .filter(g => g.retiradas.length > 0)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data]);

  const filtered = useMemo(() => {
    return groups.filter(g => {
      const searchOk =
        !searchTerm ||
        g.cpf.includes(searchTerm) ||
        g.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.retiradas.some(r => r.nf.includes(searchTerm)) ||
        g.adicionais.some(a => a.nf.includes(searchTerm));

      const modeOk =
        filterMode === "all" ||
        (filterMode === "com_adicional" && g.adicionais.length > 0) ||
        (filterMode === "sem_adicional" && g.adicionais.length === 0 && g.retiradas.length > 0);

      return searchOk && modeOk;
    });
  }, [groups, searchTerm, filterMode]);

  // KPI summary
  const kpis = useMemo(() => {
    const totalPickups = groups.reduce((acc, g) => acc + g.retiradas.length, 0);
    const comAdicional = groups.filter(g => g.adicionais.length > 0).length;
    const totalGroups = groups.length;
    const convRate = totalGroups > 0 ? (comAdicional / totalGroups) * 100 : 0;
    const valorAdicionais = groups.reduce(
      (acc, g) => acc + g.adicionais.reduce((s, a) => s + parseFloat(a.vNF), 0),
      0
    );
    const valorRetiradas = groups.reduce(
      (acc, g) => acc + g.retiradas.reduce((s, r) => s + parseFloat(r.vNF), 0),
      0
    );
    return { totalPickups, comAdicional, totalGroups, convRate, valorAdicionais, valorRetiradas };
  }, [groups]);

  const toggleGroup = (key: string) =>
    setExpandedGroup(prev => (prev === key ? null : key));

  // Guardian Suggestion Algorithm
  const guardians = useMemo(() => {
    const vendors: Record<string, { converted: number, total: number, rev: number }> = {};
    
    groups.forEach(g => {
      g.retiradas.forEach(r => {
        const v = r.vendedor || "DESCONHECIDO";
        if (!vendors[v]) vendors[v] = { converted: 0, total: 0, rev: 0 };
        vendors[v].total++;
        if (g.adicionais.length > 0) {
          vendors[v].converted++;
          vendors[v].rev += g.adicionais.reduce((acc, a) => acc + parseFloat(a.vNF), 0);
        }
      });
    });

    return Object.entries(vendors)
      .map(([name, s]) => ({
        name,
        conv: s.total > 0 ? (s.converted / s.total) * 100 : 0,
        rev: s.rev,
        score: (s.total > 0 ? (s.converted / s.total) * 60 : 0) + (Math.min(s.rev / 1000, 1) * 40)
      }))
      .filter(v => v.name !== "DESCONHECIDO" && v.name !== "COLABORADOR NÃO IDENTIFICADO")
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
  }, [groups]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Guardians Suggestion */}
      {guardians.length > 0 && (
        <Card className="ri-card bg-slate-900 overflow-hidden relative border-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -mr-32 -mt-32" />
          <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="space-y-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" />
                Guardiões Sugeridos
              </div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Especialistas em Conversão</h3>
              <p className="text-slate-400 text-xs font-medium">Prioridade recomendada no atendimento do balcão de retirada.</p>
            </div>

            <div className="flex gap-4">
               {guardians.map((g, i) => (
                 <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-4 min-w-[200px]">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-lg">
                      {i + 1}º
                    </div>
                    <div>
                      <p className="text-xs font-black text-white uppercase truncate max-w-[120px]">{g.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[8px] font-black">{g.conv.toFixed(1)}% CONV.</Badge>
                        <span className="text-[10px] font-bold text-slate-500">{formatBRL(g.rev)}</span>
                      </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Retiradas Online"
          value={kpis.totalPickups.toString()}
          icon={Smartphone}
          color="sky"
        />
        <KpiCard
          label="Grupos com Adicional"
          value={`${kpis.comAdicional} / ${kpis.totalGroups}`}
          icon={Zap}
          color="emerald"
        />
        <KpiCard
          label="Conversão Adicional"
          value={`${kpis.convRate.toFixed(1)}%`}
          icon={TrendingUp}
          color="indigo"
        />
        <KpiCard
          label="Faturamento Adicionais"
          value={formatBRL(kpis.valorAdicionais)}
          icon={DollarSign}
          color="amber"
        />
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-slate-100">
        <div className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por CPF, Nome ou NF..."
              className="pl-9 rounded-xl border-slate-100 bg-slate-50/50 h-11 text-sm font-medium text-slate-700"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={viewMode === "grouped" ? "default" : "outline"}
              onClick={() => setViewMode("grouped")}
              className={cn(
                "rounded-xl font-bold text-[10px] h-11 px-4 uppercase tracking-tight",
                viewMode === "grouped" ? "bg-slate-800 text-white" : "text-slate-500"
              )}
            >
              <Users className="w-3.5 h-3.5 mr-2" /> Agrupado (Cliente)
            </Button>
            <Button
              size="sm"
              variant={viewMode === "individual" ? "default" : "outline"}
              onClick={() => setViewMode("individual")}
              className={cn(
                "rounded-xl font-bold text-[10px] h-11 px-4 uppercase tracking-tight",
                viewMode === "individual" ? "bg-slate-800 text-white" : "text-slate-500"
              )}
            >
              <FileText className="w-3.5 h-3.5 mr-2" /> Individual (Pedido)
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap border-l pl-4 border-slate-100">
            {(
              [
                { value: "all", label: "Todos" },
                { value: "com_adicional", label: "✅ Com Adicional" },
                { value: "sem_adicional", label: "⚠️ Sem Adicional" },
              ] as const
            ).map(opt => (
              <Button
                key={opt.value}
                size="sm"
                variant={filterMode === opt.value ? "default" : "outline"}
                onClick={() => setFilterMode(opt.value)}
                className={cn(
                  "rounded-xl font-bold text-xs h-11 px-5",
                  filterMode === opt.value
                    ? "bg-indigo-600 text-white shadow-md"
                    : "border-slate-200 text-slate-600"
                )}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center justify-end flex-1">
            <Badge
              variant="outline"
              className="h-11 px-4 bg-slate-50 border-slate-100 text-slate-500 font-bold text-xs"
            >
              {viewMode === "grouped" ? `${filtered.length} grupos` : `${filtered.reduce((acc, g) => acc + g.retiradas.length, 0)} pedidos`}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Groups */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Smartphone className="w-12 h-12 opacity-30" />
            <p className="font-bold text-sm uppercase">Nenhuma retirada online encontrada</p>
          </div>
        )}

        {viewMode === "grouped" ? (
          filtered.map(group => (
            <GroupedPickupCard 
              key={`${group.cpf}__${group.date}`} 
              group={group} 
              isExpanded={expandedGroup === `${group.cpf}__${group.date}`}
              onToggle={() => toggleGroup(`${group.cpf}__${group.date}`)}
              onSelectTx={setSelectedTx}
            />
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Pedido</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Data/Hora</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cliente</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Valor</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Vendedor</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Adicional Vinculado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.flatMap(group => 
                  group.retiradas.map((r, idx) => (
                    <tr key={r.chave} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => setSelectedTx(r)}>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                            <Smartphone className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-black text-slate-700">NF #{r.nf}</span>
                        </div>
                      </td>
                      <td className="p-4 text-[11px] font-bold text-slate-500">
                        {r.dhEmi ? format(parseISO(r.dhEmi), "dd/MM/yy HH:mm") : "—"}
                      </td>
                      <td className="p-4">
                        <p className="text-xs font-black text-slate-700 uppercase truncate max-w-[150px]">{group.nome}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">CPF: ***{group.cpf.slice(-4)}</p>
                      </td>
                      <td className="p-4 text-right">
                        <p className="text-xs font-black text-slate-800">{formatBRL(parseFloat(r.vNF))}</p>
                      </td>
                      <td className="p-4 text-center">
                        {group.adicionais.length > 0 ? (
                          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[8px] font-black">CONVERTIDO</Badge>
                        ) : (
                          <Badge className="bg-slate-50 text-slate-400 border-slate-100 text-[8px] font-black">PENDENTE</Badge>
                        )}
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-600 uppercase">
                        {r.vendedor}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {group.adicionais.map((a, i) => (
                            <div 
                              key={a.chave} 
                              className="flex items-center justify-between gap-2 bg-emerald-50/50 border border-emerald-100/50 p-1 rounded-md"
                              onClick={(e) => { e.stopPropagation(); setSelectedTx(a); }}
                            >
                              <div className="flex items-center gap-1 overflow-hidden">
                                <Zap className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                                <span className="text-[9px] font-black text-emerald-700 truncate">NF {a.nf}</span>
                              </div>
                              <span className="text-[9px] font-black text-emerald-800 shrink-0">{formatBRL(parseFloat(a.vNF))}</span>
                            </div>
                          ))}
                          {group.adicionais.length === 0 && <span className="text-[10px] text-slate-300 italic font-medium">Sem adicional</span>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Side panel detail */}
      <Sheet open={!!selectedTx} onOpenChange={open => !open && setSelectedTx(null)}>
        <SheetContent className="w-full sm:max-w-lg bg-white border-l-4 border-slate-800 p-0 overflow-y-auto">
          {selectedTx && (
            <div>
              <div
                className={cn(
                  "p-6 text-white space-y-3",
                  selectedTx.canal === "RETIRADA_ONLINE" ? "bg-sky-800" : "bg-emerald-800"
                )}
              >
                <div className="flex items-center gap-3">
                  {selectedTx.canal === "RETIRADA_ONLINE" ? (
                    <Smartphone className="w-5 h-5" />
                  ) : (
                    <Zap className="w-5 h-5" />
                  )}
                  <SheetTitle className="text-lg font-black text-white uppercase">
                    {selectedTx.canal === "RETIRADA_ONLINE" ? "Retirada Online" : "Adicional de Pickup"} — NF #{selectedTx.nf}
                  </SheetTitle>
                </div>
                <p className="text-sm font-bold opacity-80">
                  {selectedTx.dhEmi ? format(parseISO(selectedTx.dhEmi), "dd/MM/yyyy HH:mm") : "—"}
                </p>
                <p className="text-2xl font-black">{formatBRL(parseFloat(selectedTx.vNF))}</p>
              </div>
              <div className="p-6 space-y-6">
                <Detail label="Cliente" value={selectedTx.nome_dest || "Consumidor Final"} />
                <Detail label="CPF" value={selectedTx.cpf_cnpj_dest ? `***${selectedTx.cpf_cnpj_dest.slice(-4)}` : "Não Identificado"} />
                <Detail label="Colaborador" value={selectedTx.vendedor} />
                <Detail label="Desconto" value={selectedTx.desconto_total !== "0.00" ? `R$ ${selectedTx.desconto_total} (${(parseFloat(selectedTx.percentual_desconto) * 100).toFixed(1)}%)` : "Sem desconto"} />
                {selectedTx.chave_retirada_associada && (
                  <Detail label="Pickup Vinculado" value={`Chave: ...${selectedTx.chave_retirada_associada.slice(-8)}`} />
                )}
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Itens</p>
                  <div className="space-y-2">
                    {(selectedTx.itens || []).map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50">
                        <div>
                          <p className="text-xs font-bold text-slate-700 uppercase">{item.xProd}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Cod: {item.cProd} | Qtd: {item.qCom}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-600">{formatBRL(item.vProd)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  const colorMap: Record<string, string> = {
    sky: "bg-sky-50 text-sky-600 border-sky-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };
  return (
    <Card className={cn("border overflow-hidden shadow-sm", colorMap[color] || "bg-slate-50")}>
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
        </div>
        <p className="text-xl font-black tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function TxCard({ tx, color, onClick }: { tx: DetailedSaleRow; color: "sky" | "emerald"; onClick: () => void }) {
  const ring = color === "sky" ? "border-sky-100 bg-sky-50/50 hover:bg-sky-50" : "border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50";
  const textColor = color === "sky" ? "text-sky-700" : "text-emerald-700";
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition-all space-y-2 cursor-pointer",
        ring
      )}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-black text-slate-700 uppercase">NF #{tx.nf}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase">
            {tx.dhEmi ? format(parseISO(tx.dhEmi), "dd/MM HH:mm") : "—"} • {tx.vendedor}
          </p>
        </div>
        <p className={cn("text-sm font-black", textColor)}>
          {parseFloat(tx.vNF).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {(tx.itens || []).slice(0, 3).map((item, i) => (
          <span key={i} className="text-[9px] bg-white border border-slate-100 rounded-md px-2 py-0.5 font-bold text-slate-500 uppercase truncate max-w-[120px]">
            {item.xProd}
          </span>
        ))}
        {(tx.itens || []).length > 3 && (
          <span className="text-[9px] bg-white border border-slate-100 rounded-md px-2 py-0.5 font-bold text-slate-400">
            +{(tx.itens || []).length - 3}
          </span>
        )}
      </div>
    </button>
  );
}

function GroupedPickupCard({ group, isExpanded, onToggle, onSelectTx }: { group: PickupGroup; isExpanded: boolean; onToggle: () => void; onSelectTx: (tx: DetailedSaleRow) => void }) {
  const hasAdicional = group.adicionais.length > 0;
  const totalRetirada = group.retiradas.reduce((s, r) => s + parseFloat(r.vNF), 0);
  const totalAdicional = group.adicionais.reduce((s, a) => s + parseFloat(a.vNF), 0);

  return (
    <motion.div
      variants={itemAnim}
      className={cn(
        "rounded-2xl border-2 overflow-hidden transition-all duration-200 shadow-sm mb-4",
        hasAdicional ? "border-emerald-100 bg-white" : "border-slate-100 bg-white"
      )}
    >
      <div
        className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", hasAdicional ? "bg-emerald-100" : "bg-slate-100")}>
            <User className={cn("w-5 h-5", hasAdicional ? "text-emerald-600" : "text-slate-400")} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-800 uppercase truncate">{group.nome}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              CPF: {group.cpf.startsWith("__sem_cpf__") ? "Não Identificado" : `***${group.cpf.slice(-4)}`} • {group.date}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 bg-sky-50 border border-sky-100 px-3 py-1.5 rounded-xl">
            <Smartphone className="w-3.5 h-3.5 text-sky-500" />
            <span className="text-xs font-bold text-sky-700">{group.retiradas.length}x Pickup</span>
            <span className="text-xs font-black text-sky-800">{formatBRL(totalRetirada)}</span>
          </div>

          {hasAdicional ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-700">{group.adicionais.length}x Adicional</span>
              <span className="text-xs font-black text-emerald-800">{formatBRL(totalAdicional)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-bold text-amber-700">Sem Adicional</span>
            </div>
          )}

          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h5 className="text-[10px] font-black uppercase text-sky-600 tracking-widest flex items-center gap-1.5">
                    <Smartphone className="w-3 h-3" /> Notas de Retirada
                  </h5>
                  {group.retiradas.map(r => (
                    <TxCard key={r.chave} tx={r} color="sky" onClick={() => onSelectTx(r)} />
                  ))}
                </div>
                <div className="space-y-2">
                  <h5 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Notas Adicionais
                  </h5>
                  {group.adicionais.map(a => (
                    <TxCard key={a.chave} tx={a} color="emerald" onClick={() => onSelectTx(a)} />
                  ))}
                </div>
              </div>
              {group.retiradas.length > 0 && group.adicionais.length > 0 && (
                <ItemDivergence retiradas={group.retiradas} adicionais={group.adicionais} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ItemDivergence({ retiradas, adicionais }: { retiradas: DetailedSaleRow[]; adicionais: DetailedSaleRow[] }) {
  const allRetItems = retiradas.flatMap(r => r.itens || []);
  const allAdiItems = adicionais.flatMap(a => a.itens || []);

  const retCodes = new Set(allRetItems.map(i => i.cProd));
  const adiCodes = new Set(allAdiItems.map(i => i.cProd));

  const soNoRet = allRetItems.filter(i => !adiCodes.has(i.cProd));
  const soNoAdi = allAdiItems.filter(i => !retCodes.has(i.cProd));
  const comuns = allRetItems.filter(i => adiCodes.has(i.cProd));

  if (soNoRet.length === 0 && soNoAdi.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
        <ArrowRightLeft className="w-3 h-3" /> Divergência entre Notas (Indicativo de Pickup + Adicional)
      </h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        {soNoRet.length > 0 && (
          <div className="space-y-1">
            <p className="text-[9px] font-black text-sky-600 uppercase tracking-wider">Apenas no Pickup</p>
            {[...new Map(soNoRet.map(i => [i.cProd, i])).values()].map(item => (
              <div key={item.cProd} className="flex items-center gap-2 bg-sky-50 rounded-lg px-2 py-1">
                <Package className="w-3 h-3 text-sky-400 shrink-0" />
                <span className="truncate font-medium text-slate-600 uppercase">{item.xProd}</span>
              </div>
            ))}
          </div>
        )}
        {soNoAdi.length > 0 && (
          <div className="space-y-1">
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Apenas no Adicional</p>
            {[...new Map(soNoAdi.map(i => [i.cProd, i])).values()].map(item => (
              <div key={item.cProd} className="flex items-center gap-2 bg-emerald-50 rounded-lg px-2 py-1">
                <Package className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate font-medium text-slate-600 uppercase">{item.xProd}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {comuns.length > 0 && (
        <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-slate-300" />
          {[...new Set(comuns.map(i => i.cProd))].length} produto(s) em comum entre as notas
        </p>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-700 uppercase">{value}</p>
    </div>
  );
}
