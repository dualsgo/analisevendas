"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, Info, Search, Timer, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, getHours, getMinutes, format, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ShiftPerformanceProps {
  data: DetailedSaleRow[];
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function ShiftPerformance({ data }: ShiftPerformanceProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const sales = useMemo(() =>
    data.filter(r => !r.is_cancelada && r.tpNF === 1 && !r.is_devolucao && r.dhEmi),
    [data]
  );

  const uniqueDays = useMemo(() => {
    const daysSet = new Set<string>();
    sales.forEach(s => {
      try {
        const d = format(parseISO(s.dhEmi), "yyyy-MM-dd");
        daysSet.add(d);
      } catch {}
    });
    return Array.from(daysSet).sort();
  }, [sales]);

  const filteredSales = useMemo(() => {
    if (!selectedDay) return sales;
    return sales.filter(s => {
      try {
        return format(parseISO(s.dhEmi), "yyyy-MM-dd") === selectedDay;
      } catch {
        return false;
      }
    });
  }, [sales, selectedDay]);

  const { shiftMetrics, employeeMetrics } = useMemo(() => {
    const turnos = {
      manha: { id: "manha", nome: "Manhã (Abert. às 13h40)", cupons: 0, vNF: 0, desconto: 0, cpf: 0, vendedores: new Set<string>(), itens: 0 },
      tarde: { id: "tarde", nome: "Tarde (13h40 às 18h20)", cupons: 0, vNF: 0, desconto: 0, cpf: 0, vendedores: new Set<string>(), itens: 0 },
      noite: { id: "noite", nome: "Noite (18h20 ao Fech.)", cupons: 0, vNF: 0, desconto: 0, cpf: 0, vendedores: new Set<string>(), itens: 0 }
    };

    type EmpMetrics = { cupons: number; vNF: number; itens: number; };
    const empData: Record<string, { manha: EmpMetrics; tarde: EmpMetrics; noite: EmpMetrics; total: EmpMetrics }> = {};

    for (const s of filteredSales) {
      const d = parseISO(s.dhEmi);
      const h = getHours(d);
      const m = getMinutes(d);
      
      let turno: keyof typeof turnos;
      if (h < 13 || (h === 13 && m < 40)) {
        turno = "manha";
      } else if (h < 18 || (h === 18 && m < 20)) {
        turno = "tarde";
      } else {
        turno = "noite";
      }
      
      const bucket = turnos[turno];
      bucket.cupons++;
      bucket.vNF += parseFloat(s.vNF) || 0;
      if (parseFloat(s.desconto_total) > 0) bucket.desconto++;
      if (s.cpf_cnpj_dest) bucket.cpf++;
      
      const vend = s.vendedor || "DESCONHECIDO";
      if (vend !== "COLABORADOR NÃO IDENTIFICADO") {
        bucket.vendedores.add(vend);
      }
      
      const qItens = parseFloat(s.itens_qtd) || 0;
      bucket.itens += qItens;

      if (vend !== "COLABORADOR NÃO IDENTIFICADO") {
        if (!empData[vend]) {
          empData[vend] = {
            manha: { cupons: 0, vNF: 0, itens: 0 },
            tarde: { cupons: 0, vNF: 0, itens: 0 },
            noite: { cupons: 0, vNF: 0, itens: 0 },
            total: { cupons: 0, vNF: 0, itens: 0 }
          };
        }
        
        empData[vend][turno].cupons++;
        empData[vend][turno].vNF += parseFloat(s.vNF) || 0;
        empData[vend][turno].itens += qItens;

        empData[vend].total.cupons++;
        empData[vend].total.vNF += parseFloat(s.vNF) || 0;
        empData[vend].total.itens += qItens;
      }
    }
    
    const fmtTurno = (t: typeof turnos.manha) => ({
      ...t,
      tkm: t.cupons > 0 ? t.vNF / t.cupons : 0,
      pa: t.cupons > 0 ? t.itens / t.cupons : 0,
      pm: t.itens > 0 ? t.vNF / t.itens : 0,
      pDesconto: t.cupons > 0 ? (t.desconto / t.cupons) * 100 : 0,
      pCpf: t.cupons > 0 ? (t.cpf / t.cupons) * 100 : 0,
      tamanhoEq: t.vendedores.size
    });

    const shiftData = [fmtTurno(turnos.manha), fmtTurno(turnos.tarde), fmtTurno(turnos.noite)];
    const totalCupons = shiftData.reduce((acc, t) => acc + t.cupons, 0);

    const empList = Object.entries(empData).map(([nome, data]) => ({ nome, ...data })).sort((a, b) => b.total.vNF - a.total.vNF);

    return { shiftMetrics: shiftData, totalCupons, employeeMetrics: empList };
  }, [filteredSales]);

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
        <Clock className="w-16 h-16 opacity-30" />
        <p className="text-sm font-bold uppercase tracking-widest">Carregue XMLs para analisar os turnos</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
          <div className="bg-white/10 p-3 rounded-2xl w-fit">
            <Timer className="w-8 h-8 text-indigo-300" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Desempenho por Turno</h2>
            <p className="text-indigo-200 text-sm font-medium mt-1">
              Avalie como a loja e os colaboradores performam em cada janela de horário do dia
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filtrar por Dia:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setSelectedDay(null)} 
            className={cn("px-3 py-1.5 rounded-full text-xs font-black transition-all", selectedDay === null ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
          >
            CONSOLIDADO
          </button>
          {uniqueDays.map((d) => (
            <button 
              key={d} 
              onClick={() => setSelectedDay(prev => prev === d ? null : d)} 
              className={cn("px-3 py-1.5 rounded-full text-xs font-bold transition-all", selectedDay === d ? "bg-indigo-500 text-white shadow-md shadow-indigo-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
            >
              {format(parseISO(d), "dd/MM (EEE)", { locale: ptBR }).toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Resumo da Loja */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-2">
          <Activity className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Visão Geral da Loja</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {shiftMetrics.map((turno) => {
            const perc = shiftMetrics.reduce((acc, t) => acc + t.cupons, 0) > 0 
              ? (turno.cupons / shiftMetrics.reduce((acc, t) => acc + t.cupons, 0)) * 100 
              : 0;
            return (
              <div key={turno.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-indigo-900 text-sm uppercase">{turno.nome}</h3>
                  <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 shadow-none font-black text-[10px]">{turno.tamanhoEq} Vends.</Badge>
                </div>
                
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Faturamento</p>
                    <p className="text-2xl font-black text-slate-800">{fmtBRL(turno.vNF)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cupons</p>
                    <p className="text-xl font-black text-slate-600">{turno.cupons}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 p-2.5 rounded-xl text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">TKM</p>
                    <p className="text-xs font-black text-indigo-700">{fmtBRL(turno.tkm)}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl text-center">
                     <p className="text-[9px] font-bold text-slate-400 uppercase">PA</p>
                    <p className="text-xs font-black text-emerald-600">{turno.pa.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl text-center">
                     <p className="text-[9px] font-bold text-slate-400 uppercase">PM</p>
                    <p className="text-xs font-black text-amber-600">{fmtBRL(turno.pm)}</p>
                  </div>
                </div>

                <div className="bg-indigo-900/5 p-3 rounded-xl border border-indigo-100/50 mt-1">
                  <div className="flex items-center justify-between mb-1">
                     <p className="text-[10px] font-black text-indigo-700 uppercase tracking-tighter">Representatividade</p>
                     <span className="text-[10px] font-black text-indigo-600">{perc.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${perc}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabela de Colaboradores */}
      <div className="space-y-3 mt-8">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Desempenho por Colaborador</h3>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
             <Info className="w-4 h-4" />
             <span className="text-[10px] font-bold uppercase">Identifique quem brilha em cada horário e quem costuma dobrar turnos.</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr>
                  <th className="p-4 bg-slate-50 border-b border-r text-slate-600 font-black uppercase text-[10px] tracking-widest w-48 sticky left-0 z-10 shadow-[1px_0_0_#e2e8f0]">Colaborador</th>
                  <th className="p-4 bg-indigo-50/50 border-b border-r text-indigo-800 font-black uppercase text-[10px] tracking-widest text-center" colSpan={3}>Manhã</th>
                  <th className="p-4 bg-sky-50/50 border-b border-r text-sky-800 font-black uppercase text-[10px] tracking-widest text-center" colSpan={3}>Tarde</th>
                  <th className="p-4 bg-violet-50/50 border-b border-r text-violet-800 font-black uppercase text-[10px] tracking-widest text-center" colSpan={3}>Noite</th>
                  <th className="p-4 bg-slate-100 border-b text-slate-800 font-black uppercase text-[10px] tracking-widest text-center" colSpan={3}>Total</th>
                </tr>
                <tr>
                  <th className="p-2 border-b border-r bg-white sticky left-0 z-10 shadow-[1px_0_0_#e2e8f0]"></th>
                  {/* Manha */}
                  <th className="p-2 border-b bg-indigo-50/20 text-slate-500 font-bold text-[9px] uppercase text-center border-l">Vendas</th>
                  <th className="p-2 border-b bg-indigo-50/20 text-slate-500 font-bold text-[9px] uppercase text-center">TKM</th>
                  <th className="p-2 border-b border-r bg-indigo-50/20 text-slate-500 font-bold text-[9px] uppercase text-center">PA</th>
                  {/* Tarde */}
                  <th className="p-2 border-b bg-sky-50/20 text-slate-500 font-bold text-[9px] uppercase text-center border-l">Vendas</th>
                  <th className="p-2 border-b bg-sky-50/20 text-slate-500 font-bold text-[9px] uppercase text-center">TKM</th>
                  <th className="p-2 border-b border-r bg-sky-50/20 text-slate-500 font-bold text-[9px] uppercase text-center">PA</th>
                  {/* Noite */}
                  <th className="p-2 border-b bg-violet-50/20 text-slate-500 font-bold text-[9px] uppercase text-center border-l">Vendas</th>
                  <th className="p-2 border-b bg-violet-50/20 text-slate-500 font-bold text-[9px] uppercase text-center">TKM</th>
                  <th className="p-2 border-b border-r bg-violet-50/20 text-slate-500 font-bold text-[9px] uppercase text-center">PA</th>
                  {/* Total */}
                  <th className="p-2 border-b bg-slate-50 text-slate-600 font-black text-[9px] uppercase text-center border-l">Faturamento</th>
                  <th className="p-2 border-b bg-slate-50 text-slate-600 font-black text-[9px] uppercase text-center">TKM</th>
                  <th className="p-2 border-b bg-slate-50 text-slate-600 font-black text-[9px] uppercase text-center">PA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeeMetrics.map((emp, i) => {
                  const safeCalc = (v: number, c: number) => c > 0 ? v / c : 0;
                  const renderCell = (metrics: typeof emp.manha, isTotal = false) => {
                    const hasData = metrics.cupons > 0;
                    if (!hasData) {
                      return (
                        <>
                          <td className={cn("p-3 text-center border-l text-slate-300 align-middle", isTotal && "bg-slate-50/50")}>-</td>
                          <td className={cn("p-3 text-center text-slate-300 align-middle", isTotal && "bg-slate-50/50")}>-</td>
                          <td className={cn("p-3 text-center border-r text-slate-300 align-middle", isTotal && "bg-slate-50/50")}>-</td>
                        </>
                      );
                    }
                    const tkm = safeCalc(metrics.vNF, metrics.cupons);
                    const pa = safeCalc(metrics.itens, metrics.cupons);

                    if (isTotal) {
                      return (
                        <>
                          <td className="p-3 text-center border-l bg-slate-50/50 align-middle">
                            <span className="font-black text-slate-800">{fmtBRL(metrics.vNF)}</span>
                            <span className="text-[9px] text-slate-500 font-bold block mt-0.5">{metrics.cupons} cp | {metrics.itens.toFixed(0)} it</span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-600 bg-slate-50/50 align-middle text-xs">{fmtBRL(tkm)}</td>
                          <td className="p-3 text-center font-bold text-slate-600 bg-slate-50/50 align-middle text-xs">{pa.toFixed(2)}</td>
                        </>
                      );
                    }

                    return (
                      <>
                        <td className="p-3 text-center border-l align-middle">
                          <span className="font-bold text-slate-700">{fmtBRL(metrics.vNF)}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{metrics.cupons} cp | {metrics.itens.toFixed(0)} it</span>
                        </td>
                        <td className="p-3 text-center text-xs font-bold text-slate-600 align-middle">{fmtBRL(tkm)}</td>
                        <td className="p-3 text-center text-xs font-bold text-slate-600 border-r align-middle">{pa.toFixed(2)}</td>
                      </>
                    );
                  };

                  return (
                    <tr key={emp.nome} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-black text-xs text-slate-700 border-r sticky left-0 bg-white shadow-[1px_0_0_#e2e8f0] group-hover:bg-slate-50 z-10">{emp.nome}</td>
                      {renderCell(emp.manha)}
                      {renderCell(emp.tarde)}
                      {renderCell(emp.noite)}
                      {renderCell(emp.total, true)}
                    </tr>
                  );
                })}
                {employeeMetrics.length === 0 && (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-slate-400 font-medium">
                      Nenhum dado encontrado para o filtro selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
