"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  UserCheck,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DetailedSaleRow } from "@/lib/types";
import { format, parseISO } from "date-fns";

interface CashReconciliationProps {
  data: DetailedSaleRow[];
}

interface SaleCashDetail {
  chave: string;
  nf: string;
  dhEmi: string;
  valorDinheiro: number;
  checked: boolean;
}

export function CashReconciliation({ data }: CashReconciliationProps) {
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>("");
  const [checkedSales, setCheckedSales] = useState<Record<string, boolean>>({});

  // Calcular estatísticas de dinheiro do XML por colaborador
  const collaboratorStats = useMemo(() => {
    const stats: Record<string, { total: number; cupons: number }> = {};
    
    data.forEach(sale => {
      if (sale.is_cancelada) return;
      
      const colab = sale.vendedor || "NÃO IDENTIFICADO";
      let cashValue = 0;
      
      sale.pagamentos_detalhe?.forEach(p => {
        if (p.tPag === "01") cashValue += p.vPag;
      });
      
      if (cashValue > 0) {
        if (!stats[colab]) stats[colab] = { total: 0, cupons: 0 };
        stats[colab].total += cashValue;
        stats[colab].cupons += 1;
      }
    });
    
    return Object.entries(stats)
      .map(([nome, s]) => ({ nome, ...s }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  // Listar vendas individuais do colaborador selecionado
  const collaboratorSales = useMemo(() => {
    if (!selectedCollaborator) return [];
    
    return data
      .filter(sale => !sale.is_cancelada && (sale.vendedor || "NÃO IDENTIFICADO") === selectedCollaborator)
      .map(sale => {
        let cashValue = 0;
        sale.pagamentos_detalhe?.forEach(p => {
          if (p.tPag === "01") cashValue += p.vPag;
        });
        
        if (cashValue <= 0) return null;
        
        const troco = parseFloat(sale.vTroco) || 0;
        
        return {
          chave: sale.chave,
          nf: sale.nf,
          dhEmi: sale.dhEmi,
          valorPago: cashValue,
          valorTroco: troco,
          valorLiquido: cashValue - troco,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => new Date(a.dhEmi).getTime() - new Date(b.dhEmi).getTime());
  }, [data, selectedCollaborator]);

  const toggleSale = (chave: string) => {
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

  const stats = useMemo(() => {
    let total = 0;
    let conciliado = 0;
    collaboratorSales.forEach(s => {
      total += s.valorLiquido;
      if (checkedSales[s.chave]) conciliado += s.valorLiquido;
    });
    return { total, conciliado, pendente: total - conciliado };
  }, [collaboratorSales, checkedSales]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="bg-white/10 p-4 rounded-3xl w-fit border border-white/10">
            <UserCheck className="w-10 h-10 text-indigo-300" />
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-black tracking-tighter uppercase italic">Conciliação por Atendente</h2>
            <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-widest">Auditoria de 2ª via de Notas (Dinheiro)</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={reset}
              variant="outline" 
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-2xl h-12 px-6 font-bold gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              REINICIAR
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Collaborators */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atendentes com Recebimento</h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{collaboratorStats.length}</span>
          </div>
          
          <div className="space-y-2">
            {collaboratorStats.map(c => {
              const isActive = selectedCollaborator === c.nome;
              // Calcular progresso deste colab
              const colabSales = data.filter(s => !s.is_cancelada && (s.vendedor || "NÃO IDENTIFICADO") === c.nome && s.pagamentos_detalhe?.some(p => p.tPag === "01"));
              const totalChecked = colabSales.filter(s => checkedSales[s.chave]).length;
              const pct = colabSales.length > 0 ? (totalChecked / colabSales.length) * 100 : 0;

              return (
                <button
                  key={c.nome}
                  onClick={() => setSelectedCollaborator(c.nome)}
                  className={cn(
                    "w-full flex flex-col p-4 rounded-2xl border transition-all relative overflow-hidden group",
                    isActive 
                      ? "bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500" 
                      : "bg-white border-slate-100 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className={cn("text-xs font-black uppercase truncate", isActive ? "text-indigo-600" : "text-slate-700")}>
                      {c.nome}
                    </span>
                    <ChevronRight className={cn("w-4 h-4 transition-transform", isActive ? "text-indigo-500 translate-x-1" : "text-slate-300 group-hover:translate-x-0.5")} />
                  </div>
                  <div className="flex items-end justify-between w-full">
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Total em Dinheiro</p>
                      <p className="text-base font-black text-slate-800">{formatCurrency(c.total)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">{totalChecked}/{c.cupons} Notas</p>
                      <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                  {pct === 100 && (
                    <div className="absolute top-0 right-0 p-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center/Right Column: Sales List & Summary */}
        <div className="lg:col-span-8 space-y-6">
          {selectedCollaborator ? (
            <div className="space-y-6">
              {/* Stats Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="rounded-3xl border-slate-100 shadow-sm bg-white p-5">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Esperado</p>
                   <p className="text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(stats.total)}</p>
                </Card>
                <Card className="rounded-3xl border-slate-100 shadow-sm bg-emerald-50 p-5">
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Conciliado (OK)</p>
                   <p className="text-2xl font-black text-emerald-700 tracking-tight">{formatCurrency(stats.conciliado)}</p>
                </Card>
                <Card className={cn(
                  "rounded-3xl border-slate-100 shadow-sm p-5",
                  stats.pendente > 0 ? "bg-rose-50" : "bg-slate-50"
                )}>
                   <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", stats.pendente > 0 ? "text-rose-600" : "text-slate-400")}>
                     Pendente / Falta
                   </p>
                   <p className={cn("text-2xl font-black tracking-tight", stats.pendente > 0 ? "text-rose-700" : "text-slate-400")}>
                     {formatCurrency(stats.pendente)}
                   </p>
                </Card>
              </div>

              {/* Sales List */}
              <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden bg-white">
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-100">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-700 uppercase tracking-tight text-sm">Lista de Vendas em Dinheiro</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Selecione as notas que estão fisicamente no caixa</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={selectAll}
                    className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 h-8 rounded-full"
                  >
                    Marcar Todas como OK
                  </Button>
                </div>
                <CardContent className="p-0">
                  <div className="max-h-[60vh] overflow-y-auto">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 bg-slate-50 shadow-sm z-10 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <tr className="border-b border-slate-100">
                          <th className="p-4 text-left w-12"></th>
                          <th className="p-4 text-left">NF / Hora</th>
                          <th className="p-4 text-right text-emerald-600">Entrada (Pago)</th>
                          <th className="p-4 text-right text-rose-500">Saída (Troco)</th>
                          <th className="p-4 text-right text-slate-800">Líquido</th>
                          <th className="p-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {collaboratorSales.map(s => (
                          <tr 
                            key={s.chave} 
                            onClick={() => toggleSale(s.chave)}
                            className={cn(
                              "group cursor-pointer transition-colors text-xs",
                              checkedSales[s.chave] ? "bg-emerald-50/30" : "hover:bg-slate-50"
                            )}
                          >
                            <td className="p-4 text-center">
                              <div className={cn(
                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                checkedSales[s.chave] 
                                  ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" 
                                  : "border-slate-200 group-hover:border-indigo-400 bg-white"
                              )}>
                                {checkedSales[s.chave] && <Check className="w-4 h-4" />}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col">
                                <span className="font-black text-slate-700">#{s.nf}</span>
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                                  <Clock className="w-2.5 h-2.5" />
                                  {format(parseISO(s.dhEmi), "HH:mm")}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-right font-bold text-emerald-600">
                              {formatCurrency(s.valorPago)}
                            </td>
                            <td className="p-4 text-right font-bold text-rose-500">
                              {s.valorTroco > 0 ? `-${formatCurrency(s.valorTroco)}` : "—"}
                            </td>
                            <td className="p-4 text-right font-black text-slate-800">
                              {formatCurrency(s.valorLiquido)}
                            </td>
                            <td className="p-4 text-center">
                               {checkedSales[s.chave] ? (
                                 <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                                   <Printer className="w-3 h-3" />
                                   OK
                                 </span>
                               ) : (
                                 <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full animate-pulse">
                                   <AlertTriangle className="w-3 h-3" />
                                   FALTA
                                 </span>
                               )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {stats.pendente === 0 && collaboratorSales.length > 0 && (
                <div className="p-6 bg-emerald-500 rounded-[2rem] text-white flex items-center justify-between shadow-xl shadow-emerald-100">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black uppercase tracking-tight">Conciliação Concluída!</h4>
                      <p className="text-emerald-100 text-xs font-medium uppercase tracking-widest opacity-80">Todas as notas em dinheiro foram conferidas para {selectedCollaborator}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
               <div className="bg-slate-50 p-6 rounded-full">
                  <Calculator className="w-16 h-16 text-slate-200" />
               </div>
               <div className="max-w-xs">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">Inicie a Auditoria</h3>
                  <p className="text-sm font-medium text-slate-400 mt-2">
                    Selecione um atendente à esquerda para listar as vendas em dinheiro e iniciar a conferência das 2ª vias.
                  </p>
               </div>
            </div>
          )}
          <div className="p-6 bg-white rounded-[2rem] border border-slate-200 flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-black text-slate-800 uppercase italic">Importante</p>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Este relatório considera apenas as notas enviadas nos XMLs que possuem o código de pagamento <span className="font-bold text-slate-700">01 (DINHEIRO)</span>. 
                O valor esperado é o <span className="font-bold text-emerald-600">Valor Pago</span> menos o <span className="font-bold text-rose-500">Troco</span> fornecido.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
