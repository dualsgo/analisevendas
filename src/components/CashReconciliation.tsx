"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Calculator,
  User,
  FileText,
  AlertTriangle,
  Clock,
  CircleDashed,
  Printer,
  ChevronRight,
  ChevronDown,
  UserCheck,
  Check,
  Search,
  ShoppingCart,
  CreditCard,
  Banknote,
  Percent,
  Info,
  Calendar,
  Filter,
  ArrowRightLeft,
  Smartphone,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DetailedSaleRow, Item } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CashReconciliationProps {
  data: DetailedSaleRow[];
}

const PAYMENT_METHODS: Record<string, string> = {
  "01": "Dinheiro",
  "02": "Cheque",
  "03": "Cartão de Crédito",
  "04": "Cartão de Débito",
  "05": "Crédito Loja",
  "10": "Vale Alimentação",
  "11": "Vale Refeição",
  "12": "Vale Presente",
  "13": "Vale Combustível",
  "14": "Duplicata Mercantil",
  "15": "Boleto Bancário",
  "16": "Depósito Bancário",
  "17": "PIX",
  "18": "Transf. Bancária",
  "19": "Fidelidade/Cashback",
  "90": "Sem Pagamento",
  "99": "Outros",
};

const getPaymentIcon = (tPag: string) => {
  switch (tPag) {
    case "01": return <Banknote className="w-4 h-4" />;
    case "03": 
    case "04": return <CreditCard className="w-4 h-4" />;
    case "17": return <Smartphone className="w-4 h-4" />;
    default: return <Wallet className="w-4 h-4" />;
  }
};

export function CashReconciliation({ data }: CashReconciliationProps) {
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>("");
  const [checkedSales, setCheckedSales] = useState<Record<string, boolean>>({});
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "pending" | "checked">("all");

  // Calcular estatísticas de dinheiro do XML por colaborador
  const collaboratorStats = useMemo(() => {
    const stats: Record<string, { 
      totalCash: number; 
      totalSales: number; 
      cupons: number;
      paymentBreakdown: Record<string, number> 
    }> = {};
    
    data.forEach(sale => {
      if (sale.is_cancelada) return;
      
      const colab = sale.vendedor || "NÃO IDENTIFICADO";
      let cashValue = 0;
      let totalSaleValue = parseFloat(sale.vNF) || 0;
      
      if (!stats[colab]) {
        stats[colab] = { totalCash: 0, totalSales: 0, cupons: 0, paymentBreakdown: {} };
      }
      
      sale.pagamentos_detalhe?.forEach(p => {
        const value = p.vPag;
        if (p.tPag === "01") cashValue += value;
        
        stats[colab].paymentBreakdown[p.tPag] = (stats[colab].paymentBreakdown[p.tPag] || 0) + value;
      });
      
      if (cashValue > 0) {
        stats[colab].totalCash += cashValue;
      }
      stats[colab].totalSales += totalSaleValue;
      stats[colab].cupons += 1;
    });
    
    return Object.entries(stats)
      .map(([nome, s]) => ({ nome, ...s }))
      .filter(s => s.totalCash > 0)
      .sort((a, b) => b.totalCash - a.totalCash);
  }, [data]);

  // Listar vendas individuais do colaborador selecionado
  const collaboratorSales = useMemo(() => {
    if (!selectedCollaborator) return [];
    
    let filtered = data
      .filter(sale => !sale.is_cancelada && (sale.vendedor || "NÃO IDENTIFICADO") === selectedCollaborator)
      .map(sale => {
        let cashValue = 0;
        let otherValue = 0;
        
        sale.pagamentos_detalhe?.forEach(p => {
          if (p.tPag === "01") cashValue += p.vPag;
          else otherValue += p.vPag;
        });
        
        if (cashValue <= 0) return null;
        
        const troco = parseFloat(sale.vTroco) || 0;
        const vNF = parseFloat(sale.vNF) || 0;
        
        return {
          ...sale,
          valorPagoCash: cashValue,
          valorOutros: otherValue,
          valorTroco: troco,
          valorLiquidoCash: cashValue - troco,
          totalNota: vNF
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    // Apply Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.nf.includes(query) || 
        s.itens.some(item => item.xProd.toLowerCase().includes(query)) ||
        (s.nome_dest && s.nome_dest.toLowerCase().includes(query))
      );
    }

    // Apply Status Filter
    if (filterType === "pending") {
      filtered = filtered.filter(s => !checkedSales[s.chave]);
    } else if (filterType === "checked") {
      filtered = filtered.filter(s => checkedSales[s.chave]);
    }

    return filtered.sort((a, b) => new Date(a.dhEmi).getTime() - new Date(b.dhEmi).getTime());
  }, [data, selectedCollaborator, searchQuery, filterType, checkedSales]);

  const toggleSale = (chave: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedSales(prev => ({ ...prev, [chave]: !prev[chave] }));
  };

  const selectAll = () => {
    const newChecked = { ...checkedSales };
    collaboratorSales.forEach(s => {
      newChecked[s.chave] = true;
    });
    setCheckedSales(newChecked);
  };

  const reset = () => {
    if (confirm("Deseja reiniciar toda a conferência?")) {
      setCheckedSales({});
      setSelectedCollaborator("");
    }
  };

  const currentStats = useMemo(() => {
    let total = 0;
    let conciliado = 0;
    collaboratorSales.forEach(s => {
      total += s.valorLiquidoCash;
      if (checkedSales[s.chave]) conciliado += s.valorLiquidoCash;
    });
    return { total, conciliado, pendente: total - conciliado };
  }, [collaboratorSales, checkedSales]);

  const selectedColabData = useMemo(() => {
    return collaboratorStats.find(c => c.nome === selectedCollaborator);
  }, [collaboratorStats, selectedCollaborator]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 blur-[100px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[80px] -ml-20 -mb-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
          <div className="bg-white/10 p-5 rounded-[2rem] w-fit border border-white/10 backdrop-blur-md shadow-inner">
            <Calculator className="w-12 h-12 text-indigo-300" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 text-[10px] font-black rounded-md uppercase tracking-widest border border-indigo-400/30">Módulo Financeiro</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none">Conciliação Detalhada</h2>
            <p className="text-slate-400 text-sm font-medium mt-2 uppercase tracking-widest flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              Auditoria de Fluxo de Caixa e Identificação de Erros
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={reset}
              variant="outline" 
              className="bg-white/5 border-white/10 hover:bg-white/20 text-white rounded-2xl h-14 px-8 font-bold gap-3 transition-all hover:scale-105 active:scale-95"
            >
              <RotateCcw className="w-5 h-5" />
              REINICIAR TUDO
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Collaborators */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" />
                Operadores
              </h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">{collaboratorStats.length}</span>
            </div>
            
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              {collaboratorStats.map(c => {
                const isActive = selectedCollaborator === c.nome;
                const colabSales = data.filter(s => !s.is_cancelada && (s.vendedor || "NÃO IDENTIFICADO") === c.nome && s.pagamentos_detalhe?.some(p => p.tPag === "01"));
                const totalChecked = colabSales.filter(s => checkedSales[s.chave]).length;
                const pct = colabSales.length > 0 ? (totalChecked / colabSales.length) * 100 : 0;

                return (
                  <button
                    key={c.nome}
                    onClick={() => {
                      setSelectedCollaborator(c.nome);
                      setExpandedSale(null);
                    }}
                    className={cn(
                      "w-full flex flex-col p-5 rounded-3xl border transition-all relative overflow-hidden group text-left",
                      isActive 
                        ? "bg-indigo-50 border-indigo-200 shadow-md ring-2 ring-indigo-500/20" 
                        : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className="flex items-center gap-2">
                         <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-indigo-500" : "bg-slate-300")} />
                         <span className={cn("text-sm font-black uppercase truncate max-w-[150px]", isActive ? "text-indigo-700" : "text-slate-700")}>
                           {c.nome}
                         </span>
                      </div>
                      <ChevronRight className={cn("w-4 h-4 transition-transform", isActive ? "text-indigo-500 translate-x-1" : "text-slate-300 group-hover:translate-x-0.5")} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 w-full">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">Total Cash</p>
                        <p className={cn("text-base font-black tracking-tight", isActive ? "text-indigo-900" : "text-slate-800")}>{formatCurrency(c.totalCash)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">Status</p>
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn("text-[10px] font-bold", isActive ? "text-indigo-600" : "text-slate-500")}>
                            {totalChecked}/{c.cupons} notas
                          </span>
                          <div className="w-16 h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full transition-all duration-500", pct === 100 ? "bg-emerald-500" : "bg-indigo-500")} 
                              style={{ width: `${pct}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {pct === 100 && (
                      <div className="absolute top-2 right-8">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedColabData && (
            <Card className="rounded-[2rem] border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <ArrowRightLeft className="w-3 h-3 text-indigo-500" />
                Resumo por Pagamento
              </h4>
              <div className="space-y-2">
                {Object.entries(selectedColabData.paymentBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([tPag, value]) => (
                  <div key={tPag} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-50 bg-slate-50/30">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center border border-slate-100 text-slate-400 shadow-sm">
                        {getPaymentIcon(tPag)}
                      </div>
                      <span className="text-[9px] font-bold text-slate-600 uppercase">{PAYMENT_METHODS[tPag] || "Outro"}</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-800">{formatCurrency(value)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase">Total Geral</span>
                <span className="text-sm font-black text-indigo-600">{formatCurrency(selectedColabData.totalSales)}</span>
              </div>
            </Card>
          )}

          <Card className="rounded-[2rem] border-amber-100 bg-amber-50/50 p-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="space-y-2">
                <p className="text-xs font-black text-amber-800 uppercase italic">Dica de Auditoria</p>
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                  Compare o "Resumo por Pagamento" com o relatório do sistema de vendas. Se houver diferença no PIX ou Cartão, o erro pode estar no lançamento do XML.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Center/Right Column: Sales List & Summary */}
        <div className="lg:col-span-8 space-y-6">
          {selectedCollaborator ? (
            <div className="space-y-6">
              {/* Stats Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card className="rounded-[2rem] border-slate-100 shadow-sm bg-white p-6 relative overflow-hidden group">
                   <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                      <Banknote className="w-24 h-24 text-slate-900" />
                   </div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expected (Cash)</p>
                   <p className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(currentStats.total)}</p>
                   <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase">Baseado nos XMLs processados</p>
                </Card>
                
                <Card className="rounded-[2rem] border-emerald-100 shadow-sm bg-emerald-50/50 p-6 relative overflow-hidden group">
                   <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-emerald-900">
                      <CheckCircle2 className="w-24 h-24" />
                   </div>
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Conciliado (OK)</p>
                   <p className="text-3xl font-black text-emerald-700 tracking-tight">{formatCurrency(currentStats.conciliado)}</p>
                   <div className="flex items-center gap-1.5 mt-2">
                     <div className="w-full h-1.5 bg-emerald-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${(currentStats.conciliado / (currentStats.total || 1)) * 100}%` }} />
                     </div>
                   </div>
                </Card>

                <Card className={cn(
                  "rounded-[2rem] border-slate-100 shadow-sm p-6 relative overflow-hidden group transition-colors",
                  currentStats.pendente > 0 ? "bg-rose-50/80 border-rose-100" : "bg-slate-50 border-slate-200"
                )}>
                   <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                      <AlertTriangle className={cn("w-24 h-24", currentStats.pendente > 0 ? "text-rose-900" : "text-slate-900")} />
                   </div>
                   <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", currentStats.pendente > 0 ? "text-rose-600" : "text-slate-400")}>
                     Pendente
                   </p>
                   <p className={cn("text-3xl font-black tracking-tight", currentStats.pendente > 0 ? "text-rose-700" : "text-slate-400")}>
                     {formatCurrency(currentStats.pendente)}
                   </p>
                   {currentStats.pendente > 0 && (
                     <span className="inline-flex mt-2 text-[9px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full uppercase animate-pulse">Ação Requerida</span>
                   )}
                </Card>
              </div>

              {/* Controls */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <Input 
                    placeholder="Buscar por NF, Produto ou Cliente..." 
                    className="h-14 pl-12 rounded-2xl border-slate-200 focus:ring-indigo-500/20 bg-white shadow-sm font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={filterType === "all" ? "default" : "outline"}
                    onClick={() => setFilterType("all")}
                    className={cn("h-14 rounded-2xl px-6 font-bold uppercase text-[10px]", filterType === "all" ? "bg-slate-900" : "bg-white border-slate-200")}
                  >
                    Todos
                  </Button>
                  <Button 
                    variant={filterType === "pending" ? "default" : "outline"}
                    onClick={() => setFilterType("pending")}
                    className={cn("h-14 rounded-2xl px-6 font-bold uppercase text-[10px]", filterType === "pending" ? "bg-rose-600 hover:bg-rose-700" : "bg-white border-slate-200")}
                  >
                    Pendentes
                  </Button>
                  <Button 
                    variant={filterType === "checked" ? "default" : "outline"}
                    onClick={() => setFilterType("checked")}
                    className={cn("h-14 rounded-2xl px-6 font-bold uppercase text-[10px]", filterType === "checked" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-white border-slate-200")}
                  >
                    Conciliados
                  </Button>
                </div>
              </div>

              {/* Sales List Table */}
              <Card className="rounded-[2.5rem] border-slate-200 shadow-xl overflow-hidden bg-white">
                <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-indigo-100 shadow-inner">
                      <FileText className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">Vendas do Operador</h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                        {collaboratorSales.length} Notas localizadas
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={selectAll}
                    className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-5 h-10 rounded-xl border border-indigo-100"
                  >
                    Check All (Visible)
                  </Button>
                </div>
                
                <CardContent className="p-0">
                  <div className="max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 bg-white shadow-sm z-20 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr className="border-b border-slate-100">
                          <th className="p-5 text-left w-16"></th>
                          <th className="p-5 text-left">Nota Fiscal / Hora</th>
                          <th className="p-5 text-left">Cliente</th>
                          <th className="p-5 text-right text-slate-800">Total NF</th>
                          <th className="p-5 text-right text-emerald-600 bg-emerald-50/20">Recebido Cash</th>
                          <th className="p-5 text-right text-rose-500">Troco</th>
                          <th className="p-5 text-right text-slate-900 font-bold bg-slate-50/50">Líquido Cash</th>
                          <th className="p-5 text-center w-32">Status</th>
                          <th className="p-5 text-center w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {collaboratorSales.map(s => {
                          const isExpanded = expandedSale === s.chave;
                          const hasHighDiscount = parseFloat(s.percentual_desconto) > 15;
                          const hasTrocoAlto = s.valorTroco > 100;

                          return (
                            <React.Fragment key={s.chave}>
                              <tr 
                                onClick={() => setExpandedSale(isExpanded ? null : s.chave)}
                                className={cn(
                                  "group cursor-pointer transition-all text-xs border-l-4",
                                  checkedSales[s.chave] ? "bg-emerald-50/30 border-l-emerald-500" : "hover:bg-slate-50 border-l-transparent",
                                  isExpanded && "bg-slate-100/50 border-l-indigo-500"
                                )}
                              >
                                <td className="p-5 text-center">
                                  <button 
                                    onClick={(e) => toggleSale(s.chave, e)}
                                    className={cn(
                                      "w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all",
                                      checkedSales[s.chave] 
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200" 
                                        : "border-slate-300 group-hover:border-indigo-400 bg-white"
                                    )}
                                  >
                                    {checkedSales[s.chave] && <Check className="w-4 h-4 stroke-[3]" />}
                                  </button>
                                </td>
                                <td className="p-5">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-slate-800 text-sm">#{s.nf}</span>
                                      {(hasHighDiscount || hasTrocoAlto) && (
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                      )}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase">
                                      <Clock className="w-3 h-3" />
                                      {format(parseISO(s.dhEmi), "HH:mm")}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-5">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-700 truncate max-w-[120px] uppercase text-[10px]">
                                      {s.nome_dest || "CONSUMIDOR FINAL"}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-medium">
                                      {s.cpf_cnpj_dest ? `CPF: ${s.cpf_cnpj_dest}` : "Sem Identificação"}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-5 text-right font-bold text-slate-600">
                                  {formatCurrency(s.totalNota)}
                                </td>
                                <td className="p-5 text-right font-bold text-emerald-600 bg-emerald-50/20">
                                  {formatCurrency(s.valorPagoCash)}
                                </td>
                                <td className="p-5 text-right font-bold text-rose-500">
                                  {s.valorTroco > 0 ? `-${formatCurrency(s.valorTroco)}` : "—"}
                                </td>
                                <td className="p-5 text-right font-black text-slate-900 bg-slate-50/50 text-sm">
                                  {formatCurrency(s.valorLiquidoCash)}
                                </td>
                                <td className="p-5 text-center">
                                   {checkedSales[s.chave] ? (
                                     <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                                       <Check className="w-3 h-3" />
                                       OK
                                     </span>
                                   ) : (
                                     <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                                       <CircleDashed className="w-3 h-3 animate-spin-slow" />
                                       Aguardando
                                     </span>
                                   )}
                                </td>
                                <td className="p-5 text-center">
                                   <div className={cn("transition-transform duration-300", isExpanded ? "rotate-180 text-indigo-600" : "text-slate-300")}>
                                      <ChevronDown className="w-5 h-5" />
                                   </div>
                                </td>
                              </tr>
                              
                              {/* Expanded Row with Details */}
                              {isExpanded && (
                                <tr className="bg-slate-50/80">
                                  <td colSpan={9} className="p-0 border-b border-slate-200">
                                    <div className="p-8 animate-in slide-in-from-top-2 duration-300">
                                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        {/* Products List */}
                                        <div className="lg:col-span-2 space-y-4">
                                          <div className="flex items-center justify-between">
                                            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                              <ShoppingCart className="w-4 h-4 text-indigo-500" />
                                              Itens do Cupom
                                            </h4>
                                            <span className="text-[10px] font-bold text-slate-400">{s.itens.length} Produtos</span>
                                          </div>
                                          <div className="bg-white rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-sm">
                                            <table className="w-full text-left text-[11px]">
                                              <thead className="bg-slate-100/50 border-b border-slate-100">
                                                <tr>
                                                  <th className="px-4 py-3 font-black text-slate-500 uppercase">Descrição</th>
                                                  <th className="px-4 py-3 font-black text-slate-500 uppercase text-center">Qtd</th>
                                                  <th className="px-4 py-3 font-black text-slate-500 uppercase text-right">Unitário</th>
                                                  <th className="px-4 py-3 font-black text-slate-500 uppercase text-right text-rose-500">Desc.</th>
                                                  <th className="px-4 py-3 font-black text-slate-500 uppercase text-right">Total</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100">
                                                {s.itens.map((item, idx) => (
                                                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-bold text-slate-700">
                                                      <div className="flex flex-col">
                                                        <span>{item.xProd}</span>
                                                        <span className="text-[9px] text-slate-400">Cód: {item.cProd}</span>
                                                      </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-slate-600">{item.qCom}</td>
                                                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.vProd / item.qCom)}</td>
                                                    <td className="px-4 py-3 text-right text-rose-500 font-bold">{item.vDesc > 0 ? `-${formatCurrency(item.vDesc)}` : "—"}</td>
                                                    <td className="px-4 py-3 text-right font-black text-slate-800">{formatCurrency(item.vProd - item.vDesc)}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                              <tfoot className="bg-slate-50/50 border-t border-slate-100">
                                                <tr className="font-black text-slate-800">
                                                  <td colSpan={3} className="px-4 py-3 text-right uppercase text-[9px] text-slate-400">Resumo dos Itens</td>
                                                  <td className="px-4 py-3 text-right text-rose-600">-{formatCurrency(parseFloat(s.desconto_total))}</td>
                                                  <td className="px-4 py-3 text-right">{formatCurrency(s.totalNota)}</td>
                                                </tr>
                                              </tfoot>
                                            </table>
                                          </div>
                                        </div>

                                        {/* Payment and Risks */}
                                        <div className="space-y-6">
                                          {/* Payment Methods Breakdown */}
                                          <div className="space-y-4">
                                            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                              <CreditCard className="w-4 h-4 text-indigo-500" />
                                              Composição do Pagamento
                                            </h4>
                                            <div className="space-y-2">
                                              {s.pagamentos_detalhe?.map((p, idx) => (
                                                <div key={idx} className={cn(
                                                  "flex items-center justify-between p-3 rounded-2xl border bg-white shadow-sm",
                                                  p.tPag === "01" ? "border-emerald-200 ring-1 ring-emerald-500/10" : "border-slate-100"
                                                )}>
                                                  <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                      "p-2 rounded-xl",
                                                      p.tPag === "01" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                                                    )}>
                                                      {getPaymentIcon(p.tPag)}
                                                    </div>
                                                    <div>
                                                      <p className="text-[10px] font-black text-slate-800 uppercase leading-none mb-1">{PAYMENT_METHODS[p.tPag] || "Outro"}</p>
                                                      {p.nAut && <p className="text-[9px] text-slate-400 font-bold">AUT: {p.nAut}</p>}
                                                    </div>
                                                  </div>
                                                  <p className={cn("text-sm font-black", p.tPag === "01" ? "text-emerald-600" : "text-slate-800")}>
                                                    {formatCurrency(p.vPag)}
                                                  </p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>

                                          {/* Auditor Flags */}
                                          <div className="space-y-4">
                                            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                              <AlertCircle className="w-4 h-4 text-indigo-500" />
                                              Diagnóstico de Erros
                                            </h4>
                                            <div className="grid grid-cols-1 gap-2">
                                              {hasHighDiscount && (
                                                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                                                   <Percent className="w-4 h-4 text-amber-500 shrink-0" />
                                                   <p className="text-[10px] font-medium text-amber-800 leading-tight">
                                                     <span className="font-black uppercase">Desconto Elevado:</span> {parseFloat(s.percentual_desconto).toFixed(1)}% aplicado nesta venda. Verifique o motivo.
                                                   </p>
                                                </div>
                                              )}
                                              {hasTrocoAlto && (
                                                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 flex gap-3">
                                                   <Banknote className="w-4 h-4 text-rose-500 shrink-0" />
                                                   <p className="text-[10px] font-medium text-rose-800 leading-tight">
                                                     <span className="font-black uppercase">Troco Alto:</span> {formatCurrency(s.valorTroco)} fornecido. Risco de erro de conferência física.
                                                   </p>
                                                </div>
                                              )}
                                              {s.is_fragmentada && (
                                                <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3">
                                                   <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                                                   <p className="text-[10px] font-medium text-indigo-800 leading-tight">
                                                     <span className="font-black uppercase">Venda Fragmentada:</span> Possível divisão de cupom detectada para este operador.
                                                   </p>
                                                </div>
                                              )}
                                              {!hasHighDiscount && !hasTrocoAlto && !s.is_fragmentada && (
                                                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3">
                                                   <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                   <p className="text-[10px] font-medium text-emerald-800 leading-tight">
                                                     Nenhuma anomalia automática detectada na estrutura desta venda.
                                                   </p>
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          <Button 
                                            variant="outline" 
                                            className="w-full h-12 rounded-2xl border-slate-200 text-slate-600 font-bold uppercase text-[10px] gap-2 hover:bg-slate-50"
                                            onClick={() => window.print()}
                                          >
                                            <Printer className="w-4 h-4" />
                                            Gerar 2ª Via p/ Arquivo
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {currentStats.pendente === 0 && collaboratorSales.length > 0 && (
                <div className="p-8 bg-emerald-600 rounded-[3rem] text-white flex items-center justify-between shadow-2xl shadow-emerald-200 animate-in zoom-in-95 duration-500">
                  <div className="flex items-center gap-6">
                    <div className="bg-white/20 p-4 rounded-[1.5rem] backdrop-blur-md">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black uppercase tracking-tighter italic">Tudo em Ordem!</h4>
                      <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest opacity-90 mt-1">
                        Toda a movimentação de caixa para {selectedCollaborator} foi validada sem pendências.
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:block">
                     <span className="px-6 py-2 bg-white/10 rounded-full border border-white/20 text-[10px] font-black uppercase tracking-widest">Auditoria Concluída</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-[80vh] flex flex-col items-center justify-center p-12 text-center space-y-6 bg-white rounded-[4rem] border-4 border-dashed border-slate-100">
               <div className="bg-slate-50 p-10 rounded-[3rem] shadow-inner relative">
                  <div className="absolute top-0 right-0 w-8 h-8 bg-indigo-500 rounded-full animate-ping opacity-20" />
                  <Calculator className="w-24 h-24 text-slate-200" />
               </div>
               <div className="max-w-md">
                  <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-tight italic">Selecione um Operador</h3>
                  <p className="text-base font-medium text-slate-400 mt-4 leading-relaxed">
                    Escolha um colaborador no menu lateral para carregar o histórico de vendas em dinheiro e iniciar o processo de conferência física de caixa.
                  </p>
               </div>
               <div className="flex gap-4 pt-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                      <UserCheck className="w-6 h-6 text-indigo-400" />
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase">1. Selecionar</span>
                  </div>
                  <div className="w-12 h-px bg-slate-100 self-center" />
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-slate-300" />
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase">2. Auditar</span>
                  </div>
                  <div className="w-12 h-px bg-slate-100 self-center" />
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-slate-300" />
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase">3. Conciliar</span>
                  </div>
               </div>
            </div>
          )}
          
          {/* Footer Info */}
          <div className="p-8 bg-gradient-to-r from-slate-900 to-slate-800 rounded-[3rem] border border-white/5 flex flex-col md:flex-row items-center gap-6 shadow-xl">
            <div className="bg-indigo-500/20 p-4 rounded-3xl backdrop-blur-md">
              <AlertCircle className="w-8 h-8 text-indigo-300" />
            </div>
            <div className="space-y-1 flex-1 text-center md:text-left">
              <p className="text-xs font-black text-indigo-300 uppercase italic tracking-widest flex items-center justify-center md:justify-start gap-2">
                Protocolo de Auditoria Digital
              </p>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-2xl">
                Este sistema cruza os dados fiscais (XML) com a conferência física. Valores negativos no troco reduzem o montante esperado. 
                <span className="text-slate-200"> Utilize a busca para localizar cupons específicos através do número da nota ou CPF do cliente.</span>
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Base de Dados</span>
              <span className="text-white font-black text-sm">{data.length} XMLs Ativos</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
